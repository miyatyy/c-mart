const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const { ALL_ROLES, USER_TYPE, CIVITAS_ROLES } = require('../constants/roles');

class User extends Model {
  /** Hilangkan field sensitif sebelum dikirim ke client. */
  toSafeJSON() {
    const { password, refreshToken, ...safe } = this.toJSON();
    return safe;
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    whatsapp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM(...ALL_ROLES),
      allowNull: false,
      defaultValue: 'pembeli',
    },
    // Mahasiswa vs Dosen. Wajib diisi untuk role civitas akademika
    // (pembeli/penjual/driver). Admin & tenant koperasi boleh NULL.
    userType: {
      type: DataTypes.ENUM(...Object.values(USER_TYPE)),
      allowNull: true,
      field: 'user_type',
    },
    // NIM WAJIB kalau userType = mahasiswa, WAJIB NULL/kosong kalau dosen.
    nim: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    campus: {
      type: DataTypes.ENUM('banjarmasin', 'banjarbaru'),
      allowNull: true,
    },
    gender: {
      type: DataTypes.ENUM('male', 'female'),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
    // Menyimpan hash refresh token aktif (opsional, untuk fitur logout/rotate).
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'refresh_token',
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    validate: {
      // Validasi tingkat model: berlaku di SEMUA jalur (register, seed, admin create-user)
      // bukan cuma di request HTTP — jadi konsisten di mana pun User.create dipanggil.
      nimWajibUntukMahasiswa() {
        if (!CIVITAS_ROLES.includes(this.role)) return; // admin_reguler/admin_pro tidak kena aturan ini

        if (this.userType === USER_TYPE.MAHASISWA && !this.nim) {
          throw new Error('NIM wajib diisi untuk role mahasiswa (pembeli/penjual/driver).');
        }
        if (this.userType === USER_TYPE.DOSEN && this.nim) {
          throw new Error('Dosen tidak perlu mengisi NIM.');
        }
      },
    },
  }
);

module.exports = User;
