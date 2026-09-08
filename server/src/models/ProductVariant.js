const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ProductVariant = sequelize.define('ProductVariant', {
  variant_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.STRING(50), allowNull: false },
  color: { type: DataTypes.STRING(50), allowNull: false },
  size: { type: DataTypes.STRING(20), allowNull: false },
}, {
  tableName: 'product_variants', timestamps: true, createdAt: 'created_at', updatedAt: false,
});

module.exports = ProductVariant;