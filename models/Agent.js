const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const Sector = require('./Sector');

const Agent = sequelize.define('Agent', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  codename: { type: DataTypes.STRING, allowNull: false },
  clearance: { type: DataTypes.INTEGER, allowNull: false },
  bio: { type: DataTypes.TEXT }
});

Agent.belongsTo(Sector, { foreignKey: 'sectorId' });
Sector.hasMany(Agent, { foreignKey: 'sectorId' });

module.exports = Agent;