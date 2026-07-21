const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
// Tambahkan router fitur lain di sini seiring pengembangan, misalnya:
// const productRoutes = require('./product.routes');
// const orderRoutes = require('./order.routes');
// const driverRoutes = require('./driver.routes');
// const chatRoutes = require('./chat.routes');

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);

router.get('/health', (req, res) => res.json({ success: true, message: 'API is healthy 🚀' }));

module.exports = router;
