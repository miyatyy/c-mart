import { useState, useEffect } from 'react';
import type { ThemeMode, Campus, AppTab } from '../types';
import { MOCK_ORDERS, formatRupiah } from '../data';
import { getUserOrdersApi } from '../lib/api';

interface DriverDashboardProps {
  theme: ThemeMode;
  campus: Campus;
  driverName: string;
  driverEmail?: string;
  onNavigateTab?: (tab: AppTab) => void;
  cartItemCount?: number;
}

export default function DriverDashboard({
  theme,
  campus,
  driverName,
  driverEmail = 'driver@antasari.mart',
  onNavigateTab,
  cartItemCount = 0
}: DriverDashboardProps) {
  // 💡 State status driver online / offline yang interaktif
  const [isOnline, setIsOnline] = useState(true);

  // 💡 Data dummy awal untuk pesanan aktif
  const dummyInitialOrders = [
    {
      id: 'ORD-901',
      campus: campus,
      status: 'pending',
      deliveryFee: 5000,
      buyerLocation: 'Gedung Fakultas Tarbiyah Lt. 2',
      items: [
        { product: { name: 'Nasi Kuning Haruan Istimewa', sellerName: 'Koperasi UIN Antasari' }, quantity: 2 }
      ]
    },
    {
      id: 'ORD-902',
      campus: campus,
      status: 'confirmed',
      deliveryFee: 4000,
      buyerLocation: 'Asrama Mahasiswa UIN Antasari',
      items: [
        { product: { name: 'Es Teh Manis & Roti Bakar', sellerName: 'Kantin Syariah' }, quantity: 1 }
      ]
    }
  ];

  const [activeOrders, setActiveOrders] = useState(
    MOCK_ORDERS.filter(o => o.campus === campus && ['pending', 'confirmed', 'preparing'].includes(o.status)).length > 0
      ? MOCK_ORDERS.filter(o => o.campus === campus && ['pending', 'confirmed', 'preparing'].includes(o.status))
      : dummyInitialOrders
  );

  const [accepted, setAccepted] = useState<string[]>(['ORD-901']);
  const [tab, setTab] = useState<'tasks' | 'history' | 'my_purchases'>('tasks');
  const isAesthetic = theme === 'aesthetic';

  // 🛍️ Pesanan Pribadi yang Dibeli Driver sebagai Konsumen
  const [myPurchases, setMyPurchases] = useState<any[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  const loadMyPurchases = async () => {
    setLoadingPurchases(true);
    try {
      const activeUser = JSON.parse(localStorage.getItem('am_user_session') || '{}');
      const targetEmail = driverEmail || activeUser.email || '';
      const res = await getUserOrdersApi(targetEmail);
      if (res && res.success && res.orders && res.orders.length > 0) {
        setMyPurchases(res.orders);
      } else {
        // Fallback dummy personal orders if none yet
        const localSaved = JSON.parse(localStorage.getItem('am_my_orders') || '[]');
        if (localSaved.length > 0) {
          setMyPurchases(localSaved);
        } else {
          setMyPurchases([
            {
              id: 'MY-ORD-101',
              orderId: 'ANTASARI-DRV-101',
              date: 'Hari ini, 10:30',
              status: 'on_the_way',
              total: 28000,
              items: [{ name: 'Kopi Susu Gula Aren UIN', qty: 2, price: 14000 }],
              sellerName: 'Kantin Rektorat UIN',
              location: 'Parkiran Motor Gerbang 1 Kampus'
            }
          ]);
        }
      }
    } catch (_e) {
      // Local fallback
    } finally {
      setLoadingPurchases(false);
    }
  };

  useEffect(() => {
    loadMyPurchases();
    window.addEventListener('am_order_created', loadMyPurchases);
    return () => window.removeEventListener('am_order_created', loadMyPurchases);
  }, [driverEmail]);

  const historyOrders = MOCK_ORDERS.filter(o => o.campus === campus && o.status === 'delivered');

  function handleAccept(orderId: string) {
    setAccepted(prev => [...prev, orderId]);
  }

  function handleIgnore(orderId: string) {
    setActiveOrders(prev => prev.filter(o => o.id !== orderId));
  }

  // Hitung total dummy pendapatan
  const totalDeliveries = accepted.length + 3;
  const totalEarnings = (totalDeliveries * 5000) + 15000;

  return (
    <div style={{ padding: '16px 0 80px', maxWidth: 860, margin: '0 auto', fontFamily: 'var(--am-font-body)' }}>
      {/* Header */}
      <div style={{ padding: '0 16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="am-heading" style={{ margin: '0 0 4px', fontSize: 22, color: 'var(--am-text)' }}>🛵 Dashboard Driver & Kurir</h2>
          <div style={{ fontSize: 13, color: 'var(--am-text-muted)' }}>{driverName} · {campus === 'banjarmasin' ? 'Kampus 1 Banjarmasin' : 'Kampus 2 Banjarbaru'}</div>
        </div>

        {/* 🛍️ Universal Shopping Shortcut for Driver */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => onNavigateTab && onNavigateTab('home')}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              border: '1.5px solid var(--am-primary)',
              background: 'rgba(95, 168, 116, 0.1)',
              color: 'var(--am-primary)',
              fontWeight: 800,
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>🛍️</span> Belanja Produk Kampus
          </button>

          <button
            onClick={() => onNavigateTab && onNavigateTab('cart')}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--am-primary)',
              color: 'white',
              fontWeight: 800,
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(95, 168, 116, 0.3)'
            }}
          >
            <span>🛒</span> Keranjang {cartItemCount > 0 ? `(${cartItemCount})` : ''}
          </button>
        </div>
      </div>

      {/* 🌟 UNIVERSAL CONSUMER BANNER: Driver Juga Bebas Berbelanja */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(99, 102, 241, 0.04) 100%)',
          border: '1.5px solid #6366F1',
          borderRadius: 16,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🍟</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#4338CA' }}>
                Lapar saat bertugas? Driver & Kurir bebas berbelanja!
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--am-text-muted)' }}>
                Pesan makanan, minuman, atau snack kampus dan pantau status pesanan pribadi Anda di tab "Belanjaan Saya".
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setTab('my_purchases');
            }}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: 'none',
              background: '#4F46E5',
              color: 'white',
              fontWeight: 800,
              fontSize: 11.5,
              cursor: 'pointer'
            }}
          >
            Lihat Belanjaan Pribadi ↗
          </button>
        </div>
      </div>

      {/* Stats Pekerjaan Pengantaran */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '0 16px 16px' }}>
        {[
          { label: 'Pengantaran Hari Ini', value: `${totalDeliveries} Paket`, icon: '📦' },
          { label: 'Penghasilan Hari Ini', value: formatRupiah(totalEarnings), icon: '💰' },
          { label: 'Rating Driver', value: '4.9 ⭐', icon: '⭐' },
        ].map(s => (
          <div key={s.label} className="am-card" style={{ padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: isAesthetic ? 12 : 13, fontWeight: 700, color: 'var(--am-primary)' }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'var(--am-text-muted)', marginTop: 2, lineHeight: 1.3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Online / Offline Toggle Interaktif */}
      <div style={{ padding: '0 16px 16px' }}>
        <div className="am-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--am-text)' }}>Status Tugas Driver</div>
            <div style={{ fontSize: 12, color: isOnline ? '#22C55E' : '#EF4444', fontWeight: 600 }}>
              {isOnline ? '● Online — siap menerima tugas pengantaran' : '○ Offline — istirahat / tidak menerima antaran'}
            </div>
          </div>
          <div 
            onClick={() => setIsOnline(!isOnline)}
            style={{ 
              width: 48, height: 26, 
              background: isOnline ? 'var(--am-primary)' : '#CBD5E1', 
              borderRadius: 999, position: 'relative', cursor: 'pointer',
              transition: 'background 0.3s'
            }}
          >
            <div style={{ 
              width: 20, height: 20, background: 'white', borderRadius: '50%', 
              position: 'absolute', top: 3, 
              left: isOnline ? '24px' : '4px', 
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              transition: 'left 0.3s' 
            }} />
          </div>
        </div>
      </div>

      {/* Tabs Navigasi Driver */}
      <div style={{ display: 'flex', padding: '0 16px 16px', gap: 8 }}>
        {[
          { key: 'tasks', label: `🛵 Tugas Antaran (${activeOrders.length})` },
          { key: 'history', label: '💰 Riwayat & Fee Antar' },
          { key: 'my_purchases', label: `🛍️ Belanjaan Saya (${myPurchases.length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            style={{
              flex: 1, padding: '9px 4px', border: '1.5px solid var(--am-border)', borderRadius: 10,
              cursor: 'pointer', fontWeight: 800, fontSize: 12, fontFamily: 'var(--am-font-body)',
              background: tab === t.key ? 'var(--am-primary)' : 'var(--am-surface)',
              color: tab === t.key ? 'white' : 'var(--am-text-muted)',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: TUGAS PENGANTARAN (DRIVER WORK) ── */}
      {tab === 'tasks' && (
        <div style={{ padding: '0 16px' }}>
          {!isOnline && (
            <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 12, marginBottom: 16, color: '#EF4444', fontSize: 12, fontWeight: 600 }}>
              ⚠️ Status Anda saat ini Offline. Aktifkan toggle di atas untuk mulai menerima pesanan masuk.
            </div>
          )}

          {activeOrders.length === 0 && accepted.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--am-text-muted)' }}>
              <div style={{ fontSize: 48 }}>🛵</div>
              <div style={{ marginTop: 8, fontWeight: 800 }}>Belum ada pesanan masuk</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Tetap online untuk menerima pesanan pengantaran baru</div>
            </div>
          )}

          {/* Incoming orders to accept/ignore */}
          {isOnline && activeOrders.filter(o => !accepted.includes(o.id)).map(order => (
            <div key={order.id} className="am-card am-slide-up" style={{ padding: 16, marginBottom: 12, border: '2px solid var(--am-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-primary)' }}>Tugas Antar Baru! ({order.id})</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', background: 'rgba(245,158,11,0.12)', color: '#D97706', borderRadius: 999 }}>Ongkir Driver: {formatRupiah(order.deliveryFee)}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--am-text)', marginBottom: 4 }}>
                📦 {order.items.map(i => `${i.product?.name || (i as any).name} ×${i.quantity || 1}`).join(', ')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginBottom: 4 }}>
                🏪 Ambil di: {order.items[0]?.product?.sellerName || 'Tenant Kampus'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginBottom: 12 }}>
                📍 Antar ke: {order.buyerLocation}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="am-btn-outline"
                  style={{ flex: 1, padding: '10px 0', fontSize: 13 }}
                  onClick={() => handleIgnore(order.id)}
                >
                  Abaikan
                </button>
                <button
                  className="am-btn-primary"
                  style={{ flex: 2, padding: '10px 0', fontSize: 13 }}
                  onClick={() => handleAccept(order.id)}
                >
                  ✅ Terima Tugas
                </button>
              </div>
            </div>
          ))}

          {/* Accepted orders */}
          {accepted.map(orderId => {
            const order = activeOrders.find(o => o.id === orderId) || dummyInitialOrders.find(o => o.id === orderId);
            if (!order) return null;
            return (
              <div key={orderId} className="am-card" style={{ padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#22C55E', marginBottom: 8 }}>✅ Tugas Sedang Berjalan ({order.id})</div>
                <div style={{ fontSize: 13, color: 'var(--am-text)', marginBottom: 4 }}>
                  📦 {order.items.map(i => `${i.product?.name || (i as any).name} ×${i.quantity || 1}`).join(', ')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginBottom: 4 }}>
                  🏪 Ambil di: {order.items[0]?.product?.sellerName || 'Tenant Kampus'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginBottom: 12 }}>
                  📍 Antar ke: {order.buyerLocation}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="am-btn-primary" style={{ flex: 1, padding: '9px 0', fontSize: 12 }}>📦 Sudah Diambil</button>
                  <button className="am-btn-primary" style={{ flex: 1, padding: '9px 0', fontSize: 12, background: '#22C55E' }} onClick={() => setAccepted(accepted.filter(id => id !== orderId))}>🎉 Selesai Antar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB 2: RIWAYAT & PENGHASILAN PEKERJAAN (DRIVER HISTORY) ── */}
      {tab === 'history' && (
        <div style={{ padding: '0 16px' }}>
          <div className="am-card" style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--am-text)', marginBottom: 12 }}>💰 Pendapatan Harian Driver</div>
            {[
              { day: 'Hari Ini', deliveries: totalDeliveries, earnings: formatRupiah(totalEarnings) },
              { day: 'Kemarin', deliveries: 8, earnings: formatRupiah(40000) },
              { day: '2 Hari Lalu', deliveries: 5, earnings: formatRupiah(25000) },
            ].map(r => (
              <div key={r.day} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--am-border)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--am-text)' }}>{r.day}</div>
                  <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>{r.deliveries} pengantaran sukses</div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--am-primary)' }}>{r.earnings}</span>
              </div>
            ))}
          </div>

          {historyOrders.map(o => (
            <div key={o.id} className="am-card" style={{ padding: 14, marginBottom: 10, opacity: 0.85 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--am-text)' }}>#{o.id}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#22C55E' }}>+{formatRupiah(o.deliveryFee)}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--am-text-muted)' }}>
                {o.items.map(i => i.product?.name || (i as any).name).join(', ')} → {o.buyerLocation}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB 3: BELANJAAN SAYA / PESANAN PRIBADI DRIVER (UNIVERSAL PURCHASING) ── */}
      {tab === 'my_purchases' && (
        <div style={{ padding: '0 16px' }}>
          <div style={{
            background: 'var(--am-surface)',
            padding: 16,
            borderRadius: 16,
            border: '1px solid var(--am-border)',
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: 'var(--am-text)' }}>
                🛍️ Riwayat Belanjaan Pribadi Anda
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--am-text-muted)' }}>
                Daftar barang yang Anda beli sebagai konsumen di Campus Mart
              </p>
            </div>
            <button
              onClick={() => onNavigateTab && onNavigateTab('home')}
              className="am-btn-primary"
              style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 800 }}
            >
              + Belanja Lagi
            </button>
          </div>

          {loadingPurchases ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--am-text-muted)' }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>⏳</div>
              <div>Memuat riwayat belanjaan pribadi...</div>
            </div>
          ) : myPurchases.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '50px 20px',
              background: 'var(--am-surface)',
              borderRadius: 18,
              border: '1.5px dashed var(--am-border)',
              color: 'var(--am-text-muted)'
            }}>
              <div style={{ fontSize: 42, marginBottom: 10 }}>🛒</div>
              <h4 style={{ margin: '0 0 6px', color: 'var(--am-text)' }}>Belum Ada Pesanan Pribadi</h4>
              <p style={{ fontSize: 12.5, margin: '0 0 16px' }}>
                Driver & Kurir juga bisa jajan pentol, makan siang, beli pulsa/print, atau suvenir kampus!
              </p>
              <button
                onClick={() => onNavigateTab && onNavigateTab('home')}
                className="am-btn-primary"
                style={{ padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 800 }}
              >
                Mulai Belanja Sekarang 🚀
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {myPurchases.map((item, idx) => {
                const orderCode = item.orderId || item.id || `ORD-${idx + 1}`;
                const amount = item.totalAmount || item.total || item.grossAmount || 0;
                const statusStr = (item.status || 'pending').toLowerCase();
                const isDelivered = statusStr === 'delivered' || statusStr === 'claimed' || statusStr === 'selesai';

                return (
                  <div
                    key={orderCode}
                    className="am-card"
                    style={{
                      padding: 16,
                      borderRadius: 16,
                      border: '1px solid var(--am-border)',
                      background: 'var(--am-surface)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--am-primary)' }}>
                          #{orderCode}
                        </span>
                        <span style={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: isDelivered ? '#DCFCE7' : '#FEF3C7',
                          color: isDelivered ? '#16A34A' : '#D97706',
                          textTransform: 'uppercase'
                        }}>
                          {isDelivered ? '✓ Selesai' : '🛵 Sedang Diproses'}
                        </span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--am-text)' }}>
                        {formatRupiah(amount)}
                      </span>
                    </div>

                    <div style={{ fontSize: 12.5, color: 'var(--am-text)', marginBottom: 6 }}>
                      {item.items && Array.isArray(item.items)
                        ? item.items.map((i: any) => `${i.product?.name || i.name || 'Produk'} ×${i.quantity || i.qty || 1}`).join(', ')
                        : 'Produk Pilihan Kampus'}
                    </div>

                    {item.sellerName && (
                      <div style={{ fontSize: 11.5, color: 'var(--am-text-muted)', marginBottom: 10 }}>
                        🏪 Penjual: {item.sellerName}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid var(--am-border)' }}>
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('tracker')}
                        style={{
                          padding: '7px 14px',
                          borderRadius: 8,
                          border: '1px solid var(--am-primary)',
                          background: 'rgba(95, 168, 116, 0.08)',
                          color: 'var(--am-primary)',
                          fontWeight: 800,
                          fontSize: 12,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <span>📍</span> Lacak di Peta Pengiriman
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}