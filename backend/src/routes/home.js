const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

router.get('/donors/featured', homeController.getFeaturedDonors);

// Public Organization Search Routes
router.get('/organizations/search', homeController.searchOrganizations);
router.get('/organizations/nearby', homeController.nearbyOrganizations);
router.get('/organizations/:id/inventory', homeController.getPublicOrgInventory);
router.get('/organizations/:id/emergencies', homeController.getOrgEmergencyRequests);
router.get('/organizations/:id/events', homeController.getOrgEvents);

module.exports = router;
