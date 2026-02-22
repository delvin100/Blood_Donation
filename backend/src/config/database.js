const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'ebloodbank',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000 // 10 seconds timeout for initial connection
});

// Verify connection on startup
pool.getConnection()
    .then(connection => {
        console.log("Connected to FreeSQLDatabase");
        connection.release();
    })
    .catch(err => {
        console.error("DB Connection Failed:", err);
    });

module.exports = pool;
