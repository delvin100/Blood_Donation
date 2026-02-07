const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const verifyAdminToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided.' });
    jwt.verify(token.split(' ')[1], JWT_SECRET, (err, decoded) => {
        if (err || decoded.role !== 'admin') return res.status(403).json({ error: 'Unauthorized.' });
        req.adminId = decoded.id;
        next();
    });
};

router.post('/login', adminController.login);
router.get('/stats', verifyAdminToken, adminController.getStats);
router.get('/donors', verifyAdminToken, adminController.getDonors);
router.get('/organizations', verifyAdminToken, adminController.getOrganizations);
router.put('/organizations/:id/verify', verifyAdminToken, adminController.verifyOrganization);

// New Routes
router.get('/inventory', verifyAdminToken, adminController.getInventory);
router.get('/requests', verifyAdminToken, adminController.getRequests);
router.get('/reports', verifyAdminToken, adminController.getReports);
router.get('/admins', verifyAdminToken, adminController.getAdmins);
router.post('/admins', verifyAdminToken, adminController.addAdmin);
router.put('/admins/:id/status', verifyAdminToken, adminController.toggleAdminStatus);
router.delete('/admins/:id', verifyAdminToken, adminController.deleteAdmin);

router.get('/donors/:id', verifyAdminToken, adminController.getDonorDetails);
router.get('/organizations/:id', verifyAdminToken, adminController.getOrgDetails);
router.get('/reports/:id', verifyAdminToken, adminController.getReportDetails);

router.delete('/donors/:id', verifyAdminToken, adminController.deleteDonor);
router.delete('/organizations/:id', verifyAdminToken, adminController.deleteOrganization);

router.post('/notifications', verifyAdminToken, adminController.createBroadcast);

module.exports = router;
