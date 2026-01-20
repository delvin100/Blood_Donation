const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middlewares/authMiddleware');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const nodemailer = require('nodemailer');

// Configure Nodemailer
// NOTE: Ensure EMAIL_USER and EMAIL_PASS are set in .env
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your preferred service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

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

// Registration endpoint (used by frontend /register.html)
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

    // Basic validation - only require the core fields that the current
    // registration form collects. Other fields are optional.
    if (!username || !full_name || !email || !password || !confirm_password) {
      return res.status(400).json({ error: 'Please fill in all required fields.' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }

    // Password validation – align with frontend (min 8 chars)
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    if (password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    // Optional phone validation (exactly 10 digits) if phone provided
    if (phone) {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({ error: 'Phone number must be exactly 10 digits.' });
      }
    }

    // Optional gender validation
    if (gender && !['male', 'female', 'other'].includes(gender)) {
      return res.status(400).json({ error: 'Please select a valid gender.' });
    }

    // Optional age validation (18-65) if DOB provided
    if (dob) {
      const age = calculateAge(dob);
      if (age < 18 || age > 65) {
        return res.status(400).json({ error: 'Age must be between 18 and 65 years.' });
      }
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

    const insertId = result.insertId;
    const donorTag = `DON-${insertId.toString().padStart(6, '0')}`;
    await pool.query('UPDATE donors SET donor_tag = ? WHERE id = ?', [donorTag, insertId]);

    // Generate JWT token
    const token = jwt.sign(
      { id: insertId, username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return success response
    res.json({
      token,
      user: {
        id: insertId,
        username,
        full_name,
        email,
        blood_type,
        phone,
        gender,
        donor_tag: donorTag
      }
    });
  } catch (err) {
    console.error('Registration error:', err);

    // Handle database connection errors
    if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
      return res.status(503).json({ error: 'Database connection failed. Please ensure MySQL is running and configured correctly.' });
    }

    // Handle MySQL duplicate entry errors
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username or email already registered. Please login.' });
    }

    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// Username availability check for signup form
router.get('/check-username', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ error: 'Username is required.' });
    }

    const existing = await findDonorByUsername(username);
    res.json({ available: !existing });
  } catch (err) {
    console.error('Username check error:', err);

    // Handle database connection errors
    if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
      return res.status(503).json({ error: 'Database connection failed. Please ensure MySQL is running and configured correctly.' });
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

    // Verify password - support bcrypt hashes and legacy plaintext (for migration)
    const storedHash = donor.password_hash;
    let passwordValid = false;

    // Check if it's a bcrypt hash (starts with $2a$, $2b$, or $2y$)
    if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
      passwordValid = await bcrypt.compare(password, storedHash);
    } else {
      // Legacy plaintext fallback (for migration purposes only)
      if (password === storedHash) {
        passwordValid = true;
        // Upgrade to hashed password (non-blocking)
        try {
          const newHash = await bcrypt.hash(password, 10);
          await pool.query('UPDATE donors SET password_hash = ? WHERE id = ?', [newHash, donor.id]);
        } catch (upgradeErr) {
          console.error('Password upgrade failed:', upgradeErr);
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
        gender: donor.gender,
        donor_tag: donor.donor_tag
      }
    });
  } catch (err) {
    console.error('Login error:', err);

    // Handle database connection errors
    if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
      return res.status(503).json({ error: 'Database connection failed. Please ensure MySQL is running and configured correctly.' });
    }
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

const https = require('https');

// Helper to fetch Google User Info using native https
function getGoogleUserInfo(accessToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.googleapis.com',
      path: '/oauth2/v3/userinfo',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Node.js App'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Failed to parse Google response'));
          }
        } else {
          // Try to parse error message
          let errMsg = `Google API returned status ${res.statusCode}`;
          try {
            const errJson = JSON.parse(data);
            if (errJson.error_description) errMsg += `: ${errJson.error_description}`;
            else if (errJson.error) errMsg += `: ${JSON.stringify(errJson.error)}`;
          } catch (e) {
            errMsg += `: ${data}`;
          }
          reject(new Error(errMsg));
        }
      });
    });

    req.on('error', (e) => reject(new Error('Network request failed: ' + e.message)));
    req.end();
  });
}

