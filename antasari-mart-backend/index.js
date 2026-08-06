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
async function initDB() {
  try {
    await sequelize.authenticate();
    console.log('Koneksi PostgreSQL berhasil!');

    await sequelize.sync({ alter: true }); 
    console.log('Database & Tabel berhasil disinkronkan!');

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

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;

    let user = await User.findOne({ where: { email, password } });

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
      res.cookie('am_session', user.email, {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: false,
        sameSite: 'lax'
      });

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
    const { nama_produk, deskripsi, harga, stok, kategori, foto, kampus, sellerId, sellerName, slotNumber } = req.body;
    const newProduct = await Product.create({ 
      nama_produk, deskripsi, harga, stok: stok || 0, kategori, 
      foto: foto || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&auto=format',
      kampus: kampus || 'banjarmasin', sellerId: sellerId || 'seller_1', sellerName: sellerName || 'Penjual',
      slotNumber: slotNumber || 1
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

// Endpoint Checkout + Pembuatan Token Vending Machine (DILIMIT KHUSUS GANCI MYAMMIY CRAFT / SELLER_1)
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

// 🤖 ENDPOINT KHUSUS VENDING MACHINE
app.post('/api/vending/claim', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Token tidak ditemukan dalam request!' });
    }

    const order = await Order.findOne({ where: { vendingToken: token } });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Transaksi Vending tidak ditemukan!' });
    }

    if (order.status === 'claimed') {
      return res.status(400).json({ success: false, message: 'Gagal! Barang dari transaksi ini sudah pernah diambil.' });
    }

    await order.update({ status: 'claimed' });

    console.log(`[VENDING CLAIM] Barang untuk Order ${order.orderId} sedang dikeluarkan dari Slot: ${order.slotNumber}`);

    res.json({
      success: true,
      message: 'QR Valid! Mengeluarkan barang dari Vending Machine.',
      dispense: {
        orderId: order.orderId,
        slotNumber: order.slotNumber,
        buyerName: order.buyerName
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 👑 Endpoint Edit / Update Stok Produk (KHUSUS SUPER ADMIN)
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nama_produk, name, 
      deskripsi, description, 
      harga, price, 
      stok, stock, 
      kategori, category, 
      foto, image, 
      slotNumber, 
      userRole, userEmail 
    } = req.body;

    // 🔒 Validasi Keamanan: Hanya Super Admin (Nurmiyaty / miyya@gmail.com) yang diizinkan mengedit
    const isSuperAdmin = (userRole === 'super_admin') || (userEmail === 'miyya@gmail.com');
    
    if (!isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Akses ditolak! Hanya Super Admin (Nurmiyaty) yang diizinkan mengubah stok atau data produk.' 
      });
    }

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan di database!' });
    }

    // Normalisasi Nama Parameter agar tidak terjadi kesalahan pemetaan data
    const finalNama = nama_produk || name || product.nama_produk;
    const finalDeskripsi = deskripsi !== undefined ? deskripsi : (description !== undefined ? description : product.deskripsi);
    const parsedHarga = harga !== undefined ? parseInt(harga) : (price !== undefined ? parseInt(price) : product.harga);
    const parsedStok = stok !== undefined ? parseInt(stok) : (stock !== undefined ? parseInt(stock) : product.stok);
    const finalKategori = kategori || category || product.kategori;
    const finalFoto = foto || image || product.foto;
    const parsedSlot = slotNumber !== undefined ? parseInt(slotNumber) : product.slotNumber;

    // Update data produk di PostgreSQL
    await product.update({
      nama_produk: finalNama,
      deskripsi: finalDeskripsi,
      harga: isNaN(parsedHarga) ? product.harga : parsedHarga,
      stok: isNaN(parsedStok) ? product.stok : parsedStok,
      kategori: finalKategori,
      foto: finalFoto,
      slotNumber: isNaN(parsedSlot) ? product.slotNumber : parsedSlot
    });

    console.log(`[SUPER ADMIN] Stok produk ID ${id} (${product.nama_produk}) berhasil diperbarui menjadi: ${product.stok}`);

    res.json({
      success: true,
      message: 'Berhasil! Data stok produk telah diperbarui oleh Super Admin.',
      product
    });

  } catch (error) {
    console.error('Error saat update produk di database:', error);
    res.status(500).json({ success: false, message: 'Gagal mengupdate produk di database: ' + error.message });
  }
});

app.listen(5000, '0.0.0.0', () => {
  console.log('Server running on port 5000');
});