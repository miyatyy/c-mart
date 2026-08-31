const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config({ path: 'C:/Users/nurmi/Documents/project-antasari-mart/antasari-mart-backend/.env' });

const sequelize = new Sequelize(
  process.env.DB_NAME || 'Antasari_Mart',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASS || '140203',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    logging: false,
    port: 5432
  }
);

const Product = sequelize.define('Product', {
  nama_produk: { type: DataTypes.STRING, allowNull: false },
  deskripsi: { type: DataTypes.TEXT, allowNull: true },
  harga: { type: DataTypes.INTEGER, allowNull: false },
  stok: { type: DataTypes.INTEGER, defaultValue: 50 },
  kategori: { type: DataTypes.STRING, allowNull: false },
  kampus: { type: DataTypes.STRING, defaultValue: 'banjarmasin' },
  sellerId: { type: DataTypes.STRING, allowNull: false },
  sellerName: { type: DataTypes.STRING, allowNull: false },
  foto: { type: DataTypes.TEXT, allowNull: true },
  isKoperasi: { type: DataTypes.BOOLEAN, defaultValue: false },
  slotNumber: { type: DataTypes.INTEGER, defaultValue: 1 },
  rating: { type: DataTypes.FLOAT, defaultValue: 5.0 },
  sold: { type: DataTypes.INTEGER, defaultValue: 0 }
});

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL successfully!');
    
    // Gunakan alter: true untuk otomatis menambahkan kolom isKoperasi, slotNumber, dll jika belum ada
    await sequelize.sync({ alter: true });
    console.log('✅ Database schema synchronized with alter: true!');

    const INITIAL_PRODUCTS = [
      {
        nama_produk: 'Blind Bag Keychain Mystery (Myammiy Craft)',
        deskripsi: 'Blind bag suvenir kejutan buatan tangan (handmade) eksklusif Myammiy Craft dari bahan pipe cleaner / kawat bulu chenille premium. Berisi mystery ganci bunga tulip, kaktus senyum, boneka lucu, atau charm kpop! Siap ambil di Vending Machine Kampus.',
        harga: 35000,
        stok: 50,
        kategori: 'kerajinan',
        kampus: 'banjarmasin',
        sellerId: 'seller_1',
        sellerName: 'Myammiy Craft',
        foto: '/banners/banner_blindbag.jpg',
        isKoperasi: false,
        slotNumber: 1,
        rating: 5.0,
        sold: 28
      },
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
        nama_produk: 'Hijab Segi Empat Premium',
        deskripsi: 'Bahan voal lasercut anti-lusuh. Tersedia 12 warna netral cocok untuk kegiatan kampus & formal.',
        harga: 45000,
        stok: 50,
        kategori: 'aksesoris',
        kampus: 'banjarmasin',
        sellerId: 's2',
        sellerName: 'Toko Siti — Hijab & Aksesoris',
        foto: 'https://images.unsplash.com/photo-1594938298603-c8148c4b4057?w=400&h=400&fit=crop&auto=format',
        isKoperasi: false,
        rating: 4.8,
        sold: 156
      },
      {
        nama_produk: 'Snack Kue Lapis Banjar',
        deskripsi: 'Kue lapis legit tradisional Banjar buatan kos. Tanpa pengawet, fresh setiap pagi. Min. order 3 pcs.',
        harga: 8000,
        stok: 50,
        kategori: 'makanan',
        kampus: 'banjarmasin',
        sellerId: 's2',
        sellerName: 'Toko Siti — Hijab & Aksesoris',
        foto: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=400&fit=crop&auto=format',
        isKoperasi: false,
        rating: 4.6,
        sold: 230
      },
      {
        nama_produk: 'Jasa Print & Jilid Skripsi',
        deskripsi: 'Print A4 full-warna + jilid hard cover. Proses 1 hari kerja. Lokasi: Gedung Syariah Lt. 2.',
        harga: 55000,
        stok: 50,
        kategori: 'jasa',
        kampus: 'banjarmasin',
        sellerId: 's2',
        sellerName: 'Toko Siti — Hijab & Aksesoris',
        foto: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=400&fit=crop&auto=format',
        isKoperasi: false,
        rating: 4.9,
        sold: 67
      },
      {
        nama_produk: 'Almamater UIN Antasari (Banjarbaru)',
        deskripsi: 'Jaket almamater resmi UIN Antasari, khusus stok Kampus 2 Banjarbaru. Size S–XL.',
        harga: 185000,
        stok: 50,
        kategori: 'pakaian',
        kampus: 'banjarbaru',
        sellerId: 's1',
        sellerName: 'Koperasi UIN Antasari',
        foto: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=400&fit=crop&auto=format',
        isKoperasi: true,
        rating: 4.9,
        sold: 98
      },
      {
        nama_produk: 'Es Krim Rasa Tradisional',
        deskripsi: 'Es krim buatan sendiri — rasa durian, kelapa muda, dan pandan. Cocok untuk cuaca panas Banjarbaru.',
        harga: 10000,
        stok: 50,
        kategori: 'minuman',
        kampus: 'banjarbaru',
        sellerId: 's3',
        sellerName: 'Habibi Snack Corner',
        foto: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=400&h=400&fit=crop&auto=format',
        isKoperasi: false,
        rating: 4.7,
        sold: 345
      },
      {
        nama_produk: 'Desain Poster & Infografis',
        deskripsi: 'Jasa desain poster, banner, undangan digital, & infografis. Revisi tak terbatas. Kirim via WA.',
        harga: 40000,
        stok: 50,
        kategori: 'jasa',
        kampus: 'banjarbaru',
        sellerId: 's3',
        sellerName: 'Habibi Snack Corner',
        foto: 'https://images.unsplash.com/photo-1558655146-364adaf1fcc9?w=400&h=400&fit=crop&auto=format',
        isKoperasi: false,
        rating: 4.8,
        sold: 112
      },
      {
        nama_produk: 'Tumbler Stainless Anti Bocor',
        deskripsi: 'Tumbler 500ml food grade, desain UIN Antasari. Cocok bawa ke kelas tanpa takut bocor.',
        harga: 65000,
        stok: 50,
        kategori: 'aksesoris',
        kampus: 'banjarbaru',
        sellerId: 's3',
        sellerName: 'Habibi Snack Corner',
        foto: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop&auto=format',
        isKoperasi: false,
        rating: 4.5,
        sold: 78
      }
    ];

    for (const item of INITIAL_PRODUCTS) {
      const existing = await Product.findOne({ where: { nama_produk: item.nama_produk } });
      if (existing) {
        await existing.update({ 
          stok: 50, 
          harga: item.harga, 
          deskripsi: item.deskripsi, 
          foto: item.foto, 
          sellerId: item.sellerId, 
          sellerName: item.sellerName, 
          slotNumber: item.slotNumber || 1,
          isKoperasi: item.isKoperasi || false,
          kategori: item.kategori,
          kampus: item.kampus
        });
        console.log(`Updated: ${item.nama_produk} -> Stok 50`);
      } else {
        await Product.create(item);
        console.log(`Created: ${item.nama_produk} -> Stok 50`);
      }
    }

    // Set ALL other products in DB to stok: 50
    await Product.update({ stok: 50 }, { where: {} });
    console.log('✅ ALL products in PostgreSQL have been set to stok: 50!');

    const finalProducts = await Product.findAll();
    console.table(finalProducts.map(p => ({
      id: p.id,
      nama: p.nama_produk,
      harga: p.harga,
      stok: p.stok,
      seller: p.sellerName
    })));

    process.exit(0);
  } catch (e) {
    console.error('Error connecting / syncing DB:', e);
    process.exit(1);
  }
}

run();
