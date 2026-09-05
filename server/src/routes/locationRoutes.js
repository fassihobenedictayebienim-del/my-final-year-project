const express = require('express');
const router = express.Router();
const { listLocations, updateWarehouse, updateStore } = require('../controllers/locationController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken, authorizeRoles('administrator'));

router.get('/', listLocations);
router.put('/warehouses/:id', updateWarehouse);
router.put('/stores/:id', updateStore);

module.exports = router;