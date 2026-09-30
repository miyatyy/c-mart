/**
 * 🌱 Database Seeder for Antasari Mart Backend
 * 
 * Mengisi data awal demonstrasi ke database PostgreSQL (Sequelize) dan MongoDB (Mongoose):
 * 1. Demo Users (Super Admin, Mahasiswa Pembeli, Mahasiswa Penjual, Admin Koperasi, Kurir Kampus)
 * 2. Demo Produk Kampus (Almamater, Buku Fiqh, ATK, Blind Bag Myammiy Craft, Makanan, dll.)
 * 3. Demo Riwayat Percakapan Chat (Dual-Engine Vue 3 & React Chat Test)
 * 
 * Penggunaan:
 *   - node seeder.js           (Mode aman: upsert / jangan duplikasi jika data sudah ada)
 *   - node seeder.js --reset   (Mode reset: bersihkan dan isi ulang data demo)
 *   - npm run seed
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const bcrypt = require('bcryptjs');
const { Sequelize, DataTypes } = require('sequelize');
const mongoose = require('mongoose');

// ==========================================
// 1. KONEKSI POSTGRESQL (SEQUELIZE)
// ==========================================
const DB_NAME = process.env.DB_NAME || 'Antasari_Mart';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASS = process.env.DB_PASS || '140203';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;

const isRemoteDb = (process.env.DB_SSL === 'true') || (DB_HOST && !['localhost', '127.0.0.1', 'postgres'].includes(DB_HOST.toLowerCase()) && DB_HOST.includes('.'));

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: parseInt(DB_PORT, 10),
  dialect: 'postgres',
  logging: false,
  dialectOptions: isRemoteDb ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {}
});

// ==========================================
// 2. DEFINISI MODEL POSTGRESQL
// ==========================================
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
  ktmPhotoUrl: { type: DataTypes.TEXT, allowNull: true },
  degreeLevel: { type: DataTypes.STRING, defaultValue: 'S1' },
  entryYear: { type: DataTypes.INTEGER, allowNull: true },
  currentSemester: { type: DataTypes.INTEGER, allowNull: true },
  verificationStatus: { 
    type: DataTypes.STRING, 
    defaultValue: 'not_submitted'
  },
  isActiveStudent: { type: DataTypes.BOOLEAN, defaultValue: true },
  rejectionReason: { type: DataTypes.TEXT, allowNull: true },
  verifiedAt: { type: DataTypes.DATE, allowNull: true },
  verifiedBy: { type: DataTypes.STRING, allowNull: true }
});

const Product = sequelize.define('Product', {
  nama_produk: { type: DataTypes.STRING, allowNull: false },
  deskripsi: { type: DataTypes.TEXT, allowNull: true },
  harga: { type: DataTypes.INTEGER, allowNull: false },
  stok: { type: DataTypes.INTEGER, defaultValue: 50 },
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
  isKoperasi: { type: DataTypes.BOOLEAN, defaultValue: false },
  rating: { type: DataTypes.FLOAT, defaultValue: 5.0 },
  status: { type: DataTypes.STRING, defaultValue: 'active' },
  aiScore: { type: DataTypes.INTEGER, defaultValue: 95 },
  aiAnalysis: { type: DataTypes.JSON, defaultValue: null },
  moderationReason: { type: DataTypes.TEXT, allowNull: true },
  moderatedAt: { type: DataTypes.DATE, allowNull: true }
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
  status: { type: DataTypes.STRING, defaultValue: 'sent' }
});

// ==========================================
// 3. DEFINISI MODEL MONGODB (MONGOCHAT)
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
  createdAt: { type: Date, default: Date.now, expires: 86400 }
});

const MongoChat = mongoose.models.MongoChat || mongoose.model('MongoChat', MongoChatSchema);

// Helper pembuat Room ID yang konsisten
function buildRoomId(emailA, emailB) {
  return [String(emailA).toLowerCase(), String(emailB).toLowerCase()].sort().join('__');
}

// ==========================================
// 4. DATA SEEDER
// ==========================================

async function getSeedUsers() {
  const defaultHash = await bcrypt.hash('password123', 10);
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || '123';
  const superAdminHash = await bcrypt.hash(adminPassword, 10);
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'miyya@gmail.com';

  return [
    {
      nama: process.env.SUPER_ADMIN_NAME || 'Nurmiyaty (Super Admin)',
      email: superAdminEmail,
      password: superAdminHash,
      nim: '190101010001',
      roles: ['super_admin', 'buyer', 'seller', 'driver', 'admin'],
      role: 'super_admin',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MayaSmile&backgroundColor=b6e3f4',
      isPro: true,
      degreeLevel: 'S1',
      entryYear: 2020,
      currentSemester: 8,
      verificationStatus: 'approved',
      isActiveStudent: true,
      verifiedAt: new Date(),
      verifiedBy: 'system'
    },
    {
      nama: 'Ahmad Fauzi (Mahasiswa Pembeli)',
      email: 'pembeli@antasari.ac.id',
      password: defaultHash,
      nim: '220101010045',
      roles: ['buyer'],
      role: 'buyer',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AhmadFauzi&backgroundColor=ffd5dc',
      isPro: false,
      degreeLevel: 'S1',
      entryYear: 2022,
      currentSemester: 4,
      verificationStatus: 'approved',
      isActiveStudent: true,
      verifiedAt: new Date(),
      verifiedBy: 'super_admin'
    },
    {
      nama: 'Myammiy Craft (Penjual Lapak Kampus)',
      email: 'seller1@antasari.ac.id',
      password: defaultHash,
      nim: '210101020088',
      roles: ['seller', 'buyer'],
      role: 'seller',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MyammiyCraft&backgroundColor=c0aede',
      isPro: true,
      degreeLevel: 'S1',
      entryYear: 2021,
      currentSemester: 6,
      verificationStatus: 'approved',
      isActiveStudent: true,
      verifiedAt: new Date(),
      verifiedBy: 'super_admin'
    },
    {
      nama: 'Koperasi Mahasiswa UIN Antasari',
      email: 'koperasi@antasari.ac.id',
      password: defaultHash,
      nim: '200101030005',
      roles: ['admin', 'seller', 'buyer'],
      role: 'admin',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=KoperasiUIN&backgroundColor=d1d4f9',
      isPro: true,
      degreeLevel: 'S1',
      entryYear: 2020,
      currentSemester: 8,
      verificationStatus: 'approved',
      isActiveStudent: true,
      verifiedAt: new Date(),
      verifiedBy: 'super_admin'
    },
    {
      nama: 'Budi Santoso (Kurir Kampus / Driver)',
      email: 'driver@antasari.ac.id',
      password: defaultHash,
      nim: '220101040012',
      roles: ['driver', 'buyer'],
      role: 'driver',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=BudiSantoso&backgroundColor=b6e3f4',
      isPro: false,
      degreeLevel: 'S1',
      entryYear: 2022,
      currentSemester: 4,
      verificationStatus: 'approved',
      isActiveStudent: true,
      verifiedAt: new Date(),
      verifiedBy: 'super_admin'
    }
  ];
}

const SEED_PRODUCTS = [
  {
    nama_produk: 'Blind Bag Keychain Mystery (Myammiy Craft)',
    deskripsi: 'Blind bag suvenir kejutan buatan tangan (handmade) eksklusif Myammiy Craft dari bahan pipe cleaner / kawat bulu chenille premium. Berisi mystery ganci bunga tulip, kaktus senyum, boneka lucu, atau charm kpop! Siap ambil instan di Vending Machine Kampus.',
    harga: 35000,
    stok: 50,
    kategori: 'kerajinan',
    material: 'Kawat Bulu (Pipe Cleaner) Chenille & Benang Rajut Premium',
    kampus: 'banjarmasin',
    sellerId: 'seller_1',
    sellerName: 'Myammiy Craft',
    foto: '/banners/banner_blindbag.jpg',
    images: ['/banners/banner_blindbag.jpg'],
    isKoperasi: false,
    slotNumber: 1,
    rating: 5.0,
    sold: 48,
    status: 'active',
    aiScore: 98
  },
  {
    nama_produk: 'Jaket Almamater Resmi UIN Antasari',
    deskripsi: 'Jaket almamater resmi UIN Antasari Banjarmasin & Banjarbaru. Bahan twist tebal, furing adem, bordir logo komputer presisi. Tersedia size S, M, L, XL, XXL.',
    harga: 185000,
    stok: 50,
    kategori: 'pakaian',
    material: 'Kain Drill Twist Premium & Furing Sutra Dingin (Bordir Komputer)',
    kampus: 'banjarmasin',
    sellerId: 's1',
    sellerName: 'Koperasi UIN Antasari',
    foto: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=400&fit=crop&auto=format',
    images: ['https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=400&fit=crop&auto=format'],
    isKoperasi: true,
    rating: 4.9,
    sold: 312,
    status: 'active',
    aiScore: 95
  },
  {
    nama_produk: 'Buku Fiqh Kontemporer & Muamalah',
    deskripsi: 'Buku referensi wajib mata kuliah Fiqh Muamalah dan Hukum Ekonomi Syariah. Edisi revisi terbaru tahun 2024 dilengkapi studi kasus fintech dan perbankan syariah modern.',
    harga: 75000,
    stok: 50,
    kategori: 'buku',
    material: 'Kertas Bookpaper 72gr Premium (Softcover Doff Emboss)',
    kampus: 'banjarmasin',
    sellerId: 's1',
    sellerName: 'Koperasi UIN Antasari',
    foto: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=400&fit=crop&auto=format',
    images: ['https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=400&fit=crop&auto=format'],
    isKoperasi: true,
    rating: 4.8,
    sold: 120,
    status: 'active',
    aiScore: 92
  },
  {
    nama_produk: 'Paket ATK Komplit Mahasiswa Baru',
    deskripsi: 'Paket bundling hemat: Ballpoint 3 warna gel (3 pcs), Stabilo pastel 4 warna, Binder B5 + isi kertas 100 lembar, sticky notes, map dokumen folio, dan tipp-ex pita.',
    harga: 35000,
    stok: 50,
    kategori: 'atk',
    material: 'Plastik ABS Berkualitas & Tinta Gel Cepat Kering',
    kampus: 'banjarmasin',
    sellerId: 's1',
    sellerName: 'Koperasi UIN Antasari',
    foto: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&h=400&fit=crop&auto=format',
    images: ['https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&h=400&fit=crop&auto=format'],
    isKoperasi: true,
    rating: 4.7,
    sold: 215,
    status: 'active',
    aiScore: 90
  },
  {
    nama_produk: 'Nasi Kuning Komplit Kantin Koperasi',
    deskripsi: 'Nasi kuning khas Banjar dengan lauk ayam bumbu habang, telur balado, serundeng, mi goreng, sambal pedas manis, dan kerupuk renyah. Siap santap hangat setiap pagi.',
    harga: 15000,
    stok: 50,
    kategori: 'makanan',
    material: 'Beras Banjar Pilihan, Kunyit Asli & Ayam Segar Higienis',
    kampus: 'banjarmasin',
    sellerId: 's1',
    sellerName: 'Koperasi UIN Antasari',
    foto: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=400&fit=crop&auto=format',
    images: ['https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=400&fit=crop&auto=format'],
    isKoperasi: true,
    rating: 4.9,
    sold: 540,
    status: 'active',
    aiScore: 96
  },
  {
    nama_produk: 'Hijab Voal Segi Empat Laser Cut',
    deskripsi: 'Hijab voal premium dengan tepi laser cut rapi, lembut di dahi, mudah dibentuk, tidak mudah kusut. Cocok untuk kuliah santai maupun agenda sidang skripsi.',
    harga: 45000,
    stok: 50,
    kategori: 'aksesoris',
    material: 'Bahan Voal Ultrafine Premium (Tepi Lasercut Rapi)',
    kampus: 'banjarmasin',
    sellerId: 's2',
    sellerName: 'Toko Siti — Hijab & Aksesoris',
    foto: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=400&fit=crop&auto=format',
    images: ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=400&fit=crop&auto=format'],
    isKoperasi: false,
    rating: 4.9,
    sold: 168,
    status: 'active',
    aiScore: 94
  },
  {
    nama_produk: 'Snack Tradisional Kue Lapis legit Banjar',
    deskripsi: 'Kue lapis legit khas Banjar dibuat fresh homemade setiap hari. Manis pas, lembut gurih, tanpa bahan pengawet.',
    harga: 10000,
    stok: 50,
    kategori: 'makanan',
    material: 'Tepung Terigu Pilihan, Telur Bebek Asli & Mentega Wijsman',
    kampus: 'banjarmasin',
    sellerId: 's2',
    sellerName: 'Toko Siti — Hijab & Aksesoris',
    foto: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=400&fit=crop&auto=format',
    images: ['https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=400&fit=crop&auto=format'],
    isKoperasi: false,
    rating: 4.7,
    sold: 230,
    status: 'active',
    aiScore: 91
  },
  {
    nama_produk: 'Jasa Print Warna & Jilid Hardcover Skripsi',
    deskripsi: 'Layanan kilat print skripsi kertas A4 80gr full colour + jilid hardcover tinta emas. Lokasi serah terima di Gedung Perpustakaan Kampus 1 & Kampus 2.',
    harga: 55000,
    stok: 50,
    kategori: 'jasa',
    material: 'Kertas HVS 80gr PaperOne & Board Hardcover Linen Emas',
    kampus: 'banjarmasin',
    sellerId: 's1',
    sellerName: 'Koperasi UIN Antasari',
    foto: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=400&fit=crop&auto=format',
    images: ['https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=400&fit=crop&auto=format'],
    isKoperasi: true,
    rating: 4.9,
    sold: 95,
    status: 'active',
    aiScore: 93
  },
  {
    nama_produk: 'Tumbler Stainless Vacuum Flask UIN Antasari',
    deskripsi: 'Tumbler stainless SUS304 kapasitas 500ml dengan indikator suhu LED cerdas. Menjaga minuman tetap dingin/panas hingga 12 jam saat perkuliahan.',
    harga: 65000,
    stok: 50,
    kategori: 'aksesoris',
    material: 'Stainless Steel Food Grade SUS304 & Smart LED Display',
    kampus: 'banjarbaru',
    sellerId: 's3',
    sellerName: 'Habibi Snack Corner',
    foto: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop&auto=format',
    images: ['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop&auto=format'],
    isKoperasi: false,
    rating: 4.6,
    sold: 85,
    status: 'active',
    aiScore: 89
  }
];

function getSeedChats() {
  const roomBuyerSeller = buildRoomId('pembeli@antasari.ac.id', 'seller1@antasari.ac.id');
  const roomBuyerKoperasi = buildRoomId('pembeli@antasari.ac.id', 'koperasi@antasari.ac.id');

  return [
    // Percakapan 1: Antara Pembeli (Ahmad) & Penjual (Myammiy Craft)
    {
      roomId: roomBuyerSeller,
      senderId: 'pembeli@antasari.ac.id',
      senderName: 'Ahmad Fauzi',
      senderRole: 'buyer',
      receiverId: 'seller1@antasari.ac.id',
      receiverName: 'Myammiy Craft',
      receiverRole: 'seller',
      text: 'Halo kak, assalamu\'alaikum! Mau tanya apakah produk Blind Bag Keychain Mystery masih ready stok di vending machine?',
      time: '08:30',
      isRead: true,
      status: 'read'
    },
    {
      roomId: roomBuyerSeller,
      senderId: 'seller1@antasari.ac.id',
      senderName: 'Myammiy Craft',
      senderRole: 'seller',
      receiverId: 'pembeli@antasari.ac.id',
      receiverName: 'Ahmad Fauzi',
      receiverRole: 'buyer',
      text: 'Wa\'alaikumsalam kak Ahmad! Masih ready banyak kak, baru saja kami restock 50 pcs di Slot 1 Vending Machine Gedung Syariah 😊',
      time: '08:32',
      isRead: true,
      status: 'read'
    },
    {
      roomId: roomBuyerSeller,
      senderId: 'pembeli@antasari.ac.id',
      senderName: 'Ahmad Fauzi',
      senderRole: 'buyer',
      receiverId: 'seller1@antasari.ac.id',
      receiverName: 'Myammiy Craft',
      receiverRole: 'seller',
      text: 'Wah mantap kak! Kalau mau pesan custom boneka kawat bulu lewat chat apakah bisa juga?',
      time: '08:35',
      isRead: true,
      status: 'read'
    },
    {
      roomId: roomBuyerSeller,
      senderId: 'seller1@antasari.ac.id',
      senderName: 'Myammiy Craft',
      senderRole: 'seller',
      receiverId: 'pembeli@antasari.ac.id',
      receiverName: 'Ahmad Fauzi',
      receiverRole: 'buyer',
      text: 'Bisa banget kak! Silakan kirimkan referensi gambarnya di sini, pengerjaan biasanya 1 hari kerja saja kak 👍',
      time: '08:36',
      isRead: false,
      status: 'delivered'
    },

    // Percakapan 2: Antara Pembeli (Ahmad) & Admin Koperasi
    {
      roomId: roomBuyerKoperasi,
      senderId: 'pembeli@antasari.ac.id',
      senderName: 'Ahmad Fauzi',
      senderRole: 'buyer',
      receiverId: 'koperasi@antasari.ac.id',
      receiverName: 'Koperasi UIN Antasari',
      receiverRole: 'admin',
      text: 'Permisi kak pengurus koperasi, apakah jaket almamater size L masih tersedia di gerai Kampus 1 Banjarmasin?',
      time: '09:10',
      isRead: true,
      status: 'read'
    },
    {
      roomId: roomBuyerKoperasi,
      senderId: 'koperasi@antasari.ac.id',
      senderName: 'Koperasi UIN Antasari',
      senderRole: 'admin',
      receiverId: 'pembeli@antasari.ac.id',
      receiverName: 'Ahmad Fauzi',
      receiverRole: 'buyer',
      text: 'Halo kak Ahmad, untuk jaket almamater size L ready stok kak di gerai koperasi lantai 1. Bisa langsung ambil atau pesan via aplikasi Antasari Mart.',
      time: '09:15',
      isRead: true,
      status: 'read'
    },
    {
      roomId: roomBuyerKoperasi,
      senderId: 'pembeli@antasari.ac.id',
      senderName: 'Ahmad Fauzi',
      senderRole: 'buyer',
      receiverId: 'koperasi@antasari.ac.id',
      receiverName: 'Koperasi UIN Antasari',
      receiverRole: 'admin',
      text: 'Baik kak, terima kasih banyak informasinya! Segera saya lakukan checkout 🙏',
      time: '09:16',
      isRead: false,
      status: 'sent'
    }
  ];
}

// ==========================================
// 5. RUNNER SEEDER UTAMA
// ==========================================

async function runSeeder() {
  const isReset = process.argv.includes('--reset') || process.argv.includes('-r');
  console.log('\n======================================================');
  console.log('🌱 [ANTASARI MART] Memulai Inisialisasi Seeder Database');
  console.log(`📌 Mode: ${isReset ? '🧹 RESET LENGKAP (--reset)' : '🛡️ AMAN / UPSERT (Skip jika data sudah ada)'}`);
  console.log('======================================================\n');

  try {
    // 1. Koneksi PostgreSQL
    await sequelize.authenticate();
    console.log('🐘 [PostgreSQL] Koneksi database berhasil!');
    await sequelize.sync({ alter: true });
    console.log('🐘 [PostgreSQL] Sinkronisasi tabel model berhasil (alter: true).\n');

    // 2. Koneksi MongoDB (Opsional untuk Chat)
    let mongoConnected = false;
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/Antasari_Mart_Chat';
    try {
      await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 2000 });
      mongoConnected = true;
      console.log('🍃 [MongoDB] Terhubung ke database chat MongoDB!');
    } catch (mErr) {
      console.log('⚠️ [MongoDB] Offline / tidak aktif. Chat akan disinkronkan ke PostgreSQL fallback.');
    }

    // 3. Reset jika diminta
    if (isReset) {
      console.log('\n🧹 Membersihkan data lama...');
      await Chat.destroy({ where: {}, truncate: true }).catch(() => {});
      if (mongoConnected) {
        await MongoChat.deleteMany({}).catch(() => {});
      }
      console.log('✅ Riwayat chat lama berhasil dibersihkan.');
    }

    // 4. Seed Data Pengguna (Users)
    console.log('\n👤 1. Mengisi Data Pengguna Demo...');
    const seedUsers = await getSeedUsers();
    let userCreated = 0;
    let userUpdated = 0;

    for (const userData of seedUsers) {
      const existing = await User.findOne({ where: { email: userData.email } });
      if (existing) {
        if (isReset) {
          await existing.update(userData);
          userUpdated++;
        }
      } else {
        await User.create(userData);
        userCreated++;
      }
    }
    console.log(`✅ Users: ${userCreated} baru dibuat, ${userUpdated} diperbarui.`);

    // 5. Seed Data Produk (Products)
    console.log('\n📦 2. Mengisi Data Produk Kampus & Vending Machine...');
    let prodCreated = 0;
    let prodUpdated = 0;

    for (const prodData of SEED_PRODUCTS) {
      const existing = await Product.findOne({ where: { nama_produk: prodData.nama_produk } });
      if (existing) {
        if (isReset) {
          await existing.update(prodData);
          prodUpdated++;
        }
      } else {
        await Product.create(prodData);
        prodCreated++;
      }
    }
    console.log(`✅ Products: ${prodCreated} baru dibuat, ${prodUpdated} diperbarui.`);

    // 6. Seed Data Chat Percakapan (PostgreSQL & MongoDB)
    console.log('\n💬 3. Mengisi Data Sampel Percakapan Chat (Vue 3 & React Test)...');
    const seedChats = getSeedChats();
    let chatCreated = 0;

    for (const chatData of seedChats) {
      const existingPg = await Chat.findOne({
        where: {
          roomId: chatData.roomId,
          senderId: chatData.senderId,
          text: chatData.text
        }
      });

      if (!existingPg) {
        await Chat.create(chatData);
        chatCreated++;
      }

      if (mongoConnected) {
        const existingMongo = await MongoChat.findOne({
          roomId: chatData.roomId,
          senderId: chatData.senderId,
          text: chatData.text
        });
        if (!existingMongo) {
          await MongoChat.create({
            ...chatData,
            createdAt: new Date()
          });
        }
      }
    }
    console.log(`✅ Chats: ${chatCreated} pesan obrolan sampel berhasil diinput.`);

    // 7. Tampilkan Ringkasan Tabel
    console.log('\n======================================================');
    console.log('📊 RINGKASAN DATA SEEDER SAAT INI DI DATABASE:');
    console.log('======================================================');

    const allUsers = await User.findAll({ attributes: ['id', 'nama', 'email', 'role', 'nim'] });
    console.log('\n👥 Daftar Akun Demo (Password default: "password123", Super Admin: env/ "123"):');
    console.table(allUsers.map(u => ({
      ID: u.id,
      Nama: u.nama,
      Email: u.email,
      Role: u.role,
      NIM: u.nim || '-'
    })));

    const allProducts = await Product.findAll({ attributes: ['id', 'nama_produk', 'harga', 'stok', 'kategori', 'sellerName'] });
    console.log('\n📦 Sampel Produk Kampus Terdaftar:');
    console.table(allProducts.slice(0, 6).map(p => ({
      ID: p.id,
      Nama: p.nama_produk.slice(0, 32) + (p.nama_produk.length > 32 ? '...' : ''),
      Harga: `Rp ${Number(p.harga).toLocaleString('id-ID')}`,
      Stok: p.stok,
      Kategori: p.kategori,
      Seller: p.sellerName
    })));

    const allChats = await Chat.findAll({ attributes: ['id', 'roomId', 'senderName', 'receiverName', 'text', 'status'] });
    console.log('\n💬 Sampel Chat Terdaftar:');
    console.table(allChats.map(c => ({
      ID: c.id,
      Dari: c.senderName,
      Ke: c.receiverName,
      Pesan: c.text.slice(0, 35) + '...',
      Status: c.status
    })));

    console.log('\n🎉 [SELESAI] Database seeding berhasil tuntas tanpa error!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Gagal menjalankan database seeder:', err);
    process.exit(1);
  }
}

runSeeder();
