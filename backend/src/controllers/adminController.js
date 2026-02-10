const pool = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { addAdminLog } = require('../utils/logUtils');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials.' });

        const admin = rows[0];
        if (admin.status === 'Disabled') {
            return res.status(403).json({ error: 'Currently disabled. Contact admin' });
        }
        const match = (admin.password_hash.startsWith('$2')) ? await bcrypt.compare(password, admin.password_hash) : (password === admin.password_hash);
        if (!match) return res.status(401).json({ error: 'Invalid credentials.' });
        const token = jwt.sign({ id: admin.id, username: admin.username, role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, username: admin.username, message: 'Login successful' });
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
        const [rows] = await pool.query('SELECT id, full_name, email, blood_type, phone, gender, state, district, city, dob, availability, created_at FROM donors ORDER BY full_name ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getOrganizations = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, email, phone, type, state, district, city, verified, created_at FROM organizations ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.verifyOrganization = async (req, res) => {
    try {
        const [result] = await pool.query('UPDATE organizations SET verified = NOT verified WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Organization not found.' });
        }
        const [org] = await pool.query('SELECT name FROM organizations WHERE id = ?', [req.params.id]);
        res.json({ message: 'Organization verification status updated.' });
        await addAdminLog(req.adminId, 'ORG_VERIFY', org[0]?.name, `Toggled verification status for ${org[0]?.name}`);
    } catch (err) {
        console.error('Update verification failed:', err);
        res.status(500).json({ error: err.message || 'Server error' });
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
        const [rows] = await pool.query('SELECT id, username, status, created_at FROM admins ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.addAdmin = async (req, res) => {
    try {
        // Super admin check
        const [currentAdmin] = await pool.query('SELECT username FROM admins WHERE id = ?', [req.adminId]);
        if (!currentAdmin.length || currentAdmin[0].username !== 'admin') {
            return res.status(403).json({ error: 'Only the super admin can create new admin accounts.' });
        }

        const { username, password } = req.body;
        const password_hash = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [username, password_hash]);
        res.json({ message: 'Admin added successfully' });
        await addAdminLog(req.adminId, 'ADMIN_ADD', username, `Created new admin account: ${username}`);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.deleteAdmin = async (req, res) => {
    try {
        const [admin] = await pool.query('SELECT username FROM admins WHERE id = ?', [req.params.id]);
        await pool.query('DELETE FROM admins WHERE id = ?', [req.params.id]);
        res.json({ message: 'Admin deleted successfully' });
        await addAdminLog(req.adminId, 'ADMIN_DELETE', admin[0]?.username, `Deleted admin account: ${admin[0]?.username}`);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.toggleAdminStatus = async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent disabling the main 'admin' account
        const [admin] = await pool.query('SELECT username, status FROM admins WHERE id = ?', [id]);
        if (!admin.length) return res.status(404).json({ error: 'Admin not found' });
        if (admin[0].username === 'admin') {
            return res.status(400).json({ error: 'Super admin account cannot be disabled' });
        }

        const newStatus = admin[0].status === 'Active' ? 'Disabled' : 'Active';
        await pool.query('UPDATE admins SET status = ? WHERE id = ?', [newStatus, id]);

        res.json({ message: `Admin status updated to ${newStatus}`, status: newStatus });
        await addAdminLog(req.adminId, 'ADMIN_STATUS', admin[0]?.username, `Changed ${admin[0]?.username} status to ${newStatus}`);
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
            SELECT om.*, d.full_name, d.phone, d.email, d.blood_type, d.city 
            FROM org_members om 
            JOIN donors d ON om.donor_id = d.id 
            WHERE om.org_id = ?
            ORDER BY om.joined_at DESC
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
        const [donor] = await pool.query('SELECT full_name FROM donors WHERE id = ?', [req.params.id]);
        await pool.query('DELETE FROM donors WHERE id = ?', [req.params.id]);
        res.json({ message: 'Donor deleted successfully' });
        await addAdminLog(req.adminId, 'DONOR_DELETE', donor[0]?.full_name, `Permanently removed donor: ${donor[0]?.full_name}`);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.deleteOrganization = async (req, res) => {
    try {
        const [org] = await pool.query('SELECT name FROM organizations WHERE id = ?', [req.params.id]);
        await pool.query('DELETE FROM organizations WHERE id = ?', [req.params.id]);
        res.json({ message: 'Organization deleted successfully' });
        await addAdminLog(req.adminId, 'ORG_DELETE', org[0]?.name, `Permanently removed organization: ${org[0]?.name}`);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.createBroadcast = async (req, res) => {
    const { target, recipient_type, recipient_ids, title, message } = req.body;

    try {
        if (['all', 'donors', 'organizations'].includes(target)) {
            // New Global Broadcast System
            await pool.query(
                'INSERT INTO broadcasts (target, title, message) VALUES (?, ?, ?)',
                [target, title, message]
            );

            res.json({ message: `Global broadcast "${title}" sent to ${target}.` });
            await addAdminLog(req.adminId, 'BROADCAST', title, `Sent global broadcast: "${title}" target: ${target}`);
            return;
        }

        // Specific recipient logic
        let recipients = [];
        if (target === 'specific' && recipient_ids && recipient_type) {
            recipients = recipient_ids.map(id => ({ id, type: recipient_type }));
        }

        if (recipients.length === 0) {
            return res.status(400).json({ error: 'No recipients found' });
        }

        // Bulk insert notifications
        const values = recipients.map(r => [
            r.id,
            r.type,
            'BROADCAST',
            title,
            message
        ]);

        await pool.query(
            'INSERT INTO notifications (recipient_id, recipient_type, type, title, message) VALUES ?',
            [values]
        );

        res.json({ message: `Broadcast sent successfully to ${recipients.length} recipients.` });
        await addAdminLog(req.adminId, 'BROADCAST', title, `Sent broadcast: "${title}" to ${recipients.length} specific recipients`);
    } catch (err) {
        console.error('Broadcast Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getActivityLogs = async (req, res) => {
    try {
        const [admin] = await pool.query('SELECT username FROM admins WHERE id = ?', [req.adminId]);
        const isMasterAdmin = admin.length > 0 && admin[0].username === 'admin';

        // 1. Fetch Organization logs (Visible to all admins)
        const [orgLogs] = await pool.query(`
            SELECT 'Organization' as entity_type, ol.action_type, ol.entity_name, ol.description, ol.created_at, o.name as origin_name
            FROM org_logs ol 
            JOIN organizations o ON ol.org_id = o.id
        `);

        // 2. Fetch Donor logs (Visible to all admins)
        const [donorLogs] = await pool.query(`
            SELECT 'Donor' as entity_type, dl.action_type, dl.entity_name, dl.description, dl.created_at, d.full_name as origin_name
            FROM donor_logs dl
            JOIN donors d ON dl.donor_id = d.id
        `);

        // 3. Fetch Admin logs (ONLY if master admin)
        let adminLogs = [];
        if (isMasterAdmin) {
            const [rows] = await pool.query(`
                SELECT 'Admin' as entity_type, al.action_type, al.entity_name, al.description, al.created_at, ad.username as origin_name
                FROM admin_logs al
                JOIN admins ad ON al.admin_id = ad.id
            `);
            adminLogs = rows;
        }

        // 4. Combine and Sort
        const allLogs = [...orgLogs, ...donorLogs, ...adminLogs].sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        );

        res.json(allLogs);
    } catch (err) {
        console.error('getActivityLogs error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};
