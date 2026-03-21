const pool = require('../config/database');

exports.getFeaturedDonors = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, full_name, username, blood_type, city, district FROM donors WHERE availability = \'Available\' ORDER BY created_at DESC LIMIT 8');
        res.json(rows.map(r => ({ id: r.id, name: r.full_name || r.username, blood_group: r.blood_type, city: r.city || r.district || 'N/A' })));
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.searchOrganizations = async (req, res) => {
    try {
        const { city, state, district, type } = req.query;
        let sql = `
            SELECT o.id, o.name, o.type, o.address, o.city, o.district, o.state, o.phone, o.verified, o.latitude, o.longitude,
            (SELECT COUNT(*) FROM emergency_requests WHERE org_id = o.id AND status = 'Active') as active_emergencies
            FROM organizations o 
            WHERE o.verified = 1
        `;
        const params = [];

        if (city) {
            sql += ' AND city LIKE ?';
            params.push(`%${city}%`);
        }

        if (state) {
            sql += ' AND state = ?';
            params.push(state);
        }

        if (district) {
            sql += ' AND district = ?';
            params.push(district);
        }

        if (type && type !== 'All') {
            sql += ' AND type = ?';
            params.push(type);
        }

        sql += ' ORDER BY verified DESC, name ASC LIMIT 50';
        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error('Error searching organizations:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.nearbyOrganizations = async (req, res) => {
    try {
        const { lat, lng, type } = req.query;
        if (!lat || !lng) return res.status(400).json({ error: 'Lat/Lng required' });

        let sql = `
            SELECT o.id, o.name, o.type, o.address, o.city, o.district, o.state, o.phone, o.verified, o.latitude, o.longitude,
            (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude)))) AS distance,
            (SELECT COUNT(*) FROM emergency_requests WHERE org_id = o.id AND status = 'Active') as active_emergencies
            FROM organizations o
            WHERE o.verified = 1
        `;
        const params = [lat, lng, lat];

        if (type && type !== 'All') {
            sql += ' AND o.type = ?';
            params.push(type);
        }

        sql += `
            HAVING distance < 25
            ORDER BY distance ASC
            LIMIT 20
        `;

        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error('Error finding nearby organizations:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getPublicOrgInventory = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT blood_group, units FROM blood_inventory WHERE org_id = ? ORDER BY blood_group ASC', [id]);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching org inventory:', err);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getOrgEmergencyRequests = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(
            "SELECT blood_group, units_required as units, urgency_level as priority, description, created_at FROM emergency_requests WHERE org_id = ? AND status = 'Active' ORDER BY urgency_level DESC, created_at DESC",
            [id]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching org emergency requests:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getOrgEvents = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(
            "SELECT id, event_name, start_date, start_time, end_date, end_time, location, description, status FROM blood_drives WHERE org_id = ? AND status IN ('Upcoming', 'Active') ORDER BY start_date ASC, start_time ASC",
            [id]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching org events:', err);
        res.status(500).json({ error: 'Server error' });
    }
};
