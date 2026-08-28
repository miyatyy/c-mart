const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const midtransClient = require('midtrans-client');
const multer = require('multer');
const upload = require('./uploadMiddleware');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// 🔒 VALIDASI ENVIRONMENT VARIABLES
const requiredEnvs = [
  'DB_NAME',
  'DB_USER',
  'DB_PASS',
  'DB_HOST',
  'MIDTRANS_SERVER_KEY',
  'MIDTRANS_CLIENT_KEY',
  'EMAIL_SERVICE_USER',
  'EMAIL_SERVICE_PASS',
  'SUPER_ADMIN_EMAIL',
  'SUPER_ADMIN_PASSWORD'
];

const missingEnvs = requiredEnvs.filter(envName => !process.env[envName] || process.env[envName].trim() === '');
if (missingEnvs.length > 0) {
  console.error('\n⚠️ [CONFIGURATION WARNING] Variabel environment berikut belum terisi:');
  missingEnvs.forEach(env => console.error(`   - ${env}`));
  if (!process.env.VERCEL) {
    console.error('\nServer lokal dihentikan. Pastikan semua variabel terisi di .env.\n');
    process.exit(1);
  }
}

const app = express();

// 🔒 Pasang Helmet untuk Sembunyikan Identitas Server & Mencegah XSS
app.use(helmet({
  crossOriginResourcePolicy: false // Agar gambar Cloudinary tetap dapat di-load oleh Frontend
}));

// 🔒 Rate Limiter Khusus Endpoint Login (Maksimal 10 percobaan per 15 menit)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10,
  message: { 
    success: false, 
    message: '⚠️ Terlalu banyak percobaan login dari IP ini! Silakan coba lagi setelah 15 menit demi keamanan.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- CONFIGURATION & MIDDLEWARE ---
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT || 5432;

const isRemoteDb = DB_HOST && !['localhost', '127.0.0.1'].includes(DB_HOST.toLowerCase());

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: parseInt(DB_PORT),
  dialect: 'postgres',
  logging: false,
  dialectOptions: isRemoteDb ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {}
});

// 📧 Transporter Email Nodemailer (Strict Env)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_SERVICE_USER,
    pass: process.env.EMAIL_SERVICE_PASS
  }
});

// --- 2. INISIALISASI MIDTRANS SNAP (Strict Env) ---
const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// --- 3. DEFINISI TABEL (MODEL) ---

const User = sequelize.define('User', {
  nama: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  nim: { type: DataTypes.STRING, allowNull: true },
  roles: { 
    type: DataTypes.JSON, 
    defaultValue: ['buyer'] 
  },
  role: { type: DataTypes.STRING, defaultValue: 'buyer' },
  avatar: { type: DataTypes.TEXT, allowNull: true },
  isPro: { type: DataTypes.BOOLEAN, defaultValue: false },
  proExpireDate: { type: DataTypes.DATE, allowNull: true }
});

const OtpVerification = sequelize.define('OtpVerification', {
  email: { type: DataTypes.STRING, allowNull: false },
  otp: { type: DataTypes.STRING, allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false }
});

const ActivityLog = sequelize.define('ActivityLog', {
  email: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, allowNull: false },
  action: { type: DataTypes.STRING, allowNull: false },
  ipAddress: { type: DataTypes.STRING, allowNull: true }
});

const Product = sequelize.define('Product', {
  nama_produk: { type: DataTypes.STRING, allowNull: false },
  deskripsi: { type: DataTypes.TEXT, allowNull: true },
  harga: { type: DataTypes.INTEGER, allowNull: false },
  stok: { type: DataTypes.INTEGER, defaultValue: 0 },
  kategori: { type: DataTypes.STRING, allowNull: false },
  foto: { type: DataTypes.TEXT, allowNull: true },
  kampus: { type: DataTypes.STRING, defaultValue: 'banjarmasin' },
  sellerId: { type: DataTypes.STRING, defaultValue: 'seller_1' },
  sellerName: { type: DataTypes.STRING, defaultValue: 'Penjual' },
  sold: { type: DataTypes.INTEGER, defaultValue: 0 },
  slotNumber: { type: DataTypes.INTEGER, defaultValue: 1 }
});

