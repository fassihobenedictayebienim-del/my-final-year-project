const bcrypt = require('bcrypt');
const User = require('../models/User');

async function listUsers(req, res) {
  try {
    const users = await User.findAll({
      attributes: ['user_id', 'name', 'email', 'role', 'warehouse_id', 'store_id', 'created_at'],
      order: [['role', 'ASC'], ['name', 'ASC']],
    });
    res.json({ users });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching users.' });
  }
}

async function updateUser(req, res) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const { name, email, role, warehouse_id, store_id } = req.body;

    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(409).json({ message: 'A user with this email already exists.' });
      }
    }

    const newRole = role ?? user.role;

    let newWarehouseId = null;
    let newStoreId = null;
    if (newRole === 'warehouse_manager') {
      newWarehouseId = warehouse_id ?? user.warehouse_id;
      if (!newWarehouseId) {
        return res.status(400).json({ message: 'A Warehouse Manager must be linked to a warehouse.' });
      }
    } else if (newRole === 'store_manager') {
      newStoreId = store_id ?? user.store_id;
      if (!newStoreId) {
        return res.status(400).json({ message: 'A Store Manager must be linked to a store.' });
      }
    }

    await user.update({
      name: name ?? user.name,
      email: email ?? user.email,
      role: newRole,
      warehouse_id: newWarehouseId,
      store_id: newStoreId,
    });

    res.json({
      message: 'User updated successfully.',
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        warehouse_id: user.warehouse_id,
        store_id: user.store_id,
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Something went wrong while updating the user.' });
  }
}

// PUT /api/users/:id/reset-password — Administrator only
// Admin sets a new password directly for any user, no knowledge of the
// old password required.
async function resetUserPassword(req, res) {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters.' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: `Password reset successfully for ${user.name}.` });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Something went wrong while resetting the password.' });
  }
}

module.exports = { listUsers, updateUser, resetUserPassword };