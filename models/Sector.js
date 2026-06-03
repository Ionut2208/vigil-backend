const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Sector = sequelize.define('Sector', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  name: { 
    type: DataTypes.STRING, 
    allowNull: false 
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['name']
    }
  ]
});

module.exports = Sector;