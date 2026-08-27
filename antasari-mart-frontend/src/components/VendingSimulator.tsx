import { useState } from 'react';
import Swal from 'sweetalert2';
import type { ThemeMode } from '../types';
import { claimVendingApi } from '../lib/api';

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
      const data = await claimVendingApi(inputToken.trim());

      if (data.success && data.dispense) {
        setDispenseData(data.dispense);
        Swal.fire({
          icon: 'success',
          title: 'Berhasil! 🎉',
          text: `Mesin mengeluarkan barang untuk ${data.dispense.buyerName} dari Slot #${data.dispense.slotNumber}`,
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
    } catch (error: any) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Kesalahan Jaringan', text: 'Gagal terhubung ke server backend: ' + error.message });
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
            type="text"
            placeholder="Contoh: VEND-123456"
            value={inputToken}
            onChange={e => setInputToken(e.target.value)}
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              border: '1px solid var(--am-border)',
              fontSize: 16,
              textAlign: 'center',
              fontWeight: 'bold',
              letterSpacing: 2,
              outline: 'none',
              background: 'var(--am-bg)',
              color: 'var(--am-text)'
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px',
              borderRadius: 12,
              border: 'none',
              background: 'var(--am-primary)',
              color: 'white',
              fontSize: 14,
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Memeriksa Token...' : 'Keluarkan Barang dari Mesin 🚀'}
          </button>
        </form>

        {dispenseData && (
          <div style={{ marginTop: 20, padding: 16, borderRadius: 14, background: '#DCFCE7', border: '1px solid #86EFAC', textAlign: 'left' }}>
            <div style={{ fontWeight: 800, color: '#16A34A', marginBottom: 4 }}>✅ Dispense Log:</div>
            <div style={{ fontSize: 12, color: '#166534' }}>Order ID: {dispenseData.orderId}</div>
            <div style={{ fontSize: 12, color: '#166534' }}>Slot Mesin: #{dispenseData.slotNumber}</div>
            <div style={{ fontSize: 12, color: '#166534' }}>Penerima: {dispenseData.buyerName}</div>
          </div>
        )}
      </div>
    </div>
  );
}
