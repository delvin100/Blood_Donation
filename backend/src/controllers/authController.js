const pool = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const admin = require('../config/firebaseAdmin');
const https = require('https');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Helper functions (moved from route)
const findDonorByUsername = async (username) => {
    const [rows] = await pool.query('SELECT * FROM donors WHERE username = ? LIMIT 1', [username]);
    return rows.length > 0 ? rows[0] : null;
};

const findDonorByEmail = async (email) => {
    const [rows] = await pool.query('SELECT * FROM donors WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
    return rows.length > 0 ? rows[0] : null;
};

const findDonorByIdentifier = async (identifier) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(identifier)) {
        return await findDonorByEmail(identifier);
    }
    return null;
};

const calculateAge = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

function getGoogleUserInfo(accessToken) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'www.googleapis.com',
            path: '/oauth2/v3/userinfo',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'User-Agent': 'Node.js App'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Failed to parse Google response'));
                    }
                } else {
                    let errMsg = `Google API returned status ${res.statusCode}`;
                    try {
                        const errJson = JSON.parse(data);
                        if (errJson.error_description) errMsg += `: ${errJson.error_description}`;
                        else if (errJson.error) errMsg += `: ${JSON.stringify(errJson.error)}`;
                    } catch (e) {
                        errMsg += `: ${data}`;
                    }
                    reject(new Error(errMsg));
                }
            });
        });

        req.on('error', (e) => reject(new Error('Network request failed: ' + e.message)));
        req.end();
    });
}

// Controller Methods
exports.register = async (req, res) => {
    try {
        const { username, full_name, email, password, confirm_password, blood_type, dob, phone, gender, availability } = req.body;
        if (!username || !full_name || !email || !password || !confirm_password) {
            return res.status(400).json({ error: 'Please fill in all required fields.' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
        if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
        if (password !== confirm_password) return res.status(400).json({ error: 'Passwords do not match.' });

        const existingByUsername = await findDonorByUsername(username);
        const existingByEmail = await findDonorByEmail(email);
        if (existingByUsername || existingByEmail) {
            return res.status(400).json({ error: 'Username or email already registered. Please login.' });
        }

        const hash = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'INSERT INTO donors (username, full_name, email, password_hash, blood_type, dob, phone, gender, availability, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
            [username, full_name, email, hash, blood_type, dob, phone, gender, availability === 'on' ? 1 : 0]
        );

        const insertId = result.insertId;
        const donorTag = `DON-${insertId.toString().padStart(6, '0')}`;
        await pool.query('UPDATE donors SET donor_tag = ? WHERE id = ?', [donorTag, insertId]);

        // Sync with Firebase
        try {
            await admin.auth().createUser({
                uid: `donor_${insertId}`,
                email: email,
                password: password,
                displayName: full_name,
            });
        } catch (fbErr) {
            console.error('Firebase sync error:', fbErr);
        }

        const token = jwt.sign({ id: insertId, username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: insertId, username, full_name, email, blood_type, phone, gender, donor_tag: donorTag } });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Server error. Please try again.', details: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

        let donor = await findDonorByUsername(username) || await findDonorByIdentifier(username);
        if (!donor || !donor.password_hash) return res.status(400).json({ error: 'Invalid username or password.' });

        const passwordValid = await bcrypt.compare(password, donor.password_hash);
        if (!passwordValid) return res.status(400).json({ error: 'Invalid username or password.' });

        const token = jwt.sign({ id: donor.id, username: donor.username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: donor.id, username: donor.username, full_name: donor.full_name, email: donor.email, blood_type: donor.blood_type, phone: donor.phone, gender: donor.gender, donor_tag: donor.donor_tag } });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error. Please try again.', details: err.message });
    }
};

