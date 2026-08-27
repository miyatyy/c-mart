import { useState, useEffect } from 'react';
import type { ThemeMode, Campus, Product, ProductCategory } from '../types';
import { MOCK_ORDERS, formatRupiah, CATEGORIES } from '../data';
import { getProductsApi, createProductApi, updateProductApi, deleteProductApi, uploadImageApi } from '../lib/api';

interface SellerDashboardProps {
  theme: ThemeMode;
  campus: Campus;
  sellerId: string;
  sellerName: string;
}

type SellerTab = 'products' | 'orders' | 'analytics';
type ProductTab = 'active' | 'empty';

interface NewProduct {
  name: string;
  description: string;
  price: string;
  stock: string;
  category: ProductCategory;
  targetCampus: string;
}

export default function SellerDashboard({ theme: _theme, campus: _campus, sellerId, sellerName }: SellerDashboardProps) {
  const [tab, setTab] = useState<SellerTab>('products');
  const [productTab, setProductTab] = useState<ProductTab>('active');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // State untuk Modal Edit Produk
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  
  // Custom Alert Popup Beranimasi
  const [alertPopup, setAlertPopup] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [newProd, setNewProd] = useState<NewProduct>({ 
    name: '', 
    description: '', 
    price: '', 
    stock: '', 
    category: 'makanan',
    targetCampus: 'semua'
  });
  const [imageFile, setImageFile] = useState<string>(''); 

  const loadProducts = () => {
    setLoading(true);
    getProductsApi(sellerId)
      .then(data => {
        if (data.success && data.products) {
          setProducts(data.products);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Gagal memuat produk seller:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadProducts();
  }, [sellerId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const res = await uploadImageApi(file);
      if (res.success && res.imageUrl) {
        setImageFile(res.imageUrl);
        setAlertPopup({ message: 'Foto produk berhasil diunggah ke Cloudinary! ☁️', type: 'success' });
      } else {
        setAlertPopup({ message: res.message || 'Gagal mengunggah foto.', type: 'error' });
      }
    } catch (err: any) {
      setAlertPopup({ message: 'Gagal mengunggah foto produk: ' + err.message, type: 'error' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.name || !newProd.price || !newProd.stock) {
      setAlertPopup({ message: 'Mohon lengkapi data produk wajib!', type: 'error' });
      return;
    }

    try {
      const activeUser = JSON.parse(localStorage.getItem('am_user_session') || '{}');
      const res = await createProductApi({
        name: newProd.name,
        description: newProd.description,
        price: parseInt(newProd.price),
        stock: parseInt(newProd.stock),
        category: newProd.category,
        image: imageFile || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&auto=format',
        campus: newProd.targetCampus,
        sellerId: sellerId || activeUser.email || 'seller_1',
        sellerName: sellerName || activeUser.nama || 'Penjual Antasari'
      });

      if (res.success) {
        setAlertPopup({ message: 'Produk berhasil diterbitkan! 🎉', type: 'success' });
        setShowAddModal(false);
        setNewProd({ name: '', description: '', price: '', stock: '', category: 'makanan', targetCampus: 'semua' });
        setImageFile('');
        loadProducts();
      } else {
        setAlertPopup({ message: res.message || 'Gagal menambahkan produk.', type: 'error' });
      }
    } catch (err: any) {
      setAlertPopup({ message: 'Kesalahan sistem: ' + err.message, type: 'error' });
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      const activeUser = JSON.parse(localStorage.getItem('am_user_session') || '{}');
      const res = await updateProductApi(editingProduct.id, {
        name: editingProduct.name,
        description: editingProduct.description,
        price: parseInt(editingProduct.price),
        stock: parseInt(editingProduct.stock),
        category: editingProduct.category,
        image: editingProduct.image,
        userRole: activeUser.role,
        userEmail: activeUser.email
      });

      if (res.success) {
        setAlertPopup({ message: 'Perubahan produk berhasil disimpan! ✨', type: 'success' });
        setShowEditModal(false);
        setEditingProduct(null);
        loadProducts();
      } else {
        setAlertPopup({ message: res.message || 'Gagal memperbarui produk.', type: 'error' });
      }
    } catch (err: any) {
      setAlertPopup({ message: 'Gagal memperbarui produk: ' + err.message, type: 'error' });
    }
  };

  const handleDeleteProduct = async (id: string | number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;
    try {
      const res = await deleteProductApi(id);
      if (res.success) {
        setAlertPopup({ message: 'Produk berhasil dihapus! 🗑️', type: 'success' });
        loadProducts();
      } else {
        setAlertPopup({ message: res.message || 'Gagal menghapus produk.', type: 'error' });
      }
    } catch (err: any) {
      setAlertPopup({ message: 'Gagal menghapus produk: ' + err.message, type: 'error' });
    }
  };

  const displayedProducts = products.filter(p => productTab === 'active' ? p.stock > 0 : p.stock <= 0);

  return (
    <div style={{ padding: '24px 16px 80px', maxWidth: 1000, margin: '0 auto', fontFamily: 'var(--am-font-body)' }}>
      {/* Banner Toko */}
      <div className="am-card" style={{ padding: 24, borderRadius: 20, background: 'linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)', color: 'white', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', opacity: 0.8, marginBottom: 4 }}>🏪 Seller Centre Antasari Mart</div>
            <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 900 }}>{sellerName}</h1>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.9 }}>Kelola stok, harga katalog, dan pantau penjualan harian toko kampusmu.</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            style={{ padding: '10px 18px', borderRadius: 12, border: 'none', background: '#ffffff', color: '#0077B6', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
          >
            + Tambah Produk Baru
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--am-border)', paddingBottom: 10 }}>
        {[
          { id: 'products', label: '📦 Produk Saya' },
          { id: 'orders', label: '📋 Pesanan Masuk' },
          { id: 'analytics', label: '📊 Analitik Toko' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: 'none',
              background: tab === t.id ? 'var(--am-primary)' : 'transparent',
              color: tab === t.id ? 'white' : 'var(--am-text)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'products' && (
        <div>
          {/* Sub Tab Produk Aktif vs Habis */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => setProductTab('active')}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                background: productTab === 'active' ? 'var(--am-surface)' : 'transparent',
                color: productTab === 'active' ? 'var(--am-primary)' : 'var(--am-text-muted)',
                boxShadow: productTab === 'active' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              Aktif ({products.filter(p => p.stock > 0).length})
            </button>
            <button
              onClick={() => setProductTab('empty')}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                background: productTab === 'empty' ? 'var(--am-surface)' : 'transparent',
                color: productTab === 'empty' ? '#EF4444' : 'var(--am-text-muted)',
                boxShadow: productTab === 'empty' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              Stok Habis ({products.filter(p => p.stock <= 0).length})
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--am-text-muted)' }}>Memuat produk toko...</div>
          ) : displayedProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--am-text-muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>
              <p style={{ margin: 0, fontSize: 13 }}>Belum ada produk pada kategori ini.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {displayedProducts.map(p => (
                <div key={p.id} className="am-card" style={{ borderRadius: 16, background: 'var(--am-surface)', overflow: 'hidden', border: '1px solid var(--am-border)', display: 'flex', flexDirection: 'column' }}>
                  <img src={p.image} alt={p.name} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
                  <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: 'var(--am-text)' }}>{p.name}</h4>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--am-primary)', marginBottom: 4 }}>{formatRupiah(p.price)}</div>
                    <div style={{ fontSize: 11, color: 'var(--am-text-muted)', marginBottom: 12 }}>Stok: {p.stock} pcs • Terjual: {p.sold}</div>
                    
                    <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                      <button
                        onClick={() => { setEditingProduct(p); setShowEditModal(true); }}
                        style={{ flex: 1, padding: '6px', borderRadius: 8, border: '1px solid var(--am-border)', background: 'var(--am-surface)', color: 'var(--am-text)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: '#FEE2E2', color: '#DC2626', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'orders' && (
        <div className="am-card" style={{ padding: 20, borderRadius: 18, background: 'var(--am-surface)' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 16, color: 'var(--am-text)' }}>Daftar Pesanan Pembeli</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {MOCK_ORDERS.map(ord => (
              <div key={ord.id} style={{ padding: 14, borderRadius: 12, border: '1px solid var(--am-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--am-text)' }}>Order #{ord.id} - {ord.buyerName}</div>
                  <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>Metode: {ord.deliveryMethod} • Total: {formatRupiah(ord.total)}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: '#E0F2FE', color: '#0369A1' }}>
                  {ord.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div className="am-card" style={{ padding: 20, borderRadius: 16, background: 'var(--am-surface)', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>💰</div>
            <div style={{ fontSize: 12, color: 'var(--am-text-muted)' }}>Total Omset Jualan</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--am-primary)', marginTop: 4 }}>Rp 1.250.000</div>
          </div>
          <div className="am-card" style={{ padding: 20, borderRadius: 16, background: 'var(--am-surface)', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>📦</div>
            <div style={{ fontSize: 12, color: 'var(--am-text-muted)' }}>Total Produk Aktif</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--am-primary)', marginTop: 4 }}>{products.length} Item</div>
          </div>
          <div className="am-card" style={{ padding: 20, borderRadius: 16, background: 'var(--am-surface)', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>⭐</div>
            <div style={{ fontSize: 12, color: 'var(--am-text-muted)' }}>Rating Kepuasan</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#F59E0B', marginTop: 4 }}>4.9 / 5.0</div>
          </div>
        </div>
      )}

      {/* Modal Tambah Produk */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="am-card" style={{ width: '100%', maxWidth: 480, padding: 24, borderRadius: 20, background: 'var(--am-surface)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 18, color: 'var(--am-text)' }}>Tambah Produk Baru</h3>
            <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)' }}>Nama Produk</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pentol Kuah UIN"
                  value={newProd.name}
                  onChange={e => setNewProd({ ...newProd, name: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--am-border)', marginTop: 4, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)' }}>Harga (Rp)</label>
                  <input
                    type="number"
                    required
                    placeholder="10000"
                    value={newProd.price}
                    onChange={e => setNewProd({ ...newProd, price: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--am-border)', marginTop: 4, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)' }}>Stok</label>
                  <input
                    type="number"
                    required
                    placeholder="20"
                    value={newProd.stock}
                    onChange={e => setNewProd({ ...newProd, stock: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--am-border)', marginTop: 4, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)' }}>Kategori</label>
                <select
                  value={newProd.category}
                  onChange={e => setNewProd({ ...newProd, category: e.target.value as ProductCategory })}
                  style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--am-border)', marginTop: 4 }}
                >
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)' }}>Foto Produk (Cloudinary)</label>
                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ width: '100%', marginTop: 4, fontSize: 12 }} />
                {uploadingImage && <div style={{ fontSize: 11, color: 'var(--am-primary)', marginTop: 4 }}>Mengunggah gambar...</div>}
                {imageFile && <img src={imageFile} alt="Preview" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />}
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)' }}>Deskripsi Produk</label>
                <textarea
                  placeholder="Jelaskan detail produk, bahan, atau porsi..."
                  value={newProd.description}
                  onChange={e => setNewProd({ ...newProd, description: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--am-border)', marginTop: 4, boxSizing: 'border-box', height: 70 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--am-border)', background: 'var(--am-surface)', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'var(--am-primary)', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  Terbitkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Produk */}
      {showEditModal && editingProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="am-card" style={{ width: '100%', maxWidth: 480, padding: 24, borderRadius: 20, background: 'var(--am-surface)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 18, color: 'var(--am-text)' }}>Edit Produk</h3>
            <form onSubmit={handleUpdateProduct} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)' }}>Nama Produk</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--am-border)', marginTop: 4, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)' }}>Harga (Rp)</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.price}
                    onChange={e => setEditingProduct({ ...editingProduct, price: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--am-border)', marginTop: 4, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)' }}>Stok</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.stock}
                    onChange={e => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--am-border)', marginTop: 4, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)' }}>Deskripsi</label>
                <textarea
                  value={editingProduct.description}
                  onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--am-border)', marginTop: 4, boxSizing: 'border-box', height: 70 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--am-border)', background: 'var(--am-surface)', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'var(--am-primary)', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alert Popup */}
      {alertPopup && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1200, padding: '12px 20px', borderRadius: 14, background: alertPopup.type === 'success' ? '#10B981' : '#EF4444', color: 'white', fontWeight: 700, fontSize: 13, boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}>
          {alertPopup.message}
          <button onClick={() => setAlertPopup(null)} style={{ marginLeft: 10, background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 800 }}>✕</button>
        </div>
      )}
    </div>
  );
}
