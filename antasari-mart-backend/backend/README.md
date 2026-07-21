# Antasari Mart — Backend API

Backend untuk **Antasari Mart Digital Ecosystem**: Node.js + Express + PostgreSQL (Sequelize ORM),
otentikasi JWT (access + refresh token), dan RBAC (Role-Based Access Control) 5 role.

> Catatan pilihan database: struktur ini diimplementasikan dengan **PostgreSQL** karena data marketplace
> (user, produk, pesanan, transaksi keuangan) sangat relasional dan butuh transaksi ACID (mis. saat stok
> berkurang bersamaan dengan pesanan dibuat). Kalau ke depannya ingin pakai **MongoDB**, cukup ganti
> layer `src/models/*` dari Sequelize ke Mongoose — struktur controller, middleware, dan routes di bawah
> ini **tidak perlu berubah** karena sudah dipisah rapi per-lapisan (lihat bagian Arsitektur).

## Struktur Folder

```
backend/
├── package.json
├── .env.example              # salin ke .env lalu isi kredensial asli
├── .gitignore
├── server.js                 # entrypoint: connect DB -> sync -> listen
├── src/
│   ├── app.js                 # setup Express: helmet, cors, rate-limit, routes, error handler
│   ├── config/
│   │   ├── env.js             # sentralisasi & validasi environment variable (fail-fast)
│   │   └── database.js        # instance koneksi Sequelize ke PostgreSQL
│   ├── constants/
│   │   └── roles.js           # daftar role, level admin, tipe user (mahasiswa/dosen)
│   ├── models/
│   │   ├── index.js           # agregator model + tempat relasi antar-model
│   │   └── user.model.js      # schema User + validasi NIM (level model)
│   ├── validators/
│   │   └── auth.validator.js  # Joi schema register & login (validasi NIM level HTTP)
│   ├── middleware/
│   │   ├── validate.middleware.js     # runner generik utk Joi schema
│   │   ├── auth.middleware.js         # verifikasi JWT -> req.user
│   │   ├── rbac.middleware.js         # requireRole, adminProOnly, anyAdmin
│   │   └── errorHandler.middleware.js # 404 handler + global error handler
│   ├── controllers/
│   │   ├── auth.controller.js  # register, login, refresh, logout, me
│   │   └── admin.controller.js # contoh endpoint bertingkat admin_reguler vs admin_pro
│   ├── routes/
│   │   ├── index.js            # gabungan semua sub-router + /health
│   │   ├── auth.routes.js
│   │   └── admin.routes.js
│   └── utils/
│       ├── jwt.js              # sign/verify access & refresh token
│       ├── apiResponse.js      # helper response sukses/gagal yang konsisten
│       └── asyncHandler.js     # wrapper try/catch otomatis untuk controller async
└── tests/
    └── auth.validator.test.js  # unit test aturan NIM mahasiswa vs dosen
```

## Arsitektur (alur request)

```
Client
  │
  ▼
routes/*.routes.js
  │  (1) validate(schema)      -> cek bentuk & aturan input (mis. NIM wajib utk mahasiswa)
  │  (2) authenticate           -> cek/verifikasi JWT, isi req.user
  │  (3) requireRole/anyAdmin/adminProOnly -> cek role sesuai kebutuhan endpoint
  ▼
controllers/*.controller.js    -> logika bisnis, panggil model
  ▼
models/*.model.js (Sequelize) -> query ke PostgreSQL
  ▼
utils/apiResponse.js          -> bungkus response JSON konsisten
```

## Role & RBAC

| Role            | Deskripsi                                   |
|-----------------|----------------------------------------------|
| `pembeli`       | Mahasiswa/dosen yang berbelanja               |
| `penjual`       | Tenant mahasiswa / koperasi kampus            |
| `driver`        | Kurir internal kampus                         |
| `admin_reguler` | Admin koperasi — moderasi, lihat data         |
| `admin_pro`     | Admin koperasi tier tinggi — semua kewenangan `admin_reguler` **+** aksi sensitif (hapus akun permanen, dll) |

