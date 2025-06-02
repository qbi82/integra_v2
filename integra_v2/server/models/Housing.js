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
});

module.exports = Housing;