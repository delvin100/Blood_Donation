const pool = require('../db');

async function migrate() {
    try {
        console.log('Starting migration: Create notifications table...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                recipient_id INT NOT NULL,
                recipient_type ENUM('Donor', 'Organization') NOT NULL,
                type ENUM('Emergency', 'System', 'Update') DEFAULT 'System',
                title VARCHAR(255),
                message TEXT,
                source_id INT, -- e.g., emergency_request_id
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        console.log('Migration completed: notifications table created.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
