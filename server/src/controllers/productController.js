const Product = require("../models/Product");
const ProductLocationSetting = require("../models/ProductLocationSetting");
const Inventory = require("../models/Inventory");
const Shipment = require("../models/Shipment");
const StockRequest = require("../models/StockRequest");
const Sale = require("../models/Sale");
const { sequelize } = require("../config/db");
const logActivity = require("../utils/activityLogger");

async function listProducts(req, res) {
  try {
    res.json({
      products: await Product.findAll({ order: [["product_name", "ASC"]] }),
    });
  } catch (error) {
    console.error("List products error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong while fetching products." });
  }
}
async function getProduct(req, res) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product)
      return res.status(404).json({ message: "Product not found." });
    res.json({ product });
  } catch (error) {
    console.error("Get product error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong while fetching the product." });
  }
}

async function createProduct(req, res) {
  const t = await sequelize.transaction();
  try {
    const product_id = String(req.body.product_id || "").trim();
    const product_name = String(req.body.product_name || "").trim();
    const description = String(req.body.description || "").trim() || null;
    const unit_price = Number(req.body.unit_price);
    const reorder_level = Number(req.body.reorder_level || 0);
    const initial_quantity = Number(req.body.initial_quantity || 0);
    if (
      !product_id ||
      !product_name ||
      !Number.isFinite(unit_price) ||
      unit_price < 0
    )
      throw Object.assign(
        new Error(
          "product_id, product_name, and a non-negative unit_price are required.",
        ),
        { status: 400 },
      );
    if (
      !Number.isInteger(reorder_level) ||
      reorder_level < 0 ||
      !Number.isInteger(initial_quantity) ||
      initial_quantity < 0
    )
      throw Object.assign(
        new Error(
          "Reorder level and initial quantity must be whole numbers of zero or more.",
        ),
        { status: 400 },
      );
    if (await Product.findByPk(product_id, { transaction: t }))
      throw Object.assign(
        new Error(`A product with ID "${product_id}" already exists.`),
        { status: 409 },
      );
    const product = await Product.create(
      { product_id, product_name, description, unit_price },
      { transaction: t },
    );
    const warehouse_id = req.user.warehouse_id;
    if (warehouse_id) {
      await ProductLocationSetting.create(
        { product_id, warehouse_id, reorder_level },
        { transaction: t },
      );
      if (initial_quantity > 0) {
        await Shipment.create(
          {
            product_id,
            warehouse_id,
            quantity: initial_quantity,
            date_received: new Date(),
          },
          { transaction: t },
        );
        await Inventory.create(
          {
            product_id,
            warehouse_id,
            store_id: null,
            quantity: initial_quantity,
          },
          { transaction: t },
        );
      }
    }
    await t.commit();
    await logActivity(
      req.user,
      "PRODUCT_CREATED",
      `Product "${product_name}" (${product_id}) created${initial_quantity ? ` with ${initial_quantity} unit(s) received` : ""}.`,
    );
    res.status(201).json({ message: "Product created successfully.", product });
  } catch (error) {
    await t.rollback();
    console.error("Create product error:", error);
    res
      .status(error.status || 500)
      .json({
        message:
          error.message || "Something went wrong while creating the product.",
      });
  }
}

async function receiveExistingProduct(req, res) {
  const t = await sequelize.transaction();
  try {
    const product = await Product.findByPk(req.params.id, { transaction: t });
    const quantity = Number(req.body.quantity);
    if (!product)
      throw Object.assign(new Error("Product not found."), { status: 404 });
    if (!Number.isInteger(quantity) || quantity <= 0)
      throw Object.assign(
        new Error("Quantity must be a positive whole number."),
        { status: 400 },
      );
    if (!req.user.warehouse_id)
      throw Object.assign(
        new Error("Your account is not linked to a warehouse."),
        { status: 400 },
      );
    await Shipment.create(
      {
        product_id: product.product_id,
        warehouse_id: req.user.warehouse_id,
        quantity,
        date_received: new Date(),
      },
      { transaction: t },
    );
    const [inventory] = await Inventory.findOrCreate({
      where: {
        product_id: product.product_id,
        warehouse_id: req.user.warehouse_id,
        store_id: null,
      },
      defaults: {
        product_id: product.product_id,
        warehouse_id: req.user.warehouse_id,
        store_id: null,
        quantity: 0,
      },
      transaction: t,
    });
    inventory.quantity += quantity;
    await inventory.save({ transaction: t });
    await t.commit();
    await logActivity(
      req.user,
      "STOCK_RECEIVED",
      `${quantity} unit(s) of existing product "${product.product_name}" (${product.product_id}) received into warehouse stock.`,
    );
    res
      .status(201)
      .json({
        message: "Stock received and inventory updated.",
        quantity: inventory.quantity,
      });
  } catch (error) {
    await t.rollback();
    res
      .status(error.status || 500)
      .json({ message: error.message || "Unable to receive stock." });
  }
}

async function updateProduct(req, res) {
  const t = await sequelize.transaction();
  try {
    const product = await Product.findByPk(req.params.id, { transaction: t });
    if (!product)
      throw Object.assign(new Error("Product not found."), { status: 404 });
    const { product_name, description, unit_price, reorder_level } = req.body;
    if (product_name !== undefined && !String(product_name).trim())
      throw Object.assign(new Error("Product name cannot be empty."), {
        status: 400,
      });
    if (
      unit_price !== undefined &&
      (!Number.isFinite(Number(unit_price)) || Number(unit_price) < 0)
    )
      throw Object.assign(new Error("Unit price must be zero or more."), {
        status: 400,
      });
    if (
      reorder_level !== undefined &&
      (!Number.isInteger(Number(reorder_level)) || Number(reorder_level) < 0)
    )
      throw Object.assign(
        new Error("Reorder level must be a whole number of zero or more."),
        { status: 400 },
      );
    await product.update(
      {
        product_name:
          product_name === undefined
            ? product.product_name
            : String(product_name).trim(),
        description:
          description === undefined
            ? product.description
            : description == null
              ? null
              : String(description).trim() || null,
        unit_price:
          unit_price === undefined ? product.unit_price : Number(unit_price),
      },
      { transaction: t },
    );
    if (reorder_level !== undefined && req.user.warehouse_id) {
      const where = {
        product_id: product.product_id,
        warehouse_id: req.user.warehouse_id,
      };
      const [setting] = await ProductLocationSetting.findOrCreate({
        where,
        defaults: { ...where, reorder_level: Number(reorder_level) },
        transaction: t,
      });
      setting.reorder_level = Number(reorder_level);
      await setting.save({ transaction: t });
    }
    await t.commit();
    await logActivity(
      req.user,
      "PRODUCT_UPDATED",
      `Product "${product.product_name}" (${product.product_id}) updated.`,
    );
    res.json({ message: "Product updated successfully.", product });
  } catch (error) {
    await t.rollback();
    console.error("Update product error:", error);
    res
      .status(error.status || 500)
      .json({
        message:
          error.message || "Something went wrong while updating the product.",
      });
  }
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  receiveExistingProduct,
  updateProduct,
};
