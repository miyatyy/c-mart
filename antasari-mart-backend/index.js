const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
const port = 3000;

// Konfigurasi CORS & Limit Payload (Wajib 50mb untuk Base64 Foto)
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- 1. KONEKSI POSTGRESQL ---
const sequelize = new Sequelize('Antasari_Mart', 'postgres', '140203', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false  
});

// --- 2. DEFINISI TABEL (MODEL) ---

// Model User
const User = sequelize.define('User', {
  nama: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  nim: { type: DataTypes.STRING, allowNull: true },
  role: { type: DataTypes.STRING, defaultValue: 'buyer' } // buyer, seller, driver, dll
});

// Model Produk / Barang yang Dijual
const Product = sequelize.define('Product', {
  nama_produk: { type: DataTypes.STRING, allowNull: false },
  deskripsi: { type: DataTypes.TEXT, allowNull: true },
  harga: { type: DataTypes.INTEGER, allowNull: false },
  stok: { type: DataTypes.INTEGER, defaultValue: 0 },
  kategori: { type: DataTypes.STRING, allowNull: false },
  foto: { type: DataTypes.TEXT, allowNull: true }, // Menggunakan TEXT agar muat Base64 foto ukuran besar
  kampus: { type: DataTypes.STRING, defaultValue: 'banjarmasin' },
  sellerId: { type: DataTypes.STRING, defaultValue: 'seller_1' },
  sellerName: { type: DataTypes.STRING, defaultValue: 'Penjual' }
});

// --- 3. INISIALISASI DATABASE & DATA AWAL ---
async function initDB() {
  try {
    await sequelize.authenticate();
    console.log('Koneksi PostgreSQL berhasil!');

    // Sync database (alter: true agar struktur tabel otomatis menyesuaikan model)
    await sequelize.sync({ alter: true }); 
    console.log('Database & Tabel berhasil disinkronkan!');

    // Masukkan data awal user jika tabel masih kosong
    const userCount = await User.count();
    if (userCount === 0) {
      await User.bulkCreate([
        { email: 'miya@gmail.com', password: '123', nama: 'Miya Pembeli', role: 'buyer' },
        { email: 'miya2@gmail.com', password: '123', nama: 'Miya Penjual', role: 'seller' },
        { email: 'miya3@gmail.com', password: '123', nama: 'Miya Driver', role: 'driver' },
        { email: 'miya4@gmail.com', password: '123', nama: 'Admin Reguler', role: 'admin_reguler' },
        { email: 'miya5@gmail.com', password: '123', nama: 'Admin Pro', role: 'admin_pro' }
      ]);
      console.log('Data akun bawaan berhasil dimasukkan!');
    }

    // Masukkan data produk awal jika kosong
    const productCount = await Product.count();
    if (productCount === 0) {
      await Product.bulkCreate([
        { nama_produk: 'Jaket Almamater UIN Antasari', harga: 150000, kategori: 'Pakaian' },
        { nama_produk: 'Buku Pemrograman Web', harga: 75000, kategori: 'Buku' },
        { nama_produk: 'Nasi Bungkus Kantin', harga: 15000, kategori: 'Makanan' }
      ]);
      console.log('Data produk awal berhasil dimasukkan!');
    }

  } catch (error) {
    console.error('Gagal terhubung ke PostgreSQL:', error);
  }
}

initDB();

// --- 4. ENDPOINT API ---

app.get('/', (req, res) => {
  res.send('Back-end Antasari Mart dengan PostgreSQL aktif!');
});

// Endpoint Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email, password } });

    if (user) {
      res.json({ success: true, message: "Login berhasil!", user });
    } else {
      res.status(401).json({ success: false, message: "Email atau password salah!" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint Register
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, nama, nim, role } = req.body;

    // Cek apakah email sudah terdaftar
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email sudah terdaftar!" });
    }

    const userRole = role || 'buyer';
    
    const newUser = await User.create({
      email, 
      password, 
      nama, 
      nim, 
      role: userRole
    });

    res.json({ success: true, message: "Registrasi berhasil!", user: newUser });
  } catch (error) {
    res.status(400).json({ success: false, message: "Data tidak valid atau gagal mendaftar!" });
  }
});

// Endpoint Ambil Daftar Produk (Untuk Beranda & Lapak)
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint Tambah Produk (Dari Seller Dashboard)
// Contoh struktur yang benar di index.js backend
app.post('/api/products', async (req, res) => {
  try {
    const { nama_produk, deskripsi, harga, stok, kategori, foto, kampus, sellerId, sellerName } = req.body;
    
    const newProduct = await Product.create({ 
      nama_produk, 
      deskripsi, 
      harga, 
      stok: stok || 0, 
      kategori, 
      foto: foto || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&auto=format',
      kampus: kampus || 'banjarmasin',
      sellerId: sellerId || 'seller_1',
      sellerName: sellerName || 'Penjual'
    });

    res.json({ success: true, message: "Produk berhasil ditambahkan!", product: newProduct });
  } catch (error) {
    console.error("Gagal tambah produk:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint untuk Hapus Produk
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Product.destroy({ where: { id } });
    
    if (deleted) {
      res.json({ success: true, message: "Produk berhasil dihapus" });
    } else {
      res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
    }
  } catch (error) {
    console.error("Gagal hapus produk:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint Hapus Produk (Sinkron ke Lapak & Beranda)
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Product.destroy({ where: { id } });
    
    if (deleted) {
      res.json({ success: true, message: "Produk berhasil dihapus!" });
    } else {
      res.status(404).json({ success: false, message: "Produk tidak ditemukan." });
    }
  } catch (error) {
    console.error("Gagal menghapus produk:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 👉 Endpoint untuk Update / Edit Produk
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_produk, deskripsi, harga, stok, kategori, kampus, foto } = req.body;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
    }

    await product.update({
      nama_produk,
      deskripsi,
      harga,
      stok,
      kategori,
      kampus,
      foto: foto || product.foto
    });

    res.json({ success: true, message: "Produk berhasil diperbarui!", product });
  } catch (error) {
    console.error("Gagal update produk:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Jalankan Server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server berjalan di http://0.0.0.0:${port}`);
});