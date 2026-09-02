const Shipment = require('../models/Shipment');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const { sequelize } = require('../config/db');

// POST /api/shipments — Warehouse Manager only
// Records a shipment AND increases the warehouse's inventory for that
// product, as a single atomic transaction. If anything fails partway,
// everything rolls back — you never end up with a logged shipment that
// didn't actually increase stock, or vice versa.
async function createShipment(req, res) {
  const t = await sequelize.transaction();
  try {
    const { product_id, quantity, date_received } = req.body;
    const warehouse_id = req.user.warehouse_id; // taken from the logged-in manager's own account, not the request body

    if (!warehouse_id) {
      await t.rollback();
      return res.status(400).json({ message: 'Your account is not linked to a warehouse.' });
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

    // 1. Log the shipment
    const shipment = await Shipment.create({
      product_id,
      warehouse_id,
      quantity,
      date_received: date_received || new Date(),
    }, { transaction: t });

    // 2. Increase (or create) the warehouse's inventory row for this product
    const [inventoryRow] = await Inventory.findOrCreate({
      where: { product_id, warehouse_id },
      defaults: { quantity: 0 },
      transaction: t,
    });
    inventoryRow.quantity += Number(quantity);
    await inventoryRow.save({ transaction: t });

    await t.commit();

    res.status(201).json({
      message: 'Shipment recorded and inventory updated.',
      shipment,
      new_warehouse_quantity: inventoryRow.quantity,
    });
  } catch (error) {
    await t.rollback();
    console.error('Create shipment error:', error);
    res.status(500).json({ message: 'Something went wrong while recording the shipment.' });
  }
}

// GET /api/shipments — Warehouse Manager and Administrator
async function listShipments(req, res) {
  try {
    const shipments = await Shipment.findAll({
      include: [{ model: Product, attributes: ['product_id', 'product_name', 'size', 'color'] }],
      order: [['date_received', 'DESC']],
    });
    res.json({ shipments });
  } catch (error) {
    console.error('List shipments error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching shipments.' });
  }
}

module.exports = { createShipment, listShipments };