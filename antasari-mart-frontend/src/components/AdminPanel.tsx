import { useState } from 'react'
import Swal from 'sweetalert2'
import type { ThemeMode } from '../types'
import { MOCK_TENANTS, MOCK_PRODUCTS, MOCK_ORDERS, formatRupiah } from '../data'

interface AdminPanelProps {
  theme: ThemeMode
  currentUserId?: string
  currentUserName?: string
  isUserPro?: boolean
}

type AdminTab = 'overview' | 'tenants' | 'products' | 'reports' | 'manual_report' | 'chat'

interface ManualReport {
  id: string
  title: string
  period: string
  content: string
  nominal: number
  date: string
}

export default function AdminPanel({ theme: _theme, currentUserId = 'admin_koperasi', currentUserName = 'Admin Koperasi', isUserPro = true }: AdminPanelProps) {
  const [tab, setTab] = useState<AdminTab>('overview')
  const [tenants, setTenants] = useState(MOCK_TENANTS)
  const [products, setProducts] = useState(MOCK_PRODUCTS)
  const [exportStatus, setExportStatus] = useState<null | 'exporting' | 'done'>(null)

  // 💡 State untuk CRUD Laporan Manual
  const [reportsList, setReportsList] = useState<ManualReport[]>([
    {
      id: 'rep_1',
      title: 'Laporan Pertanggungjawaban Keuangan Koperasi',
      period: 'Bulan Juli 2026',
      content: 'Dana kas berjalan lancar dan seluruh distribusi logistik mahasiswa kampus UIN Antasari terlaksana dengan baik.',
      nominal: 1500000,
      date: '27 Juli 2026'
    }
  ])

  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formPeriod, setFormPeriod] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formNominal, setFormNominal] = useState('')
  const [selectedReportToPrint, setSelectedReportToPrint] = useState<ManualReport | null>(null)
  
  const totalRevenue = MOCK_ORDERS.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0)
  const totalProducts = products.length
  const activeTenants = tenants.filter(t => t.isActive).length

  function handleToggleTenant(id: string) {
    setTenants(prev => prev.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t))
  }

  async function handleApproveProduct(productId: string, productName: string) {
    setProducts(prev => prev.filter(p => p.id !== productId))
    Swal.fire({
      icon: 'success',
      title: 'Produk Disetujui! 🎉',
      text: `Produk "${productName}" kini telah resmi tayang di Beranda Belanja.`,
      confirmButtonColor: '#16A34A',
      timer: 2000,
      showConfirmButton: false
    })
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
    })

    if (!reason) return

    try {
      const adminUser = JSON.parse(localStorage.getItem('am_current_user') || `{"email": "${currentUserId}", "nama": "${currentUserName}"}`)
      
      // ✅ URL DINAMIS: Menggunakan window.location.hostname agar tidak ketergantungan IP
      await fetch(`http://${window.location.hostname}:5000/api/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromId: adminUser.email,
          fromName: adminUser.nama || 'Admin Koperasi',
          fromRole: 'admin',
          toId: sellerEmail || 'seller@antasari.mart',
          toName: 'Penjual',
          toRole: 'seller',
          text: `Mohon maaf produk "${productName}" ditolak. Alasan: "${reason}".`
        })
      })
    } catch (err) {
      console.error("Gagal kirim chat:", err)
    }

    setProducts(prev => prev.filter(p => p.id !== productId))
    Swal.fire({ icon: 'info', title: 'Produk Ditolak', text: 'Pesan alasan telah dikirim ke chat penjual.', confirmButtonColor: '#00B4D8' })
  }

  function handleExport(format: string) {
    setExportStatus('exporting')
    setTimeout(() => {
      setExportStatus('done')
      Swal.fire({
        toast: true, position: 'top-end', icon: 'success',
        title: `Laporan ${format} berhasil diunduh! 📥`,
        showConfirmButton: false, timer: 2000, timerProgressBar: true
      })
      setTimeout(() => setExportStatus(null), 1500)
    }, 1200)
  }

  // 💡 FUNGSI CRUD: Simpan atau Tambah Laporan Manual
  const handleSaveReport = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle || !formPeriod) {
      Swal.fire({ icon: 'error', title: 'Oops...', text: 'Judul dan Periode laporan wajib diisi!' })
      return
    }

    if (isEditing && editId) {
      setReportsList(prev => prev.map(r => r.id === editId ? {
        ...r,
        title: formTitle,
        period: formPeriod,
        content: formContent,
        nominal: Number(formNominal) || 0
      } : r))
      Swal.fire({ icon: 'success', title: 'Berhasil Diperbarui!', timer: 1500, showConfirmButton: false })
    } else {
      const newRep: ManualReport = {
        id: 'rep_' + Date.now(),
        title: formTitle,
        period: formPeriod,
        content: formContent,
        nominal: Number(formNominal) || 0,
        date: new Date().toLocaleDateString('id-ID', { dateStyle: 'medium' })
      }
      setReportsList(prev => [newRep, ...prev])
      Swal.fire({ icon: 'success', title: 'Laporan Baru Ditambahkan! 🎉', timer: 1500, showConfirmButton: false })
    }

    setIsEditing(false)
    setEditId(null)
    setFormTitle('')
    setFormPeriod('')
    setFormContent('')
    setFormNominal('')
  }

  const handleEditClick = (rep: ManualReport) => {
    setIsEditing(true)
    setEditId(rep.id)
    setFormTitle(rep.title)
    setFormPeriod(rep.period)
    setFormContent(rep.content)
    setFormNominal(rep.nominal.toString())
  }

  const handleDeleteReport = (id: string) => {
    Swal.fire({
      title: 'Hapus Laporan Ini?',
      text: 'Data laporan manual yang dihapus tidak dapat dikembalikan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Ya, Hapus'
    }).then(result => {
      if (result.isConfirmed) {
        setReportsList(prev => prev.filter(r => r.id !== id))
        if (selectedReportToPrint?.id === id) setSelectedReportToPrint(null)
        Swal.fire({ icon: 'success', title: 'Terhapus!', timer: 1200, showConfirmButton: false })
      }
    })
  }

  const handlePrintReport = (rep: ManualReport) => {
    setSelectedReportToPrint(rep)
    setTimeout(() => {
      const printContent = document.getElementById('printable-single-report')?.innerHTML;
      if (!printContent) return;
      const originalBody = document.body.innerHTML;
      document.body.innerHTML = `<div style="padding: 40px; font-family: Arial, sans-serif;">${printContent}</div>`;
      window.print();
      document.body.innerHTML = originalBody;
      window.location.reload();
    }, 100)
  }

  return (
    <div style={{ padding: '16px 0 80px', maxWidth: 900, margin: '0 auto', fontFamily: 'var(--am-font-body)' }}>
      <div style={{ padding: '0 16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="am-heading" style={{ margin: '0 0 4px', fontSize: 22, color: 'var(--am-text)' }}>⚙️ Panel Admin Koperasi</h2>
          <div style={{ fontSize: 13, color: 'var(--am-text-muted)' }}>Koperasi UIN Antasari · Pusat Kontrol & Moderasi</div>
        </div>
        <span style={{ padding: '4px 12px', background: 'rgba(122,158,126,0.12)', color: 'var(--am-primary)', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
          PRO / SUPER ADMIN
        </span>
      </div>

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

      {/* Tabs */}
      <div style={{ display: 'flex', padding: '0 16px 16px', gap: 6, overflowX: 'auto' }} className="scroll-hide">
        {[
          { key: 'overview', label: '📈 Ringkasan' },
          { key: 'tenants', label: '🏪 Tenant' },
          { key: 'products', label: '📦 Moderasi' },
          { key: 'reports', label: '📄 Laporan Otomatis' },
          { key: 'manual_report', label: '💎 Laporan Manual (CRUD)' },
          { key: 'chat', label: '💬 Pesan Pembeli' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => {
              if (t.key === 'manual_report' && !isUserPro && currentUserId !== 'miyya@gmail.com') {
                Swal.fire({ icon: 'warning', title: 'Fitur Khusus PRO 💎', text: 'Upgrade akun Anda ke PRO untuk membuat laporan manual.' });
                return;
              }
              setTab(t.key as AdminTab);
            }}
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

      {tab === 'overview' && (
        <div style={{ padding: '0 16px' }}>
          <div className="am-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--am-text)', marginBottom: 12 }}>📊 Arus Kas Koperasi</div>
            {[
              { label: 'Pemasukan (Produk Koperasi)', value: formatRupiah(Math.round(totalRevenue * 0.6)), positive: true },
              { label: 'Fee dari Seller Mahasiswa (2%)', value: formatRupiah(Math.round(totalRevenue * 0.008)), positive: true },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--am-border)' }}>
                <span style={{ fontSize: 13, color: 'var(--am-text-muted)' }}>{r.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#22C55E' }}>+{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'tenants' && (
        <div style={{ padding: '0 16px' }}>
          {tenants.map(t => (
            <div key={t.id} className="am-card" style={{ padding: 16, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: 'var(--am-text-muted)' }}>👤 {t.ownerName} · 📍 {t.campus}</div>
              </div>
              <button onClick={() => handleToggleTenant(t.id)} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: t.isActive ? '#DC2626' : '#16A34A', border: '1px solid currentColor' }}>
                {t.isActive ? 'Nonaktifkan' : 'Aktifkan'}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'products' && (
        <div style={{ padding: '0 16px' }}>
          {products.filter(p => !p.isKoperasi).map(p => (
            <div key={p.id} className="am-card" style={{ display: 'flex', gap: 12, padding: 12, marginBottom: 10, alignItems: 'center' }}>
              <img src={p.image} alt={p.name} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 8 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>{p.sellerName} · {formatRupiah(p.price)}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => handleApproveProduct(p.id, p.name)} style={{ padding: '5px 10px', background: '#DCFCE7', color: '#16A34A', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Setujui</button>
                <button onClick={() => handleRejectProduct(p.id, p.name, 'seller@antasari.mart')} style={{ padding: '5px 10px', background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Tolak</button>
              </div>
            </div>
          ))}
          {products.filter(p => !p.isKoperasi).length === 0 && <div style={{ textAlign: 'center', padding: 30, color: 'var(--am-text-muted)' }}>Tidak ada produk pending.</div>}
        </div>
      )}

      {/* Laporan Otomatis */}
      {tab === 'reports' && (
        <div style={{ padding: '0 16px' }}>
          <div id="printable-report-area" className="am-card" style={{ padding: 24, marginBottom: 20, background: '#ffffff', color: '#000000', borderRadius: 16, border: '1px solid #CBD5E1' }}>
            <div style={{ textAlign: 'center', marginBottom: 20, borderBottom: '2px solid #333', paddingBottom: 10 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>KOPERASI SIVITAS AKADEMIKA UIN ANTASARI</h2>
              <div style={{ fontSize: 12, color: '#555' }}>Laporan Resmi Pendapatan & Rincian Keuangan Marketplace</div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12, marginBottom: 16 }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #333' }}>
                  <th style={{ padding: '10px' }}>Komponen Keuangan</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Nominal</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px' }}>Total Pendapatan Kotor Transaksi</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>{formatRupiah(totalRevenue)}</td>
                </tr>
                <tr style={{ background: '#f8fafc', fontWeight: 800, fontSize: 13 }}>
                  <td style={{ padding: '12px 10px' }}>Estimasi SHU Bersih</td>
                  <td style={{ padding: '12px 10px', textAlign: 'right' }}>{formatRupiah(Math.round(totalRevenue * 0.608 - 200000))}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="am-card" style={{ padding: 16 }}>
            <button className="am-btn-primary" style={{ width: '100%', padding: '10px 0', fontWeight: 700, cursor: 'pointer' }} onClick={() => handleExport('PDF')}>
              ⬇ Unduh Laporan Resmi PDF
            </button>
          </div>
        </div>
      )}

      {/* 💎 TAB CRUD LAPORAN MANUAL */}
      {tab === 'manual_report' && (
        <div style={{ padding: '0 16px' }}>
          <div className="am-card" style={{ padding: 24, borderRadius: 16, background: 'var(--am-surface)', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 22 }}>💎</span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--am-text)' }}>
                {isEditing ? '✏️ Edit Laporan Manual' : '➕ Buat Laporan Manual Baru (CRUD)'}
              </h3>
            </div>

            <form onSubmit={handleSaveReport} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--am-text-muted)' }}>Judul Laporan</label>
                <input className="am-input" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Contoh: Laporan Belanja Bulanan" required style={{ width: '100%', padding: '10px', marginTop: 4, borderRadius: 8, border: '1px solid var(--am-border)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--am-text-muted)' }}>Periode</label>
                <input className="am-input" value={formPeriod} onChange={e => setFormPeriod(e.target.value)} placeholder="Contoh: Agustus 2026" required style={{ width: '100%', padding: '10px', marginTop: 4, borderRadius: 8, border: '1px solid var(--am-border)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--am-text-muted)' }}>Isi Keterangan</label>
                <textarea className="am-input" value={formContent} onChange={e => setFormContent(e.target.value)} rows={3} placeholder="Tulis rincian laporan di sini..." style={{ width: '100%', padding: '10px', marginTop: 4, borderRadius: 8, border: '1px solid var(--am-border)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--am-text-muted)' }}>Total Nominal (Rp)</label>
                <input type="number" className="am-input" value={formNominal} onChange={e => setFormNominal(e.target.value)} placeholder="500000" style={{ width: '100%', padding: '10px', marginTop: 4, borderRadius: 8, border: '1px solid var(--am-border)' }} />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="am-btn-primary" style={{ flex: 1, padding: '12px 0', fontWeight: 700, cursor: 'pointer' }}>
                  {isEditing ? '💾 Simpan Perubahan' : '➕ Tambah Laporan'}
                </button>
                {isEditing && (
                  <button type="button" onClick={() => { setIsEditing(false); setEditId(null); setFormTitle(''); setFormPeriod(''); setFormContent(''); setFormNominal(''); }} style={{ padding: '12px 16px', background: '#64748B', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
                    Batal
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="am-card" style={{ padding: 20, borderRadius: 16 }}>
            <h4 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: 'var(--am-text)' }}>📂 Daftar Arsip Laporan Manual ({reportsList.length})</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {reportsList.map(rep => (
                <div key={rep.id} style={{ padding: 14, background: 'var(--am-bg2)', borderRadius: 12, border: '1px solid var(--am-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--am-text)' }}>{rep.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--am-text-muted)', marginTop: 2 }}>📅 {rep.period} · Dibuat: {rep.date}</div>
                    <div style={{ fontSize: 12, color: 'var(--am-primary)', fontWeight: 600, marginTop: 4 }}>Nominal: {formatRupiah(rep.nominal)}</div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handlePrintReport(rep)} title="Cetak" style={{ padding: '6px 10px', background: '#0284C7', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>🖨 Cetak</button>
                    <button onClick={() => handleEditClick(rep)} title="Edit" style={{ padding: '6px 10px', background: '#F59E0B', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>✏️ Edit</button>
                    <button onClick={() => handleDeleteReport(rep.id)} title="Hapus" style={{ padding: '6px 10px', background: '#EF4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>🗑 Hapus</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'none' }}>
            {selectedReportToPrint && (
              <div id="printable-single-report">
                <div style={{ textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: 10, marginBottom: 16 }}>
                  <h2 style={{ margin: 0, fontSize: 18 }}>ARSIP KOPERASI UIN ANTASARI</h2>
                  <div style={{ fontSize: 12, color: '#555' }}>{selectedReportToPrint.title}</div>
                  <div style={{ fontSize: 11, color: '#777' }}>Periode: {selectedReportToPrint.period}</div>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>{selectedReportToPrint.content}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, background: '#f1f5f9', padding: 10, borderRadius: 6 }}>
                  <span>Total Nominal:</span>
                  <span>{formatRupiah(selectedReportToPrint.nominal)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'chat' && (
        <div style={{ padding: '0 16px' }}>
          <div className="am-card" style={{ padding: 24, textAlign: 'center', borderRadius: 16 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--am-text)' }}>Pusat Pesan & Chat Admin</div>
            <p style={{ fontSize: 12, color: 'var(--am-text-muted)', marginTop: 4 }}>Gunakan menu Pesan / Chat di sidebar utama.</p>
          </div>
        </div>
      )}
    </div>
  )
}