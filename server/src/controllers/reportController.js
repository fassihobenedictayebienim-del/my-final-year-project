const { Op } = require('sequelize');
const Sale = require('../models/Sale');
const ProductVariant = require('../models/ProductVariant');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const StockRequest = require('../models/StockRequest');
const ProductLocationSetting = require('../models/ProductLocationSetting');

async function getDashboard(req, res) {
  try {
    const { role, warehouse_id, store_id } = req.user;

    if (role === 'warehouse_manager') {
      const inventoryRows = await Inventory.findAll({
        where: { warehouse_id },
        include: [{ model: ProductVariant, include: [Product] }],
      });
      const total_inventory_value = inventoryRows.reduce((sum, row) => sum + row.quantity * Number(row.ProductVariant.Product.unit_price), 0);

      const byProduct = {};
      inventoryRows.forEach((row) => {
        const pid = row.ProductVariant.product_id;
        byProduct[pid] = (byProduct[pid] || 0) + row.quantity;
      });
      const settings = await ProductLocationSetting.findAll({ where: { warehouse_id } });
      const reorderMap = {};
      settings.forEach((s) => { reorderMap[s.product_id] = s.reorder_level; });
      const low_stock_count = Object.entries(byProduct).filter(([pid, qty]) => qty <= (reorderMap[pid] ?? 0)).length;

      const pending_requests_count = await StockRequest.count({ where: { status: 'pending' } });

      return res.json({ role: 'warehouse_manager', total_inventory_value, low_stock_count, pending_requests_count });
    }

    if (role === 'store_manager') {
      const inventoryRows = await Inventory.findAll({
        where: { store_id },
        include: [{ model: ProductVariant, include: [Product] }],
      });
      const total_inventory_value = inventoryRows.reduce((sum, row) => sum + row.quantity * Number(row.ProductVariant.Product.unit_price), 0);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todaySales = await Sale.findAll({ where: { store_id, sale_date: { [Op.gte]: todayStart } } });
      const today_sales_total = todaySales.reduce((sum, s) => sum + Number(s.total_price), 0);

      const recentSales = await Sale.findAll({
        where: { store_id },
        include: [{ model: ProductVariant, include: [Product] }],
        order: [['sale_date', 'DESC']],
        limit: 5,
      });

      return res.json({
        role: 'store_manager', total_inventory_value, today_sales_total,
        today_sales_count: todaySales.length, recent_sales: recentSales,
      });
    }

    // administrator
    const totalProducts = await Product.count();
    const allInventory = await Inventory.findAll({ include: [{ model: ProductVariant, include: [Product] }] });
    const total_inventory_value = allInventory.reduce((sum, row) => sum + row.quantity * Number(row.ProductVariant.Product.unit_price), 0);
    const pending_requests_count = await StockRequest.count({ where: { status: 'pending' } });
    const total_sales_all_time = await Sale.sum('total_price') || 0;

    res.json({ role: 'administrator', total_products: totalProducts, total_inventory_value, pending_requests_count, total_sales_all_time });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Something went wrong while building the dashboard.' });
  }
}

async function getSalesReport(req, res) {
  try {
    const { start_date, end_date, store_id } = req.query;
    const where = {};

    if (req.user.role === 'store_manager') where.store_id = req.user.store_id;
    else if (store_id) where.store_id = store_id;

    if (start_date || end_date) {
      where.sale_date = {};
      if (start_date) where.sale_date[Op.gte] = new Date(start_date);
      if (end_date) where.sale_date[Op.lte] = new Date(end_date + 'T23:59:59');
    }

    const sales = await Sale.findAll({
      where,
      include: [{ model: ProductVariant, include: [Product] }],
      order: [['sale_date', 'DESC']],
    });

    const total_quantity = sales.reduce((sum, s) => sum + s.quantity, 0);
    const total_revenue = sales.reduce((sum, s) => sum + Number(s.total_price), 0);

    res.json({ sales, summary: { total_quantity, total_revenue, count: sales.length } });
  } catch (error) {
    console.error('Sales report error:', error);
    res.status(500).json({ message: 'Something went wrong while building the sales report.' });
  }
}

async function getInventoryValueReport(req, res) {
  try {
    const where = {};
    if (req.user.role === 'warehouse_manager') where.warehouse_id = req.user.warehouse_id;
    if (req.user.role === 'store_manager') where.store_id = req.user.store_id;

    const inventoryRows = await Inventory.findAll({
      where,
      include: [{ model: ProductVariant, include: [Product] }],
    });

    const breakdown = inventoryRows.map((row) => ({
      product_id: row.ProductVariant.product_id,
      product_name: row.ProductVariant.Product.product_name,
      color: row.ProductVariant.color,
      size: row.ProductVariant.size,
      warehouse_id: row.warehouse_id,
      store_id: row.store_id,
      quantity: row.quantity,
      unit_price: row.ProductVariant.Product.unit_price,
      value: row.quantity * Number(row.ProductVariant.Product.unit_price),
    }));

    const total_value = breakdown.reduce((sum, r) => sum + r.value, 0);

    res.json({ breakdown, total_value });
  } catch (error) {
    console.error('Inventory value report error:', error);
    res.status(500).json({ message: 'Something went wrong while calculating inventory value.' });
  }
}

module.exports = { getDashboard, getSalesReport, getInventoryValueReport };