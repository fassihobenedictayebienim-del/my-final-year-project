const express = require('express');
const router = express.Router();
const { createSale, listSales } = require('../controllers/saleController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/', authorizeRoles('store_manager'), createSale);
router.get('/', authorizeRoles('store_manager', 'warehouse_manager', 'administrator'), listSales);

module.exports = router;