const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Inventory = sequelize.define('Inventory', {
  inventory_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  product_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  warehouse_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  store_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },
}, {
  tableName: 'inventory',
  timestamps: true,
  createdAt: false,
  updatedAt: 'updated_at',
});

module.exports = Inventory;