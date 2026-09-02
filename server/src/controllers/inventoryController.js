const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const { Op } = require('sequelize');

// GET /api/inventory
// Warehouse Manager sees their warehouse's stock.
// Store Manager sees their store's stock.
// Administrator sees everything.
async function listInventory(req, res) {
  try {
    const where = {};

    if (req.user.role === 'warehouse_manager') {
      where.warehouse_id = req.user.warehouse_id;
    } else if (req.user.role === 'store_manager') {
      where.store_id = req.user.store_id;
    }
    // administrator gets no filter — sees all locations

    const inventory = await Inventory.findAll({
      where,
      include: [{ model: Product, attributes: ['product_id', 'product_name', 'size', 'color', 'unit_price', 'reorder_level'] }],
      order: [['product_id', 'ASC']],
    });

    res.json({ inventory });
  } catch (error) {
    console.error('List inventory error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching inventory.' });
  }
}

// GET /api/inventory/low-stock
// Warehouse Manager and Administrator only — products at or below reorder level, warehouse side.
async function lowStockAlerts(req, res) {
  try {
    const inventory = await Inventory.findAll({
      where: { warehouse_id: { [Op.ne]: null } },
      include: [{ model: Product, attributes: ['product_id', 'product_name', 'size', 'color', 'reorder_level'] }],
    });

    const lowStock = inventory.filter(row => row.quantity <= row.Product.reorder_level);

    res.json({ low_stock: lowStock });
  } catch (error) {
    console.error('Low stock alert error:', error);
    res.status(500).json({ message: 'Something went wrong while checking low-stock levels.' });
  }
}

module.exports = { listInventory, lowStockAlerts };