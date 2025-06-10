const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const NBPRefRate = sequelize.define('NBPRefRate', {
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
  },
  avgRate: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
});

module.exports = NBPRefRate;