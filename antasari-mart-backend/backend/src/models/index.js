const sequelize = require('../config/database');
const User = require('./user.model');

// Tempat mendaftarkan relasi antar model saat model lain (Product, Order, dll)
// ditambahkan nanti, misalnya:
// User.hasMany(Order, { foreignKey: 'buyer_id' });

module.exports = {
  sequelize,
  User,
};
