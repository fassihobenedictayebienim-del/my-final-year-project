const express = require('express');
const router = express.Router();

const {
  createShipment,
  createBatchShipment,
  listShipments,
} = require('../controllers/shipmentController');

const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);

router.post(
  '/',
  authorizeRoles('warehouse_manager'),
  createShipment
);

router.post(
  '/batch',
  authorizeRoles('warehouse_manager'),
  createBatchShipment
);

router.get(
  '/',
  authorizeRoles('warehouse_manager', 'administrator'),
  listShipments
);

module.exports = router;