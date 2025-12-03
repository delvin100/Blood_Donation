const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/donors', async (req, res) => {
  const { blood_group, lat, lng, radius = 10 } = req.query;
  // Haversine formula; radius in km
  const haversine = `
    (6371 * acos(
      cos(radians(?)) * cos(radians(lat)) * cos(radians(lng) - radians(?))
      + sin(radians(?)) * sin(radians(lat))
    ))
  `;
  try {
    const [rows] = await pool.query(
      `SELECT id, name, phone, blood_group, lat, lng, last_donation, ${haversine} AS distance
       FROM donors
       WHERE blood_group = ?
       HAVING distance <= ?
       ORDER BY distance ASC
       LIMIT 50`,
      [lat, lng, lat, blood_group, radius]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
