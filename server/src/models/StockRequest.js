const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const StockRequest = sequelize.define('StockRequest', {
  request_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },

  store_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },

  variant_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },

  quantity: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    validate: {
      min: 1,
    },
  },

  status: {
    type: DataTypes.ENUM(
      'pending',
      'approved',
      'rejected',
      'fulfilled',
      'cancelled'
    ),
    allowNull: false,
    defaultValue: 'pending',
  },

  request_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'stock_requests',
  timestamps: false,
});

module.exports = StockRequest;