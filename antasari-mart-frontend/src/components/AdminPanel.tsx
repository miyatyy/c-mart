import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import type { ThemeMode, Campus, Tenant, Product } from '../types';
import { MOCK_TENANTS, MOCK_PRODUCTS, formatRupiah, CATEGORIES } from '../data';
import { getChatsApi, sendChatApi } from '../lib/api';
import AdminSellerVerificationPanel from './AdminSellerVerificationPanel';

interface AdminPanelProps {
  theme: ThemeMode;
  campus: Campus;
  currentUserId: string;
  currentUserName: string;
}

type AdminTab = 'curation' | 'verifications' | 'tenants' | 'finance' | 'couriers' | 'broadcast';

export default function AdminPanel({
  theme: _theme,
  campus,
  currentUserId,
  currentUserName
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('curation');
  const [selectedCampus, setSelectedCampus] = useState<Campus>(campus);

  // Products for curation
  const [pendingProducts, setPendingProducts] = useState<Product[]>(() => {
    return MOCK_PRODUCTS.map((p, idx) => ({
      ...p,
      status: idx % 3 === 0 ? 'pending' : 'approved'
    } as any));
  });

  const [tenants, setTenants] = useState<Tenant[]>(MOCK_TENANTS);
  const [curationSearch, setCurationSearch] = useState('');
  const [curationCategory, setCurationCategory] = useState('all');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'sellers' | 'buyers'>('all');
  const [broadcastSuccess, setBroadcastSuccess] = useState('');

  // Financial Summary State
  const [koperasiFeeRate] = useState(2.5); // 2.5% fee sharing

  useEffect(() => {
    const fetchAdminChats = async () => {
      try {
        await getChatsApi(currentUserId);
      } catch (err) {
        console.error("Gagal memuat pesan admin:", err);
      }
    };

    fetchAdminChats();
    const interval = setInterval(fetchAdminChats, 5000);
    return () => clearInterval(interval);
  }, [currentUserId]);

  // Product Approval
  async function handleApproveProduct(productId: string | number, productName: string) {
    setPendingProducts(prev =>
      prev.map(p => p.id === productId ? { ...p, status: 'approved' } as any : p)
    );

    Swal.fire({
      icon: 'success',
      title: 'Produk Disetujui! 🎉',
      text: `Produk "${productName}" kini telah resmi diverifikasi dan tayang di Beranda Belanja Mahasiswa.`,
      confirmButtonColor: '#5FA874',
      timer: 2200,
      showConfirmButton: false
    });
  }

  // Product Rejection with reason
  async function handleRejectProduct(productId: string | number, productName: string, sellerEmail: string) {
    const { value: reason } = await Swal.fire({
      title: 'Alasan Penolakan Kurasi ❌',
      input: 'textarea',
      inputLabel: `Tuliskan alasan penolakan produk "${productName}":`,
      inputPlaceholder: 'Contoh: Foto produk buram / deskripsi kurang lengkap / tidak sesuai aturan kampus...',
      showCancelButton: true,
      confirmButtonText: 'Kirim Alasan & Tolak',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#EF4444'
    });

    if (!reason) return;

    try {
      await sendChatApi({
        fromId: currentUserId,
        fromName: currentUserName || 'Pengurus Koperasi UIN',
        fromRole: 'admin',
        toId: sellerEmail || 'seller@antasari.mart',
        toName: 'Penjual Mahasiswa',
        toRole: 'seller',
        text: `Mohon maaf produk "${productName}" belum dapat disetujui oleh Pengurus Koperasi. Alasan: "${reason}". Silakan perbaiki dan ajukan kembali.`
      });

      setPendingProducts(prev =>
        prev.map(p => p.id === productId ? { ...p, status: 'rejected' } as any : p)
      );

      Swal.fire({
        icon: 'info',
        title: 'Produk Ditolak',
        text: 'Pemberitahuan penolakan beserta alasan telah otomatis dikirimkan ke chat penjual.',
        confirmButtonColor: '#5FA874'
      });
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Gagal Mengirim Penolakan', text: e.message });
    }
  }

  // Batch Approve All Pending
  const handleApproveAllPending = () => {
    setPendingProducts(prev => prev.map(p => ({ ...p, status: 'approved' } as any)));
    Swal.fire({
      icon: 'success',
      title: 'Semua Produk Disetujui! 🚀',
      text: 'Seluruh produk yang menunggu kurasi kini telah resmi aktif.',
      confirmButtonColor: '#5FA874',
      timer: 2000
    });
  };

  // Toggle Tenant Active Status
  const handleToggleTenantStatus = (tenantId: string) => {
    setTenants(prev =>
      prev.map(t => {
        if (t.id === tenantId) {
          const next = !t.isOpen;
          Swal.fire({
            icon: 'info',
            title: next ? 'Tenant Diaktifkan 🟢' : 'Tenant Dinonaktifkan 🔴',
            text: `Status operasional ${t.name} berhasil diperbarui.`,
            timer: 1500,
            showConfirmButton: false
          });
          return { ...t, isOpen: next };
        }
        return t;
      })
    );
  };

  // Broadcast Message Submit
  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    // Trigger local in-app notification event across app
    window.dispatchEvent(new CustomEvent('am_trigger_notification', {
      detail: {
        id: String(Date.now()),
        senderId: 'admin_koperasi',
        senderName: 'Pengurus Koperasi UIN',
        senderRole: 'admin',
        senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=KoperasiAdmin',
        text: `📢 PENGUMUMAN KAMPUS: ${broadcastMessage}`,
        time: 'Baru saja'
      }
    }));

    setBroadcastSuccess('Pengumuman resmi berhasil disiarkan ke seluruh aplikasi! 📢✨');
    setBroadcastMessage('');
    setTimeout(() => setBroadcastSuccess(''), 4000);
  };

  // Filter curation products
  const displayCurationList = pendingProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(curationSearch.toLowerCase()) ||
      p.sellerName.toLowerCase().includes(curationSearch.toLowerCase());
    const matchesCat = curationCategory === 'all' || p.category === curationCategory;
    return matchesSearch && matchesCat;
  });

  const pendingCount = pendingProducts.filter((p: any) => p.status === 'pending').length;

  return (
    <div style={{ padding: '24px 16px 100px', maxWidth: 1200, margin: '0 auto', fontFamily: 'var(--am-font-body)' }}>
      {/* 🏛️ EXECUTIVE ADMIN HERO BANNER */}
      <div
        className="am-card"
        style={{
          padding: '24px 28px',
          borderRadius: 24,
          background: 'linear-gradient(135deg, #1E2E24 0%, #294A35 60%, #4D9562 100%)',
          color: 'white',
          marginBottom: 24,
          boxShadow: '0 8px 30px rgba(41, 74, 53, 0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, border: '1.5px solid rgba(255,255,255,0.3)' }}>
              🏛️
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 6 }}>
                  PUSAT KENDALI KOPERASI
                </span>
                <span style={{ fontSize: 11, background: '#10B981', color: 'white', padding: '2px 8px', borderRadius: 6, fontWeight: 800 }}>
                  Sistem Aktif 🟢
                </span>
              </div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>
                Panel Pengelola Koperasi & Tenant Kampus
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.85 }}>
                Pengelola: <strong>{currentUserName}</strong> • Lokasi: {selectedCampus === 'banjarmasin' ? 'Kampus 1 Banjarmasin' : 'Kampus 2 Banjarbaru'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={selectedCampus}
              onChange={e => setSelectedCampus(e.target.value as Campus)}
              style={{
                padding: '9px 14px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                fontWeight: 700,
                fontSize: 12,
                outline: 'none',
                cursor: 'pointer',
                backdropFilter: 'blur(6px)'
              }}
            >
              <option value="banjarmasin" style={{ color: '#000' }}>🏛️ Kampus 1 Banjarmasin</option>
              <option value="banjarbaru" style={{ color: '#000' }}>🌴 Kampus 2 Banjarbaru</option>
            </select>
          </div>
        </div>

        {/* 4 Financial & Operational Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 20, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <div style={{ background: 'rgba(255,255,255,0.08)', padding: '12px 16px', borderRadius: 14 }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Akumulasi Kas Koperasi (2.5%)</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 2, color: '#A7F3D0' }}>{formatRupiah(845000)}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', padding: '12px 16px', borderRadius: 14 }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Tenant Mahasiswa Aktif</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 2 }}>{tenants.length} Tenant</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', padding: '12px 16px', borderRadius: 14 }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Perlu Kurasi / Verifikasi</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 2, color: pendingCount > 0 ? '#FDE047' : 'white' }}>
              {pendingCount} Produk
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', padding: '12px 16px', borderRadius: 14 }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Kurir Kampus Siap Tugas</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 2 }}>8 Driver Aktif</div>
          </div>
        </div>
      </div>

      {broadcastSuccess && (
        <div style={{ marginBottom: 20, padding: '12px 18px', background: 'rgba(22, 163, 74, 0.1)', border: '1.5px solid #16A34A', borderRadius: 14, color: '#16A34A', fontWeight: 700, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{broadcastSuccess}</span>
          <button onClick={() => setBroadcastSuccess('')} style={{ background: 'none', border: 'none', color: '#16A34A', cursor: 'pointer', fontWeight: 800 }}>✕</button>
        </div>
      )}

      {/* 📑 TAB NAVIGATION */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--am-border)', paddingBottom: 10, overflowX: 'auto' }}>
        {[
          { id: 'curation', label: '⚡ Kurasi & Verifikasi Produk', badge: pendingCount },
          { id: 'verifications', label: '🎓 Verifikasi KTM Mahasiswa' },
          { id: 'tenants', label: '🏪 Manajemen Tenant & Penjual', badge: tenants.length },
          { id: 'finance', label: '📈 Laporan Transaksi & Kas' },
          { id: 'couriers', label: '🛵 Pengawasan Kurir Kampus' },
          { id: 'broadcast', label: '📢 Broadcast Pengumuman' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            style={{
              padding: '10px 18px',
              borderRadius: 12,
              border: 'none',
              background: activeTab === t.id ? 'var(--am-primary)' : 'transparent',
              color: activeTab === t.id ? 'white' : 'var(--am-text)',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span style={{
                background: activeTab === t.id ? 'rgba(255,255,255,0.25)' : '#EF4444',
                color: 'white',
                padding: '2px 7px',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 800
              }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: VERIFIKASI MAHASISWA (KTM) ── */}
      {activeTab === 'verifications' && (
        <AdminSellerVerificationPanel
          adminEmail={currentUserId}
          adminName={currentUserName}
          adminRole="admin"
        />
      )}

      {/* ── TAB 1: KURASI & VERIFIKASI PRODUK ── */}
      {activeTab === 'curation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Action Bar */}
          <div className="am-card" style={{ padding: 16, borderRadius: 16, background: 'var(--am-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 260 }}>
                <input
                  type="text"
                  placeholder="Cari produk atau nama penjual..."
                  value={curationSearch}
                  onChange={e => setCurationSearch(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--am-border)',
                    background: 'var(--am-bg2)',
                    color: 'var(--am-text)',
                    fontSize: 12,
                    outline: 'none'
                  }}
                />

                <select
                  value={curationCategory}
                  onChange={e => setCurationCategory(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--am-border)',
                    background: 'var(--am-bg2)',
                    color: 'var(--am-text)',
                    fontSize: 12,
                    outline: 'none'
                  }}
                >
                  <option value="all">Semua Kategori</option>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>

              {pendingCount > 0 && (
                <button
                  onClick={handleApproveAllPending}
                  className="am-btn-primary"
                  style={{ padding: '9px 18px', borderRadius: 10, fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}
                >
                  ✅ Setujui Semua yang Menunggu ({pendingCount})
                </button>
              )}
            </div>
          </div>

          {/* List Produk Kurasi */}
          {displayCurationList.length === 0 ? (
            <div className="am-card" style={{ padding: '60px 24px', textAlign: 'center', borderRadius: 20, background: 'var(--am-surface)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✨</div>
              <h3 style={{ margin: '0 0 6px', fontSize: 18, color: 'var(--am-text)' }}>Semua Produk Telah Terkurasi</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--am-text-muted)' }}>
                Tidak ada produk yang sedang tertahan dalam antrean kurasi.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {displayCurationList.map(p => {
                const isPending = (p as any).status === 'pending';
                const isApproved = (p as any).status === 'approved';

                return (
                  <div
                    key={p.id}
                    className="am-card"
                    style={{
                      padding: 16,
                      borderRadius: 18,
                      background: 'var(--am-surface)',
                      border: isPending ? '1.5px solid #F59E0B' : '1px solid var(--am-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12
                    }}
                  >
                    <div style={{ display: 'flex', gap: 12 }}>
                      <img
                        src={p.image}
                        alt={p.name}
                        style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 12, background: 'var(--am-bg2)', border: '1px solid var(--am-border)', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 800,
                            padding: '2px 7px',
                            borderRadius: 6,
                            background: isPending ? '#FEF3C7' : isApproved ? '#DCFCE7' : '#FEE2E2',
                            color: isPending ? '#D97706' : isApproved ? '#16A34A' : '#DC2626'
                          }}>
                            {isPending ? '⏳ Menunggu Kurasi' : isApproved ? '✅ Terverifikasi' : '❌ Ditolak'}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--am-text-muted)', textTransform: 'capitalize' }}>
                            {p.category}
                          </span>
                        </div>
                        <h4 style={{ margin: '4px 0 2px', fontSize: 14, fontWeight: 800, color: 'var(--am-text)', lineHeight: 1.3 }}>
                          {p.name}
                        </h4>
                        <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--am-primary)' }}>
                          {formatRupiah(p.price)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--am-text-muted)', marginTop: 2 }}>
                          Penjual: <strong>{p.sellerName}</strong>
                        </div>
                      </div>
                    </div>

                    {p.description && (
                      <p style={{ margin: 0, fontSize: 11.5, color: 'var(--am-text-muted)', background: 'var(--am-bg2)', padding: '8px 10px', borderRadius: 8, lineHeight: 1.4 }}>
                        "{p.description}"
                      </p>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                      <button
                        onClick={() => handleApproveProduct(p.id, p.name)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: 10,
                          border: 'none',
                          background: isApproved ? 'var(--am-bg2)' : '#16A34A',
                          color: isApproved ? 'var(--am-text-muted)' : 'white',
                          fontWeight: 800,
                          fontSize: 12,
                          cursor: isApproved ? 'default' : 'pointer'
                        }}
                      >
                        {isApproved ? 'Sudah Aktif ✓' : 'Setujui ✅'}
                      </button>

                      <button
                        onClick={() => handleRejectProduct(p.id, p.name, p.sellerId)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 10,
                          border: 'none',
                          background: '#FEE2E2',
                          color: '#DC2626',
                          fontWeight: 800,
                          fontSize: 12,
                          cursor: 'pointer'
                        }}
                      >
                        Tolak ❌
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: MANAJEMEN TENANT & PENJUAL ── */}
      {activeTab === 'tenants' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="am-card" style={{ padding: 20, borderRadius: 18, background: 'var(--am-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 className="am-heading" style={{ margin: 0, fontSize: 17, color: 'var(--am-text)' }}>
                  Daftar Tenant & Lapak Mahasiswa Terdaftar
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--am-text-muted)' }}>
                  Kelola status operasional, legalitas usaha kampus, dan bagi hasil koperasi
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tenants.map(t => (
                <div
                  key={t.id}
                  style={{
                    padding: '16px 18px',
                    borderRadius: 14,
                    background: 'var(--am-bg2)',
                    border: '1px solid var(--am-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--am-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                      🏪
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--am-text)' }}>{t.name}</span>
                        <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: t.isOpen ? '#DCFCE7' : '#FEE2E2', color: t.isOpen ? '#16A34A' : '#DC2626' }}>
                          {t.isOpen ? 'Buka 🟢' : 'Tutup 🔴'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginTop: 2 }}>
                        Kategori: {t.category} • Kampus: <span style={{ textTransform: 'capitalize' }}>{t.campus}</span> • Rating: ⭐ {t.rating}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => handleToggleTenantStatus(t.id)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 10,
                        border: '1px solid var(--am-border)',
                        background: 'var(--am-surface)',
                        color: t.isOpen ? '#DC2626' : '#16A34A',
                        fontWeight: 800,
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      {t.isOpen ? 'Tutup Paksa ⛔' : 'Buka Tenant ✅'}
                    </button>

                    <button
                      onClick={() => {
                        sendChatApi({
                          fromId: currentUserId,
                          fromName: 'Pengurus Koperasi',
                          fromRole: 'admin',
                          toId: t.id,
                          toName: t.name,
                          toRole: 'seller',
                          text: `Halo ${t.name}, ada pengumuman penting dari pengurus Koperasi UIN Antasari terkait operasional lapak.`
                        });
                        Swal.fire({ icon: 'success', title: 'Pesan Terkirim', text: `Notifikasi telah dikirimkan ke chat ${t.name}.`, timer: 1500 });
                      }}
                      style={{ padding: '8px 12px', borderRadius: 10, border: 'none', background: 'var(--am-primary)', color: 'white', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}
                    >
                      💬 Kirim Pesan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: LAPORAN KAS & TRANSAKSI ── */}
      {activeTab === 'finance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Financial Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <div className="am-card" style={{ padding: 22, borderRadius: 18, background: 'var(--am-surface)' }}>
              <div style={{ fontSize: 12, color: 'var(--am-text-muted)' }}>Total Perputaran Uang (GMV)</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--am-text)', marginTop: 4 }}>{formatRupiah(33800000)}</div>
              <div style={{ fontSize: 11, color: '#16A34A', marginTop: 6, fontWeight: 700 }}>Periode Bulan Berjalan</div>
            </div>

            <div className="am-card" style={{ padding: 22, borderRadius: 18, background: 'var(--am-surface)' }}>
              <div style={{ fontSize: 12, color: 'var(--am-text-muted)' }}>Bagian Bagi Hasil Kas Koperasi ({koperasiFeeRate}%)</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--am-primary)', marginTop: 4 }}>{formatRupiah(845000)}</div>
              <div style={{ fontSize: 11, color: 'var(--am-text-muted)', marginTop: 6 }}>Otomatis masuk kas koperasi UIN</div>
            </div>

            <div className="am-card" style={{ padding: 22, borderRadius: 18, background: 'var(--am-surface)' }}>
              <div style={{ fontSize: 12, color: 'var(--am-text-muted)' }}>Dana Tersalurkan ke Penjual</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#3B82F6', marginTop: 4 }}>{formatRupiah(32955000)}</div>
              <div style={{ fontSize: 11, color: '#3B82F6', marginTop: 6, fontWeight: 700 }}>100% Bersih & Transparan</div>
            </div>
          </div>

          {/* Buku Kas Transaksi */}
          <div className="am-card" style={{ padding: 22, borderRadius: 18, background: 'var(--am-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <h3 className="am-heading" style={{ margin: 0, fontSize: 17, color: 'var(--am-text)' }}>
                📖 Buku Jurnal & Kas Transaksi Kampus
              </h3>
              <button
                onClick={() => {
                  Swal.fire({
                    icon: 'success',
                    title: 'Laporan Siap Diunduh! 📄',
                    text: 'File rekap kas transaksi Koperasi Campus Mart berhasil disiapkan dalam format Excel/PDF.',
                    confirmButtonColor: '#5FA874'
                  });
                }}
                style={{ padding: '8px 16px', borderRadius: 10, border: '1.5px solid var(--am-primary)', background: 'var(--am-primary-light, rgba(95,168,116,0.12))', color: 'var(--am-primary)', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}
              >
                📥 Unduh Laporan Rekap
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { id: 'TRX-9821', desc: 'Bagi Hasil Order #ord_101 (Blind Bag Myammiy)', seller: 'Myammiy Craft', total: 35000, fee: 875, date: 'Hari ini, 14:20' },
                { id: 'TRX-9820', desc: 'Bagi Hasil Order #ord_100 (Ayam Geprek Sambal)', seller: 'Koperasi Antasari', total: 20000, fee: 500, date: 'Hari ini, 13:10' },
                { id: 'TRX-9819', desc: 'Bagi Hasil Order #ord_099 (Es Teh Segar 2x)', seller: 'Warung Bu Siti', total: 10000, fee: 250, date: 'Hari ini, 12:45' },
                { id: 'TRX-9818', desc: 'Bagi Hasil Order #ord_098 (Ganci Kawat Bulu)', seller: 'Myammiy Craft', total: 25000, fee: 625, date: 'Hari ini, 11:30' },
              ].map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--am-bg2)', borderRadius: 12, fontSize: 13 }}>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--am-text)' }}>{t.desc}</div>
                    <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>{t.id} • {t.seller} • {t.date}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, color: 'var(--am-primary)' }}>+ {formatRupiah(t.fee)}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--am-text-muted)' }}>Total TRX: {formatRupiah(t.total)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: PENGAWASAN KURIR ── */}
      {activeTab === 'couriers' && (
        <div className="am-card" style={{ padding: 22, borderRadius: 18, background: 'var(--am-surface)' }}>
          <h3 className="am-heading" style={{ margin: '0 0 8px', fontSize: 17, color: 'var(--am-text)' }}>
            🛵 Armada Kurir Kampus UIN Antasari
          </h3>
          <p style={{ margin: '0 0 18px', fontSize: 12, color: 'var(--am-text-muted)' }}>
            Pantau pergerakan pengantaran pesanan antar-fakultas, gedung kuliah, dan asrama
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {[
              { name: 'Ahmad Fauzi (Fasya)', status: 'Sedang Mengantar 🛵', target: 'Gedung Tarbiyah Lt 2', order: '#ord_101', rating: 4.9 },
              { name: 'Rizky Pratama (Febi)', status: 'Standby di Koperasi 🟢', target: 'Pos Utama Kampus 1', order: '-', rating: 5.0 },
              { name: 'Fajar Siddiq (Fuh)', status: 'Sedang Mengantar 🛵', target: 'Perpustakaan Pusat', order: '#ord_100', rating: 4.8 },
              { name: 'Muhammad Habibi', status: 'Standby di Kampus 2 🟢', target: 'Gedung Rektorat BJB', order: '-', rating: 4.9 },
            ].map((c, i) => (
              <div key={i} style={{ padding: 16, background: 'var(--am-bg2)', borderRadius: 14, border: '1px solid var(--am-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--am-text)' }}>{c.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--am-primary)' }}>⭐ {c.rating}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginBottom: 4 }}>
                  Status: <strong>{c.status}</strong>
                </div>
                <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>
                  Lokasi/Tujuan: {c.target}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 5: BROADCAST PENGUMUMAN ── */}
      {activeTab === 'broadcast' && (
        <div className="am-card" style={{ padding: 24, borderRadius: 20, background: 'var(--am-surface)' }}>
          <h3 className="am-heading" style={{ margin: '0 0 8px', fontSize: 18, color: 'var(--am-text)' }}>
            📢 Siarkan Pengumuman Resmi Koperasi
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--am-text-muted)' }}>
            Pesan yang disiarkan akan langsung muncul sebagai pop-up notifikasi di layar aplikasi mahasiswa dan seller!
          </p>

          <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 600 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)' }}>Target Pengguna</label>
              <select
                value={broadcastTarget}
                onChange={e => setBroadcastTarget(e.target.value as any)}
                style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid var(--am-border)', marginTop: 4, background: 'var(--am-bg2)', color: 'var(--am-text)', fontSize: 13, fontWeight: 700 }}
              >
                <option value="all">Semua Pengguna (Mahasiswa, Dosen & Penjual)</option>
                <option value="sellers">Khusus Seluruh Tenant / Penjual</option>
                <option value="buyers">Khusus Mahasiswa Pembeli</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)' }}>Isi Pesan Pengumuman</label>
              <textarea
                required
                placeholder="Contoh: Koperasi tutup lebih awal hari ini pukul 16:00 WITA dikarenakan acara Dies Natalis Kampus..."
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)', fontSize: 13, height: 100, boxSizing: 'border-box', marginTop: 4 }}
              />
            </div>

            <button
              type="submit"
              className="am-btn-primary"
              style={{ padding: '12px 24px', borderRadius: 12, fontWeight: 800, fontSize: 14, alignSelf: 'flex-start' }}
            >
              🚀 Siarkan Sekarang
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
