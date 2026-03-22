const { Expo } = require('expo-server-sdk');
const pool = require('../config/database');

let expo = new Expo();

/**
 * Sends a push notification to a specific recipient.
 * 
 * @param {number} recipientId 
 * @param {string} recipientType - 'Donor' or 'Organization'
 * @param {string} title 
 * @param {string} message 
 * @param {Object} data - Optional data payload
 */
const sendPushNotification = async (recipientId, recipientType, title, message, data = {}) => {
    try {
        const table = recipientType === 'Donor' ? 'donors' : 'organizations';
        
        // 1. Fetch push token and unread count
        const [userRows] = await pool.query(`SELECT push_token FROM ${table} WHERE id = ?`, [recipientId]);
        if (userRows.length === 0 || !userRows[0].push_token) {
            return; // No token, nothing to push
        }
        
        const pushToken = userRows[0].push_token;
        if (!Expo.isExpoPushToken(pushToken)) {
            console.warn(`Recipient ${recipientId} (${recipientType}) has an invalid Expo push token: ${pushToken}`);
            return;
        }

        const [unreadRows] = await pool.query(
            'SELECT COUNT(*) as count FROM notifications WHERE recipient_id = ? AND recipient_type = ? AND is_read = FALSE AND is_dismissed = FALSE',
            [recipientId, recipientType]
        );
        const unreadCount = unreadRows[0].count;

        // 2. Prepare message
        const messages = [{
            to: pushToken,
            sound: 'default',
            title: title,
            body: message,
            data: data,
            badge: unreadCount
        }];

        // 3. Send via Expo
        let chunks = expo.chunkPushNotifications(messages);
        for (let chunk of chunks) {
            try {
                await expo.sendPushNotificationsAsync(chunk);
            } catch (error) {
                console.error('Error sending push notification chunk:', error);
            }
        }
    } catch (err) {
        console.error('sendPushNotification error:', err);
    }
};

/**
 * Creates a notification in the database and sends a push notification.
 * 
 * @param {number} recipientId 
 * @param {string} recipientType - 'Donor' or 'Organization'
 * @param {string} type - Notification type (e.g., 'EMERGENCY', 'BROADCAST', 'ELIGIBILITY')
 * @param {string} title 
 * @param {string} message 
 * @param {number} sourceId - Optional ID of the related object (e.g., requestId, broadcastId)
 * @param {Object} data - Optional push data payload
 */
const createAndSendNotification = async (recipientId, recipientType, type, title, message, sourceId = null, data = {}) => {
    try {
        // 1. Insert into database
        await pool.query(
            'INSERT INTO notifications (recipient_id, recipient_type, type, title, message, source_id) VALUES (?, ?, ?, ?, ?, ?)',
            [recipientId, recipientType, type, title, message, sourceId]
        );

        // 2. Send push notification
        await sendPushNotification(recipientId, recipientType, title, message, { ...data, type, sourceId });
    } catch (err) {
        console.error('createAndSendNotification error:', err);
    }
};

module.exports = {
    sendPushNotification,
    createAndSendNotification
};
