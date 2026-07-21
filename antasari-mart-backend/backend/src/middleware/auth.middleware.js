const { verifyAccessToken } = require('../utils/jwt');
const { fail } = require('../utils/apiResponse');
const { User } = require('../models');

/**
 * Middleware "authenticate": memastikan request punya access token yang valid
 * di header `Authorization: Bearer <token>`, lalu melampirkan user ke req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return fail(res, { statusCode: 401, message: 'Token tidak ditemukan. Silakan login.' });
    }

    const payload = verifyAccessToken(token); // { sub, role, userType, iat, exp }

    const user = await User.findByPk(payload.sub);
    if (!user || !user.isActive) {
      return fail(res, { statusCode: 401, message: 'Akun tidak ditemukan atau sudah dinonaktifkan.' });
    }

    req.user = user; // instance Sequelize penuh, siap dipakai controller
    req.tokenPayload = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return fail(res, { statusCode: 401, message: 'Token sudah kedaluwarsa.' });
    }
    return fail(res, { statusCode: 401, message: 'Token tidak valid.' });
  }
};

module.exports = { authenticate };
