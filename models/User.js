const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  roleId: {
    type: DataTypes.INTEGER,
    references: { model: 'Roles', key: 'id' }
  }
},
{
    indexes: [
        {
            unique: true,
            fields: ['username']
        }
    ]
});

module.exports = User;