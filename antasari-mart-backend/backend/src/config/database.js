const { Sequelize } = require('sequelize');
const env = require('./env');

const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: env.db.dialect, // 'postgres'
  logging: env.nodeEnv === 'development' ? console.log : false,
  define: {
    underscored: true, // snake_case di kolom DB (created_at, updated_at, dll)
    timestamps: true,
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

module.exports = sequelize;
