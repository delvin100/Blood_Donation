const pool = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const https = require('https');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Configure Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Helper functions (moved from route)
const findDonorByUsername = async (username) => {
    const [rows] = await pool.query('SELECT * FROM donors WHERE username = ? LIMIT 1', [username]);
    return rows.length > 0 ? rows[0] : null;
};

const findDonorByEmail = async (email) => {
    const [rows] = await pool.query('SELECT * FROM donors WHERE email = ? LIMIT 1', [email]);
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
            `INSERT INTO donors (username, full_name, email, password_hash, blood_type, dob, phone, gender, availability, latitude, longitude, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [username, full_name, email, hash, blood_type, dob, phone, gender, availability || 'Available', req.body.latitude || null, req.body.longitude || null]
        );

        const insertId = result.insertId;
        const donorTag = `DON-${insertId.toString().padStart(6, '0')}`;
        await pool.query('UPDATE donors SET donor_tag = ? WHERE id = ?', [donorTag, insertId]);

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
        if (!donor) return res.status(404).json({ error: 'Email not found.' });

        const resetCode = Math.floor(1000 + Math.random() * 9000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await pool.query('UPDATE donors SET reset_code = ?, reset_code_expires_at = ? WHERE id = ?', [resetCode, expiresAt, donor.id]);

        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            await transporter.sendMail({
                from: `"eBloodBank" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: `${resetCode} is your eBloodBank reset code`,
                html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #dc2626; margin: 0; font-size: 28px; letter-spacing: 1px;">eBloodBank</h1>
                        <p style="color: #6b7280; margin-top: 5px; font-size: 14px;">Gift of Life, Shared by You</p>
                    </div>
                    
                    <div style="background-color: #ffffff; padding: 40px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: center;">
                        <h2 style="color: #1f2937; margin-bottom: 20px;">Verification Code</h2>
                        <p style="color: #4b5563; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
                            We received a request to reset your password. Use the following 4-digit code to verify your identity.
                        </p>
                        
                        <div style="background-color: #fee2e2; border: 2px dashed #dc2626; padding: 20px; border-radius: 12px; display: inline-block; margin-bottom: 30px;">
                            <span style="font-size: 48px; font-weight: 900; color: #dc2626; letter-spacing: 15px; margin-left: 15px;">${resetCode}</span>
                        </div>
                        
                        <p style="color: #9ca3af; font-size: 13px; margin-bottom: 0;">
                            This code will expire in <b>10 minutes</b>.<br>
                            If you didn't request this, you can safely ignore this email.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
                        <p style="margin-bottom: 5px;">&copy; 2026 eBloodBank Official. All rights reserved.</p>
                        <p>Need help? Contact us at <a href="mailto:ebloodbankofficial@gmail.com" style="color: #dc2626; text-decoration: none;">ebloodbankofficial@gmail.com</a></p>
                    </div>
                </div>
                `
            });
        } else {
            console.log(`[DEV] Reset Code for ${email}: ${resetCode}`);
        }
        res.json({ message: 'Reset code sent.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
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
