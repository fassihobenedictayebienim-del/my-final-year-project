const express = require('express');
const router = express.Router();
const { createStockRequest, listStockRequests, approveAndDispatch, rejectRequest, confirmReceipt } = require('../controllers/stockRequestController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/', authorizeRoles('store_manager'), createStockRequest);
router.get('/', authorizeRoles('store_manager', 'warehouse_manager', 'administrator'), listStockRequests);
router.put('/:id/approve', authorizeRoles('warehouse_manager'), approveAndDispatch);
router.put('/:id/reject', authorizeRoles('warehouse_manager'), rejectRequest);
router.put('/:id/confirm-receipt', authorizeRoles('store_manager'), confirmReceipt);

module.exports = router;