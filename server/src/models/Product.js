const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Product = sequelize.define('Product', {
  product_id: { type: DataTypes.STRING(50), primaryKey: true },
  product_name: { type: DataTypes.STRING(150), allowNull: false },
  unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
}, {
  tableName: 'products', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at',
});

module.exports = Product;