const { Op } = require("sequelize");
const Sale = require("../models/Sale");
const Product = require("../models/Product");
const Inventory = require("../models/Inventory");
const StockRequest = require("../models/StockRequest");
const ProductLocationSetting = require("../models/ProductLocationSetting");
const Warehouse = require("../models/Warehouse");
const Store = require("../models/Store");

async function getDashboard(req, res) {
  try {
    const { role, warehouse_id, store_id } = req.user;
    const where =
      role === "warehouse_manager"
        ? { warehouse_id }
        : role === "store_manager"
          ? { store_id }
          : {};
    const inventoryRows = await Inventory.findAll({
      where,
      include: [Product],
    });
    const total_inventory_value = inventoryRows.reduce(
      (sum, row) => sum + row.quantity * Number(row.Product.unit_price),
      0,
    );
    if (role === "warehouse_manager") {
      const settings = await ProductLocationSetting.findAll({
        where: { warehouse_id },
      });
      const reorder = Object.fromEntries(
        settings.map((s) => [s.product_id, s.reorder_level]),
      );
      return res.json({
        role,
        total_inventory_value,
        low_stock_count: inventoryRows.filter(
          (r) => r.quantity <= (reorder[r.product_id] ?? 0),
        ).length,
        pending_requests_count: await StockRequest.count({
          where: { status: "pending" },
        }),
      });
    }
    if (role === "store_manager") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sales = await Sale.findAll({
        where: { store_id, sale_date: { [Op.gte]: today } },
        include: [Product],
      });
      return res.json({
        role,
        total_inventory_value,
        today_sales_total: sales.reduce(
          (sum, sale) => sum + Number(sale.total_price),
          0,
        ),
        today_sales_count: sales.length,
        recent_sales: sales.slice(0, 5),
      });
    }
    res.json({
      role: "administrator",
      total_products: await Product.count(),
      total_inventory_value,
      pending_requests_count: await StockRequest.count({
        where: { status: "pending" },
      }),
      total_sales_all_time: Number(await Sale.sum("total_price")) || 0,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong while building the dashboard." });
  }
}
async function getSalesReport(req, res) {
  try {
    const { start_date, end_date, store_id } = req.query;
    const stores = await Store.findAll({ where: { active: true } });
    const activeIds = stores.map((store) => store.store_id);
    const where =
      req.user.role === "store_manager"
        ? { store_id: req.user.store_id }
        : store_id
          ? { store_id }
          : { store_id: activeIds };
    if (start_date || end_date) {
      where.sale_date = {};
      if (start_date) where.sale_date[Op.gte] = new Date(start_date);
      if (end_date) where.sale_date[Op.lte] = new Date(`${end_date}T23:59:59`);
    }
    const sales = await Sale.findAll({
      where,
      include: [Product],
      order: [["sale_date", "DESC"]],
    });
    const storeNames = Object.fromEntries(
      stores.map((store) => [store.store_id, store.name]),
    );
    const decorated = sales.map((sale) => ({
      ...sale.toJSON(),
      location_label: storeNames[sale.store_id] || "Deactivated store",
    }));
    res.json({
      sales: decorated,
      summary: {
        total_quantity: sales.reduce((sum, sale) => sum + sale.quantity, 0),
        total_revenue: sales.reduce(
          (sum, sale) => sum + Number(sale.total_price),
          0,
        ),
        count: sales.length,
      },
    });
  } catch (error) {
    console.error("Sales report error:", error);
    res
      .status(500)
      .json({
        message: "Something went wrong while building the sales report.",
      });
  }
}
async function getInventoryValueReport(req, res) {
  try {
    const where =
      req.user.role === "warehouse_manager"
        ? { warehouse_id: req.user.warehouse_id }
        : req.user.role === "store_manager"
          ? { store_id: req.user.store_id }
          : {};
    const [rows, warehouses, stores] = await Promise.all([
      Inventory.findAll({ where, include: [Product] }),
      Warehouse.findAll(),
      Store.findAll(),
    ]);
    const labels = {
      ...Object.fromEntries(
        warehouses.map((w) => [`w${w.warehouse_id}`, w.name || "Warehouse"]),
      ),
      ...Object.fromEntries(
        stores.map((s) => [`s${s.store_id}`, s.name || `Store ${s.store_id}`]),
      ),
    };
    const breakdown = rows.map((row) => ({
      product_id: row.product_id,
      product_name: row.Product.product_name,
      warehouse_id: row.warehouse_id,
      store_id: row.store_id,
      location_label:
        labels[row.warehouse_id ? `w${row.warehouse_id}` : `s${row.store_id}`],
      quantity: row.quantity,
      unit_price: row.Product.unit_price,
      value: row.quantity * Number(row.Product.unit_price),
    }));
    res.json({
      breakdown,
      total_value: breakdown.reduce((sum, row) => sum + row.value, 0),
    });
  } catch (error) {
    console.error("Inventory value report error:", error);
    res
      .status(500)
      .json({
        message: "Something went wrong while calculating inventory value.",
      });
  }
}
module.exports = { getDashboard, getSalesReport, getInventoryValueReport };
