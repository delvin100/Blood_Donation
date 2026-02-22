const express = require('express');
const router = express.Router();
const donorController = require('../controllers/donorController');
const authMiddleware = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `profile-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

router.get('/stats', authMiddleware, donorController.getStats);
router.get('/reports', authMiddleware, donorController.getReports);
router.post('/donation', authMiddleware, donorController.addDonation);
router.get('/urgent-needs', authMiddleware, donorController.getUrgentNeeds);
router.put('/profile', authMiddleware, donorController.updateProfile);
router.post('/profile-picture', authMiddleware, upload.single('profile_picture'), donorController.uploadProfilePicture);
router.get('/notifications', authMiddleware, donorController.getNotifications);
router.patch('/notifications/:id/read', authMiddleware, donorController.markAsRead);
router.patch('/notifications/read-all', authMiddleware, donorController.markAllRead);
router.delete('/notifications/clear-all', authMiddleware, donorController.clearAllNotifications);
router.delete('/notifications/:id', authMiddleware, donorController.deleteNotification);
router.post('/chat', authMiddleware, donorController.chat);

module.exports = router;
