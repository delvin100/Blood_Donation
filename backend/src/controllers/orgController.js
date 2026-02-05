const pool = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { calculateDonorAvailability } = require('../utils/donorUtils');
const { addOrgLog } = require('../utils/logUtils');


const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

exports.register = async (req, res) => {
    try {
        const { name, email, phone, password, confirm_password, license_number, type, state, district, city, address } = req.body;
        if (password !== confirm_password) return res.status(400).json({ error: 'Passwords do not match.' });
        const hash = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            `INSERT INTO organizations (name, email, phone, password_hash, license_number, type, state, district, city, address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [name, email, phone, hash, license_number, type, state, district, city, address]
        );
        const token = jwt.sign({ id: result.insertId, role: 'organization' }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: result.insertId, name, email, type, role: 'organization' } });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const [rows] = await pool.query('SELECT * FROM organizations WHERE email = ? LIMIT 1', [email]);
        if (rows.length === 0) return res.status(400).json({ error: 'Invalid credentials.' });
        const org = rows[0];
        const match = await bcrypt.compare(password, org.password_hash);
        if (!match) return res.status(400).json({ error: 'Invalid credentials.' });
        const token = jwt.sign({ id: org.id, role: 'organization' }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: org.id, name: org.name, email: org.email, type: org.type, role: 'organization' } });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getStats = async (req, res) => {
    try {
        const orgId = req.user.id;
        const [inventory] = await pool.query('SELECT SUM(units) as total_units FROM blood_inventory WHERE org_id = ?', [orgId]);
        const [requests] = await pool.query('SELECT COUNT(*) as active_requests FROM emergency_requests WHERE org_id = ? AND status = ?', [orgId, 'Active']);
        const [verifications] = await pool.query('SELECT COUNT(*) as verified_count FROM donor_verifications WHERE org_id = ? AND status = ?', [orgId, 'Verified']);
        const [breakdown] = await pool.query('SELECT blood_group, units, min_threshold FROM blood_inventory WHERE org_id = ?', [orgId]);
        res.json({ total_units: inventory[0].total_units || 0, active_requests: requests[0].active_requests || 0, verified_count: verifications[0].verified_count || 0, inventory_breakdown: breakdown });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getInventory = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM blood_inventory WHERE org_id = ?', [req.user.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updateInventory = async (req, res) => {
    try {
        const { blood_group, units, min_threshold, isDonation } = req.body;
        await pool.query(`INSERT INTO blood_inventory (org_id, blood_group, units, min_threshold) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE units = ?, min_threshold = IFNULL(?, min_threshold)`, [req.user.id, blood_group, units, min_threshold || 5, units, min_threshold]);

        await addOrgLog(req.user.id, 'INVENTORY_SYNC', blood_group, `Inventory updated for ${blood_group} (+${units} units)`);

        res.json({ message: 'Inventory updated' });


    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT name, email, phone, license_number, type, state, district, city, address, created_at FROM organizations WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Organization not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, email, phone, license_number, type, state, district, city, address } = req.body;
        await pool.query(
            `UPDATE organizations SET name = ?, email = ?, phone = ?, license_number = ?, type = ?, state = ?, district = ?, city = ?, address = ? WHERE id = ?`,
            [name, email, phone, license_number, type, state, district, city, address, req.user.id]
        );
        res.json({ message: 'Profile updated' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.searchDonor = async (req, res) => {
    try {
        const { query } = req.query;
        const [rows] = await pool.query(
            'SELECT id, full_name, email, phone, blood_type, availability, donor_tag FROM donors WHERE email LIKE ? OR phone LIKE ? OR full_name LIKE ? LIMIT 10',
            [`%${query}%`, `%${query}%`, `%${query}%`]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getAnalytics = async (req, res) => {
    try {
        const orgId = req.user.id;
        const [verifications] = await pool.query(
            `SELECT DATE_FORMAT(verification_date, '%Y-%m-%d') as date, COUNT(*) as count 
             FROM donor_verifications WHERE org_id = ? AND verification_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             GROUP BY date ORDER BY date`, [orgId]
        );
        const [requests] = await pool.query(
            `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, COUNT(*) as count 
             FROM emergency_requests WHERE org_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             GROUP BY date ORDER BY date`, [orgId]
        );
        res.json({ verifications, requests });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getGeographicStats = async (req, res) => {
    try {
        const orgId = req.user.id;
        const [rows] = await pool.query(
            `SELECT d.city, COUNT(*) as count 
             FROM org_members om JOIN donors d ON om.donor_id = d.id 
             WHERE om.org_id = ? GROUP BY d.city ORDER BY count DESC`, [orgId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching geographic stats:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM org_logs WHERE org_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error in getHistory:', err);
        res.status(500).json({ error: 'Server error' });
    }
};



exports.getRequests = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM emergency_requests WHERE org_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.createRequest = async (req, res) => {
    try {
        const { blood_group, units_required, urgency_level, description } = req.body;
        await pool.query(
            'INSERT INTO emergency_requests (org_id, blood_group, units_required, urgency_level, description) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, blood_group, units_required, urgency_level, description]
        );
        await addOrgLog(req.user.id, 'REQUEST_CREATE', blood_group, `Created ${urgency_level} request for ${units_required} units of ${blood_group}`);
        res.json({ message: 'Request created' });

    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updateRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        await pool.query('UPDATE emergency_requests SET status = ? WHERE id = ? AND org_id = ?', [status, id, req.user.id]);
        await addOrgLog(req.user.id, 'REQUEST_UPDATE', `Request #${id}`, `Updated request status to ${status}`);
        res.json({ message: 'Request status updated' });

    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getRecentActivity = async (req, res) => {
    try {
        const orgId = req.user.id;
        const [rows] = await pool.query(
            `(SELECT 'Verification' as type, d.full_name as title, dv.verification_date as timestamp 
              FROM donor_verifications dv JOIN donors d ON dv.donor_id = d.id WHERE dv.org_id = ?)
             UNION ALL
             (SELECT 'Emergency' as type, blood_group as title, created_at as timestamp 
              FROM emergency_requests WHERE org_id = ?)
             ORDER BY timestamp DESC LIMIT 10`, [orgId, orgId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getDonorReports = async (req, res) => {
    try {
        const { donorId } = req.params;
        const [rows] = await pool.query(`
            SELECT mr.*, o.name as org_name, o.city as org_city, o.email as org_email, o.address as org_address, o.phone as org_phone
            FROM medical_reports mr
            JOIN organizations o ON mr.org_id = o.id
            WHERE mr.donor_id = ? 
            ORDER BY mr.test_date DESC
        `, [donorId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.createMedicalReport = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { donorId } = req.params;
        const {
            hb_level, blood_pressure, pulse_rate, temperature, weight,
            units_donated, blood_group, rh_factor, hiv_status,
            hepatitis_b, hepatitis_c, syphilis, malaria, notes, isDonation
        } = req.body;

        // Ensure units_donated is a valid number for calculations
        const units = parseFloat(units_donated) || 0;

        // 1. Insert Medical Report
        await connection.query(
            `INSERT INTO medical_reports (donor_id, org_id, hb_level, blood_pressure, pulse_rate, temperature, weight, units_donated, blood_group, rh_factor, hiv_status, hepatitis_b, hepatitis_c, syphilis, malaria, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [donorId, req.user.id, hb_level, blood_pressure, pulse_rate, temperature, weight, units, blood_group, rh_factor, hiv_status, hepatitis_b, hepatitis_c, syphilis, malaria, notes]
        );

        // 2. If marked as Eligible Donation
        if (isDonation) {
            // Double check availability before recording donation (security/logic check)
            // Passing 'connection' ensures we see current transaction state
            const availability = await calculateDonorAvailability(donorId, connection);
            if (availability.status !== 'Available') {
                await connection.rollback();
                return res.status(400).json({ error: 'Donor is currently not available for donation' });
            }

            // Insert into donations table
            await connection.query(
                'INSERT INTO donations (donor_id, org_id, date, units, notes, hb_level, blood_pressure) VALUES (?, ?, NOW(), ?, ?, ?, ?)',
                [donorId, req.user.id, units, 'Clinical Donation', hb_level, blood_pressure]
            );

            // Update donor availability (re-run after donation to set to Unavailable)
            await calculateDonorAvailability(donorId, connection);


            // 3. Update Inventory (Increment units)
            // Using ON DUPLICATE KEY UPDATE to handle both new and existing blood groups for the org
            if (units > 0) {
                await connection.query(
                    `INSERT INTO blood_inventory (org_id, blood_group, units, min_threshold) 
                     VALUES (?, ?, ?, ?) 
                     ON DUPLICATE KEY UPDATE units = units + ?`,
                    [req.user.id, blood_group, units, 5, units]
                );
                await addOrgLog(req.user.id, 'INVENTORY_SYNC', blood_group, `Added ${units} units of ${blood_group} via Donation`, null, connection);
            }
        }

        // Fetch donor name for logging
        const [[donor]] = await connection.query('SELECT full_name FROM donors WHERE id = ?', [donorId]);
        const donorName = donor ? donor.full_name : `Donor ID: ${donorId}`;
        const description = isDonation
            ? `Recorded medical report and donation for ${donorName}`
            : `Recorded medical report for ${donorName}`;

        await addOrgLog(req.user.id, isDonation ? 'DONATION' : 'CLINICAL', donorName, description, null, connection);

        await connection.commit();



        res.json({ message: isDonation ? 'Donation recorded and donor status updated' : 'Clinical record created' });
    } catch (err) {
        await connection.rollback();
        console.error('Error in createMedicalReport:', err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        connection.release();
    }
};

exports.verifyDonor = async (req, res) => {
    try {
        const { donor_id, notes } = req.body;
        await pool.query(
            'INSERT INTO donor_verifications (org_id, donor_id, notes) VALUES (?, ?, ?)',
            [req.user.id, donor_id, notes]
        );
        const [[donor]] = await pool.query('SELECT full_name FROM donors WHERE id = ?', [donor_id]);
        const donorName = donor ? donor.full_name : `Donor ID: ${donor_id}`;

        await addOrgLog(req.user.id, 'VERIFICATION', donorName, `Verified ${donorName}`);
        // Also add a generic donation record if units were donated in the medical report (handled via frontend flow)
        res.json({ message: 'Donor verified' });


    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getMembers = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT om.joined_at, om.role, d.id as donor_id, d.full_name, d.email, d.phone, d.blood_type, d.donor_tag, d.availability 
             FROM org_members om JOIN donors d ON om.donor_id = d.id 
             WHERE om.org_id = ? ORDER BY om.joined_at DESC`, [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.addMember = async (req, res) => {
    try {
        const { donor_id, role } = req.body;
        await pool.query(
            'INSERT INTO org_members (org_id, donor_id, role) VALUES (?, ?, ?)',
            [req.user.id, donor_id, role || 'Member']
        );
        const [[donor]] = await pool.query('SELECT full_name FROM donors WHERE id = ?', [donor_id]);
        const donorName = donor ? donor.full_name : `Donor ID: ${donor_id}`;

        await addOrgLog(req.user.id, 'MEMBER_ADD', donorName, `Added ${donorName} as ${role || 'Member'}`);
        res.json({ message: 'Member added successfully' });


    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Already a member' });
        }
        res.status(500).json({ error: 'Server error' });
    }
};

exports.removeMember = async (req, res) => {
    try {
        const { donorId } = req.params;
        const orgId = req.user.id;

        const [[donor]] = await pool.query('SELECT full_name FROM donors WHERE id = ?', [donorId]);
        const donorName = donor ? donor.full_name : `Donor ID: ${donorId}`;

        await pool.query(
            'DELETE FROM org_members WHERE org_id = ? AND donor_id = ?',
            [orgId, donorId]
        );

        await addOrgLog(orgId, 'MEMBER_REMOVE', donorName, `Removed ${donorName} from organization`);

        res.json({ message: 'Member removed successfully' });


    } catch (err) {
        console.error('Error removing member:', err);
        res.status(500).json({ error: 'Server error' });
    }
};
