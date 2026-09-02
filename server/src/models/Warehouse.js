const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Warehouse = sequelize.define('Warehouse', {
  warehouse_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
}, {
  tableName: 'warehouses',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Warehouse;