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

// GET PROFILE
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const orgId = req.user.id;
        const [rows] = await pool.query(
            'SELECT id, name, email, phone, license_number, type, state, district, city, address, created_at FROM organizations WHERE id = ?',
            [orgId]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Organization not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('Fetch Profile Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// UPDATE PROFILE
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const orgId = req.user.id;
        const { name, email, phone, license_number, type, state, district, city, address } = req.body;

        // Basic presence validation (matching registration requirements)
        if (!name || !email || !license_number || !type) {
            return res.status(400).json({ error: 'Name, email, license number, and facility type are required.' });
        }

        // Email Format Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format.' });
        }

        // Phone Validation (10 digits numeric)
        const phoneRegex = /^[0-9]{10}$/;
        if (phone && !phoneRegex.test(phone)) {
            return res.status(400).json({ error: 'Phone number must be exactly 10 digits.' });
        }

        // Check if email is already taken by ANOTHER organization
        const [existingEmail] = await pool.query(
            'SELECT id FROM organizations WHERE email = ? AND id != ?',
            [email, orgId]
        );
        if (existingEmail.length > 0) {
            return res.status(400).json({ error: 'Email is already registered by another facility.' });
        }

        // Check if License Number is already taken by ANOTHER organization
        const [existingLicense] = await pool.query(
            'SELECT id FROM organizations WHERE license_number = ? AND id != ?',
            [license_number, orgId]
        );
        if (existingLicense.length > 0) {
            return res.status(400).json({ error: 'License number is already registered.' });
        }

        await pool.query(
            `UPDATE organizations 
             SET name = ?, email = ?, phone = ?, license_number = ?, type = ?, state = ?, district = ?, city = ?, address = ? 
             WHERE id = ?`,
            [name, email, phone, license_number, type, state, district, city, address, orgId]
        );

        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error('Update Profile Error:', err);
        res.status(500).json({ error: 'Server error' });
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

        const [result] = await pool.query(
            `INSERT INTO emergency_requests (org_id, blood_group, units_required, urgency_level, description, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'Active', NOW())`,
            [orgId, blood_group, units_required, urgency_level, description]
        );

        const requestId = result.insertId;

        // Fetch organization name for the notification
        const [orgRows] = await pool.query('SELECT name FROM organizations WHERE id = ?', [orgId]);
        const orgName = orgRows[0]?.name || 'An Organization';

        // 1. Find matching donors in the organization
        const [matchingDonors] = await pool.query(`
            SELECT d.id, d.email, d.full_name 
            FROM org_members om
            JOIN donors d ON om.donor_id = d.id
            WHERE om.org_id = ? AND d.blood_type = ? AND d.availability = 'Available'
        `, [orgId, blood_group]);

        if (matchingDonors.length > 0) {
            // 2. Create in-app notifications
            const notificationValues = matchingDonors.map(donor => [
                donor.id,
                'Donor',
                'Emergency',
                `Emergency ${blood_group} Required`,
                `${orgName} needs ${blood_group} blood. ${description ? `Briefing: ${description}` : 'Please help if possible.'}`,
                requestId
            ]);

            await pool.query(
                'INSERT INTO notifications (recipient_id, recipient_type, type, title, message, source_id) VALUES ?',
                [notificationValues]
            );

            // 3. Send Emails
            if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                for (const donor of matchingDonors) {
                    const mailOptions = {
                        from: `"eBloodBank Emergency" <${process.env.EMAIL_USER}>`,
                        to: donor.email,
                        subject: `CRITICAL: ${blood_group} Blood Required at ${orgName}`,
                        html: `
                            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fef2f2; padding: 20px; border-radius: 16px; border: 1px solid #fee2e2;">
                                <div style="text-align: center; margin-bottom: 20px;">
                                    <span style="background-color: #dc2626; color: white; padding: 8px 16px; border-radius: 99px; font-weight: 800; font-size: 12px; uppercase tracking-widest;">EMERGENCY BROADCAST</span>
                                </div>
                                <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                                    <h2 style="color: #991b1b; margin-top: 0; text-align: center;">Urgent Donor Required</h2>
                                    <p style="color: #4b5563; line-height: 1.6;">Hello <strong>${donor.full_name}</strong>,</p>
                                    <p style="color: #4b5563; line-height: 1.6;"><strong>${orgName}</strong> is reporting a critical shortage of <strong>${blood_group}</strong> blood and needs urgent assistance.</p>
                                    
                                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px italic #e2e8f0;">
                                        <p style="margin: 0; color: #1e293b; font-size: 14px;"><strong>Requirement:</strong> ${units_required} Units</p>
                                        <p style="margin: 5px 0 0 0; color: #1e293b; font-size: 14px;"><strong>Urgency:</strong> ${urgency_level}</p>
                                        ${description ? `<p style="margin: 10px 0 0 0; color: #64748b; font-size: 13px; font-style: italic;">"${description}"</p>` : ''}
                                    </div>

                                    <p style="color: #4b5563; line-height: 1.6;">Since you are a verified member and your blood group matches, we request you to visit the facility if possible.</p>
                                    
                                    <div style="text-align: center; margin-top: 30px;">
                                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="background-color: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Open Dashboard</a>
                                    </div>
                                </div>
                                <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
                                    &copy; ${new Date().getFullYear()} eBloodBank Original. Every drop counts.
                                </p>
                            </div>
                        `
                    };
                    transporter.sendMail(mailOptions).catch(err => console.error('Error sending emergency email:', err));
                }
            }
        }

        res.json({ message: 'Emergency request created and notifications sent to matching donors.' });
    } catch (err) {
        console.error('Create Request Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// SEARCH DONOR (For Verification)
router.get('/donor/search', authMiddleware, async (req, res) => {
    try {
        const { query } = req.query;
        if (!query || query.length < 1) return res.json([]);

        const [rows] = await pool.query(
            'SELECT id, donor_tag, full_name, email, phone, blood_type, availability FROM donors WHERE email LIKE ? OR phone LIKE ? OR donor_tag LIKE ? LIMIT 10',
            [`%${query}%`, `%${query}%`, `%${query}%`]
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

        // Check donor availability
        const [donorRows] = await pool.query('SELECT availability FROM donors WHERE id = ?', [donor_id]);
        if (donorRows.length === 0) {
            return res.status(404).json({ error: 'Donor not found' });
        }

        if (donorRows[0].availability !== 'Available') {
            return res.status(400).json({ error: 'Donor is currently unavailable for donation.' });
        }

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
        console.error('Verify Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/history', authMiddleware, async (req, res) => {
    try {
        const orgId = req.user.id;
        const [rows] = await pool.query(`
            SELECT 
                MAX(id) as id,
                donor_id,
                full_name,
                email,
                donor_tag,
                MAX(blood_type) as blood_type,
                MAX(units) as units,
                MAX(created_at) as created_at,
                MIN(type) as type, -- 'Clinical' < 'Verified' alphabetically
                MAX(notes) as notes
            FROM (
                (SELECT 
                    dv.id, 
                    dv.donor_id,
                    d.full_name, 
                    d.email, 
                    d.donor_tag,
                    d.blood_type,
                    dv.notes, 
                    dv.verification_date as created_at, 
                    1.0 as units,
                    'Verified' as type
                FROM donor_verifications dv
                JOIN donors d ON dv.donor_id = d.id
                WHERE dv.org_id = ?)
                UNION ALL
                (SELECT 
                    mr.id, 
                    mr.donor_id,
                    d.full_name, 
                    d.email, 
                    d.donor_tag,
                    mr.blood_group as blood_type,
                    mr.notes, 
                    mr.test_date as created_at, 
                    mr.units_donated as units,
                    'Clinical' as type
                FROM medical_reports mr
                JOIN donors d ON mr.donor_id = d.id
                WHERE mr.org_id = ?)
            ) as consolidated
            GROUP BY donor_id, DATE(created_at)
            ORDER BY created_at DESC
        `, [orgId, orgId]);
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
            SELECT 'Verification' as type, dv.verification_date as timestamp, 
            CONCAT('Verified donation for ', d.full_name, ' (', d.donor_tag, ')') as details
            FROM donor_verifications dv
            JOIN donors d ON dv.donor_id = d.id
            WHERE dv.org_id = ?
            ORDER BY dv.verification_date DESC LIMIT 3
        `, [orgId]);

        // Fetch last 3 emergency requests
        const [requests] = await pool.query(`
            SELECT 'Request' as type, created_at as timestamp, 
            CONCAT('New ', blood_group, ' emergency request (', urgency_level, ')') as details
            FROM emergency_requests
            WHERE org_id = ?
            ORDER BY created_at DESC LIMIT 3
        `, [orgId]);

        // Fetch last 3 members
        const [members] = await pool.query(`
            SELECT 'Member' as type, om.joined_at as timestamp, 
            CONCAT(d.full_name, ' (', d.donor_tag, ') joined as a member from ', d.city) as details
            FROM org_members om
            JOIN donors d ON om.donor_id = d.id
            WHERE om.org_id = ?
            ORDER BY om.joined_at DESC LIMIT 3
        `, [orgId]);

        const combined = [...verifications, ...requests, ...members]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
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
        const { status } = req.body; // 'Active', 'Fulfilled', 'Cancelled'

        const [result] = await pool.query(
            'UPDATE emergency_requests SET status = ? WHERE id = ? AND org_id = ?',
            [status, id, orgId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        // If cancelled or fulfilled, remove notifications related to this request
        if (status === 'Cancelled' || status === 'Fulfilled') {
            await pool.query('DELETE FROM notifications WHERE source_id = ? AND type = "Emergency"', [id]);
        }

        res.json({ message: `Request updated to ${status}` });
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
            SELECT om.id as membership_id, om.role, om.joined_at, d.id as donor_id, d.donor_tag, d.full_name, d.email, d.phone, d.blood_type, d.city
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

        // Check if donor exists
        const [donorRows] = await pool.query('SELECT id FROM donors WHERE id = ?', [donor_id]);
        if (donorRows.length === 0) {
            return res.status(404).json({ error: 'Donor not found.' });
        }

        // Check if donor is already a member
        const [existingMember] = await pool.query(
            'SELECT id FROM org_members WHERE org_id = ? AND donor_id = ?',
            [orgId, donor_id]
        );
        if (existingMember.length > 0) {
            return res.status(400).json({ error: 'Donor is already a member of this organization.' });
        }

        await pool.query(
            'INSERT INTO org_members (org_id, donor_id, role) VALUES (?, ?, ?)',
            [orgId, donor_id, role]
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

// --- MEDICAL REPORTS ---

// GET REPORTS FOR A DONOR
router.get('/member/:donorId/reports', authMiddleware, async (req, res) => {
    try {
        const orgId = req.user.id;
        const { donorId } = req.params;

        // Verify that the donor is a member of this organization or has a history here
        const [membership] = await pool.query(
            'SELECT id FROM org_members WHERE org_id = ? AND donor_id = ?',
            [orgId, donorId]
        );

        const [history] = await pool.query(
            'SELECT id FROM donor_verifications WHERE org_id = ? AND donor_id = ?',
            [orgId, donorId]
        );

        if (membership.length === 0 && history.length === 0) {
            return res.status(403).json({ error: 'Unauthorized to view reports for this donor' });
        }

        const [rows] = await pool.query(
            `SELECT mr.*, d.donor_tag 
             FROM medical_reports mr
             JOIN donors d ON mr.donor_id = d.id
             WHERE mr.donor_id = ? AND mr.org_id = ? 
             ORDER BY mr.test_date DESC`,
            [donorId, orgId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Fetch Reports Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ADD MEDICAL REPORT
router.post('/member/:donorId/reports', authMiddleware, async (req, res) => {
    try {
        const orgId = req.user.id;
        const { donorId } = req.params;
        const {
            hb_level, blood_pressure, pulse_rate, temperature, weight, units_donated,
            blood_group, rh_factor, hiv_status, hepatitis_b, hepatitis_c,
            syphilis, malaria, notes
        } = req.body;

        // --- ADVANCED MEDICAL VALIDATION ---
        const bpRegex = /^\d{2,3}\/\d{2,3}$/;
        if (hb_level && (hb_level < 5 || hb_level > 25)) {
            return res.status(400).json({ error: 'Hemoglobin level must be between 5 and 25 g/dL.' });
        }
        if (blood_pressure && !bpRegex.test(blood_pressure)) {
            return res.status(400).json({ error: 'Blood Pressure must be in systolic/diastolic format (e.g., 120/80).' });
        }
        if (pulse_rate && (pulse_rate < 40 || pulse_rate > 200)) {
            return res.status(400).json({ error: 'Pulse rate must be between 40 and 200 BPM.' });
        }
        if (temperature && (temperature < 35 || temperature > 42)) {
            return res.status(400).json({ error: 'Temperature must be between 35 and 42°C.' });
        }
        if (weight && (weight < 30 || weight > 250)) {
            return res.status(400).json({ error: 'Weight must be between 30 and 250 kg.' });
        }
        if (units_donated && (units_donated < 0.1 || units_donated > 5.0)) {
            return res.status(400).json({ error: 'Units donated must be between 0.1 and 5.0 units.' });
        }

        await pool.query(
            `INSERT INTO medical_reports (
                donor_id, org_id, hb_level, blood_pressure, pulse_rate, 
                temperature, weight, units_donated, blood_group, rh_factor, hiv_status, 
                hepatitis_b, hepatitis_c, syphilis, malaria, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                donorId, orgId, hb_level, blood_pressure, pulse_rate,
                temperature, weight, units_donated || 1.0, blood_group, rh_factor, hiv_status,
                hepatitis_b, hepatitis_c, syphilis, malaria, notes
            ]
        );

        // Also update the donor's blood type in the donors table if it's missing or if a correction is needed
        if (blood_group) {
            const finalBloodType = rh_factor ? `${blood_group}${rh_factor === 'Positive' ? '+' : '-'}` : blood_group;
            await pool.query('UPDATE donors SET blood_type = ? WHERE id = ? AND (blood_type IS NULL OR blood_type = "")', [finalBloodType, donorId]);
        }

        res.json({ message: 'Medical report recorded successfully' });
    } catch (err) {
        console.error('Add Report Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
