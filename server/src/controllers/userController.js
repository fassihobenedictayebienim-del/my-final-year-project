const bcrypt = require("bcrypt");
const User = require("../models/User");
const Warehouse = require("../models/Warehouse");
const Store = require("../models/Store");
const StockTransfer = require("../models/StockTransfer");
const ActivityLog = require("../models/ActivityLog");
const logActivity = require("../utils/activityLogger");

async function findOrCreateLocation(Model, typedLocation) {
  const normalized = typedLocation.trim().toLowerCase();
  const locations = await Model.findAll();
  const existing = locations.find(
    (location) =>
      location.name.trim().toLowerCase() === normalized ||
      location.location.trim().toLowerCase() === normalized,
  );
  if (existing) return existing;
  return Model.create({
    name: typedLocation.trim(),
    location: typedLocation.trim(),
  });
}

async function listUsers(req, res) {
  try {
    const includeDeactivated = req.query.include_deactivated === "true";
    const users = await User.findAll({
      where: includeDeactivated ? {} : { active: true },
      attributes: [
        "user_id",
        "name",
        "email",
        "phone",
        "role",
        "warehouse_id",
        "store_id",
        "active",
        "created_at",
      ],
      order: [
        ["role", "ASC"],
        ["name", "ASC"],
      ],
    });
    res.json({ users });
  } catch (error) {
    console.error("List users error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong while fetching users." });
  }
}

async function reactivateUser(req, res) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.active)
      return res
        .status(400)
        .json({ message: "This account is already active." });
    await user.update({ active: true });
    await logActivity(
      req.user,
      "USER_REACTIVATED",
      `${req.user.name || "Administrator"} reactivated account for ${user.name}.`,
    );
    res.json({ message: `${user.name}'s account has been reactivated.` });
  } catch (error) {
    console.error("Reactivate user error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong while reactivating the user." });
  }
}

async function deleteUser(req, res) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (Number(user.user_id) === Number(req.user.user_id))
      return res
        .status(400)
        .json({ message: "You cannot delete your own account." });
    if (user.role === "administrator") {
      const activeAdmins = await User.count({
        where: { role: "administrator", active: true },
      });
      if (user.active && activeAdmins <= 1)
        return res
          .status(400)
          .json({
            message: "The last remaining Administrator cannot be deleted.",
          });
    }
    const [transfers, logs] = await Promise.all([
      StockTransfer.count({ where: { approved_by: user.user_id } }),
      ActivityLog.count({ where: { user_id: user.user_id } }),
    ]);
    const action = transfers || logs ? "deactivated" : "deleted";
    const name = user.name;
    // A deactivated manager must not continue to reserve a live warehouse/store.
    // Activity entries already snapshot the actor name and role, so this preserves audit history.
    if (action === "deactivated")
      await user.update({
        active: false,
        warehouse_id: null,
        store_id: null,
        role: "administrator",
      });
    else await user.destroy();
    await logActivity(
      req.user,
      "USER_DELETED",
      `${req.user.name || "Administrator"} ${action} account for ${name}.`,
    );
    res.json({ message: `User ${action} successfully.`, action });
  } catch (error) {
    console.error("Delete user error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong while deleting the user." });
  }
}

async function updateUser(req, res) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const { name, email, phone, role, warehouse_id, store_id, new_location } =
      req.body;

    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing)
        return res
          .status(409)
          .json({ message: "A user with this email already exists." });
    }

    const newRole = role ?? user.role;
    const typedLocation = new_location?.trim();
    if (
      typedLocation &&
      (newRole === "administrator" || typedLocation.length > 100)
    ) {
      return res
        .status(400)
        .json({
          message:
            "Enter a location of up to 100 characters for a warehouse or store manager.",
        });
    }
    let newWarehouseId = null,
      newStoreId = null;
    if (newRole === "warehouse_manager") {
      if (typedLocation) {
        const warehouse = await findOrCreateLocation(Warehouse, typedLocation);
        newWarehouseId = warehouse.warehouse_id;
      } else {
        newWarehouseId = warehouse_id ?? user.warehouse_id;
      }
      if (!newWarehouseId)
        return res
          .status(400)
          .json({ message: "Select or enter a warehouse location." });
    } else if (newRole === "store_manager") {
      if (typedLocation) {
        const store = await findOrCreateLocation(Store, typedLocation);
        newStoreId = store.store_id;
      } else {
        newStoreId = store_id ?? user.store_id;
      }
      if (!newStoreId)
        return res
          .status(400)
          .json({ message: "Select or enter a store location." });
    }

    const oldName = user.name;
    await user.update({
      name: name ?? user.name,
      email: email ?? user.email,
      phone: phone !== undefined ? phone || null : user.phone,
      role: newRole,
      warehouse_id: newWarehouseId,
      store_id: newStoreId,
    });

    await logActivity(
      req.user,
      "USER_UPDATED",
      `${req.user.name || "Administrator"} updated account for ${oldName} → ${user.name}.`,
    );

    res.json({
      message: "User updated successfully.",
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        warehouse_id: user.warehouse_id,
        store_id: user.store_id,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong while updating the user." });
  }
}

async function resetUserPassword(req, res) {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8)
      return res
        .status(400)
        .json({ message: "New password must be at least 8 characters." });

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await logActivity(
      req.user,
      "PASSWORD_RESET",
      `${req.user.name || "Administrator"} reset the password for ${user.name}.`,
    );

    res.json({ message: `Password reset successfully for ${user.name}.` });
  } catch (error) {
    console.error("Reset password error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong while resetting the password." });
  }
}

module.exports = {
  listUsers,
  updateUser,
  resetUserPassword,
  deleteUser,
  reactivateUser,
};
