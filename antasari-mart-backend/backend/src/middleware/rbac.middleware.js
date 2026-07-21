const { fail } = require('../utils/apiResponse');
const { ADMIN_LEVEL, ROLES } = require('../constants/roles');

/**
 * requireRole(...roles)
 * Middleware generik: hanya lolos jika req.user.role ADA di daftar `roles`.
 * Contoh: requireRole(ROLES.PENJUAL, ROLES.ADMIN_PRO)
 *
 * Harus dipasang SETELAH `authenticate`, karena butuh req.user.
 */
const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return fail(res, { statusCode: 401, message: 'Belum terautentikasi.' });
  }

  if (!allowedRoles.includes(req.user.role)) {
    return fail(res, {
      statusCode: 403,
      message: `Akses ditolak. Role "${req.user.role}" tidak memiliki izin untuk resource ini.`,
    });
  }

  next();
};

/**
 * requireMinAdminLevel(level)
 * Middleware khusus tingkatan ADMIN: memastikan admin_pro bisa mengakses
 * fitur yang tidak bisa diakses admin_reguler, tanpa perlu menulis ulang
 * daftar role di tiap route.
 *
 * Contoh pemakaian:
 *   // hanya admin_pro yang boleh masuk:
 *   router.delete('/users/:id', authenticate, requireMinAdminLevel(ADMIN_LEVEL.admin_pro), ...)
 *
 *   // admin_reguler DAN admin_pro boleh masuk (level minimal admin_reguler):
 *   router.get('/reports', authenticate, requireMinAdminLevel(ADMIN_LEVEL.admin_reguler), ...)
 */
const requireMinAdminLevel = (minLevel) => (req, res, next) => {
  if (!req.user) {
    return fail(res, { statusCode: 401, message: 'Belum terautentikasi.' });
  }

  const userLevel = ADMIN_LEVEL[req.user.role];

  if (!userLevel) {
    return fail(res, {
      statusCode: 403,
      message: 'Akses ditolak. Resource ini khusus admin.',
    });
  }

  if (userLevel < minLevel) {
    return fail(res, {
      statusCode: 403,
      message: 'Akses ditolak. Fitur ini hanya tersedia untuk Admin Pro.',
    });
  }

  next();
};

/** Shortcut siap pakai: khusus fitur eksklusif admin_pro. */
const adminProOnly = requireMinAdminLevel(ADMIN_LEVEL[ROLES.ADMIN_PRO]);

/** Shortcut siap pakai: admin_reguler ke atas (admin_reguler & admin_pro). */
const anyAdmin = requireMinAdminLevel(ADMIN_LEVEL[ROLES.ADMIN_REGULER]);

module.exports = { requireRole, requireMinAdminLevel, adminProOnly, anyAdmin };
