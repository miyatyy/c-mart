const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { success, fail } = require('../utils/apiResponse');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');
const { USER_TYPE } = require('../constants/roles');

/**
 * POST /api/auth/register
 * Body sudah lolos `registerSchema` (lihat validators/auth.validator.js), jadi
 * aturan "mahasiswa wajib NIM, dosen tidak" sudah dijamin di level HTTP.
 * Model User juga punya validasi yang sama sebagai lapisan kedua (defense in depth).
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, whatsapp, role, campus, gender, userType, nim } = req.body;

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    return fail(res, { statusCode: 409, message: 'Email sudah terdaftar.' });
  }

  if (nim) {
    const nimTaken = await User.findOne({ where: { nim } });
    if (nimTaken) {
      return fail(res, { statusCode: 409, message: 'NIM sudah terdaftar pada akun lain.' });
    }
  }

  const hashedPassword = await bcrypt.hash(password, env.bcryptSaltRounds);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    whatsapp,
    role,
    campus,
    gender,
    userType,
    nim,
  });

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  user.refreshToken = await bcrypt.hash(refreshToken, env.bcryptSaltRounds);
  await user.save();

  return success(res, {
    statusCode: 201,
    message: 'Registrasi berhasil.',
    data: { user: user.toSafeJSON(), accessToken, refreshToken },
  });
});

/**
 * POST /api/auth/login
 * Body sudah lolos `loginSchema`. Kalau userType='mahasiswa' dikirim,
 * `nim` WAJIB ada (dijamin Joi) dan di sini kita cocokkan lagi dengan NIM
 * yang tersimpan di database sebagai lapisan verifikasi tambahan.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password, userType, nim } = req.body;

  const user = await User.findOne({ where: { email } });
  if (!user || !user.isActive) {
    return fail(res, { statusCode: 401, message: 'Email atau password salah.' });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return fail(res, { statusCode: 401, message: 'Email atau password salah.' });
  }

  // Verifikasi tambahan khusus mahasiswa: NIM yang dikirim harus cocok dengan yang tersimpan.
  if (userType === USER_TYPE.MAHASISWA) {
    if (user.userType !== USER_TYPE.MAHASISWA || user.nim !== nim) {
      return fail(res, { statusCode: 401, message: 'NIM tidak sesuai dengan akun mahasiswa ini.' });
    }
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  user.refreshToken = await bcrypt.hash(refreshToken, env.bcryptSaltRounds);
  await user.save();

  return success(res, {
    message: 'Login berhasil.',
    data: { user: user.toSafeJSON(), accessToken, refreshToken },
  });
});

/** POST /api/auth/refresh — tukar refresh token dengan access token baru. */
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return fail(res, { statusCode: 400, message: 'refreshToken wajib disertakan.' });
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return fail(res, { statusCode: 401, message: 'Refresh token tidak valid/kedaluwarsa.' });
  }

  const user = await User.findByPk(payload.sub);
  if (!user || !user.refreshToken) {
    return fail(res, { statusCode: 401, message: 'Sesi tidak ditemukan, silakan login ulang.' });
  }

  const isSameToken = await bcrypt.compare(refreshToken, user.refreshToken);
  if (!isSameToken) {
    return fail(res, { statusCode: 401, message: 'Refresh token tidak dikenali (mungkin sudah logout).' });
  }

  const newAccessToken = signAccessToken(user);
  return success(res, { message: 'Token diperbarui.', data: { accessToken: newAccessToken } });
});

/** POST /api/auth/logout — hapus refresh token tersimpan (butuh authenticate). */
const logout = asyncHandler(async (req, res) => {
  req.user.refreshToken = null;
  await req.user.save();
  return success(res, { message: 'Logout berhasil.' });
});

/** GET /api/auth/me — profil user yang sedang login (butuh authenticate). */
const me = asyncHandler(async (req, res) => {
  return success(res, { message: 'Profil berhasil diambil.', data: { user: req.user.toSafeJSON() } });
});

module.exports = { register, login, refresh, logout, me };
