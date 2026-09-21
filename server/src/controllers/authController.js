const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Warehouse = require('../models/Warehouse');
const Store = require('../models/Store');
const logActivity = require('../utils/activityLogger');

async function findOrCreateLocation(Model, typedLocation) {
  const normalized = typedLocation.trim().toLowerCase();
  const locations = await Model.findAll();
  const existing = locations.find((location) =>
    location.name.trim().toLowerCase() === normalized || location.location.trim().toLowerCase() === normalized
  );
  if (existing) return existing;
  return Model.create({ name: typedLocation.trim(), location: typedLocation.trim() });
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' });

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) return res.status(401).json({ message: 'Invalid email or password.' });

    const token = jwt.sign(
      { user_id: user.user_id, role: user.role, warehouse_id: user.warehouse_id, store_id: user.store_id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    await logActivity(user, 'LOGIN', `${user.name} logged in.`);

    res.json({
      message: 'Login successful.',
      token,
      user: {
        user_id: user.user_id, name: user.name, email: user.email, role: user.role,
        warehouse_id: user.warehouse_id, store_id: user.store_id,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Something went wrong during login.' });
  }
}

async function register(req, res) {
  try {
    const { name, email, phone, password, role, warehouse_id, store_id, new_location } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password, and role are required.' });
    }
    if (!['administrator', 'warehouse_manager', 'store_manager'].includes(role)) {
      return res.status(400).json({ message: 'A valid role is required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ message: 'A user with this email already exists.' });

    const typedLocation = new_location?.trim();
    if (typedLocation && (role === 'administrator' || typedLocation.length > 100)) {
      return res.status(400).json({ message: 'Enter a location of up to 100 characters for a warehouse or store manager.' });
    }

    let resolvedWarehouseId = null;
    let resolvedStoreId = null;
    if (role === 'warehouse_manager') {
      if (typedLocation) {
        const warehouse = await findOrCreateLocation(Warehouse, typedLocation);
        resolvedWarehouseId = warehouse.warehouse_id;
      } else if (warehouse_id !== undefined && warehouse_id !== '' && Number.isInteger(Number(warehouse_id))) {
        resolvedWarehouseId = Number(warehouse_id);
      }
      if (!resolvedWarehouseId) return res.status(400).json({ message: 'Select or enter a warehouse location.' });
    }
    if (role === 'store_manager') {
      if (typedLocation) {
        const store = await findOrCreateLocation(Store, typedLocation);
        resolvedStoreId = store.store_id;
      } else if (store_id !== undefined && store_id !== '' && Number.isInteger(Number(store_id))) {
        resolvedStoreId = Number(store_id);
      }
      if (!resolvedStoreId) return res.status(400).json({ message: 'Select or enter a store location.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name, email, phone: phone || null, password: hashedPassword, role,
      warehouse_id: resolvedWarehouseId,
      store_id: resolvedStoreId,
    });

    await logActivity(req.user, 'USER_CREATED', `${req.user.name || 'Administrator'} created account for ${name} (${role}).`);

    res.status(201).json({
      message: 'User created successfully.',
      user: { user_id: newUser.user_id, name: newUser.name, email: newUser.email, role: newUser.role },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Something went wrong while creating the user.' });
  }
}

async function getProfile(req, res) {
  try {
    const user = await User.findByPk(req.user.user_id, {
      attributes: ['user_id', 'name', 'email', 'phone', 'role', 'warehouse_id', 'store_id'],
    });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching your profile.' });
  }
}

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Current and new password are required.' });
    if (newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters.' });

    const user = await User.findByPk(req.user.user_id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) return res.status(401).json({ message: 'Current password is incorrect.' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await logActivity(user, 'PASSWORD_CHANGED', `${user.name} changed their own password.`);

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Something went wrong while changing the password.' });
  }
}

module.exports = { login, register, getProfile, changePassword };
