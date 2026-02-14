const pool = require('../config/database');
const { calculateSuitabilityScore, getCompatibleBloodTypes } = require('../utils/matchUtils');

exports.getSmartMatches = async (req, res) => {
    try {
        const { blood_type, lat, lng, city, district } = req.query;

        if (!blood_type) {
            return res.status(400).json({ error: 'Missing blood_type' });
        }

        // 1. Fetch compatible donors who are available
        const compatibleTypes = getCompatibleBloodTypes(blood_type);

        // Use IN clause for multiple blood types
        const placeholders = compatibleTypes.map(() => '?').join(',');
        const [donors] = await pool.query(`
            SELECT 
                d.id, d.username, d.full_name, d.phone, d.email, d.blood_type, 
                d.state, d.district, d.city, d.latitude, d.longitude,
                d.total_donations as base_donations,
                (SELECT MAX(date) FROM donations WHERE donor_id = d.id) as last_donation_date,
                (SELECT COUNT(*) FROM donations WHERE donor_id = d.id) as live_donations
            FROM donors d
            WHERE d.availability = 'Available' AND d.blood_type IN (${placeholders})
        `, compatibleTypes);

        // 2. Calculate scores asynchronously
        const scoredDonors = await Promise.all(donors.map(async (donor) => {
            // Normalize donor object for utilities: combine seeded history and live data
            const donorForCalculations = {
                ...donor,
                total_donations: Math.max(donor.base_donations || 0, donor.live_donations || 0)
            };

            const { score, distance, ml_prediction, heuristic_score, compatibility_score: compatibilityScore } = await calculateSuitabilityScore(donorForCalculations, {
                lat: lat ? parseFloat(lat) : null,
                lng: lng ? parseFloat(lng) : null,
                city,
                district,
                blood_type
            });

            const combined_donations = donorForCalculations.total_donations;

            return {
                id: donor.id,
                name: donor.full_name || donor.username,
                email: donor.email,
                phone: donor.phone,
                blood_group: donor.blood_type,
                city: donor.city || 'N/A',
                district: donor.district || 'N/A',
                state: donor.state || 'N/A',
                distance,
                suitability_score: score,
                compatibility_score: compatibilityScore, // New field
                total_donations: combined_donations,
                ai_confidence: ml_prediction,
                prediction_type: ml_prediction > 0.7 ? 'High' : ml_prediction > 0.4 ? 'Moderate' : 'Low'
            };
        }));

        // 3. Rank by score descending
        // 3. Rank by distance ascending (closest first)
        scoredDonors.sort((a, b) => {
            // Handle null/undefined distances by pushing them to the end
            const distA = (a.distance === null || a.distance === undefined) ? Infinity : a.distance;
            const distB = (b.distance === null || b.distance === undefined) ? Infinity : b.distance;
            return distA - distB;
        });

        // 4. Log suggestions to DB (non-blocking)
        // 4. Log suggestions to DB (non-blocking)
        // Log top 50 matches to avoid overwhelming the database with too many inserts,
        // but return ALL matching donors to the frontend as requested.
        const donorsToLog = scoredDonors.slice(0, 50);
        donorsToLog.forEach(donor => {
            pool.query(
                'INSERT INTO match_outcomes (donor_id, seeker_id, suggested_at, outcome, suitability_score, distance_km) VALUES (?, ?, NOW(), ?, ?, ?)',
                [donor.id, null, 'Pending', donor.suitability_score, donor.distance]
            ).catch(err => console.error('Error logging suggestion:', err));
        });

        // Return ALL donors (no limit) so the user can see everyone
        res.json(scoredDonors);
    } catch (err) {
        console.error("Error in getSmartMatches:", err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getDonors = async (req, res) => {
    try {
        const { blood_type, state, district, city } = req.query;
        let sql = 'SELECT id, username, full_name, phone, email, blood_type, state, district, city FROM donors WHERE availability = "Available"';
        const params = [];

        if (blood_type) {
            sql += ' AND blood_type = ?';
            params.push(blood_type);
        }

        if (state) {
            sql += ' AND state = ?';
            params.push(state);
        }

        if (district) {
            sql += ' AND district = ?';
            params.push(district);
        }

        if (city) {
            sql += ' AND (city LIKE ? OR district LIKE ?)';
            params.push(`%${city}%`, `%${city}%`);
        }

        sql += ' ORDER BY created_at DESC LIMIT 200';
        const [rows] = await pool.query(sql, params);
        res.json(rows.map(r => ({
            id: r.id,
            name: r.full_name || r.username,
            email: r.email,
            phone: r.phone,
            blood_group: r.blood_type,
            city: r.city || 'N/A',
            district: r.district || 'N/A',
            state: r.state || 'N/A'
        })));
    } catch (err) {
        console.error("Error in getDonors:", err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getFeaturedDonors = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, full_name, username, blood_type, city, district, state FROM donors WHERE availability = "Available" ORDER BY created_at DESC LIMIT 8');
        res.json(rows.map(r => ({
            id: r.id,
            name: r.full_name || r.username,
            blood_group: r.blood_type,
            city: r.city || 'N/A',
            district: r.district || 'N/A',
            state: r.state || 'N/A'
        })));
    } catch (err) {
        console.error("Error in getFeaturedDonors:", err);
        res.status(500).json({ error: 'Server error' });
    }
};


