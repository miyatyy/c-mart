import { useState } from 'react';
import Swal from 'sweetalert2';
import type { ThemeMode } from '../types';

interface VendingSimulatorProps {
  theme: ThemeMode;
}

export default function VendingSimulator({ theme: _theme }: VendingSimulatorProps) {
  const [inputToken, setInputToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [dispenseData, setDispenseData] = useState<any>(null);

  const handleSimulateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputToken.trim()) return;

    setLoading(true);
    setDispenseData(null);

    try {
      const backendUrl = `http://${window.location.hostname}:5000/api/vending/claim`;
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inputToken.trim() })
      });
      const data = await response.json();

      if (data.success) {
        setDispenseData(data.dispense);
        Swal.fire({
          icon: 'success',
          title: 'Berhasil! 🎉',
          text: `Mesin mengeluarkan barang untuk ${data.dispense.buyerName} dari Slot ${data.dispense.slotNumber}`,
          confirmButtonColor: '#16A34A'
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Klaim ❌',
          text: data.message || 'Token tidak valid atau sudah pernah digunakan.',
          confirmButtonColor: '#EF4444'
        });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Kesalahan Jaringan', text: 'Gagal terhubung ke server backend.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px 16px', maxWidth: 500, margin: '0 auto', fontFamily: 'var(--am-font-body)' }}>
      <div className="am-card" style={{ padding: 24, borderRadius: 20, background: 'var(--am-surface)', textAlign: 'center', border: '1px solid var(--am-border)' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🤖📦</div>
        <h2 className="am-heading" style={{ margin: '0 0 6px', fontSize: 20, color: 'var(--am-text)' }}>Simulasi Mesin Vending</h2>
        <p style={{ fontSize: 13, color: 'var(--am-text-muted)', marginBottom: 20 }}>
          Masukkan kode token atau scan QR dari transaksi pembeli untuk menguji pengeluaran barang.
        </p>

        <form onSubmit={handleSimulateClaim} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            className="am-input"
            placeholder="Contoh: VEND-582910"
            value={inputToken}
            onChange={e => setInputToken(e.target.value)}
            style={{ width: '100%', padding: '12px', fontSize: 14, borderRadius: 10, textAlign: 'center', fontWeight: 700 }}
            required
          />
          <button
            type="submit"
            className="am-btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '12px 0', fontSize: 14, fontWeight: 700, borderRadius: 10, cursor: 'pointer' }}
          >
            {loading ? 'Memproses Mesin...' : '🚀 Simulasi Ambil Barang'}
          </button>
        </form>

        {dispenseData && (
          <div style={{ marginTop: 20, padding: 16, background: '#DCFCE7', borderRadius: 12, border: '1px solid #86EFAC', textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 4 }}>✅ Dispense Berhasil!</div>
            <div style={{ fontSize: 12, color: '#14532D' }}>Order ID: <strong>{dispenseData.orderId}</strong></div>
            <div style={{ fontSize: 12, color: '#14532D' }}>Nama Pembeli: <strong>{dispenseData.buyerName}</strong></div>
            <div style={{ fontSize: 12, color: '#14532D' }}>Slot Terbuka: <strong style={{ fontSize: 14, color: '#16A34A' }}>Slot #{dispenseData.slotNumber}</strong></div>
          </div>
        )}
      </div>
    </div>
  );
}