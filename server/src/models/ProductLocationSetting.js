const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ProductLocationSetting = sequelize.define('ProductLocationSetting', {
  setting_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.STRING(50), allowNull: false },
  warehouse_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  store_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  reorder_level: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
}, {
  tableName: 'product_location_settings', timestamps: false,
});

module.exports = ProductLocationSetting;