const pool = require('./db');

async function migrate() {
    try {
        console.log('Migrating database...');

        // Add google_id
        try {
            await pool.query("ALTER TABLE donors ADD COLUMN google_id VARCHAR(255) UNIQUE DEFAULT NULL");
            console.log("Added google_id column");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("google_id already exists");
            } else {
                console.error("Error adding google_id:", e.message);
            }
        }

        // Modify password_hash to be nullable
        try {
            await pool.query("ALTER TABLE donors MODIFY COLUMN password_hash VARCHAR(255) NULL");
            console.log("Modified password_hash to be nullable");
        } catch (e) {
            console.error("Error modifying password_hash:", e.message);
        }

        // Modify username to be nullable (optional, allows creation without username initially)
        try {
            await pool.query("ALTER TABLE donors MODIFY COLUMN username VARCHAR(100) NULL");
            console.log("Modified username to be nullable");
        } catch (e) {
            console.error("Error modifying username:", e.message);
        }

        console.log('Migration complete');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
