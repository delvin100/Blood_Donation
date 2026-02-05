const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

router.get('/donors', homeController.getDonors);
router.get('/donors/featured', homeController.getFeaturedDonors);
router.post('/seekers', homeController.addSeeker);

module.exports = router;
