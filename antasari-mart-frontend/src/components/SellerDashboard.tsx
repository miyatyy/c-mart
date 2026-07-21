import { useState, useEffect } from 'react'
import type { ThemeMode, Campus, Product, ProductCategory } from '../types'
import { MOCK_ORDERS, formatRupiah, CATEGORIES } from '../data'

interface SellerDashboardProps {
  theme: ThemeMode
  campus: Campus
  sellerId: string
  sellerName: string
}

type SellerTab = 'products' | 'orders' | 'analytics' | 'promotions'
type ProductTab = 'active' | 'empty'

interface NewProduct {
  name: string
  description: string
  price: string
  stock: string
  category: ProductCategory
  targetCampus: string
}

export default function SellerDashboard({ theme, campus, sellerId, sellerName }: SellerDashboardProps) {
  const [tab, setTab] = useState<SellerTab>('products')
  const [productTab, setProductTab] = useState<ProductTab>('active')
  const [showAddModal, setShowAddModal] = useState(false)
  
  // State untuk Modal Edit Produk
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  
  // 🌟 State untuk Custom Alert Popup Beranimasi
  const [alertPopup, setAlertPopup] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // State untuk Modal "Atur Pengiriman" (Ala Shopee)
  const [showShippingModal, setShowShippingModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [selectedCourier, setSelectedCourier] = useState('JNE Regular')

  // State untuk Buat Voucher Promo & Status Aktif/Nonaktif
  const [voucherCode, setVoucherCode] = useState('')
  const [discountPercent, setDiscountPercent] = useState('10')
  const [vouchers, setVouchers] = useState([
    { code: 'HEMAT10', discount: '10%', active: true },
    { code: 'ANTASARIKECE', discount: '20%', active: true }
  ])

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const [newProd, setNewProd] = useState<NewProduct>({ 
    name: '', 
    description: '', 
    price: '', 
    stock: '', 
    category: 'makanan',
    targetCampus: 'semua'
  })
  const [imageFile, setImageFile] = useState<string>('') 

  const isAesthetic = theme === 'aesthetic'

  // Styles CSS untuk Animasi Pop-up Kustom
  const successModalStyles = `
    @keyframes bounceIn {
      0% { opacity: 0; transform: scale(0.8) translateY(20px); }
      70% { transform: scale(1.05) translateY(-5px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes checkAnim {
      0% { transform: scale(0); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
    .success-modal-appear {
      animation: bounceIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
    .check-icon-anim {
      animation: checkAnim 0.4s ease-in-out 0.1s both;
    }
  `;

  useEffect(() => {
    const backendUrl = `http://${window.location.hostname}:3000/api/products`;

    fetch(backendUrl)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.products) {
          const myProducts: Product[] = data.products
            .map((p: any) => ({
              id: String(p.id),
              name: p.nama_produk,
              description: p.deskripsi || '',
              price: p.harga,
              stock: p.stok,
              category: p.kategori,
              campus: p.kampus || 'semua',
              sellerId: p.sellerId || sellerId,
              sellerName: p.sellerName || sellerName,
              image: p.foto || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&auto=format',
              isKoperasi: false,
              rating: 5.0,
              sold: p.sold || 0,
            }))
          setProducts(myProducts)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error("Gagal memuat produk lapak:", err)
        setLoading(false)
      })
  }, [campus, sellerId, sellerName])

  const sellerOrders = MOCK_ORDERS.filter(o => o.items.some(i => i.product.sellerId === sellerId))
  const totalRevenue = sellerOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0)
  const totalSold = products.reduce((s, p) => s + p.sold, 0)

  const activeProducts = products.filter(p => p.stock > 0)
  const emptyProducts = products.filter(p => p.stock === 0)

  // 1. Tambah Produk dengan Popup Animasi
  async function handleAddProduct() {
    if (!newProd.name || !newProd.price || !newProd.stock) {
      setAlertPopup({ message: "Mohon isi nama, harga, dan stok produk!", type: 'error' });
      return;
    }

    const productPayload = {
      nama_produk: newProd.name,
      deskripsi: newProd.description,
      harga: parseInt(newProd.price),
      stok: parseInt(newProd.stock),
      kategori: newProd.category,
      foto: imageFile || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&auto=format',
      kampus: newProd.targetCampus || 'semua',
      sellerId,
      sellerName
    }

    try {
      const backendUrl = `http://${window.location.hostname}:3000/api/products`;
      
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productPayload)
      });
      const data = await response.json();
      
      if (data.success && data.product) {
        const p: Product = {
          id: String(data.product.id),
          name: data.product.nama_produk,
          description: data.product.deskripsi,
          price: data.product.harga,
          stock: data.product.stok,
          category: data.product.kategori,
          campus: data.product.kampus || newProd.targetCampus,
          sellerId,
          sellerName,
          image: data.product.foto,
          isKoperasi: false,
          rating: 0,
          sold: 0,
        }
        setProducts(prev => [...prev, p])
        setAlertPopup({ message: "Produk berhasil ditambahkan! 🎉", type: 'success' });
      } else {
        setAlertPopup({ message: "Gagal menyimpan produk.", type: 'error' });
      }
    } catch (err) {
      console.error("Gagal simpan ke backend:", err);
      setAlertPopup({ message: "Terjadi kesalahan jaringan.", type: 'error' });
    }

    setNewProd({ name: '', description: '', price: '', stock: '', category: 'makanan', targetCampus: 'semua' })
    setImageFile('') 
    setShowAddModal(false)
  }

  // 2. Update Produk dengan Popup Animasi
  async function handleUpdateProduct() {
    if (!editingProduct) return

    try {
      const backendUrl = `http://${window.location.hostname}:3000/api/products/${editingProduct.id}`;
      const response = await fetch(backendUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama_produk: editingProduct.name,
          deskripsi: editingProduct.description,
          harga: parseInt(editingProduct.price),
          stok: parseInt(editingProduct.stock),
          kategori: editingProduct.category,
          kampus: editingProduct.campus,
          foto: editingProduct.image
        })
      });
      const data = await response.json();
      
      if (data.success) {
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? editingProduct : p))
        setAlertPopup({ message: "Produk berhasil diperbarui! ✨", type: 'success' });
        setShowEditModal(false);
        setEditingProduct(null);
      } else {
        setAlertPopup({ message: "Gagal mengupdate produk di database.", type: 'error' });
      }
    } catch (err) {
      console.error("Gagal update produk:", err);
      setAlertPopup({ message: "Terjadi kesalahan jaringan.", type: 'error' });
    }
  }

  function handleUpdateStock(id: string, delta: number) {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p))
  }

  // 3. Hapus Produk dengan Popup Animasi
  async function handleDeleteProduct(id: string) {
    if (!window.confirm("Yakin ingin menghapus produk ini dari lapak dan beranda?")) return

    try {
      const backendUrl = `http://${window.location.hostname}:3000/api/products/${id}`;
      const response = await fetch(backendUrl, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (data.success) {
        setProducts(prev => prev.filter(p => p.id !== id))
        setAlertPopup({ message: "Produk berhasil dihapus.", type: 'success' });
      } else {
        setAlertPopup({ message: "Gagal menghapus produk dari database.", type: 'error' });
      }
    } catch (err) {
      console.error("Error menghapus produk:", err)
      setAlertPopup({ message: "Terjadi kesalahan jaringan.", type: 'error' });
    }
  }

  // 4. Buat Voucher dengan Popup Animasi Dinamis
  async function handleCreateVoucher(e: React.FormEvent) {
    e.preventDefault();
    if (!voucherCode) {
      setAlertPopup({ message: 'Masukkan kode voucher terlebih dahulu!', type: 'error' });
      return;
    }

    try {
      const backendUrl = `http://${window.location.hostname}:3000/api/vouchers`;
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerId: sellerId || 'seller_1',
          code: voucherCode,
          discountPercent: discountPercent
        })
      });
      const data = await response.json();

      if (data.success) {
        setVouchers(prev => [...prev, { code: voucherCode, discount: `${discountPercent}%`, active: true }])
        setAlertPopup({ message: "Voucher toko berhasil dibuat! 🎉", type: 'success' });
        setVoucherCode('');
      } else {
        setAlertPopup({ message: data.message || "Gagal membuat voucher.", type: 'error' });
      }
    } catch (err) {
      console.error("Gagal buat voucher:", err);
      setAlertPopup({ message: "Terjadi kesalahan jaringan.", type: 'error' });
    }
  }

  // 5. Fungsi untuk Aktifkan / Nonaktifkan Voucher secara Interaktif
  function handleToggleVoucher(index: number) {
    setVouchers(prev => prev.map((v, i) => {
      if (i === index) {
        const newActiveState = !v.active;
        setAlertPopup({ 
          message: `Voucher ${v.code} berhasil ${newActiveState ? 'diaktifkan' : 'dinonaktifkan'}! 🎟️`, 
          type: 'success' 
        });
        return { ...v, active: newActiveState };
      }
      return v;
    }));
  }

  return (
    <div style={{ padding: '16px 0 80px', position: 'relative' }}>
      <style>{successModalStyles}</style>

      <div style={{ padding: '0 16px 16px' }}>
        <h2 className="am-heading" style={{ margin: '0 0 4px', fontSize: 22, color: 'var(--am-text)' }}>🏪 Seller Centre Antasari</h2>
        <div style={{ fontSize: 13, color: 'var(--am-text-muted)' }}>{sellerName} • Lokasi Aktif: <strong style={{ color: 'var(--am-primary)' }}>{campus.toUpperCase()}</strong></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '0 16px 16px' }}>
        {[
          { label: 'Total Produk', value: products.length, icon: '📦' },
          { label: 'Total Terjual', value: totalSold, icon: '🛒' },
          { label: 'Pendapatan', value: formatRupiah(totalRevenue), icon: '💰' },
        ].map(s => (
          <div key={s.label} className="am-card" style={{ padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: isAesthetic ? 13 : 14, fontWeight: 700, color: 'var(--am-primary)' }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'var(--am-text-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Navigasi Tab Utama */}
      <div style={{ display: 'flex', padding: '0 16px 16px', gap: 6, overflowX: 'auto' }}>
        {[
          { key: 'products', label: '📦 Produk' },
          { key: 'orders', label: '🧾 Pesanan' },
          { key: 'analytics', label: '📊 Analitik' },
          { key: 'promotions', label: '🎟️ Promosi' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as SellerTab)}
            style={{
              flex: 1, padding: '8px 4px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap',
              fontWeight: 600, fontSize: 11, fontFamily: 'var(--am-font-body)',
              background: tab === t.key ? 'var(--am-primary)' : 'var(--am-surface)',
              color: tab === t.key ? 'white' : 'var(--am-text-muted)',
              border: `1.5px solid ${tab === t.key ? 'var(--am-primary)' : 'var(--am-border)'}`,
              transition: 'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: PRODUK */}
      {tab === 'products' && (
        <div style={{ padding: '0 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { key: 'active', label: `Aktif (${activeProducts.length})` },
                { key: 'empty', label: `Habis (${emptyProducts.length})` },
              ].map(pt => (
                <button
                  key={pt.key}
                  onClick={() => setProductTab(pt.key as ProductTab)}
                  style={{
                    padding: '5px 12px', borderRadius: 999, border: '1.5px solid var(--am-border)',
                    fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--am-font-body)',
                    background: productTab === pt.key ? 'var(--am-accent)' : 'var(--am-surface)',
                    color: productTab === pt.key ? (isAesthetic ? '#3D2B2B' : '#0D1B2A') : 'var(--am-text-muted)',
                    transition: 'all 0.2s',
                  }}
                >
                  {pt.label}
                </button>
              ))}
            </div>
            <button
              className="am-btn-primary"
              style={{ padding: '8px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setShowAddModal(true)}
            >
              + Tambah
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--am-text-muted)' }}>Memuat produk lapak...</div>
          ) : (
            (productTab === 'active' ? activeProducts : emptyProducts).map(p => (
              <div key={p.id} className="am-card" style={{ display: 'flex', gap: 12, padding: 12, marginBottom: 10, alignItems: 'center' }}>
                <img src={p.image} alt={p.name} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, background: 'var(--am-bg2)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--am-text)' }}>{p.name}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--am-primary)', marginTop: 2 }}>{formatRupiah(p.price)}</div>
                  <div style={{ fontSize: 11, color: 'var(--am-text-muted)', marginTop: 2 }}>Target Kampus: <strong style={{ color: 'var(--am-primary)' }}>{p.campus?.toUpperCase()}</strong></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--am-border)', borderRadius: 6, overflow: 'hidden' }}>
                      <button onClick={() => handleUpdateStock(p.id, -1)} style={{ width: 28, height: 28, border: 'none', background: 'var(--am-bg2)', cursor: 'pointer', fontSize: 14, color: 'var(--am-text)' }}>−</button>
                      <span style={{ width: 32, textAlign: 'center', fontSize: 13, fontWeight: 700, color: p.stock === 0 ? '#EF4444' : 'var(--am-text)' }}>{p.stock}</span>
                      <button onClick={() => handleUpdateStock(p.id, 1)} style={{ width: 28, height: 28, border: 'none', background: 'var(--am-bg2)', cursor: 'pointer', fontSize: 14, color: 'var(--am-text)' }}>+</button>
                    </div>
                    {p.stock === 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: 999 }}>HABIS</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button 
                    onClick={() => { setEditingProduct(p); setShowEditModal(true); }} 
                    style={{ border: 'none', background: 'var(--am-bg2)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Edit Produk"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => handleDeleteProduct(p.id)} 
                    style={{ border: 'none', background: 'rgba(239,68,68,0.1)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}
                    title="Hapus Produk"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: PESANAN MASUK */}
      {tab === 'orders' && (
        <div style={{ padding: '0 16px' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--am-text)' }}>📦 Daftar Pesanan Masuk</h3>
          {sellerOrders.length === 0 ? (
            <div className="am-card" style={{ textAlign: 'center', padding: 24, color: 'var(--am-text-muted)' }}>
              Belum ada pesanan masuk untuk tokomu saat ini.
            </div>
          ) : (
            sellerOrders.map(o => (
              <div key={o.id} className="am-card" style={{ padding: 14, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderBottom: '1px solid var(--am-border)', paddingBottom: 8, marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, color: 'var(--am-text)' }}>ID: #{o.id}</span>
                  <span style={{ color: o.status === 'delivered' ? '#16A34A' : '#D97706', fontWeight: 700, textTransform: 'uppercase' }}>
                    {o.status === 'delivered' ? 'Selesai' : 'Perlu Dikirim'}
                  </span>
                </div>
                {o.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 10, fontSize: 13, marginBottom: 6 }}>
                    <img src={item.product.image} alt="" style={{ width: 45, height: 45, objectFit: 'cover', borderRadius: 6 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--am-text)' }}>{item.product.name}</div>
                      <div style={{ color: 'var(--am-text-muted)', fontSize: 11 }}>{item.quantity}x @ {formatRupiah(item.product.price)}</div>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px dashed var(--am-border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--am-text)' }}>Total: <strong style={{ color: 'var(--am-primary)' }}>{formatRupiah(o.total)}</strong></div>
                  <button 
                    className="am-btn-primary" 
                    style={{ padding: '6px 12px', fontSize: 11 }}
                    onClick={() => { setSelectedOrder(o); setShowShippingModal(true); }}
                  >
                    🚚 Atur Pengiriman
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: ANALITIK (Diagram Real-Time & Detail) */}
      {tab === 'analytics' && (
        <div style={{ padding: '0 16px' }}>
          <div className="am-card" style={{ padding: 16, marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: 'var(--am-text)' }}>📈 Statistik Performa & Pendapatan Real-Time</h3>
            <p style={{ fontSize: 12, color: 'var(--am-text-muted)', marginBottom: 16 }}>Grafik interaktif performa penjualan toko berdasarkan transaksi aktif.</p>
            
            {/* Grafik Batang (Bar Chart) Real-Time Berdasarkan Pendapatan & Produk Terjual */}
            <div style={{ marginBottom: 20, background: 'var(--am-bg2)', padding: 16, borderRadius: 12, border: '1px solid var(--am-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)' }}>Grafik Pendapatan 7 Hari Terakhir</span>
                <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 700, background: 'rgba(22,163,74,0.1)', padding: '2px 8px', borderRadius: 999 }}>● Live Real-Time</span>
              </div>

              {/* Simulasi Batang Grafik Dinamis */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 140, paddingBottom: 8, borderBottom: '1px solid var(--am-border)', gap: 8 }}>
                {[
                  { day: 'Sen', val: totalRevenue * 0.1, label: 'Senin' },
                  { day: 'Sel', val: totalRevenue * 0.15, label: 'Selasa' },
                  { day: 'Rab', val: totalRevenue * 0.08, label: 'Rabu' },
                  { day: 'Kam', val: totalRevenue * 0.2, label: 'Kamis' },
                  { day: 'Jum', val: totalRevenue * 0.12, label: 'Jumat' },
                  { day: 'Sab', val: totalRevenue * 0.25, label: 'Sabtu' },
                  { day: 'Min', val: totalRevenue * 0.1, label: 'Minggu' },
                ].map((bar, i) => {
                  const maxHeight = Math.max(totalRevenue, 100000); // Skala maksimum bar
                  const heightPercentage = Math.min(Math.max((bar.val / maxHeight) * 100, 12), 100);
                  
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      <div style={{ fontSize: 9, color: 'var(--am-text-muted)', marginBottom: 4, whiteSpace: 'nowrap' }}>
                        {bar.val > 0 ? `${Math.round(bar.val / 1000)}k` : '0'}
                      </div>
                      <div 
                        style={{ 
                          width: '100%', maxWidth: 28, 
                          height: `${heightPercentage}%`, 
                          background: 'var(--am-primary)', 
                          borderRadius: '6px 6px 0 0',
                          transition: 'height 0.4s ease'
                        }} 
                        title={`${bar.label}: ${formatRupiah(bar.val)}`}
                      />
                      <span style={{ fontSize: 11, color: 'var(--am-text-muted)', marginTop: 6, fontWeight: 600 }}>{bar.day}</span>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 12, color: 'var(--am-text)' }}>
                <span>Total Pendapatan Minggu Ini:</span>
                <strong style={{ color: 'var(--am-primary)', fontSize: 14 }}>{formatRupiah(totalRevenue)}</strong>
              </div>
            </div>

            {/* Metrik Performa Detail */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ background: 'var(--am-bg2)', padding: 12, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>Tingkat Konversi Penjualan</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--am-primary)' }}>4.8% <span style={{ fontSize: 11, color: '#16A34A' }}>↑ Baik</span></div>
                </div>
                <span style={{ fontSize: 20 }}>📊</span>
              </div>

              <div style={{ background: 'var(--am-bg2)', padding: 12, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>Kecepatan Balas Chat Pelanggan</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--am-text)' }}>{'< 15 Menit'}</div>
                </div>
                <span style={{ fontSize: 20 }}>💬</span>
              </div>

              <div style={{ background: 'var(--am-bg2)', padding: 12, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>Persentase Pesanan Sukses Tuntas</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#16A34A' }}>99.2%</div>
                </div>
                <span style={{ fontSize: 20 }}>✨</span>
              </div>
            </div>

          </div>
        </div>
      )}

      
      {/* TAB 4: PROMOSI */}
      {tab === 'promotions' && (
        <div style={{ padding: '0 16px' }}>
          <div className="am-card" style={{ padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--am-text)' }}>🎟️ Buat Voucher Diskon Toko</h3>
            <p style={{ fontSize: 12, color: 'var(--am-text-muted)', marginBottom: 12 }}>Tarik lebih banyak pembeli dengan memberikan voucher diskon khusus produk di tokomu.</p>
            
            <form onSubmit={handleCreateVoucher} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input 
                className="am-input" 
                placeholder="Kode Voucher (Cth: HEMAT50)" 
                value={voucherCode} 
                onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                style={{ padding: '10px 12px', fontSize: 13 }}
              />
              <select 
                className="am-input" 
                value={discountPercent} 
                onChange={e => setDiscountPercent(e.target.value)}
                style={{ padding: '10px 12px', fontSize: 13 }}
              >
                <option value="10">Diskon 10%</option>
                <option value="20">Diskon 20%</option>
                <option value="50">Diskon 50% (Flash Sale)</option>
              </select>
              <button 
                type="submit"
                className="am-btn-primary" 
                style={{ padding: '10px 0', fontSize: 13, cursor: 'pointer' }}
              >
                + Buat Voucher Sekarang
              </button>
            </form>
          </div>

          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--am-text)' }}>Daftar Voucher Aktif / Nonaktif</h4>
          {vouchers.map((v, i) => (
            <div key={i} className="am-card" style={{ padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--am-primary)' }}>{v.code}</div>
                <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>Diskon sebesar {v.discount} untuk semua produk</div>
              </div>
              
              {/* Tombol Interaktif Toggle Status Voucher */}
              <button
                onClick={() => handleToggleVoucher(i)}
                style={{
                  fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none',
                  background: v.active ? '#16A34A' : '#EF4444', 
                  color: 'white', padding: '6px 14px', borderRadius: 999,
                  transition: 'background 0.2s'
                }}
              >
                {v.active ? 'AKTIF' : 'NONAKTIF'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* MODAL ATUR PENGIRIMAN */}
      {showShippingModal && selectedOrder && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowShippingModal(false) }}
        >
          <div className="am-card am-slide-up" style={{ width: '100%', maxWidth: 400, padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--am-text)' }}>🚚 Atur Pengiriman Pesanan</h3>
            <p style={{ fontSize: 12, color: 'var(--am-text-muted)', marginBottom: 12 }}>Pilih jasa kirim untuk pesanan <strong>#{selectedOrder.id}</strong>:</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {['JNE Regular', 'SiCepat Ekspres', 'GoSend Instant (Kurir Kampus)'].map(courier => (
                <label key={courier} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: 'var(--am-text)' }}>
                  <input 
                    type="radio" 
                    name="courier" 
                    checked={selectedCourier === courier} 
                    onChange={() => setSelectedCourier(courier)} 
                  />
                  {courier}
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                style={{ flex: 1, padding: '10px 0', background: 'var(--am-bg2)', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', color: 'var(--am-text)' }}
                onClick={() => setShowShippingModal(false)}
              >
                Batal
              </button>
              <button 
                className="am-btn-primary" 
                style={{ flex: 1, padding: '10px 0', fontSize: 13 }}
                onClick={() => {
                  setAlertPopup({ message: `Resi otomatis berhasil dicetak! Kurir (${selectedCourier}) akan segera pickup paket. 📦`, type: 'success' });
                  setShowShippingModal(false);
                }}
              >
                Cetak Resi & Kirim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH PRODUK */}
      {showAddModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false) }}
        >
          <div className="am-card am-slide-up" style={{ width: '100%', maxWidth: 540, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="am-heading" style={{ margin: 0, fontSize: 18, color: 'var(--am-text)' }}>+ Tambah Produk Baru</h3>
              <button onClick={() => setShowAddModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 22, color: 'var(--am-text-muted)' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="am-input" placeholder="Nama produk" value={newProd.name} onChange={e => setNewProd(p => ({ ...p, name: e.target.value }))} style={{ padding: '10px 12px', fontSize: 14 }} />
              <textarea className="am-input" placeholder="Deskripsi produk" value={newProd.description} onChange={e => setNewProd(p => ({ ...p, description: e.target.value }))} style={{ padding: '10px 12px', fontSize: 14, resize: 'vertical', minHeight: 72 }} />
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input className="am-input" placeholder="Harga (Rp)" type="number" value={newProd.price} onChange={e => setNewProd(p => ({ ...p, price: e.target.value }))} style={{ padding: '10px 12px', fontSize: 14 }} />
                <input className="am-input" placeholder="Stok" type="number" value={newProd.stock} onChange={e => setNewProd(p => ({ ...p, stock: e.target.value }))} style={{ padding: '10px 12px', fontSize: 14 }} />
              </div>

              <select className="am-input" value={newProd.category} onChange={e => setNewProd(p => ({ ...p, category: e.target.value as ProductCategory }))} style={{ padding: '10px 12px', fontSize: 14 }}>
                {CATEGORIES.filter(c => c.key !== 'all').map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>

              <div>
                <label style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--am-text-muted)', display: 'block', marginBottom: 4 }}>
                  Target Kampus Penjualan
                </label>
                <select 
                  className="am-input"
                  value={newProd.targetCampus}
                  onChange={e => setNewProd(p => ({ ...p, targetCampus: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', fontSize: 14, background: 'var(--am-surface)', color: 'var(--am-text)' }}
                >
                  <option value="semua">🌐 Semua Kampus (Tampil di BJM & BJB)</option>
                  <option value="banjarmasin">📍 Khusus Banjarmasin (BJM)</option>
                  <option value="banjarbaru">📍 Khusus Banjarbaru (BJB)</option>
                </select>
              </div>

              <div style={{ margin: '4px 0' }}>
                <label style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--am-text-muted)', display: 'block', marginBottom: 4 }}>
                  Foto Produk
                </label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setImageFile(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }} 
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--am-border)', background: 'var(--am-surface)', color: 'var(--am-text)', fontSize: 12 }}
                />
              </div>

              <button className="am-btn-primary" style={{ padding: '12px 0', fontSize: 15 }} onClick={handleAddProduct}>
                Simpan Produk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT PRODUK */}
      {showEditModal && editingProduct && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowEditModal(false) }}
        >
          <div className="am-card am-slide-up" style={{ width: '100%', maxWidth: 540, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="am-heading" style={{ margin: 0, fontSize: 18, color: 'var(--am-text)' }}>✏️ Edit Produk</h3>
              <button onClick={() => setShowEditModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 22, color: 'var(--am-text-muted)' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="am-input" placeholder="Nama produk" value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} style={{ padding: '10px 12px', fontSize: 14 }} />
              <textarea className="am-input" placeholder="Deskripsi produk" value={editingProduct.description} onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })} style={{ padding: '10px 12px', fontSize: 14, resize: 'vertical', minHeight: 72 }} />
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input className="am-input" placeholder="Harga (Rp)" type="number" value={editingProduct.price} onChange={e => setEditingProduct({ ...editingProduct, price: e.target.value })} style={{ padding: '10px 12px', fontSize: 14 }} />
                <input className="am-input" placeholder="Stok" type="number" value={editingProduct.stock} onChange={e => setEditingProduct({ ...editingProduct, stock: e.target.value })} style={{ padding: '10px 12px', fontSize: 14 }} />
              </div>

              <select className="am-input" value={editingProduct.category} onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })} style={{ padding: '10px 12px', fontSize: 14 }}>
                {CATEGORIES.filter(c => c.key !== 'all').map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>

              <div>
                <label style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--am-text-muted)', display: 'block', marginBottom: 4 }}>
                  Target Kampus Penjualan
                </label>
                <select 
                  className="am-input"
                  value={editingProduct.campus}
                  onChange={e => setEditingProduct({ ...editingProduct, campus: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', fontSize: 14, background: 'var(--am-surface)', color: 'var(--am-text)' }}
                >
                  <option value="semua">🌐 Semua Kampus (Tampil di BJM & BJB)</option>
                  <option value="banjarmasin">📍 Khusus Banjarmasin (BJM)</option>
                  <option value="banjarbaru">📍 Khusus Banjarbaru (BJB)</option>
                </select>
              </div>

              <button className="am-btn-primary" style={{ padding: '12px 0', fontSize: 15, marginTop: 8 }} onClick={handleUpdateProduct}>
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 CUSTOM SUCCESS / ERROR POPUP BERANIMASI */}
      {alertPopup && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="success-modal-appear am-card" style={{
            width: '100%', maxWidth: 340, padding: 24, borderRadius: 20,
            background: 'var(--am-surface)', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div className="check-icon-anim" style={{
              width: 56, height: 56, margin: '0 auto 12px', 
              background: alertPopup.type === 'success' ? 'rgba(74, 197, 108, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, color: alertPopup.type === 'success' ? '#4AC56C' : '#EF4444', fontWeight: 'bold'
            }}>
              {alertPopup.type === 'success' ? '✨' : '⚠️'}
            </div>

            <h3 className="am-heading" style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: 'var(--am-text)' }}>
              {alertPopup.type === 'success' ? 'Berhasil!' : 'Perhatian'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--am-text-muted)', marginBottom: 20 }}>
              {alertPopup.message}
            </p>

            <button
              className="am-btn-primary"
              onClick={() => setAlertPopup(null)}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
                background: 'var(--am-primary)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer'
              }}
            >
              OK, Mengerti 👍
            </button>
          </div>
        </div>
      )}
    </div>
  )
}