const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Log = sequelize.define('Log', {
  userId: { type: DataTypes.STRING, allowNull: false },
  groupId: { type: DataTypes.STRING, allowNull: false },
  actionInformation: { type: DataTypes.TEXT, allowNull: false },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  isSuspicious: { type: DataTypes.BOOLEAN, defaultValue: false }
});

module.exports = Log;