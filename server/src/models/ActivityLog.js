const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ActivityLog = sequelize.define('ActivityLog', {
  log_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  user_name: { type: DataTypes.STRING(100), allowNull: true },
  user_role: { type: DataTypes.STRING(30), allowNull: true },
  action: { type: DataTypes.STRING(100), allowNull: false },
  details: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'activity_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = ActivityLog;