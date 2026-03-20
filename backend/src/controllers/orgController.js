const pool = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const admin = require('../config/firebaseAdmin');
const { calculateDonorAvailability } = require('../utils/donorUtils');
const { addOrgLog } = require('../utils/logUtils');
const https = require('https');
const { getIndiaCoordinates } = require('../utils/matchUtils');
const sendEmail = require('../utils/emailUtils');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
exports.register = async (req, res) => {
    try {
        const { name, email, phone, password, confirm_password, license_number, type, state, district, city, address } = req.body;
        let { latitude, longitude } = req.body;

        if (password !== confirm_password) return res.status(400).json({ error: 'Passwords do not match.' });

        // Backend Geocoding Fallback if coordinates missing
        if (!latitude || !longitude) {
            // 1. Try Internal Map
            const internalCoords = getIndiaCoordinates(city, district);
            if (internalCoords) {
                latitude = internalCoords.lat;
                longitude = internalCoords.lng;
            } else {
                // 2. Try External API (Nominatim)
                try {
                    const query = `${city}, ${district}, ${state}, India`;
                    const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

                    const geoData = await new Promise((resolve, reject) => {
                        const options = {
                            headers: { 'User-Agent': 'eBloodBank-Backend' }
                        };
                        https.get(geoUrl, options, (resp) => {
                            let data = '';
                            resp.on('data', (chunk) => data += chunk);
                            resp.on('end', () => resolve(JSON.parse(data)));
                        }).on("error", (err) => reject(err));
                    });

                    if (geoData && geoData.length > 0) {
                        latitude = geoData[0].lat;
                        longitude = geoData[0].lon;
                    }
                } catch (geoErr) {
                    console.error("Backend Geocoding Error:", geoErr.message);
                }
            }
        }

        const hash = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            `INSERT INTO organizations (name, email, phone, password_hash, license_number, type, state, district, city, address, verified, latitude, longitude, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, NOW())`,
            [name, email, phone, hash, license_number, type, state, district, city, address, latitude, longitude]
        );

        // Sync with Firebase
        try {
            await admin.auth().createUser({
                uid: `org_${result.insertId}`,
                email: email,
                password: password,
                displayName: name,
            });
        } catch (fbErr) {
            console.error('Firebase sync error for org:', fbErr);
        }

        res.json({
            message: 'Registration successful. Your account is pending admin approval. You will receive an email once verified.',
            user: { id: result.insertId, name, email, type, role: 'organization' }
        });
    } catch (err) {
        console.error('Org Registration Error:', {
            message: err.message,
            stack: err.stack,
            body: { ...req.body, password: '[REDACTED]', confirm_password: '[REDACTED]' }
        });
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const [rows] = await pool.query('SELECT * FROM organizations WHERE email = ? LIMIT 1', [email]);
        if (rows.length === 0) return res.status(400).json({ error: 'Invalid credentials.' });
        const org = rows[0];
        const match = await bcrypt.compare(password, org.password_hash);
        if (!match) return res.status(400).json({ error: 'Invalid credentials.' });

        if (!org.verified) {
            return res.status(403).json({ error: 'Your account is pending admin approval. You will be able to access the dashboard once an administrator verifies your facility.' });
        }

        const token = jwt.sign({ id: org.id, role: 'organization' }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: org.id, name: org.name, email: org.email, type: org.type, role: 'organization' } });
    } catch (err) {
        console.error('Org Login Error:', {
            message: err.message,
            stack: err.stack,
            email: req.body.email
        });
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.getStats = async (req, res) => {
    try {
        const orgId = req.user.id;

        // Secondary verification check
        const [orgRows] = await pool.query('SELECT verified FROM organizations WHERE id = ?', [orgId]);
        if (orgRows.length === 0 || !orgRows[0].verified) {
            return res.status(403).json({ error: 'Account not verified. Please contact administrator.' });
        }

        const [donations] = await pool.query(
            'SELECT COUNT(*) as cnt FROM donations WHERE org_id = ?',
            [orgId]
        );
        const [active_requests] = await pool.query(
            'SELECT COUNT(*) as cnt FROM emergency_requests WHERE status = "Active" AND org_id = ?',
            [orgId]
        );
        const [total_units] = await pool.query(
            'SELECT SUM(units) as total FROM blood_inventory WHERE org_id = ?',
            [orgId]
        );
        const [members] = await pool.query(
            'SELECT COUNT(*) as cnt FROM org_members WHERE org_id = ?',
            [orgId]
        );

        // Original queries that were not replaced by the snippet, but still needed for the full response
        const [verifications] = await pool.query('SELECT COUNT(*) as verified_count FROM donor_verifications WHERE org_id = ? AND status = ?', [orgId, 'Verified']);
        const [breakdown] = await pool.query('SELECT blood_group, units, min_threshold FROM blood_inventory WHERE org_id = ?', [orgId]);
        const [endedDrives] = await pool.query(
            'SELECT COUNT(*) as count FROM blood_drives WHERE org_id = ? AND CAST(CONCAT(end_date, " ", end_time) AS DATETIME) < NOW()',
            [orgId]
        );

        res.json({
            success: true,
            data: {
                donations: donations[0].cnt,
                active_requests: active_requests[0].cnt,
                total_units: Number(total_units[0].total) || 0,
                members: members[0].cnt,
                verified_count: verifications[0].verified_count || 0,
                ended_count: endedDrives[0].count || 0,
                inventory_breakdown: breakdown
            }
        });
    } catch (err) {
        console.error('Org getStats Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.getInventory = async (req, res) => {
    try {
        const orgId = req.user.id;

        // Secondary verification check
        const [orgRows] = await pool.query('SELECT verified FROM organizations WHERE id = ?', [orgId]);
        if (orgRows.length === 0 || !orgRows[0].verified) {
            return res.status(403).json({ error: 'Account not verified. Please contact administrator.' });
        }

        const [rows] = await pool.query('SELECT * FROM blood_inventory WHERE org_id = ?', [orgId]);
        res.json(rows);
    } catch (err) {
        console.error('Org getInventory Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.updateInventory = async (req, res) => {
    try {
        const { blood_group, units, min_threshold } = req.body;
        const orgId = req.user.id;

        // Fetch current units to calculate increment
        const [current] = await pool.query('SELECT units FROM blood_inventory WHERE org_id = ? AND blood_group = ?', [orgId, blood_group]);
        const oldUnits = current.length > 0 ? current[0].units : 0;
        const diff = units - oldUnits;

        await pool.query(
            `INSERT INTO blood_inventory (org_id, blood_group, units, min_threshold) 
             VALUES (?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE units = ?, min_threshold = IFNULL(?, min_threshold)`,
            [orgId, blood_group, units, min_threshold || 5, units, min_threshold]
        );

        // Log the increment/decrement
        const sign = diff >= 0 ? '+' : '';
        await addOrgLog(orgId, 'INVENTORY_SYNC', blood_group, `Inventory updated for ${blood_group} (${sign}${diff} units)`);

        res.json({ message: 'Inventory updated' });


    } catch (err) {
        console.error('Org updateInventory Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, email, phone, license_number, type, state, district, city, address, verified, latitude, longitude, created_at FROM organizations WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Organization not found' });

        let org = rows[0];

        if (!org.verified) {
            return res.status(403).json({ error: 'Account not verified. Please contact administrator.' });
        }

        // Self-Healing: If coordinates are missing, attempt to geocode on-the-fly
        if (!org.latitude || !org.longitude) {
            console.log(`[Self-Healing] Geocoding missing coordinates for Org #${org.id} (${org.name})`);
            const internalCoords = getIndiaCoordinates(org.city, org.district);
            let lat = internalCoords?.lat;
            let lng = internalCoords?.lng;

            if (!lat || !lng) {
                try {
                    const query = `${org.city}, ${org.district}, ${org.state}, India`;
                    const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
                    const geoData = await new Promise((resolve, reject) => {
                        https.get(geoUrl, { headers: { 'User-Agent': 'eBloodBank-Backend' } }, (resp) => {
                            let data = '';
                            resp.on('data', (chunk) => data += chunk);
                            resp.on('end', () => resolve(JSON.parse(data)));
                        }).on("error", (err) => reject(err));
                    });
                    if (geoData && geoData.length > 0) {
                        lat = geoData[0].lat;
                        lng = geoData[0].lon;
                    }
                } catch (e) {
                    console.error("Self-healing geocode failed:", e.message);
                }
            }

            if (lat && lng) {
                await pool.query('UPDATE organizations SET latitude = ?, longitude = ? WHERE id = ?', [lat, lng, org.id]);
                org.latitude = lat;
                org.longitude = lng;
                console.log(`[Self-Healing] Coordinates assigned: ${lat}, ${lng}`);
            }
        }

        res.json(org);
    } catch (err) {
        console.error('Org getProfile Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, email, phone, license_number, type, state, district, city, address, latitude, longitude } = req.body;
        await pool.query(
            `UPDATE organizations SET name = ?, email = ?, phone = ?, license_number = ?, type = ?, state = ?, district = ?, city = ?, address = ?, latitude = ?, longitude = ? WHERE id = ?`,
            [name, email, phone, license_number, type, state, district, city, address, latitude, longitude, req.user.id]
        );
        res.json({ message: 'Profile updated' });
    } catch (err) {
        console.error('Org updateProfile Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.searchDonor = async (req, res) => {
    try {
        const { query } = req.query;
        const [rows] = await pool.query(
            'SELECT id, full_name, email, phone, blood_type, availability, donor_tag FROM donors WHERE email LIKE ? OR phone LIKE ? OR full_name LIKE ? LIMIT 10',
            [`%${query}%`, `%${query}%`, `%${query}%`]
        );
        res.json(rows);
    } catch (err) {
        console.error('Org searchDonor Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.getAnalytics = async (req, res) => {
    try {
        const orgId = req.user.id;
        const [donations] = await pool.query(
            `SELECT DATE_FORMAT(date, '%Y-%m-%d') as date, COUNT(*) as count 
             FROM donations WHERE org_id = ? AND date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             GROUP BY date ORDER BY date`, [orgId]
        );
        res.json({ donations });
    } catch (err) {
        console.error('Org getAnalytics Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.getGeographicStats = async (req, res) => {
    try {
        const orgId = req.user.id;
        const [rows] = await pool.query(
            `SELECT d.city, COUNT(*) as count 
             FROM org_members om JOIN donors d ON om.donor_id = d.id 
             WHERE om.org_id = ? GROUP BY d.city ORDER BY count DESC`, [orgId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching geographic stats:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM org_logs WHERE org_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        console.error('Org getHistory Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};



exports.getRequests = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM emergency_requests WHERE org_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.json(rows);
    } catch (err) {
        console.error('Org getRequests Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.createRequest = async (req, res) => {
    try {
        const { blood_group, units_required, urgency_level, description } = req.body;
        await pool.query(
            'INSERT INTO emergency_requests (org_id, blood_group, units_required, urgency_level, description) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, blood_group, units_required, urgency_level, description]
        );
        await addOrgLog(req.user.id, 'REQUEST_CREATE', blood_group, `Created ${urgency_level} request for ${units_required} units of ${blood_group}`);
        res.json({ message: 'Request created' });

    } catch (err) {
        console.error('Org createRequest Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.updateRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        await pool.query('UPDATE emergency_requests SET status = ? WHERE id = ? AND org_id = ?', [status, id, req.user.id]);
        await addOrgLog(req.user.id, 'REQUEST_UPDATE', `Request #${id}`, `Updated request status to ${status}`);
        res.json({ message: 'Request status updated' });

    } catch (err) {
        console.error('Org updateRequestStatus Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.getRecentActivity = async (req, res) => {
    try {
        const orgId = req.user.id;
        const [rows] = await pool.query(
            'SELECT action_type, description, created_at FROM org_logs WHERE org_id = ? ORDER BY created_at DESC LIMIT 15',
            [orgId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Org getRecentActivity Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.getDonorReports = async (req, res) => {
    try {
        const { donorId } = req.params;
        const [rows] = await pool.query(`
            SELECT mr.*, o.name as org_name, o.city as org_city, o.email as org_email, o.address as org_address, o.phone as org_phone
            FROM medical_reports mr
            JOIN organizations o ON mr.org_id = o.id
            WHERE mr.donor_id = ? 
            ORDER BY mr.test_date DESC
        `, [donorId]);
        res.json(rows);
    } catch (err) {
        console.error('Org getDonorReports Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.createMedicalReport = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { donorId } = req.params;
        const {
            hb_level, blood_pressure, pulse_rate, temperature, weight,
            units_donated, blood_group, rh_factor, hiv_status,
            hepatitis_b, hepatitis_c, syphilis, malaria, notes, isDonation
        } = req.body;

        // Ensure units_donated is a valid number for calculations
        const units = parseFloat(units_donated) || 0;

        // 1. Insert Medical Report
        await connection.query(
            `INSERT INTO medical_reports (donor_id, org_id, hb_level, blood_pressure, pulse_rate, temperature, weight, units_donated, blood_group, rh_factor, hiv_status, hepatitis_b, hepatitis_c, syphilis, malaria, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [donorId, req.user.id, hb_level, blood_pressure, pulse_rate, temperature, weight, units, blood_group, rh_factor, hiv_status, hepatitis_b, hepatitis_c, syphilis, malaria, notes]
        );

        // 2. If marked as Eligible Donation
        if (isDonation) {
            // Double check availability before recording donation (security/logic check)
            // Passing 'connection' ensures we see current transaction state
            const availability = await calculateDonorAvailability(donorId, connection);
            if (availability.status !== 'Available') {
                await connection.rollback();
                return res.status(400).json({ error: 'Donor is currently not available for donation' });
            }

            // Insert into donations table
            await connection.query(
                'INSERT INTO donations (donor_id, org_id, date, units, notes, hb_level, blood_pressure) VALUES (?, ?, NOW(), ?, ?, ?, ?)',
                [donorId, req.user.id, units, 'Clinical Donation', hb_level, blood_pressure]
            );

            // Update donor availability (re-run after donation to set to Unavailable)
            await calculateDonorAvailability(donorId, connection);


            // 3. Update Inventory (Increment units)
            // Using ON DUPLICATE KEY UPDATE to handle both new and existing blood groups for the org
            if (units > 0) {
                await connection.query(
                    `INSERT INTO blood_inventory (org_id, blood_group, units, min_threshold) 
                     VALUES (?, ?, ?, ?) 
                     ON DUPLICATE KEY UPDATE units = units + ?`,
                    [req.user.id, blood_group, units, 5, units]
                );
                await addOrgLog(req.user.id, 'INVENTORY_SYNC', blood_group, `Added ${units} units of ${blood_group} via Donation`, null, connection);
            }
        }

        // Fetch donor name for logging
        const [[donor]] = await connection.query('SELECT full_name FROM donors WHERE id = ?', [donorId]);
        const donorName = donor ? donor.full_name : `Donor ID: ${donorId}`;
        const description = isDonation
            ? `Recorded medical report and donation for ${donorName}`
            : `Recorded medical report for ${donorName}`;

        await addOrgLog(req.user.id, isDonation ? 'DONATION' : 'CLINICAL', donorName, description, null, connection);

        await connection.commit();



        res.json({ message: isDonation ? 'Donation recorded and donor status updated' : 'Clinical record created' });
    } catch (err) {
        await connection.rollback();
        console.error('Error in createMedicalReport:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    } finally {
        connection.release();
    }
};

exports.verifyDonor = async (req, res) => {
    try {
        const { donor_id, notes } = req.body;
        await pool.query(
            'INSERT INTO donor_verifications (org_id, donor_id, notes) VALUES (?, ?, ?)',
            [req.user.id, donor_id, notes]
        );
        const [[donor]] = await pool.query('SELECT full_name FROM donors WHERE id = ?', [donor_id]);
        const donorName = donor ? donor.full_name : `Donor ID: ${donor_id}`;

        await addOrgLog(req.user.id, 'VERIFICATION', donorName, `Verified ${donorName}`);
        // Also add a generic donation record if units were donated in the medical report (handled via frontend flow)
        res.json({ message: 'Donor verified' });


    } catch (err) {
        console.error('Org verifyDonor Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.getMembers = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT om.joined_at, om.role, d.id as donor_id, d.full_name, d.email, d.phone, d.blood_type, d.donor_tag, d.availability 
             FROM org_members om JOIN donors d ON om.donor_id = d.id 
             WHERE om.org_id = ? ORDER BY om.joined_at DESC`, [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        console.error('Org getMembers Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.addMember = async (req, res) => {
    try {
        const { donor_id, role } = req.body;
        await pool.query(
            'INSERT INTO org_members (org_id, donor_id, role) VALUES (?, ?, ?)',
            [req.user.id, donor_id, role || 'Member']
        );
        const [[donor]] = await pool.query('SELECT full_name FROM donors WHERE id = ?', [donor_id]);
        const donorName = donor ? donor.full_name : `Donor ID: ${donor_id}`;

        await addOrgLog(req.user.id, 'MEMBER_ADD', donorName, `Added ${donorName} as ${role || 'Member'}`);
        res.json({ message: 'Member added successfully' });


    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Already a member' });
        }
        console.error('Org addMember Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.removeMember = async (req, res) => {
    try {
        const { donorId } = req.params;
        const orgId = req.user.id;

        const [[donor]] = await pool.query('SELECT full_name FROM donors WHERE id = ?', [donorId]);
        const donorName = donor ? donor.full_name : `Donor ID: ${donorId}`;

        await pool.query(
            'DELETE FROM org_members WHERE org_id = ? AND donor_id = ?',
            [orgId, donorId]
        );

        await addOrgLog(orgId, 'MEMBER_REMOVE', donorName, `Removed ${donorName} from organization`);

        res.json({ message: 'Member removed successfully' });


    } catch (err) {
        console.error('Error removing member:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.getNotifications = async (req, res) => {
    try {
        const orgId = req.user.id;

        // 1. Sync Global Broadcasts (Lazy Sync)
        // Find org created_at
        const [orgRows] = await pool.query('SELECT created_at FROM organizations WHERE id = ?', [orgId]);
        const orgCreatedAt = orgRows[0]?.created_at || new Date(0);

        // Find relevant global broadcasts not yet in notifications
        // We look for broadcasts targeting 'all' or 'organizations' created AFTER the organization joined
        // AND which don't have a corresponding notification entry (source_id = broadcast.id)
        const [newBroadcasts] = await pool.query(
            `SELECT * FROM broadcasts 
             WHERE target IN ('all', 'organizations') 
             AND created_at >= ? 
             AND id NOT IN (
                SELECT source_id FROM notifications 
                WHERE recipient_id = ? AND recipient_type = 'Organization' AND source_id IS NOT NULL
             )`,
            [orgCreatedAt, orgId]
        );

        if (newBroadcasts.length > 0) {
            const values = newBroadcasts.map(b => [
                orgId,
                'Organization',
                'BROADCAST',
                b.title,
                b.message,
                b.id
            ]);

            await pool.query(
                'INSERT INTO notifications (recipient_id, recipient_type, type, title, message, source_id) VALUES ?',
                [values]
            );
        }

        const [rows] = await pool.query(
            'SELECT * FROM notifications WHERE recipient_id = ? AND recipient_type = \'Organization\' AND is_dismissed = FALSE ORDER BY created_at DESC',
            [orgId]
        );
        res.json(rows);
    } catch (err) {
        console.error("Notif Error", err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND recipient_id = ?',
            [id, req.user.id]
        );
        res.json({ message: 'Marked as read' });
    } catch (err) {
        console.error('Org markAsRead Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.markAllRead = async (req, res) => {
    try {
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE recipient_id = ? AND recipient_type = "Organization"',
            [req.user.id]
        );
        res.json({ message: 'All marked as read' });
    } catch (err) {
        console.error('Org markAllRead Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.deleteNotification = async (req, res) => {
    try {
        await pool.query(
            'UPDATE notifications SET is_dismissed = TRUE WHERE id = ? AND recipient_id = ?',
            [req.params.id, req.user.id]
        );
        res.json({ message: 'Notification removed' });
    } catch (err) {
        console.error('Org Delete Notif Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.clearAllNotifications = async (req, res) => {
    try {
        await pool.query(
            'UPDATE notifications SET is_dismissed = TRUE WHERE recipient_id = ? AND recipient_type = "Organization"',
            [req.user.id]
        );
        res.json({ message: 'All notifications cleared' });
    } catch (err) {
        console.error('Org Clear All Notif Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const [rows] = await pool.query('SELECT * FROM organizations WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
        if (rows.length === 0) return res.status(404).json({ error: 'No organization found with this email' });

        const org = rows[0];
        // Generate 4-digit OTP
        const resetCode = Math.floor(1000 + Math.random() * 9000).toString();
        const expiry = new Date(Date.now() + 15 * 60000); // 15 mins

        await pool.query(
            'UPDATE organizations SET reset_code = ?, reset_code_expires_at = ? WHERE id = ?',
            [resetCode, expiry, org.id]
        );


        const html = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #f1f1f1;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="display: inline-block; padding: 12px; background-color: #f0f9ff; border-radius: 12px;">
                        <span style="font-size: 32px;">🏢</span>
                    </div>
                </div>
                <h2 style="color: #0c4a6e; text-align: center; margin-bottom: 10px; font-weight: 800;">Facility Access Recovery</h2>
                <p style="color: #666; text-align: center; font-size: 14px; line-height: 1.6;">Hello <strong>${org.name}</strong>, use the verification code below to reset your organization credentials.</p>
                
                <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 24px; text-align: center; margin: 30px 0;">
                    <div style="font-size: 14px; color: #0369a1; margin-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Manual Verification Code</div>
                    <div style="font-size: 42px; font-weight: 900; color: #0284c7; letter-spacing: 12px; margin-left: 12px;">${resetCode}</div>
                </div>



                <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #f1f1f1; text-align: center;">
                    <p style="color: #94a3b8; font-size: 11px;">Shielded by eBloodBank Enterprise Security Network. This code expires in 15 minutes.</p>
                </div>
            </div>
        `;

        await sendEmail({
            email: org.email,
            subject: 'Organization Access Recovery - eBloodBank',
            html
        });

        res.json({ message: 'Verification code sent to facility email' });
    } catch (err) {
        console.error('Org forgot password error:', err);
        res.status(500).json({ error: 'Failed to process request', details: err.message });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

        const [rows] = await pool.query(
            'SELECT id FROM organizations WHERE LOWER(email) = LOWER(?) AND reset_code = ? AND reset_code_expires_at > NOW()',
            [email, code]
        );

        if (rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired verification code' });
        }

        res.json({ message: 'OTP verified successfully' });
    } catch (err) {
        console.error('Org OTP verification error:', err);
        res.status(500).json({ error: 'Failed to verify code', details: err.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;
        if (!email || !code || !newPassword) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const [rows] = await pool.query(
            'SELECT * FROM organizations WHERE LOWER(email) = LOWER(?) AND reset_code = ? AND reset_code_expires_at > NOW()',
            [email, code]
        );

        if (rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired reset code' });
        }

        const org = rows[0];
        const hash = await bcrypt.hash(newPassword, 10);

        await pool.query(
            'UPDATE organizations SET password_hash = ?, reset_code = NULL, reset_code_expires_at = NULL WHERE id = ?',
            [hash, org.id]
        );

        // Sync with Firebase
        try {
            await admin.auth().updateUser(`org_${org.id}`, {
                password: newPassword
            });
        } catch (fbErr) {
            console.error('Firebase org password sync error:', fbErr);
        }

        res.json({ message: 'Organization password reset successful' });
    } catch (err) {
        console.error('Org reset password error:', err);
        res.status(500).json({ error: 'Failed to reset organization password', details: err.message });
    }
};

exports.getDrives = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM blood_drives WHERE org_id = ? ORDER BY start_date DESC, start_time DESC',
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        console.error('Org getDrives Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.createDrive = async (req, res) => {
    try {
        const { event_name, start_date, start_time, end_date, end_time, location, description } = req.body;
        
        // Validation: All required fields
        if (!event_name || !start_date || !start_time || !end_date || !end_time || !location) {
            return res.status(400).json({ error: 'All fields are required except description.' });
        }

        // Validation: Start Date must be >= Today
        const todayStr = new Date().toISOString().split('T')[0];
        if (start_date < todayStr) {
            return res.status(400).json({ error: 'Start date cannot be in the past.' });
        }

        // Validation: End must be after Start
        const start = new Date(`${start_date}T${start_time}`);
        const end = new Date(`${end_date}T${end_time}`);

        if (end <= start) {
            return res.status(400).json({ error: 'End date and time must be after start date and time.' });
        }

        await pool.query(
            'INSERT INTO blood_drives (org_id, event_name, start_date, start_time, end_date, end_time, location, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, event_name, start_date, start_time, end_date, end_time, location, description]
        );
        
        await addOrgLog(req.user.id, 'DRIVE_CREATE', event_name, `Scheduled blood drive: ${event_name} at ${location} from ${start_date} ${start_time} to ${end_date} ${end_time}`);
        
        res.json({ message: 'Blood drive scheduled successfully' });
    } catch (err) {
        console.error('Org createDrive Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.updateDrive = async (req, res) => {
    try {
        const { id } = req.params;
        const { event_name, start_date, start_time, end_date, end_time, location, description } = req.body;

        if (!event_name || !start_date || !start_time || !end_date || !end_time || !location) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        // Check if drive is already started
        const [drive] = await pool.query('SELECT * FROM blood_drives WHERE id = ? AND org_id = ?', [id, req.user.id]);
        if (drive.length === 0) return res.status(404).json({ error: 'Drive not found' });

        const now = new Date();
        const driveStart = new Date(`${drive[0].start_date} ${drive[0].start_time}`);
        if (now >= driveStart) {
            return res.status(400).json({ error: 'Cannot edit a drive that has already started or ended.' });
        }

        await pool.query(
            'UPDATE blood_drives SET event_name = ?, start_date = ?, start_time = ?, end_date = ?, end_time = ?, location = ?, description = ? WHERE id = ? AND org_id = ?',
            [event_name, start_date, start_time, end_date, end_time, location, description, id, req.user.id]
        );

        await addOrgLog(req.user.id, 'DRIVE_UPDATE', event_name, `Updated blood drive details for: ${event_name}`);
        res.json({ message: 'Blood drive updated successfully' });
    } catch (err) {
        console.error('Org updateDrive Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.updateDriveStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        await pool.query(
            'UPDATE blood_drives SET status = ? WHERE id = ? AND org_id = ?',
            [status, id, req.user.id]
        );
        await addOrgLog(req.user.id, 'DRIVE_UPDATE', `Drive #${id}`, `Updated drive status to ${status}`);
        res.json({ message: 'Drive status updated' });
    } catch (err) {
        console.error('Org updateDriveStatus Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.deleteDrive = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM blood_drives WHERE id = ? AND org_id = ?', [id, req.user.id]);
        await addOrgLog(req.user.id, 'DRIVE_DELETE', `Drive #${id}`, `Cancelled and removed blood drive #${id}`);
        res.json({ message: 'Blood drive cancelled successfully' });
    } catch (err) {
        console.error('Org deleteDrive Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.addDriveInventory = async (req, res) => {
    try {
        const { blood_group, units } = req.body;
        if (!blood_group || !units) return res.status(400).json({ error: 'Blood group and units are required' });

        const orgId = req.user.id;

        // Check if blood group exists for this org, otherwise create
        const [inventoryResult] = await pool.query(
            'SELECT id FROM blood_inventory WHERE org_id = ? AND blood_group = ?',
            [orgId, blood_group]
        );

        if (inventoryResult.length > 0) {
            await pool.query(
                'UPDATE blood_inventory SET units = units + ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?',
                [units, inventoryResult[0].id]
            );
        } else {
            await pool.query(
                'INSERT INTO blood_inventory (org_id, blood_group, units) VALUES (?, ?, ?)',
                [orgId, blood_group, units]
            );
        }

        // Also update drive_collections if drive_id is provided
        const { drive_id } = req.body;
        if (drive_id) {
            await pool.query(
                'INSERT INTO drive_collections (drive_id, blood_group, units) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE units = units + ?',
                [drive_id, blood_group, units, units]
            );
        }

        await addOrgLog(req.user.id, 'INVENTORY_ADD', blood_group, `Added ${units} units of ${blood_group} to inventory from blood drive`);
        res.json({ message: 'Inventory updated successfully' });
    } catch (err) {
        console.error('Org addDriveInventory Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.getDriveInventory = async (req, res) => {
    try {
        const { id } = req.params;
        const [collections] = await pool.query(
            'SELECT blood_group, units, created_at FROM drive_collections WHERE drive_id = ? ORDER BY blood_group ASC',
            [id]
        );
        res.json(collections);
    } catch (err) {
        console.error('Org getDriveInventory Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};
