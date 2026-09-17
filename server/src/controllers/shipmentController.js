const Shipment = require('../models/Shipment');
const ShipmentBatch = require('../models/ShipmentBatch');
const Inventory = require('../models/Inventory');
const ProductVariant = require('../models/ProductVariant');
const Product = require('../models/Product');
const { sequelize } = require('../config/db');
const logActivity = require('../utils/activityLogger');

function requestError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function positiveInteger(value, fieldName) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw requestError(`${fieldName} must be a positive whole number.`);
  }
  return number;
}

function receivedDate(value) {
  if (!value) return new Date();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw requestError('date_received must be a valid date.');
  }
  return date;
}

function variantKey(productId, color, size) {
  return `${productId}::${color.trim().toLowerCase()}::${size.trim().toLowerCase()}`;
}

async function addToWarehouseInventory(variantId, warehouseId, quantity, transaction) {
  const [inventoryRow] = await Inventory.findOrCreate({
    where: { variant_id: variantId, warehouse_id: warehouseId, store_id: null },
    defaults: { variant_id: variantId, warehouse_id: warehouseId, store_id: null, quantity: 0 },
    transaction,
  });

  inventoryRow.quantity += quantity;
  await inventoryRow.save({ transaction });
  return inventoryRow;
}

// POST /api/shipments
// body: { variant_id, quantity, date_received }
async function createShipment(req, res) {
  try {
    const warehouseId = req.user.warehouse_id;
    if (!warehouseId) throw requestError('Your account is not linked to a warehouse.');

    const variantId = positiveInteger(req.body.variant_id, 'variant_id');
    const quantity = positiveInteger(req.body.quantity, 'quantity');
    const dateReceived = receivedDate(req.body.date_received);

    const result = await sequelize.transaction(async (transaction) => {
      const variant = await ProductVariant.findByPk(variantId, { include: [Product], transaction });
      if (!variant) throw requestError('Variant not found.', 404);

      const shipment = await Shipment.create({
        variant_id: variantId,
        warehouse_id: warehouseId,
        quantity,
        date_received: dateReceived,
      }, { transaction });

      const inventoryRow = await addToWarehouseInventory(variantId, warehouseId, quantity, transaction);
      return { shipment, variant, inventoryRow };
    });

    try {
      await logActivity(req.user, 'SHIPMENT_RECORDED', `Shipment of ${quantity} unit(s) of "${result.variant.Product.product_name}" (${result.variant.color}/${result.variant.size}) recorded.`);
    } catch (logError) {
      console.error('Shipment activity logging failed:', logError.message);
    }

    return res.status(201).json({
      message: 'Shipment recorded and inventory updated.',
      shipment: result.shipment,
      new_warehouse_quantity: result.inventoryRow.quantity,
    });
  } catch (error) {
    console.error('Create shipment error:', error);
    return res.status(error.status || 500).json({
      message: error.status ? error.message : 'Something went wrong while recording the shipment.',
    });
  }
}