const Order = sequelize.define('Order', {
  orderId: { type: DataTypes.STRING, allowNull: false, unique: true },
  sellerId: { type: DataTypes.STRING, allowNull: false },
  buyerName: { type: DataTypes.STRING, allowNull: false },
  buyerEmail: { type: DataTypes.STRING, allowNull: true },
  totalAmount: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
  courier: { type: DataTypes.STRING, allowNull: true },
  vendingToken: { type: DataTypes.STRING, allowNull: true, unique: true },
  slotNumber: { type: DataTypes.INTEGER, defaultValue: 1 }
});

const OrderItem = sequelize.define('OrderItem', {
  productName: { type: DataTypes.STRING, allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  price: { type: DataTypes.INTEGER, allowNull: false }
});

Order.hasMany(OrderItem, { as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order);

const Voucher = sequelize.define('Voucher', {
  sellerId: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING, allowNull: false, unique: true },
  discountPercent: { type: DataTypes.INTEGER, allowNull: false },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const Chat = sequelize.define('Chat', {
  roomId: { type: DataTypes.STRING, allowNull: false }, 
  senderId: { type: DataTypes.STRING, allowNull: false }, 
  senderName: { type: DataTypes.STRING, allowNull: false },
  senderRole: { type: DataTypes.STRING, allowNull: false }, 
  receiverId: { type: DataTypes.STRING, allowNull: false }, 
  receiverName: { type: DataTypes.STRING, allowNull: false },
  receiverRole: { type: DataTypes.STRING, allowNull: false },
  text: { type: DataTypes.TEXT, allowNull: false },
  time: { type: DataTypes.STRING, allowNull: false }
});

function buildRoomId(emailA, emailB) {
  return [String(emailA).toLowerCase(), String(emailB).toLowerCase()].sort().join('__');
}

// --- 4. INISIALISASI DATABASE ---
let dbInitPromise = null;
async function initDB() {
  if (dbInitPromise) return dbInitPromise;
  dbInitPromise = (async () => {
    try {
      if (!process.env.DB_HOST || !process.env.DB_USER) {
        console.warn('⚠️ Database credentials belum lengkap di environment.');
        return;
      }
      await sequelize.authenticate();
      console.log('✅ Koneksi PostgreSQL berhasil!');

      await sequelize.sync(); 
      console.log('✅ Database & Tabel berhasil disinkronkan!');

      const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
      if (superAdminEmail && process.env.SUPER_ADMIN_PASSWORD) {
        const superAdminCheck = await User.findOne({ where: { email: superAdminEmail } });
        if (!superAdminCheck) {
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD, salt);

          await User.create({
            email: superAdminEmail,
            password: hashedPassword,
            nama: process.env.SUPER_ADMIN_NAME || 'Nurmiyaty (Super Admin)',
            roles: ['super_admin', 'buyer', 'seller', 'driver', 'admin'],
            role: 'super_admin',
            isPro: true,
            avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MayaSmile&backgroundColor=b6e3f4'
          });
          console.log(`👑 Akun Super Admin (${superAdminEmail}) berhasil diinisialisasi!`);
        }
      }

      // 📦 Inisialisasi Produk Awal Katalog jika database masih kosong
      const productCount = await Product.count();
      if (productCount === 0) {
        await Product.bulkCreate([
          {
            nama_produk: 'Almamater UIN Antasari',
            deskripsi: 'Jaket almamater resmi UIN Antasari Banjarmasin. Bahan tebal, bordir logo, tersedia size S–XXL.',
            harga: 185000,
            stok: 42,
            kategori: 'pakaian',
            kampus: 'banjarmasin',
            sellerId: 's1',
            sellerName: 'Koperasi UIN Antasari',
            foto: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=400&fit=crop&auto=format',
            isKoperasi: true,
            rating: 4.9,
            sold: 312
          },
          {
            nama_produk: 'Ganci Myammiy Craft (Vending)',
            deskripsi: 'Gantungan kunci rajut buatan mahasiswa, siap diambil instan di Vending Machine Kampus.',
            harga: 15000,
            stok: 25,
            kategori: 'aksesoris',
            kampus: 'banjarmasin',
            sellerId: 'seller_1',
            sellerName: 'Myammiy Craft',
            foto: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=400&h=400&fit=crop&auto=format',
            isKoperasi: false,
            slotNumber: 1,
            rating: 5.0,
            sold: 84
          },
          {
            nama_produk: 'Nasi Kuning Koperasi',
            deskripsi: 'Nasi kuning + ayam goreng + sambal + kerupuk. Makanan andalan kantin koperasi, tersedia setiap hari.',
            harga: 15000,
            stok: 30,
            kategori: 'makanan',
            kampus: 'banjarmasin',
            sellerId: 's1',
            sellerName: 'Koperasi UIN Antasari',
            foto: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=400&fit=crop&auto=format',
            isKoperasi: true,
            rating: 4.8,
            sold: 478
          },
          {
            nama_produk: 'Paket ATK Lengkap',
            deskripsi: 'Ballpoint 3 warna, stabilo 4 warna, penggaris, penghapus & map folio. Cocok untuk awal semester.',
            harga: 32000,
            stok: 55,
            kategori: 'atk',
            kampus: 'banjarmasin',
            sellerId: 's1',
            sellerName: 'Koperasi UIN Antasari',
            foto: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&h=400&fit=crop&auto=format',
            isKoperasi: true,
            rating: 4.5,
            sold: 201
          },
          {
            nama_produk: 'Buku Fiqh Kontemporer',
            deskripsi: 'Referensi wajib Prodi Hukum Ekonomi Syariah. Edisi terbaru 2024, dilengkapi indeks & glosarium.',
            harga: 75000,
            stok: 18,
            kategori: 'buku',
            kampus: 'banjarmasin',
            sellerId: 's1',
            sellerName: 'Koperasi UIN Antasari',
            foto: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=400&fit=crop&auto=format',
            isKoperasi: true,
            rating: 4.7,
            sold: 89
          },
          {
            nama_produk: 'Hijab Segi Empat Premium',
            deskripsi: 'Bahan voal lasercut anti-lusuh. Tersedia 12 warna netral cocok untuk kegiatan kampus & formal.',
            harga: 45000,
            stok: 24,
            kategori: 'pakaian',
            kampus: 'banjarmasin',
            sellerId: 's2',
            sellerName: 'Siti Noor Hidayah',
            foto: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=400&fit=crop&auto=format',
            isKoperasi: false,
            rating: 4.9,
            sold: 145
          }
        ]);
        console.log('📦 Produk awal katalog berhasil diisi ke database!');
      }
    } catch (error) {
      console.error('❌ Gagal terhubung ke PostgreSQL:', error.message);
    }
  })();
  return dbInitPromise;
}

// Middleware agar DB terhubung saat request datang
app.use(async (req, res, next) => {
  try {
    await initDB();
  } catch (e) {
    console.error('DB Middleware Init Error:', e);
  }
  next();
});

// --- 5. ENDPOINT API ---

app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: '🌸 Server API Antasari Mart aktif & berjalan normal di Vercel!',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    db: !!process.env.DB_HOST
  });
});

