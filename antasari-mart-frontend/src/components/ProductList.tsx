import { useState, useEffect } from 'react';
import type { Product, CartItem, Campus, ThemeMode } from '../types';
import { CATEGORIES, formatRupiah, MOCK_PRODUCTS } from '../data';
import { getProductsApi } from '../lib/api';
import PromoCarousel from './PromoCarousel';

interface ProductListProps {
  theme: ThemeMode;
  campus: Campus;
  cartItems: CartItem[];
  onAddToCart: (product: Product, qty: number) => void;
  onChat: (sellerId: string, sellerName: string, productName: string) => void;
  onNavigateCheckout?: () => void;
  onOpenVending?: () => void;
}

export default function ProductList({ theme, campus, cartItems: _cartItems, onAddToCart, onChat, onNavigateCheckout }: ProductListProps) {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'koperasi' | 'mahasiswa'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  
  const [successPopup, setSuccessPopup] = useState<{ product: Product; qty: number } | null>(null);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const isAesthetic = theme === 'aesthetic';

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
    setLoading(true);
    const stockOverrides: Record<string, number> = JSON.parse(localStorage.getItem('am_stock_overrides') || '{}');
    const customProds: Product[] = JSON.parse(localStorage.getItem('am_custom_products') || '[]');

    getProductsApi()
      .then(data => {
        let serverList: Product[] = (data.success && data.products && data.products.length > 0) ? data.products : [];
        // Pastikan produk Blind Bag & MOCK_PRODUCTS selalu ada jika belum ada di server
        const combined = [
          ...customProds,
          ...serverList,
          ...MOCK_PRODUCTS.filter(m => !serverList.some(s => s.id === m.id || s.name.toLowerCase() === m.name.toLowerCase()) && !customProds.some(c => c.id === m.id))
        ];

        const finalProducts = combined.map(p => {
          const override = stockOverrides[p.id] !== undefined ? stockOverrides[p.id] : (p.id === 'blind_bag_myammiy_35k' && stockOverrides['blind_bag_myammiy_35k'] !== undefined ? stockOverrides['blind_bag_myammiy_35k'] : undefined);
          if (override !== undefined) {
            return { ...p, stock: override };
          }
          return p;
        });

        setProductsList(finalProducts);
        setLoading(false);
      })
      .catch(err => {
        console.error("Gagal mengambil produk dari backend:", err);
        const combined = [
          ...customProds,
          ...MOCK_PRODUCTS.filter(m => !customProds.some(c => c.id === m.id))
        ];
        const finalProducts = combined.map(p => {
          const override = stockOverrides[p.id] !== undefined ? stockOverrides[p.id] : undefined;
          if (override !== undefined) {
            return { ...p, stock: override };
          }
          return p;
        });
        setProductsList(finalProducts);
        setLoading(false);
      });
  }, [campus]);

  const products = productsList.filter(p => {
    const productCampus = (p.campus || 'semua').toLowerCase().trim();
    const currentCampus = (campus || 'banjarmasin').toLowerCase().trim();
    const matchCampus = productCampus === 'semua' || productCampus === currentCampus;
    const matchCat = category === 'all' || p.category === category;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.sellerName.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all'
      ? true
      : filter === 'koperasi'
        ? p.isKoperasi
        : !p.isKoperasi;
    return matchCampus && matchCat && matchSearch && matchFilter;
  });

  return (
    <div style={{ padding: '16px 16px 80px', maxWidth: 1200, margin: '0 auto', fontFamily: 'var(--am-font-body)' }}>
      <style>{successModalStyles}</style>

      {/* 🌟 5 Landscape Promotional Brosur Carousel (Auto & Manual Slide) */}
      <PromoCarousel
        theme={theme}
        onAddToCart={onAddToCart}
        onFilterCategory={setCategory}
        onFilterType={setFilter}
        onOpenVending={onOpenVending}
      />

      {/* Banner Header Kampus */}
      <div
        className="am-card"
        style={{
          background: isAesthetic
            ? 'linear-gradient(135deg, #FFCAD4 0%, #B5E2FA 50%, #EDF6F9 100%)'
            : 'linear-gradient(135deg, #03045E 0%, #0077B6 50%, #00B4D8 100%)',
          color: isAesthetic ? '#2D3748' : '#ffffff',
          padding: '20px 20px',
          borderRadius: 20,
          marginBottom: 20,
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: isAesthetic ? '#E56B6F' : '#90E0EF', marginBottom: 4 }}>
              🌸 Antasari Mart Campus Hub
            </div>
            <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900 }}>
              Katalog Produk Kampus {campus === 'banjarmasin' ? 'Banjarmasin' : 'Banjarbaru'}
            </h1>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.9 }}>
              Dukung wirausaha mahasiswa & koperasi kampus dengan belanja mudah dan aman!
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
            <input
              type="text"
              placeholder="Cari produk, tenant, atau makanan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px 12px 40px',
                borderRadius: 14,
                border: '1px solid var(--am-border)',
                background: 'var(--am-surface)',
                color: 'var(--am-text)',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'all', label: 'Semua Produk' },
              { id: 'koperasi', label: '🏛️ Koperasi' },
              { id: 'mahasiswa', label: '🎓 Mahasiswa' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 12,
                  border: 'none',
                  background: filter === f.id ? 'var(--am-primary)' : 'var(--am-surface)',
                  color: filter === f.id ? 'white' : 'var(--am-text)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Categories Bar */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
          <button
            onClick={() => setCategory('all')}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: 'none',
              background: category === 'all' ? 'var(--am-primary)' : 'var(--am-surface)',
              color: category === 'all' ? 'white' : 'var(--am-text)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Semua Kategori
          </button>
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: 'none',
                background: category === c.id ? 'var(--am-primary)' : 'var(--am-surface)',
                color: category === c.id ? 'white' : 'var(--am-text)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--am-text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔄</div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Memuat daftar produk kampus...</p>
        </div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--am-text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
          <h3 style={{ margin: '0 0 6px', color: 'var(--am-text)' }}>Belum Ada Produk</h3>
          <p style={{ margin: 0, fontSize: 13 }}>Tidak ada produk yang cocok dengan pencarian atau filter saat ini.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {products.map(p => (
            <div
              key={p.id}
              className="am-card"
              style={{
                borderRadius: 18,
                background: 'var(--am-surface)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
                border: '1px solid var(--am-border)',
                transition: 'transform 0.2s',
                cursor: 'pointer'
              }}
              onClick={() => setSelectedProduct(p)}
            >
              <div style={{ width: '100%', height: 160, position: 'relative', overflow: 'hidden' }}>
                <img
                  src={p.image}
                  alt={p.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {p.isKoperasi && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      background: 'rgba(3, 4, 94, 0.85)',
                      color: 'white',
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: 6,
                      backdropFilter: 'blur(4px)'
                    }}
                  >
                    🏛️ Koperasi
                  </span>
                )}
                {p.stock <= 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 800,
                      fontSize: 14
                    }}
                  >
                    Habis
                  </div>
                )}
              </div>

              <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 11, color: 'var(--am-text-muted)', marginBottom: 2 }}>{p.sellerName}</div>
                <h4 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: 'var(--am-text)', lineHeight: 1.3 }}>
                  {p.name}
                </h4>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--am-primary)', marginTop: 'auto', marginBottom: 8 }}>
                  {formatRupiah(p.price)}
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToCart(p, 1);
                      setSuccessPopup({ product: p, qty: 1 });
                    }}
                    disabled={p.stock <= 0}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: 10,
                      border: 'none',
                      background: p.stock > 0 ? 'var(--am-primary)' : '#cbd5e1',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: p.stock > 0 ? 'pointer' : 'not-allowed'
                    }}
                  >
                    + Keranjang
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onChat(p.sellerId, p.sellerName, p.name);
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid var(--am-border)',
                      background: 'var(--am-surface)',
                      color: 'var(--am-text)',
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                    title="Tanya Penjual"
                  >
                    💬
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Detail Produk */}
      {selectedProduct && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="am-card"
            style={{
              width: '100%',
              maxWidth: 500,
              borderRadius: 24,
              background: 'var(--am-surface)',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ position: 'relative', height: 240 }}>
              <img
                src={selectedProduct.image}
                alt={selectedProduct.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                onClick={() => setSelectedProduct(null)}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: 'rgba(0,0,0,0.5)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  color: 'white',
                  fontSize: 16,
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--am-primary)', fontWeight: 700, marginBottom: 4 }}>
                {selectedProduct.sellerName} • Kampus {selectedProduct.campus.toUpperCase()}
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: 18, color: 'var(--am-text)' }}>{selectedProduct.name}</h2>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--am-primary)', marginBottom: 12 }}>
                {formatRupiah(selectedProduct.price)}
              </div>
              <p style={{ fontSize: 13, color: 'var(--am-text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
                {selectedProduct.description || 'Tidak ada deskripsi tambahan.'}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)' }}>Jumlah:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--am-border)', background: 'var(--am-surface)', cursor: 'pointer' }}
                  >
                    -
                  </button>
                  <span style={{ fontWeight: 800, fontSize: 14 }}>{qty}</span>
                  <button
                    onClick={() => setQty(q => q + 1)}
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--am-border)', background: 'var(--am-surface)', cursor: 'pointer' }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => {
                    onAddToCart(selectedProduct, qty);
                    setSuccessPopup({ product: selectedProduct, qty });
                    setSelectedProduct(null);
                    setQty(1);
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: 12,
                    border: 'none',
                    background: 'var(--am-primary)',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: 'pointer'
                  }}
                >
                  Tambah ke Keranjang
                </button>
                <button
                  onClick={() => {
                    onChat(selectedProduct.sellerId, selectedProduct.sellerName, selectedProduct.name);
                    setSelectedProduct(null);
                  }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: '1px solid var(--am-border)',
                    background: 'var(--am-surface)',
                    color: 'var(--am-text)',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  💬 Tanya
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {successPopup && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={() => setSuccessPopup(null)}
        >
          <div
            className="am-card success-modal-appear"
            style={{
              width: '100%',
              maxWidth: 380,
              padding: 24,
              borderRadius: 24,
              background: 'var(--am-surface)',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="check-icon-anim" style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
            <h3 style={{ margin: '0 0 6px', color: 'var(--am-text)' }}>Berhasil Ditambahkan!</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--am-text-muted)' }}>
              <strong>{successPopup.qty}x {successPopup.product.name}</strong> telah masuk ke keranjang belanja Anda.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setSuccessPopup(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: 10,
                  border: '1px solid var(--am-border)',
                  background: 'var(--am-surface)',
                  color: 'var(--am-text)',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Lanjut Belanja
              </button>
              {onNavigateCheckout && (
                <button
                  onClick={() => {
                    setSuccessPopup(null);
                    onNavigateCheckout();
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'var(--am-primary)',
                    color: 'white',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Lihat Keranjang
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
