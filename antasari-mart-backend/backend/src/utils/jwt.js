const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Payload token SENGAJA minimal (id + role) supaya:
 * 1) token tidak membengkak,
 * 2) tidak ada data sensitif/basi (misal nama yang bisa berubah) ikut ke-cache di token.
 * Data lengkap tetap diambil dari DB saat dibutuhkan.
 */
function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, userType: user.userType },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiresIn }
  );
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user.id }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
