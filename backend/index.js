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
    const results = {};
    const hosts = ['smtp.gmail.com', 'googlemail.com'];
    const ports = [587, 465, 25];

    for (const host of hosts) {
        results[host] = {};
        for (const port of ports) {
            try {
                await new Promise((resolve, reject) => {
                    const socket = net.createConnection(port, host);
                    socket.setTimeout(5000);
                    socket.on('connect', () => { socket.destroy(); resolve(); });
                    socket.on('timeout', () => { socket.destroy(); reject(new Error('Timeout')); });
                    socket.on('error', (e) => { reject(e); });
                });
                results[host][port] = 'Connected Successfully';
            } catch (e) {
                results[host][port] = `Failed: ${e.message}`;
            }
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
