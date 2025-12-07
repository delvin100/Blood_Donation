const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Helper function to find donor by username
async function findDonorByUsername(username) {
  const [rows] = await pool.query('SELECT * FROM donors WHERE username = ? LIMIT 1', [username]);
  return rows.length > 0 ? rows[0] : null;
}

// Helper function to find donor by email
async function findDonorByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM donors WHERE email = ? LIMIT 1', [email]);
  return rows.length > 0 ? rows[0] : null;
}

// Helper function to find donor by identifier (username or email)
async function findDonorByIdentifier(identifier) {
  // Check if it's an email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(identifier)) {
    return await findDonorByEmail(identifier);
  }
  return null;
}

// Helper function to calculate age from date of birth
function calculateAge(dob) {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Registration endpoint
router.post('/register', async (req, res) => {
  try {
    const {
      username,
      full_name,
      email,
      password,
      confirm_password,
      blood_type,
      dob,
      phone,
      gender,
      availability
    } = req.body;

    // Basic validation - check all required fields
    if (!username || !full_name || !blood_type || !dob || !email || !password || !confirm_password || !phone || !gender) {
      return res.status(400).json({ error: 'Please complete all required fields including gender and phone.' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    if (password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    // Phone validation (exactly 10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: 'Phone number must be exactly 10 digits.' });
    }

    // Gender validation
    if (!['male', 'female', 'other'].includes(gender)) {
      return res.status(400).json({ error: 'Please select a valid gender.' });
    }

    // Age validation (18-65)
    const age = calculateAge(dob);
    if (age < 18 || age > 65) {
      return res.status(400).json({ error: 'Age must be between 18 and 65 years.' });
    }

    // Check for duplicates (username or email)
    const existingByUsername = await findDonorByUsername(username);
    const existingByEmail = await findDonorByEmail(email);
    
    if (existingByUsername || existingByEmail) {
      return res.status(400).json({ error: 'Username or email already registered. Please login.' });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Insert donor into database
    const [result] = await pool.query(
      `INSERT INTO donors 
       (username, full_name, email, password_hash, blood_type, dob, phone, gender, availability, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        username,
        full_name,
        email,
        hash,
        blood_type,
        dob,
        phone,
        gender,
        availability || 'Available'
      ]
    );

    // Generate JWT token
    const token = jwt.sign(
      { id: result.insertId, username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return success response
    res.json({
      token,
      user: {
        id: result.insertId,
        username,
        full_name,
        email,
        blood_type,
        phone,
        gender
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    
    // Handle MySQL duplicate entry errors
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username or email already registered. Please login.' });
    }
    
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Missing username or password' });
    }

    // Try to find by username first
    let donor = await findDonorByUsername(username);

    // If not found by username, try by email/identifier
    if (!donor) {
      donor = await findDonorByIdentifier(username);
    }

    if (!donor) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    // Check if password hash exists
    if (!donor.password_hash) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    // Verify password
    // Support both modern bcrypt hashes and legacy plaintext (for migration)
    const storedHash = donor.password_hash;
    let passwordValid = false;

    // Check if it's a modern hash (bcrypt starts with $2a$, $2b$, or $2y$)
    if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
      passwordValid = await bcrypt.compare(password, storedHash);
      
      // If password matches and it was plaintext, upgrade to hashed
      if (!passwordValid && password === storedHash) {
        passwordValid = true;
        // Upgrade password to hash (non-blocking)
        try {
          const newHash = await bcrypt.hash(password, 10);
          await pool.query('UPDATE donors SET password_hash = ? WHERE id = ?', [newHash, donor.id]);
        } catch (upgradeErr) {
          console.error('Password upgrade failed:', upgradeErr);
          // Continue with login even if upgrade fails
        }
      }
    } else {
      // Legacy plaintext fallback
      if (password === storedHash) {
        passwordValid = true;
        // Upgrade to hashed password (non-blocking)
        try {
          const newHash = await bcrypt.hash(password, 10);
          await pool.query('UPDATE donors SET password_hash = ? WHERE id = ?', [newHash, donor.id]);
        } catch (upgradeErr) {
          console.error('Password upgrade failed:', upgradeErr);
          // Continue with login even if upgrade fails
        }
      }
    }

    if (!passwordValid) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: donor.id, username: donor.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return success response
    res.json({
      token,
      user: {
        id: donor.id,
        username: donor.username,
        full_name: donor.full_name,
        email: donor.email,
        blood_type: donor.blood_type,
        phone: donor.phone,
        gender: donor.gender
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

module.exports = router;