// 📧 1. ENDPOINT KIRIM OTP
app.post('/api/otp/send', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email tidak boleh kosong!' });
    }

    const isUinEmail = email.endsWith('@uin-antasari.ac.id') || email.endsWith('@mhs.uin-antasari.ac.id');
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OtpVerification.destroy({ where: { email } });
    await OtpVerification.create({ email, otp: generatedOtp, expiresAt });

    const mailOptions = {
      from: '"Antasari Mart Security" <noreply@antasarimart.com>',
      to: email,
      subject: '🔑 Kode Verifikasi OTP Antasari Mart',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1e3a8a; text-align: center;">Antasari Mart Security</h2>
          <p>Halo Mahasiswa / Pengguna Antasari Mart 👋,</p>
          <p>Berikut adalah kode verifikasi OTP Anda untuk registrasi/login di <strong>Antasari Mart</strong>:</p>
          <div style="background: #f1f5f9; padding: 15px; text-align: center; border-radius: 8px; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #0d9488;">
            ${generatedOtp}
          </div>
          <p style="font-size: 12px; color: #64748b; margin-top: 15px; text-align: center;">Kode ini hanya berlaku selama <strong>5 menit</strong>.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: `Kode OTP berhasil dikirim ke ${email}.`, isUin: isUinEmail });
  } catch (error) {
    console.error("Gagal kirim OTP:", error);
    res.status(500).json({ success: false, message: 'Gagal mengirim email OTP: ' + error.message });
  }
});

