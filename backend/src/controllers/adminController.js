const pool = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials.' });
        const admin = rows[0];
        const match = (admin.password_hash.startsWith('$2')) ? await bcrypt.compare(password, admin.password_hash) : (password === admin.password_hash);
        if (!match) return res.status(401).json({ error: 'Invalid credentials.' });
        const token = jwt.sign({ id: admin.id, username: admin.username, role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, message: 'Login successful' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getStats = async (req, res) => {
    try {
        const [donors] = await pool.query('SELECT COUNT(*) as count FROM donors');
        const [orgs] = await pool.query('SELECT COUNT(*) as count FROM organizations');
        const [inventory] = await pool.query('SELECT SUM(units) as total FROM blood_inventory');
        res.json({ donors: donors[0].count, organizations: orgs[0].count, bloodUnits: inventory[0].total || 0 });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getDonors = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, full_name, email, blood_type, phone, gender, state, city, dob, availability, created_at FROM donors ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getOrganizations = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, email, phone, type, state, city, verified, created_at FROM organizations ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.verifyOrganization = async (req, res) => {
    try {
        await pool.query('UPDATE organizations SET verified = NOT verified WHERE id = ?', [req.params.id]);
        res.json({ message: 'Organization verification status updated.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getInventory = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT bi.*, o.name as org_name 
            FROM blood_inventory bi 
            JOIN organizations o ON bi.org_id = o.id 
            ORDER BY bi.last_updated DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getRequests = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT er.*, o.name as org_name 
            FROM emergency_requests er 
            JOIN organizations o ON er.org_id = o.id 
            ORDER BY er.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getReports = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT mr.*, d.full_name as donor_name, d.email as donor_email, d.blood_type, o.name as org_name 
            FROM medical_reports mr 
            JOIN donors d ON mr.donor_id = d.id 
            JOIN organizations o ON mr.org_id = o.id 
            ORDER BY mr.test_date DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getAdmins = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, username, created_at FROM admins ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.addAdmin = async (req, res) => {
    try {
        const { username, password } = req.body;
        const password_hash = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [username, password_hash]);
        res.json({ message: 'Admin added successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.deleteAdmin = async (req, res) => {
    try {
        await pool.query('DELETE FROM admins WHERE id = ?', [req.params.id]);
        res.json({ message: 'Admin deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getDonorDetails = async (req, res) => {
    try {
        const [donorRows] = await pool.query('SELECT * FROM donors WHERE id = ?', [req.params.id]);
        if (donorRows.length === 0) return res.status(404).json({ error: 'Donor not found' });

        const [donationRows] = await pool.query(`
            SELECT mr.*, o.name as org_name 
            FROM medical_reports mr 
            JOIN organizations o ON mr.org_id = o.id 
            WHERE mr.donor_id = ? 
            ORDER BY mr.test_date DESC
        `, [req.params.id]);

        const donor = donorRows[0];
        donor.donations = donationRows;
        res.json(donor);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getOrgDetails = async (req, res) => {
    try {
        const [orgRows] = await pool.query('SELECT * FROM organizations WHERE id = ?', [req.params.id]);
        if (orgRows.length === 0) return res.status(404).json({ error: 'Organization not found' });

        const [inventoryRows] = await pool.query('SELECT * FROM blood_inventory WHERE org_id = ?', [req.params.id]);
        const [memberRows] = await pool.query(`
            SELECT om.*, d.full_name, d.phone 
            FROM org_members om 
            JOIN donors d ON om.donor_id = d.id 
            WHERE om.org_id = ?
        `, [req.params.id]);
        const [requestRows] = await pool.query('SELECT * FROM emergency_requests WHERE org_id = ? ORDER BY created_at DESC', [req.params.id]);

        const org = orgRows[0];
        org.inventory = inventoryRows;
        org.members = memberRows;
        org.requests = requestRows;
        res.json(org);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getReportDetails = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT mr.*, d.full_name as donor_name, d.email as donor_email, d.phone as donor_phone, d.blood_type as donor_blood_type,
                   o.name as org_name, o.email as org_email, o.address as org_address
            FROM medical_reports mr 
            JOIN donors d ON mr.donor_id = d.id 
            JOIN organizations o ON mr.org_id = o.id 
            WHERE mr.id = ?
        `, [req.params.id]);

        if (rows.length === 0) return res.status(404).json({ error: 'Report not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.deleteDonor = async (req, res) => {
    try {
        await pool.query('DELETE FROM donors WHERE id = ?', [req.params.id]);
        res.json({ message: 'Donor deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.deleteOrganization = async (req, res) => {
    try {
        await pool.query('DELETE FROM organizations WHERE id = ?', [req.params.id]);
        res.json({ message: 'Organization deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.createBroadcast = async (req, res) => {
    try {
        // Stub for notifications since the frontend expects the endpoint
        res.json({ message: 'Broadcast sent successfully (Simulation)' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};
