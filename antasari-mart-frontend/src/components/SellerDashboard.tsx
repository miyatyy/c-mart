import { useState, useEffect } from 'react'
import type { ThemeMode, Campus, Product, ProductCategory } from '../types'
import { MOCK_ORDERS, formatRupiah, CATEGORIES } from '../data'

interface SellerDashboardProps {
  theme: ThemeMode
  campus: Campus
  sellerId: string
  sellerName: string
}

type SellerTab = 'products' | 'orders' | 'analytics'
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
  
  // 👉 State untuk Modal Edit Produk
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  
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

  useEffect(() => {
    fetch('http://192.168.18.18:3000/api/products')
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

  async function handleAddProduct() {
    if (!newProd.name || !newProd.price || !newProd.stock) return

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
      const response = await fetch('http://192.168.18.18:3000/api/products', {
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
        alert("Produk berhasil ditambahkan!");
      } else {
        alert("Gagal menyimpan produk.");
      }
    } catch (err) {
      console.error("Gagal simpan ke backend:", err);
      alert("Terjadi kesalahan jaringan.");
    }

    setNewProd({ name: '', description: '', price: '', stock: '', category: 'makanan', targetCampus: 'semua' })
    setImageFile('') 
    setShowAddModal(false)
  }

  // 👉 Fungsi Simpan Perubahan Edit Produk
  async function handleUpdateProduct() {
    if (!editingProduct) return

    try {
      const response = await fetch(`http://192.168.18.18:3000/api/products/${editingProduct.id}`, {
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
        alert("Produk berhasil diperbarui!");
        setShowEditModal(false);
        setEditingProduct(null);
      } else {
        alert("Gagal mengupdate produk di database.");
      }
    } catch (err) {
      console.error("Gagal update produk:", err);
      alert("Terjadi kesalahan jaringan.");
    }
  }

  function handleUpdateStock(id: string, delta: number) {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p))
  }

  async function handleDeleteProduct(id: string) {
    if (!window.confirm("Yakin ingin menghapus produk ini dari lapak dan beranda?")) return

    try {
      const response = await fetch(`http://192.168.18.18:3000/api/products/${id}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (data.success) {
        setProducts(prev => prev.filter(p => p.id !== id))
      } else {
        alert("Gagal menghapus produk dari database.")
      }
    } catch (err) {
      console.error("Error menghapus produk:", err)
      alert("Terjadi kesalahan jaringan.")
    }
  }

  return (
    <div style={{ padding: '16px 0 80px' }}>
      <div style={{ padding: '0 16px 16px' }}>
        <h2 className="am-heading" style={{ margin: '0 0 4px', fontSize: 22, color: 'var(--am-text)' }}>🏪 Lapak Saya</h2>
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

      <div style={{ display: 'flex', padding: '0 16px 16px', gap: 8 }}>
        {[
          { key: 'products', label: '📦 Produk' },
          { key: 'orders', label: '🧾 Pesanan' },
          { key: 'analytics', label: '📊 Analitik' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as SellerTab)}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
              fontWeight: 600, fontSize: 12, fontFamily: 'var(--am-font-body)',
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
                    {p.stock > 0 && p.stock <= 5 && <span style={{ fontSize: 10, fontWeight: 700, color: '#D97706', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: 999 }}>⚠️ Menipis</span>}
                  </div>
                </div>

                {/* 👉 Tombol Edit (Pensil) & Tombol Hapus (Tempat Sampah) */}
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

      {/* 👉 MODAL EDIT PRODUK */}
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
    </div>
  )
}