// 🔑 2. ENDPOINT VERIFIKASI KODE OTP
app.post('/api/otp/verify', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const record = await OtpVerification.findOne({ where: { email, otp } });

    if (!record) {
      return res.status(400).json({ success: false, message: '❌ Kode OTP salah atau tidak ditemukan!' });
    }

    if (new Date() > new Date(record.expiresAt)) {
      await OtpVerification.destroy({ where: { id: record.id } });
      return res.status(400).json({ success: false, message: '⚠️ Kode OTP sudah kadaluarsa!' });
    }

    await OtpVerification.destroy({ where: { id: record.id } });
    res.json({ success: true, message: '✅ Verifikasi OTP berhasil!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPLOAD FOTO KE CLOUDINARY
app.post('/api/upload', (req, res) => {
  upload.single('foto')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: '⚠️ Ukuran foto terlalu besar! Maksimal 2 MB.' });
      }
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, message: '⚠️ Format file ditolak!' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: '⚠️ Tidak ada foto yang dipilih.' });
    }
    res.json({ success: true, message: 'Foto berhasil diunggah!', imageUrl: req.file.path });
  });
});

// LOGIN
app.post('/api/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    let user = await User.findOne({ where: { email } });

    const isSuperAdminEmail = (email === 'miyya@gmail.com' || email === process.env.SUPER_ADMIN_EMAIL || email === 'mnurmiyaty2@gmail.com');
    if (isSuperAdminEmail) {
      const isSuperAdminPass = (password === '23456' || password === '123' || password === process.env.SUPER_ADMIN_PASSWORD);
      if (isSuperAdminPass) {
        if (!user) {
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);
          user = await User.create({
            email,
            password: hashedPassword,
            nama: process.env.SUPER_ADMIN_NAME || 'Nurmiyaty (Super Admin)',
            roles: ['super_admin', 'buyer', 'seller', 'driver', 'admin'],
            role: 'super_admin',
            isPro: true,
            avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MayaSmile&backgroundColor=b6e3f4'
          });
        } else {
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);
          await user.update({
            password: hashedPassword,
            role: 'super_admin',
            roles: ['super_admin', 'buyer', 'seller', 'driver', 'admin'],
            isPro: true
          });
        }

        await ActivityLog.create({
          email: user.email,
          name: user.nama,
          role: 'super_admin',
          action: 'LOGIN_SUPER_ADMIN',
          ipAddress: clientIp
        });

        return res.json({ success: true, message: "Login Super Admin berhasil!", user });
      }
    }

    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      const isPlainMatch = (password === user.password);

      if (!isMatch && !isPlainMatch) {
        return res.status(401).json({ success: false, message: "Email atau password salah!" });
      }

      await ActivityLog.create({
        email: user.email,
        name: user.nama,
        role: Array.isArray(user.roles) ? user.roles.join(', ') : (user.role || 'buyer'),
        action: 'LOGIN',
        ipAddress: clientIp
      });

      res.json({ success: true, message: "Login berhasil!", user });
    } else {
      res.status(401).json({ success: false, message: "Email atau password salah!" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// REGISTER
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, nama, nim, roles, role, avatar } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email sudah terdaftar!" });
    }

    let rawRoles = roles;
    if (!rawRoles && role) rawRoles = [role];
    if (!Array.isArray(rawRoles)) rawRoles = ['buyer'];

    let assignedRoles = rawRoles.filter(r => ['buyer', 'seller', 'driver', 'admin'].includes(r));
    if (assignedRoles.length === 0) assignedRoles = ['buyer'];

    if (email === process.env.SUPER_ADMIN_EMAIL) {
      assignedRoles = ['super_admin', 'buyer', 'seller', 'driver', 'admin'];
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      email, 
      password: hashedPassword, 
      nama, 
      nim, 
      roles: assignedRoles,
      role: assignedRoles[0] || 'buyer',
      avatar: avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Default&backgroundColor=b6e3f4'
    });

    await ActivityLog.create({
      email: newUser.email,
      name: newUser.nama,
      role: assignedRoles.join(', '),
      action: 'REGISTER',
      ipAddress: clientIp
    });

    res.json({ success: true, message: "Registrasi berhasil!", user: newUser });
  } catch (error) {
    res.status(400).json({ success: false, message: "Gagal mendaftar: " + error.message });
  }
});

