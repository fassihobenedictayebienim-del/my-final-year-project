const express = require('express');
const router = express.Router();
const { listActivityLogs } = require('../controllers/activityLogController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken, authorizeRoles('administrator'));
router.get('/', listActivityLogs);

module.exports = router;