RBAC diimplementasikan dua cara di `src/middleware/rbac.middleware.js`:

- `requireRole(...roles)` — daftar role eksplisit yang diizinkan.
- `requireMinAdminLevel(level)` (shortcut: `anyAdmin`, `adminProOnly`) — berbasis **tingkatan**, jadi
  `admin_pro` otomatis lolos di route manapun yang mensyaratkan minimal `admin_reguler`, tanpa perlu
  menulis ulang daftar role di setiap route.

Contoh nyata di `src/routes/admin.routes.js`:

```js
router.get('/users', anyAdmin, listUsers);                 // admin_reguler & admin_pro boleh
router.patch('/users/:id/deactivate', anyAdmin, deactivateUser);
router.delete('/users/:id', adminProOnly, deleteUserPermanently); // HANYA admin_pro
```

## Validasi Khusus: NIM Mahasiswa vs Dosen

Diterapkan di **dua lapisan** (defense in depth):

1. **`src/validators/auth.validator.js`** (Joi, level HTTP request) — request ditolak dengan `422`
   sebelum menyentuh database sama sekali kalau:
   - `userType = mahasiswa` tapi `nim` kosong.
   - `userType = dosen` tapi `nim` diisi.
2. **`src/models/user.model.js`** (Sequelize model validation) — aturan yang sama berlaku juga kalau
   `User.create()` dipanggil dari tempat lain (seeder, script admin, dll), bukan cuma dari HTTP request.

Berlaku juga saat **login** (opsional dari sisi frontend): jika client mengirim `userType: "mahasiswa"`,
maka `nim` wajib disertakan dan akan dicocokkan dengan NIM yang tersimpan di akun tsb sebagai lapisan
verifikasi tambahan (lihat `auth.controller.js -> login`).

## Endpoint yang Tersedia

| Method | Endpoint                          | Auth         | Role                          |
|--------|------------------------------------|--------------|-------------------------------|
| POST   | `/api/auth/register`               | -            | -                              |
| POST   | `/api/auth/login`                  | -            | -                              |
| POST   | `/api/auth/refresh`                | -            | -                              |
| POST   | `/api/auth/logout`                 | Bearer token | user login                     |
| GET    | `/api/auth/me`                     | Bearer token | user login                     |
| GET    | `/api/admin/users`                 | Bearer token | admin_reguler, admin_pro       |
| PATCH  | `/api/admin/users/:id/deactivate`  | Bearer token | admin_reguler, admin_pro       |
| DELETE | `/api/admin/users/:id`             | Bearer token | **admin_pro saja**             |
| GET    | `/api/health`                      | -            | -                              |

## Cara Menjalankan

```bash
cd backend
cp .env.example .env      # lalu isi kredensial PostgreSQL & JWT secret kamu
npm install
npm run dev                # nodemon, auto-restart
# atau
npm start
```

Pastikan database PostgreSQL (`DB_NAME` di .env) sudah dibuat terlebih dahulu, contoh:

```bash
createdb antasari_mart
```

## Contoh Request

**Register mahasiswa (wajib NIM):**
```json
POST /api/auth/register
{
  "name": "Ahmad Fadillah",
  "email": "ahmad@student.uin-antasari.ac.id",
  "password": "rahasia123",
  "role": "pembeli",
  "campus": "banjarmasin",
  "userType": "mahasiswa",
  "nim": "2210120001"
}
```

**Register dosen (tanpa NIM):**
```json
POST /api/auth/register
{
  "name": "Dr. Siti Aminah",
  "email": "siti@uin-antasari.ac.id",
  "password": "rahasia123",
  "role": "penjual",
  "campus": "banjarbaru",
  "userType": "dosen"
}
```

## Langkah Pengembangan Selanjutnya

Struktur ini sengaja difokuskan pada **auth + RBAC** sesuai permintaan. Untuk fitur lain di konsep
Antasari Mart (produk, keranjang, pesanan, chat, tracking driver, laporan keuangan), tinggal tambah
pola yang sama: `model -> validator -> controller -> routes`, lalu daftarkan router baru di
`src/routes/index.js`.