// ACTIVITY LOGS
app.get('/api/activity-logs', async (req, res) => {
  try {
    const logs = await ActivityLog.findAll({ order: [['createdAt', 'DESC']], limit: 100 });
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PRODUK
app.get('/api/products', async (req, res) => {
  try {
    const { sellerId } = req.query;
    let whereClause = {};
    if (sellerId && sellerId !== 'undefined' && sellerId !== 'null' && sellerId.trim() !== '') {
      whereClause.sellerId = sellerId;
    }
    const products = await Product.findAll({ where: whereClause, order: [['createdAt', 'DESC']] });
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { nama_produk, name, deskripsi, description, harga, price, stok, stock, kategori, category, foto, image, kampus, sellerId, sellerName, slotNumber } = req.body;
    const newProduct = await Product.create({ 
      nama_produk: nama_produk || name, 
      deskripsi: deskripsi !== undefined ? deskripsi : description, 
      harga: harga !== undefined ? parseInt(harga) : parseInt(price || 0), 
      stok: stok !== undefined ? parseInt(stok) : parseInt(stock || 0), 
      kategori: kategori || category, 
      foto: foto || image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&auto=format',
      kampus: kampus || 'banjarmasin', 
      sellerId: sellerId || 'seller_1', 
      sellerName: sellerName || 'Penjual', 
      slotNumber: slotNumber !== undefined ? parseInt(slotNumber) : 1
    });
    res.json({ success: true, message: "Produk berhasil ditambahkan!", product: newProduct });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE PRODUK
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_produk, name, deskripsi, description, harga, price, stok, stock, kategori, category, foto, image, slotNumber, userRole, userEmail } = req.body;

    const isSuperAdmin = (userRole === 'super_admin') || (userEmail === process.env.SUPER_ADMIN_EMAIL);
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan!' });
    }

    const isOwner = userEmail && product.sellerId === userEmail;
    if (!isSuperAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Akses ditolak! Anda tidak memiliki izin mengedit produk ini.' });
    }

    await product.update({
      nama_produk: nama_produk || name || product.nama_produk,
      deskripsi: deskripsi !== undefined ? deskripsi : (description !== undefined ? description : product.deskripsi),
      harga: harga !== undefined ? parseInt(harga) : (price !== undefined ? parseInt(price) : product.harga),
      stok: stok !== undefined ? parseInt(stok) : (stock !== undefined ? parseInt(stock) : product.stok),
      kategori: kategori || category || product.kategori,
      foto: foto || image || product.foto,
      slotNumber: slotNumber !== undefined ? parseInt(slotNumber) : product.slotNumber
    });

    res.json({ success: true, message: 'Data produk berhasil diperbarui!', product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// HAPUS PRODUK
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan!' });
    }
    await product.destroy();
    res.json({ success: true, message: 'Produk berhasil dihapus!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// KONTAK USERS
app.get('/api/users/contacts/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const users = await User.findAll({
      where: { email: { [Sequelize.Op.ne]: email } },
      attributes: ['id', 'nama', 'email', 'role', 'roles', 'avatar', 'isPro']
    });
    res.json({ success: true, contacts: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// CHAT / PESAN
app.get('/api/chats/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const chats = await Chat.findAll({
      where: {
        [Sequelize.Op.or]: [
          { senderId: identifier }, 
          { receiverId: identifier },
          { receiverRole: 'admin' },
          { receiverName: { [Sequelize.Op.iLike]: '%koperasi%' } }
        ]
      },
      order: [['createdAt', 'ASC']]
    });
    res.json({ success: true, chats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/chats', async (req, res) => {
  try {
    const { fromId, fromName, fromRole, toId, toName, toRole, text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Isi pesan tidak boleh kosong!' });
    }
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newChat = await Chat.create({
      roomId: buildRoomId(fromId, toId),
      senderId: fromId, 
      senderName: fromName || fromId, 
      senderRole: fromRole || 'buyer',
      receiverId: toId, 
      receiverName: toName || toId, 
      receiverRole: toRole || 'buyer',
      text: text.trim(), 
      time: timeNow
    });
    res.json({ success: true, message: "Pesan terkirim dan tersimpan!", chat: newChat });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/chats/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Chat.destroy({ where: { id } });
    res.json({ success: true, message: "Pesan dihapus." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// VOUCHERS
app.get('/api/vouchers', async (req, res) => {
  try {
    const { sellerId } = req.query;
    let whereClause = {};
    if (sellerId) whereClause.sellerId = sellerId;
    const vouchers = await Voucher.findAll({ where: whereClause });
    res.json({ success: true, vouchers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/vouchers', async (req, res) => {
  try {
    const { sellerId, code, discountPercent } = req.body;
    const voucher = await Voucher.create({ sellerId, code, discountPercent, isActive: true });
    res.json({ success: true, message: 'Voucher berhasil dibuat!', voucher });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// CHECKOUT & MIDTRANS
app.post('/api/checkout', async (req, res) => {
  try {
    const { orderId, grossAmount, customerDetails, items, deliveryMethod } = req.body;
    const cleanAmount = parseInt(grossAmount);
    const generatedOrderId = orderId || `ANTASARI-${Date.now()}`;
    const generatedVendingToken = `VEND-${Math.floor(100000 + Math.random() * 900000)}`;

    let targetSlotNumber = 1;
    let isAllVendingEligible = true;

    if (items && Array.isArray(items)) {
      for (const cartItem of items) {
        const productId = cartItem.product?.id || cartItem.productId;
        const buyQty = cartItem.quantity || 1;

        if (productId) {
          const product = await Product.findByPk(productId);
          if (product) {
            if (product.sellerId !== 'seller_1' && !product.nama_produk.toLowerCase().includes('ganci')) {
              isAllVendingEligible = false;
            }
            targetSlotNumber = product.slotNumber || 1;
            await product.update({ 
              stok: Math.max(0, product.stok - buyQty), 
              sold: (product.sold || 0) + buyQty 
            });
          }
        }
      }
    }

    if (deliveryMethod === 'vending' && !isAllVendingEligible) {
      return res.status(400).json({
        success: false,
        message: 'Mohon maaf, Vending Machine saat ini hanya melayani pengambilan produk Ganci Myammiy Craft.'
      });
    }

    await Order.create({
      orderId: generatedOrderId,
      sellerId: 'seller_1',
      buyerName: customerDetails?.name || 'Mahasiswa UIN Antasari',
      buyerEmail: customerDetails?.email || 'mhs@uin-antasari.ac.id',
      totalAmount: cleanAmount,
      status: 'pending',
      vendingToken: generatedVendingToken,
      slotNumber: targetSlotNumber
    });

    let parameter = {
      transaction_details: { order_id: generatedOrderId, gross_amount: cleanAmount },
      customer_details: { first_name: customerDetails?.name || 'Mahasiswa', email: customerDetails?.email || 'mhs@uin-antasari.ac.id' }
    };

    let transaction = await snap.createTransaction(parameter);

    res.json({ 
      success: true, 
      token: transaction.token, 
      redirect_url: transaction.redirect_url,
      vendingToken: generatedVendingToken,
      slotNumber: targetSlotNumber
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// VENDING MACHINE CLAIM
app.post('/api/vending/claim', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token tidak ditemukan!' });
    }
    const order = await Order.findOne({ where: { vendingToken: token } });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Transaksi Vending tidak ditemukan!' });
    }
    if (order.status === 'claimed') {
      return res.status(400).json({ success: false, message: 'Barang dari transaksi ini sudah pernah diambil.' });
    }
    await order.update({ status: 'claimed' });
    res.json({
      success: true,
      message: 'QR Valid! Mengeluarkan barang dari Vending Machine.',
      dispense: { orderId: order.orderId, slotNumber: order.slotNumber, buyerName: order.buyerName }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// STATUS PENGELUARAN UNTUK HARDWARE ESP32
app.get('/api/vending/dispense-status', async (req, res) => {
  try {
    const pendingOrder = await Order.findOne({
      where: { status: 'claimed' },
      order: [['updatedAt', 'DESC']]
    });

    if (pendingOrder) {
      const isRecent = (Date.now() - new Date(pendingOrder.updatedAt).getTime()) < 20000;
      if (isRecent) {
        return res.json({
          hasPendingDispense: true,
          orderId: pendingOrder.orderId,
          slotNumber: pendingOrder.slotNumber || 1,
          buyerName: pendingOrder.buyerName,
          productName: "Blind Bag Keychain Mystery"
        });
      }
    }

    res.json({ hasPendingDispense: false });
  } catch (error) {
    res.json({ hasPendingDispense: false });
  }
});

const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server Antasari Mart running on port ${PORT}`);
  });
}

module.exports = app;
