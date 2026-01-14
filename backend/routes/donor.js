const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `profile-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images (jpeg, jpg, png, webp) are allowed!'));
    }
});

// Helper to update donor availability based on 90-day rule
const updateDonorAvailability = async (donorId) => {
    try {
        const [donations] = await pool.query(
            'SELECT date FROM donations WHERE donor_id = ? ORDER BY date DESC LIMIT 1',
            [donorId]
        );

        let availability = 'Available';
        if (donations.length > 0) {
            const lastDate = new Date(donations[0].date);
            const now = new Date();
            const diffInTime = now.getTime() - lastDate.getTime();
            const diffInDays = Math.floor(diffInTime / (1000 * 3600 * 24));

            if (diffInDays < 90) {
                availability = 'Unavailable';
            }
        }

        await pool.query('UPDATE donors SET availability = ? WHERE id = ?', [availability, donorId]);
        return availability;
    } catch (err) {
        console.error('Error updating availability:', err);
        return null;
    }
};

// Get Dashboard Data
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const donorId = req.user.id;

        // Auto-update availability on load
        await updateDonorAvailability(donorId);

        // Fetch donor details
        const [donorRows] = await pool.query('SELECT * FROM donors WHERE id = ?', [donorId]);
        if (donorRows.length === 0) {
            console.error(`Dashboard stats failed: Donor ID ${donorId} not found in database.`);
            return res.status(404).json({ error: 'Donor not found' });
        }
        const donor = donorRows[0];

        // Fetch donation history
        const [donations] = await pool.query('SELECT * FROM donations WHERE donor_id = ? ORDER BY date DESC', [donorId]);

        // Fetch reminders
        const [reminders] = await pool.query('SELECT * FROM reminders WHERE donor_id = ? ORDER BY reminder_date ASC', [donorId]);

        // Calculate stats
        const totalDonations = donations.length;
        const lastDonation = donations.length > 0 ? donations[0].date : null;

        // Eligibility logic
        let isEligible = true;
        let nextEligibleDate = null;
        if (lastDonation) {
            const lastDate = new Date(lastDonation);
            nextEligibleDate = new Date(lastDate);
            nextEligibleDate.setDate(nextEligibleDate.getDate() + 90);
            if (nextEligibleDate > new Date()) {
                isEligible = false;
            }
        }

        // Fetch organization memberships
        const [memberships] = await pool.query(`
            SELECT om.joined_at, om.role, o.name as org_name, o.type as org_type, o.city as org_city
            FROM org_members om
            JOIN organizations o ON om.org_id = o.id
            WHERE om.donor_id = ?
            ORDER BY om.joined_at DESC
        `, [donorId]);

        res.json({
            user: {
                id: donor.id,
                full_name: donor.full_name,
                email: donor.email,
                blood_type: donor.blood_type,
                dob: donor.dob,
                phone: donor.phone,
                availability: donor.availability,
                gender: donor.gender,
                state: donor.state,
                district: donor.district,
                city: donor.city,
                profile_picture: donor.profile_picture,
                username: donor.username,
                google_id: donor.google_id
            },
            stats: {
                totalDonations,
                lastDonation,
                activeReminders: reminders.length,
                isEligible,
                nextEligibleDate,
                membershipCount: memberships.length
            },
            donations,
            reminders,
            memberships
        });
    } catch (err) {
        console.error('Dashboard Stats Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add Donation
router.post('/donation', authMiddleware, async (req, res) => {
    try {
        const { date, units, notes } = req.body;
        const donorId = req.user.id;

        if (!date || !units) return res.status(400).json({ error: 'Date and units are required' });

        // Eligibility check
        const [lastDonationRows] = await pool.query('SELECT date FROM donations WHERE donor_id = ? ORDER BY date DESC LIMIT 1', [donorId]);
        if (lastDonationRows.length > 0) {
            const lastDate = new Date(lastDonationRows[0].date);
            const nextEligible = new Date(lastDate);
            nextEligible.setDate(nextEligible.getDate() + 90);
            if (new Date(date) < nextEligible) {
                return res.status(400).json({ error: 'You can only donate every 90 days.' });
            }
        }

        await pool.query('INSERT INTO donations (donor_id, date, units, notes) VALUES (?, ?, ?, ?)', [donorId, date, units, notes]);

        // Recalculate availability after add
        await updateDonorAvailability(donorId);

        res.json({ message: 'Donation recorded successfully' });
    } catch (err) {
        console.error('Add Donation Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update Donation
router.put('/donation/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { date, units, notes } = req.body;
        const donorId = req.user.id;

        await pool.query('UPDATE donations SET date = ?, units = ?, notes = ? WHERE id = ? AND donor_id = ?', [date, units, notes, id, donorId]);

        // Recalculate occupancy
        await updateDonorAvailability(donorId);

        res.json({ message: 'Donation updated' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete Donation
router.delete('/donation/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const donorId = req.user.id;
        await pool.query('DELETE FROM donations WHERE id = ? AND donor_id = ?', [id, donorId]);

        // Recalculate
        await updateDonorAvailability(donorId);

        res.json({ message: 'Donation deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Add Reminder
router.post('/reminder', authMiddleware, async (req, res) => {
    try {
        const { reminder_date, message } = req.body;
        const donorId = req.user.id;
        await pool.query('INSERT INTO reminders (donor_id, reminder_date, message) VALUES (?, ?, ?)', [donorId, reminder_date, message]);
        res.json({ message: 'Reminder added' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete Reminder
router.delete('/reminder/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const donorId = req.user.id;
        await pool.query('DELETE FROM reminders WHERE id = ? AND donor_id = ?', [id, donorId]);
        res.json({ message: 'Reminder deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update Reminder
router.put('/reminder/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { reminder_date, message } = req.body;
        const donorId = req.user.id;
        await pool.query('UPDATE reminders SET reminder_date = ?, message = ? WHERE id = ? AND donor_id = ?', [reminder_date, message, id, donorId]);
        res.json({ message: 'Reminder updated' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update Profile
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { full_name, email, dob, phone, blood_type, gender, state, district, city, username, password } = req.body;
        const donorId = req.user.id;

        // --- Back-end Validations ---

        // Full Name Validation
        if (full_name) {
            if (full_name.startsWith(' ')) {
                return res.status(400).json({ error: 'Full name should not start with space.' });
            }
            const trimmedName = full_name.trim();
            if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 50) {
                return res.status(400).json({ error: 'Full name must be between 2 and 50 characters.' });
            }
            if (!/^[a-zA-Z][a-zA-Z\s]*$/.test(trimmedName)) {
                return res.status(400).json({ error: 'Full name can only contain letters and spaces, and must start with a letter.' });
            }
        }

        // Email Validation
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email) || email.length > 100) {
                return res.status(400).json({ error: 'Please enter a valid email address (max 100 characters).' });
            }
        }

        // Username Validation
        if (username) {
            if (username.length < 3 || username.length > 30) {
                return res.status(400).json({ error: 'Username must be between 3 and 30 characters.' });
            }
            if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(username)) {
                return res.status(400).json({ error: 'Username must start with a letter and contain only letters, numbers, or underscores.' });
            }
            // Check if username is already taken
            const [existing] = await pool.query('SELECT id FROM donors WHERE username = ? AND id != ?', [username, donorId]);
            if (existing.length > 0) {
                return res.status(400).json({ error: 'Username is already taken' });
            }
        }

        // Password Validation
        if (password) {
            if (password.length < 8 || password.length > 128) {
                return res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
            }
            if (/\s/.test(password)) {
                return res.status(400).json({ error: 'Password must not contain spaces.' });
            }
        }

        // Age Validation
        if (dob) {
            const birthDate = new Date(dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            if (age < 18 || age > 65) {
                return res.status(400).json({ error: 'Age must be between 18 and 65 years.' });
            }
        }

        // Phone Validation
        if (phone) {
            if (!/^[0-9]{10}$/.test(phone)) {
                return res.status(400).json({ error: 'Phone number must be exactly 10 digits.' });
            }
        }

        let passwordHash = null;
        if (password) {
            passwordHash = await bcrypt.hash(password, 10);
        }

        await pool.query(
            `UPDATE donors SET 
                full_name = COALESCE(?, full_name), 
                email = COALESCE(?, email), 
                dob = ?, phone = ?, blood_type = ?, gender = ?, state = ?, district = ?, city = ?,
                username = COALESCE(?, username),
                password_hash = COALESCE(?, password_hash)
             WHERE id = ?`,
            [full_name, email, dob, phone, blood_type, gender, state, district, city, username, passwordHash, donorId]
        );

        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error('Update Profile Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Upload Profile Picture
router.post('/profile-picture', authMiddleware, upload.single('profile_picture'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload an image file' });
        }

        const donorId = req.user.id;
        const profilePicUrl = `/uploads/${req.file.filename}`;
        const fs = require('fs');

        // Delete old local picture if it exists to save space
        const [rows] = await pool.query('SELECT profile_picture FROM donors WHERE id = ?', [donorId]);
        if (rows.length > 0 && rows[0].profile_picture && !rows[0].profile_picture.startsWith('http')) {
            const oldPath = path.join(__dirname, '..', rows[0].profile_picture);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        await pool.query('UPDATE donors SET profile_picture = ? WHERE id = ?', [profilePicUrl, donorId]);

        res.json({
            message: 'Profile picture updated successfully!',
            profile_picture: profilePicUrl
        });
    } catch (err) {
        console.error('Upload Profile Pic Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Remove Profile Picture
router.delete('/profile/picture', authMiddleware, async (req, res) => {
    try {
        const donorId = req.user.id;
        const fs = require('fs');

        // Fetch current picture to delete it from disk (if it's local)
        const [rows] = await pool.query('SELECT profile_picture FROM donors WHERE id = ?', [donorId]);
        if (rows.length > 0 && rows[0].profile_picture && !rows[0].profile_picture.startsWith('http')) {
            const filePath = path.join(__dirname, '..', rows[0].profile_picture);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await pool.query('UPDATE donors SET profile_picture = NULL WHERE id = ?', [donorId]);
        res.json({ message: 'Profile picture removed successfully' });
    } catch (err) {
        console.error('Remove Profile Pic Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Search Donors
router.get('/search', authMiddleware, async (req, res) => {
    try {
        const { blood_type, state, district } = req.query;
        const donorId = req.user.id;

        let query = 'SELECT full_name, blood_type, city, phone, availability FROM donors WHERE id != ? AND availability = "Available"';
        const params = [donorId];

        if (blood_type && blood_type !== 'All') {
            query += ' AND blood_type = ?';
            params.push(blood_type);
        }
        if (state) {
            query += ' AND state = ?';
            params.push(state);
        }
        if (district) {
            query += ' AND district = ?';
            params.push(district);
        }

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Search Donors Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
