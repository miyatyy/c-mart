const { fail } = require('../utils/apiResponse');
const env = require('../config/env');

/** 404 untuk route yang tidak terdaftar. */
const notFound = (req, res) => {
  return fail(res, { statusCode: 404, message: `Route ${req.originalUrl} tidak ditemukan.` });
};

/** Error handler global — WAJIB didaftarkan paling akhir di app.js (4 parameter). */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Error validasi/unique constraint dari Sequelize
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const errors = err.errors.map((e) => ({ field: e.path, message: e.message }));
    return fail(res, { statusCode: 422, message: 'Data tidak valid.', errors });
  }

  // eslint-disable-next-line no-console
  console.error('[ERROR]', err);

  return fail(res, {
    statusCode: err.statusCode || 500,
    message: err.message || 'Terjadi kesalahan pada server.',
    errors: env.nodeEnv === 'development' ? err.stack : null,
  });
};

module.exports = { notFound, errorHandler };
