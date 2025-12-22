const pool = require('./db');

async function migrate() {
    try {
        console.log('Migrating database for Password Reset...');

        // Add reset_code
        try {
            await pool.query("ALTER TABLE donors ADD COLUMN reset_code VARCHAR(4) DEFAULT NULL");
            console.log("Added reset_code column");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("reset_code already exists");
            } else {
                console.error("Error adding reset_code:", e.message);
            }
        }

        // Add reset_code_expires_at
        try {
            await pool.query("ALTER TABLE donors ADD COLUMN reset_code_expires_at DATETIME DEFAULT NULL");
            console.log("Added reset_code_expires_at column");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("reset_code_expires_at already exists");
            } else {
                console.error("Error adding reset_code_expires_at:", e.message);
            }
        }

        console.log('Migration complete');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
