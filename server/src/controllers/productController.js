const Product = require('../models/Product');

// GET /api/products — any logged-in role can view
async function listProducts(req, res) {
  try {
    const products = await Product.findAll({ order: [['product_name', 'ASC']] });
    res.json({ products });
  } catch (error) {
    console.error('List products error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching products.' });
  }
}

// GET /api/products/:id
async function getProduct(req, res) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    res.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching the product.' });
  }
}

// POST /api/products — Warehouse Manager or Administrator only
async function createProduct(req, res) {
  try {
    const { product_name, size, color, unit_price, reorder_level } = req.body;

    if (!product_name || unit_price === undefined) {
      return res.status(400).json({ message: 'product_name and unit_price are required.' });
    }
    if (unit_price < 0) {
      return res.status(400).json({ message: 'unit_price cannot be negative.' });
    }

    const product = await Product.create({
      product_name,
      size,
      color,
      unit_price,
      reorder_level: reorder_level || 0,
    });

    res.status(201).json({ message: 'Product created successfully.', product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Something went wrong while creating the product.' });
  }
}

// PUT /api/products/:id — Warehouse Manager or Administrator only
async function updateProduct(req, res) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const { product_name, size, color, unit_price, reorder_level } = req.body;
    if (unit_price !== undefined && unit_price < 0) {
      return res.status(400).json({ message: 'unit_price cannot be negative.' });
    }

    await product.update({
      product_name: product_name ?? product.product_name,
      size: size ?? product.size,
      color: color ?? product.color,
      unit_price: unit_price ?? product.unit_price,
      reorder_level: reorder_level ?? product.reorder_level,
    });

    res.json({ message: 'Product updated successfully.', product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Something went wrong while updating the product.' });
  }
}

// DELETE /api/products/:id — Warehouse Manager or Administrator only
async function deleteProduct(req, res) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    await product.destroy();
    res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    // The database itself blocks deleting a product that already has
    // shipments, sales, or requests linked to it (ON DELETE RESTRICT
    // in schema.sql) — this catches that and gives a clear message
    // instead of a raw database error.
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({
        message: 'This product cannot be deleted because it already has related records (shipments, sales, inventory, or requests).',
      });
    }
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Something went wrong while deleting the product.' });
  }
}

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct };