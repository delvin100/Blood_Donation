const pool = require('../db');

async function migrate() {
    try {
        console.log('Creating medical_reports table...');

        const query = `
            CREATE TABLE IF NOT EXISTS medical_reports (
                id INT AUTO_INCREMENT PRIMARY KEY,
                donor_id INT NOT NULL,
                org_id INT NOT NULL,
                hb_level DECIMAL(4,2),
                blood_pressure VARCHAR(20),
                pulse_rate INT,
                temperature DECIMAL(4,1),
                weight DECIMAL(5,2),
                blood_group VARCHAR(10),
                rh_factor ENUM('Positive', 'Negative'),
                hiv_status ENUM('Negative', 'Positive') DEFAULT 'Negative',
                hepatitis_b ENUM('Negative', 'Positive') DEFAULT 'Negative',
                hepatitis_c ENUM('Negative', 'Positive') DEFAULT 'Negative',
                syphilis ENUM('Negative', 'Positive') DEFAULT 'Negative',
                malaria ENUM('Negative', 'Positive') DEFAULT 'Negative',
                test_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
                FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;

        await pool.query(query);
        console.log('medical_reports table created successfully');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
