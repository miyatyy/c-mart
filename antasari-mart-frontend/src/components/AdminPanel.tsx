import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import type { ThemeMode, Campus, Tenant, Product } from '../types';
import { MOCK_TENANTS, MOCK_PRODUCTS } from '../data';
import { getChatsApi, sendChatApi } from '../lib/api';

interface AdminPanelProps {
  theme: ThemeMode;
  campus: Campus;
  currentUserId: string;
  currentUserName: string;
}

export default function AdminPanel({ theme: _theme, campus: _campus, currentUserId, currentUserName }: AdminPanelProps) {
  const [_tenants, _setTenants] = useState<Tenant[]>(MOCK_TENANTS);
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [_adminChats, setAdminChats] = useState<any[]>([]);

  useEffect(() => {
    const fetchAdminChats = async () => {
      try {
        const data = await getChatsApi(currentUserId);
        if (data.success && data.chats) {
          setAdminChats(data.chats);
        }
      } catch (err) {
        console.error("Gagal memuat pesan admin:", err);
      }
    };

    fetchAdminChats();
    const interval = setInterval(fetchAdminChats, 3000);
    return () => clearInterval(interval);
  }, [currentUserId]);

  async function handleApproveProduct(productId: string, productName: string) {
    setProducts(prev => prev.filter(p => p.id !== productId));
    Swal.fire({
      icon: 'success',
      title: 'Produk Disetujui! 🎉',
      text: `Produk "${productName}" kini telah resmi tayang di Beranda Belanja.`,
      confirmButtonColor: '#16A34A',
      timer: 2000,
      showConfirmButton: false
    });
  }

  async function handleRejectProduct(productId: string, productName: string, sellerEmail: string) {
    const { value: reason } = await Swal.fire({
      title: 'Alasan Penolakan Produk ❌',
      input: 'textarea',
      inputLabel: `Tuliskan alasan mengapa produk "${productName}" ditolak:`,
      inputPlaceholder: 'Contoh: Foto produk kurang jelas...',
      showCancelButton: true,
      confirmButtonText: 'Kirim Alasan & Tolak',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#EF4444'
    });

    if (!reason) return;

    try {
      await sendChatApi({
        fromId: currentUserId,
        fromName: currentUserName || 'Admin Koperasi',
        fromRole: 'admin',
        toId: sellerEmail || 'seller@antasari.mart',
        toName: 'Penjual',
        toRole: 'seller',
        text: `Mohon maaf produk "${productName}" ditolak oleh Pengurus Koperasi. Alasan: "${reason}".`
      });

      setProducts(prev => prev.filter(p => p.id !== productId));
      Swal.fire({ icon: 'info', title: 'Produk Ditolak', text: 'Pemberitahuan penolakan telah dikirimkan ke chat penjual.', confirmButtonColor: '#00B4D8' });
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: e.message });
    }
  }

  return (
    <div style={{ padding: '24px 16px 80px', maxWidth: 1000, margin: '0 auto', fontFamily: 'var(--am-font-body)' }}>
      {/* Banner */}
      <div className="am-card" style={{ padding: 24, borderRadius: 20, background: 'linear-gradient(135deg, #03045E 0%, #0077B6 100%)', color: 'white', marginBottom: 20 }}>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>🏛️ Panel Pengelola Koperasi & Tenant</div>
        <p style={{ fontSize: 13, opacity: 0.9, margin: 0 }}>
          Kelola persetujuan katalog produk, status tenant mahasiswa, dan laporan kas koperasi.
        </p>
      </div>

      {/* Verifikasi Produk Tenant */}
      <div className="am-card" style={{ padding: 20, borderRadius: 18, background: 'var(--am-surface)', marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 16, color: 'var(--am-text)' }}>Persetujuan Kurasi Produk Baru</h3>
        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--am-text-muted)', fontSize: 13 }}>Tidak ada produk yang menunggu persetujuan.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {products.slice(0, 5).map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, border: '1px solid var(--am-border)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--am-text)' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>Oleh: {p.sellerName} • Kategori: {p.category}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleApproveProduct(p.id, p.name)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#16A34A', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    Setujui ✅
                  </button>
                  <button onClick={() => handleRejectProduct(p.id, p.name, p.sellerId)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#EF4444', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    Tolak ❌
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
