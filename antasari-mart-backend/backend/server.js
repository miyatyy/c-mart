const express = require('express'); // Pastikan sudah require express
const cors = require('cors'); 
const app = require('./src/app');
const env = require('./src/config/env');
const { sequelize } = require('./src/models');

// 1. PASANG CORS DI SINI (Paling atas sebelum routing)
app.use(cors());
app.use(express.json()); // Wajib agar bisa membaca req.body

// Database simulasi (sementara)
const users = [];

// Endpoint Register
app.post('/api/register', (req, res) => {
  const { email, password, nama, nim, isDosen } = req.body;
  
  if (!isDosen && !nim) {
    return res.status(400).json({ success: false, message: "Mahasiswa wajib isi NIM" });
  }

  let role = 'buyer';
  if (email === 'miya2@gmail.com') role = 'seller';
  else if (email === 'miya3@gmail.com') role = 'driver';
  else if (email === 'miya4@gmail.com') role = 'admin';

  const newUser = { email, password, nama, nim, role };
  users.push(newUser); 
  
  res.json({ success: true, user: newUser });
});

// Endpoint Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  // Contoh pengecekan sederhana
  const user = users.find(u => u.email === email && u.password === password) || 
               (email === 'miya@gmail.com' ? { email, role: 'buyer' } : null);
               
  if (user) {
    res.json({ success: true, user });
  } else {
    res.status(401).json({ success: false, message: "Email atau Password salah!" });
  }
});

// 2. JALANKAN SERVER
const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Koneksi database berhasil.');
    await sequelize.sync({ alter: env.nodeEnv === 'development' });

    // Gunakan '0.0.0.0' agar bisa diakses dari IP lain (HP/Perangkat lain)
    app.listen(env.port, '0.0.0.0', () => {
      console.log(`🚀 Server berjalan di http://0.0.0.0:${env.port}`);
    });
  } catch (err) {
    console.error('❌ Gagal menjalankan server:', err);
    process.exit(1);
  }
};

start();