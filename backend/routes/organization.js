const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middlewares/authMiddleware');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Configure Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Helper: Check if organization exists
async function findOrgByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM organizations WHERE email = ? LIMIT 1', [email]);
    return rows.length > 0 ? rows[0] : null;
}

// REGISTER
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password, confirm_password, license_number, type, state, district, city, address } = req.body;

        if (!name || !email || !password || !license_number || !type) {
            return res.status(400).json({ error: 'All required fields must be filled.' });
        }

        if (password !== confirm_password) {
            return res.status(400).json({ error: 'Passwords do not match.' });
        }

        const existingOrg = await findOrgByEmail(email);
        if (existingOrg) {
            return res.status(400).json({ error: 'Email already registered.' });
        }

        // Check License uniqueness
        const [licenseRows] = await pool.query('SELECT * FROM organizations WHERE license_number = ? LIMIT 1', [license_number]);
        if (licenseRows.length > 0) {
            return res.status(400).json({ error: 'License number already registered.' });
        }

        const hash = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            `INSERT INTO organizations (name, email, phone, password_hash, license_number, type, state, district, city, address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [name, email, phone, hash, license_number, type, state, district, city, address]
        );

        const token = jwt.sign({ id: result.insertId, role: 'organization' }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: { id: result.insertId, name, email, type, role: 'organization' }
        });

    } catch (err) {
        console.error('Org Register Error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const org = await findOrgByEmail(email);
        if (!org) {
            return res.status(400).json({ error: 'Invalid credentials.' });
        }

        const match = await bcrypt.compare(password, org.password_hash);
        if (!match) {
            return res.status(400).json({ error: 'Invalid credentials.' });
        }

        const token = jwt.sign({ id: org.id, role: 'organization' }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: {
                id: org.id,
                name: org.name,
                email: org.email,
                type: org.type,
                role: 'organization'
            }
        });

    } catch (err) {
        console.error('Org Login Error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET INVENTORY
router.get('/inventory', authMiddleware, async (req, res) => {
    try {
        const orgId = req.user.id;
        const [rows] = await pool.query('SELECT * FROM blood_inventory WHERE org_id = ?', [orgId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// UPDATE INVENTORY
router.post('/inventory/update', authMiddleware, async (req, res) => {
    try {
        const orgId = req.user.id;
        const { blood_group, units } = req.body;

        await pool.query(
            `INSERT INTO blood_inventory (org_id, blood_group, units) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE units = ?`,
            [orgId, blood_group, units, units]
        );

        res.json({ message: 'Inventory updated' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// CREATE EMERGENCY REQUEST
router.post('/request/create', authMiddleware, async (req, res) => {
    try {
        const orgId = req.user.id;
        const { blood_group, units_required, urgency_level, description } = req.body;

        await pool.query(
            `INSERT INTO emergency_requests (org_id, blood_group, units_required, urgency_level, description, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'Active', NOW())`,
            [orgId, blood_group, units_required, urgency_level, description]
        );

        res.json({ message: 'Emergency request created' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// SEARCH DONOR (For Verification)
router.get('/donor/search', authMiddleware, async (req, res) => {
    try {
        const { query } = req.query; // email or phone
        const [rows] = await pool.query(
            'SELECT id, full_name, email, phone, blood_type, availability FROM donors WHERE email = ? OR phone = ?',
            [query, query]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// VERIFY DONATION
router.post('/verify', authMiddleware, async (req, res) => {
    try {
        const orgId = req.user.id;
        const { donor_id, notes } = req.body;

        // Log verification
        await pool.query(
            'INSERT INTO donor_verifications (org_id, donor_id, notes, status) VALUES (?, ?, ?, ?)',
            [orgId, donor_id, notes, 'Verified']
        );

        // Add donation record
        await pool.query(
            'INSERT INTO donations (donor_id, date, units, notes) VALUES (?, CURDATE(), 1, ?)',
            [donor_id, "Verified by Organization"]
        );

        res.json({ message: 'Donor verified and donation recorded.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// FORGOT PASSWORD - Step 1: Send Code
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required.' });

        const org = await findOrgByEmail(email);
        if (!org) return res.status(404).json({ error: 'Email not found.' });

        const resetCode = Math.floor(1000 + Math.random() * 9000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await pool.query('UPDATE organizations SET reset_code = ?, reset_code_expires_at = ? WHERE id = ?', [resetCode, expiresAt, org.id]);

        const mailOptions = {
            from: `"eBloodBank" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Organization Password Reset Code',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px; border-radius: 16px;">
                    <h2 style="text-align: center; color: #dc2626;">eBloodBank Facility Access</h2>
                    <div style="background-color: white; padding: 40px; border-radius: 12px; border: 1px solid #e5e7eb;">
                        <p>We received a request to reset the access key for your organization.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <div style="display: inline-block; padding: 16px 32px; background-color: #fee2e2; border: 2px dashed #dc2626; border-radius: 12px;">
                                <span style="font-size: 32px; font-weight: 800; color: #dc2626; letter-spacing: 5px;">${resetCode}</span>
                            </div>
                        </div>
                        <p style="text-align: center; color: #ef4444; font-weight: 600;">Code expires in 10 minutes.</p>
                    </div>
                </div>
            `
        };

        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            await transporter.sendMail(mailOptions);
        } else {
            console.log(`[DEV] Org Reset Code for ${email}: ${resetCode}`);
        }

        res.json({ message: 'Reset code sent to your email.' });
    } catch (err) {
        console.error('Org Forgot Password Error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// FORGOT PASSWORD - Step 2: Verify Code
router.post('/verify-reset-code', async (req, res) => {
    try {
        const { email, code } = req.body;
        const org = await findOrgByEmail(email);
        if (!org || org.reset_code !== code || new Date() > new Date(org.reset_code_expires_at)) {
            return res.status(400).json({ error: 'Invalid or expired code.' });
        }
        res.json({ message: 'Code verified.', valid: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// FORGOT PASSWORD - Step 3: Reset Password
router.post('/reset-password', async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;
        if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Minimum 8 characters required.' });

        const org = await findOrgByEmail(email);
        if (!org || org.reset_code !== code) return res.status(400).json({ error: 'Invalid request.' });

        const hash = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE organizations SET password_hash = ?, reset_code = NULL, reset_code_expires_at = NULL WHERE id = ?', [hash, org.id]);

        res.json({ message: 'Password reset successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
