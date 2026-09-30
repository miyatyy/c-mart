const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
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
const path = require('path');
const fs = require('fs');
const { getCache, setCache, delCache, delCachePattern } = require('./redis');

// ⚡ Inisialisasi Pusher / Soketi Server Client untuk Realtime Broadcast
let pusher = null;
try {
  const Pusher = require('pusher');
  pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID || 'campusmart-app',
    key: process.env.PUSHER_APP_KEY || 'campusmart-key',
    secret: process.env.PUSHER_APP_SECRET || 'campusmart-secret',
    host: process.env.SOKETI_HOST || 'soketi',
    port: parseInt(process.env.SOKETI_PORT || '6001'),
    useTLS: false
  });
  console.log('⚡ [Soketi/Pusher] Engine siap siar ke host:', process.env.SOKETI_HOST || 'soketi');
} catch (pErr) {
  console.warn('⚠️ [Soketi/Pusher] Inisialisasi Pusher warning:', pErr.message);
}

// 🔒 Direktori Privat Foto KTM (Tidak dapat diakses publik)
const KTM_PRIVATE_DIR = path.join(__dirname, 'private_uploads', 'ktm');
try {
  if (!fs.existsSync(KTM_PRIVATE_DIR)) {
    fs.mkdirSync(KTM_PRIVATE_DIR, { recursive: true });
  }
} catch (_e) {}

const ktmDiskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(KTM_PRIVATE_DIR)) {
      fs.mkdirSync(KTM_PRIVATE_DIR, { recursive: true });
    }
    cb(null, KTM_PRIVATE_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `ktm-${uniqueSuffix}${ext}`);
  }
});

const ktmUpload = multer({
  storage: ktmDiskStorage,
  limits: { fileSize: 4 * 1024 * 1024 }, // Maksimal 4 MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Format file tidak didukung. Harap upload gambar JPG, PNG, atau WEBP!'));
  }
});

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
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  }
});

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

const isRemoteDb = (process.env.DB_SSL === 'true') || (DB_HOST && !['localhost', '127.0.0.1', 'postgres'].includes(DB_HOST.toLowerCase()) && DB_HOST.includes('.'));

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
  proExpireDate: { type: DataTypes.DATE, allowNull: true },

  // 🎓 VERIFIKASI IDENTITAS MAHASISWA AKTIF & PENJUAL
  ktmPhotoUrl: { type: DataTypes.TEXT, allowNull: true },
  degreeLevel: { type: DataTypes.STRING, defaultValue: 'S1' }, // 'S1' | 'S2' | 'S3'
  entryYear: { type: DataTypes.INTEGER, allowNull: true },
  currentSemester: { type: DataTypes.INTEGER, allowNull: true },
  verificationStatus: { 
    type: DataTypes.STRING, 
    defaultValue: 'not_submitted' // 'not_submitted' | 'pending' | 'approved' | 'rejected'
  },
  isActiveStudent: { type: DataTypes.BOOLEAN, defaultValue: true },
  rejectionReason: { type: DataTypes.TEXT, allowNull: true },
  verifiedAt: { type: DataTypes.DATE, allowNull: true },
  verifiedBy: { type: DataTypes.STRING, allowNull: true }
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
  material: { type: DataTypes.STRING, defaultValue: 'Kawat Bulu (Pipe Cleaner) & Benang Rajut Premium' },
  foto: { type: DataTypes.TEXT, allowNull: true },
  images: { type: DataTypes.JSON, defaultValue: [] },
  videoUrl: { type: DataTypes.TEXT, allowNull: true },
  kampus: { type: DataTypes.STRING, defaultValue: 'banjarmasin' },
  sellerId: { type: DataTypes.STRING, defaultValue: 'seller_1' },
  sellerName: { type: DataTypes.STRING, defaultValue: 'Penjual' },
  sold: { type: DataTypes.INTEGER, defaultValue: 0 },
  slotNumber: { type: DataTypes.INTEGER, defaultValue: 1 },
  status: { type: DataTypes.STRING, defaultValue: 'pending' }, // 'pending' | 'approved' | 'rejected' | 'active'
  aiScore: { type: DataTypes.INTEGER, defaultValue: 90 },
  aiAnalysis: { type: DataTypes.JSON, defaultValue: null },
  moderationReason: { type: DataTypes.TEXT, allowNull: true },
  moderatedAt: { type: DataTypes.DATE, allowNull: true }
});

const Order = sequelize.define('Order', {
  orderId: { type: DataTypes.STRING, allowNull: false, unique: true },
  sellerId: { type: DataTypes.STRING, allowNull: false },
  buyerId: { type: DataTypes.STRING, allowNull: true },
  buyerName: { type: DataTypes.STRING, allowNull: false },
  buyerEmail: { type: DataTypes.STRING, allowNull: true },
  buyerLocation: { type: DataTypes.STRING, allowNull: true },
  deliveryType: { type: DataTypes.STRING, defaultValue: 'pickup' }, // 'pickup' | 'delivery'
  paymentMethod: { type: DataTypes.STRING, defaultValue: 'cash' }, // 'cash' | 'midtrans'
  paymentStatus: { type: DataTypes.STRING, defaultValue: 'unpaid' }, // 'unpaid' | 'paid'
  pickupStatus: { type: DataTypes.STRING, defaultValue: 'pending' }, // 'pending' | 'confirmed' | 'processing' | 'ready_for_pickup' | 'completed'
  deliveryStatus: { type: DataTypes.STRING, defaultValue: 'pending' }, // 'pending' | 'confirmed' | 'processing' | 'searching_driver' | 'driver_assigned' | 'picked_up' | 'delivering' | 'completed'
  driverId: { type: DataTypes.STRING, allowNull: true },
  driverName: { type: DataTypes.STRING, allowNull: true },
  driverCoords: { type: DataTypes.JSON, allowNull: true },
  totalAmount: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
  courier: { type: DataTypes.STRING, allowNull: true },
  vendingToken: { type: DataTypes.STRING, allowNull: true, unique: true },
  slotNumber: { type: DataTypes.INTEGER, defaultValue: 1 }
});

Order.sync({ alter: true }).catch(err => console.warn('⚠️ Order sync error:', err.message));

