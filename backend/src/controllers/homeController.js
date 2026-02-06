const pool = require('../config/database');

exports.getFeaturedDonors = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, full_name, username, blood_type, city, district FROM donors WHERE availability = "Available" ORDER BY created_at DESC LIMIT 8');
        res.json(rows.map(r => ({ id: r.id, name: r.full_name || r.username, blood_group: r.blood_type, city: r.city || r.district || 'N/A' })));
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};
