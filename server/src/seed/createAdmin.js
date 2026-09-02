const bcrypt = require('bcrypt');
require('dotenv').config();
const { sequelize } = require('../config/db');
const User = require('../models/User');

async function createAdmin() {
  try {
    await sequelize.authenticate();

    const existing = await User.findOne({ where: { email: 'admin@moae.com' } });
    if (existing) {
      console.log('An administrator with this email already exists. Nothing to do.');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('ChangeMe123!', 10);

    await User.create({
      name: 'System Administrator',
      email: 'admin@moae.com',
      password: hashedPassword,
      role: 'administrator',
      warehouse_id: null,
      store_id: null,
    });

    console.log('Administrator account created:');
    console.log('  Email:    admin@moae.com');
    console.log('  Password: ChangeMe123!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to create administrator:', error.message);
    process.exit(1);
  }
}

createAdmin();