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
  isGuest?: boolean;
  onRequireLogin?: () => void;
}

export default function ProductList({
  theme,
  campus,
  cartItems: _cartItems,
  onAddToCart,
  onChat,
  onNavigateCheckout,
  onOpenVending,
  isGuest,
  onRequireLogin
}: ProductListProps) {
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

  const loadProducts = () => {
    const stockOverrides: Record<string, number> = JSON.parse(localStorage.getItem('am_stock_overrides') || '{}');
    const customProds: Product[] = JSON.parse(localStorage.getItem('am_custom_products') || '[]');

    getProductsApi()
      .then(data => {
        let serverList: Product[] = (data.success && data.products && data.products.length > 0) ? data.products : [];
        const combined = [
          ...customProds,
          ...serverList,
          ...MOCK_PRODUCTS.filter(m => {
            const mName = (m.name || '').toLowerCase();
            return !serverList.some(s => {
              const sName = (s.name || (s as any).nama_produk || '').toLowerCase();
              return s.id === m.id || (sName && sName === mName);
            }) && !customProds.some(c => c.id === m.id);
          })
        ];

        const finalProducts = combined.map(p => {
          const mappedName = p.name || (p as any).nama_produk || 'Produk';
          const mappedDesc = p.description || (p as any).deskripsi || '';
          const mappedSeller = p.sellerName || (p as any).seller_name || 'Penjual';
          const mappedImage = p.image || (p as any).foto || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&auto=format';
          const mappedCategory = p.category || (p as any).kategori || 'kerajinan';
          const mappedPrice = typeof p.price === 'number' ? p.price : (typeof (p as any).harga === 'number' ? (p as any).harga : 0);
          const mappedStock = typeof p.stock === 'number' ? p.stock : (typeof (p as any).stok === 'number' ? (p as any).stok : 50);

          const override = stockOverrides[p.id] !== undefined ? stockOverrides[p.id] : (p.id === 'blind_bag_myammiy_35k' && stockOverrides['blind_bag_myammiy_35k'] !== undefined ? stockOverrides['blind_bag_myammiy_35k'] : undefined);
          
          return {
            ...p,
            name: mappedName,
            description: mappedDesc,
            sellerName: mappedSeller,
            image: mappedImage,
            category: mappedCategory,
            price: mappedPrice,
            stock: override !== undefined ? override : mappedStock
          };
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
          return {
            ...p,
            name: p.name || (p as any).nama_produk || 'Produk',
            description: p.description || (p as any).deskripsi || '',
            sellerName: p.sellerName || (p as any).seller_name || 'Penjual',
            image: p.image || (p as any).foto || '',
            stock: override !== undefined ? override : (p.stock !== undefined ? p.stock : 50)
          };
        });
        setProductsList(finalProducts);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadProducts();

    const handleStorageChange = () => {
      loadProducts();
    };

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(loadProducts, 3000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [campus]);

  const products = productsList.filter(p => {
    const productCampus = (p.campus || 'semua').toLowerCase().trim();
    const currentCampus = (campus || 'banjarmasin').toLowerCase().trim();
    const matchCampus = productCampus === 'semua' || productCampus === currentCampus;
    const matchCat = category === 'all' || p.category === category;
    const pName = (p.name || (p as any).nama_produk || '').toLowerCase();
    const pDesc = (p.description || (p as any).deskripsi || '').toLowerCase();
    const pSeller = (p.sellerName || (p as any).seller_name || '').toLowerCase();
    const sQuery = (search || '').toLowerCase();

    const matchSearch = !sQuery || pName.includes(sQuery) || pDesc.includes(sQuery) || pSeller.includes(sQuery);
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
            ? 'linear-gradient(135deg, #FCE7EE 0%, #F4FAF6 50%, #FAFDFB 100%)'
            : 'linear-gradient(135deg, #1E2E24 0%, #293D30 50%, #131E17 100%)',
          color: isAesthetic ? '#243329' : '#ffffff',
          padding: '20px 20px',
          borderRadius: 20,
          marginBottom: 20,
          boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
          border: '1px solid var(--am-border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#E68FA5', marginBottom: 4 }}>
              🌸 Antasari Mart Campus Hub
            </div>
            <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900 }}>
              Katalog Produk {campus === 'banjarmasin' ? 'Kampus 1 Banjarmasin' : 'Kampus 2 Banjarbaru'}
            </h1>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.9, color: 'var(--am-text-muted)' }}>
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
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--am-text-muted)', display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'all', label: 'Semua Produk' },
              { id: 'koperasi', label: 'Koperasi' },
              { id: 'mahasiswa', label: 'Mahasiswa' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 12,
                  border: filter === f.id ? '1px solid var(--am-primary)' : '1px solid var(--am-border)',
                  background: filter === f.id ? 'var(--am-primary)' : 'var(--am-surface)',
                  color: filter === f.id ? 'white' : 'var(--am-text)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  transition: 'all 0.15s ease'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Categories Bar */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 6,
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {CATEGORIES.map(c => {
            const catId = c.id || c.key || 'all';
            const isSelected = category === catId;
            return (
              <button
                key={catId}
                onClick={() => setCategory(catId)}
                style={{
                  padding: '7px 15px',
                  borderRadius: 20,
                  border: isSelected ? '1.5px solid var(--am-primary)' : '1px solid var(--am-border)',
                  background: isSelected ? 'var(--am-primary)' : 'var(--am-surface)',
                  color: isSelected ? '#FFFFFF' : 'var(--am-text)',
                  fontSize: 12,
                  fontWeight: isSelected ? 800 : 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? '0 3px 10px rgba(95, 168, 116, 0.25)' : '0 1px 3px rgba(0,0,0,0.03)'
                }}
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Grid (2 Kotak 2 Kotak Layout Standar E-Commerce) */}
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
        <div className="am-product-grid-container">
          <style>{`
            .am-product-grid-container {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
            }
            @media (min-width: 768px) {
              .am-product-grid-container {
                grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
                gap: 16px;
              }
            }
          `}</style>
          {products.map(p => (
            <div
              key={p.id}
              className="am-card"
              style={{
                borderRadius: 16,
                background: 'var(--am-surface)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 3px 12px rgba(0,0,0,0.04)',
                border: '1px solid var(--am-border)',
                transition: 'transform 0.2s',
                cursor: 'pointer'
              }}
              onClick={() => setSelectedProduct(p)}
            >
              <div style={{ width: '100%', height: 145, position: 'relative', overflow: 'hidden', background: 'var(--am-bg2)' }}>
                <img
                  src={p.image}
                  alt={p.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {p.isKoperasi && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 6,
                      left: 6,
                      background: '#4D9562',
                      color: 'white',
                      fontSize: 9.5,
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: 6,
                      boxShadow: '0 2px 6px rgba(77, 149, 98, 0.35)'
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
                      background: 'rgba(0,0,0,0.55)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 800,
                      fontSize: 13
                    }}
                  >
                    Habis
                  </div>
                )}
              </div>

              <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 4 }}>
                  <span style={{ fontSize: 10.5, color: 'var(--am-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '58%' }}>
                    {p.sellerName}
                  </span>
                  <span style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    padding: '2px 5px',
                    borderRadius: 6,
                    background: p.stock > 10 ? 'rgba(34, 197, 94, 0.12)' : (p.stock > 0 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.12)'),
                    color: p.stock > 10 ? '#16a34a' : (p.stock > 0 ? '#b45309' : '#dc2626'),
                    flexShrink: 0
                  }}>
                    {p.stock > 0 ? `📦 Sisa ${p.stock}` : '❌ Habis'}
                  </span>
                </div>

                <h4 style={{ margin: '0 0 4px', fontSize: 13.5, fontWeight: 700, color: 'var(--am-text)', lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {p.name}
                </h4>

                {/* 📝 Deskripsi Barang Detail (Preview) */}
                <p style={{
                  fontSize: 11,
                  color: 'var(--am-text-muted)',
                  margin: '0 0 6px',
                  lineHeight: 1.35,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {p.description || 'Produk unggulan berkualitas kampus siap dipesan.'}
                </p>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', marginTop: 'auto', marginBottom: 8 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 900, color: 'var(--am-primary)' }}>
                    {formatRupiah(p.price)}
                  </div>
                  {p.originalPrice && p.originalPrice > p.price && (
                    <div style={{ fontSize: 11, color: 'var(--am-text-muted)', textDecoration: 'line-through', fontWeight: 600 }}>
                      {formatRupiah(p.originalPrice)}
                    </div>
                  )}
                  {p.originalPrice && p.originalPrice > p.price && (
                    <span style={{ fontSize: 9.5, fontWeight: 800, color: '#EF4444', background: '#FEE2E2', padding: '1px 5px', borderRadius: 4 }}>
                      -{Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)}%
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isGuest) {
                        if (onRequireLogin) onRequireLogin();
                        return;
                      }
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
                      if (isGuest) {
                        if (onRequireLogin) onRequireLogin();
                        return;
                      }
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
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--am-primary)' }}>
                  {formatRupiah(selectedProduct.price)}
                </div>
                {selectedProduct.originalPrice && selectedProduct.originalPrice > selectedProduct.price && (
                  <div style={{ fontSize: 13, color: 'var(--am-text-muted)', textDecoration: 'line-through', fontWeight: 600 }}>
                    {formatRupiah(selectedProduct.originalPrice)}
                  </div>
                )}
                {selectedProduct.originalPrice && selectedProduct.originalPrice > selectedProduct.price && (
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#EF4444', background: '#FEE2E2', padding: '2px 8px', borderRadius: 6 }}>
                    Hemat {formatRupiah(selectedProduct.originalPrice - selectedProduct.price)} (-{Math.round(((selectedProduct.originalPrice - selectedProduct.price) / selectedProduct.originalPrice) * 100)}%)
                  </span>
                )}
              </div>

              {/* 📦 Real-time Stock Information Badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: selectedProduct.stock > 0 ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${selectedProduct.stock > 0 ? '#86efac' : '#fca5a5'}`,
                borderRadius: 12,
                marginBottom: 14,
                fontSize: 12.5,
                fontWeight: 700,
                color: selectedProduct.stock > 0 ? '#16a34a' : '#dc2626'
              }}>
                <span>{selectedProduct.stock > 0 ? '📦 Sisa Stok Tersedia (Real-Time):' : '❌ Status Stok:'}</span>
                <span style={{ fontSize: 13, fontWeight: 900, background: selectedProduct.stock > 0 ? '#16a34a' : '#dc2626', color: 'white', padding: '2px 8px', borderRadius: 8 }}>
                  {selectedProduct.stock > 0 ? `${selectedProduct.stock} unit` : 'Habis'}
                </span>
              </div>

              <p style={{ fontSize: 13, color: 'var(--am-text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
                {selectedProduct.description || 'Tidak ada deskripsi tambahan.'}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)' }}>Jumlah:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--am-border)', background: 'var(--am-surface)', color: 'var(--am-text)', cursor: 'pointer', fontWeight: 800, fontSize: 16 }}
                  >
                    -
                  </button>
                  <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--am-text)' }}>{qty}</span>
                  <button
                    onClick={() => setQty(q => q + 1)}
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--am-border)', background: 'var(--am-surface)', color: 'var(--am-text)', cursor: 'pointer', fontWeight: 800, fontSize: 16 }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => {
                    if (isGuest) {
                      setSelectedProduct(null);
                      if (onRequireLogin) onRequireLogin();
                      return;
                    }
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
                    if (isGuest) {
                      setSelectedProduct(null);
                      if (onRequireLogin) onRequireLogin();
                      return;
                    }
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