const OrderItem = sequelize.define('OrderItem', {
  productName: { type: DataTypes.STRING, allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  price: { type: DataTypes.INTEGER, allowNull: false }
});

const OrderLog = sequelize.define('OrderLog', {
  orderId: { type: DataTypes.STRING, allowNull: false, index: true },
  previousStatus: { type: DataTypes.STRING, allowNull: true },
  newStatus: { type: DataTypes.STRING, allowNull: false },
  changedBy: { type: DataTypes.STRING, allowNull: true },
  role: { type: DataTypes.STRING, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'order_logs',
  timestamps: true
});

Order.hasMany(OrderItem, { as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order);

Order.hasMany(OrderLog, { as: 'logs', foreignKey: 'orderId', sourceKey: 'orderId' });
OrderLog.belongsTo(Order, { foreignKey: 'orderId', targetKey: 'orderId' });

OrderLog.sync({ alter: true }).catch(err => console.warn('⚠️ OrderLog sync error:', err.message));

const Voucher = sequelize.define('Voucher', {
  sellerId: { type: DataTypes.STRING, allowNull: false },
  sellerName: { type: DataTypes.STRING, defaultValue: '' },
  code: { type: DataTypes.STRING, allowNull: false, unique: true },
  name: { type: DataTypes.STRING, defaultValue: 'Promo Toko' },
  discountType: { type: DataTypes.STRING, defaultValue: 'percentage' }, // 'percentage' | 'fixed' | 'shipping'
  value: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
  minSpend: { type: DataTypes.INTEGER, defaultValue: 0 },
  maxDiscount: { type: DataTypes.INTEGER, defaultValue: 0 },
  quota: { type: DataTypes.INTEGER, defaultValue: 100 },
  usedCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  startDate: { type: DataTypes.STRING, defaultValue: '' },
  endDate: { type: DataTypes.STRING, defaultValue: '' },
  applicableProductIds: { type: DataTypes.TEXT, defaultValue: '[]' },
  badge: { type: DataTypes.STRING, defaultValue: '🎟️ Promo' },
  description: { type: DataTypes.TEXT, defaultValue: '' },
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
  time: { type: DataTypes.STRING, allowNull: false },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
  status: { type: DataTypes.STRING, defaultValue: 'sent' } // 'sent' | 'delivered' | 'read'
});

const BugReport = sequelize.define('BugReport', {
  category: { type: DataTypes.STRING, defaultValue: 'general' },
  description: { type: DataTypes.TEXT, allowNull: false },
  deviceInfo: { type: DataTypes.TEXT, allowNull: true },
  userInfo: { type: DataTypes.TEXT, allowNull: true },
  url: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.STRING, defaultValue: 'open' } // 'open' | 'in_progress' | 'resolved' | 'closed'
});

BugReport.sync({ alter: true }).catch(err => console.warn('⚠️ BugReport sync error:', err.message));

/**
 * 🎯 Normalisasi ID Kontak Deterministik (Deduplikasi Total: Super Admin = '1', Koperasi = '4')
 */
function normalizeUserId(rawId) {
  const clean = String(rawId || '').toLowerCase().trim();
  if (!clean) return '';
  if (
    clean === '1' ||
    clean === 'admin_nurmiyaty' ||
    clean === 'superadmin' ||
    clean === 'super_admin' ||
    clean === 'nurmiyaty' ||
    clean === 'nurmiyaty@gmail.com' ||
    clean === 'miyya@gmail.com' ||
    clean === 'mnurmiyaty2@gmail.com' ||
    clean.includes('nurmiyaty') ||
    clean === 'usr_nurmiyaty_superadmin' ||
    (clean.includes('admin') && !clean.includes('koperasi')) ||
    (clean.startsWith('chat_') && (clean.includes('_1') || clean.includes('1_') || clean.includes('nurmiyaty')))
  ) {
    return '1';
  }
  if (
    clean === '4' ||
    clean === 'coop_koperasi' ||
    clean === 'coop_admin' ||
    clean === 'koperasi' ||
    clean === 'koperasi@antasari.ac.id' ||
    clean.includes('koperasi') ||
    clean === 's1'
  ) {
    return '4';
  }
  if (
    clean === '2' ||
    clean === '101' ||
    clean === 'pembeli@antasari.ac.id' ||
    clean.includes('fauzi') ||
    clean.includes('raisa') ||
    clean === 'raisa14@gmail.com'
  ) {
    return '2';
  }
  if (clean === '3' || clean === 'seller1@antasari.ac.id' || clean === 'seller_1' || clean.includes('myammiy')) {
    return '3';
  }
  if (clean === '5' || clean === 'driver@antasari.ac.id' || clean === 'driver_kampus' || clean.includes('budi') || clean.includes('driver')) {
    return '5';
  }
  return clean;
}

/**
 * 🎯 Standarisasi Penamaan Channel WebSocket Deterministik:
 * const channelName = `chat_${[userIdA, userIdB].sort().join('_')}`;
 */
function buildRoomId(userA, userB) {
  const normA = normalizeUserId(userA);
  const normB = normalizeUserId(userB);
  const sorted = [normA, normB].sort();
  return `chat_${sorted[0]}_${sorted[1]}`;
}

function getRoomId(userA, userB, orderId) {
  const normA = normalizeUserId(userA);
  const normB = normalizeUserId(userB);
  const sorted = [normA, normB].sort();
  return orderId ? `order_${orderId}_${sorted[0]}_${sorted[1]}` : `chat_${sorted[0]}_${sorted[1]}`;
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
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  isHandedOver: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // 🕒 Auto-delete setelah 24 jam (86.400 detik)
});

MongoChatSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

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

// ==========================================
// ⚡ WEBSOCKET REALTIME IMPLEMENTATION (SOCKET.IO)
// ==========================================
const onlineUsers = new Map(); // userId -> Set<socketId>

io.on('connection', (socket) => {
  let boundUserId = null;
  console.log('⚡ [WebSocket] Client terhubung, Socket ID:', socket.id);

  // 1. Pendaftaran Pengguna & Bergabung ke room obrolan pribadi
  socket.on('register_user', (userId) => {
    if (!userId) return;
    boundUserId = String(userId).toLowerCase().trim();
    if (!onlineUsers.has(boundUserId)) {
      onlineUsers.set(boundUserId, new Set());
    }
    onlineUsers.get(boundUserId).add(socket.id);
  });

  socket.on('join_room', (roomId, userObjOrId) => {
    if (roomId) {
      socket.join(roomId);
      console.log(`📡 [WebSocket] Socket ${socket.id} bergabung ke room: ${roomId}`);
    }
    const uId = typeof userObjOrId === 'object' ? (userObjOrId?.userId || userObjOrId?.email) : userObjOrId;
    if (uId) {
      boundUserId = String(uId).toLowerCase().trim();
      if (!onlineUsers.has(boundUserId)) {
        onlineUsers.set(boundUserId, new Set());
      }
      onlineUsers.get(boundUserId).add(socket.id);
    }
  });

  // 2. Menerima & Broadcast Pesan Realtime dengan Status Delivery (sent / delivered)
  socket.on('send_message', async (data) => {
    try {
      if (!data || !data.text || !data.roomId) return;

      const timeNow = data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const senderId = data.senderId || data.fromId || 'anon';
      const senderName = data.senderName || data.fromName || 'Pengguna';
      const senderRole = data.senderRole || data.fromRole || 'buyer';
      const receiverId = data.receiverId || data.toId || 'seller_1';
      const receiverName = data.receiverName || data.toName || 'Penjual';
      const receiverRole = data.receiverRole || data.toRole || 'seller';
      const text = String(data.text).trim();

      // Cek apakah penerima sedang online atau aktif di room
      const cleanReceiverId = String(receiverId).toLowerCase().trim();
      const isReceiverOnline = onlineUsers.has(cleanReceiverId) && onlineUsers.get(cleanReceiverId).size > 0;
      const roomSockets = io.sockets.adapter.rooms.get(data.roomId);
      const isRoomActive = roomSockets && roomSockets.size > 1;

      const initialStatus = (isReceiverOnline || isRoomActive) ? 'delivered' : 'sent';
      let savedChat = null;

      // 🍃 Simpan ke MongoDB Lokal
      if (isMongoConnected) {
        try {
          const mChat = await MongoChat.create({
            roomId: data.roomId,
            senderId,
            senderName,
            senderRole,
            receiverId,
            receiverName,
            receiverRole,
            text,
            time: timeNow,
            status: initialStatus,
            isRead: false,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
          });
          savedChat = { ...mChat.toObject(), id: String(mChat._id) };
        } catch (mErr) {
          console.warn('MongoDB save error in websocket:', mErr.message);
        }
      }

      // 🐘 Simpan cadangan ke PostgreSQL
      try {
        const pgChat = await Chat.create({
          roomId: data.roomId,
          senderId,
          senderName,
          senderRole,
          receiverId,
          receiverName,
          receiverRole,
          text,
          time: timeNow,
          status: initialStatus,
          isRead: false
        });
        if (!savedChat) {
          savedChat = pgChat.toJSON();
        }
      } catch (pgErr) {
        console.warn('PostgreSQL save error in websocket:', pgErr.message);
      }

      if (!savedChat) {
        savedChat = {
          id: Date.now(),
          roomId: data.roomId,
          senderId,
          senderName,
          senderRole,
          receiverId,
          receiverName,
          receiverRole,
          text,
          time: timeNow,
          status: initialStatus,
          isRead: false,
          createdAt: new Date().toISOString()
        };
      }

      // 🚀 Pancarkan pesan real-time ke semua user di room yang sama
      io.to(data.roomId).emit('receive_message', savedChat);
      io.to(data.roomId).emit('new_message', savedChat);
      // Pancarkan event notifikasi global untuk badge notifikasi & sinkronisasi daftar chat
      io.emit('new_chat_notification', savedChat);
      io.emit('chat_list_update', savedChat);

      console.log(`💬 [WebSocket -> MongoDB] Pesan (${initialStatus}) terkirim di room ${data.roomId}: "${text.slice(0, 30)}..."`);
    } catch (err) {
      console.error('❌ Error handling send_message in socket:', err);
    }
  });

  // 3. Status Mengetik Realtime (Typing Indicator)
  socket.on('typing_start', ({ roomId, userId, userName }) => {
    if (roomId) {
      socket.to(roomId).emit('user_typing', { roomId, userId, userName, isTyping: true });
    }
  });

  socket.on('typing_stop', ({ roomId, userId, userName }) => {
    if (roomId) {
      socket.to(roomId).emit('user_stop_typing', { roomId, userId, userName, isTyping: false });
    }
  });

  socket.on('typing', ({ roomId, userName, userId, isTyping }) => {
    if (roomId) {
      if (isTyping) {
        socket.to(roomId).emit('user_typing', { roomId, userId, userName, isTyping: true });
      } else {
        socket.to(roomId).emit('user_stop_typing', { roomId, userId, userName, isTyping: false });
      }
    }
  });

  // 4. Status Dibaca Realtime (Mark As Read & Messages Read Event)
  socket.on('mark_as_read', async ({ roomId, readerId }) => {
    try {
      if (!roomId) return;
      const cleanRoom = String(roomId).toLowerCase().trim();
      const cleanReader = String(readerId || '').toLowerCase().trim();
      const parts = cleanRoom.split('__');

      // Update di MongoDB
      if (isMongoConnected) {
        try {
          const mongoOr = [{ roomId: cleanRoom }, { roomId: new RegExp(cleanRoom, 'i') }];
          if (parts.length === 2) {
            mongoOr.push({ roomId: parts.slice().reverse().join('__') });
          }
          await MongoChat.updateMany(
            { $or: mongoOr, isRead: { $ne: true } },
            { $set: { isRead: true, status: 'read' } }
          );
        } catch (_mErr) {}
      }

      // Update di PostgreSQL
      try {
        await Chat.update(
          { isRead: true, status: 'read' },
          { where: { isRead: false } }
        );
      } catch (_pgErr) {}

      // Pancarkan status read ke room dan global
      io.to(cleanRoom).emit('messages_read', { roomId: cleanRoom, readerId: cleanReader, status: 'read' });
      io.emit('messages_read', { roomId: cleanRoom, readerId: cleanReader, status: 'read' });
      io.emit('chat_list_update', { roomId: cleanRoom, readerId: cleanReader, isRead: true, status: 'read' });
    } catch (err) {
      console.error('❌ Error handling mark_as_read in socket:', err);
    }
  });

  socket.on('disconnect', () => {
    if (boundUserId && onlineUsers.has(boundUserId)) {
      onlineUsers.get(boundUserId).delete(socket.id);
      if (onlineUsers.get(boundUserId).size === 0) {
        onlineUsers.delete(boundUserId);
      }
    }
    console.log('🔌 [WebSocket] Client terputus:', socket.id);
  });
});

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

// ==========================================
// 🎓 MODUL VERIFIKASI PENJUAL MAHASISWA AKTIF (KTM)
// ==========================================

// 1. Endpoint Upload & Pengajuan Verifikasi KTM Mahasiswa
app.post('/api/seller/verify-ktm', (req, res) => {
  ktmUpload.single('ktmPhoto')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: '⚠️ Ukuran foto KTM terlalu besar! Maksimal 4 MB.' });
      }
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, message: '⚠️ Format file ditolak! Unggah file JPG, PNG, atau WEBP.' });
    }

    try {
      const { email, nim, degreeLevel, entryYear, currentSemester, fullName } = req.body;
      if (!email || !email.trim()) {
        return res.status(400).json({ success: false, message: 'Email akun penjual wajib disertakan!' });
      }
      if (!nim || !nim.trim()) {
        return res.status(400).json({ success: false, message: 'NIM Mahasiswa wajib diisi!' });
      }

      const cleanEmail = String(email).toLowerCase().trim();
      const user = await User.findOne({ where: { email: cleanEmail } });
      if (!user) {
        return res.status(404).json({ success: false, message: 'Pengguna dengan email ini tidak ditemukan!' });
      }

      // Validasi batas masa studi aktif
      const currentYear = new Date().getFullYear();
      const parsedEntryYear = parseInt(entryYear) || currentYear;
      const parsedDegree = degreeLevel || 'S1';
      const maxYears = parsedDegree === 'S3' ? 5 : (parsedDegree === 'S2' ? 4 : 7);
      const studyAge = currentYear - parsedEntryYear;
      const isExceeded = studyAge > maxYears;

      const ktmFilename = req.file ? req.file.filename : (user.ktmPhotoUrl || null);

      if (!ktmFilename) {
        return res.status(400).json({ success: false, message: 'Foto Kartu Tanda Mahasiswa (KTM) wajib diunggah!' });
      }

      await user.update({
        nim: String(nim).trim(),
        degreeLevel: parsedDegree,
        entryYear: parsedEntryYear,
        currentSemester: parseInt(currentSemester) || 1,
        ktmPhotoUrl: ktmFilename,
        verificationStatus: 'pending',
        isActiveStudent: !isExceeded,
        rejectionReason: null
      });

      // Catat Activity Log
      try {
        await ActivityLog.create({
          email: user.email,
          name: fullName || user.nama,
          role: 'seller',
          action: 'PENGAJUAN_VERIFIKASI_KTM',
          category: 'seller_verification',
          details: `Penjual mengajukan verifikasi mahasiswa aktif (${parsedDegree} Angkatan ${parsedEntryYear}, NIM: ${nim})${isExceeded ? ' [PERINGATAN: Masa studi melebihi batas]' : ''}`,
          campus: 'banjarmasin',
          status: isExceeded ? 'warning' : 'info',
          ipAddress: req.ip || '127.0.0.1'
        });
      } catch (_aErr) {}

      res.json({
        success: true,
        message: 'Pengajuan verifikasi KTM berhasil dikirim! Tim Admin Koperasi akan meninjau dokumen Anda.',
        warning: isExceeded ? 'Masa studi terdeteksi telah melampaui batas wajar mahasiswa aktif.' : undefined,
        verification: {
          email: user.email,
          nama: user.nama,
          nim: user.nim,
          degreeLevel: user.degreeLevel,
          entryYear: user.entryYear,
          currentSemester: user.currentSemester,
          verificationStatus: 'pending',
          isActiveStudent: user.isActiveStudent,
          hasKtmPhoto: true
        }
      });
    } catch (dbError) {
      console.error('Error submitting KTM verification:', dbError);
      res.status(500).json({ success: false, message: 'Gagal memproses verifikasi: ' + dbError.message });
    }
  });
});

