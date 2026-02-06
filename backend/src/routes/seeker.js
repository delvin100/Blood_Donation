const express = require('express');
const router = express.Router();
const seekerController = require('../controllers/seekerController');

router.get('/donors', seekerController.getDonors);
router.get('/featured', seekerController.getFeaturedDonors);
router.post('/request', seekerController.addSeeker);

module.exports = router;
