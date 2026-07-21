const express = require('express');
const router = express.Router();

const { listUsers, deleteUserPermanently, deactivateUser } = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { anyAdmin, adminProOnly } = require('../middleware/rbac.middleware');

// Semua route admin wajib login dulu.
router.use(authenticate);

// admin_reguler DAN admin_pro boleh akses:
router.get('/users', anyAdmin, listUsers);
router.patch('/users/:id/deactivate', anyAdmin, deactivateUser);

// HANYA admin_pro yang boleh akses:
router.delete('/users/:id', adminProOnly, deleteUserPermanently);

module.exports = router;
