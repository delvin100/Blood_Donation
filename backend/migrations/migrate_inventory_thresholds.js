const pool = require('../db');

async function migrate() {
    try {
        console.log('Migrating blood_inventory table for Intelligent Thresholds...');

        try {
            await pool.query("ALTER TABLE blood_inventory ADD COLUMN min_threshold INT DEFAULT 5");
            console.log("Added min_threshold column to blood_inventory");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("min_threshold already exists in blood_inventory");
            } else {
                console.error("Error adding min_threshold:", e.message);
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
