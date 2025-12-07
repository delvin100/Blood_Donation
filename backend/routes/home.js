const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/donors
router.get('/donors', async (req, res) => {
  try {
    const { blood_type, city } = req.query;
    let sql = 'SELECT id, username, full_name, phone, blood_type, city, district FROM donors WHERE availability = "Available"';
    const params = [];
    
    if (blood_type) {
      sql += ' AND blood_type = ?';
      params.push(blood_type);
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
      phone: r.phone,
      blood_group: r.blood_type,
      city: r.city || r.district || 'N/A'
    })));
  } catch (err) {
    console.error('Donors fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/donors/featured
router.get('/donors/featured', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, full_name, username, blood_type, city, district FROM donors WHERE availability = "Available" ORDER BY created_at DESC LIMIT 8'
    );
    res.json(rows.map(r => ({
      id: r.id,
      name: r.full_name || r.username,
      blood_group: r.blood_type,
      city: r.city || r.district || 'N/A'
    })));
  } catch (err) {
    console.error('Featured donors error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/seekers
router.post('/seekers', async (req, res) => {
  try {
    const { full_name, email, phone, blood_type, required_by, country, state, district } = req.body;

    // Validate required fields
    const requiredFields = ['full_name', 'email', 'phone', 'blood_type', 'required_by', 'state', 'district'];
    const missingFields = requiredFields.filter(field => !req.body[field] || req.body[field].trim() === '');
    
    if (missingFields.length > 0) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Sanitize input data
    const sanitizedData = {
      full_name: full_name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      blood_type: blood_type.trim(),
      required_by: required_by.trim(),
      state: state.trim(),
      district: district.trim(),
      country: (country || 'India').trim()
    };

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedData.email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate phone number (exactly 10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(sanitizedData.phone)) {
      return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
    }

    // Validate blood type
    const validBloodTypes = [
      'A+', 'A-', 'A1+', 'A1-', 'A1B+', 'A1B-', 'A2+', 'A2-', 'A2B+', 'A2B-',
      'AB+', 'AB-', 'B+', 'B-', 'Bombay Blood Group', 'INRA', 'O+', 'O-'
    ];
    if (!validBloodTypes.includes(sanitizedData.blood_type)) {
      return res.status(400).json({ error: 'Invalid blood type' });
    }

    // Check for cooldown period (30 seconds) for same email or phone
    const [cooldownRows] = await pool.query(
      `SELECT created_at FROM seekers 
       WHERE (email = ? OR phone = ?) 
       AND created_at > DATE_SUB(NOW(), INTERVAL 30 SECOND) 
       ORDER BY created_at DESC LIMIT 1`,
      [sanitizedData.email, sanitizedData.phone]
    );

    if (cooldownRows.length > 0) {
      const recentEntry = cooldownRows[0];
      const recentTime = new Date(recentEntry.created_at);
      const now = new Date();
      const timeDiff = Math.floor((now - recentTime) / 1000); // seconds
      const remainingSeconds = Math.max(1, Math.min(30, 30 - timeDiff));

      return res.status(429).json({
        error: `Please wait ${remainingSeconds} seconds before submitting another request with the same email or phone number.`
      });
    }

    // Insert seeker into database
    const [result] = await pool.query(
      `INSERT INTO seekers 
       (full_name, email, phone, blood_type, required_by, country, state, district, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        sanitizedData.full_name,
        sanitizedData.email,
        sanitizedData.phone,
        sanitizedData.blood_type,
        sanitizedData.required_by,
        sanitizedData.country,
        sanitizedData.state,
        sanitizedData.district
      ]
    );

    res.json({
      id: result.insertId,
      message: 'Request saved successfully'
    });
  } catch (err) {
    console.error('Seeker registration error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

module.exports = router;
