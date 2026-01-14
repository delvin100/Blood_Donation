require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const homeRoutes = require('./routes/home');
const authRoutes = require('./routes/auth');
const donorRoutes = require('./routes/donor');
const organizationRoutes = require('./routes/organization');

app.use('/api', homeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/donor', donorRoutes);
app.use('/api/organization', organizationRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
