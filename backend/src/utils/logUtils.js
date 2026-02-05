const pool = require('../config/database');

/**
 * Records an organization activity log entry.
 * 
 * @param {number} orgId - The ID of the organization
 * @param {string} actionType - Category of the action (e.g., 'DONATION', 'MEMBER_ADD')
 * @param {string} entityName - Name of the related entity (e.g., Donor Name)
 * @param {string} description - Human-readable summary of the action
 * @param {Object} [details] - Optional JSON details
 * @param {Object} [connection] - Optional database connection for transactions
 */
const addOrgLog = async (orgId, actionType, entityName, description, details = null, connection = null) => {
    try {
        const db = connection || pool;
        await db.query(
            'INSERT INTO org_logs (org_id, action_type, entity_name, description, details) VALUES (?, ?, ?, ?, ?)',
            [orgId, actionType, entityName, description, details ? JSON.stringify(details) : null]
        );
    } catch (err) {
        console.error('Error recording organization log:', err);
        // We don't throw here to avoid failing the main action if logging fails,
        // unless we are in a transaction and want to be strict.
    }
};

module.exports = {
    addOrgLog
};
