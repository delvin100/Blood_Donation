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
    }
};

/**
 * Records a donor activity log entry.
 */
const addDonorLog = async (donorId, actionType, entityName, description, details = null, connection = null) => {
    try {
        const db = connection || pool;
        await db.query(
            'INSERT INTO donor_logs (donor_id, action_type, entity_name, description, details) VALUES (?, ?, ?, ?, ?)',
            [donorId, actionType, entityName, description, details ? JSON.stringify(details) : null]
        );
    } catch (err) {
        console.error('Error recording donor log:', err);
    }
};

/**
 * Records an admin activity log entry.
 */
const addAdminLog = async (adminId, actionType, entityName, description, details = null, connection = null) => {
    try {
        const db = connection || pool;
        await db.query(
            'INSERT INTO admin_logs (admin_id, action_type, entity_name, description, details) VALUES (?, ?, ?, ?, ?)',
            [adminId, actionType, entityName, description, details ? JSON.stringify(details) : null]
        );
    } catch (err) {
        console.error('Error recording admin log:', err);
    }
};

module.exports = {
    addOrgLog,
    addDonorLog,
    addAdminLog
};
