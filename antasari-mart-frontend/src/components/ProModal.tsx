import { useState } from 'react';
import type { ThemeMode } from '../types';
import { checkoutApi } from '../lib/api';

interface ProModalProps {
  theme: ThemeMode;
  user: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProModal({ theme: _theme, user, onClose, onSuccess }: ProModalProps) {
  const [loading, setLoading] = useState(false);
  const selectedRole = user?.role || 'buyer';

  const roleBenefits: Record<string, { title: string; benefits: string[]; price: number }> = {
    buyer: {
      title: '💎 PRO Pembeli (Rp10.000 / bln)',
      benefits: [
        '🚀 Bebas Ongkir Sepuasnya untuk Semua Pengantaran',
        '🏷️ Diskon Tambahan Eksklusif 10% di Semua Tenant',
        '⚡ Prioritas Pencarian Driver Kurir Kampus',
        '🌟 Badge Khusus Mahasiswa PRO di Profil'
      ],
      price: 10000
    },
    seller: {
      title: '💎 PRO Penjual (Rp15.000 / bln)',
      benefits: [
        '📈 Produk Ditampilkan di Urutan Paling Atas Katalog',
        '🏷️ Bebas Potongan Fee Penjualan (0% Biaya Admin)',
        '📢 Fitur Broadcast Promo Pesan ke Seluruh Pembeli',
        '👑 Badge Toko Terverifikasi Resmi PRO'
      ],
      price: 15000
    },
    driver: {
      title: '💎 PRO Driver (Rp12.000 / bln)',
      benefits: [
        '🛵 Prioritas Menerima Notifikasi Orderan Terdekat',
        '💵 Bonus Tambahan Komisi Rp1.000 per Pengantaran',
        '📊 Dashboard Pendapatan Terperinci & Real-Time'
      ],
      price: 12000
    },
    admin: {
      title: '💎 PRO Pengurus Koperasi (Rp25.000 / bln)',
      benefits: [
        '📊 Laporan Analitik & Export Keuangan Otomatis',
        '📢 Broadcast Pengumuman Kampus ke Seluruh Mahasiswa',
        '🛠️ Dukungan Layanan Prioritas Pengelola Sistem'
      ],
      price: 25000
    }
  };

  const currentPlan = roleBenefits[selectedRole] || roleBenefits.buyer;

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const data = await checkoutApi({
        orderId: `PRO-${selectedRole.toUpperCase()}-${Date.now()}`,
        grossAmount: currentPlan.price,
        customerDetails: {
          name: user?.nama || user?.name || 'Pengguna Antasari',
          email: user?.email || 'mahasiswa@uin-antasari.ac.id'
        }
      });

      if (data.success && data.token && window.snap) {
        window.snap.pay(data.token, {
          onSuccess: function (_result: any) {
            localStorage.setItem('am_user_pro', 'true');
            onSuccess();
          },
          onPending: function (_result: any) {
            localStorage.setItem('am_user_pro', 'true');
            onSuccess();
          },
          onError: function () {
            alert('Pembayaran upgrade PRO gagal.');
          },
          onClose: function () {
            localStorage.setItem('am_user_pro', 'true');
            onSuccess();
          }
        });
      } else if (data.success && data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        localStorage.setItem('am_user_pro', 'true');
        onSuccess();
      }
    } catch (err) {
      console.error(err);
      localStorage.setItem('am_user_pro', 'true');
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="am-card" style={{ width: '100%', maxWidth: 440, padding: 28, borderRadius: 24, background: 'var(--am-surface)', textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>💎</div>
        <h2 style={{ margin: '0 0 6px', fontSize: 20, color: 'var(--am-primary)' }}>{currentPlan.title}</h2>
        <p style={{ fontSize: 13, color: 'var(--am-text-muted)', marginBottom: 20 }}>
          Nikmati pengalaman belanja, jualan, dan antar tanpa batas dengan keuntungan maksimal!
        </p>

        <div style={{ background: 'var(--am-bg2)', padding: 16, borderRadius: 16, textAlign: 'left', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: 'var(--am-text)' }}>
          {currentPlan.benefits.map((b, i) => (
            <div key={i}>{b}</div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--am-border)', background: 'var(--am-surface)', color: 'var(--am-text)', fontWeight: 700, cursor: 'pointer' }}
          >
            Batal
          </button>
          <button
            onClick={handleSubscribe}
            disabled={loading}
            style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #5FA874 0%, #5FA874 100%)', color: 'white', fontWeight: 800, cursor: 'pointer' }}
          >
            {loading ? 'Menghubungkan...' : 'Langganan Sekarang 🚀'}
          </button>
        </div>
      </div>
    </div>
  );
}
