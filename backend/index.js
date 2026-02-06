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

app.use('/api', homeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/donor', donorRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/seeker', seekerRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
