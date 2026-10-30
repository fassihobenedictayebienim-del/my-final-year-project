const StockRequest = require("../models/StockRequest");
const StockTransfer = require("../models/StockTransfer");
const Product = require("../models/Product");
const Inventory = require("../models/Inventory");
const { sequelize } = require("../config/db");
const logActivity = require("../utils/activityLogger");

function validQuantity(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}
async function requestWithProduct(id, options = {}) {
  return StockRequest.findByPk(id, { ...options, include: [Product] });
}

async function createStockRequest(req, res) {
  try {
    const store_id = req.user.store_id;
    const product_id = String(req.body.product_id || "").trim();
    const quantity = Number(req.body.quantity);
    if (!store_id)
      return res
        .status(400)
        .json({ message: "Your account is not linked to a store." });
    if (!product_id || !validQuantity(quantity))
      return res
        .status(400)
        .json({
          message:
            "product_id and a positive whole-number quantity are required.",
        });
    const product = await Product.findByPk(product_id);
    if (!product)
      return res.status(404).json({ message: "Product not found." });
    const stockRequest = await StockRequest.create({
      store_id,
      product_id,
      quantity,
      status: "pending",
    });
    await logActivity(
      req.user,
      "STOCK_REQUEST_CREATED",
      `Store ${store_id} requested ${quantity} unit(s) of "${product.product_name}".`,
    );
    res.status(201).json({ message: "Stock request submitted.", stockRequest });
  } catch (error) {
    console.error("Create stock request error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong while submitting the request." });
  }
}

async function listStockRequests(req, res) {
  try {
    const where =
      req.user.role === "store_manager" ? { store_id: req.user.store_id } : {};
    res.json({
      requests: await StockRequest.findAll({
        where,
        include: [Product],
        order: [["request_date", "DESC"]],
      }),
    });
  } catch (error) {
    console.error("List stock requests error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong while fetching requests." });
  }
}

async function approveAndDispatch(req, res) {
  const t = await sequelize.transaction();
  try {
    const warehouse_id = req.user.warehouse_id;
    if (!warehouse_id)
      throw Object.assign(
        new Error("Your account is not linked to a warehouse."),
        { status: 400 },
      );
    const stockRequest = await requestWithProduct(req.params.id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!stockRequest)
      throw Object.assign(new Error("Stock request not found."), {
        status: 404,
      });
    if (stockRequest.status !== "pending")
      throw Object.assign(
        new Error(`This request has already been ${stockRequest.status}.`),
        { status: 409 },
      );
    const inventoryRow = await Inventory.findOne({
      where: {
        product_id: stockRequest.product_id,
        warehouse_id,
        store_id: null,
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!inventoryRow || inventoryRow.quantity < stockRequest.quantity)
      throw Object.assign(
        new Error(
          "Insufficient stock at the warehouse to fulfil this request.",
        ),
        { status: 400, available: inventoryRow?.quantity || 0 },
      );
    inventoryRow.quantity -= stockRequest.quantity;
    await inventoryRow.save({ transaction: t });
    const transfer = await StockTransfer.create(
      {
        request_id: stockRequest.request_id,
        product_id: stockRequest.product_id,
        warehouse_id,
        store_id: stockRequest.store_id,
        approved_by: req.user.user_id,
        quantity_transferred: stockRequest.quantity,
        status: "dispatched",
      },
      { transaction: t },
    );
    stockRequest.status = "approved";
    await stockRequest.save({ transaction: t });
    await t.commit();
    await logActivity(
      req.user,
      "REQUEST_APPROVED",
      `Request #${stockRequest.request_id} approved and dispatched — ${stockRequest.quantity} unit(s) of ${stockRequest.Product.product_name} to Store ${stockRequest.store_id}.`,
    );
    res.json({
      message: "Request approved and stock dispatched.",
      transfer,
      remaining_warehouse_quantity: inventoryRow.quantity,
    });
  } catch (error) {
    await t.rollback();
    console.error("Approve/dispatch error:", error);
    res
      .status(error.status || 500)
      .json({
        message:
          error.message || "Something went wrong while approving the request.",
        ...(error.available !== undefined
          ? { available: error.available }
          : {}),
      });
  }
}

async function rejectRequest(req, res) {
  try {
    const request = await StockRequest.findByPk(req.params.id);
    if (!request)
      return res.status(404).json({ message: "Stock request not found." });
    if (request.status !== "pending")
      return res
        .status(409)
        .json({ message: `This request has already been ${request.status}.` });
    request.status = "rejected";
    await request.save();
    await logActivity(
      req.user,
      "REQUEST_REJECTED",
      `Request #${request.request_id} rejected.`,
    );
    res.json({ message: "Request rejected.", stockRequest: request });
  } catch (error) {
    console.error("Reject request error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong while rejecting the request." });
  }
}

async function cancelStockRequest(req, res) {
  try {
    const store_id = req.user.store_id;
    const request = await requestWithProduct(req.params.id);
    if (!request)
      return res.status(404).json({ message: "Stock request not found." });
    if (request.store_id !== store_id)
      return res
        .status(403)
        .json({
          message: "You can only cancel requests made by your own store.",
        });
    if (request.status !== "pending")
      return res
        .status(409)
        .json({
          message: `This request cannot be cancelled because it is already ${request.status}.`,
        });
    request.status = "cancelled";
    await request.save();
    await logActivity(
      req.user,
      "REQUEST_CANCELLED",
      `Request #${request.request_id} cancelled — ${request.quantity} unit(s) of ${request.Product.product_name}.`,
    );
    res.json({
      message: "Stock request cancelled successfully.",
      stockRequest: request,
    });
  } catch (error) {
    console.error("Cancel stock request error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong while cancelling the request." });
  }
}

