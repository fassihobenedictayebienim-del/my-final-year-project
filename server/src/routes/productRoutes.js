const express = require('express');
const router = express.Router();
const {
  listProducts, getProduct, createProduct, updateProduct, deleteProduct,
} = require('../controllers/productController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Every route requires login
router.use(authenticateToken);

// All roles can view
router.get('/', listProducts);
router.get('/:id', getProduct);

// Only Warehouse Manager and Administrator can manage products
router.post('/', authorizeRoles('administrator', 'warehouse_manager'), createProduct);
router.put('/:id', authorizeRoles('administrator', 'warehouse_manager'), updateProduct);
router.delete('/:id', authorizeRoles('administrator', 'warehouse_manager'), deleteProduct);

module.exports = router;