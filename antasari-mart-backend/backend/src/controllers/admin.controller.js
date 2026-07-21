const { User } = require('../models');
const { success, fail } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/admin/users
 * Bisa diakses admin_reguler MAUPUN admin_pro (lihat routes: `anyAdmin`).
 * Contoh fitur "biasa": lihat & moderasi daftar user/tenant.
 */
const listUsers = asyncHandler(async (req, res) => {
  const users = await User.findAll({
    attributes: { exclude: ['password', 'refreshToken'] },
    order: [['createdAt', 'DESC']],
  });
  return success(res, { message: 'Daftar user berhasil diambil.', data: { users } });
});

/**
 * DELETE /api/admin/users/:id
 * HANYA admin_pro (lihat routes: `adminProOnly`).
 * Contoh fitur eksklusif: hapus akun permanen — aksi destruktif & sensitif,
 * sengaja tidak diberikan ke admin_reguler.
 */
const deleteUserPermanently = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByPk(id);
  if (!user) {
    return fail(res, { statusCode: 404, message: 'User tidak ditemukan.' });
  }

  await user.destroy();
  return success(res, { message: `User "${user.name}" berhasil dihapus permanen.` });
});

/**
 * PATCH /api/admin/users/:id/deactivate
 * Contoh fitur "menengah": admin_reguler & admin_pro sama-sama boleh
 * menonaktifkan sementara (soft), bedanya hanya penghapusan permanen di atas.
 */
const deactivateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findByPk(id);
  if (!user) {
    return fail(res, { statusCode: 404, message: 'User tidak ditemukan.' });
  }

  user.isActive = false;
  await user.save();
  return success(res, { message: `User "${user.name}" telah dinonaktifkan.` });
});

module.exports = { listUsers, deleteUserPermanently, deactivateUser };
