const pool = require('../config/database');
const { createAndSendNotification } = require('./notificationUtils');

/**
 * Calculates a donor's availability based on their last donation date.
 * A donor is unavailable for 90 days after a donation.
 * 
 * @param {number} donorId - The ID of the donor
 * @param {Object} [connection] - Optional database connection (for transactions)
 * @returns {Promise<Object>} - Status, last donation date, and next eligibility date
 */
const calculateDonorAvailability = async (donorId, connection = null) => {
    try {
        const db = connection || pool;
        const [donations] = await db.query(
            'SELECT `date` FROM donations WHERE donor_id = ? ORDER BY `date` DESC LIMIT 1',
            [donorId]
        );

        let status = 'Available';
        let lastDonationDate = null;
        let nextEligibleDate = null;

        if (donations.length > 0) {
            lastDonationDate = new Date(donations[0].date);
            nextEligibleDate = new Date(lastDonationDate.getTime());
            nextEligibleDate.setDate(lastDonationDate.getDate() + 90);

            const now = new Date();
            if (now < nextEligibleDate) {
                status = 'Unavailable';
            }
        }

        // Keep database in sync
        await db.query('UPDATE donors SET availability = ?, last_donation_date = ? WHERE id = ?', [status, lastDonationDate, donorId]);

        // Logic to trigger notification when donor becomes available
        if (status === 'Available' && lastDonationDate) {
            // Check if they already have an eligibility notification for this last donation
            // We use the last donation date as a reference
            const [existing] = await db.query(
                "SELECT id FROM notifications WHERE recipient_id = ? AND recipient_type = 'Donor' AND type = 'ELIGIBILITY' AND title LIKE ?",
                [donorId, `%Ready to Save Lives Again%`]
            );

            if (existing.length === 0) {
                // Check if they had a donation in the last 100 days (to avoid spamming very old donors)
                const hundredDaysAgo = new Date();
                hundredDaysAgo.setDate(hundredDaysAgo.getDate() - 100);
                
                if (lastDonationDate > hundredDaysAgo) {
                    await createAndSendNotification(
                        donorId,
                        'Donor',
                        'ELIGIBILITY',
                        'Ready to Save Lives Again! 🩸',
                        'Great news! Your 90-day rest period is over. You are now eligible to donate blood and help those in need. Visit a nearby center today!'
                    );
                }
            }
        }

        return {
            status,
            lastDonationDate,
            nextEligibleDate
        };
    } catch (err) {
        console.error('Error calculating donor availability:', err);
        throw err;
    }
};


module.exports = {
    calculateDonorAvailability
};
