const { Op } = require("sequelize");
const Shipment = require("../models/Shipment");
const ShipmentBatch = require("../models/ShipmentBatch");
const Inventory = require("../models/Inventory");
const Product = require("../models/Product");
const ProductLocationSetting = require("../models/ProductLocationSetting");
const { sequelize } = require("../config/db");
const logActivity = require("../utils/activityLogger");

function requestError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}
function positiveInteger(value, field) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw requestError(`${field} must be a positive whole number.`);
  return number;
}
function nonNegativeInteger(value, field) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) throw requestError(`${field} must be a whole number of zero or more.`);
  return number;
}
function receivedDate(value) {
  if (!value) return new Date();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw requestError("date_received must be a valid date.");
  return date;
}
async function addToWarehouseInventory(product_id, warehouse_id, quantity, transaction) {
  const [row] = await Inventory.findOrCreate({
    where: { product_id, warehouse_id, store_id: null },
    defaults: { product_id, warehouse_id, store_id: null, quantity: 0 },
    transaction,
  });
  row.quantity += quantity;
  await row.save({ transaction });
  return row;
}
function cleanLine(line, index) {
  const type = line?.type === "new" ? "new" : line?.type === "existing" ? "existing" : null;
  if (!type) throw requestError(`items[${index}].type must be existing or new.`);
  const product_id = String(line?.product_id || "").trim();
  if (!product_id) throw requestError(`items[${index}].product_id is required.`);
  const cleaned = { type, product_id, quantity: positiveInteger(line?.quantity, `items[${index}].quantity`) };
  if (type === "new") {
    cleaned.product_name = String(line?.product_name || "").trim();
    cleaned.unit_price = Number(line?.unit_price);
    cleaned.reorder_level = nonNegativeInteger(line?.reorder_level, `items[${index}].reorder_level`);
    if (!cleaned.product_name || !Number.isFinite(cleaned.unit_price) || cleaned.unit_price < 0)
      throw requestError(`New product ${product_id} requires a name and non-negative price.`);
  }
  return cleaned;
}

// ShipmentBatch only groups lines internally. Its identifier is never returned
// or rendered as a shipment reference.
async function createBatchShipment(req, res) {
  try {
    const warehouse_id = req.user.warehouse_id;
    if (!warehouse_id) throw requestError("Your account is not linked to a warehouse.");
    const date_received = receivedDate(req.body.date_received);
    if (!Array.isArray(req.body.items) || !req.body.items.length) throw requestError("Add at least one product line.");
    const items = req.body.items.map(cleanLine);
    if (new Set(items.map((item) => item.product_id)).size !== items.length)
      throw requestError("Each product can appear only once in a shipment.");
    const inventory_updates = await sequelize.transaction(async (transaction) => {
      const found = await Product.findAll({ where: { product_id: items.map((item) => item.product_id) }, transaction });
      const products = new Map(found.map((product) => [product.product_id, product]));
      for (const item of items) {
        const existing = products.get(item.product_id);
        if (item.type === "existing") {
          if (!existing) throw requestError(`Product ${item.product_id} was not found.`, 404);
          continue;
        }
        if (existing) throw requestError(`A product with ID "${item.product_id}" already exists.`, 409);
        const product = await Product.create({
          product_id: item.product_id,
          product_name: item.product_name,
          unit_price: item.unit_price,
        }, { transaction });
        products.set(product.product_id, product);
        await ProductLocationSetting.create({ product_id: product.product_id, warehouse_id, reorder_level: item.reorder_level }, { transaction });
      }
      const batch = await ShipmentBatch.create({ warehouse_id, date_received }, { transaction });
      const updates = [];
      for (const item of items) {
        const shipment = await Shipment.create({
          shipment_batch_id: batch.shipment_batch_id,
          product_id: item.product_id,
          warehouse_id,
          quantity: item.quantity,
          date_received,
        }, { transaction });
        const inventory = await addToWarehouseInventory(item.product_id, warehouse_id, item.quantity, transaction);
        updates.push({
          shipment_id: shipment.shipment_id,
          product_id: item.product_id,
          product_name: products.get(item.product_id).product_name,
          quantity_received: item.quantity,
          new_warehouse_quantity: inventory.quantity,
          is_new_product: item.type === "new",
        });
      }
      return updates;
    });
    await logActivity(req.user, "SHIPMENT_RECEIVED", `Received ${inventory_updates.length} product line item(s) into warehouse stock.`);
    res.status(201).json({ message: "Shipment received and inventory updated.", inventory_updates });
  } catch (error) {
    console.error("Receive shipment error:", error);
    res.status(error.status || 500).json({ message: error.status ? error.message : "Something went wrong while receiving the shipment." });
  }
}

async function listShipments(req, res) {
  try {
    const where = req.user.role === "warehouse_manager" ? { warehouse_id: req.user.warehouse_id } : {};
    const { start_date, end_date } = req.query;
    if (start_date || end_date) {
      where.date_received = {};
      if (start_date) where.date_received[Op.gte] = new Date(`${start_date}T00:00:00`);
      if (end_date) where.date_received[Op.lte] = new Date(`${end_date}T23:59:59.999`);
    }
    const shipments = await Shipment.findAll({
      where,
      include: [{ model: Product }],
      order: [["date_received", "DESC"], ["shipment_id", "DESC"]],
    });
    const historyWhere = req.user.role === "warehouse_manager" ? { warehouse_id: req.user.warehouse_id } : {};
    const history = await Shipment.findAll({
      where: historyWhere,
      attributes: ["shipment_id", "product_id"],
      order: [["date_received", "ASC"], ["shipment_id", "ASC"]],
    });
    const firstProducts = new Set();
    const firstReceipt = new Set();
    for (const row of history) {
      if (!firstProducts.has(row.product_id)) {
        firstProducts.add(row.product_id);
        firstReceipt.add(`${row.product_id}:${row.shipment_id}`);
      }
    }
    res.json({
      shipments: shipments.map((shipment) => ({
        shipment_id: shipment.shipment_id,
        date_received: shipment.date_received,
        quantity: shipment.quantity,
        product_id: shipment.product_id,
        product_name: shipment.Product?.product_name || "Unknown product",
        is_new_product: firstReceipt.has(`${shipment.product_id}:${shipment.shipment_id}`),
      })),
    });
  } catch (error) {
    console.error("List shipments error:", error);
    res.status(500).json({ message: "Something went wrong while fetching shipments." });
  }
}

module.exports = { createBatchShipment, listShipments };
