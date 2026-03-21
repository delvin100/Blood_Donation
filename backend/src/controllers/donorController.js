const pool = require('../config/database');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const cloudinary = require('../config/cloudinaryConfig');
const { calculateDonorAvailability } = require('../utils/donorUtils');
const { addDonorLog } = require('../utils/logUtils');
const { OpenAI } = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

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
            'SELECT COUNT(*) as count FROM notifications WHERE recipient_id = ? AND recipient_type = \'Donor\' AND is_read = FALSE AND is_dismissed = FALSE',
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
        console.error('getStats Error:', {
            message: err.message,
            stack: err.stack,
            donorId: req.user.id
        });
        res.status(500).json({ error: 'Server error', details: err.message });
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
        console.error('getReports Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.addDonation = async (req, res) => {
    try {
        const { date, units, notes, hb_level, blood_pressure } = req.body;
        await pool.query('INSERT INTO donations (donor_id, date, units, notes, hb_level, blood_pressure) VALUES (?, ?, ?, ?, ?, ?)', [req.user.id, date, units, notes, hb_level, blood_pressure]);
        await calculateDonorAvailability(req.user.id);
        res.json({ message: 'Donation recorded successfully' });
        await addDonorLog(req.user.id, 'DONATION_ADD', 'Donation Record', `Recorded a new donation of ${units} units`);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { full_name, email, dob, phone, blood_type, gender, state, district, city, username, password, latitude, longitude } = req.body;
        let passwordHash = password ? await bcrypt.hash(password, 10) : null;
        await pool.query(`
            UPDATE donors SET 
                full_name = COALESCE(?, full_name), email = COALESCE(?, email), 
                dob = ?, phone = ?, blood_type = ?, gender = ?, state = ?, district = ?, city = ?,
                username = COALESCE(?, username), password_hash = COALESCE(?, password_hash),
                latitude = COALESCE(?, latitude), longitude = COALESCE(?, longitude)
            WHERE id = ?`,
            [full_name, email, dob, phone, blood_type, gender, state, district, city, username, passwordHash, latitude, longitude, req.user.id]
        );
        res.json({ message: 'Profile updated' });
        await addDonorLog(req.user.id, 'PROFILE_UPDATE', full_name, `Updated profile information`);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Please upload an image' });

        // Stream buffer directly to Cloudinary (no temp file needed)
        const uploadToCloudinary = () => new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: 'ebloodbank/donors', transformation: [{ width: 500, height: 500, crop: 'limit' }] },
                (error, result) => { if (error) reject(error); else resolve(result); }
            );
            stream.end(req.file.buffer);
        });

        const result = await uploadToCloudinary();
        const profilePicUrl = result.secure_url;

        await pool.query('UPDATE donors SET profile_picture = ? WHERE id = ?', [profilePicUrl, req.user.id]);
        res.json({ message: 'Picture updated', profile_picture: profilePicUrl });
        await addDonorLog(req.user.id, 'AVATAR_UPDATE', 'Profile Picture', `Updated profile picture`);
    } catch (err) {
        console.error('Upload Error:', err);
        res.status(500).json({ error: 'Server error during upload' });
    }
};

