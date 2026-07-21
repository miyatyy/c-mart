/** Bungkus semua respons sukses/gagal dalam bentuk yang seragam. */
function success(res, { statusCode = 200, message = 'OK', data = null, meta } = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  });
}

function fail(res, { statusCode = 400, message = 'Terjadi kesalahan', errors = null } = {}) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
}

module.exports = { success, fail };
