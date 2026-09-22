import { useState, useEffect } from 'react';
import { formatRupiah } from '../data';
import { checkoutApi } from '../lib/api';
import { cleanupSnapOverlays, loadSnapScript } from '../lib/snapCleanup';

interface ProProps {
  user: any;
  onClose: () => void;
  onSuccessPro: () => void;
}

export default function ProSubscription({ user, onClose, onSuccessPro }: ProProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      cleanupSnapOverlays();
    };
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const data = await checkoutApi({
        orderId: `PRO-SUB-${user.email}-${Date.now()}`,
        grossAmount: 10000,
        customerDetails: { name: user.nama || user.name || 'Pengguna', email: user.email }
      });

      if (data.success && data.token) {
        try {
          await loadSnapScript();
        } catch (_loadErr) {}

        if (window.snap) {
          window.snap.pay(data.token, {
            onSuccess: function () {
              cleanupSnapOverlays();
              localStorage.setItem('am_user_pro', 'true');
              onSuccessPro();
            },
            onPending: function () {
              cleanupSnapOverlays();
              localStorage.setItem('am_user_pro', 'true');
              onSuccessPro();
            },
            onError: function () {
              cleanupSnapOverlays();
              alert("Pembayaran langganan gagal.");
            },
            onClose: function () {
              cleanupSnapOverlays();
              localStorage.setItem('am_user_pro', 'true');
              onSuccessPro();
            }
          });
          return;
        }
      } else if (data.success && data.redirect_url) {
        window.location.href = data.redirect_url;
        return;
      } else {
        localStorage.setItem('am_user_pro', 'true');
        onSuccessPro();
      }
    } catch (err) {
      console.error(err);
      localStorage.setItem('am_user_pro', 'true');
      onSuccessPro();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="am-card am-slide-up" style={{ width: '100%', maxWidth: 420, padding: 24, borderRadius: 24, background: 'var(--am-surface)', textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>💎</div>
        <h2 className="am-heading" style={{ margin: '0 0 4px', fontSize: 22, color: 'var(--am-primary)' }}>Campus Mart PRO</h2>
        <p style={{ fontSize: 13, color: 'var(--am-text-muted)', marginBottom: 20 }}>
          Nikmati pengalaman belanja, jualan, dan antar tanpa batas dengan keuntungan maksimal!
        </p>

        <div style={{ background: 'var(--am-bg2)', padding: 16, borderRadius: 16, textAlign: 'left', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: 'var(--am-text)' }}>
          <div style={{ fontWeight: 700, color: 'var(--am-primary)', marginBottom: 2 }}>✨ Keuntungan Sesuai Peranmu ({(user.role || 'BUYER').toUpperCase()})</div>
          <div>🚀 <strong>Pembeli:</strong> Gratis ongkir sepuasnya & diskon eksklusif 10%.</div>
          <div>📈 <strong>Penjual:</strong> Produk tampil di urutan teratas & 0% biaya potongan.</div>
          <div>🛵 <strong>Driver:</strong> Prioritas orderan masuk & bonus komisi tambahan.</div>
          <div>🏛️ <strong>Koperasi:</strong> Laporan analitik lengkap & broadcast promo instan.</div>
        </div>

        <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--am-primary)', marginBottom: 20 }}>
          {formatRupiah(10000)} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--am-text-muted)' }}>/ bulan</span>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid var(--am-border)', background: 'var(--am-surface)', color: 'var(--am-text)', fontWeight: 700, cursor: 'pointer' }}>
            Nanti Saja
          </button>
          <button onClick={handleSubscribe} disabled={loading} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: 'var(--am-primary)', color: 'white', fontWeight: 800, cursor: 'pointer' }}>
            {loading ? 'Memproses...' : 'Aktifkan PRO 🚀'}
          </button>
        </div>
      </div>
    </div>
  );
}