exports.checkUsername = async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) return res.status(400).json({ error: 'Username is required.' });
        const existing = await findDonorByUsername(username);
        res.json({ available: !existing });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const donor = await findDonorByEmail(email);
        if (!donor) return res.status(404).json({ error: 'No account found with that email address.' });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const payload = JSON.stringify({
            requestType: 'PASSWORD_RESET',
            email: email,
            continueUrl: `${frontendUrl}/reset-password?type=donor`
        });

        const options = {
            hostname: 'identitytoolkit.googleapis.com',
            path: `/v1/accounts:sendOobCode?key=${process.env.FIREBASE_WEB_API_KEY}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
        };

        await new Promise((resolve, reject) => {
            const fbReq = https.request(options, (resp) => {
                let body = '';
                resp.on('data', (d) => body += d);
                resp.on('end', () => {
                    console.log('Firebase status:', resp.statusCode, body);
                    if (resp.statusCode >= 200 && resp.statusCode < 300) resolve();
                    else reject(new Error(`Firebase error: ${body}`));
                });
            });
            fbReq.on('error', reject);
            fbReq.write(payload);
            fbReq.end();
        });

        res.json({ message: 'Password reset link sent to your email.' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Failed to send reset email.', details: err.message });
    }
};


exports.verifyResetCode = async (req, res) => {
    try {
        const { email, code } = req.body;
        const donor = await findDonorByEmail(email);
        if (!donor || donor.reset_code !== code || new Date() > new Date(donor.reset_code_expires_at)) {
            return res.status(400).json({ error: 'Invalid or expired code.' });
        }
        res.json({ message: 'Code verified.', valid: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;
        const donor = await findDonorByEmail(email);
        if (!donor || donor.reset_code !== code || new Date() > new Date(donor.reset_code_expires_at)) {
            return res.status(400).json({ error: 'Invalid or expired request.' });
        }
        const hash = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE donors SET password_hash = ?, reset_code = NULL, reset_code_expires_at = NULL WHERE id = ?', [hash, donor.id]);
        res.json({ message: 'Password reset successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
};

exports.completeProfile = async (req, res) => {
    try {
        const { bloodGroup, gender, phoneNumber, dob, state, district, city, latitude, longitude } = req.body;
        const { id: donorId } = req.user;
        await pool.query('UPDATE donors SET blood_type = ?, gender = ?, phone = ?, dob = ?, state = ?, district = ?, city = ?, latitude = ?, longitude = ? WHERE id = ?', [bloodGroup, gender, phoneNumber, dob, state, district, city, latitude, longitude, donorId]);
        res.json({ message: 'Profile updated successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
};

exports.syncPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        console.log(`[SyncPassword] Attempting sync for donor: ${email}`);

        if (!email || !newPassword) {
            console.warn('[SyncPassword] Missing email or password');
            return res.status(400).json({ error: 'Email and new password are required.' });
        }

        // Find donor using case-insensitive lookup (already handled in findDonorByEmail now)
        const donor = await findDonorByEmail(email);
        if (!donor) {
            console.warn(`[SyncPassword] Donor not found for email (checked case-insensitively): ${email}`);
            return res.status(404).json({ error: 'Account not found. Please ensure you reset the password for the correct account type (Donor).' });
        }

        console.log(`[SyncPassword] Found donor ID: ${donor.id}, hashing new password...`);
        const hash = await bcrypt.hash(newPassword, 10);

        const [result] = await pool.query(
            'UPDATE donors SET password_hash = ?, reset_code = NULL, reset_code_expires_at = NULL WHERE id = ?',
            [hash, donor.id]
        );

        console.log(`[SyncPassword] Update result: ${result.affectedRows} row(s) updated`);
        if (result.affectedRows === 0) {
            return res.status(500).json({ error: 'Database update failed. No records were changed.' });
        }

        res.json({ message: 'Password synced to MySQL successfully.' });
    } catch (err) {
        console.error('[SyncPassword] Error:', err);
        res.status(500).json({ error: 'Failed to sync password.', details: err.message });
    }
};

exports.googleAuth = async (req, res) => {
    try {
        const { credential } = req.body;
        const payload = await getGoogleUserInfo(credential);
        const { sub: googleId, email, name, picture } = payload;

        let [rows] = await pool.query('SELECT * FROM donors WHERE google_id = ? OR email = ? LIMIT 1', [googleId, email]);
        let donor = rows[0];

        if (!donor) {
            const [result] = await pool.query('INSERT INTO donors (google_id, full_name, email, profile_picture, created_at) VALUES (?, ?, ?, ?, NOW())', [googleId, name, email, picture]);
            const donorTag = `DON-${result.insertId.toString().padStart(6, '0')}`;
            await pool.query('UPDATE donors SET donor_tag = ? WHERE id = ?', [donorTag, result.insertId]);
            [rows] = await pool.query('SELECT * FROM donors WHERE id = ?', [result.insertId]);
            donor = rows[0];
        } else if (!donor.google_id) {
            await pool.query('UPDATE donors SET google_id = ? WHERE id = ?', [googleId, donor.id]);
        }

        const token = jwt.sign({ id: donor.id, username: donor.username || email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: donor });
    } catch (err) {
        console.error('Google Auth Error:', err);
        res.status(500).json({ error: 'Google auth failed.' });
    }
};
