const { Op } = require('sequelize');
const Sale = require('../models/Sale');
const Shipment = require('../models/Shipment');
const StockTransfer = require('../models/StockTransfer');
const StockRequest = require('../models/StockRequest');
const Inventory = require('../models/Inventory');
const ProductVariant = require('../models/ProductVariant');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const Store = require('../models/Store');
const { getLocationProductSummary } = require('../utils/inventorySummaryHelper');

function dayKey(date) { return new Date(date).toISOString().slice(0, 10); }

function dateRangeDays(days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  cutoff.setHours(0, 0, 0, 0);
  const labels = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(cutoff);
    d.setDate(d.getDate() + i);
    labels.push(dayKey(d));
  }
  return { cutoff, labels };
}

function stockStatusCounts(summaryRows) {
  return {
    in_stock: summaryRows.filter((r) => r.status === 'ok').length,
    low_stock: summaryRows.filter((r) => r.status === 'low').length,
    out_of_stock: summaryRows.filter((r) => r.status === 'out').length,
  };
}

// Flattens every individually-flagged variant out of a location's product
// summary, REGARDLESS of whether the parent product itself is flagged.
// This is the fix: a product whose total is healthy can still contain a
// variant sitting at 0, and that variant must still surface here.
function extractVariantAlerts(summaryRows) {
  const alerts = summaryRows.flatMap((p) =>
    p.variants.filter((v) => v.flag).map((v) => ({
      product_id: p.product_id,
      product_name: p.product_name,
      variant_id: v.variant_id,
      color: v.color,
      size: v.size,
      quantity: v.quantity,
      status: v.flag, // 'out' | 'low'
    }))
  );
  // out-of-stock first, then low-stock
  return alerts.sort((a, b) => (a.status === b.status ? 0 : a.status === 'out' ? -1 : 1));
}

// ================= ADMINISTRATOR =================
async function getAdminDashboard(req, res) {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 90);
    const { cutoff, labels } = dateRangeDays(days);

    const totalProducts = await Product.count();

    const allInventory = await Inventory.findAll({ include: [{ model: ProductVariant, include: [Product] }] });
    const total_inventory_quantity = allInventory.reduce((sum, r) => sum + r.quantity, 0);
    const total_inventory_value = allInventory.reduce((sum, r) => sum + r.quantity * Number(r.ProductVariant.Product.unit_price), 0);

    const total_sales = Number(await Sale.sum('total_price')) || 0;
    const number_of_stores = await Store.count();

    const warehouses = await Warehouse.findAll();
    const stores = await Store.findAll();
    const allSummaries = [];
    for (const w of warehouses) allSummaries.push(...(await getLocationProductSummary('warehouse', w.warehouse_id)));
    for (const s of stores) allSummaries.push(...(await getLocationProductSummary('store', s.store_id)));
    const low_stock_count = allSummaries.filter((r) => r.status === 'low' || r.status === 'out').length;

    // Variant-level counts, aggregated across every location
    const allVariantAlerts = extractVariantAlerts(allSummaries);
    const variants_needing_attention = allVariantAlerts.length;
    const out_of_stock_variants = allVariantAlerts.filter((v) => v.status === 'out').length;

    const salesInRange = await Sale.findAll({ where: { sale_date: { [Op.gte]: cutoff } } });
    const trendMap = {};
    labels.forEach((l) => { trendMap[l] = 0; });
    salesInRange.forEach((s) => { const k = dayKey(s.sale_date); if (k in trendMap) trendMap[k] += Number(s.total_price); });
    const sales_trend = labels.map((l) => ({ date: l, revenue: Math.round(trendMap[l] * 100) / 100 }));

    const salesByStoreMap = {};
    salesInRange.forEach((s) => { salesByStoreMap[s.store_id] = (salesByStoreMap[s.store_id] || 0) + Number(s.total_price); });
    const sales_by_store = stores.map((s) => ({ store_name: s.name, revenue: Math.round((salesByStoreMap[s.store_id] || 0) * 100) / 100 }));

    const inventory_by_location = [
      { location_name: warehouses[0]?.name || 'Warehouse', quantity: allInventory.filter((r) => r.warehouse_id).reduce((s, r) => s + r.quantity, 0) },
      ...stores.map((s) => ({ location_name: s.name, quantity: allInventory.filter((r) => r.store_id === s.store_id).reduce((sum, r) => sum + r.quantity, 0) })),
    ];

    const salesWithVariant = await Sale.findAll({
      where: { sale_date: { [Op.gte]: cutoff } },
      include: [{ model: ProductVariant, include: [Product] }],
    });
    const productQtyMap = {}, productNameMap = {};
    salesWithVariant.forEach((s) => {
      const pid = s.ProductVariant.product_id;
      productQtyMap[pid] = (productQtyMap[pid] || 0) + s.quantity;
      productNameMap[pid] = s.ProductVariant.Product.product_name;
    });
    const top_selling_products = Object.entries(productQtyMap)
      .map(([pid, qty]) => ({ product_name: productNameMap[pid], quantity_sold: qty }))
      .sort((a, b) => b.quantity_sold - a.quantity_sold)
      .slice(0, 5);

    const stock_status = stockStatusCounts(allSummaries);

    res.json({
      kpis: {
        total_products: totalProducts, total_inventory_quantity, total_inventory_value, total_sales,
        number_of_stores, low_stock_count, variants_needing_attention, out_of_stock_variants,
      },
      sales_trend, sales_by_store, inventory_by_location, top_selling_products, stock_status,
      days_range: days,
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ message: 'Something went wrong while building the dashboard.' });
  }
}

