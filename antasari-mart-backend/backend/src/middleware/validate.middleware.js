const { fail } = require('../utils/apiResponse');

/**
 * Factory middleware: validate(schema) -> menjalankan Joi schema ke req.body.
 * Dipakai di routes, misal: router.post('/register', validate(registerSchema), ...)
 */
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body);

  if (error) {
    const errors = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));
    return fail(res, {
      statusCode: 422,
      message: 'Validasi input gagal.',
      errors,
    });
  }

  req.body = value; // pakai hasil yang sudah divalidasi & di-strip
  next();
};

module.exports = validate;
