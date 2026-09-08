const StockRequest = require('../models/StockRequest');
const StockTransfer = require('../models/StockTransfer');
const ProductVariant = require('../models/ProductVariant');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const { sequelize } = require('../config/db');
const logActivity = require('../utils/activityLogger');

async function createStockRequest(req, res) {
  try {
    const { variant_id, quantity } = req.body;
    const store_id = req.user.store_id;

    if (!store_id) return res.status(400).json({ message: 'Your account is not linked to a store.' });
    if (!variant_id || !quantity || quantity <= 0) {
      return res.status(400).json({ message: 'variant_id and a positive quantity are required.' });
    }

    const variant = await ProductVariant.findByPk(variant_id, { include: [Product] });
    if (!variant) return res.status(404).json({ message: 'Variant not found.' });

    const stockRequest = await StockRequest.create({ store_id, variant_id, quantity, status: 'pending' });

    await logActivity(req.user, 'STOCK_REQUEST_CREATED', `Store ${store_id} requested ${quantity} unit(s) of "${variant.Product.product_name}" (${variant.color}/${variant.size}).`);

    res.status(201).json({ message: 'Stock request submitted.', stockRequest });
  } catch (error) {
    console.error('Create stock request error:', error);
    res.status(500).json({ message: 'Something went wrong while submitting the request.' });
  }
}

async function listStockRequests(req, res) {
  try {
    const where = {};
    if (req.user.role === 'store_manager') where.store_id = req.user.store_id;

    const requests = await StockRequest.findAll({
      where,
      include: [{ model: ProductVariant, include: [Product] }],
      order: [['request_date', 'DESC']],
    });
    res.json({ requests });
  } catch (error) {
    console.error('List stock requests error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching requests.' });
  }
}

async function approveAndDispatch(req, res) {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const warehouse_id = req.user.warehouse_id;
    const approved_by = req.user.user_id;

    const stockRequest = await StockRequest.findByPk(id, { include: [{ model: ProductVariant, include: [Product] }], transaction: t });
    if (!stockRequest) { await t.rollback(); return res.status(404).json({ message: 'Stock request not found.' }); }
    if (stockRequest.status !== 'pending') {
      await t.rollback();
      return res.status(409).json({ message: `This request has already been ${stockRequest.status}.` });
    }

    const inventoryRow = await Inventory.findOne({ where: { variant_id: stockRequest.variant_id, warehouse_id }, transaction: t });
    if (!inventoryRow || inventoryRow.quantity < stockRequest.quantity) {
      await t.rollback();
      return res.status(400).json({
        message: 'Insufficient stock at the warehouse to fulfil this request.',
        available: inventoryRow ? inventoryRow.quantity : 0, requested: stockRequest.quantity,
      });
    }

    inventoryRow.quantity -= stockRequest.quantity;
    await inventoryRow.save({ transaction: t });

    const transfer = await StockTransfer.create({
      request_id: stockRequest.request_id, warehouse_id, store_id: stockRequest.store_id,
      approved_by, quantity_transferred: stockRequest.quantity, status: 'dispatched',
    }, { transaction: t });

    stockRequest.status = 'approved';
    await stockRequest.save({ transaction: t });

    await t.commit();

    await logActivity(req.user, 'REQUEST_APPROVED', `Request #${id} approved and dispatched — ${stockRequest.quantity} unit(s) of ${stockRequest.ProductVariant.Product.product_name} (${stockRequest.ProductVariant.color}/${stockRequest.ProductVariant.size}) to Store ${stockRequest.store_id}.`);

    res.json({ message: 'Request approved and stock dispatched.', transfer, remaining_warehouse_quantity: inventoryRow.quantity });
  } catch (error) {
    await t.rollback();
    console.error('Approve/dispatch error:', error);
    res.status(500).json({ message: 'Something went wrong while approving the request.' });
  }
}

async function rejectRequest(req, res) {
  try {
    const stockRequest = await StockRequest.findByPk(req.params.id);
    if (!stockRequest) return res.status(404).json({ message: 'Stock request not found.' });
    if (stockRequest.status !== 'pending') {
      return res.status(409).json({ message: `This request has already been ${stockRequest.status}.` });
    }

    stockRequest.status = 'rejected';
    await stockRequest.save();

    await logActivity(req.user, 'REQUEST_REJECTED', `Request #${req.params.id} rejected.`);

    res.json({ message: 'Request rejected.', stockRequest });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ message: 'Something went wrong while rejecting the request.' });
  }
}

async function confirmReceipt(req, res) {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const store_id = req.user.store_id;

    const stockRequest = await StockRequest.findByPk(id, { include: [{ model: ProductVariant, include: [Product] }], transaction: t });
    if (!stockRequest) { await t.rollback(); return res.status(404).json({ message: 'Stock request not found.' }); }
    if (stockRequest.store_id !== store_id) {
      await t.rollback();
      return res.status(403).json({ message: 'This request does not belong to your store.' });
    }
    if (stockRequest.status !== 'approved') {
      await t.rollback();
      return res.status(409).json({ message: `This request is not awaiting receipt (current status: ${stockRequest.status}).` });
    }

    const transfer = await StockTransfer.findOne({ where: { request_id: id, status: 'dispatched' }, transaction: t });
    if (!transfer) { await t.rollback(); return res.status(404).json({ message: 'No dispatched transfer found for this request.' }); }

    const [inventoryRow] = await Inventory.findOrCreate({
      where: { variant_id: stockRequest.variant_id, store_id }, defaults: { quantity: 0 }, transaction: t,
    });
    inventoryRow.quantity += transfer.quantity_transferred;
    await inventoryRow.save({ transaction: t });

    transfer.status = 'received';
    transfer.received_date = new Date();
    await transfer.save({ transaction: t });

    stockRequest.status = 'fulfilled';
    await stockRequest.save({ transaction: t });

    await t.commit();

    await logActivity(req.user, 'RECEIPT_CONFIRMED', `Store ${store_id} confirmed receipt of ${transfer.quantity_transferred} unit(s) of ${stockRequest.ProductVariant.Product.product_name} (${stockRequest.ProductVariant.color}/${stockRequest.ProductVariant.size}).`);

    res.json({ message: 'Stock receipt confirmed.', transfer, new_store_quantity: inventoryRow.quantity });
  } catch (error) {
    await t.rollback();
    console.error('Confirm receipt error:', error);
    res.status(500).json({ message: 'Something went wrong while confirming receipt.' });
  }
}

module.exports = { createStockRequest, listStockRequests, approveAndDispatch, rejectRequest, confirmReceipt };