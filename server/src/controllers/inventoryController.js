const { Op } = require("sequelize");
const Inventory = require("../models/Inventory");
const Product = require("../models/Product");
const ProductLocationSetting = require("../models/ProductLocationSetting");
const {
  getLocationProductSummary,
} = require("../utils/inventorySummaryHelper");

async function listInventory(req, res) {
  try {
    const where = {};
    if (req.user.role === "warehouse_manager")
      where.warehouse_id = req.user.warehouse_id;
    else if (req.user.role === "store_manager")
      where.store_id = req.user.store_id;
    res.json({
      inventory: await Inventory.findAll({
        where,
        include: [Product],
        order: [["product_id", "ASC"]],
      }),
    });
  } catch (error) {
    console.error("List inventory error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong while fetching inventory." });
  }
}

async function getWarehouseStock(req, res) {
  try {
    res.json({
      inventory: await Inventory.findAll({
        where: { warehouse_id: { [Op.ne]: null } },
        include: [Product],
        order: [["product_id", "ASC"]],
      }),
    });
  } catch (error) {
    console.error("Warehouse stock error:", error);
    res
      .status(500)
      .json({
        message: "Something went wrong while fetching warehouse stock.",
      });
  }
}

async function getInventorySummary(req, res) {
  try {
    const locations = [];
    if (req.user.role === "warehouse_manager")
      locations.push({
        type: "warehouse",
        id: req.user.warehouse_id,
        label: "Warehouse",
      });
    else if (req.user.role === "store_manager")
      locations.push({ type: "store", id: req.user.store_id, label: "Store" });
    else {
      const Warehouse = require("../models/Warehouse");
      const Store = require("../models/Store");
      (await Warehouse.findAll()).forEach((w) =>
        locations.push({
          type: "warehouse",
          id: w.warehouse_id,
          label: w.name,
        }),
      );
      (await Store.findAll()).forEach((s) =>
        locations.push({ type: "store", id: s.store_id, label: s.name }),
      );
    }
    const summary = [];
    for (const loc of locations)
      summary.push(
        ...(await getLocationProductSummary(loc.type, loc.id)).map((row) => ({
          location_type: loc.type,
          location_id: loc.id,
          location_label: loc.label,
          ...row,
        })),
      );
    res.json({ summary });
  } catch (error) {
    console.error("Inventory summary error:", error);
    res
      .status(500)
      .json({
        message: "Something went wrong while building the inventory summary.",
      });
  }
}

async function lowStockAlerts(req, res) {
  try {
    const Warehouse = require("../models/Warehouse");
    const ids =
      req.user.role === "warehouse_manager"
        ? [req.user.warehouse_id]
        : (await Warehouse.findAll()).map((w) => w.warehouse_id);
    const low_stock = [];
    for (const warehouse_id of ids)
      low_stock.push(
        ...(await getLocationProductSummary("warehouse", warehouse_id))
          .filter((r) => r.status !== "ok")
          .map((r) => ({ ...r, warehouse_id, total: r.total_quantity })),
      );
    res.json({ low_stock });
  } catch (error) {
    console.error("Low stock alert error:", error);
    res
      .status(500)
      .json({
        message: "Something went wrong while checking low-stock levels.",
      });
  }
}

function settingWhere(req, product_id) {
  const where = { product_id };
  if (req.user.role === "warehouse_manager")
    where.warehouse_id = req.user.warehouse_id;
  else if (req.user.role === "store_manager")
    where.store_id = req.user.store_id;
  else return null;
  return where;
}

async function getReorderLevel(req, res) {
  try {
    const where = settingWhere(req, req.params.productId);
    if (!where)
      return res
        .status(400)
        .json({
          message: "This endpoint is for Warehouse or Store Managers only.",
        });
    const setting = await ProductLocationSetting.findOne({ where });
    res.json({ reorder_level: setting ? setting.reorder_level : 0 });
  } catch (error) {
    console.error("Get reorder level error:", error);
    res
      .status(500)
      .json({
        message: "Something went wrong while fetching the reorder level.",
      });
  }
}

async function setReorderLevel(req, res) {
  try {
    const reorder_level = Number(req.body.reorder_level);
    if (!Number.isInteger(reorder_level) || reorder_level < 0)
      return res
        .status(400)
        .json({
          message: "A whole-number reorder level of zero or more is required.",
        });
    const where = settingWhere(req, req.params.productId);
    if (!where)
      return res
        .status(400)
        .json({
          message: "This endpoint is for Warehouse or Store Managers only.",
        });
    const [setting] = await ProductLocationSetting.findOrCreate({
      where,
      defaults: { ...where, reorder_level },
    });
    setting.reorder_level = reorder_level;
    await setting.save();
    res.json({ message: "Reorder level updated.", setting });
  } catch (error) {
    console.error("Set reorder level error:", error);
    res
      .status(500)
      .json({
        message: "Something went wrong while updating the reorder level.",
      });
  }
}

module.exports = {
  listInventory,
  getWarehouseStock,
  getInventorySummary,
  lowStockAlerts,
  getReorderLevel,
  setReorderLevel,
};
