const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Shipment = require('../models/Shipment');
const { sequelize } = require('../config/db');

async function listProducts(req, res) {
  try {
    const products = await Product.findAll({ order: [['product_name', 'ASC']] });
    res.json({ products });
  } catch (error) {
    console.error('List products error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching products.' });
  }
}

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
// If initial_quantity is provided and > 0, this also records a shipment
// and creates the warehouse inventory row in the same transaction —
// matching the real workflow where receiving a new product IS the
// first shipment, not a separate later step.
async function createProduct(req, res) {
  const t = await sequelize.transaction();
  try {
    const { product_id, product_name, size, color, unit_price, reorder_level, initial_quantity } = req.body;

    if (!product_id || !product_name || unit_price === undefined) {
      await t.rollback();
      return res.status(400).json({ message: 'product_id, product_name, and unit_price are required.' });
    }
    if (unit_price < 0) {
      await t.rollback();
      return res.status(400).json({ message: 'unit_price cannot be negative.' });
    }

    const existing = await Product.findByPk(product_id, { transaction: t });
    if (existing) {
      await t.rollback();
      return res.status(409).json({ message: `A product with ID "${product_id}" already exists.` });
    }

    const product = await Product.create({
      product_id,
      product_name,
      size,
      color,
      unit_price,
      reorder_level: reorder_level || 0,
    }, { transaction: t });

    let warehouseQuantity = 0;
    const qty = Number(initial_quantity) || 0;

    if (qty > 0) {
      const warehouse_id = req.user.warehouse_id;
      if (!warehouse_id) {
        await t.rollback();
        return res.status(400).json({ message: 'Your account is not linked to a warehouse, cannot record initial stock.' });
      }

      await Shipment.create({
        product_id,
        warehouse_id,
        quantity: qty,
        date_received: new Date(),
      }, { transaction: t });

      const inventoryRow = await Inventory.create({
        product_id,
        warehouse_id,
        quantity: qty,
      }, { transaction: t });

      warehouseQuantity = inventoryRow.quantity;
    }

    await t.commit();

    res.status(201).json({
      message: qty > 0
        ? `Product created and initial shipment of ${qty} unit(s) recorded.`
        : 'Product created successfully.',
      product,
      warehouse_quantity: warehouseQuantity,
    });
  } catch (error) {
    await t.rollback();
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Something went wrong while creating the product.' });
  }
}

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

async function deleteProduct(req, res) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    await product.destroy();
    res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
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