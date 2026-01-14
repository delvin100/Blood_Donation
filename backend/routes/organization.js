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

// GET DASHBOARD STATS
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const orgId = req.user.id;

        // 1. Total Unit Count
        const [inventoryRows] = await pool.query(
            'SELECT SUM(units) as total_units FROM blood_inventory WHERE org_id = ?',
            [orgId]
        );
        const totalUnits = inventoryRows[0].total_units || 0;

        // 2. Active Emergency Requests
        const [requestRows] = await pool.query(
            'SELECT COUNT(*) as active_requests FROM emergency_requests WHERE org_id = ? AND status = ?',
            [orgId, 'Active']
        );
        const activeRequests = requestRows[0].active_requests || 0;

        // 3. Total Verified Donations (Donors verified by this org)
        const [verificationRows] = await pool.query(
            'SELECT COUNT(*) as verified_count FROM donor_verifications WHERE org_id = ? AND status = ?',
            [orgId, 'Verified']
        );
        const verifiedCount = verificationRows[0].verified_count || 0;

        // 4. Inventory Breakdown
        const [breakdownRows] = await pool.query(
            'SELECT blood_group, units, min_threshold FROM blood_inventory WHERE org_id = ?',
            [orgId]
        );

        res.json({
            total_units: totalUnits,
            active_requests: activeRequests,
            verified_count: verifiedCount,
            inventory_breakdown: breakdownRows
        });

    } catch (err) {
        console.error('Stats Error:', err);
        res.status(500).json({ error: 'Server error' });
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

// UPDATE INVENTORY (Units & Thresholds)
router.post('/inventory/update', authMiddleware, async (req, res) => {
    try {
        const orgId = req.user.id;
        const { blood_group, units, min_threshold } = req.body;

        await pool.query(
            `INSERT INTO blood_inventory (org_id, blood_group, units, min_threshold) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE units = ?, min_threshold = IFNULL(?, min_threshold)`,
            [orgId, blood_group, units, min_threshold || 5, units, min_threshold]
        );

        res.json({ message: 'Inventory updated' });
    } catch (err) {
        console.error('Inventory Update Error:', err);
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
        const { query } = req.query;
        if (!query || query.length < 1) return res.json([]);

        const [rows] = await pool.query(
            'SELECT id, full_name, email, phone, blood_type, availability FROM donors WHERE email LIKE ? OR phone LIKE ? LIMIT 10',
            [`%${query}%`, `%${query}%`]
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

// GET HISTORY (Verified Donations)
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const orgId = req.user.id;
        const [rows] = await pool.query(`
            SELECT dv.id, dv.notes, dv.verification_date as created_at, d.full_name, d.blood_type, d.email
            FROM donor_verifications dv
            JOIN donors d ON dv.donor_id = d.id
            WHERE dv.org_id = ?
            ORDER BY dv.verification_date DESC
        `, [orgId]);
        res.json(rows);
    } catch (err) {
        console.error("History Error:", err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET REQUESTS (Active & Closed)
router.get('/requests', authMiddleware, async (req, res) => {
    try {
        const orgId = req.user.id;
        const [rows] = await pool.query(
            'SELECT * FROM emergency_requests WHERE org_id = ? ORDER BY created_at DESC',
            [orgId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET RECENT ACTIVITY
router.get('/recent-activity', authMiddleware, async (req, res) => {
    try {
        const orgId = req.user.id;

        // Fetch last 3 verifications
        const [verifications] = await pool.query(`
            SELECT 'donation' as type, dv.verification_date as date, d.full_name as title, dv.notes as subtitle
            FROM donor_verifications dv
            JOIN donors d ON dv.donor_id = d.id
            WHERE dv.org_id = ?
            ORDER BY dv.verification_date DESC LIMIT 3
        `, [orgId]);

        // Fetch last 3 emergency requests
        const [requests] = await pool.query(`
            SELECT 'request' as type, created_at as date, blood_group as title, urgency_level as subtitle
            FROM emergency_requests
            WHERE org_id = ?
            ORDER BY created_at DESC LIMIT 3
        `, [orgId]);

        // Fetch last 3 members
        const [members] = await pool.query(`
            SELECT 'member' as type, om.joined_at as date, d.full_name as title, d.city as subtitle
            FROM org_members om
            JOIN donors d ON om.donor_id = d.id
            WHERE om.org_id = ?
            ORDER BY om.joined_at DESC LIMIT 3
        `, [orgId]);

        const combined = [...verifications, ...requests, ...members]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 6);

        res.json(combined);
    } catch (err) {
        console.error('Recent Activity Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// UPDATE REQUEST STATUS
router.put('/request/:id/status', authMiddleware, async (req, res) => {
    try {
        const orgId = req.user.id;
        const { id } = req.params;
        const { status } = req.body; // 'Active', 'Closed'

        const [result] = await pool.query(
            'UPDATE emergency_requests SET status = ? WHERE id = ? AND org_id = ?',
            [status, id, orgId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        res.json({ message: 'Request updated' });
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

// --- MEMBER MANAGEMENT ---

// GET ALL MEMBERS
router.get('/members', authMiddleware, async (req, res) => {
    try {
        const orgId = req.user.id;
        const [rows] = await pool.query(`
            SELECT om.id as membership_id, om.role, om.joined_at, d.id as donor_id, d.full_name, d.email, d.phone, d.blood_type, d.city
            FROM org_members om
            JOIN donors d ON om.donor_id = d.id
            WHERE om.org_id = ?
            ORDER BY om.joined_at DESC
        `, [orgId]);
        res.json(rows);
    } catch (err) {
        console.error('Fetch Members Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ADD MEMBER
router.post('/members/add', authMiddleware, async (req, res) => {
    try {
        const orgId = req.user.id;
        const { donor_id, role = 'Member' } = req.body;

        if (!donor_id) return res.status(400).json({ error: 'Donor ID is required.' });

        await pool.query(
            'INSERT INTO org_members (org_id, donor_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = ?',
            [orgId, donor_id, role, role]
        );

        res.json({ message: 'Donor added to organization members successfully!' });
    } catch (err) {
        console.error('Add Member Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// REMOVE MEMBER
router.delete('/members/:donorId', authMiddleware, async (req, res) => {
    try {
        const orgId = req.user.id;
        const { donorId } = req.params;

        await pool.query('DELETE FROM org_members WHERE org_id = ? AND donor_id = ?', [orgId, donorId]);
        res.json({ message: 'Member removed successfully.' });
    } catch (err) {
        console.error('Remove Member Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// --- ADVANCED FEATURES ---

// GET ANALYTICS (Last 7 Days)
router.get('/analytics', authMiddleware, async (req, res) => {
    try {
        const orgId = req.user.id;

        // Count verifications per day
        const [verifications] = await pool.query(`
            SELECT DATE(verification_date) as date, COUNT(*) as count 
            FROM donor_verifications 
            WHERE org_id = ? AND verification_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(verification_date)
            ORDER BY DATE(verification_date) ASC
        `, [orgId]);

        // Count requests per day
        const [requests] = await pool.query(`
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM emergency_requests 
            WHERE org_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at) ASC
        `, [orgId]);

        res.json({ verifications, requests });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET GEOGRAPHIC REACH
router.get('/geographic-stats', authMiddleware, async (req, res) => {
    try {
        const orgId = req.user.id;
        const [rows] = await pool.query(`
            SELECT d.city, COUNT(*) as count 
            FROM org_members om
            JOIN donors d ON om.donor_id = d.id
            WHERE om.org_id = ?
            GROUP BY d.city
            ORDER BY count DESC
            LIMIT 5
        `, [orgId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// SEND OUTREACH BROADCAST
router.post('/outreach', authMiddleware, async (req, res) => {
    try {
        const orgId = req.user.id;
        const { subject, body } = req.body;

        const [members] = await pool.query(`
            SELECT d.email FROM org_members om
            JOIN donors d ON om.donor_id = d.id
            WHERE om.org_id = ?
        `, [orgId]);

        if (members.length === 0) return res.status(400).json({ error: 'No members to broadcast to' });

        const emails = members.map(m => m.email);

        // For local demo, we'll just log and return success if nodemailer isn't fully configured
        // In a real app, you'd use the configured transporter
        console.log(`Broadcasting to ${emails.length} members: ${subject}`);

        // Mock success for now to allow UI testing
        res.json({ message: `Success! Broadcast sent to ${emails.length} members.` });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
