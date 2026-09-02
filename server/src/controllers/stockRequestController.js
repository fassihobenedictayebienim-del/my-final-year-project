const StockRequest = require('../models/StockRequest');
const StockTransfer = require('../models/StockTransfer');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const { sequelize } = require('../config/db');

// POST /api/stock-requests — Store Manager only
async function createStockRequest(req, res) {
  try {
    const { product_id, quantity } = req.body;
    const store_id = req.user.store_id;

    if (!store_id) {
      return res.status(400).json({ message: 'Your account is not linked to a store.' });
    }
    if (!product_id || !quantity || quantity <= 0) {
      return res.status(400).json({ message: 'product_id and a positive quantity are required.' });
    }

    const product = await Product.findByPk(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const stockRequest = await StockRequest.create({
      store_id,
      product_id,
      quantity,
      status: 'pending',
    });

    res.status(201).json({ message: 'Stock request submitted.', stockRequest });
  } catch (error) {
    console.error('Create stock request error:', error);
    res.status(500).json({ message: 'Something went wrong while submitting the request.' });
  }
}

// GET /api/stock-requests
async function listStockRequests(req, res) {
  try {
    const where = {};
    if (req.user.role === 'store_manager') {
      where.store_id = req.user.store_id;
    }

    const requests = await StockRequest.findAll({
      where,
      include: [{ model: Product, attributes: ['product_id', 'product_name', 'size', 'color'] }],
      order: [['request_date', 'DESC']],
    });

    res.json({ requests });
  } catch (error) {
    console.error('List stock requests error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching requests.' });
  }
}

// PUT /api/stock-requests/:id/approve — Warehouse Manager only
async function approveAndDispatch(req, res) {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const warehouse_id = req.user.warehouse_id;
    const approved_by = req.user.user_id;

    const stockRequest = await StockRequest.findByPk(id, { transaction: t });
    if (!stockRequest) {
      await t.rollback();
      return res.status(404).json({ message: 'Stock request not found.' });
    }
    if (stockRequest.status !== 'pending') {
      await t.rollback();
      return res.status(409).json({ message: `This request has already been ${stockRequest.status}.` });
    }

    const inventoryRow = await Inventory.findOne({
      where: { product_id: stockRequest.product_id, warehouse_id },
      transaction: t,
    });
    if (!inventoryRow || inventoryRow.quantity < stockRequest.quantity) {
      await t.rollback();
      return res.status(400).json({
        message: 'Insufficient stock at the warehouse to fulfil this request.',
        available: inventoryRow ? inventoryRow.quantity : 0,
        requested: stockRequest.quantity,
      });
    }

    inventoryRow.quantity -= stockRequest.quantity;
    await inventoryRow.save({ transaction: t });

    const transfer = await StockTransfer.create({
      request_id: stockRequest.request_id,
      warehouse_id,
      store_id: stockRequest.store_id,
      approved_by,
      quantity_transferred: stockRequest.quantity,
      status: 'dispatched',
    }, { transaction: t });

    stockRequest.status = 'approved';
    await stockRequest.save({ transaction: t });

    await t.commit();

    res.json({
      message: 'Request approved and stock dispatched.',
      transfer,
      remaining_warehouse_quantity: inventoryRow.quantity,
    });
  } catch (error) {
    await t.rollback();
    console.error('Approve/dispatch error:', error);
    res.status(500).json({ message: 'Something went wrong while approving the request.' });
  }
}

// PUT /api/stock-requests/:id/reject — Warehouse Manager only
async function rejectRequest(req, res) {
  try {
    const stockRequest = await StockRequest.findByPk(req.params.id);
    if (!stockRequest) {
      return res.status(404).json({ message: 'Stock request not found.' });
    }
    if (stockRequest.status !== 'pending') {
      return res.status(409).json({ message: `This request has already been ${stockRequest.status}.` });
    }

    stockRequest.status = 'rejected';
    await stockRequest.save();

    res.json({ message: 'Request rejected.', stockRequest });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ message: 'Something went wrong while rejecting the request.' });
  }
}

// PUT /api/stock-requests/:id/confirm-receipt — Store Manager only
// Increases the store's inventory and marks the transfer received —
// the final step that closes the request → approve → dispatch → receive loop.
async function confirmReceipt(req, res) {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params; // this is the request_id
    const store_id = req.user.store_id;

    const stockRequest = await StockRequest.findByPk(id, { transaction: t });
    if (!stockRequest) {
      await t.rollback();
      return res.status(404).json({ message: 'Stock request not found.' });
    }
    if (stockRequest.store_id !== store_id) {
      await t.rollback();
      return res.status(403).json({ message: 'This request does not belong to your store.' });
    }
    if (stockRequest.status !== 'approved') {
      await t.rollback();
      return res.status(409).json({ message: `This request is not awaiting receipt (current status: ${stockRequest.status}).` });
    }

    const transfer = await StockTransfer.findOne({
      where: { request_id: id, status: 'dispatched' },
      transaction: t,
    });
    if (!transfer) {
      await t.rollback();
      return res.status(404).json({ message: 'No dispatched transfer found for this request.' });
    }

    // Increase (or create) the store's inventory row for this product
    const [inventoryRow] = await Inventory.findOrCreate({
      where: { product_id: stockRequest.product_id, store_id },
      defaults: { quantity: 0 },
      transaction: t,
    });
    inventoryRow.quantity += transfer.quantity_transferred;
    await inventoryRow.save({ transaction: t });

    // Mark the transfer received and the request fulfilled
    transfer.status = 'received';
    transfer.received_date = new Date();
    await transfer.save({ transaction: t });

    stockRequest.status = 'fulfilled';
    await stockRequest.save({ transaction: t });

    await t.commit();

    res.json({
      message: 'Stock receipt confirmed.',
      transfer,
      new_store_quantity: inventoryRow.quantity,
    });
  } catch (error) {
    await t.rollback();
    console.error('Confirm receipt error:', error);
    res.status(500).json({ message: 'Something went wrong while confirming receipt.' });
  }
}
module.exports = { createStockRequest, listStockRequests, approveAndDispatch, rejectRequest, confirmReceipt };