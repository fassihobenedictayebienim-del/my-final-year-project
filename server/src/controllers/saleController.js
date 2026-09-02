const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const { sequelize } = require('../config/db');

// POST /api/sales — Store Manager only
// Records a sale, computes total_price from the product's current unit_price,
// and decreases the store's inventory — all in one transaction.
async function createSale(req, res) {
  const t = await sequelize.transaction();
  try {
    const { product_id, quantity } = req.body;
    const store_id = req.user.store_id;

    if (!store_id) {
      await t.rollback();
      return res.status(400).json({ message: 'Your account is not linked to a store.' });
    }
    if (!product_id || !quantity || quantity <= 0) {
      await t.rollback();
      return res.status(400).json({ message: 'product_id and a positive quantity are required.' });
    }

    const product = await Product.findByPk(product_id, { transaction: t });
    if (!product) {
      await t.rollback();
      return res.status(404).json({ message: 'Product not found.' });
    }

    const inventoryRow = await Inventory.findOne({
      where: { product_id, store_id },
      transaction: t,
    });
    if (!inventoryRow || inventoryRow.quantity < quantity) {
      await t.rollback();
      return res.status(400).json({
        message: 'Insufficient stock at your store to record this sale.',
        available: inventoryRow ? inventoryRow.quantity : 0,
        requested: quantity,
      });
    }

    const total_price = Number(product.unit_price) * Number(quantity);

    inventoryRow.quantity -= quantity;
    await inventoryRow.save({ transaction: t });

    const sale = await Sale.create({
      store_id,
      product_id,
      quantity,
      total_price,
      sale_date: new Date(),
    }, { transaction: t });

    await t.commit();

    res.status(201).json({
      message: 'Sale recorded successfully.',
      sale,
      remaining_store_quantity: inventoryRow.quantity,
    });
  } catch (error) {
    await t.rollback();
    console.error('Create sale error:', error);
    res.status(500).json({ message: 'Something went wrong while recording the sale.' });
  }
}

// GET /api/sales
// Store Manager sees only their own store's sales.
// Warehouse Manager and Administrator see all sales.
async function listSales(req, res) {
  try {
    const where = {};
    if (req.user.role === 'store_manager') {
      where.store_id = req.user.store_id;
    }

    const sales = await Sale.findAll({
      where,
      include: [{ model: Product, attributes: ['product_id', 'product_name', 'size', 'color'] }],
      order: [['sale_date', 'DESC']],
    });

    res.json({ sales });
  } catch (error) {
    console.error('List sales error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching sales.' });
  }
}

module.exports = { createSale, listSales };