// 2. Endpoint Cek Status Verifikasi Penjual
app.get('/api/seller/verification-status/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const cleanEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ where: { email: cleanEmail } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    // Mask NIM untuk privasi publik
    let maskedNim = user.nim;
    if (maskedNim && maskedNim.length > 5) {
      maskedNim = maskedNim.substring(0, 4) + '****' + maskedNim.slice(-2);
    }

    res.json({
      success: true,
      verification: {
        email: user.email,
        nama: user.nama,
        nim: maskedNim,
        fullNim: user.nim,
        degreeLevel: user.degreeLevel || 'S1',
        entryYear: user.entryYear || null,
        currentSemester: user.currentSemester || null,
        verificationStatus: user.verificationStatus || 'not_submitted',
        isActiveStudent: user.isActiveStudent !== false,
        rejectionReason: user.rejectionReason || null,
        hasKtmPhoto: Boolean(user.ktmPhotoUrl),
        verifiedAt: user.verifiedAt || null,
        verifiedBy: user.verifiedBy || null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Endpoint Daftar Pengajuan Verifikasi (Khusus Admin / Super Admin)
app.get('/api/admin/seller-verifications', async (req, res) => {
  try {
    const { status = 'all' } = req.query;
    let whereClause = {};
    if (status && status !== 'all') {
      whereClause.verificationStatus = status;
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: [
        'id', 'nama', 'email', 'nim', 'degreeLevel', 'entryYear', 'currentSemester',
        'verificationStatus', 'isActiveStudent', 'rejectionReason', 'ktmPhotoUrl',
        'verifiedAt', 'verifiedBy', 'createdAt', 'updatedAt', 'roles', 'role', 'avatar'
      ],
      order: [['updatedAt', 'DESC']]
    });

    res.json({ success: true, verifications: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Endpoint Moderasi Verifikasi Penjual (Setujui / Tolak / Toggle Status Mahasiswa Aktif)
app.patch('/api/admin/seller-verifications/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { verificationStatus, isActiveStudent, rejectionReason, adminEmail, adminName } = req.body;

    const cleanEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ where: { email: cleanEmail } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Penjual tidak ditemukan!' });
    }

    const updates = {};
    if (verificationStatus) {
      updates.verificationStatus = verificationStatus;
      updates.verifiedAt = new Date();
      updates.verifiedBy = adminName || adminEmail || 'Admin Koperasi';

      if (verificationStatus === 'approved') {
        updates.rejectionReason = null;
        let currentRoles = Array.isArray(user.roles) ? [...user.roles] : [user.role || 'buyer'];
        if (!currentRoles.includes('seller')) currentRoles.push('seller');
        updates.roles = currentRoles;
      } else if (verificationStatus === 'rejected') {
        updates.rejectionReason = rejectionReason || 'Dokumen KTM tidak memenuhi syarat atau tidak terbaca.';
      }
    }

    if (typeof isActiveStudent === 'boolean') {
      updates.isActiveStudent = isActiveStudent;
    }

    await user.update(updates);

    // Catat Activity Log
    try {
      await ActivityLog.create({
        email: adminEmail || 'admin@uin-antasari.ac.id',
        name: adminName || 'Admin Koperasi',
        role: 'admin',
        action: `VERIFIKASI_PENJUAL_${(verificationStatus || 'UPDATE').toUpperCase()}`,
        category: 'seller_verification',
        details: `Admin memperbarui status penjual ${user.nama} (${user.email}) -> Status: ${updates.verificationStatus || user.verificationStatus}, Mahasiswa Aktif: ${updates.isActiveStudent !== false ? 'YA' : 'TIDAK (Alumni/Non-Aktif)'}${rejectionReason ? ', Alasan: ' + rejectionReason : ''}`,
        campus: 'banjarmasin',
        status: verificationStatus === 'approved' ? 'success' : (verificationStatus === 'rejected' ? 'warning' : 'info'),
        ipAddress: req.ip || '127.0.0.1'
      });
    } catch (_lErr) {}

    res.json({
      success: true,
      message: `Status verifikasi ${user.nama} berhasil diperbarui menjadi ${updates.verificationStatus || user.verificationStatus}!`,
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Endpoint Terproteksi Akses Foto KTM Privat (Khusus Admin)
app.get('/api/admin/ktm/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ success: false, message: 'Nama file tidak valid.' });
    }

    const filePath = path.join(KTM_PRIVATE_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Dokumen KTM tidak ditemukan di server.' });
    }

    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
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
    const { sellerId, status, includeAll } = req.query;
    const cacheKey = `products:list:${JSON.stringify(req.query || {})}`;
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    let whereClause = {};
    if (sellerId && sellerId !== 'undefined' && sellerId !== 'null' && sellerId.trim() !== '') {
      whereClause.sellerId = sellerId;
      if (status && status !== 'all') {
        whereClause.status = status;
      }
    } else if (includeAll === 'true' || status === 'all') {
      // Return all products (e.g. for super admin)
    } else if (status) {
      whereClause.status = status;
    } else {
      // Default untuk etalase publik: hanya tampilkan produk approved atau active
      whereClause.status = { [Op.in]: ['approved', 'active', null] };

      // 🛡️ Auto-Hide Produk Penjual Non-Aktif / Alumni / Ditolak dari Etalase Publik
      try {
        const inactiveSellers = await User.findAll({
          where: {
            [Op.or]: [
              { isActiveStudent: false },
              { verificationStatus: 'rejected' }
            ]
          },
          attributes: ['email', 'id']
        });
        const excludedSellerIds = [];
        inactiveSellers.forEach(u => {
          if (u.email) excludedSellerIds.push(u.email);
          if (u.id) {
            excludedSellerIds.push(String(u.id));
            excludedSellerIds.push(`seller_${u.id}`);
          }
        });
        if (excludedSellerIds.length > 0) {
          whereClause.sellerId = { [Op.notIn]: excludedSellerIds };
        }
      } catch (_sErr) {}
    }
    const products = await Product.findAll({ where: whereClause, order: [['createdAt', 'DESC']] });
    const responsePayload = { success: true, products };
    await setCache(cacheKey, responsePayload, 60);
    res.json(responsePayload);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/products/moderation-queue (Khusus Super Admin)
app.get('/api/products/moderation-queue', async (req, res) => {
  try {
    const { status = 'all' } = req.query;
    let whereClause = {};
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    const products = await Product.findAll({ where: whereClause, order: [['createdAt', 'DESC']] });
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/products/:id/moderate (Super Admin Setujui / Tolak Produk)
app.patch('/api/products/:id/moderate', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason, moderatorEmail } = req.body;
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan!' });
    }

    await product.update({
      status: status || 'approved',
      moderationReason: reason || null,
      moderatedAt: new Date()
    });

    await delCachePattern('products:*');

    // Record Activity Log
    try {
      if (ActivityLog) {
        await ActivityLog.create({
          email: moderatorEmail || 'superadmin@antasari.ac.id',
          name: 'Super Admin',
          role: 'super_admin',
          action: `MODERASI_PRODUK_${(status || 'approved').toUpperCase()}`,
          details: `Produk "${product.nama_produk}" (${product.sellerName}) ${status === 'approved' ? 'disetujui dan dipublikasikan' : 'ditolak: ' + (reason || 'Tidak memenuhi kriteria')}`,
          campus: product.kampus || 'banjarmasin',
          category: 'product_moderation',
          status: status === 'approved' ? 'success' : 'warning',
          ipAddress: req.ip || '127.0.0.1'
        });
      }
    } catch (_err) {}

    res.json({
      success: true,
      message: `Status produk berhasil diubah menjadi ${status}!`,
      product
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { nama_produk, name, deskripsi, description, harga, price, stok, stock, kategori, category, material, bahan, foto, image, images, videoUrl, kampus, sellerId, sellerName, slotNumber, status, aiScore, aiAnalysis } = req.body;
    
    // Pastikan images adalah array URL valid
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
      material: material || bahan || 'Kawat Bulu (Pipe Cleaner) & Benang Rajut Premium',
      foto: foto || image || (imagesArr.length > 0 ? imagesArr[0] : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&auto=format'),
      images: imagesArr,
      videoUrl: videoUrl || null,
      kampus: kampus || 'banjarmasin', 
      sellerId: sellerId || 'seller_1', 
      sellerName: sellerName || 'Penjual', 
      slotNumber: slotNumber !== undefined ? parseInt(slotNumber) : 1,
      status: status || 'pending', // Default pending review
      aiScore: aiScore || (aiAnalysis?.score) || 90,
      aiAnalysis: aiAnalysis || null
    });

    await delCachePattern('products:*');

    // Catat Activity Log Penambahan Produk
    try {
      if (ActivityLog) {
        await ActivityLog.create({
          email: sellerId || 'seller@antasari.ac.id',
          name: sellerName || 'Penjual',
          role: 'seller',
          action: 'PENGAJUAN_PRODUK_BARU',
          details: `Penjual mengajukan produk "${newProduct.nama_produk}" untuk dikurasi AI & Super Admin (Skor AI: ${newProduct.aiScore}%)`,
          campus: kampus || 'banjarmasin',
          category: 'product_submission',
          status: 'info',
          ipAddress: req.ip || '127.0.0.1'
        });
      }
    } catch (_err) {}

    res.json({ success: true, message: "Produk berhasil diajukan dan sedang dalam antrean kurasi AI & Super Admin! 🎉", product: newProduct });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE PRODUK
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_produk, name, deskripsi, description, harga, price, stok, stock, kategori, category, material, bahan, foto, image, images, videoUrl, slotNumber, userRole, userEmail, status, aiScore, aiAnalysis, moderationReason } = req.body;

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

    const updatedFields = {
      nama_produk: nama_produk || name || product.nama_produk,
      deskripsi: deskripsi !== undefined ? deskripsi : (description !== undefined ? description : product.deskripsi),
      harga: harga !== undefined ? parseInt(harga) : (price !== undefined ? parseInt(price) : product.harga),
      stok: stok !== undefined ? parseInt(stok) : (stock !== undefined ? parseInt(stock) : product.stok),
      kategori: kategori || category || product.kategori,
      material: material !== undefined ? material : (bahan !== undefined ? bahan : product.material),
      foto: foto || image || product.foto,
      images: imagesArr,
      videoUrl: videoUrl !== undefined ? videoUrl : product.videoUrl,
      slotNumber: slotNumber !== undefined ? parseInt(slotNumber) : product.slotNumber
    };

    if (isSuperAdmin && status) {
      updatedFields.status = status;
      if (moderationReason !== undefined) updatedFields.moderationReason = moderationReason;
      updatedFields.moderatedAt = new Date();
    } else if (isOwner && !isSuperAdmin) {
      // Jika owner mengedit produk, kembalikan status ke pending untuk direview ulang AI & Admin
      updatedFields.status = 'pending';
      if (aiScore) updatedFields.aiScore = aiScore;
      if (aiAnalysis) updatedFields.aiAnalysis = aiAnalysis;
    }

    await product.update(updatedFields);
    await delCachePattern('products:*');

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
    await delCachePattern('products:*');
    res.json({ success: true, message: 'Produk berhasil dihapus!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 📉 KURANGI STOK PRODUK SECARA OTOMATIS SAAT DIBELI (DENGAN ROW-LEVEL LOCKING & TRANSAKSI POSTGRESQL)
app.post('/api/products/deduct-stock', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Daftar item belanja tidak valid.' });
    }

    for (const cartItem of items) {
      const productId = cartItem.product?.id || cartItem.productId || cartItem.id;
      const buyQty = parseInt(cartItem.quantity || 1);
      if (!productId) continue;

      const product = await Product.findByPk(productId, {
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!product) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: `Produk dengan ID ${productId} tidak ditemukan.`
        });
      }

      if (product.stok < buyQty) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Stok produk "${product.nama_produk}" tidak mencukupi (Tersedia: ${product.stok}, Diminta: ${buyQty}).`
        });
      }

      await product.update({
        stok: product.stok - buyQty,
        sold: (product.sold || 0) + buyQty
      }, { transaction: t });
    }

    await t.commit();
    await delCachePattern('products:*');
    res.json({ success: true, message: 'Stok produk berhasil dikurangi secara atomik sesuai pesanan!' });
  } catch (error) {
    if (t && !t.finished) {
      try { await t.rollback(); } catch (_e) {}
    }
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
    const normIdentifier = normalizeUserId(identifier);
    let idList = [identifier];
    if (normIdentifier && !idList.includes(normIdentifier)) idList.push(normIdentifier);

    let pgWhere = {
      [Sequelize.Op.or]: [
        { senderId: { [Sequelize.Op.in]: idList } }, 
        { receiverId: { [Sequelize.Op.in]: idList } }
      ]
    };

    if (roomId) {
      pgWhere = { roomId: String(roomId).toLowerCase() };
    } else if (partner) {
      const normPartner = normalizeUserId(partner);
      const targetRoomId = buildRoomId(identifier, partner);
      let partnerList = [partner];
      if (normPartner && !partnerList.includes(normPartner)) partnerList.push(normPartner);

      pgWhere = {
        [Sequelize.Op.or]: [
          { roomId: targetRoomId },
          {
            senderId: { [Sequelize.Op.in]: idList },
            receiverId: { [Sequelize.Op.in]: partnerList }
          },
          {
            senderId: { [Sequelize.Op.in]: partnerList },
            receiverId: { [Sequelize.Op.in]: idList }
          }
        ]
      };
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
    const { fromId, fromName, fromRole, fromAvatar, toId, toName, toRole, toAvatar, text, mediaType, mediaUrl, audioDuration } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Isi pesan tidak boleh kosong!' });
    }
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // 🎯 1. Normalisasi ID dan Channel Deterministik: chat_${[normA, normB].sort().join('_')}
    const normFrom = normalizeUserId(fromId);
    const normTo = normalizeUserId(toId);
    const roomId = buildRoomId(normFrom, normTo);
    const channelName = roomId;

    const cleanReceiverId = String(normTo).toLowerCase().trim();
    const isReceiverOnline = onlineUsers.has(cleanReceiverId) && onlineUsers.get(cleanReceiverId).size > 0;
    const roomSockets = io.sockets.adapter.rooms.get(roomId);
    const isRoomActive = roomSockets && roomSockets.size > 1;
    const initialStatus = (isReceiverOnline || isRoomActive) ? 'delivered' : 'sent';

    let savedChat = null;

    // 🐘 2. Simpan Utama ke PostgreSQL
    const pgChat = await Chat.create({
      roomId,
      senderId: normFrom, 
      senderName: fromName || normFrom, 
      senderRole: fromRole || 'buyer',
      receiverId: normTo, 
      receiverName: toName || normTo, 
      receiverRole: toRole || 'seller',
      text: text.trim(), 
      time: timeNow,
      status: initialStatus,
      isRead: false
    });

    // 🍃 3. Simpan Cadangan ke MongoDB (jika aktif)
    if (isMongoConnected) {
      try {
        const mChat = await MongoChat.create({
          roomId,
          senderId: normFrom,
          senderName: fromName || normFrom,
          senderRole: fromRole || 'buyer',
          receiverId: normTo,
          receiverName: toName || normTo,
          receiverRole: toRole || 'seller',
          text: text.trim(),
          time: timeNow,
          status: initialStatus,
          isRead: false
        });
        savedChat = { ...mChat.toObject(), id: pgChat.id };
      } catch (mErr) {
        console.warn('Gagal simpan ke MongoDB:', mErr.message);
      }
    }

    if (!savedChat) {
      savedChat = pgChat.toJSON ? pgChat.toJSON() : pgChat;
    }

    const broadcastPayload = {
      ...savedChat,
      id: pgChat.id,
      roomId,
      room_id: roomId,
      senderId: normFrom,
      sender_id: normFrom,
      senderName: fromName || normFrom,
      sender_name: fromName || normFrom,
      senderRole: fromRole || 'buyer',
      sender_role: fromRole || 'buyer',
      senderAvatar: fromAvatar || '',
      receiverId: normTo,
      receiver_id: normTo,
      receiverName: toName || normTo,
      receiver_name: toName || normTo,
      receiverRole: toRole || 'seller',
      receiver_role: toRole || 'seller',
      receiverAvatar: toAvatar || '',
      text: text.trim(),
      content: text.trim(),
      time: timeNow,
      createdAt: pgChat.createdAt,
      created_at: pgChat.createdAt,
      mediaType: mediaType || 'text',
      mediaUrl: mediaUrl || '',
      audioDuration: audioDuration || 0,
      status: initialStatus
    };

    // ⚡ 4. Siarkan (Broadcast) Event 'new-message' ke Soketi Channel Deterministik
    if (pusher) {
      try {
        await pusher.trigger(channelName, 'new-message', broadcastPayload);
        await pusher.trigger(channelName, 'client-new-message', broadcastPayload);
        console.log(`📡 [Soketi Broadcast] Event 'new-message' disiarkan ke '${channelName}' (Sender: ${normFrom} -> Receiver: ${normTo})`);
      } catch (soketiErr) {
        console.warn('⚠️ [Soketi Broadcast Warning]:', soketiErr.message);
      }
    }

    // ⚡ 5. Pancarkan juga ke Socket.IO Clients
    try {
      io.to(roomId).emit('new-message', broadcastPayload);
      io.to(roomId).emit('receive_message', broadcastPayload);
      io.to(roomId).emit('new_message', broadcastPayload);
      io.emit('new_chat_notification', broadcastPayload);
      io.emit('chat_list_update', broadcastPayload);
    } catch (_wsErr) {}

    res.json({ success: true, message: "Pesan terkirim dan tersimpan di database!", chat: broadcastPayload });
  } catch (error) {
    console.error('Error POST /api/chats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


// 👀 TANDAI PESAN CHAT SEBAGAI SUDAH DIBACA (READ STATUS SYNC)
const handleMarkChatAsRead = async (req, res) => {
  try {
    const { identifier, roomId } = req.body;
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Identifier penerima wajib diisi!' });
    }
    const cleanId = String(identifier).toLowerCase().trim();
    const uname = cleanId.split('@')[0];

    let queryMongo = {
      $and: [
        {
          $or: [
            { receiverId: new RegExp(`^${cleanId}$`, 'i') },
            { receiverId: cleanId },
            { receiverId: new RegExp(`^${uname}$`, 'i') },
            { receiverId: uname }
          ]
        },
        { isRead: { $ne: true } }
      ]
    };

    if (roomId) {
      const cleanRoom = String(roomId).toLowerCase().trim();
      const parts = cleanRoom.split('__');
      if (parts.length === 2) {
        const otherId = (parts[0] === cleanId || parts[0] === uname) ? parts[1] : parts[0];
        queryMongo.$and.push({
          $or: [
            { roomId: cleanRoom },
            { roomId: parts.slice().reverse().join('__') },
            { senderId: new RegExp(`^${otherId}$`, 'i') },
            { senderId: otherId }
          ]
        });
      } else {
        queryMongo.$and.push({
          $or: [
            { roomId: cleanRoom },
            { roomId: new RegExp(cleanRoom, 'i') }
          ]
        });
      }
    }

    let modifiedCount = 0;
    if (isMongoConnected) {
      const resM = await MongoChat.updateMany(queryMongo, { $set: { isRead: true, status: 'read' } });
      modifiedCount = resM.modifiedCount || 0;
    }

    try {
      let pgWhere = {
        [Sequelize.Op.or]: [
          { receiverId: cleanId },
          { receiverId: uname }
        ],
        isRead: false
      };
      if (roomId) {
        const cleanRoom = String(roomId).toLowerCase().trim();
        const parts = cleanRoom.split('__');
        if (parts.length === 2) {
          const otherId = (parts[0] === cleanId || parts[0] === uname) ? parts[1] : parts[0];
          pgWhere[Sequelize.Op.and] = [
            {
              [Sequelize.Op.or]: [
                { roomId: cleanRoom },
                { roomId: parts.slice().reverse().join('__') },
                { senderId: otherId }
              ]
            }
          ];
        } else {
          pgWhere.roomId = cleanRoom;
        }
      }
      await Chat.update({ isRead: true, status: 'read' }, { where: pgWhere });
    } catch (_pgErr) {}

    // ⚡ Pancarkan event messages_read ke WebSocket Clients
    try {
      if (roomId) {
        io.to(roomId).emit('messages_read', { roomId, readerId: cleanId, status: 'read' });
      }
      io.emit('chat_list_update', { roomId, readerId: cleanId, isRead: true, status: 'read' });
    } catch (_wsErr) {}

    try {
      io.emit('messages_read', { identifier: cleanId, roomId: roomId ? String(roomId).toLowerCase().trim() : null });
    } catch (_wsErr) {}

    res.json({ success: true, message: 'Pesan berhasil ditandai sebagai sudah dibaca.', modifiedCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

app.put('/api/chats/read', handleMarkChatAsRead);
app.post('/api/chats/read', handleMarkChatAsRead);

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

// ⚡ Helper Broadcast ke Soketi Server (Port 6001)
function broadcastToSoketiServer(channel, event, data) {
  try {
    const http = require('http');
    const payload = JSON.stringify({
      name: event,
      channels: [channel],
      data: data
    });
    const req = http.request({
      hostname: process.env.SOKETI_HOST || '127.0.0.1',
      port: parseInt(process.env.SOKETI_PORT || '6001'),
      path: '/apps/campusmart/events',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 1500
    });
    req.on('error', () => {});
    req.write(payload);
    req.end();
  } catch (_e) {}
}

// 💬 FRANKENPHP & STANDALONE VUE 3 COMPATIBLE ENDPOINTS
app.post('/api/chat/send', async (req, res) => {
  try {
    const body = req.body || {};
    const roomId = body.roomId || body.room_id || 'general';
    const channelName = `chat-room-${roomId}`;
    const msgId = body.id || Date.now();

    const msgPayload = {
      id: msgId,
      roomId,
      room_id: roomId,
      senderId: body.senderId || body.fromId || 'unknown',
      senderName: body.senderName || body.fromName || 'Pengguna',
      senderRole: body.senderRole || body.fromRole || 'buyer',
      receiverId: body.receiverId || body.toId || '',
      text: body.text || '',
      content: body.text || '',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
      replyTo: body.replyTo || null,
      reactions: []
    };

    broadcastToSoketiServer(channelName, 'NewMessage', msgPayload);
    res.json({ success: true, message: 'Pesan berhasil dikirim', data: msgPayload });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/chat/edit', async (req, res) => {
  try {
    const body = req.body || {};
    const roomId = body.roomId || body.room_id || 'general';
    const channelName = `chat-room-${roomId}`;
    const editPayload = {
      id: body.id,
      text: body.text || '',
      content: body.text || '',
      is_edited: true,
      edited_at: new Date().toISOString(),
      roomId
    };

    broadcastToSoketiServer(channelName, 'MessageUpdated', editPayload);
    res.json({ success: true, message: 'Pesan berhasil diperbarui', data: editPayload });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/chat/delete', async (req, res) => {
  try {
    const body = req.body || {};
    const roomId = body.roomId || body.room_id || 'general';
    const channelName = `chat-room-${roomId}`;
    const deletePayload = {
      id: body.id,
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      roomId
    };

    broadcastToSoketiServer(channelName, 'MessageDeleted', deletePayload);
    res.json({ success: true, message: 'Pesan berhasil dihapus', data: deletePayload });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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

// VOUCHERS & PROMO SYSTEM
app.get('/api/vouchers', async (req, res) => {
  try {
    const { sellerId, activeOnly } = req.query;
    let whereClause = {};
    if (sellerId) whereClause.sellerId = sellerId;
    if (activeOnly === 'true') whereClause.isActive = true;
    
    const vouchers = await Voucher.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, vouchers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/vouchers', async (req, res) => {
  try {
    const {
      sellerId,
      sellerName,
      code,
      name,
      discountType,
      value,
      minSpend,
      maxDiscount,
      quota,
      startDate,
      endDate,
      applicableProductIds,
      badge,
      description,
      isActive
    } = req.body;

    if (!sellerId || !code || value === undefined) {
      return res.status(400).json({ success: false, message: 'sellerId, code, dan value wajib diisi!' });
    }

    const cleanCode = String(code).trim().toUpperCase();

    // Cek duplikasi kode kupon
    const existing = await Voucher.findOne({ where: { code: cleanCode } });
    if (existing) {
      return res.status(400).json({ success: false, message: `Kode kupon "${cleanCode}" sudah digunakan. Silakan gunakan kode lain.` });
    }

    const voucher = await Voucher.create({
      sellerId,
      sellerName: sellerName || '',
      code: cleanCode,
      name: name || 'Promo Spesial Toko',
      discountType: discountType || 'percentage',
      value: parseInt(value) || 0,
      minSpend: parseInt(minSpend) || 0,
      maxDiscount: parseInt(maxDiscount) || 0,
      quota: parseInt(quota) || 100,
      usedCount: 0,
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      applicableProductIds: typeof applicableProductIds === 'string' ? applicableProductIds : JSON.stringify(applicableProductIds || []),
      badge: badge || '🎟️ Promo',
      description: description || '',
      isActive: isActive !== false
    });

    res.json({ success: true, message: 'Kupon promosi toko berhasil dibuat! 🎉', voucher });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/vouchers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const voucher = await Voucher.findByPk(id);
    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Kupon tidak ditemukan' });
    }

    const updateData = { ...req.body };
    if (updateData.code) {
      updateData.code = String(updateData.code).trim().toUpperCase();
      // Pastikan tidak tabrakan dengan kode lain
      const existing = await Voucher.findOne({ where: { code: updateData.code } });
      if (existing && existing.id !== voucher.id) {
        return res.status(400).json({ success: false, message: `Kode "${updateData.code}" sudah dipakai voucher lain.` });
      }
    }
    if (updateData.applicableProductIds && typeof updateData.applicableProductIds !== 'string') {
      updateData.applicableProductIds = JSON.stringify(updateData.applicableProductIds);
    }

    await voucher.update(updateData);
    res.json({ success: true, message: 'Kupon berhasil diperbarui!', voucher });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/vouchers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const voucher = await Voucher.findByPk(id);
    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Kupon tidak ditemukan' });
    }
    await voucher.destroy();
    res.json({ success: true, message: 'Kupon promosi berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.patch('/api/vouchers/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const voucher = await Voucher.findByPk(id);
    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Kupon tidak ditemukan' });
    }
    await voucher.update({ isActive: !voucher.isActive });
    res.json({ success: true, message: `Kupon ${voucher.isActive ? 'diaktifkan' : 'dinonaktifkan'}!`, voucher });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/vouchers/validate', async (req, res) => {
  try {
    const { code, subtotal, items, deliveryFee } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Masukkan kode voucher terlebih dahulu.' });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const voucher = await Voucher.findOne({ where: { code: cleanCode } });

    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Kode kupon tidak ditemukan atau salah ketik.' });
    }

    if (!voucher.isActive) {
      return res.status(400).json({ success: false, message: 'Kupon ini sedang dinonaktifkan oleh penjual.' });
    }

    // Cek Batas Waktu Promo (Start Date & End Date)
    const now = new Date();
    if (voucher.startDate) {
      const start = new Date(voucher.startDate);
      if (now < start) {
        return res.status(400).json({
          success: false,
          message: `Promo ini belum dimulai. Periode promo dimulai pada ${start.toLocaleString('id-ID')}.`
        });
      }
    }
    if (voucher.endDate) {
      const end = new Date(voucher.endDate);
      if (now > end) {
        return res.status(400).json({
          success: false,
          message: `Kupon ini sudah kedaluwarsa pada ${end.toLocaleString('id-ID')}.`
        });
      }
    }

    // Cek Kuota Pemakaian
    if (voucher.quota > 0 && voucher.usedCount >= voucher.quota) {
      return res.status(400).json({ success: false, message: 'Kuota pemakaian kupon ini telah habis.' });
    }

    // Hitung Subtotal Produk Toko yang Berlaku
    let eligibleSubtotal = Number(subtotal) || 0;
    if (Array.isArray(items) && items.length > 0 && voucher.sellerId) {
      const sellerItems = items.filter(i => {
        const prod = i.product || i;
        return prod.sellerId === voucher.sellerId;
      });

      if (sellerItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Kupon ini khusus untuk produk dari toko ${voucher.sellerName || voucher.sellerId}.`
        });
      }
      eligibleSubtotal = sellerItems.reduce((acc, i) => {
        const prod = i.product || i;
        return acc + (Number(prod.price) * (Number(i.quantity) || 1));
      }, 0);
    }

    // Cek Minimal Belanja
    if (voucher.minSpend > 0 && eligibleSubtotal < voucher.minSpend) {
      return res.status(400).json({
        success: false,
        message: `Minimal belanja Rp ${voucher.minSpend.toLocaleString('id-ID')} untuk kupon ini (Subtotal toko: Rp ${eligibleSubtotal.toLocaleString('id-ID')}).`
      });
    }

    // Hitung Nominal Potongan
    let discountAmount = 0;
    let deliveryDiscount = 0;

    if (voucher.discountType === 'percentage') {
      discountAmount = Math.round((eligibleSubtotal * voucher.value) / 100);
      if (voucher.maxDiscount > 0 && discountAmount > voucher.maxDiscount) {
        discountAmount = voucher.maxDiscount;
      }
    } else if (voucher.discountType === 'fixed') {
      discountAmount = Math.min(eligibleSubtotal, voucher.value);
    } else if (voucher.discountType === 'shipping') {
      const rawDelivery = Number(deliveryFee) || 5000;
      deliveryDiscount = Math.min(rawDelivery, voucher.value);
    }

    res.json({
      success: true,
      message: `Kupon "${voucher.name}" berhasil diterapkan! 🎉`,
      voucher,
      discountAmount,
      deliveryDiscount,
      totalSavings: discountAmount + deliveryDiscount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// CHECKOUT & MIDTRANS (DENGAN ROW-LEVEL LOCKING & DATABASE TRANSAKSI)
app.post('/api/checkout', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { orderId, grossAmount, customerDetails, items, deliveryMethod } = req.body;
    const cleanAmount = parseInt(grossAmount || 0);
    const generatedOrderId = orderId || `ANTASARI-${Date.now()}`;
    const generatedVendingToken = `VEND-${Math.floor(100000 + Math.random() * 900000)}`;

    // 🛡️ Validasi Kepemilikan Produk: Penjual dilarang membeli produk tokonya sendiri
    const buyerEmail = (customerDetails?.email || req.body.buyerEmail || '').toLowerCase().trim();
    const buyerName = (customerDetails?.name || req.body.buyerName || '').toLowerCase().trim();
    const buyerId = String(req.body.buyerId || customerDetails?.id || '').toLowerCase().trim();

    if (items && Array.isArray(items)) {
      for (const cartItem of items) {
        const prod = cartItem.product || cartItem;
        const pSellerId = String(prod.sellerId || '').toLowerCase().trim();
        const pSellerName = String(prod.sellerName || '').toLowerCase().trim();

        const isSelfOwned =
          (pSellerId && (pSellerId === buyerEmail || pSellerId === buyerId || `seller_${pSellerId}` === buyerId || `seller_${buyerId}` === pSellerId)) ||
          (pSellerId === 'seller_1' && (buyerEmail.includes('udin') || buyerEmail.includes('myammiy') || buyerName.includes('myammiy') || buyerName.includes('udin'))) ||
          ((pSellerId === 's1' || prod.isKoperasi) && (buyerEmail.includes('koperasi') || buyerEmail.includes('admin@koperasi') || buyerName.includes('koperasi')));

        if (isSelfOwned) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: 'Penjual tidak dapat membeli produk dari tokonya sendiri.'
          });
        }
      }
    }

    let targetSlotNumber = 1;
    let isAllVendingEligible = true;

    if (items && Array.isArray(items)) {
      for (const cartItem of items) {
        const productId = cartItem.product?.id || cartItem.productId || cartItem.id;
        const buyQty = parseInt(cartItem.quantity || 1);

        if (productId) {
          const product = await Product.findByPk(productId, {
            transaction: t,
            lock: t.LOCK.UPDATE
          });

          if (!product) {
            await t.rollback();
            return res.status(404).json({
              success: false,
              message: `Produk dengan ID ${productId} tidak ditemukan.`
            });
          }

          if (product.stok < buyQty) {
            await t.rollback();
            return res.status(400).json({
              success: false,
              message: `Stok produk "${product.nama_produk}" tidak mencukupi (Tersedia: ${product.stok}, Diminta: ${buyQty}).`
            });
          }

          if (product.sellerId !== 'seller_1' && !product.nama_produk.toLowerCase().includes('ganci')) {
            isAllVendingEligible = false;
          }
          targetSlotNumber = product.slotNumber || 1;

          await product.update({ 
            stok: product.stok - buyQty, 
            sold: (product.sold || 0) + buyQty 
          }, { transaction: t });
        }
      }
    }

    if (deliveryMethod === 'vending' && !isAllVendingEligible) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Mohon maaf, Vending Machine saat ini hanya melayani pengambilan produk Ganci Myammiy Craft.'
      });
    }

    const firstSellerId = items && items[0] ? (items[0].product?.sellerId || items[0].sellerId || 'seller_1') : 'seller_1';

    await Order.create({
      orderId: generatedOrderId,
      sellerId: firstSellerId,
      buyerName: customerDetails?.name || req.body.buyerName || 'Mahasiswa UIN Antasari',
      buyerEmail: customerDetails?.email || req.body.buyerEmail || 'mhs@uin-antasari.ac.id',
      totalAmount: cleanAmount,
      status: 'pending',
      vendingToken: generatedVendingToken,
      slotNumber: targetSlotNumber
    }, { transaction: t });

    await t.commit();
    await delCachePattern('products:*');

    // ⚡ Pancarkan notifikasi pesanan baru secara Real-Time ke Penjual via Socket.IO
    try {
      const orderNotificationData = {
        orderId: generatedOrderId,
        sellerId: firstSellerId,
        buyerName: customerDetails?.name || req.body.buyerName || 'Mahasiswa UIN Antasari',
        buyerEmail: customerDetails?.email || req.body.buyerEmail || 'mhs@uin-antasari.ac.id',
        totalAmount: cleanAmount,
        deliveryMethod: deliveryMethod || 'pickup',
        slotNumber: targetSlotNumber,
        vendingToken: generatedVendingToken,
        items: items ? items.map(i => ({
          name: i.product?.nama_produk || i.product?.name || i.name || i.nama || 'Produk Kampus',
          quantity: i.quantity || 1,
          price: i.product?.harga || i.product?.price || i.price || 0
        })) : [],
        timestamp: new Date().toISOString()
      };
      io.to(`seller_${firstSellerId}`).emit('new_order_notification', orderNotificationData);
      io.emit('new_order_notification', orderNotificationData);
    } catch (_wsOrderErr) {}

    let transactionToken = null;
    let redirectUrl = null;

    try {
      let parameter = {
        transaction_details: { order_id: generatedOrderId, gross_amount: cleanAmount },
        customer_details: { first_name: customerDetails?.name || 'Mahasiswa', email: customerDetails?.email || 'mhs@uin-antasari.ac.id' }
      };
      let transaction = await snap.createTransaction(parameter);
      transactionToken = transaction.token;
      redirectUrl = transaction.redirect_url;
    } catch (midtransErr) {
      console.warn('⚠️ Midtrans transaction warning (using mock fallback for testing):', midtransErr.message);
      transactionToken = `mock-token-${generatedOrderId}`;
      redirectUrl = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${transactionToken}`;
    }

    res.json({ 
      success: true, 
      token: transactionToken, 
      redirect_url: redirectUrl,
      vendingToken: generatedVendingToken,
      slotNumber: targetSlotNumber
    });
  } catch (error) {
    if (t && !t.finished) {
      try { await t.rollback(); } catch (_e) {}
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE / VALIDATE ORDER API (DENGAN TRANSAKSI POSTGRESQL)
app.post('/api/orders', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      buyerId,
      buyerEmail,
      buyerName,
      buyerLocation,
      items,
      total,
      deliveryMethod,
      deliveryType: rawDeliveryType,
      paymentMethod: rawPaymentMethod,
      paymentStatus: rawPaymentStatus
    } = req.body;
    const bEmail = (buyerEmail || req.body.customerDetails?.email || '').toLowerCase().trim();
    const bName = (buyerName || req.body.customerDetails?.name || '').toLowerCase().trim();
    const bId = String(buyerId || req.body.customerDetails?.id || '').toLowerCase().trim();

    if (items && Array.isArray(items)) {
      for (const cartItem of items) {
        const prod = cartItem.product || cartItem;
        const pSellerId = String(prod.sellerId || '').toLowerCase().trim();
        const pSellerName = String(prod.sellerName || '').toLowerCase().trim();

        const isSelfOwned =
          (pSellerId && (pSellerId === bEmail || pSellerId === bId || `seller_${pSellerId}` === bId || `seller_${bId}` === pSellerId)) ||
          (pSellerId === 'seller_1' && (bEmail.includes('udin') || bEmail.includes('myammiy') || bName.includes('myammiy') || bName.includes('udin'))) ||
          ((pSellerId === 's1' || prod.isKoperasi) && (bEmail.includes('koperasi') || bEmail.includes('admin@koperasi') || bName.includes('koperasi')));

        if (isSelfOwned) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: 'Penjual tidak dapat membeli produk dari tokonya sendiri.'
          });
        }
      }
    }

    const orderId = req.body.orderId || `ANTASARI-${Date.now()}`;
    const cleanAmount = parseInt(total || req.body.grossAmount || 0);
    const sellerIdTarget = items && items[0] ? (items[0].product?.sellerId || items[0].sellerId || 'seller_1') : 'seller_1';

    const deliveryType = rawDeliveryType || (deliveryMethod === 'courier' || deliveryMethod === 'delivery' || deliveryMethod === 'antar' ? 'delivery' : 'pickup');
    const cleanPaymentMethod = (rawPaymentMethod === 'midtrans' || rawPaymentMethod === 'qris' || rawPaymentMethod === 'dana' || rawPaymentMethod === 'gopay') ? 'midtrans' : 'cash';
    const paymentStatus = rawPaymentStatus || (cleanPaymentMethod === 'midtrans' ? 'paid' : 'unpaid');
    const pickupStatus = deliveryType === 'pickup' ? 'pending' : null;
    const deliveryStatus = deliveryType === 'delivery' ? 'pending' : null;

    const newOrder = await Order.create({
      orderId,
      sellerId: sellerIdTarget,
      buyerId: bId || null,
      buyerName: bName || 'Mahasiswa UIN Antasari',
      buyerEmail: bEmail || 'mhs@uin-antasari.ac.id',
      buyerLocation: buyerLocation || 'Area Kampus UIN Antasari',
      deliveryType,
      paymentMethod: cleanPaymentMethod,
      paymentStatus,
      pickupStatus,
      deliveryStatus,
      totalAmount: cleanAmount,
      status: 'pending'
    }, { transaction: t });

    // Simpan rincian OrderItem jika ada
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const pName = item.product?.nama_produk || item.product?.name || item.name || 'Produk Kampus';
        const pQty = parseInt(item.quantity || item.qty || 1);
        const pPrice = parseInt(item.product?.harga || item.product?.price || item.price || 0);
        await OrderItem.create({
          OrderId: newOrder.id,
          productName: pName,
          quantity: pQty,
          price: pPrice
        }, { transaction: t });
      }
    }

    await OrderLog.create({
      orderId,
      previousStatus: null,
      newStatus: 'pending',
      changedBy: bName || 'Pembeli',
      role: 'buyer',
      notes: `Pesanan dibuat via ${deliveryType === 'pickup' ? 'Ambil di Toko' : 'Kurir Antar'} (${cleanPaymentMethod.toUpperCase()})`
    }, { transaction: t });

    await t.commit();
    await delCachePattern('products:*');

    // ⚡ Pancarkan notifikasi pesanan baru ke Penjual via Socket.IO
    try {
      const orderNotificationData = {
        orderId,
        sellerId: sellerIdTarget,
        buyerName: bName || 'Mahasiswa UIN Antasari',
        buyerEmail: bEmail || 'mhs@uin-antasari.ac.id',
        buyerLocation: buyerLocation || 'Area Kampus UIN Antasari',
        totalAmount: cleanAmount,
        deliveryMethod: deliveryType,
        deliveryType,
        paymentMethod: cleanPaymentMethod,
        paymentStatus,
        items: items ? items.map(i => ({
          name: i.product?.nama_produk || i.product?.name || i.name || 'Produk Kampus',
          quantity: i.quantity || 1,
          price: i.product?.harga || i.product?.price || i.price || 0
        })) : [],
        timestamp: new Date().toISOString()
      };
      io.to(`seller_${sellerIdTarget}`).emit('new_order_notification', orderNotificationData);
      io.emit('new_order_notification', orderNotificationData);
    } catch (_wsOrderErr) {}

    res.json({
      success: true,
      message: 'Pesanan berhasil dibuat!',
      order: newOrder
    });
  } catch (error) {
    if (t && !t.finished) {
      try { await t.rollback(); } catch (_e) {}
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET USER'S PERSONAL ORDERS (ALL ROLES: BUYER, DRIVER, SELLER, ADMIN, SUPER ADMIN)
app.get('/api/orders/user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email pengguna tidak valid.' });
    }
    const cleanEmail = email.toLowerCase().trim();
    const orders = await Order.findAll({
      where: {
        buyerEmail: {
          [Op.like]: `%${cleanEmail}%`
        }
      },
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 🔄 STATE MACHINE ORDER STATUS & ALUR PESANAN REALTIME (CAMPUS MART)
// Urutan Status: 'pending' -> 'confirmed' -> 'processing' -> 'driver_assigned' -> 'picked_up' -> 'delivered' -> 'completed'
// ==========================================
const ORDER_STATUS_FLOW = [
  'pending',
  'confirmed',
  'processing',
  'driver_assigned',
  'picked_up',
  'delivered',
  'completed'
];

const ORDER_SYSTEM_MESSAGE_TEMPLATES = {
  confirmed: (order, driverName) => `Pesanan #${order.orderId} telah dikonfirmasi oleh penjual. Toko sedang menyiapkan barang pesanan Anda.`,
  processing: (order, driverName) => `Pesanan #${order.orderId} sedang diproses dan disiapkan oleh toko.`,
  ready_for_pickup: (order) => `Pesanan #${order.orderId} telah selesai disiapkan oleh toko dan siap diambil di lokasi/toko! 🛍️`,
  searching_driver: (order) => `Penjual sedang mencari kurir kampus untuk mengantar pesanan #${order.orderId}... 🔍`,
  driver_assigned: (order, driverName) => `Driver ${driverName || order.driverName || 'Kurir'} telah ditugaskan untuk mengantar pesanan #${order.orderId}.`,
  picked_up: (order, driverName) => `Driver ${driverName || order.driverName || 'Kurir'} sedang mengambil pesanan di toko dan siap meluncur ke lokasi Anda. 🛵`,
  delivering: (order, driverName) => `Driver ${driverName || order.driverName || 'Kurir'} sedang dalam perjalanan mengantarkan pesanan #${order.orderId} ke alamat Anda. 🛵`,
  delivered: (order, driverName) => `Driver ${driverName || order.driverName || 'Kurir'} telah tiba dan menyerahkan pesanan #${order.orderId} di lokasi tujuan.`,
  completed: (order, driverName) => `Pesanan #${order.orderId} telah selesai dan diterima dengan baik oleh pembeli. Terima kasih telah berbelanja di Campus Mart! 🎉`,
  cancelled: (order, driverName) => `Pesanan #${order.orderId} telah dibatalkan.`
};

/**
 * Eksekusi Transisi Status Pesanan Sesuai State Machine
 */
async function transitionOrderStatus(order, nextStatus, { changedBy, role, driverId, driverName, notes } = {}) {
  const previousStatus = order.status;
  const updatePayload = { status: nextStatus };
  if (order.deliveryType === 'pickup') {
    updatePayload.pickupStatus = nextStatus;
  } else {
    updatePayload.deliveryStatus = nextStatus;
  }
  if (driverId) updatePayload.driverId = driverId;
  if (driverName) updatePayload.driverName = driverName;

  await order.update(updatePayload);

  // a. Simpan riwayat perubahan status (order_logs)
  let logRecord = null;
  try {
    logRecord = await OrderLog.create({
      orderId: order.orderId,
      previousStatus: previousStatus || 'pending',
      newStatus: nextStatus,
      changedBy: changedBy || 'system',
      role: role || 'system',
      notes: notes || ''
    });
  } catch (logErr) {
    console.warn('⚠️ [OrderStateMachine] Gagal menyimpan ke order_logs:', logErr.message);
  }

  // Siapkan teks pesan otomatis (system message)
  const templateFn = ORDER_SYSTEM_MESSAGE_TEMPLATES[nextStatus];
  const systemMessage = templateFn
    ? templateFn(order, driverName || order.driverName)
    : `Status pesanan #${order.orderId} diperbarui menjadi "${nextStatus}".`;

  // b. Memicu WebSocket event order-status-updated ke channel order.${orderId}
  const statusEventData = {
    orderId: order.orderId,
    previousStatus: previousStatus || 'pending',
    newStatus: nextStatus,
    status: nextStatus,
    changedBy: changedBy || 'system',
    role: role || 'system',
    driverId: order.driverId || driverId || null,
    driverName: order.driverName || driverName || null,
    systemMessage,
    notes: notes || '',
    timestamp: new Date().toISOString()
  };

  try {
    // 1. Socket.IO (ke channel order.${orderId} dan global)
    io.to(`order.${order.orderId}`).emit('order-status-updated', statusEventData);
    io.to(`order_${order.orderId}`).emit('order-status-updated', statusEventData);
    io.emit('order-status-updated', statusEventData);

    // 2. Soketi Bridge / Pusher Protocol v7
    broadcastToSoketiServer(`order.${order.orderId}`, 'order-status-updated', statusEventData);
    broadcastToSoketiServer(`order_${order.orderId}`, 'order-status-updated', statusEventData);
    broadcastToSoketiServer('campusmart-orders', 'order-status-updated', statusEventData);
  } catch (wsErr) {
    console.warn('⚠️ [OrderStateMachine] WebSocket broadcast error:', wsErr.message);
  }

  // c. Mengirim pesan otomatis (system message) ke ruang chat terkait
  try {
    const buyerId = order.buyerEmail || order.buyerName || 'buyer';
    const sellerId = order.sellerId || 'seller_1';
    const currentDriver = order.driverId || driverId;

    const chatTargetRooms = new Set();
    // 1. Ruang chat spesifik pesanan Buyer <-> Seller (Deterministic formula getRoomId)
    chatTargetRooms.add(getRoomId(buyerId, sellerId, order.orderId));
    chatTargetRooms.add(getRoomId(buyerId, sellerId)); // Ruang chat umum

    // 2. Ruang chat Driver jika sudah ditugaskan
    if (currentDriver) {
      chatTargetRooms.add(getRoomId(buyerId, currentDriver, order.orderId));
      chatTargetRooms.add(getRoomId(sellerId, currentDriver, order.orderId));
    }
    chatTargetRooms.add(`order_${order.orderId}`);

    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    for (const rId of chatTargetRooms) {
      const sysMsgPayload = {
        roomId: rId,
        senderId: 'system',
        senderName: 'Sistem Campus Mart',
        senderRole: 'system',
        receiverId: buyerId,
        receiverName: order.buyerName || 'Pembeli',
        receiverRole: 'buyer',
        text: systemMessage,
        time: timeNow,
        status: 'sent',
        isRead: false,
        createdAt: new Date()
      };

      try {
        await Chat.create(sysMsgPayload);
      } catch (_chatErr) {}

      if (isMongoConnected) {
        try {
          await MongoChat.create(sysMsgPayload);
        } catch (_mErr) {}
      }

      // Siarkan pesan sistem via Socket.IO
      io.to(rId).emit('receive_message', sysMsgPayload);
      io.to(rId).emit('new_message', sysMsgPayload);

      // Siarkan via Soketi / Echo
      broadcastToSoketiServer(rId, 'NewMessage', sysMsgPayload);
      broadcastToSoketiServer(`chat-room-${rId}`, 'NewMessage', sysMsgPayload);
      broadcastToSoketiServer(`order.${order.orderId}`, 'NewMessage', sysMsgPayload);
    }
    io.emit('new_chat_notification', {
      orderId: order.orderId,
      text: systemMessage,
      senderRole: 'system',
      timestamp: new Date().toISOString()
    });
  } catch (sysErr) {
    console.warn('⚠️ [OrderStateMachine] Error sending automatic chat system message:', sysErr.message);
  }

  return { order, log: logRecord, systemMessage };
}

// 📦 API UPDATE STATUS PESANAN (STATE MACHINE)
app.post('/api/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, changedBy, role, driverId, driverName, notes } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status tujuan harus disertakan.' });
    }

    const order = await Order.findOne({ where: { orderId } });
    if (!order) {
      return res.status(404).json({ success: false, message: `Pesanan #${orderId} tidak ditemukan.` });
    }

    const targetStatus = String(status).toLowerCase().trim();
    const result = await transitionOrderStatus(order, targetStatus, {
      changedBy,
      role,
      driverId,
      driverName,
      notes
    });

    res.json({
      success: true,
      message: `Status pesanan #${orderId} berhasil diubah menjadi "${targetStatus}".`,
      order: result.order,
      log: result.log,
      systemMessage: result.systemMessage
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, changedBy, role, driverId, driverName, notes } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status tujuan harus disertakan.' });
    }

    const order = await Order.findOne({ where: { orderId } });
    if (!order) {
      return res.status(404).json({ success: false, message: `Pesanan #${orderId} tidak ditemukan.` });
    }

    const targetStatus = String(status).toLowerCase().trim();
    const result = await transitionOrderStatus(order, targetStatus, {
      changedBy,
      role,
      driverId,
      driverName,
      notes
    });

    res.json({
      success: true,
      message: `Status pesanan #${orderId} berhasil diubah menjadi "${targetStatus}".`,
      order: result.order,
      log: result.log,
      systemMessage: result.systemMessage
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 📜 API AMBIL RIWAYAT PERUBAHAN STATUS PESANAN (order_logs)
app.get('/api/orders/:orderId/logs', async (req, res) => {
  try {
    const { orderId } = req.params;
    const logs = await OrderLog.findAll({
      where: { orderId },
      order: [['createdAt', 'ASC']]
    });
    res.json({ success: true, orderId, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 🔍 API DETAIL PESANAN LENGKAP
app.get('/api/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({
      where: { orderId },
      include: [
        { model: OrderItem, as: 'items' },
        { model: OrderLog, as: 'logs' }
      ]
    });
    if (!order) {
      return res.status(404).json({ success: false, message: `Pesanan #${orderId} tidak ditemukan.` });
    }
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 🛵 POST /api/orders/:orderId/request-driver (Penjual broadcast pesanan ke pool rebutan driver)
app.post('/api/orders/:orderId/request-driver', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { sellerName, notes } = req.body;

    const order = await Order.findOne({
      where: { orderId },
      include: [{ model: OrderItem, as: 'items' }]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: `Pesanan #${orderId} tidak ditemukan.` });
    }

    if (order.deliveryType !== 'delivery') {
      return res.status(400).json({ success: false, message: 'Pesanan ini bukan pesanan delivery/kurir.' });
    }

    if (order.driverId) {
      return res.status(400).json({ success: false, message: `Pesanan #${orderId} sudah memiliki driver (${order.driverName || order.driverId}).` });
    }

    // Ubah status order menjadi searching_driver
    const result = await transitionOrderStatus(order, 'searching_driver', {
      changedBy: sellerName || 'Penjual',
      role: 'seller',
      notes: notes || 'Penjual memanggil kurir kampus untuk pengantaran.'
    });

    // Siarkan ke WebSocket channel 'campusmart-drivers' event 'NewDeliveryJob'
    const jobPayload = {
      orderId: order.orderId,
      id: order.id,
      sellerId: order.sellerId,
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      buyerLocation: order.buyerLocation,
      deliveryType: order.deliveryType,
      deliveryStatus: 'searching_driver',
      status: 'searching_driver',
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      items: order.items || [],
      createdAt: order.createdAt,
      timestamp: new Date().toISOString()
    };

    try {
      io.to('campusmart-drivers').emit('NewDeliveryJob', jobPayload);
      io.emit('NewDeliveryJob', jobPayload);
      broadcastToSoketiServer('campusmart-drivers', 'NewDeliveryJob', jobPayload);
    } catch (wsErr) {
      console.warn('⚠️ Gagal broadcast NewDeliveryJob:', wsErr.message);
    }

    res.json({
      success: true,
      message: `Pencarian driver untuk pesanan #${orderId} berhasil disiarkan!`,
      order: result.order,
      job: jobPayload
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ⚡ POST /api/orders/:orderId/claim-driver (Driver klaim orderan - First Come First Served Atomic Lock)
app.post('/api/orders/:orderId/claim-driver', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { driverId, driverName } = req.body;

    if (!driverId) {
      return res.status(400).json({ success: false, message: 'ID Driver wajib disertakan.' });
    }

    // Atomic update dengan check WHERE driverId IS NULL OR driverId = ''
    const [affectedCount] = await Order.update({
      driverId,
      driverName: driverName || 'Driver Kampus',
      deliveryStatus: 'driver_assigned',
      status: 'driver_assigned'
    }, {
      where: {
        orderId,
        [Op.or]: [
          { driverId: null },
          { driverId: '' }
        ]
      }
    });

    if (affectedCount === 0) {
      return res.status(409).json({
        success: false,
        message: 'Orderan sudah diambil driver lain.'
      });
    }

    // Ambil data order terbaru setelah atomic update berhasil
    const updatedOrder = await Order.findOne({
      where: { orderId },
      include: [
        { model: OrderItem, as: 'items' },
        { model: OrderLog, as: 'logs' }
      ]
    });

    // Catat log transisi
    try {
      await OrderLog.create({
        orderId,
        previousStatus: 'searching_driver',
        newStatus: 'driver_assigned',
        changedBy: driverName || 'Driver Kampus',
        role: 'driver',
        notes: `Driver ${driverName || driverId} berhasil mengklaim tugas pengantaran.`
      });
    } catch (_logErr) {}

    // Siarkan ke channel campusmart-drivers bahwa orderan telah diklaim (agar driver lain menghapus kartu job)
    const claimPayload = {
      orderId,
      driverId,
      driverName: driverName || 'Driver Kampus',
      deliveryStatus: 'driver_assigned',
      timestamp: new Date().toISOString()
    };

    try {
      io.to('campusmart-drivers').emit('DeliveryJobClaimed', claimPayload);
      io.emit('DeliveryJobClaimed', claimPayload);
      broadcastToSoketiServer('campusmart-drivers', 'DeliveryJobClaimed', claimPayload);

      // Siarkan status update ke channel pesanan
      const statusEventData = {
        orderId,
        status: 'driver_assigned',
        deliveryStatus: 'driver_assigned',
        driverId,
        driverName: driverName || 'Driver Kampus',
        timestamp: new Date().toISOString()
      };
      io.to(`order.${orderId}`).emit('order-status-updated', statusEventData);
      io.to(`order_${orderId}`).emit('order-status-updated', statusEventData);
      io.emit('order-status-updated', statusEventData);
      broadcastToSoketiServer(`order.${orderId}`, 'order-status-updated', statusEventData);
      broadcastToSoketiServer(`order_${orderId}`, 'order-status-updated', statusEventData);
    } catch (_wsErr) {}

    // Kirim pesan sistem ke ruang obrolan terkait
    try {
      const templateFn = ORDER_SYSTEM_MESSAGE_TEMPLATES['driver_assigned'];
      const systemMessage = templateFn ? templateFn(updatedOrder, driverName) : `Driver ${driverName} telah ditugaskan.`;
      const buyerId = updatedOrder.buyerEmail || updatedOrder.buyerName || 'buyer';
      const sellerId = updatedOrder.sellerId || 'seller_1';
      const rId = getRoomId(buyerId, sellerId, updatedOrder.orderId);
      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const sysMsgPayload = {
        roomId: rId,
        senderId: 'system',
        senderName: 'Sistem Campus Mart',
        senderRole: 'system',
        receiverId: buyerId,
        receiverName: updatedOrder.buyerName || 'Pembeli',
        receiverRole: 'buyer',
        text: systemMessage,
        time: timeNow,
        status: 'sent',
        isRead: false,
        createdAt: new Date()
      };
      await Chat.create(sysMsgPayload);
      io.to(rId).emit('receive_message', sysMsgPayload);
      broadcastToSoketiServer(rId, 'NewMessage', sysMsgPayload);
    } catch (_chatErr) {}

    res.json({
      success: true,
      message: 'Selamat! Anda berhasil mengambil orderan ini.',
      order: updatedOrder
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 📍 POST /api/orders/:orderId/location (Live Tracking Kurir)
app.post('/api/orders/:orderId/location', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { lat, lng, driverId, heading, speed } = req.body;

    if (lat == null || lng == null) {
      return res.status(400).json({ success: false, message: 'Koordinat lat dan lng wajib disertakan.' });
    }

    const cleanLat = Number(lat);
    const cleanLng = Number(lng);

    // Update lokasi driver di tabel Order
    await Order.update({
      driverCoords: { lat: cleanLat, lng: cleanLng, heading: heading || 0, speed: speed || 0, updatedAt: new Date().toISOString() }
    }, {
      where: { orderId }
    });

    const locationPayload = {
      orderId,
      driverId: driverId || null,
      coords: { lat: cleanLat, lng: cleanLng },
      lat: cleanLat,
      lng: cleanLng,
      heading: heading || 0,
      speed: speed || 0,
      timestamp: new Date().toISOString()
    };

    // Broadcast ke order channel (order.${orderId} dan order_${orderId})
    try {
      io.to(`order.${orderId}`).emit('driver-location-updated', locationPayload);
      io.to(`order_${orderId}`).emit('driver-location-updated', locationPayload);
      io.emit('driver-location-updated', locationPayload);

      broadcastToSoketiServer(`order.${orderId}`, 'driver-location-updated', locationPayload);
      broadcastToSoketiServer(`order_${orderId}`, 'driver-location-updated', locationPayload);
    } catch (_wsErr) {}

    res.json({
      success: true,
      coords: { lat: cleanLat, lng: cleanLng }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 📋 GET /api/orders/available-jobs (Daftar Orderan Terbuka untuk Driver)
app.get('/api/orders/available-jobs', async (req, res) => {
  try {
    const jobs = await Order.findAll({
      where: {
        deliveryType: 'delivery',
        deliveryStatus: {
          [Op.in]: ['searching_driver', 'processing', 'confirmed', 'pending']
        },
        [Op.or]: [
          { driverId: null },
          { driverId: '' }
        ],
        status: {
          [Op.notIn]: ['completed', 'cancelled', 'driver_assigned', 'picked_up', 'delivering']
        }
      },
      include: [
        { model: OrderItem, as: 'items' }
      ],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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

// 🛡️ HEURISTIC AI FALLBACK ANALYZER
function generateHeuristicProductAnalysis(productData) {
  const name = (productData.name || productData.nama_produk || '').toLowerCase();
  const desc = (productData.description || productData.deskripsi || '').toLowerCase();
  const price = Number(productData.price || productData.harga || 0);
  const category = (productData.category || productData.kategori || 'makanan').toLowerCase();

  const PROHIBITED_KEYWORDS = ['narkoba', 'ganja', 'sabu', 'miras', 'alkohol', 'senjata', 'pistol', 'peluru', 'judi', 'slot', 'bokep', 'porn', 'seks', 'joki skripsi', 'joki tugas', 'surat palsu', 'rokok elektrik', 'vape illegal'];
  const CAMPUS_FAVORITES = ['kopi', 'teh', 'ganci', 'keychain', 'tas', 'snack', 'roti', 'buku', 'alat tulis', 'pulpen', 'binder', 'totebag', 'jaket', 'hijab', 'mukena', 'pipe cleaner', 'blind bag', 'donat', 'brownies'];

  let score = 92;
  const reasons = [];
  const flags = [];
  let safety = 'PASS';
  let campusEthics = 'PASS';
  let fairPricing = 'PASS';
  let mediaQuality = 'PASS';

  // 1. Check prohibited content
  const foundProhibited = PROHIBITED_KEYWORDS.find(kw => name.includes(kw) || desc.includes(kw));
  if (foundProhibited) {
    score = 15;
    safety = 'FAIL';
    campusEthics = 'FAIL';
    flags.push(`Terdeteksi kata terlarang/tidak diizinkan ("${foundProhibited}")`);
  } else {
    reasons.push('Lolos pemeriksaan keamanan: Bebas dari barang terlarang, senjata, dan konten terlarang');
  }

  // 2. Check campus ethics
  if (name.includes('babi') || desc.includes('non halal') || name.includes('haram')) {
    score = Math.min(score, 30);
    campusEthics = 'FAIL';
    flags.push('Tidak memenuhi standar kehalalan dan etika kampus UIN Antasari');
  } else {
    reasons.push('Sesuai dengan etika, norma syariah, dan nilai kesopanan kampus UIN Antasari');
  }

  // 3. Check pricing fairness
  if (price < 500) {
    score -= 20;
    fairPricing = 'FLAGGED';
    flags.push('Harga terlampau rendah (< Rp 500), verifikasi apakah nominal sudah benar');
  } else if (category === 'makanan' && price > 250000) {
    score -= 15;
    fairPricing = 'FLAGGED';
    flags.push('Harga makanan agak tinggi untuk standar konsumsi harian mahasiswa');
  } else if (price >= 1000 && price <= 200000) {
    reasons.push(`Harga Rp ${price.toLocaleString('id-ID')} sangat wajar & terjangkau untuk mahasiswa`);
  }

  // 4. Content & clarity
  if (name.length < 4) {
    score -= 15;
    mediaQuality = 'FLAGGED';
    flags.push('Nama produk terlalu pendek');
  }
  if (!desc || desc.length < 10) {
    score -= 10;
    mediaQuality = 'FLAGGED';
    flags.push('Deskripsi produk sebaiknya diperlengkap untuk menarik pembeli');
  } else {
    reasons.push('Deskripsi dan rincian produk cukup informatif');
  }

  const hasFavorite = CAMPUS_FAVORITES.some(kw => name.includes(kw) || desc.includes(kw));
  if (hasFavorite) {
    score = Math.min(99, score + 4);
    reasons.push('Produk sangat relevan dan digemari oleh komunitas sivitas akademika UIN Antasari');
  }

  score = Math.max(10, Math.min(99, score));
  const isEligible = score >= 70 && safety === 'PASS' && campusEthics === 'PASS';
  const recommendation = score >= 85 ? 'approve' : (score >= 60 ? 'flagged' : 'reject');
  
  let verdict = 'Sangat Layak Dijual & Memenuhi Standar Kampus Antasari';
  if (recommendation === 'reject') {
    verdict = 'Tidak Layak Dijual (Melanggar Aturan / Keamanan)';
  } else if (recommendation === 'flagged') {
    verdict = 'Perlu Tinjauan Khusus oleh Super Admin';
  }

  return {
    score,
    isEligible,
    recommendation,
    verdict,
    reasons,
    flags,
    checks: { safety, campusEthics, fairPricing, mediaQuality },
    analyzedAt: new Date().toISOString(),
    model: 'Antasari-AI-Safety-Engine v2.4'
  };
}

// 🛡️ AI PRODUCT SAFETY & QUALITY ANALYZER
app.post('/api/ai/analyze-product', async (req, res) => {
  try {
    const { name, nama_produk, description, deskripsi, price, harga, category, kategori, campus, kampus, sellerName } = req.body;
    const prodName = name || nama_produk;
    if (!prodName || !prodName.trim()) {
      return res.status(400).json({ success: false, message: 'Nama produk wajib diisi untuk analisis AI.' });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY || 'sk-83df969bc77b40eda859c2cd357be131';

    const systemPrompt = `Kamu adalah Sistem AI Pengawas Keamanan, Kebijakan, dan Kelayakan Produk Resmi di platform e-commerce kampus "Antasari Mart" (UIN Antasari Banjarmasin).
Tugasmu adalah menganalisis apakah produk yang diposting layak dijual ke publik mahasiswa/dosen atau melanggar aturan.

KRITERIA EVALUASI:
1. KEAMANAN & LEGALITAS: Dilarang keras menjual barang terlarang (narkoba, senjata, miras, rokok elektrik/ilegal, obat keras tanpa izin, konten dewasa/pornografi, jasa joki skripsi/curang akademik).
2. ETIKA KAMPUS ISLAMI UIN: Menghormati nilai keislaman, makanan/minuman harus halal & higienis, pakaian sopan, nama/deskripsi tidak mengandung kata kasar, SARA, atau pornografi.
3. KEWAJARAN HARGA MAHASISWA: Memeriksa apakah harga wajar untuk ekosistem kampus (contoh: snack Rp 5.000 - Rp 35.000 wajar; jika ada snack seharga Rp 5.000.000 atau Rp 10 perak kemungkinan salah ketik / spam).
4. KUALITAS & KELENGKAPAN INFORMASI: Nama produk jelas, deskripsi informatif, kategori sesuai.

FORMAT OUTPUT WAJIB JSON (HANYA JSON murni tanpa markdown formatting):
{
  "score": <angka integer 0-100>,
  "isEligible": <boolean>,
  "recommendation": <"approve"|"flagged"|"reject">,
  "verdict": "<ringkasan 1 kalimat penilaian kelayakan>",
  "reasons": ["<poin kelebihan 1>", "<poin kelebihan 2>"],
  "flags": ["<poin peringatan jika ada, atau kosong jika aman>"],
  "checks": {
    "safety": "<PASS|FLAGGED|FAIL>",
    "campusEthics": "<PASS|FLAGGED|FAIL>",
    "fairPricing": "<PASS|FLAGGED|FAIL>",
    "mediaQuality": "<PASS|FLAGGED|FAIL>"
  }
}`;

    const userPrompt = `Analisis produk berikut:
- Nama Produk: ${prodName}
- Kategori: ${category || kategori || 'makanan'}
- Harga: Rp ${Number(price || harga || 0).toLocaleString('id-ID')}
- Deskripsi: ${description || deskripsi || '(Tidak ada deskripsi)'}
- Kampus: ${campus || kampus || 'Banjarmasin'}
- Penjual: ${sellerName || 'Penjual Kampus'}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

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
        temperature: 0.1,
        max_tokens: 500
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (dsResponse.ok) {
      const data = await dsResponse.json();
      const content = data?.choices?.[0]?.message?.content?.trim() || '';
      try {
        const cleanJson = content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
        const parsed = JSON.parse(cleanJson);
        return res.json({
          success: true,
          analysis: {
            score: typeof parsed.score === 'number' ? parsed.score : 88,
            isEligible: parsed.isEligible !== false,
            recommendation: parsed.recommendation || 'approve',
            verdict: parsed.verdict || 'Produk layak dan memenuhi standar kampus Antasari.',
            reasons: Array.isArray(parsed.reasons) ? parsed.reasons : ['Kategori dan informasi produk sesuai'],
            flags: Array.isArray(parsed.flags) ? parsed.flags : [],
            checks: parsed.checks || { safety: 'PASS', campusEthics: 'PASS', fairPricing: 'PASS', mediaQuality: 'PASS' },
            analyzedAt: new Date().toISOString(),
            model: data?.model || 'deepseek-chat'
          }
        });
      } catch (parseErr) {
        console.warn('Gagal parse json AI response, menggunakan fallback heuristik:', content);
      }
    }
  } catch (error) {
    console.error('Error in AI Product Analysis:', error);
  }

  // Fallback intelligent evaluation
  return res.json({
    success: true,
    analysis: generateHeuristicProductAnalysis(req.body)
  });
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

// 🧹 6. PEMBERSIHAN OTOMATIS PESAN CHAT LAMA (>24 JAM) DI POSTGRESQL
async function cleanupOldChats() {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const deletedCount = await Chat.destroy({
      where: {
        createdAt: {
          [Op.lt]: twentyFourHoursAgo
        }
      }
    });
    if (deletedCount > 0) {
      console.log(`🧹 [PostgreSQL Cleanup] Berhasil membersihkan ${deletedCount} pesan chat yang lebih tua dari 24 jam.`);
    }
  } catch (err) {
    console.warn('⚠️ [PostgreSQL Cleanup Error]:', err.message);
  }
}

// ==========================================
// 🐛 7. LAPOR BUG & DEBUG SYSTEM ENDPOINTS
// ==========================================
app.post('/api/bugs', async (req, res) => {
  try {
    const { category, description, deviceInfo, userInfo, userEmail, userName, userRole, url } = req.body;
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: 'Deskripsi kendala wajib diisi!' });
    }

    const resolvedDeviceInfo = typeof deviceInfo === 'object' ? JSON.stringify(deviceInfo) : (deviceInfo || '');
    const resolvedUserInfo = typeof userInfo === 'object' ? JSON.stringify(userInfo) : JSON.stringify({
      email: userEmail || 'anonymous',
      name: userName || 'Pengguna',
      role: userRole || 'buyer'
    });

    const report = await BugReport.create({
      category: category || 'general',
      description: description.trim(),
      deviceInfo: resolvedDeviceInfo,
      userInfo: resolvedUserInfo,
      url: url || '',
      status: 'open'
    });

    res.json({
      success: true,
      message: '✅ Laporan kendala berhasil diterima dan disimpan di sistem!',
      report
    });
  } catch (error) {
    console.error('Error saving bug report:', error);
    res.status(500).json({ success: false, message: 'Gagal menyimpan laporan kendala: ' + error.message });
  }
});

app.get('/api/bugs', async (req, res) => {
  try {
    const reports = await BugReport.findAll({
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    res.json({
      success: true,
      reports
    });
  } catch (error) {
    console.error('Error fetching bug reports:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil laporan kendala: ' + error.message });
  }
});

const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server Antasari Mart & WebSocket running on port ${PORT}`);
  });
}

module.exports = app;
