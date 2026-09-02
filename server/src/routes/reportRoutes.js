const express = require('express');
const router = express.Router();
const { getDashboard, getSalesReport, getInventoryValueReport } = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/dashboard', getDashboard);
router.get('/sales', getSalesReport);
router.get('/inventory-value', getInventoryValueReport);

module.exports = router;