const Sale = require('../models/Sale');
const ProductVariant = require('../models/ProductVariant');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const { sequelize } = require('../config/db');
const logActivity = require('../utils/activityLogger');

async function createSale(req, res) {
  const t = await sequelize.transaction();
  try {
    const { variant_id, quantity } = req.body;
    const store_id = req.user.store_id;

    if (!store_id) { await t.rollback(); return res.status(400).json({ message: 'Your account is not linked to a store.' }); }
    if (!variant_id || !quantity || quantity <= 0) {
      await t.rollback();
      return res.status(400).json({ message: 'variant_id and a positive quantity are required.' });
    }

    const variant = await ProductVariant.findByPk(variant_id, { include: [Product], transaction: t });
    if (!variant) { await t.rollback(); return res.status(404).json({ message: 'Variant not found.' }); }

    const inventoryRow = await Inventory.findOne({ where: { variant_id, store_id }, transaction: t });
    if (!inventoryRow || inventoryRow.quantity < quantity) {
      await t.rollback();
      return res.status(400).json({
        message: 'Insufficient stock at your store to record this sale.',
        available: inventoryRow ? inventoryRow.quantity : 0, requested: quantity,
      });
    }

    const total_price = Number(variant.Product.unit_price) * Number(quantity);

    inventoryRow.quantity -= quantity;
    await inventoryRow.save({ transaction: t });

    const sale = await Sale.create({ store_id, variant_id, quantity, total_price, sale_date: new Date() }, { transaction: t });

    await t.commit();

    await logActivity(req.user, 'SALE_RECORDED', `Store ${store_id} sold ${quantity} unit(s) of "${variant.Product.product_name}" (${variant.color}/${variant.size}) for GHS ${total_price.toFixed(2)}.`);

    res.status(201).json({ message: 'Sale recorded successfully.', sale, remaining_store_quantity: inventoryRow.quantity });
  } catch (error) {
    await t.rollback();
    console.error('Create sale error:', error);
    res.status(500).json({ message: 'Something went wrong while recording the sale.' });
  }
}

async function listSales(req, res) {
  try {
    const where = {};
    if (req.user.role === 'store_manager') where.store_id = req.user.store_id;

    const sales = await Sale.findAll({
      where,
      include: [{ model: ProductVariant, include: [Product] }],
      order: [['sale_date', 'DESC']],
    });
    res.json({ sales });
  } catch (error) {
    console.error('List sales error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching sales.' });
  }
}

module.exports = { createSale, listSales };