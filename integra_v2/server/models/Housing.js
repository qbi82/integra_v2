const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Housing = sequelize.define('Housing', {
  regionId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  typeId: { 
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  indexes: [
    {
      unique: true,
      fields: ['regionId', 'year', 'typeId'],
    },
  ],
});

module.exports = Housing;