const express = require('express');
const router = express.Router();
const seekerController = require('../controllers/seekerController');

router.get('/donors', seekerController.getDonors);
router.get('/featured', seekerController.getFeaturedDonors);
router.get('/smart-match', seekerController.getSmartMatches);


module.exports = router;
