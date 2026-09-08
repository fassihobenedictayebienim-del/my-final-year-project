const express = require('express');
const router = express.Router();
const {
  listInventory, getWarehouseStock, getInventorySummary, lowStockAlerts, getReorderLevel, setReorderLevel,
} = require('../controllers/inventoryController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', listInventory);
router.get('/warehouse-stock', getWarehouseStock);
router.get('/summary', getInventorySummary);
router.get('/low-stock', authorizeRoles('warehouse_manager', 'administrator'), lowStockAlerts);
router.get('/reorder-level/:productId', authorizeRoles('warehouse_manager', 'store_manager'), getReorderLevel);
router.put('/reorder-level/:productId', authorizeRoles('warehouse_manager', 'store_manager'), setReorderLevel);

module.exports = router;