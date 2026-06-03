const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const RolePermission = sequelize.define('RolePermission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  roleId: {
    type: DataTypes.INTEGER,
    references: { model: 'Roles', key: 'id' }
  },
  permissionId: {
    type: DataTypes.INTEGER,
    references: { model: 'Permissions', key: 'id' }
  }
}, {
  timestamps: false 
});

module.exports = RolePermission;