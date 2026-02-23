require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const homeRoutes = require('./src/routes/home');
const authRoutes = require('./src/routes/auth');
const donorRoutes = require('./src/routes/donor');

const organizationRoutes = require('./src/routes/organization');
const adminRoutes = require('./src/routes/admin');
const seekerRoutes = require('./src/routes/seeker');

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));
app.get('/api/debug-email-port', async (req, res) => {
    const net = require('net');
    const results = {
        env: {
            EMAIL_USER_PRESENT: !!process.env.EMAIL_USER,
            EMAIL_PASS_PRESENT: !!process.env.EMAIL_PASS,
        },
        connectivity: {}
    };
    const targets = [
        { host: 'smtp.gmail.com', port: 587 },
        { host: 'smtp.gmail.com', port: 465 },
        { host: 'google.com', port: 443 },
        { host: 'google.com', port: 80 }
    ];

    for (const target of targets) {
        const key = `${target.host}:${target.port}`;
        try {
            await new Promise((resolve, reject) => {
                const socket = net.createConnection(target.port, target.host);
                socket.setTimeout(5000);
                socket.on('connect', () => { socket.destroy(); resolve(); });
                socket.on('timeout', () => { socket.destroy(); reject(new Error('Timeout after 5s')); });
                socket.on('error', (e) => { reject(e); });
            });
            results.connectivity[key] = 'OK (Connected)';
        } catch (e) {
            results.connectivity[key] = `Failed: ${e.message || 'Unknown Error'}`;
        }
    }
    res.json(results);
});
app.use('/api/home', homeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/donor', donorRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/seeker', seekerRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
