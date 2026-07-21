const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const midtransClient = require('midtrans-client'); // 💡 Import Midtrans Client

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

// --- 2. INISIALISASI MIDTRANS SNAP (SANDBOX) ---
const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: 'Mid-server-ByzS9GccjkoE9ME18xKE1GNu',
  clientKey: 'Mid-client-8jHsm2sYfBK8gz1A'
});

// --- 3. DEFINISI TABEL (MODEL) ---

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
  foto: { type: DataTypes.TEXT, allowNull: true },
  kampus: { type: DataTypes.STRING, defaultValue: 'banjarmasin' },
  sellerId: { type: DataTypes.STRING, defaultValue: 'seller_1' },
  sellerName: { type: DataTypes.STRING, defaultValue: 'Penjual' }
});

// Model Pesanan (Orders)
const Order = sequelize.define('Order', {
  sellerId: { type: DataTypes.STRING, allowNull: false },
  buyerName: { type: DataTypes.STRING, allowNull: false },
  totalAmount: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
  courier: { type: DataTypes.STRING, allowNull: true }
});

// Model Item Pesanan (Order Items)
const OrderItem = sequelize.define('OrderItem', {
  productName: { type: DataTypes.STRING, allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  price: { type: DataTypes.INTEGER, allowNull: false }
});

Order.hasMany(OrderItem, { as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order);

// Model Voucher Promosi Toko
const Voucher = sequelize.define('Voucher', {
  sellerId: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING, allowNull: false, unique: true },
  discountPercent: { type: DataTypes.INTEGER, allowNull: false },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

// 💡 Model Chat Database Permanen (Terhubung ke Akun Seller & Buyer Asli)
const Chat = sequelize.define('Chat', {
  roomId: { type: DataTypes.STRING, allowNull: false },
  sellerId: { type: DataTypes.STRING, allowNull: false },
  sellerName: { type: DataTypes.STRING, allowNull: false },
  buyerEmail: { type: DataTypes.STRING, allowNull: false },
  buyerName: { type: DataTypes.STRING, allowNull: false },
  senderId: { type: DataTypes.STRING, allowNull: false }, // Menyimpan tipe pengirim ('buyer' atau 'seller')
  text: { type: DataTypes.TEXT, allowNull: false },
  time: { type: DataTypes.STRING, allowNull: false }
});

// --- 4. INISIALISASI DATABASE & DATA AWAL ---
async function initDB() {
  try {
    await sequelize.authenticate();
    console.log('Koneksi PostgreSQL berhasil!');

    await sequelize.sync({ alter: true }); 
    console.log('Database & Tabel berhasil disinkronkan!');

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

// --- 5. ENDPOINT API ---

app.get('/', (req, res) => {
  res.send('Back-end Antasari Mart dengan PostgreSQL, Midtrans & Chat aktif!');
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

// Endpoint Ambil Daftar Produk
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint Tambah Produk
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

// Endpoint Hapus Produk
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

// Endpoint Update Produk
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

// --- ENDPOINT PESANAN (ORDERS) ---

app.get('/api/orders/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    const orders = await Order.findAll({
      where: { sellerId },
      include: [{ model: OrderItem, as: 'items' }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, orders });
  } catch (error) {
    console.error("Gagal ambil pesanan:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/orders/:id/ship', async (req, res) => {
  try {
    const { id } = req.params;
    const { courier } = req.body;

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    }

    await order.update({
      status: 'shipping',
      courier: courier || 'JNE Regular'
    });

    res.json({ success: true, message: "Pesanan berhasil diproses untuk dikirim!", order });
  } catch (error) {
    console.error("Gagal update pengiriman:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- ENDPOINT VOUCHER PROMOSI (VOUCHERS) ---

app.get('/api/vouchers/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    const vouchers = await Voucher.findAll({
      where: { sellerId },
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, vouchers });
  } catch (error) {
    console.error("Gagal ambil voucher:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/vouchers', async (req, res) => {
  try {
    const { sellerId, code, discountPercent } = req.body;
    
    const existingVoucher = await Voucher.findOne({ where: { code } });
    if (existingVoucher) {
      return res.status(400).json({ success: false, message: "Kode voucher sudah digunakan!" });
    }

    const newVoucher = await Voucher.create({
      sellerId: sellerId || 'seller_1',
      code,
      discountPercent: parseInt(discountPercent) || 10,
      isActive: true
    });

    res.json({ success: true, message: "Voucher berhasil dibuat!", voucher: newVoucher });
  } catch (error) {
    console.error("Gagal buat voucher:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- ENDPOINT CHAT REAL-TIME DATABASE (DIPERLUAS UNTUK PENJUAL) ---

// Ambil riwayat chat berdasarkan identifier (buyerEmail atau sellerId)
app.get('/api/chats/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const chats = await Chat.findAll({
      where: {
        [Sequelize.Op.or]: [
          { sellerId: identifier },
          { buyerEmail: identifier },
          { senderId: identifier },
          { sellerId: 'seller_1' } // Fallback universal toko
        ]
      },
      order: [['createdAt', 'ASC']]
    });
    res.json({ success: true, chats });
  } catch (error) {
    console.error("Gagal mengambil chat:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Kirim pesan chat baru dengan penanda 'buyer' atau 'seller' secara pasti
app.post('/api/chats', async (req, res) => {
  try {
    const { roomId, sellerId, sellerName, buyerEmail, buyerName, senderId, text } = req.body;
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 💡 PENANDA MUTLAK: Jika pengirim adalah penjual/admin, set senderId menjadi 'seller'. Jika pembeli, set menjadi 'buyer'.
    const isSeller = senderId?.includes('seller') || senderId?.includes('admin') || senderId === 'SELLER';
    const finalSenderType = isSeller ? 'seller' : 'buyer';

    const newChat = await Chat.create({
      roomId: roomId || `room_${sellerId}_${buyerEmail}`,
      sellerId: sellerId || 'seller_1',
      sellerName: sellerName || 'Koperasi UIN Antasari',
      buyerEmail,
      buyerName,
      senderId: finalSenderType, // Menyimpan nilai 'buyer' atau 'seller' secara konsisten
      text,
      time: timeNow
    });

    res.json({ success: true, message: "Pesan berhasil dikirim!", chat: newChat });
  } catch (error) {
    console.error("Gagal mengirim pesan:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/chats/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Chat.destroy({ where: { id } });
    res.json({ success: true, message: "Pesan berhasil dihapus." });
  } catch (error) {
    console.error("Gagal menghapus pesan:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- 6. ENDPOINT MIDTRANS CHECKOUT ---
app.post('/api/checkout', async (req, res) => {
  try {
    const { orderId, grossAmount, customerDetails } = req.body;

    const cleanAmount = parseInt(grossAmount);
    if (!cleanAmount || isNaN(cleanAmount)) {
      return res.status(400).json({ success: false, message: "Total nominal pembayaran tidak valid!" });
    }

    let parameter = {
      transaction_details: {
        order_id: orderId || `ANTASARI-${Date.now()}`,
        gross_amount: cleanAmount
      },
      customer_details: {
        first_name: customerDetails?.name || 'Mahasiswa UIN Antasari',
        email: customerDetails?.email || 'mahasiswa@uin-antasari.ac.id',
        phone: customerDetails?.phone || '081234567890'
      }
    };

    let transaction = await snap.createTransaction(parameter);
    
    res.json({ 
      success: true, 
      token: transaction.token, 
      redirect_url: transaction.redirect_url 
    });

  } catch (error) {
    console.error("DETAIL ERROR MIDTRANS:", error.ApiResponse || error.message || error);
    res.status(500).json({ success: false, message: error.message || "Gagal membuat transaksi Midtrans." });
  }
});

// Jalankan Server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server berjalan di http://0.0.0.0:${port}`);
});