const pool = require('../config/database');

exports.getDonors = async (req, res) => {
    try {
        const { blood_type, city } = req.query;
        let sql = 'SELECT id, username, full_name, phone, blood_type, city, district FROM donors WHERE availability = "Available"';
        const params = [];
        if (blood_type) { sql += ' AND blood_type = ?'; params.push(blood_type); }
        if (city) { sql += ' AND (city LIKE ? OR district LIKE ?)'; params.push(`%${city}%`, `%${city}%`); }
        sql += ' ORDER BY created_at DESC LIMIT 200';
        const [rows] = await pool.query(sql, params);
        res.json(rows.map(r => ({ id: r.id, name: r.full_name || r.username, phone: r.phone, blood_group: r.blood_type, city: r.city || r.district || 'N/A' })));
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getFeaturedDonors = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, full_name, username, blood_type, city, district FROM donors WHERE availability = "Available" ORDER BY created_at DESC LIMIT 8');
        res.json(rows.map(r => ({ id: r.id, name: r.full_name || r.username, blood_group: r.blood_type, city: r.city || r.district || 'N/A' })));
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.addSeeker = async (req, res) => {
    try {
        const { full_name, email, phone, blood_type, required_by, country, state, district } = req.body;
        const [result] = await pool.query(
            `INSERT INTO seekers (full_name, email, phone, blood_type, required_by, country, state, district, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [full_name, email, phone, blood_type, required_by, country || 'India', state, district]
        );
        res.json({ id: result.insertId, message: 'Request saved successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};