// Google Auth Login/Signup
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Missing credential' });
    }

    // Fetch User Info from Google (using native https helper)
    let payload;
    try {
      payload = await getGoogleUserInfo(credential);
    } catch (apiErr) {
      console.error('Google API Error:', apiErr);
      return res.status(400).json({ error: 'Failed to verify Google token: ' + apiErr.message });
    }

    const { sub: googleId, email, name, picture, given_name, family_name } = payload;

    console.log('Google Payload:', { googleId, email, name, given_name, family_name }); // Debug

    // Construct full name if 'name' property is missing
    let fullName = name || [given_name, family_name].filter(Boolean).join(' ');

    console.log('Computed Full Name:', fullName); // Debug

    if (!fullName || fullName.trim() === '') {
      fullName = 'Blood Donor'; // Fallback
    }

    if (!email) {
      return res.status(400).json({ error: 'Google account must have an email.' });
    }

    // Check if user exists by Google ID
    let [rows] = await pool.query('SELECT * FROM donors WHERE google_id = ? LIMIT 1', [googleId]);
    let donor = rows[0];

    // If not found by Google ID, check by email
    let foundByEmail = false;
    if (!donor) {
      [rows] = await pool.query('SELECT * FROM donors WHERE email = ? LIMIT 1', [email]);
      donor = rows[0];

      if (donor) {
        foundByEmail = true;
        // Link Google ID to existing account
        await pool.query('UPDATE donors SET google_id = ? WHERE id = ?', [googleId, donor.id]);
        donor.google_id = googleId;
      }
    }

    // Self-heal: If existing donor has no name, update it from Google
    // Self-heal: If existing donor has no name, update it from Google
    if (donor) {
      let updates = [];
      let params = [];

      // Self-heal: If existing donor has no name or generic name, update it from Google
      if (!donor.full_name || donor.full_name.trim() === '' || donor.full_name === 'Blood Donor') {
        if (fullName && fullName.trim() !== '') {
          updates.push('full_name = ?');
          params.push(fullName);
          donor.full_name = fullName;
        }
      }

      // Also heal EMAIL if it's missing
      if (!donor.email || donor.email.trim() === '') {
        updates.push('email = ?');
        params.push(email);
        donor.email = email;
      }

      // Fix Profile Picture: Always update if Google provides one and it's different
      // This fixes issues where the URL was previously truncated or missing
      if (picture && donor.profile_picture !== picture) {
        updates.push('profile_picture = ?');
        params.push(picture);
        donor.profile_picture = picture;
      }

      if (updates.length > 0) {
        params.push(donor.id);
        await pool.query(`UPDATE donors SET ${updates.join(', ')} WHERE id = ?`, params);
        console.log('Self-healed donor profile:', updates);
      }
    }

    // If still not found, create new user
    if (!donor) {
      const finalFullName = fullName || email.split('@')[0] || 'Blood Donor';

      const [result] = await pool.query(
        `INSERT INTO donors 
         (google_id, full_name, email, profile_picture, created_at) 
         VALUES (?, ?, ?, ?, NOW())`,
        [googleId, finalFullName, email, picture]
      );

      const insertId = result.insertId;
      const donorTag = `DON-${insertId.toString().padStart(6, '0')}`;
      await pool.query('UPDATE donors SET donor_tag = ? WHERE id = ?', [donorTag, insertId]);

      // Fetch the new donor
      [rows] = await pool.query('SELECT * FROM donors WHERE id = ?', [insertId]);
      donor = rows[0];
    } else {
      [rows] = await pool.query('SELECT * FROM donors WHERE id = ?', [donor.id]);
      donor = rows[0];
    }

    // Generate JWT
    const token = jwt.sign(
      { id: donor.id, username: donor.username || email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: donor.id,
        username: donor.username,
        full_name: donor.full_name,
        email: donor.email,
        blood_type: donor.blood_type,
        phone: donor.phone,
        gender: donor.gender,
        profile_picture: donor.profile_picture,
        donor_tag: donor.donor_tag
      }
    });

  } catch (err) {
    console.error('Google Auth Critical Error:', err);
    res.status(500).json({ error: 'Google authentication failed: ' + err.message });
  }
});

