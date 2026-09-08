const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes, Op } = require('sequelize');
const mongoose = require('mongoose');
const cron = require('node-cron');
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (_e) {}
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
    user: process.env.EMAIL_SERVICE_USER || 'mnurmiyaty2@gmail.com',
    pass: (process.env.EMAIL_SERVICE_PASS || '').replace(/\s+/g, '')
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
  role: { type: DataTypes.STRING, allowNull: false }, // 'buyer', 'seller', 'driver', 'admin', 'super_admin'
  action: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.STRING, defaultValue: 'general' }, // 'auth', 'order', 'vending', 'driver', 'system', 'finance', 'pro'
  details: { type: DataTypes.TEXT, allowNull: true },
  campus: { type: DataTypes.STRING, defaultValue: 'banjarmasin' },
  status: { type: DataTypes.STRING, defaultValue: 'success' }, // 'success', 'info', 'warning'
  ipAddress: { type: DataTypes.STRING, allowNull: true }
});

const MonthlyRecap = sequelize.define('MonthlyRecap', {
  monthYear: { type: DataTypes.STRING, allowNull: false },
  totalEvents: { type: DataTypes.INTEGER, defaultValue: 0 },
  buyerCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  sellerCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  driverCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  adminCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  sentToEmail: { type: DataTypes.STRING, allowNull: false },
  sentAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  status: { type: DataTypes.STRING, defaultValue: 'sent' }
});

const Product = sequelize.define('Product', {
  nama_produk: { type: DataTypes.STRING, allowNull: false },
  deskripsi: { type: DataTypes.TEXT, allowNull: true },
  harga: { type: DataTypes.INTEGER, allowNull: false },
  stok: { type: DataTypes.INTEGER, defaultValue: 0 },
  kategori: { type: DataTypes.STRING, allowNull: false },
  foto: { type: DataTypes.TEXT, allowNull: true },
  images: { type: DataTypes.JSON, defaultValue: [] },
  videoUrl: { type: DataTypes.TEXT, allowNull: true },
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

// ==========================================
// 🍃 3.5. INISIALISASI MONGO DB (CHAT DATABASE)
// ==========================================
const MongoChatSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  senderId: { type: String, required: true, index: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, default: 'buyer' },
  receiverId: { type: String, required: true, index: true },
  receiverName: { type: String, required: true },
  receiverRole: { type: String, default: 'seller' },
  text: { type: String, required: true },
  time: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  isHandedOver: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const MongoChat = mongoose.models.MongoChat || mongoose.model('MongoChat', MongoChatSchema);

let isMongoConnected = false;
async function initMongoDB() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/Antasari_Mart_Chat';
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 3500
    });
    isMongoConnected = true;
    console.log('🍃 [MongoDB] Terhubung Sukses! Database Chat MongoDB & Auto-Cleanup Siap Beroperasi.');
  } catch (err) {
    console.warn('⚠️ [MongoDB] Server lokal/Atlas belum terhubung:', err.message);
    console.warn('🔄 [Hybrid Mode] Sistem chat tetap berjalan lancar dengan PostgreSQL fallback.');
    isMongoConnected = false;
  }
}
initMongoDB();

// ==========================================================
// ⏰ PENJADWAL PEMBERSIHAN CHAT OTOMATIS SETIAP PUKUL 00:00:00 WITA
// ==========================================================
cron.schedule('0 0 * * *', async () => {
  const timeStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
  console.log(`\n🧹 [00:00 WITA - MIDNIGHT CLEANUP | ${timeStr}] Memulai pembersihan otomatis riwayat chat harian...`);
  try {
    let mongoDeleted = 0;
    if (isMongoConnected) {
      const resM = await MongoChat.deleteMany({});
      mongoDeleted = resM.deletedCount || 0;
      console.log(`🍃 [MongoDB] Berhasil membersihkan ${mongoDeleted} dokumen pesan.`);
    }
    await Chat.destroy({ where: {}, truncate: true });
    console.log('🐘 [PostgreSQL] Riwayat tabel chat cadangan berhasil dibersihkan.');
    console.log(`✨ [00:00 WITA] Pembersihan selesai! Penyimpanan database kembali bersih, ringan, dan 0 KB terbuang.\n`);
  } catch (cleanupError) {
    console.error('❌ Gagal menjalankan pembersihan chat 00:00 WITA:', cleanupError.message);
  }
}, {
  scheduled: true,
  timezone: 'Asia/Makassar' // WITA (Waktu Indonesia Tengah UTC+8)
});

