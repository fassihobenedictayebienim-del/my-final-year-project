const express = require('express');
const router = express.Router();
const { listInventory, lowStockAlerts } = require('../controllers/inventoryController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', listInventory);
router.get('/low-stock', authorizeRoles('warehouse_manager', 'administrator'), lowStockAlerts);

module.exports = router;