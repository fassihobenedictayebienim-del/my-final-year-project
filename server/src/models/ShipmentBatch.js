const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ShipmentBatch = sequelize.define('ShipmentBatch', {
  shipment_batch_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  warehouse_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  shipment_reference: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  date_received: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'shipment_batches',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = ShipmentBatch;