import React, { useState } from 'react';
import './styles.css'; // Mengimpor file CSS kustom Antasari Mart

export default function SellerRegister() {
  const [formData, setFormData] = useState({
    storeName: '',
    phone: '',
    address: '',
    idCardNumber: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Data pendaftaran seller:', formData);
    // Logika navigasi ke dashboard seller bisa ditambahkan di sini (misal: router.push)
    window.location.href = '/seller-dashboard';
  };

  return (
    <div style={{ display: 'block', height: 'auto', overflowY: 'auto', backgroundColor: 'var(--bg-main)', minHeight: '100vh' }}>
      {/* Header / Navbar */}
      <header style={{ background: 'var(--white)', borderBottom: '1px solid var(--border-color)', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-orange)' }}>Antasari Mart</span>
          <span style={{ color: 'var(--text-muted)' }}>|</span>
          <span style={{ color: 'var(--text-dark)', fontWeight: 500 }}>Pusat Seller Centre</span>
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Sudah punya akun? <a href="#login" style={{ color: 'var(--primary-orange)', fontWeight: 600, textDecoration: 'none' }}>Masuk</a>
        </div>
      </header>

      {/* Main Container Pendaftaran */}
      <main style={{ maxWidth: '600px', margin: '40px auto', background: 'var(--white)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-dark)', marginBottom: '8px' }}>Mulai Berjualan di Antasari Mart</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>Lengkapi informasi toko Anda untuk mulai menjangkau jutaan pelanggan.</p>

        {/* Form Onboarding Seller */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nama Toko</label>
            <input 
              type="text" 
              name="storeName"
              placeholder="Contoh: Toko Berkah Antasari" 
              value={formData.storeName}
              onChange={handleChange}
              required 
              className="form-input" 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nomor Telepon / WhatsApp Toko</label>
            <input 
              type="tel" 
              name="phone"
              placeholder="081234567890" 
              value={formData.phone}
              onChange={handleChange}
              required 
              className="form-input" 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Alamat Lengkap Toko / Gudang Pickup</label>
            <textarea 
              rows={3} 
              name="address"
              placeholder="Masukkan jalan, kecamatan, kota, dan kode pos" 
              value={formData.address}
              onChange={handleChange}
              required 
              className="form-textarea"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nomor KTP (Owner / Pemilik Toko)</label>
            <input 
              type="text" 
              name="idCardNumber"
              placeholder="16 digit nomor KTP" 
              value={formData.idCardNumber}
              onChange={handleChange}
              required 
              maxLength={16} 
              className="form-input" 
            />
          </div>

          <button type="submit" className="btn-primary btn-pulse" style={{ marginTop: '8px' }}>
            Daftar Sekarang & Masuk ke Dashboard
          </button>
        </form>
      </main>
    </div>
  );
}