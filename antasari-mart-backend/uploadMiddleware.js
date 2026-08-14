const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

// Konfigurasi Cloudinary dari File .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Konfigurasi Storage & Pembatasan File Aman
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'antasari_mart_products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], // 🔒 Hanya izinkan format gambar resmi
    transformation: [{ width: 800, height: 800, crop: 'limit' }] // Otomatis kompresi ukuran
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 } // 🔒 Batasi ukuran file maksimal 2 MB
});

module.exports = upload;