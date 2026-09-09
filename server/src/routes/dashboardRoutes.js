const express = require('express');
const router = express.Router();
const { getAdminDashboard, getWarehouseDashboard, getStoreDashboard } = require('../controllers/dashboardController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/admin', authorizeRoles('administrator'), getAdminDashboard);
router.get('/warehouse', authorizeRoles('warehouse_manager'), getWarehouseDashboard);
router.get('/store', authorizeRoles('store_manager'), getStoreDashboard);

module.exports = router;