// Forgot Password - Step 1: Send Code
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const donor = await findDonorByEmail(email);
    if (!donor) {
      // For security, do not reveal if email exists or not, but for this project we might want to be helpful
      return res.status(404).json({ error: 'Email not found.' });
    }

    // Generate 4-digit code
    const resetCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save to DB
    await pool.query(
      'UPDATE donors SET reset_code = ?, reset_code_expires_at = ? WHERE id = ?',
      [resetCode, expiresAt, donor.id]
    );

    // Send Email
    const mailOptions = {
      from: `"eBloodBank" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Password Reset Code',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px; border-radius: 16px;">
          <div style="text-align: center; padding: 20px 0;">
            <div style="display: inline-block; background-color: #dc2626; color: white; padding: 10px 20px; border-radius: 12px; font-weight: 800; font-size: 24px; letter-spacing: -1px;">eBloodBank</div>
          </div>
          
          <div style="background-color: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e5e7eb;">
            <h2 style="color: #111827; margin: 0 0 16px 0; text-align: center; font-size: 22px;">Password Reset Request</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 24px; text-align: center; margin-bottom: 32px;">
              We received a request to reset your password. Use the code below to proceed with your reset.
            </p>
            
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="display: inline-block; padding: 16px 32px; background-color: #fee2e2; border: 2px dashed #dc2626; border-radius: 12px;">
                <span style="font-size: 36px; font-weight: 800; color: #dc2626; letter-spacing: 8px; margin-left: 8px;">${resetCode}</span>
              </div>
            </div>
            
            <p style="color: #ef4444; font-size: 14px; font-weight: 600; text-align: center; margin-top: 0;">
              This code expires in 10 minutes.
            </p>
            
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;">
            
            <p style="color: #6b7280; font-size: 14px; line-height: 20px; text-align: center; margin: 0;">
              If you didn't request this change, you can safely ignore this email. Your password will remain unchanged.
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            &copy; ${new Date().getFullYear()} eBloodBank &bull; Saving Lives Together
          </div>
        </div>
      `
    };

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Email send error:', error);
          // Fallback if email fails (for dev/demo)
          console.log(`[DEV] Reset Code for ${email}: ${resetCode}`);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
    } else {
      console.log(`[DEV] Reset Code for ${email}: ${resetCode} (No SMTP config found)`);
    }

    res.json({ message: 'Reset code sent to your email.' });

  } catch (err) {
    console.error('Forgot Password Error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Forgot Password - Step 2: Verify Code
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required.' });
    }

    const donor = await findDonorByEmail(email);
    if (!donor) {
      return res.status(404).json({ error: 'Invalid request.' });
    }

    if (donor.reset_code !== code) {
      return res.status(400).json({ error: 'Invalid code.' });
    }

    if (new Date() > new Date(donor.reset_code_expires_at)) {
      return res.status(400).json({ error: 'Code expired. Please request a new one.' });
    }

    res.json({ message: 'Code verified.', valid: true });

  } catch (err) {
    console.error('Verify Code Error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Forgot Password - Step 3: Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Missing fields.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const donor = await findDonorByEmail(email);
    if (!donor) {
      return res.status(404).json({ error: 'Invalid request.' });
    }

    // Verify again to be safe
    if (donor.reset_code !== code) {
      return res.status(400).json({ error: 'Invalid code.' });
    }
    if (new Date() > new Date(donor.reset_code_expires_at)) {
      return res.status(400).json({ error: 'Code expired.' });
    }

    // Hash new password
    const hash = await bcrypt.hash(newPassword, 10);

    // Update DB
    await pool.query(
      'UPDATE donors SET password_hash = ?, reset_code = NULL, reset_code_expires_at = NULL WHERE id = ?',
      [hash, donor.id]
    );

    res.json({ message: 'Password reset successfully. You can now login.' });

  } catch (err) {
    console.error('Reset Password Error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Complete Profile endpoint
router.post('/complete-profile', authMiddleware, async (req, res) => {
  try {
    const { bloodGroup, gender, phoneNumber, dob, state, district, city } = req.body;
    const { id: donorId } = req.user; // Get user ID from authenticated token

    // Basic validation
    if (!bloodGroup || !gender || !phoneNumber || !dob) {
      return res.status(400).json({ error: 'Core fields are required.' });
    }

    // Optional age validation (18-65) if DOB provided
    if (dob) {
      const age = calculateAge(dob);
      if (age < 18 || age > 65) {
        return res.status(400).json({ error: 'Age must be between 18 and 65 years to donate.' });
      }
    }

    // Optional phone validation (exactly 10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({ error: 'Phone number must be exactly 10 digits.' });
    }

    // Optional gender validation
    if (!['male', 'female', 'other'].includes(gender.toLowerCase())) {
      return res.status(400).json({ error: 'Please select a valid gender.' });
    }

    await pool.query(
      'UPDATE donors SET blood_type = ?, gender = ?, phone = ?, dob = ?, state = ?, district = ?, city = ? WHERE id = ?',
      [bloodGroup, gender, phoneNumber, dob, state, district, city, donorId]
    );

    res.json({ message: 'Profile updated successfully.' });

  } catch (err) {
    console.error('Complete Profile Error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

module.exports = router;
