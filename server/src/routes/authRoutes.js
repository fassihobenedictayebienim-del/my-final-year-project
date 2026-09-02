const express = require('express');
const router = express.Router();
const { login, register } = require('../controllers/authController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.post('/login', login);
router.post('/register', authenticateToken, authorizeRoles('administrator'), register);

module.exports = router;