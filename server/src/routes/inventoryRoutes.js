const express = require('express');
const router = express.Router();
const { listInventory, lowStockAlerts, getWarehouseStock } = require('../controllers/inventoryController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', listInventory);
router.get('/warehouse-stock', getWarehouseStock);
router.get('/low-stock', authorizeRoles('warehouse_manager', 'administrator'), lowStockAlerts);

module.exports = router;