// ================= WAREHOUSE MANAGER =================
async function getWarehouseDashboard(req, res) {
  try {
    const warehouse_id = req.user.warehouse_id;
    if (!warehouse_id) return res.status(400).json({ message: 'Your account is not linked to a warehouse.' });

    const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 90);
    const { cutoff, labels } = dateRangeDays(days);

    const summary = await getLocationProductSummary('warehouse', warehouse_id);
    const total_warehouse_stock = summary.reduce((s, r) => s + r.total_quantity, 0);

    const inventoryRows = await Inventory.findAll({ where: { warehouse_id }, include: [{ model: ProductVariant, include: [Product] }] });
    const warehouse_inventory_value = inventoryRows.reduce((s, r) => s + r.quantity * Number(r.ProductVariant.Product.unit_price), 0);

    const pending_store_requests = await StockRequest.count({ where: { status: 'pending' } });
    const products_below_reorder = summary.filter((r) => r.status === 'low' || r.status === 'out').length;

    const variant_alerts = extractVariantAlerts(summary);
    const variants_needing_attention = variant_alerts.length;

    const recentTransfersRaw = await StockTransfer.findAll({ where: { warehouse_id }, order: [['transfer_date', 'DESC']], limit: 5 });
    const recent_transfers = recentTransfersRaw.map((t) => ({
      transfer_id: t.transfer_id, store_id: t.store_id, quantity: t.quantity_transferred, status: t.status, date: t.transfer_date,
    }));

    const shipmentsInRange = await Shipment.findAll({ where: { warehouse_id, date_received: { [Op.gte]: cutoff } } });
    const transfersInRange = await StockTransfer.findAll({ where: { warehouse_id, transfer_date: { [Op.gte]: cutoff } } });
    const movementMap = {};
    labels.forEach((l) => { movementMap[l] = { received: 0, dispatched: 0 }; });
    shipmentsInRange.forEach((s) => { const k = dayKey(s.date_received); if (k in movementMap) movementMap[k].received += s.quantity; });
    transfersInRange.forEach((t) => { const k = dayKey(t.transfer_date); if (k in movementMap) movementMap[k].dispatched += t.quantity_transferred; });
    const stock_movement_trend = labels.map((l) => ({ date: l, received: movementMap[l].received, dispatched: movementMap[l].dispatched }));

    const stores = await Store.findAll();
    const transferByStore = {};
    transfersInRange.forEach((t) => { transferByStore[t.store_id] = (transferByStore[t.store_id] || 0) + t.quantity_transferred; });
    const stock_transferred_to_stores = stores.map((s) => ({ store_name: s.name, quantity: transferByStore[s.store_id] || 0 }));

    const transferRequestIds = transfersInRange.map((t) => t.request_id);
    const relatedRequests = transferRequestIds.length
      ? await StockRequest.findAll({ where: { request_id: transferRequestIds }, include: [{ model: ProductVariant, include: [Product] }] })
      : [];
    const requestMap = {};
    relatedRequests.forEach((r) => { requestMap[r.request_id] = r; });
    const movedQtyMap = {}, movedNameMap = {};
    transfersInRange.forEach((t) => {
      const req = requestMap[t.request_id];
      if (!req) return;
      const pid = req.ProductVariant.product_id;
      movedQtyMap[pid] = (movedQtyMap[pid] || 0) + t.quantity_transferred;
      movedNameMap[pid] = req.ProductVariant.Product.product_name;
    });
    const top_moving_products = Object.entries(movedQtyMap)
      .map(([pid, qty]) => ({ product_name: movedNameMap[pid], quantity_moved: qty }))
      .sort((a, b) => b.quantity_moved - a.quantity_moved)
      .slice(0, 5);

    const warehouse_low_stock_products = summary.filter((r) => r.status === 'low' || r.status === 'out');
    const stock_status = stockStatusCounts(summary);

    res.json({
      kpis: {
        total_warehouse_stock, warehouse_inventory_value, pending_store_requests,
        products_below_reorder, recent_transfers_count: recent_transfers.length, variants_needing_attention,
      },
      recent_transfers, stock_movement_trend, stock_transferred_to_stores, top_moving_products,
      warehouse_low_stock_products, variant_alerts, stock_status, days_range: days,
    });
  } catch (error) {
    console.error('Warehouse dashboard error:', error);
    res.status(500).json({ message: 'Something went wrong while building the dashboard.' });
  }
}

