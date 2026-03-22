const pool = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const admin = require('../config/firebaseAdmin');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);

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
            [username, full_name, email, hash, blood_type, dob, phone, gender, 'Available']
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

exports.googleAuth = async (req, res) => {
    try {
        const { idToken, accessToken } = req.body;
        let payload;

        if (idToken) {
            // Verify ID Token (preferred for mobile/web)
            const ticket = await client.verifyIdToken({
                idToken: idToken,
                audience: [
                    process.env.GOOGLE_WEB_CLIENT_ID,
                    process.env.GOOGLE_ANDROID_CLIENT_ID,
                    process.env.GOOGLE_IOS_CLIENT_ID,
                    process.env.GOOGLE_TEST_WEB_CLIENT_ID,
                    process.env.GOOGLE_TEST_ANDROID_CLIENT_ID
                ].filter(Boolean),
            });
            payload = ticket.getPayload();
        } else if (accessToken) {
            // Fallback to access token if provided
            payload = await getGoogleUserInfo(accessToken);
        } else {
            return res.status(400).json({ error: 'No Google credentials provided.' });
        }

        const { sub: googleId, email, name, picture } = payload;

        let [rows] = await pool.query('SELECT * FROM donors WHERE google_id = ? OR email = ? LIMIT 1', [googleId, email]);
        let donor = rows[0];

        if (!donor) {
            // Register new donor
            const [result] = await pool.query(
                'INSERT INTO donors (google_id, full_name, email, profile_picture, created_at) VALUES (?, ?, ?, ?, NOW())',
                [googleId, name, email, picture]
            );
            const insertId = result.insertId;
            const donorTag = `DON-${insertId.toString().padStart(6, '0')}`;
            await pool.query('UPDATE donors SET donor_tag = ? WHERE id = ?', [donorTag, insertId]);

            // Sync with Firebase (consistent with register method)
            try {
                // For Google users, we might not have a password, so we use a placeholder or leave it blank
                // Firebase allows creating users without passwords if they are meant to be federated
                await admin.auth().createUser({
                    uid: `donor_${insertId}`,
                    email: email,
                    displayName: name,
                    photoURL: picture
                });
            } catch (fbErr) {
                console.error('Firebase sync error for Google user:', fbErr);
            }

            [rows] = await pool.query('SELECT * FROM donors WHERE id = ?', [insertId]);
            donor = rows[0];
        } else if (!donor.google_id) {
            // Link existing account
            await pool.query('UPDATE donors SET google_id = ?, profile_picture = COALESCE(profile_picture, ?) WHERE id = ?', [googleId, picture, donor.id]);
            donor.google_id = googleId;
            donor.profile_picture = donor.profile_picture || picture;
        }

        const token = jwt.sign({ id: donor.id, username: donor.username || email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: donor });
    } catch (err) {
        console.error('Google Auth Error:', err);
        res.status(500).json({ error: 'Google auth failed.', details: err.message });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const donor = await findDonorByEmail(email);
        if (!donor) return res.status(404).json({ error: 'No account found with this email' });

        // Check if it's a Google sign-in user
        if (donor.google_id) {
            return res.status(400).json({
                error: 'Account linked with Google. Please use "Sign in with Google" instead of password recovery.'
            });
        }

        // Generate 4-digit OTP
        const resetCode = Math.floor(1000 + Math.random() * 9000).toString();
        const expiry = new Date(Date.now() + 15 * 60000); // 15 mins

        await pool.query(
            'UPDATE donors SET reset_code = ?, reset_code_expires_at = ? WHERE id = ?',
            [resetCode, expiry, donor.id]
        );


        const html = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #f1f1f1;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="display: inline-block; padding: 12px; background-color: #fef2f2; border-radius: 12px;">
                        <span style="font-size: 32px;">❤️</span>
                    </div>
                </div>
                <h2 style="color: #1a1a1a; text-align: center; margin-bottom: 10px; font-weight: 800;">Password Reset</h2>
                <p style="color: #666; text-align: center; font-size: 14px; line-height: 1.6;">Hello <strong>${donor.full_name}</strong>, use the verification code below to reset your eBloodBank account password.</p>
                
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin: 30px 0;">
                    <div style="font-size: 14px; color: #64748b; margin-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Your OTP Code</div>
                    <div style="font-size: 42px; font-weight: 900; color: #dc2626; letter-spacing: 12px; margin-left: 12px;">${resetCode}</div>
                </div>



                <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #f1f1f1; text-align: center;">
                    <p style="color: #94a3b8; font-size: 12px;">This code expires in 15 minutes. If you didn't request this code, you can safely ignore this email.</p>
                </div>
            </div>
        `;

        // Switch to Brevo utility
        const sendEmailViaBrevo = require('../utils/brevoUtils');
        
        await sendEmailViaBrevo({
            email: donor.email,
            subject: 'Password Reset Request - eBloodBank',
            html
        });

        res.json({ message: 'Verification code sent to your email' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ 
            error: 'Failed to process request', 
            details: err.message,
            tip: 'If this is the live server, ensure BREVO_API_KEY is set in environment variables.'
        });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

        const [rows] = await pool.query(
            'SELECT id FROM donors WHERE LOWER(email) = LOWER(?) AND reset_code = ? AND reset_code_expires_at > NOW()',
            [email, code]
        );

        if (rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired verification code' });
        }

        res.json({ message: 'OTP verified successfully' });
    } catch (err) {
        console.error('OTP verification error:', err);
        res.status(500).json({ error: 'Failed to verify code' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;
        if (!email || !code || !newPassword) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const [rows] = await pool.query(
            'SELECT * FROM donors WHERE LOWER(email) = LOWER(?) AND reset_code = ? AND reset_code_expires_at > NOW()',
            [email, code]
        );

        if (rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired reset code' });
        }

        const donor = rows[0];
        const hash = await bcrypt.hash(newPassword, 10);

        await pool.query(
            'UPDATE donors SET password_hash = ?, reset_code = NULL, reset_code_expires_at = NULL WHERE id = ?',
            [hash, donor.id]
        );

        // Sync with Firebase if uid is known
        try {
            await admin.auth().updateUser(`donor_${donor.id}`, {
                password: newPassword
            });
        } catch (fbErr) {
            console.error('Firebase password sync error:', fbErr);
        }

        res.json({ message: 'Password has been reset successfully' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Failed to reset password' });
    }
};
