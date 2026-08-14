import { useState } from 'react';
import { formatRupiah } from '../data';

interface ProProps {
  user: any;
  onClose: () => void;
  onSuccessPro: () => void;
}

export default function ProSubscription({ user, onClose, onSuccessPro: _onSuccessPro }: ProProps) {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // ✅ URL DINAMIS: Menggunakan window.location.hostname agar tidak ketergantungan IP manual
      const backendUrl = `http://${window.location.hostname}:5000/api/checkout`;
      
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: `PRO-SUB-${user.email}-${Date.now()}`,
          grossAmount: 10000, // Harga langganan 1 Bulan
          customerDetails: { name: user.nama, email: user.email }
        })
      });
      const data = await response.json();

      if (data.success && data.redirect_url) {
        // Simpan status agar setelah bayar sistem mengaktifkan PRO
        localStorage.setItem('am_pending_pro', 'true');
        window.location.href = data.redirect_url;
      } else {
        alert("Gagal memproses langganan.");
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert("Kesalahan jaringan.");
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="am-card am-slide-up" style={{ width: '100%', maxWidth: 420, padding: 24, borderRadius: 24, background: 'var(--am-surface)', textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>💎</div>
        <h2 className="am-heading" style={{ margin: '0 0 4px', fontSize: 22, color: 'var(--am-primary)' }}>Antasari Mart PRO</h2>
        <p style={{ fontSize: 13, color: 'var(--am-text-muted)', marginBottom: 20 }}>
          Nikmati pengalaman belanja, jualan, dan antar tanpa batas dengan keuntungan maksimal!
        </p>

        <div style={{ background: 'var(--am-bg2)', padding: 16, borderRadius: 16, textAlign: 'left', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: 'var(--am-text)' }}>
          <div style={{ fontWeight: 700, color: 'var(--am-primary)', marginBottom: 2 }}>✨ Keuntungan Sesuai Peranmu ({user.role.toUpperCase()})</div>
          <div>🚀 <strong>Pembeli:</strong> Gratis ongkir sepuasnya & diskon eksklusif 10%.</div>
          <div>📈 <strong>Penjual:</strong> Produk tampil di urutan teratas & 0% biaya potongan.</div>
          <div>🛵 <strong>Driver:</strong> Prioritas orderan masuk & bonus komisi tambahan.</div>
          <div>🏛️ <strong>Koperasi:</strong> Laporan analitik lengkap & broadcast promo instan.</div>
        </div>

        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--am-primary)', marginBottom: 16 }}>
          {formatRupiah(10000)} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--am-text-muted)' }}>/ bulan</span>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px 0', background: 'var(--am-bg2)', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--am-text)' }}>
            Nanti Saja
          </button>
          <button className="am-btn-primary" onClick={handleSubscribe} disabled={loading} style={{ flex: 1, padding: '12px 0', borderRadius: 12, fontWeight: 700, fontSize: 14 }}>
            {loading ? 'Memproses...' : '🚀 Langganan Sekarang'}
          </button>
        </div>
      </div>
    </div>
  );
}