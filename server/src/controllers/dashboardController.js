const { Op } = require("sequelize");
const Sale = require("../models/Sale");
const Shipment = require("../models/Shipment");
const StockTransfer = require("../models/StockTransfer");
const StockRequest = require("../models/StockRequest");
const Inventory = require("../models/Inventory");
const Product = require("../models/Product");
const Warehouse = require("../models/Warehouse");
const Store = require("../models/Store");
const {
  getLocationProductSummary,
} = require("../utils/inventorySummaryHelper");
function dayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}
function dateRangeDays(days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  cutoff.setHours(0, 0, 0, 0);
  const labels = Array.from({ length: days }, (_, i) => {
    const d = new Date(cutoff);
    d.setDate(d.getDate() + i);
    return dayKey(d);
  });
  return { cutoff, labels };
}
function stockStatusCounts(rows) {
  return {
    in_stock: rows.filter((r) => r.status === "ok").length,
    low_stock: rows.filter((r) => r.status === "low").length,
    out_of_stock: rows.filter((r) => r.status === "out").length,
  };
}
function alerts(rows) {
  return rows
    .filter((r) => r.status !== "ok")
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "out" ? -1 : 1));
}
function salesTrend(sales, labels) {
  const map = Object.fromEntries(labels.map((label) => [label, 0]));
  sales.forEach((sale) => {
    const key = dayKey(sale.sale_date);
    if (key in map) map[key] += Number(sale.total_price);
  });
  return labels.map((date) => ({
    date,
    revenue: Math.round(map[date] * 100) / 100,
  }));
}
function topProducts(sales) {
  const map = {};
  sales.forEach((sale) => {
    const id = sale.product_id;
    if (!map[id])
      map[id] = { product_name: sale.Product?.product_name, quantity_sold: 0 };
    map[id].quantity_sold += sale.quantity;
  });
  return Object.values(map)
    .sort((a, b) => b.quantity_sold - a.quantity_sold)
    .slice(0, 5);
}

async function getAdminDashboard(req, res) {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 90);
    const { cutoff, labels } = dateRangeDays(days);
    const [warehouses, stores, allInventory] = await Promise.all([
      Warehouse.findAll(),
      Store.findAll({ where: { active: true } }),
      Inventory.findAll({ include: [Product] }),
    ]);
    const activeStoreIds = stores.map((s) => s.store_id);
    const salesInRange = await Sale.findAll({
      where: { sale_date: { [Op.gte]: cutoff }, store_id: activeStoreIds },
      include: [Product],
    });
    const summaries = [];
    for (const w of warehouses)
      summaries.push(
        ...(await getLocationProductSummary("warehouse", w.warehouse_id)),
      );
    for (const s of stores)
      summaries.push(...(await getLocationProductSummary("store", s.store_id)));
    const low = alerts(summaries);
    const inventory_by_location = [
      {
        location_name: warehouses[0]?.name || "Warehouse",
        quantity: allInventory
          .filter((r) => r.warehouse_id)
          .reduce((n, r) => n + r.quantity, 0),
      },
      ...stores.map((s) => ({
        location_name: s.name,
        quantity: allInventory
          .filter((r) => r.store_id === s.store_id)
          .reduce((n, r) => n + r.quantity, 0),
      })),
    ];
    res.json({
      kpis: {
        total_products: await Product.count(),
        total_inventory_quantity: allInventory.reduce(
          (n, r) => n + r.quantity,
          0,
        ),
        total_inventory_value: allInventory.reduce(
          (n, r) => n + r.quantity * Number(r.Product.unit_price),
          0,
        ),
        total_sales: salesInRange.reduce(
          (n, r) => n + Number(r.total_price),
          0,
        ),
        number_of_stores: stores.length,
        low_stock_count: low.length,
        out_of_stock_products: low.filter((r) => r.status === "out").length,
      },
      sales_trend: salesTrend(salesInRange, labels),
      sales_by_store: stores.map((s) => ({
        store_name: s.name,
        revenue: salesInRange
          .filter((sale) => sale.store_id === s.store_id)
          .reduce((n, sale) => n + Number(sale.total_price), 0),
      })),
      inventory_by_location,
      top_selling_products: topProducts(salesInRange),
      stock_status: stockStatusCounts(summaries),
      days_range: days,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong while building the dashboard." });
  }
}

