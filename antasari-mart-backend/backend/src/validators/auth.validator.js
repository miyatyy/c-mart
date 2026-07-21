const Joi = require('joi');
const { ALL_ROLES, USER_TYPE, CIVITAS_ROLES } = require('../constants/roles');

/**
 * Skema REGISTER.
 * Aturan inti yang diminta:
 *  - role pembeli/penjual/driver  -> wajib punya userType (mahasiswa/dosen)
 *  - userType = mahasiswa         -> field `nim` WAJIB diisi
 *  - userType = dosen             -> field `nim` TIDAK BOLEH diisi (harus kosong)
 *  - role admin_reguler/admin_pro -> userType & nim tidak relevan, diabaikan
 */
const registerSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(72).required().messages({
    'string.min': 'Password minimal 8 karakter.',
  }),
  whatsapp: Joi.string()
    .pattern(/^(\+62|62|0)8[0-9]{8,11}$/)
    .messages({ 'string.pattern.base': 'Format nomor WhatsApp tidak valid.' })
    .optional(),
  role: Joi.string()
    .valid(...ALL_ROLES)
    .default('pembeli'),
  campus: Joi.string().valid('banjarmasin', 'banjarbaru').when('role', {
    is: Joi.valid(...CIVITAS_ROLES),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  gender: Joi.string().valid('male', 'female').optional(),

  userType: Joi.string()
    .valid(...Object.values(USER_TYPE))
    .when('role', {
      is: Joi.valid(...CIVITAS_ROLES),
      then: Joi.required().messages({
        'any.required': 'userType (mahasiswa/dosen) wajib diisi untuk role ini.',
      }),
      otherwise: Joi.forbidden(),
    }),

  nim: Joi.string()
    .pattern(/^[0-9]{8,15}$/)
    .messages({ 'string.pattern.base': 'NIM harus berupa angka 8-15 digit.' })
    .when('userType', {
      is: USER_TYPE.MAHASISWA,
      then: Joi.required().messages({
        'any.required': 'NIM wajib diisi karena kamu terdaftar sebagai mahasiswa.',
      }),
      otherwise: Joi.forbidden().messages({
        'any.unknown': 'NIM tidak perlu diisi untuk dosen/admin.',
      }),
    }),
}).options({ abortEarly: false, stripUnknown: true });

/**
 * Skema LOGIN.
 * Login dasar cukup email + password. Tapi sebagai lapisan verifikasi tambahan
 * untuk akun mahasiswa (opsional dipakai FE), kalau field `userType` dikirim
 * sebagai 'mahasiswa', maka `nim` wajib disertakan dan akan dicocokkan dengan
 * NIM yang tersimpan di database pada auth.controller.js.
 */
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  userType: Joi.string().valid(...Object.values(USER_TYPE)).optional(),
  nim: Joi.string()
    .pattern(/^[0-9]{8,15}$/)
    .when('userType', {
      is: USER_TYPE.MAHASISWA,
      then: Joi.required().messages({
        'any.required': 'Mahasiswa wajib menyertakan NIM saat login.',
      }),
      otherwise: Joi.forbidden(),
    }),
}).options({ abortEarly: false, stripUnknown: true });

module.exports = { registerSchema, loginSchema };
