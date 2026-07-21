import { useState } from 'react'
import type { ThemeMode } from '../types'
import { MOCK_TENANTS, MOCK_PRODUCTS, MOCK_ORDERS, formatRupiah } from '../data'
import ChatView from './ChatView'

interface AdminPanelProps {
  theme: ThemeMode
  currentUserId?: string
  currentUserName?: string
}

type AdminTab = 'overview' | 'tenants' | 'products' | 'reports' | 'chat'

export default function AdminPanel({ theme, currentUserId = 'admin_koperasi', currentUserName = 'Admin Koperasi' }: AdminPanelProps) {
  const [tab, setTab] = useState<AdminTab>('overview')
  const [tenants, setTenants] = useState(MOCK_TENANTS)
  const [exportStatus, setExportStatus] = useState<null | 'exporting' | 'done'>(null)
  
  const totalRevenue = MOCK_ORDERS.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0)
  const totalProducts = MOCK_PRODUCTS.length
  const activeTenants = tenants.filter(t => t.isActive).length

  function handleToggleTenant(id: string) {
    setTenants(prev => prev.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t))
  }

  function handleExport(format: string) {
    setExportStatus('exporting')
    setTimeout(() => {
      setExportStatus('done')
      setTimeout(() => setExportStatus(null), 2000)
    }, 1500)
    console.log(`Export as ${format}`)
  }

  return (
    <div style={{ padding: '16px 0 80px', maxWidth: 900, margin: '0 auto', fontFamily: 'var(--am-font-body)' }}>
      {/* Header */}
      <div style={{ padding: '0 16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="am-heading" style={{ margin: '0 0 4px', fontSize: 22, color: 'var(--am-text)' }}>⚙️ Panel Admin Koperasi</h2>
          <div style={{ fontSize: 13, color: 'var(--am-text-muted)' }}>Koperasi UIN Antasari · Pusat Kontrol & Moderasi</div>
        </div>
        <span style={{ padding: '4px 12px', background: 'rgba(122,158,126,0.12)', color: 'var(--am-primary)', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
          PRO
        </span>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, padding: '0 16px 16px' }}>
        {[
          { label: 'Total Pendapatan', value: formatRupiah(totalRevenue), icon: '💰', color: '#22C55E' },
          { label: 'Tenant Aktif', value: `${activeTenants} / ${tenants.length}`, icon: '🏪', color: 'var(--am-primary)' },
          { label: 'Total Produk', value: totalProducts, icon: '📦', color: 'var(--am-accent)' },
          { label: 'Total Transaksi', value: MOCK_ORDERS.length, icon: '🧾', color: '#8B5CF6' },
        ].map(s => (
          <div key={s.label} className="am-card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <span style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs (Termasuk Tab Chat / Pesan Masuk) */}
      <div style={{ display: 'flex', padding: '0 16px 16px', gap: 6, overflowX: 'auto' }} className="scroll-hide">
        {[
          { key: 'overview', label: '📈 Ringkasan' },
          { key: 'tenants', label: '🏪 Tenant' },
          { key: 'products', label: '📦 Moderasi' },
          { key: 'chat', label: '💬 Pesan Pembeli' }, // 👉 Tab Pesan Ditambahkan di Sini
          { key: 'reports', label: '📄 Laporan' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as AdminTab)}
            style={{
              flexShrink: 0, padding: '7px 14px', border: '1.5px solid var(--am-border)', borderRadius: 999,
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

      {/* Overview */}
      {tab === 'overview' && (
        <div style={{ padding: '0 16px' }}>
          <div className="am-card" style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--am-text)', marginBottom: 12 }}>📊 Arus Kas Koperasi</div>
            {[
              { label: 'Pemasukan (Produk Koperasi)', value: formatRupiah(Math.round(totalRevenue * 0.6)), positive: true },
              { label: 'Fee dari Seller Mahasiswa (2%)', value: formatRupiah(Math.round(totalRevenue * 0.008)), positive: true },
              { label: 'Biaya Operasional', value: formatRupiah(150000), positive: false },
              { label: 'Biaya Hosting & Domain', value: formatRupiah(50000), positive: false },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--am-border)' }}>
                <span style={{ fontSize: 13, color: 'var(--am-text-muted)' }}>{r.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: r.positive ? '#22C55E' : '#EF4444' }}>
                  {r.positive ? '+' : '-'}{r.value}
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--am-text)' }}>SHU (Sisa Hasil Usaha)</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--am-primary)' }}>
                {formatRupiah(Math.round(totalRevenue * 0.608 - 200000))}
              </span>
            </div>
          </div>

          <div className="am-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--am-text)', marginBottom: 12 }}>🏆 Produk Terlaris Koperasi</div>
            {MOCK_PRODUCTS.filter(p => p.isKoperasi).sort((a, b) => b.sold - a.sold).slice(0, 4).map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ width: 20, textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--am-text-muted)' }}>#{i + 1}</span>
                <img src={p.image} alt={p.name} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--am-text)' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>{p.sold} terjual · {formatRupiah(p.price * p.sold)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tenants */}
      {tab === 'tenants' && (
        <div style={{ padding: '0 16px' }}>
          {tenants.map(t => (
            <div key={t.id} className="am-card" style={{ padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--am-text)', marginBottom: 2 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--am-text-muted)' }}>👤 {t.ownerName} · 📍 {t.campus === 'banjarmasin' ? 'Banjarmasin' : 'Banjarbaru'}</div>
                  <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginTop: 2 }}>
                    Bergabung: {new Date(t.joinedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--am-text-muted)' }}>📦 {t.totalProducts} produk</span>
                    <span style={{ fontSize: 12, color: 'var(--am-primary)', fontWeight: 600 }}>{formatRupiah(t.totalRevenue)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                    background: t.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    color: t.isActive ? '#16A34A' : '#DC2626',
                  }}>
                    {t.isActive ? '● Aktif' : '● Nonaktif'}
                  </span>
                  <button
                    onClick={() => handleToggleTenant(t.id)}
                    style={{
                      padding: '5px 12px', border: '1.5px solid var(--am-border)', borderRadius: 6,
                      fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--am-font-body)',
                      background: 'transparent', color: t.isActive ? '#DC2626' : '#16A34A',
                      borderColor: t.isActive ? '#DC2626' : '#16A34A',
                    }}
                  >
                    {t.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product moderation */}
      {tab === 'products' && (
        <div style={{ padding: '0 16px' }}>
          <div style={{ fontSize: 13, color: 'var(--am-text-muted)', marginBottom: 12 }}>
            Moderasi produk dari tenant mahasiswa sebelum ditampilkan ke pembeli.
          </div>
          {MOCK_PRODUCTS.filter(p => !p.isKoperasi).map(p => (
            <div key={p.id} className="am-card" style={{ display: 'flex', gap: 12, padding: 12, marginBottom: 10 }}>
              <img src={p.image} alt={p.name} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, background: 'var(--am-bg2)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--am-text)' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--am-text-muted)', marginTop: 1 }}>🏪 {p.sellerName} · {formatRupiah(p.price)}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button style={{ padding: '5px 12px', background: 'rgba(34,197,94,0.1)', color: '#16A34A', border: '1px solid #16A34A', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--am-font-body)' }}>✅ Setujui</button>
                  <button style={{ padding: '5px 12px', background: 'rgba(239,68,68,0.1)', color: '#DC2626', border: '1px solid #DC2626', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--am-font-body)' }}>❌ Tolak</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 👉 TAB PESAN / CHAT MASUK DARI PEMBELI */}
      {tab === 'chat' && (
        <div style={{ padding: '0 16px' }}>
          <div className="am-card" style={{ overflow: 'hidden', height: 500, borderRadius: 16 }}>
            <ChatView 
              theme={theme}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
            />
          </div>
        </div>
      )}

      {/* Reports */}
      {tab === 'reports' && (
        <div style={{ padding: '0 16px' }}>
          <div className="am-card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--am-text)', marginBottom: 4 }}>📄 Ekspor Laporan Koperasi</div>
            <div style={{ fontSize: 13, color: 'var(--am-text-muted)', marginBottom: 16 }}>
              Laporan resmi berstandar akuntansi koperasi — Pemasukan, Pengeluaran, SHU, & Tren Produk Terlaris.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { fmt: 'PDF', icon: '📕', desc: 'Format laporan formal / arsip' },
                { fmt: 'Word', icon: '📘', desc: 'Bisa diedit untuk lampiran LPJ' },
                { fmt: 'Excel', icon: '📗', desc: 'Data mentah untuk analisis lanjut' },
              ].map(e => (
                <div key={e.fmt} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', border: '1.5px solid var(--am-border)', borderRadius: 10, background: 'var(--am-bg2)' }}>
                  <span style={{ fontSize: 28 }}>{e.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)' }}>Laporan {e.fmt}</div>
                    <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>{e.desc}</div>
                  </div>
                  <button
                    className="am-btn-primary"
                    style={{ padding: '7px 14px', fontSize: 12, opacity: exportStatus === 'exporting' ? 0.7 : 1 }}
                    onClick={() => handleExport(e.fmt)}
                    disabled={exportStatus === 'exporting'}
                  >
                    {exportStatus === 'exporting' ? '⏳' : exportStatus === 'done' ? '✅' : `⬇ ${e.fmt}`}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="am-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--am-text)', marginBottom: 12 }}>🖨 Cetak Laporan</div>
            <button
              className="am-btn-outline"
              style={{ width: '100%', padding: '12px 0', fontSize: 14 }}
              onClick={() => window.print()}
            >
              🖨 Cetak Sekarang
            </button>
          </div>
        </div>
      )}
    </div>
  )
}