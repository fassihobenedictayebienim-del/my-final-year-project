const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const VariantLocationSetting = sequelize.define('VariantLocationSetting', {
  setting_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  variant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  warehouse_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  store_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  reorder_level: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 5 },
}, {
  tableName: 'variant_location_settings', timestamps: false,
});

module.exports = VariantLocationSetting;
