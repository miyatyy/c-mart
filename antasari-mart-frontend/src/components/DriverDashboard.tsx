import { useState } from 'react'
import type { ThemeMode, Campus } from '../types'
import { MOCK_ORDERS, formatRupiah } from '../data'

interface DriverDashboardProps {
  theme: ThemeMode
  campus: Campus
  driverName: string
}

export default function DriverDashboard({ theme, campus, driverName }: DriverDashboardProps) {
  const [activeOrders, setActiveOrders] = useState(
    MOCK_ORDERS.filter(o => o.campus === campus && ['pending', 'confirmed', 'preparing'].includes(o.status))
  )
  const [accepted, setAccepted] = useState<string[]>([])
  const [tab, setTab] = useState<'tasks' | 'history'>('tasks')
  const isAesthetic = theme === 'aesthetic'

  const historyOrders = MOCK_ORDERS.filter(o => o.campus === campus && o.status === 'delivered')

  function handleAccept(orderId: string) {
    setAccepted(prev => [...prev, orderId])
  }

  function handleIgnore(orderId: string) {
    setActiveOrders(prev => prev.filter(o => o.id !== orderId))
  }

  return (
    <div style={{ padding: '16px 0 80px' }}>
      {/* Header */}
      <div style={{ padding: '0 16px 16px' }}>
        <h2 className="am-heading" style={{ margin: '0 0 4px', fontSize: 22, color: 'var(--am-text)' }}>🛵 Dashboard Driver</h2>
        <div style={{ fontSize: 13, color: 'var(--am-text-muted)' }}>{driverName} · {campus === 'banjarmasin' ? 'Banjarmasin' : 'Banjarbaru'}</div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '0 16px 16px' }}>
        {[
          { label: 'Pengantaran Hari Ini', value: accepted.length, icon: '📦' },
          { label: 'Penghasilan Hari Ini', value: formatRupiah(accepted.length * 3000), icon: '💰' },
          { label: 'Rating', value: '4.9 ⭐', icon: '⭐' },
        ].map(s => (
          <div key={s.label} className="am-card" style={{ padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: isAesthetic ? 12 : 13, fontWeight: 700, color: 'var(--am-primary)' }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'var(--am-text-muted)', marginTop: 2, lineHeight: 1.3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Online toggle */}
      <div style={{ padding: '0 16px 16px' }}>
        <div className="am-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--am-text)' }}>Status Driver</div>
            <div style={{ fontSize: 12, color: '#22C55E', fontWeight: 600 }}>● Online — siap menerima pesanan</div>
          </div>
          <div style={{ width: 48, height: 26, background: 'var(--am-primary)', borderRadius: 999, position: 'relative', cursor: 'pointer' }}>
            <div style={{ width: 20, height: 20, background: 'white', borderRadius: '50%', position: 'absolute', top: 3, right: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
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
          {activeOrders.length === 0 && accepted.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--am-text-muted)' }}>
              <div style={{ fontSize: 48 }}>🛵</div>
              <div style={{ marginTop: 8 }}>Belum ada pesanan masuk</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Tetap online untuk menerima pesanan</div>
            </div>
          )}

          {/* Incoming orders to accept/ignore */}
          {activeOrders.filter(o => !accepted.includes(o.id)).map(order => (
            <div key={order.id} className="am-card am-slide-up" style={{ padding: 16, marginBottom: 12, border: '2px solid var(--am-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-primary)' }}>Pesanan Baru!</span>
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
            const order = activeOrders.find(o => o.id === orderId)
            if (!order) return null
            return (
              <div key={orderId} className="am-card" style={{ padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#22C55E', marginBottom: 8 }}>✅ Pesanan Diterima</div>
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
                  <button className="am-btn-primary" style={{ flex: 1, padding: '9px 0', fontSize: 12, background: '#22C55E' }}>🎉 Selesai</button>
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
              { day: 'Hari Ini', deliveries: accepted.length + 2, earnings: formatRupiah((accepted.length + 2) * 3000) },
              { day: 'Kemarin', deliveries: 8, earnings: formatRupiah(24000) },
              { day: '2 Hari Lalu', deliveries: 5, earnings: formatRupiah(15000) },
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