// ================= STORE MANAGER =================
async function getStoreDashboard(req, res) {
  try {
    const store_id = req.user.store_id;
    if (!store_id) return res.status(400).json({ message: 'Your account is not linked to a store.' });

    const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 90);
    const { cutoff, labels } = dateRangeDays(days);

    const summary = await getLocationProductSummary('store', store_id);
    const current_store_stock = summary.reduce((s, r) => s + r.total_quantity, 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todaySales = await Sale.findAll({ where: { store_id, sale_date: { [Op.gte]: todayStart } } });
    const todays_revenue = todaySales.reduce((s, r) => s + Number(r.total_price), 0);

    const low_stock_products_count = summary.filter((r) => r.status === 'low' || r.status === 'out').length;
    const pending_stock_requests = await StockRequest.count({ where: { store_id, status: 'pending' } });

    const variant_alerts = extractVariantAlerts(summary);
    const variants_needing_attention = variant_alerts.length;

    const salesInRange = await Sale.findAll({ where: { store_id, sale_date: { [Op.gte]: cutoff } } });
    const trendMap = {};
    labels.forEach((l) => { trendMap[l] = 0; });
    salesInRange.forEach((s) => { const k = dayKey(s.sale_date); if (k in trendMap) trendMap[k] += Number(s.total_price); });
    const sales_trend = labels.map((l) => ({ date: l, revenue: Math.round(trendMap[l] * 100) / 100 }));

    const salesWithVariant = await Sale.findAll({
      where: { store_id, sale_date: { [Op.gte]: cutoff } },
      include: [{ model: ProductVariant, include: [Product] }],
    });
    const qtyMap = {}, nameMap = {};
    salesWithVariant.forEach((s) => {
      const pid = s.ProductVariant.product_id;
      qtyMap[pid] = (qtyMap[pid] || 0) + s.quantity;
      nameMap[pid] = s.ProductVariant.Product.product_name;
    });
    const top_selling_products = Object.entries(qtyMap)
      .map(([pid, qty]) => ({ product_name: nameMap[pid], quantity_sold: qty }))
      .sort((a, b) => b.quantity_sold - a.quantity_sold)
      .slice(0, 5);

    const current_stock_by_product = [...summary].sort((a, b) => b.total_quantity - a.total_quantity).slice(0, 8)
      .map((r) => ({ product_name: r.product_name, quantity: r.total_quantity }));

    const products_below_reorder = summary.filter((r) => r.status === 'low' || r.status === 'out');
    const stock_status = stockStatusCounts(summary);

    res.json({
      kpis: {
        current_store_stock, todays_sales_count: todaySales.length, todays_revenue,
        low_stock_products_count, pending_stock_requests, variants_needing_attention,
      },
      sales_trend, top_selling_products, current_stock_by_product, products_below_reorder,
      variant_alerts, stock_status, days_range: days,
    });
  } catch (error) {
    console.error('Store dashboard error:', error);
    res.status(500).json({ message: 'Something went wrong while building the dashboard.' });
  }
}

module.exports = { getAdminDashboard, getWarehouseDashboard, getStoreDashboard };