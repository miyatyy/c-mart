/**
 * Membungkus controller async supaya error otomatis dilempar ke
 * errorHandler.middleware.js lewat next(err), tanpa try/catch berulang.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
