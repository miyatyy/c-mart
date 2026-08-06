import { useState } from 'react'
import type { ThemeMode, Campus } from '../types'
import { MOCK_ORDERS, formatRupiah } from '../data'

interface DriverDashboardProps {
  theme: ThemeMode
  campus: Campus
  driverName: string
}

export default function DriverDashboard({ theme, campus, driverName }: DriverDashboardProps) {
  // 💡 State status driver online / offline yang interaktif
  const [isOnline, setIsOnline] = useState(true)

  // 💡 Data dummy awal untuk pesanan aktif (supaya ada isi/tidak kosong saat pertama kali dibuka)
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
  ]

  const [activeOrders, setActiveOrders] = useState(
    MOCK_ORDERS.filter(o => o.campus === campus && ['pending', 'confirmed', 'preparing'].includes(o.status)).length > 0
      ? MOCK_ORDERS.filter(o => o.campus === campus && ['pending', 'confirmed', 'preparing'].includes(o.status))
      : dummyInitialOrders // Menggunakan dummy jika mock orders kosong
  )

  // 💡 Data dummy awal untuk pesanan yang sudah diterima (misal 2 pesanan awal)
  const [accepted, setAccepted] = useState<string[]>(['ORD-901'])
  const [tab, setTab] = useState<'tasks' | 'history'>('tasks')
  const isAesthetic = theme === 'aesthetic'

  const historyOrders = MOCK_ORDERS.filter(o => o.campus === campus && o.status === 'delivered')

  function handleAccept(orderId: string) {
    setAccepted(prev => [...prev, orderId])
  }

  function handleIgnore(orderId: string) {
    setActiveOrders(prev => prev.filter(o => o.id !== orderId))
  }

  // Hitung total dummy pendapatan (misal per pesanan sukses dikali Rp 5.000 + data dummy dasar Rp 15.000)
  const totalDeliveries = accepted.length + 3
  const totalEarnings = (totalDeliveries * 5000) + 15000

  return (
    <div style={{ padding: '16px 0 80px' }}>
      {/* Header */}
      <div style={{ padding: '0 16px 16px' }}>
        <h2 className="am-heading" style={{ margin: '0 0 4px', fontSize: 22, color: 'var(--am-text)' }}>🛵 Dashboard Driver</h2>
        <div style={{ fontSize: 13, color: 'var(--am-text-muted)' }}>{driverName} · {campus === 'banjarmasin' ? 'Banjarmasin' : 'Banjarbaru'}</div>
      </div>

      {/* Stats dengan Data Dummy Terisi */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '0 16px 16px' }}>
        {[
          { label: 'Pengantaran Hari Ini', value: `${totalDeliveries} Paket`, icon: '📦' },
          { label: 'Penghasilan Hari Ini', value: formatRupiah(totalEarnings), icon: '💰' },
          { label: 'Rating', value: '4.9 ⭐', icon: '⭐' },
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
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--am-text)' }}>Status Driver</div>
            <div style={{ fontSize: 12, color: isOnline ? '#22C55E' : '#EF4444', fontWeight: 600 }}>
              {isOnline ? '● Online — siap menerima pesanan' : '○ Offline — tidak menerima pesanan'}
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

      {/* Tabs */}
      <div style={{ display: 'flex', padding: '0 16px 16px', gap: 8 }}>
        {[
          { key: 'tasks', label: '📋 Pesanan Masuk' },
          { key: 'history', label: '📜 Riwayat' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            style={{
              flex: 1, padding: '8px 0', border: '1.5px solid var(--am-border)', borderRadius: 8,
              cursor: 'pointer', fontWeight: 600, fontSize: 12, fontFamily: 'var(--am-font-body)',
              background: tab === t.key ? 'var(--am-primary)' : 'var(--am-surface)',
              color: tab === t.key ? 'white' : 'var(--am-text-muted)',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tasks */}
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
              <div style={{ marginTop: 8 }}>Belum ada pesanan masuk</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Tetap online untuk menerima pesanan</div>
            </div>
          )}

          {/* Incoming orders to accept/ignore */}
          {isOnline && activeOrders.filter(o => !accepted.includes(o.id)).map(order => (
            <div key={order.id} className="am-card am-slide-up" style={{ padding: 16, marginBottom: 12, border: '2px solid var(--am-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-primary)' }}>Pesanan Baru! ({order.id})</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', background: 'rgba(245,158,11,0.12)', color: '#D97706', borderRadius: 999 }}>Ongkir: {formatRupiah(order.deliveryFee)}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--am-text)', marginBottom: 4 }}>
                📦 {order.items.map(i => `${i.product.name} ×${i.quantity}`).join(', ')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginBottom: 4 }}>
                🏪 Ambil di: {order.items[0]?.product.sellerName}
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
                  ✅ Terima Pesanan
                </button>
              </div>
            </div>
          ))}

          {/* Accepted orders */}
          {accepted.map(orderId => {
            const order = activeOrders.find(o => o.id === orderId) || dummyInitialOrders.find(o => o.id === orderId)
            if (!order) return null
            return (
              <div key={orderId} className="am-card" style={{ padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#22C55E', marginBottom: 8 }}>✅ Pesanan Diterima ({order.id})</div>
                <div style={{ fontSize: 13, color: 'var(--am-text)', marginBottom: 4 }}>
                  📦 {order.items.map(i => `${i.product.name} ×${i.quantity}`).join(', ')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginBottom: 4 }}>
                  🏪 Ambil di: {order.items[0]?.product.sellerName}
                </div>
                <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginBottom: 12 }}>
                  📍 Antar ke: {order.buyerLocation}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="am-btn-primary" style={{ flex: 1, padding: '9px 0', fontSize: 12 }}>📦 Sudah Diambil</button>
                  <button className="am-btn-primary" style={{ flex: 1, padding: '9px 0', fontSize: 12, background: '#22C55E' }} onClick={() => setAccepted(accepted.filter(id => id !== orderId))}>🎉 Selesai</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <div style={{ padding: '0 16px' }}>
          <div className="am-card" style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--am-text)', marginBottom: 12 }}>💰 Pendapatan Harian</div>
            {[
              { day: 'Hari Ini', deliveries: totalDeliveries, earnings: formatRupiah(totalEarnings) },
              { day: 'Kemarin', deliveries: 8, earnings: formatRupiah(40000) },
              { day: '2 Hari Lalu', deliveries: 5, earnings: formatRupiah(25000) },
            ].map(r => (
              <div key={r.day} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--am-border)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--am-text)' }}>{r.day}</div>
                  <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>{r.deliveries} pengantaran</div>
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
                {o.items.map(i => i.product.name).join(', ')} → {o.buyerLocation}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}