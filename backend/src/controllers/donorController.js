const pool = require('../config/database');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const { calculateDonorAvailability } = require('../utils/donorUtils');

exports.getStats = async (req, res) => {
    try {
        const donorId = req.user.id;
        const availabilityInfo = await calculateDonorAvailability(donorId);
        const [donorRows] = await pool.query('SELECT * FROM donors WHERE id = ?', [donorId]);
        if (donorRows.length === 0) return res.status(404).json({ error: 'Donor not found' });
        const donor = donorRows[0];

        const [donations] = await pool.query(`
            SELECT d.*, o.name as org_name FROM donations d 
            LEFT JOIN organizations o ON d.org_id = o.id 
            WHERE d.donor_id = ? ORDER BY d.date DESC
        `, [donorId]);

        const [memberships] = await pool.query(`
            SELECT om.joined_at, om.role, o.name as org_name, o.type as org_type, o.city as org_city
            FROM org_members om JOIN organizations o ON om.org_id = o.id
            WHERE om.donor_id = ? ORDER BY om.joined_at DESC
        `, [donorId]);

        const [unreadNotifications] = await pool.query(
            'SELECT COUNT(*) as count FROM notifications WHERE recipient_id = ? AND recipient_type = "Donor" AND is_read = FALSE',
            [donorId]
        );

        const totalDonations = donations.length;
        let milestone = 'Bronze';
        if (totalDonations >= 10) milestone = 'Gold';
        else if (totalDonations >= 5) milestone = 'Silver';

        res.json({
            user: donor,
            stats: {
                totalDonations,
                lastDonation: availabilityInfo.lastDonationDate,
                nextEligibleDate: availabilityInfo.nextEligibleDate,
                isEligible: availabilityInfo.status === 'Available',
                membershipCount: memberships.length,
                unreadNotifications: unreadNotifications[0].count,
                livesSaved: totalDonations * 3,
                milestone
            },
            donations,
            memberships
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getReports = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT mr.*, o.name as org_name, o.city as org_city, o.email as org_email, o.address as org_address, o.phone as org_phone,
                   d.full_name as donor_name, d.email as donor_email, d.phone as donor_phone
            FROM medical_reports mr 
            JOIN organizations o ON mr.org_id = o.id
            JOIN donors d ON mr.donor_id = d.id
            WHERE mr.donor_id = ? ORDER BY mr.test_date DESC
        `, [req.user.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.addDonation = async (req, res) => {
    try {
        const { date, units, notes, hb_level, blood_pressure } = req.body;
        await pool.query('INSERT INTO donations (donor_id, date, units, notes, hb_level, blood_pressure) VALUES (?, ?, ?, ?, ?, ?)', [req.user.id, date, units, notes, hb_level, blood_pressure]);
        await calculateDonorAvailability(req.user.id);
        res.json({ message: 'Donation recorded successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { full_name, email, dob, phone, blood_type, gender, state, district, city, username, password } = req.body;
        let passwordHash = password ? await bcrypt.hash(password, 10) : null;
        await pool.query(`
            UPDATE donors SET 
                full_name = COALESCE(?, full_name), email = COALESCE(?, email), 
                dob = ?, phone = ?, blood_type = ?, gender = ?, state = ?, district = ?, city = ?,
                username = COALESCE(?, username), password_hash = COALESCE(?, password_hash)
            WHERE id = ?`,
            [full_name, email, dob, phone, blood_type, gender, state, district, city, username, passwordHash, req.user.id]
        );
        res.json({ message: 'Profile updated' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Please upload an image' });
        const profilePicUrl = `/uploads/${req.file.filename}`;
        await pool.query('UPDATE donors SET profile_picture = ? WHERE id = ?', [profilePicUrl, req.user.id]);
        res.json({ message: 'Picture updated', profile_picture: profilePicUrl });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getUrgentNeeds = async (req, res) => {
    try {
        const [donorRows] = await pool.query('SELECT blood_type, city FROM donors WHERE id = ?', [req.user.id]);
        if (donorRows.length === 0) return res.status(404).json({ error: 'Donor not found' });
        const { blood_type, city } = donorRows[0];
        const [requests] = await pool.query(`
            SELECT er.*, o.name as org_name, o.city as org_city FROM emergency_requests er
            JOIN organizations o ON er.org_id = o.id
            WHERE er.blood_group = ? AND er.status = 'Active' AND o.city = ?
            ORDER BY er.created_at DESC
        `, [blood_type, city]);
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getNotifications = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM notifications WHERE recipient_id = ? AND recipient_type = "Donor" ORDER BY created_at DESC LIMIT 50', [req.user.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};
