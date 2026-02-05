const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const pool = require('../src/config/database'); // Use the shared pool

// Simple random data generators
const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson'];
const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat', 'Pune', 'Jaipur'];
const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const orgTypes = ['Hospital', 'Blood Bank', 'Clinic'];

function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhone() {
    return '9' + Math.floor(Math.random() * 1000000000);
}

async function seed() {
    let connection;
    try {
        console.log('🌱 Using shared database pool...');
        connection = await pool.getConnection();
        console.log('✅ Connected!');

        // 1. Clear existing data
        console.log('🧹 Clearing old data...');
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        const tables = ['donors', 'organizations', 'blood_inventory', 'emergency_requests', 'medical_reports', 'org_members', 'notifications', 'donations'];
        for (const table of tables) {
            await connection.query(`TRUNCATE TABLE ${table}`);
        }
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('✨ Database cleared.');

        const passwordHash = await bcrypt.hash('password123', 10);
        const donors = [];
        const orgs = [];

        // 2. Create 10 Donors
        console.log('👤 Creating 10 Donors...');
        for (let i = 0; i < 10; i++) {
            const fn = getRandom(firstNames);
            const ln = getRandom(lastNames);
            const donor = {
                full_name: `${fn} ${ln}`,
                email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@example.com`,
                password_hash: passwordHash,
                blood_type: getRandom(bloodGroups),
                phone: generatePhone(),
                gender: Math.random() > 0.5 ? 'male' : 'female',
                state: 'StateName',
                city: getRandom(cities),
                dob: '1995-01-01',
                availability: Math.random() > 0.3 ? 'Available' : 'Unavailable'
            };

            const [res] = await connection.query(
                `INSERT INTO donors (full_name, email, password_hash, blood_type, phone, gender, state, city, dob, availability) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [donor.full_name, donor.email, donor.password_hash, donor.blood_type, donor.phone, donor.gender, donor.state, donor.city, donor.dob, donor.availability]
            );
            donors.push({ ...donor, id: res.insertId });
        }

        // 3. Create 10 Organizations
        console.log('🏥 Creating 10 Organizations...');
        for (let i = 0; i < 10; i++) {
            const type = getRandom(orgTypes);
            const city = getRandom(cities);
            const orgName = `${city} ${type} ${i + 1}`;

            const [res] = await connection.query(
                `INSERT INTO organizations (name, email, phone, password_hash, license_number, type, address, state, city, verified)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [orgName, `contact${i}@${city.toLowerCase().replace(' ', '')}org.com`, generatePhone(), passwordHash, `LIC-${Math.floor(Math.random() * 100000)}`, type, `123 ${city} Main St`, 'StateName', city, Math.random() > 0.2]
            );
            orgs.push({ id: res.insertId, name: orgName, city: city });
        }

        // 4. Create Inventory for Orgs
        console.log('🩸 Stocking Blood Inventory...');
        for (const org of orgs) {
            for (const bg of bloodGroups) {
                if (Math.random() > 0.3) {
                    await connection.query(`INSERT INTO blood_inventory (org_id, blood_group, units) VALUES (?, ?, ?)`, [org.id, bg, getRandomInt(0, 50)]);
                }
            }
        }

        // 5. Link Donors to Orgs
        console.log('🔗 Linking Donors to Organizations...');
        for (const donor of donors) {
            const numOrgs = getRandomInt(1, 2);
            const shuffledOrgs = [...orgs].sort(() => 0.5 - Math.random());
            const selectedOrgs = shuffledOrgs.slice(0, numOrgs);

            for (const org of selectedOrgs) {
                await connection.query(`INSERT INTO org_members (org_id, donor_id, role) VALUES (?, ?, ?)`, [org.id, donor.id, 'Member']);
            }
        }

        // 6. Create Medical Reports
        console.log('📄 Generating Medical Reports...');
        for (let i = 0; i < 15; i++) {
            const donor = getRandom(donors);
            const org = getRandom(orgs);
            const date = new Date();
            date.setDate(date.getDate() - getRandomInt(1, 365));

            await connection.query(
                `INSERT INTO medical_reports (donor_id, org_id, hb_level, blood_pressure, weight, units_donated, blood_group, test_date, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [donor.id, org.id, (12 + Math.random() * 4).toFixed(1), '120/80', getRandomInt(50, 90), 1, donor.blood_type, date, 'Routine donation. All vitals normal.']
            );

            await connection.query(
                `INSERT INTO donations (donor_id, org_id, date, units, hb_level, blood_pressure, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [donor.id, org.id, date, 1.0, (12 + Math.random() * 4).toFixed(1), '120/80', 'Official Clinical Donation']
            );
        }

        // 7. Create Emergency Requests
        console.log('🚨 creating Emergency Requests...');
        for (let i = 0; i < 5; i++) {
            const org = getRandom(orgs);
            await connection.query(
                `INSERT INTO emergency_requests (org_id, blood_group, units_required, urgency_level, status)
                 VALUES (?, ?, ?, ?, ?)`,
                [org.id, getRandom(bloodGroups), getRandomInt(2, 10), getRandom(['Critical', 'High']), 'Active']
            );
        }

        console.log('✅ Seeding Complete! default password is "password123"');
        process.exit(0);

    } catch (err) {
        console.error('❌ Seeding Failed:', err);
        process.exit(1);
    } finally {
        if (connection) connection.release();
    }
}

seed();