async function confirmReceipt(req, res) {
  const t = await sequelize.transaction();
  try {
    const store_id = req.user.store_id;
    const request = await requestWithProduct(req.params.id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!request)
      throw Object.assign(new Error("Stock request not found."), {
        status: 404,
      });
    if (request.store_id !== store_id)
      throw Object.assign(
        new Error("This request does not belong to your store."),
        { status: 403 },
      );
    if (request.status !== "approved")
      throw Object.assign(
        new Error(
          `This request is not awaiting receipt (current status: ${request.status}).`,
        ),
        { status: 409 },
      );
    const transfer = await StockTransfer.findOne({
      where: { request_id: request.request_id, status: "dispatched" },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!transfer)
      throw Object.assign(
        new Error("No dispatched transfer found for this request."),
        { status: 404 },
      );
    const [inventoryRow] = await Inventory.findOrCreate({
      where: { product_id: request.product_id, store_id, warehouse_id: null },
      defaults: {
        product_id: request.product_id,
        store_id,
        warehouse_id: null,
        quantity: 0,
      },
      transaction: t,
    });
    inventoryRow.quantity += transfer.quantity_transferred;
    await inventoryRow.save({ transaction: t });
    transfer.status = "received";
    transfer.received_date = new Date();
    await transfer.save({ transaction: t });
    request.status = "fulfilled";
    await request.save({ transaction: t });
    await t.commit();
    await logActivity(
      req.user,
      "RECEIPT_CONFIRMED",
      `Store ${store_id} confirmed receipt of ${transfer.quantity_transferred} unit(s) of ${request.Product.product_name}.`,
    );
    res.json({
      message: "Stock receipt confirmed.",
      transfer,
      new_store_quantity: inventoryRow.quantity,
    });
  } catch (error) {
    await t.rollback();
    console.error("Confirm receipt error:", error);
    res
      .status(error.status || 500)
      .json({
        message:
          error.message || "Something went wrong while confirming receipt.",
      });
  }
}

module.exports = {
  createStockRequest,
  listStockRequests,
  approveAndDispatch,
  rejectRequest,
  cancelStockRequest,
  confirmReceipt,
};
