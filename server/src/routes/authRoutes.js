const express = require('express');
const router = express.Router();
const { login, register, getProfile, changePassword } = require('../controllers/authController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.post('/login', login);
router.post('/register', authenticateToken, authorizeRoles('administrator'), register);
router.get('/me', authenticateToken, getProfile);
router.put('/change-password', authenticateToken, changePassword);

module.exports = router;