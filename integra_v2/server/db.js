const { Sequelize } = require('sequelize');
// ...existing code...
const sequelize = new Sequelize('projekt_db', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
});
module.exports = sequelize;