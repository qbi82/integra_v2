const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('projekt_db', 'user', 'password', {
  host: 'localhost',
  dialect: 'mysql',
  port: 3307,
});

module.exports = sequelize;