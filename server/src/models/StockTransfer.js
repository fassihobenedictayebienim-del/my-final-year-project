const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const StockTransfer = sequelize.define('StockTransfer', {
  transfer_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  request_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  warehouse_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  store_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  approved_by: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  quantity_transferred: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    validate: { min: 1 },
  },
  status: {
    type: DataTypes.ENUM('dispatched', 'received'),
    allowNull: false,
    defaultValue: 'dispatched',
  },
  transfer_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  received_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'stock_transfers',
  timestamps: false,
});

module.exports = StockTransfer;