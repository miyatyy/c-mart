const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const midtransClient = require('midtrans-client');

const app = express();

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

const User = sequelize.define('User', {
  nama: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  nim: { type: DataTypes.STRING, allowNull: true },
  role: { type: DataTypes.STRING, defaultValue: 'buyer' },
  avatar: { type: DataTypes.TEXT, allowNull: true },
  isPro: { type: DataTypes.BOOLEAN, defaultValue: false },
  proExpireDate: { type: DataTypes.DATE, allowNull: true }
});

// 💡 Model Log Aktivitas Login/Logout User
const ActivityLog = sequelize.define('ActivityLog', {
  email: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, allowNull: false },
  action: { type: DataTypes.STRING, allowNull: false }, // 'LOGIN' atau 'LOGOUT'
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
  sold: { type: DataTypes.INTEGER, defaultValue: 0 }
});

const Order = sequelize.define('Order', {
  sellerId: { type: DataTypes.STRING, allowNull: false },
  buyerName: { type: DataTypes.STRING, allowNull: false },
  totalAmount: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
  courier: { type: DataTypes.STRING, allowNull: true }
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
async function initDB() {
  try {
    await sequelize.authenticate();
    console.log('Koneksi PostgreSQL berhasil!');

    await sequelize.sync({ alter: true }); 
    console.log('Database & Tabel berhasil disinkronkan!');

    // Pastikan akun super admin miyya@gmail.com selalu tersedia
    const superAdminCheck = await User.findOne({ where: { email: 'miyya@gmail.com' } });
    if (!superAdminCheck) {
      await User.create({
        email: 'miyya@gmail.com',
        password: '123',
        nama: 'Nurmiyaty (Super Admin)',
        role: 'super_admin',
        isPro: true,
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MayaSmile&backgroundColor=b6e3f4'
      });
      console.log('Akun Super Admin (miyya@gmail.com) berhasil diinisialisasi!');
    }
  } catch (error) {
    console.error('Gagal terhubung ke PostgreSQL:', error);
  }
}

initDB();

// --- 5. ENDPOINT API ---

app.get('/', (req, res) => {
  res.send('Back-end Antasari Mart aktif & berjalan normal!');
});

// Endpoint Login & Pencatatan Log Aktivitas
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;

    let user = await User.findOne({ where: { email, password } });

    // Paksa miyya@gmail.com menjadi super_admin secara otomatis
    if (email === 'miyya@gmail.com') {
      if (!user) {
        user = await User.create({
          email: 'miyya@gmail.com',
          password: password || '123',
          nama: 'Nurmiyaty (Super Admin)',
          role: 'super_admin',
          isPro: true,
          avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MayaSmile&backgroundColor=b6e3f4'
        });
      } else if (user.role !== 'super_admin') {
        await user.update({ role: 'super_admin', isPro: true });
        user.role = 'super_admin';
      }
    }

    if (user) {
      // Catat log login
      await ActivityLog.create({
        email: user.email,
        name: user.nama,
        role: user.role,
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

// Endpoint Register
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, nama, nim, role, avatar } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email sudah terdaftar!" });
    }

    const assignedRole = email === 'miyya@gmail.com' ? 'super_admin' : (role || 'buyer');
    
    const newUser = await User.create({
      email, 
      password, 
      nama, 
      nim, 
      role: assignedRole,
      avatar: avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Default&backgroundColor=b6e3f4'
    });

    await ActivityLog.create({
      email: newUser.email,
      name: newUser.nama,
      role: newUser.role,
      action: 'REGISTER',
      ipAddress: clientIp
    });

    res.json({ success: true, message: "Registrasi berhasil!", user: newUser });
  } catch (error) {
    res.status(400).json({ success: false, message: "Data tidak valid atau gagal mendaftar!" });
  }
});

// Endpoint Ambil Log Aktivitas (Khusus Super Admin)
app.get('/api/activity-logs', async (req, res) => {
  try {
    const logs = await ActivityLog.findAll({
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint Produk & Lainnya
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { nama_produk, deskripsi, harga, stok, kategori, foto, kampus, sellerId, sellerName } = req.body;
    const newProduct = await Product.create({ 
      nama_produk, deskripsi, harga, stok: stok || 0, kategori, 
      foto: foto || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&auto=format',
      kampus: kampus || 'banjarmasin', sellerId: sellerId || 'seller_1', sellerName: sellerName || 'Penjual'
    });
    res.json({ success: true, message: "Produk berhasil ditambahkan!", product: newProduct });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/users/contacts/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const users = await User.findAll({
      where: { email: { [Sequelize.Op.ne]: email } },
      attributes: ['id', 'nama', 'email', 'role', 'avatar', 'isPro']
    });
    res.json({ success: true, contacts: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/chats/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const chats = await Chat.findAll({
      where: {
        [Sequelize.Op.or]: [{ senderId: identifier }, { receiverId: identifier }]
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
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newChat = await Chat.create({
      roomId: buildRoomId(fromId, toId),
      senderId: fromId, senderName: fromName || fromId, senderRole: fromRole || 'buyer',
      receiverId: toId, receiverName: toName || toId, receiverRole: toRole || 'buyer',
      text: text.trim(), time: timeNow
    });
    res.json({ success: true, message: "Pesan terkirim!", chat: newChat });
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

app.post('/api/checkout', async (req, res) => {
  try {
    const { orderId, grossAmount, customerDetails, items } = req.body;
    const cleanAmount = parseInt(grossAmount);

    if (items && Array.isArray(items)) {
      for (const cartItem of items) {
        const productId = cartItem.product?.id || cartItem.productId;
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

    let parameter = {
      transaction_details: { order_id: orderId || `ANTASARI-${Date.now()}`, gross_amount: cleanAmount },
      customer_details: { first_name: customerDetails?.name || 'Mahasiswa', email: customerDetails?.email || 'mhs@uin.ac.id' }
    };

    let transaction = await snap.createTransaction(parameter);
    res.json({ success: true, token: transaction.token, redirect_url: transaction.redirect_url });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(5000, '0.0.0.0', () => {
  console.log('Server running on port 5000');
});