const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Shipment = sequelize.define('Shipment', {
  shipment_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  variant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  warehouse_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, validate: { min: 1 } },
  date_received: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'shipments', timestamps: true, createdAt: 'created_at', updatedAt: false,
});

module.exports = Shipment;