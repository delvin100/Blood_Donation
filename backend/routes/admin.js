const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Middleware to verify Admin Token
const verifyAdminToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided.' });

    jwt.verify(token.split(' ')[1], JWT_SECRET, (err, decoded) => {
        if (err) return res.status(500).json({ error: 'Failed to authenticate token.' });
        if (decoded.role !== 'admin') return res.status(403).json({ error: 'Not authorized.' });
        req.adminId = decoded.id;
        next();
    });
};

// Admin Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required.' });
        }

        const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const admin = rows[0];
        let match = false;

        // 1. Try Bcrypt compare
        if (admin.password_hash && admin.password_hash.startsWith('$2')) {
            match = await bcrypt.compare(password, admin.password_hash);
        }

        // 2. Fallback: Plaintext compare
        if (!match && password === admin.password_hash) {
            match = true;
        }

        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const token = jwt.sign({ id: admin.id, username: admin.username, role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, message: 'Login successful' });

    } catch (err) {
        console.error('Admin Login Error:', err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// Get Dashboard Stats
router.get('/stats', verifyAdminToken, async (req, res) => {
    try {
        const [donorRows] = await pool.query('SELECT COUNT(*) as count FROM donors');
        const [orgRows] = await pool.query('SELECT COUNT(*) as count FROM organizations');
        // Corrected table name 'blood_inventory' and column 'units'
        const [inventoryRows] = await pool.query('SELECT SUM(units) as total FROM blood_inventory');

        res.json({
            donors: donorRows[0].count,
            organizations: orgRows[0].count,
            bloodUnits: inventoryRows[0].total || 0
        });
    } catch (err) {
        console.error('Admin Stats Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get All Donors
router.get('/donors', verifyAdminToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, full_name, email, blood_type, phone, gender, state, city, dob, availability, created_at FROM donors ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        console.error('Admin Donors Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get All Organizations
router.get('/organizations', verifyAdminToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, email, phone, type, state, city, verified, created_at FROM organizations ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        console.error('Admin Organizations Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Global Blood Inventory
router.get('/inventory', verifyAdminToken, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT bi.id, o.name as org_name, bi.blood_group, bi.units, bi.last_updated 
            FROM blood_inventory bi
            JOIN organizations o ON bi.org_id = o.id
            ORDER BY bi.last_updated DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error('Admin Inventory Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get All Emergency Requests
router.get('/requests', verifyAdminToken, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT er.id, o.name as org_name, er.blood_group, er.units_required, er.urgency_level, er.status, er.created_at
            FROM emergency_requests er
            JOIN organizations o ON er.org_id = o.id
            ORDER BY er.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error('Admin Requests Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Verify Organization
router.put('/organizations/:id/verify', verifyAdminToken, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('UPDATE organizations SET verified = NOT verified WHERE id = ?', [id]);
        res.json({ message: 'Organization verification status updated.' });
    } catch (err) {
        console.error('Admin Verify Org Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete Organization
router.delete('/organizations/:id', verifyAdminToken, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM organizations WHERE id = ?', [id]);
        res.json({ message: 'Organization deleted successfully.' });
    } catch (err) {
        console.error('Admin Delete Org Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete Donor
router.delete('/donors/:id', verifyAdminToken, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM donors WHERE id = ?', [id]);
        res.json({ message: 'Donor deleted successfully.' });
    } catch (err) {
        console.error('Admin Delete Donor Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});


// Get All Medical Reports (Donation History)
router.get('/reports', verifyAdminToken, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT mr.id, mr.test_date, mr.units_donated, mr.hb_level, mr.blood_pressure, mr.weight, mr.notes,
                   d.full_name as donor_name, d.email as donor_email, d.blood_type,
                   o.name as org_name
            FROM medical_reports mr
            JOIN donors d ON mr.donor_id = d.id
            JOIN organizations o ON mr.org_id = o.id
            ORDER BY mr.test_date DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error('Admin Reports Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});


// Get All Medical Reports (Donation History)
router.get('/reports', verifyAdminToken, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT mr.id, mr.test_date, mr.units_donated, mr.hb_level, mr.blood_pressure, mr.weight, mr.notes,
                   d.full_name as donor_name, d.email as donor_email, d.blood_type,
                   o.name as org_name
            FROM medical_reports mr
            JOIN donors d ON mr.donor_id = d.id
            JOIN organizations o ON mr.org_id = o.id
            ORDER BY mr.test_date DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error('Admin Reports Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
