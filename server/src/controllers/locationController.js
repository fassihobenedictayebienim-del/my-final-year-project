const Warehouse = require("../models/Warehouse");
const Store = require("../models/Store");
const logActivity = require("../utils/activityLogger");
const Inventory = require("../models/Inventory");
const StockRequest = require("../models/StockRequest");
const StockTransfer = require("../models/StockTransfer");
const Sale = require("../models/Sale");
const User = require("../models/User");

async function listLocations(req, res) {
  try {
    const warehouses = await Warehouse.findAll();
    const stores = await Store.findAll({
      where: req.query.include_deactivated === "true" ? {} : { active: true },
    });
    res.json({ warehouses, stores });
  } catch (error) {
    console.error("List locations error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong while fetching locations." });
  }
}

async function removeStore(req, res) {
  try {
    const store = await Store.findByPk(req.params.id);
    if (!store) return res.status(404).json({ message: "Store not found." });
    const [inventory, pending, transit, requests, transfers, sales, users] =
      await Promise.all([
        Inventory.sum("quantity", { where: { store_id: store.store_id } }),
        StockRequest.count({
          where: { store_id: store.store_id, status: ["pending", "approved"] },
        }),
        StockTransfer.count({
          where: { store_id: store.store_id, status: "dispatched" },
        }),
        StockRequest.count({ where: { store_id: store.store_id } }),
        StockTransfer.count({ where: { store_id: store.store_id } }),
        Sale.count({ where: { store_id: store.store_id } }),
        User.count({ where: { store_id: store.store_id } }),
      ]);
    if (Number(inventory || 0) > 0 || pending || transit)
      return res
        .status(409)
        .json({
          message:
            "This store cannot be removed while it has stock, pending requests, or stock in transit.",
        });
    const historical = requests || transfers || sales;
    if (historical) {
      await store.update({ active: false });
      await User.update(
        {
          active: false,
          warehouse_id: null,
          store_id: null,
          role: "administrator",
        },
        { where: { store_id: store.store_id } },
      );
    } else {
      await User.update(
        {
          active: false,
          warehouse_id: null,
          store_id: null,
          role: "administrator",
        },
        { where: { store_id: store.store_id } },
      );
      await store.destroy();
    }
    await logActivity(
      req.user,
      "STORE_REMOVED",
      `${historical ? "Deactivated" : "Deleted"} store "${store.name}" (${store.location}).`,
    );
    res.json({
      message: `Store ${historical ? "deactivated" : "deleted"} successfully.`,
      action: historical ? "deactivated" : "deleted",
      attached_users: users,
    });
  } catch (error) {
    console.error("Remove store error:", error);
    res.status(500).json({ message: "Unable to remove store." });
  }
}

async function reactivateStore(req, res) {
  try {
    const store = await Store.findByPk(req.params.id);
    if (!store) return res.status(404).json({ message: "Store not found." });
    await store.update({ active: true });
    await logActivity(
      req.user,
      "STORE_REACTIVATED",
      `Reactivated store "${store.name}".`,
    );
    res.json({ message: "Store reactivated." });
  } catch (error) {
    res.status(500).json({ message: "Unable to reactivate store." });
  }
}

async function updateWarehouse(req, res) {
  try {
    const warehouse = await Warehouse.findByPk(req.params.id);
    if (!warehouse)
      return res.status(404).json({ message: "Warehouse not found." });
    const { name, location } = req.body;
    await warehouse.update({
      name: name ?? warehouse.name,
      location: location ?? warehouse.location,
    });

    await logActivity(
      req.user,
      "LOCATION_UPDATED",
      `Warehouse "${warehouse.name}" updated.`,
    );

    res.json({ message: "Warehouse updated successfully.", warehouse });
  } catch (error) {
    console.error("Update warehouse error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong while updating the warehouse." });
  }
}

async function updateStore(req, res) {
  try {
    const store = await Store.findByPk(req.params.id);
    if (!store) return res.status(404).json({ message: "Store not found." });
    const { name, location } = req.body;
    await store.update({
      name: name ?? store.name,
      location: location ?? store.location,
    });

    await logActivity(
      req.user,
      "LOCATION_UPDATED",
      `Store "${store.name}" updated.`,
    );

    res.json({ message: "Store updated successfully.", store });
  } catch (error) {
    console.error("Update store error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong while updating the store." });
  }
}

module.exports = {
  listLocations,
  updateWarehouse,
  updateStore,
  removeStore,
  reactivateStore,
};
