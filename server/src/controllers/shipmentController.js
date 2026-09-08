const Shipment = require('../models/Shipment');
const Inventory = require('../models/Inventory');
const ProductVariant = require('../models/ProductVariant');
const Product = require('../models/Product');
const { sequelize } = require('../config/db');
const logActivity = require('../utils/activityLogger');

// POST /api/shipments — Warehouse Manager only
// body: { variant_id, quantity, date_received }
async function createShipment(req, res) {
  const t = await sequelize.transaction();
  try {
    const { variant_id, quantity, date_received } = req.body;
    const warehouse_id = req.user.warehouse_id;

    if (!warehouse_id) {
      await t.rollback();
      return res.status(400).json({ message: 'Your account is not linked to a warehouse.' });
    }
    if (!variant_id || !quantity || quantity <= 0) {
      await t.rollback();
      return res.status(400).json({ message: 'variant_id and a positive quantity are required.' });
    }

    const variant = await ProductVariant.findByPk(variant_id, { include: [Product], transaction: t });
    if (!variant) {
      await t.rollback();
      return res.status(404).json({ message: 'Variant not found.' });
    }

    const shipment = await Shipment.create(
      { variant_id, warehouse_id, quantity, date_received: date_received || new Date() },
      { transaction: t }
    );

    const [inventoryRow] = await Inventory.findOrCreate({
      where: { variant_id, warehouse_id }, defaults: { quantity: 0 }, transaction: t,
    });
    inventoryRow.quantity += Number(quantity);
    await inventoryRow.save({ transaction: t });

    await t.commit();

    await logActivity(req.user, 'SHIPMENT_RECORDED', `Shipment of ${quantity} unit(s) of "${variant.Product.product_name}" (${variant.color}/${variant.size}) recorded.`);

    res.status(201).json({
      message: 'Shipment recorded and inventory updated.', shipment, new_warehouse_quantity: inventoryRow.quantity,
    });
  } catch (error) {
    await t.rollback();
    console.error('Create shipment error:', error);
    res.status(500).json({ message: 'Something went wrong while recording the shipment.' });
  }
}

async function listShipments(req, res) {
  try {
    const shipments = await Shipment.findAll({
      include: [{ model: ProductVariant, include: [Product] }],
      order: [['date_received', 'DESC']],
    });
    res.json({ shipments });
  } catch (error) {
    console.error('List shipments error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching shipments.' });
  }
}

module.exports = { createShipment, listShipments };