const pool = require('../config/database');

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
            'SELECT date FROM donations WHERE donor_id = ? ORDER BY date DESC LIMIT 1',
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
        await db.query('UPDATE donors SET availability = ? WHERE id = ?', [status, donorId]);

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
