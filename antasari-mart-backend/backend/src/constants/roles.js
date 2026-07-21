/**
 * Semua role yang dikenal sistem Antasari Mart.
 * Menaruh di satu file supaya nama role tidak "typo-prone" tersebar
 * di controller/middleware yang berbeda-beda.
 */
const ROLES = Object.freeze({
  PEMBELI: 'pembeli',
  PENJUAL: 'penjual',
  DRIVER: 'driver',
  ADMIN_REGULER: 'admin_reguler',
  ADMIN_PRO: 'admin_pro',
});

const ALL_ROLES = Object.values(ROLES);

/**
 * Tingkatan level admin. Semakin besar angkanya, semakin tinggi wewenangnya.
 * admin_pro mencakup semua kewenangan admin_reguler + fitur eksklusif
 * (contoh: hapus akun permanen, kelola biaya sewa lapak/B2B koperasi,
 * lihat laporan keuangan lintas kampus).
 */
const ADMIN_LEVEL = Object.freeze({
  [ROLES.ADMIN_REGULER]: 1,
  [ROLES.ADMIN_PRO]: 2,
});

/** Tipe pengguna kampus — dipakai untuk validasi NIM saat register/login. */
const USER_TYPE = Object.freeze({
  MAHASISWA: 'mahasiswa',
  DOSEN: 'dosen',
});

/** Role yang wajib memiliki userType (mahasiswa/dosen) & karenanya kena aturan NIM. */
const CIVITAS_ROLES = [ROLES.PEMBELI, ROLES.PENJUAL, ROLES.DRIVER];

module.exports = {
  ROLES,
  ALL_ROLES,
  ADMIN_LEVEL,
  USER_TYPE,
  CIVITAS_ROLES,
};