async function getWarehouseDashboard(req, res) {
  try {
    const warehouse_id = req.user.warehouse_id;
    if (!warehouse_id)
      return res
        .status(400)
        .json({ message: "Your account is not linked to a warehouse." });
    const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 90);
    const { cutoff, labels } = dateRangeDays(days);
    const [
      summary,
      inventoryRows,
      sales,
      shipments,
      transfers,
      stores,
      pendingRequests,
    ] = await Promise.all([
      getLocationProductSummary("warehouse", warehouse_id),
      Inventory.findAll({ where: { warehouse_id }, include: [Product] }),
      Sale.findAll({
        where: { sale_date: { [Op.gte]: cutoff } },
        include: [Product],
      }),
      Shipment.findAll({
        where: { warehouse_id, date_received: { [Op.gte]: cutoff } },
      }),
      StockTransfer.findAll({
        where: { warehouse_id, transfer_date: { [Op.gte]: cutoff } },
      }),
      Store.findAll(),
      StockRequest.findAll({
        where: { status: "pending" },
        include: [Product],
        order: [["request_date", "DESC"]],
      }),
    ]);
    const movement = Object.fromEntries(
      labels.map((label) => [label, { received: 0, dispatched: 0 }]),
    );
    shipments.forEach((s) => {
      const k = dayKey(s.date_received);
      if (movement[k]) movement[k].received += s.quantity;
    });
    transfers.forEach((t) => {
      const k = dayKey(t.transfer_date);
      if (movement[k]) movement[k].dispatched += t.quantity_transferred;
    });
    const transferProducts = await StockTransfer.findAll({
      where: { warehouse_id, transfer_date: { [Op.gte]: cutoff } },
      include: [Product],
    });
    const moveMap = {};
    transferProducts.forEach((t) => {
      if (!moveMap[t.product_id])
        moveMap[t.product_id] = {
          product_name: t.Product.product_name,
          quantity_moved: 0,
        };
      moveMap[t.product_id].quantity_moved += t.quantity_transferred;
    });
    const product_alerts = alerts(summary);
    res.json({
      kpis: {
        total_warehouse_stock: summary.reduce(
          (n, r) => n + r.total_quantity,
          0,
        ),
        warehouse_inventory_value: inventoryRows.reduce(
          (n, r) => n + r.quantity * Number(r.Product.unit_price),
          0,
        ),
        pending_store_requests: pendingRequests.length,
        products_below_reorder: product_alerts.length,
        recent_transfers_count: transfers.length,
      },
      pending_store_requests: pendingRequests.map((request) => ({
        request_id: request.request_id,
        product_name: request.Product?.product_name,
        quantity: request.quantity,
      })),
      recent_transfers: transfers
        .slice(0, 5)
        .map((t) => ({
          transfer_id: t.transfer_id,
          store_id: t.store_id,
          quantity: t.quantity_transferred,
          status: t.status,
          date: t.transfer_date,
        })),
      stock_movement_trend: labels.map((date) => ({ date, ...movement[date] })),
      stock_transferred_to_stores: stores.map((s) => ({
        store_name: s.name,
        quantity: transfers
          .filter((t) => t.store_id === s.store_id)
          .reduce((n, t) => n + t.quantity_transferred, 0),
      })),
      top_moving_products: Object.values(moveMap)
        .sort((a, b) => b.quantity_moved - a.quantity_moved)
        .slice(0, 5),
      warehouse_low_stock_products: product_alerts,
      product_alerts,
      stock_status: stockStatusCounts(summary),
      days_range: days,
    });
  } catch (error) {
    console.error("Warehouse dashboard error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong while building the dashboard." });
  }
}

async function getStoreDashboard(req, res) {
  try {
    const store_id = req.user.store_id;
    if (!store_id)
      return res
        .status(400)
        .json({ message: "Your account is not linked to a store." });
    const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 90);
    const { cutoff, labels } = dateRangeDays(days);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [summary, salesInRange, todaySales, pending] = await Promise.all([
      getLocationProductSummary("store", store_id),
      Sale.findAll({
        where: { store_id, sale_date: { [Op.gte]: cutoff } },
        include: [Product],
      }),
      Sale.findAll({ where: { store_id, sale_date: { [Op.gte]: today } } }),
      StockRequest.count({ where: { store_id, status: "pending" } }),
    ]);
    const product_alerts = alerts(summary);
    res.json({
      kpis: {
        current_store_stock: summary.reduce((n, r) => n + r.total_quantity, 0),
        todays_sales_count: todaySales.length,
        todays_revenue: todaySales.reduce(
          (n, s) => n + Number(s.total_price),
          0,
        ),
        low_stock_products_count: product_alerts.length,
        pending_stock_requests: pending,
      },
      sales_trend: salesTrend(salesInRange, labels),
      top_selling_products: topProducts(salesInRange),
      current_stock_by_product: [...summary]
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, 8)
        .map((r) => ({
          product_name: r.product_name,
          quantity: r.total_quantity,
        })),
      products_below_reorder: product_alerts,
      product_alerts,
      stock_status: stockStatusCounts(summary),
      days_range: days,
    });
  } catch (error) {
    console.error("Store dashboard error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong while building the dashboard." });
  }
}
module.exports = {
  getAdminDashboard,
  getWarehouseDashboard,
  getStoreDashboard,
};
