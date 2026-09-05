const express = require('express');
const router = express.Router();
const { listUsers, updateUser, resetUserPassword } = require('../controllers/userController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken, authorizeRoles('administrator'));

router.get('/', listUsers);
router.put('/:id', updateUser);
router.put('/:id/reset-password', resetUserPassword);

module.exports = router;