const { registerSchema } = require('../src/validators/auth.validator');

describe('registerSchema - aturan NIM mahasiswa vs dosen', () => {
  const base = {
    name: 'Ahmad',
    email: 'ahmad@example.com',
    password: 'password123',
    role: 'pembeli',
    campus: 'banjarmasin',
  };

  test('mahasiswa TANPA nim harus gagal validasi', () => {
    const { error } = registerSchema.validate({ ...base, userType: 'mahasiswa' });
    expect(error).toBeDefined();
  });

  test('mahasiswa DENGAN nim harus lolos validasi', () => {
    const { error } = registerSchema.validate({
      ...base,
      userType: 'mahasiswa',
      nim: '2210120001',
    });
    expect(error).toBeUndefined();
  });

  test('dosen DENGAN nim (seharusnya kosong) harus gagal validasi', () => {
    const { error } = registerSchema.validate({
      ...base,
      userType: 'dosen',
      nim: '2210120001',
    });
    expect(error).toBeDefined();
  });

  test('dosen TANPA nim harus lolos validasi', () => {
    const { error } = registerSchema.validate({ ...base, userType: 'dosen' });
    expect(error).toBeUndefined();
  });

  test('admin_pro tidak wajib mengisi userType/nim', () => {
    const { error } = registerSchema.validate({
      name: 'Admin Utama',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin_pro',
    });
    expect(error).toBeUndefined();
  });
});
