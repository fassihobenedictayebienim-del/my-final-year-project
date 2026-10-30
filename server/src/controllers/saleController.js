const Sale = require("../models/Sale");
const Product = require("../models/Product");
const Inventory = require("../models/Inventory");
const { sequelize } = require("../config/db");
const logActivity = require("../utils/activityLogger");

async function createSale(req, res) {
  const t = await sequelize.transaction();
  try {
    const store_id = req.user.store_id;
    const product_id = String(req.body.product_id || "").trim();
    const quantity = Number(req.body.quantity);
    if (!store_id)
      throw Object.assign(new Error("Your account is not linked to a store."), {
        status: 400,
      });
    if (!product_id || !Number.isInteger(quantity) || quantity <= 0)
      throw Object.assign(
        new Error(
          "product_id and a positive whole-number quantity are required.",
        ),
        { status: 400 },
      );
    const product = await Product.findByPk(product_id, { transaction: t });
    if (!product)
      throw Object.assign(new Error("Product not found."), { status: 404 });
    const inventoryRow = await Inventory.findOne({
      where: { product_id, store_id, warehouse_id: null },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!inventoryRow || inventoryRow.quantity < quantity)
      throw Object.assign(
        new Error("Insufficient stock at your store to record this sale."),
        { status: 400, available: inventoryRow?.quantity || 0 },
      );
    const total_price = Number(product.unit_price) * quantity;
    inventoryRow.quantity -= quantity;
    await inventoryRow.save({ transaction: t });
    const sale = await Sale.create(
      { store_id, product_id, quantity, total_price, sale_date: new Date() },
      { transaction: t },
    );
    await t.commit();
    await logActivity(
      req.user,
      "SALE_RECORDED",
      `Store ${store_id} sold ${quantity} unit(s) of "${product.product_name}" for GH₵ ${total_price.toFixed(2)}.`,
    );
    res
      .status(201)
      .json({
        message: "Sale recorded successfully.",
        sale,
        remaining_store_quantity: inventoryRow.quantity,
      });
  } catch (error) {
    await t.rollback();
    console.error("Create sale error:", error);
    res
      .status(error.status || 500)
      .json({
        message:
          error.message || "Something went wrong while recording the sale.",
        ...(error.available !== undefined
          ? { available: error.available }
          : {}),
      });
  }
}

async function listSales(req, res) {
  try {
    const where =
      req.user.role === "store_manager" ? { store_id: req.user.store_id } : {};
    res.json({
      sales: await Sale.findAll({
        where,
        include: [Product],
        order: [["sale_date", "DESC"]],
      }),
    });
  } catch (error) {
    console.error("List sales error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong while fetching sales." });
  }
}
module.exports = { createSale, listSales };
