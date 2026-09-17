const bcrypt = require('bcrypt');
require('dotenv').config();
const { sequelize } = require('../config/db');
const User = require('../models/User');

async function createAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in your environment before creating an administrator.');
    }
    if (adminPassword.length < 12) {
      throw new Error('ADMIN_PASSWORD must be at least 12 characters long.');
    }

    await sequelize.authenticate();

    const existing = await User.findOne({ where: { email: adminEmail } });
    if (existing) {
      console.log('An administrator with this email already exists. Nothing to do.');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    await User.create({
      name: 'System Administrator',
      email: adminEmail,
      password: hashedPassword,
      role: 'administrator',
      warehouse_id: null,
      store_id: null,
    });

    console.log('Administrator account created:');
    console.log(`  Email:    ${adminEmail}`);
    console.log('  Password: [set from ADMIN_PASSWORD]');
    process.exit(0);
  } catch (error) {
    console.error('Failed to create administrator:', error.message);
    process.exit(1);
  }
}

createAdmin();
