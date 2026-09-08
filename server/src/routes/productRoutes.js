const express = require('express');
const router = express.Router();
const {
  listProducts, getProduct, createProduct, updateProduct, deleteProduct,
  listVariantsForProduct, addVariant, deleteVariant,
} = require('../controllers/productController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', listProducts);
router.get('/:id', getProduct);
router.get('/:id/variants', listVariantsForProduct);

router.post('/', authorizeRoles('administrator', 'warehouse_manager'), createProduct);
router.put('/:id', authorizeRoles('administrator', 'warehouse_manager'), updateProduct);
router.delete('/:id', authorizeRoles('administrator', 'warehouse_manager'), deleteProduct);

router.post('/:id/variants', authorizeRoles('administrator', 'warehouse_manager'), addVariant);
router.delete('/variants/:variantId', authorizeRoles('administrator', 'warehouse_manager'), deleteVariant);

module.exports = router;