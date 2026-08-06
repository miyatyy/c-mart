import { useState } from 'react';
import { formatRupiah } from '../data';

interface ProModalProps {
  user: any;
  onClose: () => void;
}

export default function ProModal({ user, onClose }: ProModalProps) {
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'seller' | 'driver' | 'admin'>(user?.role || 'buyer');
  const [loading, setLoading] = useState(false);

  const roleBenefits = {
    buyer: {
      title: '💎 Paket Pembeli PRO',
      desc: 'Belanja hemat, bebas antri, dan gratis ongkir setiap hari!',
      features: [
        '🚀 Gratis Biaya Ongkir Kurir Kampus sepuasnya',
        '🎟️ Ekstra Diskon / Potongan 10% di semua Toko Koperasi',
        '⚡ Prioritas Pengantaran (Fast Track Delivery)',
        '⭐ Badge Pembeli VIP di Ulasan Produk'
      ],
      price: 10000
    },
    seller: {
      title: '💎 Paket Penjual / Tenant PRO',
      desc: 'Tingkatkan omset toko dan jangkau ribuan mahasiswa lebih cepat!',
      features: [
        '📈 Produk otomatis tampil di Urutan Paling Atas (Top Ranking)',
        '🏷️ Bebas Potongan Komisi Platform (0% Fee Penjualan)',
        '⭐ Badge Toko PRO & Terpercaya di Beranda',
        '📊 Akses Laporan Analitik Penjualan Harian'
      ],
      price: 15000
    },
    driver: {
      title: '💎 Paket Driver Kurir PRO',
      desc: 'Dapatkan orderan lebih sering dan kumpulkan cuan lebih banyak!',
      features: [
        '🛵 Prioritas Utama Menerima Orderan Masuk dari Sistem',
        '💰 Bonus Tambahan Rp 1.000 bersih per pengantaran sukses',
        '🗺️ Akses Navigasi Lokasi Gedung Kampus Lebih Akurat',
        '⭐ Prioritas Rating Driver Tertinggi di Aplikasi'
      ],
      price: 10000
    },
    admin: {
      title: '💎 Paket Admin Koperasi PRO',
      desc: 'Kelola inventaris kampus dan broadcast promo secara instan!',
      features: [
        '📊 Laporan Keuangan Otomatis (Export ke Excel/PDF)',
        '📢 Fitur Broadcast Notifikasi Promo ke Seluruh Pengguna',
        '📦 Manajemen Stok & Multi-Tenant Tanpa Batas',
        '🛠️ Dukungan Layanan Prioritas Pengelola Sistem'
      ],
      price: 25000
    }
  };

  const currentPlan = roleBenefits[selectedRole];

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://192.168.18.11:5000/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: `PRO-${selectedRole.toUpperCase()}-${Date.now()}`,
          grossAmount: currentPlan.price,
          customerDetails: {
            name: user?.nama || 'Pengguna Antasari',
            email: user?.email || 'mahasiswa@uin-antasari.ac.id'
          }
        })
      });
      const data = await response.json();

      if (data.success && data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        alert("Gagal memproses pembayaran langganan.");
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan jaringan.");
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)'
    }}>
      <div className="am-card am-slide-up" style={{
        width: '100%', maxWidth: 480, padding: 24, borderRadius: 24,
        background: 'var(--am-surface)', textAlign: 'left', position: 'relative'
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--am-text-muted)' }}
        >
          ✕
        </button>

        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 4 }}>💎</div>
          <h2 className="am-heading" style={{ margin: 0, fontSize: 20, color: 'var(--am-primary)' }}>Pilih Paket Antasari Mart PRO</h2>
          <p style={{ fontSize: 12, color: 'var(--am-text-muted)', margin: '4px 0 0' }}>Maksimalkan keuntungan dan fitur eksklusif sesuai peranmu!</p>
        </div>

        {/* Tab Pilihan Role */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, background: 'var(--am-bg2)', padding: 4, borderRadius: 12, marginBottom: 16 }}>
          {[
            { key: 'buyer', label: 'Pembeli' },
            { key: 'seller', label: 'Penjual' },
            { key: 'driver', label: 'Driver' },
            { key: 'admin', label: 'Koperasi' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedRole(tab.key as any)}
              style={{
                padding: '8px 4px', borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                background: selectedRole === tab.key ? 'var(--am-primary)' : 'transparent',
                color: selectedRole === tab.key ? 'white' : 'var(--am-text-muted)',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Detail Paket */}
        <div style={{ background: 'var(--am-bg2)', padding: 16, borderRadius: 16, marginBottom: 16, border: '1px solid var(--am-border)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--am-text)', marginBottom: 4 }}>{currentPlan.title}</div>
          <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginBottom: 12 }}>{currentPlan.desc}</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {currentPlan.features.map((feat, idx) => (
              <div key={idx} style={{ fontSize: 12, color: 'var(--am-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>✅</span> {feat}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--am-text-muted)' }}>Biaya Berlangganan:</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--am-primary)' }}>{formatRupiah(currentPlan.price)} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--am-text-muted)' }}>/ bulan</span></span>
        </div>

        <button
          className="am-btn-primary"
          onClick={handleSubscribe}
          disabled={loading}
          style={{ width: '100%', padding: '12px 0', fontSize: 14, fontWeight: 700, borderRadius: 12 }}
        >
          {loading ? 'Menghubungkan ke Pembayaran...' : `🚀 Aktifkan ${currentPlan.title} Sekarang`}
        </button>
      </div>
    </div>
  );
}