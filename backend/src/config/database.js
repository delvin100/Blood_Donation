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
    maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
    idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 20000 // Increased timeout for initial connection
});

// IMPORTANT: Keep-alive and error handling for free-tier DB stability
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
        console.log('Database connection was closed. This is normal for free-tier DBs. The pool will handle reconnection.');
    } else {
        throw err;
    }
});

// Verify connection on startup
pool.getConnection()
    .then(connection => {
        console.log("Connected to FreeSQLDatabase Successfully");
        connection.release();
    })
    .catch(err => {
        console.error("DB Connection Failed on Startup:", err);
    });

module.exports = pool;