// POST /api/shipments/batch
// body: {
//   shipment_reference,
//   date_received,
//   items: [
//     { variant_id, quantity },
//     { product_id, color, size, quantity }
//   ]
// }
// A line without variant_id creates a new colour/size variant under product_id.
async function createBatchShipment(req, res) {
  try {
    const warehouseId = req.user.warehouse_id;
    const shipmentReference = String(req.body.shipment_reference || '').trim();
    const dateReceived = receivedDate(req.body.date_received);
    const items = req.body.items;

    if (!warehouseId) throw requestError('Your account is not linked to a warehouse.');
    if (!shipmentReference) throw requestError('shipment_reference is required.');
    if (shipmentReference.length > 50) throw requestError('shipment_reference cannot exceed 50 characters.');
    if (!Array.isArray(items) || items.length === 0) throw requestError('At least one shipment item is required.');

    const existingItems = [];
    const newVariantItems = [];
    const usedKeys = new Set();

    items.forEach((item, index) => {
      const quantity = positiveInteger(item?.quantity, `items[${index}].quantity`);

      if (item?.variant_id) {
        const variantId = positiveInteger(item.variant_id, `items[${index}].variant_id`);
        const key = `variant:${variantId}`;
        if (usedKeys.has(key)) throw requestError('Each variant can appear only once in a batch.');
        usedKeys.add(key);
        existingItems.push({ variant_id: variantId, quantity });
        return;
      }

      const productId = String(item?.product_id || '').trim();
      const color = String(item?.color || '').trim();
      const size = String(item?.size || '').trim();

      if (!productId || !color || !size) {
        throw requestError(`items[${index}] needs an existing variant_id or product_id, color, and size.`);
      }

      const key = `new:${variantKey(productId, color, size)}`;
      if (usedKeys.has(key)) throw requestError(`Duplicate new variant: ${color} / ${size}.`);
      usedKeys.add(key);
      newVariantItems.push({ product_id: productId, color, size, quantity });
    });

    const result = await sequelize.transaction(async (transaction) => {
      const existingVariantIds = existingItems.map((item) => item.variant_id);
      const existingVariants = existingVariantIds.length
        ? await ProductVariant.findAll({ where: { variant_id: existingVariantIds }, include: [Product], transaction })
        : [];

      if (existingVariants.length !== existingVariantIds.length) {
        const foundIds = new Set(existingVariants.map((variant) => variant.variant_id));
        const missingIds = existingVariantIds.filter((id) => !foundIds.has(id));
        throw requestError(`One or more variants were not found: ${missingIds.join(', ')}.`, 404);
      }

      const productIds = [...new Set(newVariantItems.map((item) => item.product_id))];
      const products = productIds.length
        ? await Product.findAll({ where: { product_id: productIds }, transaction })
        : [];

      if (products.length !== productIds.length) {
        const foundIds = new Set(products.map((product) => product.product_id));
        const missingIds = productIds.filter((id) => !foundIds.has(id));
        throw requestError(`One or more products were not found: ${missingIds.join(', ')}.`, 404);
      }

      const variantsById = new Map(existingVariants.map((variant) => [variant.variant_id, variant]));
      const productsById = new Map(products.map((product) => [product.product_id, product]));

      for (const item of newVariantItems) {
        const duplicate = await ProductVariant.findOne({
          where: { product_id: item.product_id, color: item.color, size: item.size },
          transaction,
        });
        if (duplicate) {
          throw requestError(`Variant ${item.color} / ${item.size} already exists for product ${item.product_id}. Select it from the table instead.`);
        }
      }

      const batch = await ShipmentBatch.create({
        warehouse_id: warehouseId,
        shipment_reference: shipmentReference,
        date_received: dateReceived,
      }, { transaction });

      const shipmentLines = [...existingItems];

      for (const item of newVariantItems) {
        const variant = await ProductVariant.create({
          product_id: item.product_id,
          color: item.color,
          size: item.size,
        }, { transaction });
        variant.Product = productsById.get(item.product_id);
        variantsById.set(variant.variant_id, variant);
        shipmentLines.push({ variant_id: variant.variant_id, quantity: item.quantity });
      }

      const shipments = [];
      const inventoryUpdates = [];

      for (const line of shipmentLines) {
        const shipment = await Shipment.create({
          shipment_batch_id: batch.shipment_batch_id,
          variant_id: line.variant_id,
          warehouse_id: warehouseId,
          quantity: line.quantity,
          date_received: dateReceived,
        }, { transaction });

        const inventoryRow = await addToWarehouseInventory(line.variant_id, warehouseId, line.quantity, transaction);
        const variant = variantsById.get(line.variant_id);
        shipments.push(shipment);
        inventoryUpdates.push({
          variant_id: line.variant_id,
          product_name: variant.Product.product_name,
          color: variant.color,
          size: variant.size,
          quantity_received: line.quantity,
          new_warehouse_quantity: inventoryRow.quantity,
        });
      }

      return { batch, shipments, inventoryUpdates };
    });

    try {
      await logActivity(req.user, 'SHIPMENT_BATCH_RECORDED', `Shipment batch "${shipmentReference}" recorded with ${result.shipments.length} variant line item(s).`);
    } catch (logError) {
      console.error('Shipment batch activity logging failed:', logError.message);
    }

    return res.status(201).json({
      message: 'Shipment batch recorded and inventory updated.',
      batch: result.batch,
      shipments: result.shipments,
      inventory_updates: result.inventoryUpdates,
    });
  } catch (error) {
    console.error('Create batch shipment error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'That shipment reference or variant already exists.' });
    }
    return res.status(error.status || 500).json({
      message: error.status ? error.message : 'Something went wrong while recording the shipment batch.',
    });
  }
}

// GET /api/shipments
async function listShipments(req, res) {
  try {
    const where = {};
    if (req.user.role === 'warehouse_manager') {
      if (!req.user.warehouse_id) return res.status(400).json({ message: 'Your account is not linked to a warehouse.' });
      where.warehouse_id = req.user.warehouse_id;
    }

    const shipments = await Shipment.findAll({
      where,
      include: [
        { model: ProductVariant, include: [Product] },
        { model: ShipmentBatch, required: false },
      ],
      order: [['date_received', 'DESC'], ['shipment_id', 'DESC']],
    });
    return res.json({ shipments });
  } catch (error) {
    console.error('List shipments error:', error);
    return res.status(500).json({ message: 'Something went wrong while fetching shipments.' });
  }
}

module.exports = { createShipment, createBatchShipment, listShipments };