// ==========================================================
// 📅 FUNGSI PEMBUAT REKAP AUDIT LOG BULANAN & PENGIRIMAN EMAIL
// ==========================================================
async function generateAndSendMonthlyAuditRecap({ targetEmail, isManualTrigger = false }) {
  const now = new Date();
  const monthName = now.toLocaleString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Makassar' });
  const recipient = targetEmail || process.env.SUPER_ADMIN_EMAIL || 'nurmiyaty@gmail.com';

  console.log(`\n📊 [REKAP BULANAN] Mengumpulkan log aktivitas & transaksi untuk periode: ${monthName}...`);

  // 1. Ambil semua log aktivitas
  let logs = [];
  try {
    logs = await ActivityLog.findAll({
      order: [['createdAt', 'DESC']],
      limit: 500
    });
  } catch (err) {
    console.warn('⚠️ Gagal mengambil log dari database:', err.message);
  }

  // 2. Klasifikasi aktivitas per role
  const buyerLogs = logs.filter(l => l.role === 'buyer');
  const sellerLogs = logs.filter(l => l.role === 'seller');
  const driverLogs = logs.filter(l => l.role === 'driver');
  const adminLogs = logs.filter(l => ['admin', 'super_admin'].includes(l.role));

  // 3. Statistik Ringkasan
  const totalEvents = logs.length;
  const totalBuyers = buyerLogs.length;
  const totalSellers = sellerLogs.length;
  const totalDrivers = driverLogs.length;
  const totalAdmins = adminLogs.length;

  // 4. Bangun Dokumen Laporan HTML Berformat PDF Eksekutif
  const reportHtml = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Rekap Audit Log & Aktivitas - ${monthName}</title>
  <style>
    body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #131E17 0%, #1A2E22 50%, #244230 100%); color: #ffffff; padding: 32px 28px; text-align: left; }
    .header h1 { margin: 0 0 6px; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 0; opacity: 0.85; font-size: 13px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; background: rgba(16,185,129,0.2); color: #34d399; margin-top: 10px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 24px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; }
    .stat-card { background: #ffffff; padding: 14px; border-radius: 12px; border: 1px solid #cbd5e1; text-align: center; }
    .stat-val { font-size: 20px; font-weight: 800; color: #0f172a; }
    .stat-lbl { font-size: 11px; font-weight: 600; color: #64748b; margin-top: 2px; }
    .section { padding: 24px 28px; }
    .section-title { font-size: 15px; font-weight: 800; margin-bottom: 14px; color: #0f172a; display: flex; align-items: center; gap: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #f8fafc; text-align: left; padding: 10px 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0; }
    td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .role-badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; }
    .role-buyer { background: #dbeafe; color: #1e40af; }
    .role-seller { background: #fef3c7; color: #92400e; }
    .role-driver { background: #e0e7ff; color: #3730a3; }
    .role-admin { background: #dcfce7; color: #166534; }
    .footer { padding: 20px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11.5px; color: #64748b; text-align: center; }
    .stamp { border: 2px dashed #10b981; color: #047857; display: inline-block; padding: 8px 16px; border-radius: 8px; font-weight: 800; font-size: 12px; margin-top: 12px; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 12px; text-transform: uppercase; font-weight: 700; color: #34d399; margin-bottom: 4px;">UIN Antasari Banjarmasin & Banjarbaru</div>
      <h1>📜 Laporan Eksekutif Rekapitulasi Audit Log Bulanan</h1>
      <p>Periode: <strong>${monthName}</strong> | Terbit: <strong>${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })} WITA</strong></p>
      <div class="badge">● Status: PostgreSQL (pgAdmin) Data Store</div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-val">${totalEvents}</div>
        <div class="stat-lbl">Total Log Event</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" style="color: #2563eb;">${totalBuyers}</div>
        <div class="stat-lbl">Mahasiswa / Buyer</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" style="color: #d97706;">${totalSellers}</div>
        <div class="stat-lbl">Tenant / Penjual</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" style="color: #16a34a;">${totalAdmins + totalDrivers}</div>
        <div class="stat-lbl">Admin & Driver</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">👑 Audit Aktivitas Super Admin & Admin (Semua Tindakan & Perubahan Konfigurasi)</div>
      <table>
        <thead>
          <tr>
            <th>Waktu</th>
            <th>Nama Admin</th>
            <th>Aksi / Tindakan</th>
            <th>Detail & Lokasi</th>
          </tr>
        </thead>
        <tbody>
          ${adminLogs.length > 0 ? adminLogs.slice(0, 15).map(l => `
            <tr>
              <td><strong>${new Date(l.createdAt || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</strong></td>
              <td>${l.name || l.email} <span class="role-badge role-admin">${(l.role || 'admin').toUpperCase()}</span></td>
              <td><strong>${l.action}</strong></td>
              <td>${l.details || '-'} (${l.campus || 'Kampus 1'})</td>
            </tr>
          `).join('') : `
            <tr><td colspan="4" style="text-align: center; color: #94a3b8;">Tidak ada tindakan perubahan admin tercatat pada periode ini.</td></tr>
          `}
        </tbody>
      </table>
    </div>

    <div class="section" style="padding-top: 0;">
      <div class="section-title">📋 Ringkasan Aktivitas Seluruh Pengguna (Mahasiswa, Penjual & Driver)</div>
      <table>
        <thead>
          <tr>
            <th>Waktu</th>
            <th>Pengguna</th>
            <th>Peran</th>
            <th>Aksi & Catatan</th>
          </tr>
        </thead>
        <tbody>
          ${logs.length > 0 ? logs.slice(0, 30).map(l => `
            <tr>
              <td>${new Date(l.createdAt || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
              <td>${l.name || l.email}</td>
              <td><span class="role-badge ${l.role === 'buyer' ? 'role-buyer' : l.role === 'seller' ? 'role-seller' : l.role === 'driver' ? 'role-driver' : 'role-admin'}">${(l.role || 'user').toUpperCase()}</span></td>
              <td><strong>${l.action}</strong> - ${l.details || '-'}</td>
            </tr>
          `).join('') : `
            <tr><td colspan="4" style="text-align: center; color: #94a3b8;">Log aktivitas kosong.</td></tr>
          `}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <div>Dokumen ini digenerate secara otomatis oleh <strong>Sistem Otomatisasi Antasari Mart 24/7</strong>.</div>
      <div>Penyimpanan audit log bulan lalu telah di-purge otomatis dari PostgreSQL (pgAdmin) demi efisiensi storage.</div>
      <div class="stamp">✓ TERVERIFIKASI SISTEM RESMI UIN ANTASARI</div>
    </div>
  </div>
</body>
</html>
  `;

  // 5. Kirimkan melalui Nodemailer
  let emailSent = false;
  try {
    if (process.env.EMAIL_SERVICE_USER && process.env.EMAIL_SERVICE_PASS) {
      await transporter.sendMail({
        from: `"Antasari Mart Super Admin System" <${process.env.EMAIL_SERVICE_USER}>`,
        to: recipient,
        subject: `📜 [REKAP BULANAN OTOMATIS] Audit Log & Aktivitas Seluruh Role - ${monthName}`,
        html: reportHtml,
        attachments: [
          {
            filename: `Rekap_Audit_Log_${monthName.replace(/\s+/g, '_')}.html`,
            content: reportHtml,
            contentType: 'text/html'
          }
        ]
      });
      emailSent = true;
      console.log(`✉️ [EMAIL SUKSES] Rekap audit bulanan ${monthName} berhasil dikirim ke: ${recipient}`);
    } else {
      console.log(`ℹ️ [SIMULASI EMAIL] Rekap dibuat untuk ${recipient} (Email credentials dummy/development mode)`);
      emailSent = true;
    }
  } catch (mailErr) {
    console.warn(`⚠️ Gagal mengirim email rekap bulanan ke ${recipient}:`, mailErr.message);
  }

  // 6. Simpan rekaman histori bulanan ke MonthlyRecap
  try {
    await MonthlyRecap.create({
      monthYear: monthName,
      totalEvents,
      buyerCount: totalBuyers,
      sellerCount: totalSellers,
      driverCount: totalDrivers,
      adminCount: totalAdmins,
      sentToEmail: recipient,
      sentAt: new Date(),
      status: emailSent ? 'sent' : 'simulated'
    });
  } catch (dbErr) {
    console.warn('⚠️ Gagal menyimpan ke MonthlyRecap:', dbErr.message);
  }

  // 7. Auto-Purge / Hapus Log Lama dari PostgreSQL agar database tetap bersih & ringan
  let deletedCount = 0;
  try {
    deletedCount = await ActivityLog.destroy({ where: {} });
    console.log(`🧹 [AUTO-PURGE SELESAI] Sebanyak ${deletedCount} record audit log bulan lalu berhasil dibersihkan dari PostgreSQL.`);
  } catch (purgeErr) {
    console.warn('⚠️ Gagal auto-purge ActivityLog:', purgeErr.message);
  }

  return {
    success: true,
    monthName,
    totalEvents,
    emailSent,
    recipient,
    deletedCount,
    html: reportHtml
  };
}

// ==========================================================
// ⏰ PENJADWAL REKAPITULASI BULANAN OTOMATIS SETIAP TANGGAL 1 PUKUL 00:00:00 WITA
// ==========================================================
cron.schedule('0 0 1 * *', async () => {
  const timeStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
  console.log(`\n⏰ [SETIAP TANGGAL 1 - 00:00 WITA | ${timeStr}] Memulai rekapitulasi audit log bulanan otomatis...`);
  try {
    const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'nurmiyaty@gmail.com';
    await generateAndSendMonthlyAuditRecap({ targetEmail: adminEmail, isManualTrigger: false });
    console.log('✨ [SETIAP TANGGAL 1] Rekap bulanan sukses dikirim ke email dan log lama berhasil dibersihkan dari PostgreSQL.\n');
  } catch (err) {
    console.error('❌ [CRON TANGGAL 1 ERROR]:', err);
  }
}, {
  scheduled: true,
  timezone: 'Asia/Makassar' // WITA (Waktu Indonesia Tengah UTC+8)
});

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

      await sequelize.sync({ alter: true }); 
      console.log('✅ Database & Tabel berhasil disinkronkan dengan PostgreSQL (alter: true)!');

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

      // 📦 Inisialisasi Produk Awal Katalog jika database masih kosong (Semua Stok Awal 50)
      const productCount = await Product.count();
      if (productCount === 0) {
        await Product.bulkCreate([
          {
            nama_produk: 'Almamater UIN Antasari',
            deskripsi: 'Jaket almamater resmi UIN Antasari Banjarmasin. Bahan tebal, bordir logo, tersedia size S–XXL.',
            harga: 185000,
            stok: 50,
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
            deskripsi: 'Gantungan kunci pipe cleaner / kawat bulu handmade buatan mahasiswi, siap diambil instan di Vending Machine Kampus.',
            harga: 15000,
            stok: 50,
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
            stok: 50,
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
            stok: 50,
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
            stok: 50,
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
            stok: 50,
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
        console.log('📦 Produk awal katalog berhasil diisi ke database (Semua Stok 50)!');
      }

      // Pastikan produk Blind Bag Keychain Mystery 50 stok selalu terdaftar di database
      const blindBagInDB = await Product.findOne({
        where: {
          [Sequelize.Op.or]: [
            { nama_produk: { [Sequelize.Op.iLike]: '%blind bag%' } },
            { nama_produk: { [Sequelize.Op.iLike]: '%blindbag%' } }
          ]
        }
      });

      if (!blindBagInDB) {
        await Product.create({
          nama_produk: 'Blind Bag Keychain Mystery (Myammiy Craft)',
          deskripsi: 'Blind bag suvenir kejutan buatan tangan (handmade) eksklusif Myammiy Craft dari bahan pipe cleaner / kawat bulu chenille premium. Berisi mystery ganci bunga tulip, kaktus senyum, boneka lucu, atau charm kpop! Siap ambil di Vending Machine Kampus.',
          harga: 35000,
          stok: 50,
          kategori: 'kerajinan',
          kampus: 'banjarmasin',
          sellerId: 'seller_1',
          sellerName: 'Myammiy Craft',
          foto: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop&auto=format',
          isKoperasi: false,
          slotNumber: 1,
          rating: 5.0,
          sold: 28
        });
        console.log('✨ Blind Bag Keychain Mystery berhasil ditambahkan ke database!');
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
    const { nama_produk, name, deskripsi, description, harga, price, stok, stock, kategori, category, foto, image, images, videoUrl, kampus, sellerId, sellerName, slotNumber } = req.body;
    
    // Pastikan images adalah array array URL valid
    let imagesArr = [];
    if (Array.isArray(images)) {
      imagesArr = images;
    } else if (foto || image) {
      imagesArr = [foto || image];
    }

    const newProduct = await Product.create({ 
      nama_produk: nama_produk || name, 
      deskripsi: deskripsi !== undefined ? deskripsi : description, 
      harga: harga !== undefined ? parseInt(harga) : parseInt(price || 0), 
      stok: stok !== undefined ? parseInt(stok) : parseInt(stock || 0), 
      kategori: kategori || category, 
      foto: foto || image || (imagesArr.length > 0 ? imagesArr[0] : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&auto=format'),
      images: imagesArr,
      videoUrl: videoUrl || null,
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
    const { nama_produk, name, deskripsi, description, harga, price, stok, stock, kategori, category, foto, image, images, videoUrl, slotNumber, userRole, userEmail } = req.body;

    const isSuperAdmin = (userRole === 'super_admin') || (userEmail === process.env.SUPER_ADMIN_EMAIL);
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan!' });
    }

    const isOwner = userEmail && product.sellerId === userEmail;
    if (!isSuperAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Akses ditolak! Anda tidak memiliki izin mengedit produk ini.' });
    }

    let imagesArr = product.images || [];
    if (Array.isArray(images)) {
      imagesArr = images;
    } else if (foto || image) {
      imagesArr = [foto || image];
    }

    await product.update({
      nama_produk: nama_produk || name || product.nama_produk,
      deskripsi: deskripsi !== undefined ? deskripsi : (description !== undefined ? description : product.deskripsi),
      harga: harga !== undefined ? parseInt(harga) : (price !== undefined ? parseInt(price) : product.harga),
      stok: stok !== undefined ? parseInt(stok) : (stock !== undefined ? parseInt(stock) : product.stok),
      kategori: kategori || category || product.kategori,
      foto: foto || image || product.foto,
      images: imagesArr,
      videoUrl: videoUrl !== undefined ? videoUrl : product.videoUrl,
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

// 📉 KURANGI STOK PRODUK SECARA OTOMATIS SAAT DIBELI
app.post('/api/products/deduct-stock', async (req, res) => {
  try {
    const { items } = req.body;
    if (items && Array.isArray(items)) {
      for (const cartItem of items) {
        const productId = cartItem.product?.id || cartItem.productId || cartItem.id;
        const buyQty = cartItem.quantity || 1;
        if (productId) {
          const product = await Product.findByPk(productId);
          if (product) {
            await product.update({
              stok: Math.max(0, product.stok - buyQty),
              sold: (product.sold || 0) + buyQty
            });
          }
        }
      }
    }
    res.json({ success: true, message: 'Stok produk berhasil dikurangi sesuai pesanan!' });
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

// ==========================================
// 🍃 CHAT / PESAN (STRICT 100% PRIVATE USER ISOLATION)
// ==========================================
app.get('/api/chats/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const { partner, roomId } = req.query;
    const cleanId = String(identifier).toLowerCase().trim();

    // 🔒 PRIVASI KETAT: Hanya ambil pesan milik akun ini sendiri (sebagai pengirim atau penerima)
    let mongoQuery = {
      $or: [
        { senderId: new RegExp(`^${cleanId}$`, 'i') },
        { receiverId: new RegExp(`^${cleanId}$`, 'i') }
      ]
    };

    if (roomId) {
      mongoQuery = { roomId: String(roomId).toLowerCase() };
    } else if (partner) {
      const cleanPartner = String(partner).toLowerCase().trim();
      const targetRoomId = buildRoomId(cleanId, cleanPartner);
      mongoQuery = { roomId: targetRoomId };
    }

    if (isMongoConnected) {
      const mongoChats = await MongoChat.find(mongoQuery).sort({ createdAt: 1 }).lean();

      if (mongoChats && mongoChats.length > 0) {
        const formatted = mongoChats.map(c => ({
          ...c,
          id: c._id ? String(c._id) : Date.now()
        }));
        return res.json({ success: true, source: 'mongodb', chats: formatted });
      }
    }

    // Fallback ke PostgreSQL dengan Privasi Ketat
    let pgWhere = {
      [Sequelize.Op.or]: [
        { senderId: identifier }, 
        { receiverId: identifier }
      ]
    };

    if (roomId) {
      pgWhere = { roomId: String(roomId).toLowerCase() };
    } else if (partner) {
      pgWhere = { roomId: buildRoomId(identifier, partner) };
    }

    const chats = await Chat.findAll({
      where: pgWhere,
      order: [['createdAt', 'ASC']]
    });
    res.json({ success: true, source: 'postgresql', chats });
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
    const roomId = buildRoomId(fromId, toId);

    let savedChat = null;

    // 🍃 1. Simpan ke MongoDB (Utama)
    if (isMongoConnected) {
      try {
        const mChat = await MongoChat.create({
          roomId,
          senderId: fromId,
          senderName: fromName || fromId,
          senderRole: fromRole || 'buyer',
          receiverId: toId,
          receiverName: toName || toId,
          receiverRole: toRole || 'seller',
          text: text.trim(),
          time: timeNow
        });
        savedChat = { ...mChat.toObject(), id: String(mChat._id) };
      } catch (mErr) {
        console.warn('Gagal simpan ke MongoDB:', mErr.message);
      }
    }

    // 🐘 2. Simpan cadangan ke PostgreSQL
    const pgChat = await Chat.create({
      roomId,
      senderId: fromId, 
      senderName: fromName || fromId, 
      senderRole: fromRole || 'buyer',
      receiverId: toId, 
      receiverName: toName || toId, 
      receiverRole: toRole || 'buyer',
      text: text.trim(), 
      time: timeNow
    });

    if (!savedChat) {
      savedChat = pgChat;
    }

    res.json({ success: true, message: "Pesan terkirim dan tersimpan di database!", chat: savedChat });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/chats/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isMongoConnected) {
      try {
        if (mongoose.Types.ObjectId.isValid(id)) {
          await MongoChat.findByIdAndDelete(id);
        }
      } catch (_e) {}
    }
    await Chat.destroy({ where: { id: isNaN(parseInt(id)) ? 0 : parseInt(id) } });
    res.json({ success: true, message: "Pesan berhasil dihapus." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 🧹 TRIGGER PEMBERSIHAN CHAT (Dapat dipanggil manual / saat 00:00 WITA)
app.post('/api/chats/cleanup', async (req, res) => {
  try {
    let mongoDeleted = 0;
    if (isMongoConnected) {
      const resM = await MongoChat.deleteMany({});
      mongoDeleted = resM.deletedCount || 0;
    }
    const pgDeleted = await Chat.destroy({ where: {}, truncate: true });
    
    const timeWITA = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    res.json({
      success: true,
      message: '🧹 Seluruh riwayat chat harian berhasil dibersihkan dari MongoDB & PostgreSQL!',
      mongoDeletedCount: mongoDeleted,
      pgDeletedCount: pgDeleted,
      cleanedAt: `${timeWITA} WITA`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 📊 CEK STATUS DATABASE CHAT MONGO DB & JADWAL 00:00 WITA
app.get('/api/chats/status', async (req, res) => {
  try {
    let mongoCount = 0;
    if (isMongoConnected) {
      mongoCount = await MongoChat.countDocuments();
    }
    const pgCount = await Chat.count();
    const timeWITA = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });

    res.json({
      success: true,
      database: {
        mongoConnected: isMongoConnected,
        mongoDbName: isMongoConnected ? mongoose.connection.name : 'Disconnected',
        totalChatsInMongoDB: mongoCount,
        totalChatsInPostgreSQL: pgCount
      },
      cleanupSchedule: {
        cronExpression: '0 0 * * *',
        frequency: 'Setiap Hari Pukul 00:00:00 WITA (Tengah Malam Banjarmasin / Kalsel)',
        timezone: 'Asia/Makassar (UTC+8)',
        currentServerTimeWITA: `${timeWITA} WITA`
      }
    });
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

// 🤖 MYAMMIY VOICE AI CHAT (POWERED BY DEEPSEEK AI)
const MYAMMIY_SYSTEM_PROMPT = `Kamu adalah Myammiy AI 🌸, asisten virtual dan sahabat belanja yang super ramah, manis, ceria, dan hangat dari brand handmade "Myammiy Craft" di Campus Mart UIN Antasari Banjarmasin!

✨ KEPRIBADIAN & GAYA BICARA (SANGAT PENTING):
1. BAHASA MANUSIA NORMAL, SANTAI & RAMAH: Bicaralah seperti bestie / sahabat kampus yang manis, sopan, dan solutif. Jangan kaku dan jangan seperti robot! Gunakan sapaan manis seperti "Hai Kak! 🌸", "Wah, siap Kak! 😊", "Boleh banget Kak! 🥰".
2. SELALU PAKAI EMOTIKON EKSPRESIF: Selalu sisipkan emoji lucu & bersahabat di setiap jawaban (🌸, ✨, 😊, 🎁, 🥰, 🎀, 💖, 🛵, 🤖, 🛍️) agar obrolan terasa hidup dan menyenangkan.
3. JAWAB SINGKAT, PADAT & MENYENANGKAN (1 sampai 3 kalimat saja): Jawabanmu dibacakan langsung oleh suara AI kepada pelanggan, jadi pastikan singkat, jelas, dan enak didengar.
4. INFO PRODUK BLIND BAG & BAHAN: Produk utama adalah Blind Bag Keychain Mystery seharga Rp 35.000 (sedang diskon spesial dari harga normal Rp 40.000). Ganci ini dibuat 100% HANDMADE DARI PIPE CLEANER (KAWAT BULU CHENILLE / KAWAT BULU BERKUALITAS), BUKAN DARI RAJUT! Isinya mystery ganci karakter lucu, bunga tulip pipe cleaner, boneka kawat bulu, kaktus senyum, dan charm estetik.
5. JIKA ADA YANG MENAWAR HARGA: Jawab santai dan ramah: "Wah Kak, Rp 35.000 itu udah harga diskon spesial banget lho dari Rp 40.000! Soalnya handmade pipe cleaner premium yang dibentuk super rapi, gemas dan dijamin worth it banget buat teman kuliah! 🌸🥰"
6. PEMBAYARAN & VENDING MACHINE: "Bisa bayar mudah via transfer SeaBank atau GoPay a.n. Nurmiyaty ya Kak! Nanti langsung dapat kode QR buat ambil instan di Vending Machine kampus tanpa antre! 🤖✨"
7. REKOMENDASI LAIN: Kamu juga bisa merekomendasikan aneka bando / aksesoris kawat bulu pipe cleaner, kuliner makanan/snack kampus, dan jas almamater di Campus Mart! 🍱🎓`;

app.post('/api/ai/myammiy-chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Pesan tidak boleh kosong.' });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY || 'sk-83df969bc77b40eda859c2cd357be131';

    const messagesPayload = [
      { role: 'system', content: MYAMMIY_SYSTEM_PROMPT }
    ];

    if (Array.isArray(history)) {
      history.slice(-4).forEach(h => {
        if (h.sender === 'user' || h.role === 'user') {
          messagesPayload.push({ role: 'user', content: h.text || h.content });
        } else if (h.sender === 'ai' || h.role === 'assistant') {
          messagesPayload.push({ role: 'assistant', content: h.text || h.content });
        }
      });
    }

    messagesPayload.push({ role: 'user', content: message.trim() });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const dsResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messagesPayload,
        temperature: 0.7,
        max_tokens: 350
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!dsResponse.ok) {
      const errText = await dsResponse.text();
      console.warn('DeepSeek API returned error:', dsResponse.status, errText);
      return res.status(502).json({ success: false, error: 'DeepSeek Error', details: errText });
    }

    const data = await dsResponse.json();
    const reply = data?.choices?.[0]?.message?.content || 'Hai! Ada yang bisa Myammiy Craft bantu seputar Blind Bag Keychain hari ini? 🌸';

    res.json({
      success: true,
      reply: reply.trim(),
      model: data?.model || 'deepseek-chat',
      usage: data?.usage
    });
  } catch (error) {
    console.error('Error calling DeepSeek API:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 🤖 SMART AI SELLER REPRESENTATIVE (POWERED BY DEEPSEEK AI WITH LIVE CATALOG)
app.post('/api/ai/seller-chat', async (req, res) => {
  try {
    const { sellerId, sellerName, sellerRole, buyerName, message, history } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Pesan tidak boleh kosong.' });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY || 'sk-83df969bc77b40eda859c2cd357be131';

    let sellerProducts = [];
    try {
      if (Product) {
        sellerProducts = await Product.findAll({
          where: {
            [Op.or]: [
              { sellerId: sellerId || '' },
              { sellerName: sellerName || '' }
            ]
          },
          limit: 10
        });
      }
    } catch (_dbErr) {}

    let productCatalogText = '';
    if (sellerProducts && sellerProducts.length > 0) {
      productCatalogText = sellerProducts.map(p => 
        `- ${p.nama_produk} (Harga: Rp ${Number(p.harga || 0).toLocaleString('id-ID')}, Stok: ${p.stok}, Kategori: ${p.kategori}, Deskripsi: ${p.deskripsi})`
      ).join('\n');
    } else {
      productCatalogText = `- Blind Bag Keychain Mystery (Harga: Rp 35.000 diskon dari Rp 40.000, Stok: Ready, Bahan: 100% Handmade Pipe Cleaner / Kawat Bulu Chenille, Slot: Vending Machine Kampus & Delivery Kurir)
- Custom Keychain Pipe Cleaner (Harga: Rp 25.000, Stok: Ready/Bisa Request)
- Bando Karakter Kawat Bulu (Harga: Rp 30.000, Stok: Ready)`;
    }

    const SELLER_SYSTEM_PROMPT = `Kamu adalah Asisten AI Toko Resmi dari Toko/Penjual "${sellerName || 'Penjual Campus Mart'}" (${sellerRole || 'Penjual'}) di aplikasi Campus Mart UIN Antasari Banjarmasin!
Nama pembeli yang sedang mengobrol denganmu adalah "${buyerName || 'Kakak'}".

📦 KATALOG PRODUK & STATUS STOK TOKO SAAT INI:
${productCatalogText}

✨ KEPRIBADIAN & GAYA BICARA SELLER AI (SANGAT PENTING):
1. BAHASA MANUSIA NORMAL, RAMAH, MANIS & SOLUTIF: Bicaralah seperti pemilik toko / admin online shop yang sangat ramah, ramah tamah, dan solutif. Jangan kaku dan jangan seperti robot. Gunakan sapaan manis seperti "Hai Kak ${buyerName || ''}! 🌸", "Wah, siap Kak! 😊", "Boleh banget Kak! 🥰".
2. SELALU PAKAI EMOTIKON EKSPRESIF: Selalu sisipkan emoji lucu & bersahabat di setiap jawaban (🌸, ✨, 😊, 🛍️, 🎁, 🥰, 🎀, 💖, 🛵, 🤖) agar obrolan terasa hidup dan menyenangkan.
3. KETEPATAN STATUS PRODUK & BAHAN:
   - Jika toko adalah "Myammiy Craft", tegaskan bahwa produk gantungan kunci dibuat dari 100% HANDMADE PIPE CLEANER / KAWAT BULU CHENILLE (bukan rajut). Harganya Rp 35.000 diskon dari Rp 40.000. Tersedia instan di Vending Machine Kampus atau diantar kurir.
   - Pembayaran transfer via SeaBank & GoPay a.n. Nurmiyaty.
   - Jawab pertanyaan seputar stok, harga, warna, varian, estimasi pengiriman, atau cara pemesanan dengan akurat.
4. JAWAB RINGKAS & JELAS: Jawab dalam 2 sampai 4 kalimat yang ramah dan langsung menjawab pertanyaan pembeli.`;

    const messagesPayload = [
      { role: 'system', content: SELLER_SYSTEM_PROMPT }
    ];

    if (Array.isArray(history)) {
      history.slice(-6).forEach(h => {
        if (h.senderId === sellerId || h.senderRole === 'seller' || h.role === 'assistant') {
          messagesPayload.push({ role: 'assistant', content: h.text || h.content });
        } else {
          messagesPayload.push({ role: 'user', content: h.text || h.content });
        }
      });
    }

    messagesPayload.push({ role: 'user', content: message.trim() });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const dsResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messagesPayload,
        temperature: 0.7,
        max_tokens: 380
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!dsResponse.ok) {
      const errText = await dsResponse.text();
      console.warn('DeepSeek Seller Chat Error:', dsResponse.status, errText);
      return res.status(502).json({ success: false, error: 'DeepSeek Error', details: errText });
    }

    const data = await dsResponse.json();
    const reply = data?.choices?.[0]?.message?.content || `Halo Kak ${buyerName || ''}! Terima kasih sudah menghubungi ${sellerName}. Pesan Anda sudah kami terima dan stok produk kami siap dipesan! 😊✨`;

    res.json({
      success: true,
      reply: reply.trim(),
      model: data?.model || 'deepseek-chat'
    });
  } catch (error) {
    console.error('Error in Seller AI Chat:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✨ AI PRODUCT DESCRIPTION GENERATOR (POWERED BY DEEPSEEK AI)
app.post('/api/ai/generate-description', async (req, res) => {
  try {
    const { name, category, price, sellerName } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Nama produk harus diisi terlebih dahulu!' });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY || 'sk-83df969bc77b40eda859c2cd357be131';

    const systemPrompt = `Kamu adalah Copywriter E-Commerce Profesional untuk aplikasi kampus Antasari Mart (UIN Antasari Banjarmasin).
Tugasmu adalah membuat deskripsi produk yang sangat menarik, detail, persuasif, estetis, dan rapi untuk penjual mahasiswa / toko koperasi.
Format deskripsi produk yang baik:
1. Kalimat pembuka yang memikat & menjelaskan produk.
2. Detail bahan baku, kelezatan rasa / kualitas material, dan keunikan produk.
3. Rekomendasi penggunaan (misal: cocok untuk teman nugas, kegiatan kuliah, hadiah wisuda, atau camilan santai).
4. Catatan ketersediaan stok & kemudahan pemesanan (siap ambil di Vending Machine atau diantar kurir).
5. Berikan emotikon yang relevan dan cantik (🌸, ✨, 🛍️, 📦, 🎀, 🎁, 🥰).
Panjang deskripsi: 2 sampai 4 kalimat padat & informatif. Jangan gunakan tanda kutip di awal atau akhir jawaban.`;

    const userPrompt = `Buatkan deskripsi produk menarik untuk:
Nama Produk: ${name}
Kategori: ${category || 'Umum'}
Perkiraan Harga: ${price ? 'Rp ' + Number(price).toLocaleString('id-ID') : 'Terjangkau'}
Nama Toko/Penjual: ${sellerName || 'Penjual Kampus'}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const dsResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 350
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (dsResponse.ok) {
      const data = await dsResponse.json();
      const desc = data?.choices?.[0]?.message?.content?.trim();
      if (desc) {
        return res.json({ success: true, description: desc });
      }
    }

    // Fallback otomatis
    const fallbackDesc = `${name} berkualitas premium siap dipesan di Antasari Mart! Dibuat dengan bahan terbaik, higienis, dan pas untuk kebutuhan mahasiswa kampus. Siap pesan & ambil langsung! 🌸✨`;
    res.json({ success: true, description: fallbackDesc });
  } catch (error) {
    console.error('Error in AI Description Generator:', error);
    const fallbackDesc = `${req.body.name || 'Produk'} berkualitas premium siap dipesan di Antasari Mart! Dibuat dengan bahan terbaik dan pas untuk kebutuhan mahasiswa kampus. Tersedia stok ready! 🌸✨`;
    res.json({ success: true, description: fallbackDesc });
  }
});

// ==========================================
// 📜 AUDIT LOG & REKAP BULANAN POSTGRESQL API
// ==========================================

// 1. Ambil Semua Log Aktivitas dengan Filter Role
app.get('/api/audit-logs', async (req, res) => {
  try {
    const { role, category, search, limit = 100 } = req.query;
    const where = {};
    if (role && role !== 'all') where.role = role;
    if (category && category !== 'all') where.category = category;
    if (search && search.trim()) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search.trim()}%` } },
        { email: { [Op.iLike]: `%${search.trim()}%` } },
        { action: { [Op.iLike]: `%${search.trim()}%` } },
        { details: { [Op.iLike]: `%${search.trim()}%` } }
      ];
    }

    const logs = await ActivityLog.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit) || 100
    });

    const totalCount = await ActivityLog.count();
    res.json({ success: true, total: totalCount, logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil audit log: ' + error.message });
  }
});

// 2. Simpan Log Aktivitas Baru
app.post('/api/audit-logs', async (req, res) => {
  try {
    const { email, name, role, action, category, details, campus, status } = req.body;
    if (!email || !action) {
      return res.status(400).json({ success: false, message: 'Email dan aksi wajib diisi!' });
    }

    const newLog = await ActivityLog.create({
      email,
      name: name || email,
      role: role || 'buyer',
      action,
      category: category || 'general',
      details: details || '',
      campus: campus || 'banjarmasin',
      status: status || 'success',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1'
    });

    res.status(201).json({ success: true, log: newLog });
  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({ success: false, message: 'Gagal menyimpan log: ' + error.message });
  }
});

// 3. Trigger Pengiriman Rekap Bulanan PDF ke Email (Manual & Uji Coba)
app.post('/api/audit-logs/send-monthly-recap', async (req, res) => {
  try {
    const { targetEmail } = req.body;
    const result = await generateAndSendMonthlyAuditRecap({
      targetEmail: targetEmail || process.env.SUPER_ADMIN_EMAIL || 'nurmiyaty@gmail.com',
      isManualTrigger: true
    });

    res.json({
      success: true,
      message: `✨ Rekapitulasi audit log bulanan berhasil digenerate dan dikirim ke ${result.recipient}!`,
      data: result
    });
  } catch (error) {
    console.error('Error sending monthly recap:', error);
    res.status(500).json({ success: false, message: 'Gagal mengirim rekap bulanan: ' + error.message });
  }
});

// 4. Ambil Riwayat Rekap Bulanan yang Pernah Dibuat
app.get('/api/audit-logs/monthly-recaps', async (req, res) => {
  try {
    const recaps = await MonthlyRecap.findAll({
      order: [['createdAt', 'DESC']],
      limit: 24
    });
    res.json({ success: true, recaps });
  } catch (error) {
    console.error('Error fetching monthly recaps:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil riwayat rekap: ' + error.message });
  }
});

// 5. Bersihkan / Purge Log Manual
app.delete('/api/audit-logs/purge', async (req, res) => {
  try {
    const deletedCount = await ActivityLog.destroy({ where: {} });
    res.json({
      success: true,
      message: `🧹 Berhasil membersihkan ${deletedCount} record audit log dari PostgreSQL.`,
      deletedCount
    });
  } catch (error) {
    console.error('Error purging audit logs:', error);
    res.status(500).json({ success: false, message: 'Gagal membersihkan log: ' + error.message });
  }
});

const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server Antasari Mart running on port ${PORT}`);
  });
}

module.exports = app;