exports.getUrgentNeeds = async (req, res) => {
    try {
        const donorId = req.user.id;
        const [donorRows] = await pool.query('SELECT blood_type, city, district, availability FROM donors WHERE id = ?', [donorId]);
        if (donorRows.length === 0) return res.status(404).json({ error: 'Donor not found' });
        const { blood_type, city, district, availability } = donorRows[0];

        // Strict Filter: If donor is not available, return empty list
        if (availability !== 'Available') {
            return res.json([]);
        }

        // Blood Compatibility Logic (Who can donate to whom)
        const compatibilityMap = {
            'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
            'O+': ['O+', 'A+', 'B+', 'AB+'],
            'A-': ['A-', 'A+', 'AB-', 'AB+'],
            'A+': ['A+', 'AB+'],
            'B-': ['B-', 'B+', 'AB-', 'AB+'],
            'B+': ['B+', 'AB+'],
            'AB-': ['AB-', 'AB+'],
            'AB+': ['AB+']
        };

        // Normalize subtypes (e.g., A1+ -> A+) for compatibility lookup
        const normalizedType = blood_type ? blood_type.replace(/1/, '') : null;
        const compatibleGroups = compatibilityMap[normalizedType] || [blood_type];

        const [requests] = await pool.query(`
            SELECT er.*, o.name as org_name, o.city as org_city, o.district as org_district, o.phone as org_phone,
                   (SELECT COUNT(*) FROM org_members om WHERE om.org_id = er.org_id AND om.donor_id = ?) as is_member
            FROM emergency_requests er
            JOIN organizations o ON er.org_id = o.id
            WHERE er.status = 'Active' 
              AND er.blood_group IN (?) 
              AND (
                o.city = ? 
                OR o.district = ? 
                OR er.org_id IN (SELECT org_id FROM org_members WHERE donor_id = ?)
              )
            ORDER BY er.created_at DESC
        `, [donorId, compatibleGroups, city, district, donorId]);

        res.json(requests);
    } catch (err) {
        console.error('getUrgentNeeds error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getNotifications = async (req, res) => {
    try {
        const { id: donorId } = req.user;

        // 1. Sync Global Broadcasts (Lazy Sync)
        // Find users created_at to filter old broadcasts
        const [donorRows] = await pool.query('SELECT created_at FROM donors WHERE id = ?', [donorId]);
        const donorCreatedAt = donorRows[0]?.created_at || new Date(0);

        // Find relevant global broadcasts not yet in notifications
        // We look for broadcasts targeting 'all' or 'donors' created AFTER the user joined
        // AND which don't have a corresponding notification entry (source_id = broadcast.id)
        // Note: We check if ANY notification entry exists, even if dismissed. 
        // If a dismissed entry exists, we don't sync it again (Soft Delete logic).
        const [newBroadcasts] = await pool.query(
            `SELECT * FROM broadcasts 
             WHERE target IN ('all', 'donors') 
             AND created_at >= ? 
             AND id NOT IN (
                SELECT source_id FROM notifications 
                WHERE recipient_id = ? AND recipient_type = 'Donor' AND source_id IS NOT NULL
             )`,
            [donorCreatedAt, donorId]
        );

        if (newBroadcasts.length > 0) {
            const values = newBroadcasts.map(b => [
                donorId,
                'Donor',
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

        // 2. Fetch Notifications (excluding dismissed)
        const [rows] = await pool.query(
            'SELECT * FROM notifications WHERE recipient_id = ? AND recipient_type = \'Donor\' AND is_dismissed = FALSE ORDER BY created_at DESC',
            [donorId]
        );
        res.json(rows);
    } catch (err) {
        console.error("Notifications Error:", err);
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
        res.status(500).json({ error: 'Server error' });
    }
};

exports.markAllRead = async (req, res) => {
    try {
        await pool.query(
            'UPDATE notifications SET is_read = TRUE WHERE recipient_id = ? AND recipient_type = \'Donor\' AND is_dismissed = FALSE',
            [req.user.id]
        );
        res.json({ message: 'All marked as read' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

exports.deleteNotification = async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE notifications SET is_dismissed = TRUE WHERE id = ? AND recipient_id = ?',
            [req.params.id, req.user.id]
        );
        // Check if any row was affected
        if (result[0].affectedRows === 0) {
            // It might be already deleted or not belong to user, but for idempotency we say success
            // or we could check if it exists at all. 
            // Let's just return success.
        }
        res.json({ message: 'Notification removed' });
    } catch (err) {
        console.error('Delete Notif Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.clearAllNotifications = async (req, res) => {
    try {
        await pool.query(
            'UPDATE notifications SET is_dismissed = TRUE, is_read = TRUE WHERE recipient_id = ? AND recipient_type = \'Donor\'',
            [req.user.id]
        );
        res.json({ message: 'All notifications cleared' });
    } catch (err) {
        console.error('Clear All Notif Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};


const getCompatibilityInfo = (bloodType) => {
    const map = {
        'O-': { give: 'Anyone (Universal Donor)', receive: 'O- only' },
        'O+': { give: 'O+, A+, B+, AB+', receive: 'O-, O+' },
        'A-': { give: 'A-, A+, AB-, AB+', receive: 'O-, A-' },
        'A+': { give: 'A+, AB+', receive: 'O-, O+, A-, A+' },
        'B-': { give: 'B-, B+, AB-, AB+', receive: 'O-, B-' },
        'B+': { give: 'B+, AB+', receive: 'O-, O+, B-, B+' },
        'AB-': { give: 'AB-, AB+', receive: 'O-, A-, B-, AB-' },
        'AB+': { give: 'AB+', receive: 'Anyone (Universal Receiver)' }
    };
    return map[bloodType] || { give: 'Unknown', receive: 'Unknown' };
};

const getStaticResponse = (input, user, stats, lastIntent) => {
    const lowerInput = input.toLowerCase().trim();

    // Improved name logic: Priority: Full Name > Username (prefix if email) > friend
    let userName = 'friend';
    if (user?.full_name && user.full_name.trim()) {
        userName = user.full_name.trim().split(' ')[0];
    } else if (user?.username) {
        // If username is an email, take the part before @, otherwise take the username
        const prefix = user.username.includes('@') ? user.username.split('@')[0] : user.username;
        // Strip numbers from the end if it looks like a generic ID
        userName = prefix.split(/[0-9]/)[0] || prefix;
    } else if (user?.email) {
        userName = user.email.split('@')[0].split(/[0-9]/)[0] || user.email.split('@')[0];
    }

    // Capitalize
    if (userName && userName !== 'friend') {
        userName = userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase();
    }

    const userBloodType = user?.blood_type;

    // --- CONTEXTUAL HANDLING ---
    if (lastIntent === 'offer_profile_guide' && (lowerInput === 'yes' || lowerInput.includes('sure') || lowerInput.includes('yeah'))) {
        return {
            text: `Of course, ${userName}! 🗺️ Click on 'Edit Profile' in your dashboard. Inside, you can update your 'Personal Info', 'Location', and 'Account Security'. Once you add your blood group there, I can give you personalized compatibility reports!`,
            intent: null
        };
    }

    if (lastIntent === 'offer_eligibility_check' && (lowerInput === 'yes' || lowerInput.includes('sure') || lowerInput.includes('yeah'))) {
        if (stats?.isEligible) {
            return {
                text: `Analyzing your records... 🧬 Done! You are ELIGIBLE to donate. Your body has fully recovered from your last donation. Ready to schedule a visit?`,
                intent: null
            };
        } else if (stats?.nextEligibleDate) {
            const diffDays = Math.ceil(Math.abs(new Date(stats.nextEligibleDate) - new Date()) / (1000 * 60 * 60 * 24));
            return {
                text: `Checking your history, ${userName}... 🧪 I see you've been a hero recently! You need ${diffDays} more days for your body to fully replenish its life-saving power. Eligible on ${new Date(stats.nextEligibleDate).toLocaleDateString()}.`,
                intent: null
            };
        }
    }

    if (lastIntent === 'offer_science_facts' && (lowerInput === 'yes' || lowerInput.includes('sure') || lowerInput.includes('yeah'))) {
        return {
            text: `Science for your blood type: \n💉 Your body replaces lost plasma within 24 hours! \n🌟 One donation can save up to 3 separate lives. \n🩸 10% of your body weight is blood. \nReady to be a living, breathing miracle, ${userName}?`,
            intent: null
        };
    }

    if (lastIntent === 'offer_prep_guide' && (lowerInput === 'yes' || lowerInput.includes('sure') || lowerInput.includes('yeah'))) {
        return {
            text: `Awesome! Here’s how to prepare, ${userName}:\n💧 Drink plenty of water (at least 500ml before).\n🥪 Eat a healthy, low-fat meal 2-3 hours prior.\n😴 Get a good night's sleep (7-9 hours).\n🆔 Don't forget your ID!\nReady to make a difference?`,
            intent: null
        };
    }

    if (lastIntent === 'offer_post_care' && (lowerInput === 'yes' || lowerInput.includes('sure') || lowerInput.includes('yeah'))) {
        return {
            text: `Post-donation care is crucial:\n🧃 Keep the bandage on for 4-5 hours.\n💧 Drink extra fluids for the next 24 hours.\n🚫 Avoid heavy lifting or strenuous workouts today.\n🍷 Skip alcohol for 24 hours.\nThank you for your life-saving gift!`,
            intent: null
        };
    }

    if (lowerInput === 'no' || lowerInput.includes('nope') || lowerInput.includes('not now')) {
        return { text: "No problem! I'm here if you change your mind. 🩸", intent: null };
    }

    // --- KEYWORD MATCHING ---

    // 1. Eligibility
    if (lowerInput.includes("eligible") || lowerInput.includes("can i donate") || lowerInput.includes("am i fit") || lowerInput === "eligibility") {
        if (stats?.isEligible) {
            return {
                text: `Good news, ${userName}! 🌟 My analysis indicates you are ELIGIBLE to donate. Would you like me to check the exact details of your last donation?`,
                intent: 'offer_eligibility_check'
            };
        } else if (stats?.nextEligibleDate) {
            return {
                text: `My systems show you're on a recovery break, ${userName}. ⏳ I can calculate exactly how many days are left if you'd like?`,
                intent: 'offer_eligibility_check'
            };
        }
        return {
            text: `Checking general rules for you... 🧐 Are you 18-65 and over 45kg? If yes, you might be eligible! Want a personalized check of your records?`,
            intent: 'offer_eligibility_check'
        };
    }

    // 2. Compatibility (Detailed Mapping)
    if (lowerInput.includes("compatibility") || lowerInput.includes("group") || lowerInput.includes("receiver") || lowerInput.includes("universal") || lowerInput === "compatibility") {
        if (userBloodType) {
            const info = getCompatibilityInfo(userBloodType);
            return {
                text: `As a ${userBloodType} donor, here is your personal compatibility, ${userName}:\n\n✅ You can GIVE to: ${info.give}\n📥 You can RECEIVE from: ${info.receive}\n\nWould you like more science facts about your blood type?`,
                intent: 'offer_science_facts'
            };
        }
        return {
            text: `I'd love to show your compatibility, ${userName}, but I don't have your blood type on record yet. 🩸 Would you like me to show you how to add it in your profile?`,
            intent: 'offer_profile_guide'
        };
    }


    // 3. Profile
    if (lowerInput.includes("profile") || lowerInput.includes("update") || lowerInput.includes("password") || lowerInput === "managing profile") {
        return {
            text: `You can update your account, location, and security settings in 'Edit Profile'. Need a quick guide on where to find it?`,
            intent: 'offer_profile_guide'
        };
    }

    // 4. Personal Context
    if (lowerInput.includes("my blood group") || lowerInput.includes("my type")) {
        return {
            text: userBloodType
                ? `Your registered blood type is ${userBloodType}. ${userBloodType.includes('-') ? 'Being Rhesus negative makes you a very rare and vital donor! 🌟' : 'Awesome group to have! ✨'}`
                : "I don't have your blood type on record. Should I show you how to add it in your profile?",
            intent: !userBloodType ? 'offer_profile_guide' : null
        };
    }

    // 5. Preparation & Aftercare
    if (lowerInput.includes("prepare") || lowerInput.includes("before") || lowerInput.includes("eat") || lowerInput.includes("drink")) {
        return {
            text: `Preparing well makes donation easy and safe! 🥪 I have a quick checklist of what to eat and drink before you go. Would you like to hear it?`,
            intent: 'offer_prep_guide'
        };
    }

    if (lowerInput.includes("after") || lowerInput.includes("post care") || lowerInput.includes("dizzy") || lowerInput.includes("rest")) {
        return {
            text: `Taking care of yourself after donating is just as important! 🧃 Would you like my quick 24-hour post-donation care guide?`,
            intent: 'offer_post_care'
        };
    }

    // 6. Milestones & Badges
    if (lowerInput.includes("badge") || lowerInput.includes("milestone") || lowerInput.includes("reward") || lowerInput.includes("points")) {
        return {
            text: `Your bravery earns you badges, ${userName}! 🏆\n🥉 Bronze: 1-4 donations\n🥈 Silver: 5-9 donations\n🥇 Gold: 10+ donations\nEach donation saves up to 3 lives. Check your dashboard to see your current rank!`,
            intent: null
        };
    }

    // 7. Normal Actions
    if (lowerInput.includes("donate") || lowerInput.includes("camp") || lowerInput.includes("how to") || lowerInput.includes("where")) {
        return { text: `The donation journey: \n1. Check the 'Community' tab for local Blood Drives \n2. Confirm eligibility \n3. Donate! \nReady to check the community camps?`, intent: null };
    }

    if (lowerInput.includes("emergency") || lowerInput.includes("urgent")) {
        return { text: "🚨 CRITICAL: Check the 'Urgent Needs' list on your dashboard immediately and filter for 'Available'. Every second counts!", intent: null };
    }

    if (lowerInput.includes("hi") || lowerInput.includes("hello") || lowerInput.includes("hey") || lowerInput.includes("assistant")) {
        const hour = new Date().getHours();
        const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
        return { text: `${timeGreeting}, ${userName}! 👋 I'm your AI assistant for eBloodBank. I can help with eligibility, compatibility, or profile management. What's on your mind?`, intent: null };
    }

    if (lowerInput.includes("who are you") || lowerInput.includes("who created you") || lowerInput.includes("what is your name")) {
        return { text: `I am the eBloodBank Assistant! 🩸 I was created to help heroes like you save lives by simplifying the donation process. I can check your eligibility, explain compatibility, and guide you through the platform.`, intent: null };
    }

    if (lowerInput.includes("what can you do") || lowerInput.includes("help") || lowerInput === "?") {
        return {
            text: `I'm highly specialized in: \n✅ **Eligibility Checks**: Tell you if you're ready to donate. \n🩸 **Compatibility**: Show who you can give to. \n👤 **Profile Help**: Guide you to update your info. \n🚑 **Emergencies**: Direct you to urgent tools. \n\nJust ask something like "Am I eligible?" or "Who can I give blood to?"`,
            intent: null
        };
    }

    if (lowerInput.includes("bye") || lowerInput.includes("thanks") || lowerInput.includes("thank you")) {
        return { text: `My pleasure, ${userName}! Stay heroic. 🌟`, intent: null };
    }

    if (lowerInput.includes("blood bank") || lowerInput.includes("ebloodbank") || lowerInput.includes("mission")) {
        return { text: "eBloodBank is a life-saving platform designed to connect blood donors with those in need. Our mission is to ensure that no life is lost due to a lack of blood availability. You're a key part of that mission! 🤝", intent: null };
    }

    return null;
};

exports.chat = async (req, res) => {
    try {
        const { message, history, context, lastIntent } = req.body;

        // Fetch latest donor info for personalization (Name, Blood Type)
        const [donorRows] = await pool.query('SELECT full_name, username, blood_type FROM donors WHERE id = ?', [req.user.id]);
        const donor = donorRows[0] || req.user;

        // Check for static responses first
        const staticReply = getStaticResponse(message, donor, context, lastIntent);
        if (staticReply) {
            return res.json(staticReply);
        }

        if (!process.env.OPENAI_API_KEY) {
            return res.status(503).json({ error: 'OpenAI API key not configured' });
        }

        const displayName = donor.full_name || donor.username || 'Donor';

        const systemPrompt = `You are the eBloodBank AI Assistant, a helpful and medical-knowledgeable companion for blood donors.
        Current User: ${displayName}
        Blood Type: ${donor.blood_type || context?.bloodType || 'Unknown'}
        Eligibility Status: ${context?.isEligible ? 'Eligible to donate' : 'In recovery phase'}
        Next Eligible Date: ${context?.nextEligibleDate || 'N/A'}`;

        const messages = [
            { role: "system", content: systemPrompt },
            ...(Array.isArray(history) ? history : []).map(msg => ({
                role: msg.type === 'user' ? 'user' : 'assistant',
                content: msg.text || ''
            })),
            { role: "user", content: message }
        ];

        // Switching to gpt-4o-mini for better speed and often different quota tiers
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
            max_tokens: 300
        });

        res.json({ text: completion.choices[0].message.content, intent: null });
        await addDonorLog(req.user.id, 'CHAT_AI', 'Assistant', `Interacted with AI Assistant`);
    } catch (err) {
        console.error('Chat error details:', err);

        // Specific handling for Quota Exceeded (429)
        if (err.status === 429 || err.message?.includes('quota')) {
            return res.status(429).json({
                error: 'AI Quota Exceeded',
                text: "I'm currently receiving a high volume of requests, and my AI brain's monthly quota is reached! 🤖 However, I can still assist you with: \n\n✅ Eligibility & Compatibility \n✅ Profile Management \n✅ Emergency Guidance \n\nI'll be fully back online once my quota resets! 🌟"
            });
        }

        res.status(500).json({ error: 'AI Assistant is currently unavailable', details: err.message });
    }
};






exports.getBloodDrives = async (req, res) => {
    try {
        const donorId = req.user.id;
        
        // Fetch donor info for district matching
        const [donorRows] = await pool.query('SELECT district FROM donors WHERE id = ?', [donorId]);
        if (donorRows.length === 0) return res.status(404).json({ error: 'Donor not found' });
        const donorDistrict = donorRows[0].district;

        const [rows] = await pool.query(`
            SELECT bd.*, o.name as org_name, o.city as org_city, o.district as org_district, o.type as org_type, o.phone as org_phone,
                   (SELECT COUNT(*) FROM org_members om WHERE om.org_id = bd.org_id AND om.donor_id = ?) as is_member
            FROM blood_drives bd
            JOIN organizations o ON bd.org_id = o.id
            WHERE bd.status IN ('Upcoming', 'Active')
              AND (o.district = ? OR bd.org_id IN (SELECT org_id FROM org_members WHERE donor_id = ?))
              AND CAST(CONCAT(bd.end_date, ' ', bd.end_time) AS DATETIME) > NOW()
            ORDER BY bd.start_date ASC, bd.start_time ASC
        `, [donorId, donorDistrict, donorId]);
        res.json(rows);
    } catch (err) {
        console.error('getBloodDrives Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};

exports.updatePushToken = async (req, res) => {
    try {
        const { token } = req.body;
        const donorId = req.user.id;
        
        if (!token) {
            return res.status(400).json({ error: 'Push token is required' });
        }

        await pool.query('UPDATE donors SET push_token = ? WHERE id = ?', [token, donorId]);
        res.json({ message: 'Push token updated successfully' });
    } catch (err) {
        console.error('Update Push Token Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
};
