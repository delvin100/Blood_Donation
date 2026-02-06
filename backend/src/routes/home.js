const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

router.get('/donors/featured', homeController.getFeaturedDonors);

module.exports = router;
