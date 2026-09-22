import { useState, useEffect, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Product, CartItem, Campus, ThemeMode } from '../types';
import { CATEGORIES, formatRupiah, MOCK_PRODUCTS } from '../data';
import { getProductsApi } from '../lib/api';
import PromoCarousel from './PromoCarousel';
import ProductDetailModal from './ProductDetailModal';
import { isUserProductOwner } from '../lib/productOwnership';

export const DEFAULT_PRODUCT_IMAGE_FALLBACK = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="%23F0FDF4"/><circle cx="200" cy="170" r="70" fill="%23DCFCE7"/><text x="50%" y="46%" dominant-baseline="middle" text-anchor="middle" font-size="52">🌸</text><text x="50%" y="68%" dominant-baseline="middle" text-anchor="middle" fill="%23166534" font-family="system-ui,sans-serif" font-weight="900" font-size="18">Campus Mart</text><text x="50%" y="78%" dominant-baseline="middle" text-anchor="middle" fill="%23059669" font-family="system-ui,sans-serif" font-weight="600" font-size="12">Katalog Produk Kampus</text></svg>';

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
  currentUser?: any;
}

interface ProductCardItemProps {
  product: Product;
  onSelect: () => void;
  onAddToCart: (p: Product, qty: number) => void;
  isGuest?: boolean;
  onRequireLogin?: () => void;
  onSuccessAddToCart: (p: Product, qty: number) => void;
  currentUser?: any;
}

const ProductCardItem = memo(function ProductCardItem({
  product: p,
  onSelect,
  onAddToCart,
  isGuest,
  onRequireLogin,
  onSuccessAddToCart,
  currentUser
}: ProductCardItemProps) {
  const isOwnProduct = isUserProductOwner(p, currentUser);

  return (
    <div
      className="am-card group w-full h-full flex flex-col"
      style={{
        borderRadius: 16,
        background: 'var(--am-surface)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        boxShadow: '0 3px 14px rgba(0,0,0,0.04)',
        border: '1px solid var(--am-border)',
        transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease',
        cursor: 'pointer',
        willChange: 'transform',
        transform: 'translateZ(0)'
      }}
      onClick={onSelect}
    >
      {/* 🔒 KUNCI TINGGI GAMBAR PRODUK AGAR TIDAK MEMBESAR RAKSASA */}
      <div
        className="relative w-full aspect-[4/3] max-h-44 sm:max-h-52 md:max-h-60 overflow-hidden rounded-t-xl bg-gray-100 dark:bg-gray-800"
        style={{
          width: '100%',
          aspectRatio: '4/3',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--am-bg2)'
        }}
      >
        <img
          src={p.image || DEFAULT_PRODUCT_IMAGE_FALLBACK}
          alt={p.name}
          className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            if (e.currentTarget.src !== DEFAULT_PRODUCT_IMAGE_FALLBACK) {
              e.currentTarget.src = DEFAULT_PRODUCT_IMAGE_FALLBACK;
            }
          }}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', transition: 'transform 0.3s ease' }}
          loading="lazy"
        />
        {p.isKoperasi && (
          <span
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              background: '#166534',
              color: 'white',
              fontSize: 10,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 6,
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              zIndex: 2
            }}
          >
            🏛️ Koperasi
          </span>
        )}
        {p.slotNumber && (
          <span
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'rgba(15, 23, 42, 0.75)',
              color: '#38BDF8',
              fontSize: 9.5,
              fontWeight: 800,
              padding: '2px 7px',
              borderRadius: 6,
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.15)',
              zIndex: 2
            }}
          >
            🤖 Slot #{p.slotNumber}
          </span>
        )}
        {p.stock <= 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 900,
              fontSize: 13,
              letterSpacing: 1,
              zIndex: 3
            }}
          >
            ❌ STOK HABIS
          </div>
        )}
      </div>

      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--am-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>
            🏪 {p.sellerName}
          </span>
          <span style={{
            fontSize: 10,
            fontWeight: 800,
            padding: '2px 6px',
            borderRadius: 6,
            background: p.stock > 10 ? 'rgba(34, 197, 94, 0.14)' : (p.stock > 0 ? 'rgba(234, 179, 8, 0.16)' : 'rgba(239, 68, 68, 0.14)'),
            color: p.stock > 10 ? '#15803d' : (p.stock > 0 ? '#b45309' : '#b91c1c'),
            flexShrink: 0
          }}>
            {p.stock > 0 ? `Stok ${p.stock}` : 'Habis'}
          </span>
        </div>

        <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: 'var(--am-text)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {p.name}
        </h4>

        {/* 🧶 Tag Bahan / Deskripsi Preview */}
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
          {p.material ? `✨ ${p.material}` : (p.description || 'Produk unggulan berkualitas kampus siap dipesan.')}
        </p>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', marginTop: 'auto', marginBottom: 10, paddingTop: 4 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--am-primary)' }}>
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

        {isOwnProduct ? (
          <button
            disabled
            title="Anda tidak dapat membeli produk dari toko Anda sendiri"
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 10,
              border: '1px solid rgba(148, 163, 184, 0.4)',
              background: '#64748B',
              color: '#F8FAFC',
              fontWeight: 800,
              fontSize: 12,
              cursor: 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              opacity: 0.95
            }}
          >
            <span>🛍️ Produk Toko Anda</span>
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isGuest) {
                if (onRequireLogin) onRequireLogin();
                return;
              }
              onAddToCart(p, 1);
              onSuccessAddToCart(p, 1);
            }}
            disabled={p.stock <= 0}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 10,
              border: 'none',
              background: p.stock > 0 ? 'var(--am-primary)' : '#cbd5e1',
              color: 'white',
              fontWeight: 800,
              fontSize: 12.5,
              cursor: p.stock > 0 ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: p.stock > 0 ? '0 2px 8px rgba(95, 168, 116, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span>+ Keranjang</span>
          </button>
        )}
      </div>
    </div>
  );
});

const ProductList = memo(function ProductList({
  theme,
  campus,
  cartItems: _cartItems,
  onAddToCart,
  onChat,
  onNavigateCheckout,
  onOpenVending,
  isGuest,
  onRequireLogin,
  currentUser
}: ProductListProps) {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'koperasi' | 'mahasiswa'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [successPopup, setSuccessPopup] = useState<{ product: Product; qty: number } | null>(null);
  
  // Initial synchronous render from local storage / mock products so UI is interactive instantly
  const [productsList, setProductsList] = useState<Product[]>(() => {
    try {
      const stockOverrides: Record<string, number> = JSON.parse(localStorage.getItem('am_stock_overrides') || '{}');
      const allCustomProds: Product[] = JSON.parse(localStorage.getItem('am_custom_products') || '[]');
      const approvedCustomProds = allCustomProds.filter(p => !p.status || p.status === 'approved' || p.status === 'active');
      const combined = [
        ...approvedCustomProds,
        ...MOCK_PRODUCTS.filter(m => !approvedCustomProds.some(c => c.id === m.id))
      ];
      return combined.map(p => ({
        ...p,
        stock: stockOverrides[p.id] !== undefined ? stockOverrides[p.id] : (p.stock !== undefined ? p.stock : 50)
      }));
    } catch {
      return MOCK_PRODUCTS;
    }
  });
  const [loading, setLoading] = useState(false);
  const isLoadingRef = useState({ current: false })[0];

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
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    const stockOverrides: Record<string, number> = JSON.parse(localStorage.getItem('am_stock_overrides') || '{}');
    const allCustomProds: Product[] = JSON.parse(localStorage.getItem('am_custom_products') || '[]');
    // Hanya ambil produk custom yang lolos kurasi (status approved / active atau default)
    const approvedCustomProds = allCustomProds.filter(p => !p.status || p.status === 'approved' || p.status === 'active');

    getProductsApi(undefined, 'approved')
      .then(data => {
        let serverList: Product[] = (data.success && data.products && data.products.length > 0) 
          ? data.products.filter(p => !p.status || p.status === 'approved' || p.status === 'active') 
          : [];
        const combined = [
          ...approvedCustomProds,
          ...serverList,
          ...MOCK_PRODUCTS.filter(m => {
            const mName = (m.name || '').toLowerCase();
            return !serverList.some(s => {
              const sName = (s.name || (s as any).nama_produk || '').toLowerCase();
              return s.id === m.id || (sName && sName === mName);
            }) && !approvedCustomProds.some(c => c.id === m.id);
          })
        ];

        const finalProducts = combined.map(p => {
          const mappedName = p.name || (p as any).nama_produk || 'Produk';
          const mappedDesc = p.description || (p as any).deskripsi || '';
          const mappedSeller = p.sellerName || (p as any).seller_name || 'Penjual';
          let mappedImage = p.image || (p as any).foto || DEFAULT_PRODUCT_IMAGE_FALLBACK;
          let mappedImages = Array.isArray(p.images) && p.images.length > 0 ? p.images : (mappedImage ? [mappedImage] : [DEFAULT_PRODUCT_IMAGE_FALLBACK]);

          if (mappedName.toLowerCase().includes('ganci rajut')) {
            mappedImage = '/products/ganci_rajut_1.jpg';
            mappedImages = [
              '/products/ganci_rajut_1.jpg',
              '/products/ganci_rajut_2.jpg',
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop'
            ];
          } else if ((p.id || '').includes('blind_bag') || mappedName.toLowerCase().includes('blind bag')) {
            mappedImage = '/banners/banner_blindbag.jpg';
            mappedImages = [
              '/banners/banner_blindbag.jpg',
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop'
            ];
          }

          const mappedVideo = p.videoUrl || (p as any).video_url || undefined;
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
            images: mappedImages,
            videoUrl: mappedVideo,
            category: mappedCategory,
            price: mappedPrice,
            stock: override !== undefined ? override : mappedStock
          };
        });

        setProductsList(finalProducts);
        setLoading(false);
      })
      .catch(err => {
        console.warn("Backend products offline:", err);
      })
      .finally(() => {
        isLoadingRef.current = false;
      });
  };

  useEffect(() => {
    loadProducts();

    const handleModerationChange = () => {
      loadProducts();
    };
    window.addEventListener('am_product_moderated', handleModerationChange);
    return () => window.removeEventListener('am_product_moderated', handleModerationChange);
  }, []);

  useEffect(() => {
    loadProducts();

    const handleStorageChange = () => {
      loadProducts();
    };

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(loadProducts, 20000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [campus]);

  const filteredByCampusAndCat = productsList.filter(p => {
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

  // 🛡️ Fallback Pintar: Jika filter kampus tertentu menghasilkan 0 produk, tampilkan seluruh katalog agar etalase tidak kosong!
  const products = filteredByCampusAndCat.length > 0 ? filteredByCampusAndCat : productsList.filter(p => {
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
    return matchCat && matchSearch && matchFilter;
  });

  return (
    <div className="w-full max-w-4xl lg:max-w-5xl mx-auto px-3 sm:px-4 py-4 pb-24 md:pb-8" style={{ fontFamily: 'var(--am-font-body)' }}>
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
              🌸 Campus Mart Hub
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

      {/* Product Grid 2 Kolom Seimbang & Rapi */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 w-full max-w-4xl lg:max-w-5xl mx-auto px-3 sm:px-4 py-4">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div
              key={n}
              className="am-card w-full h-full flex flex-col"
              style={{
                borderRadius: 16,
                background: 'var(--am-surface)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid var(--am-border)',
                boxShadow: '0 3px 12px rgba(0,0,0,0.02)'
              }}
            >
              <div className="am-skeleton-shimmer relative w-full aspect-[4/3] max-h-44 sm:max-h-52 md:max-h-60" style={{ width: '100%', aspectRatio: '4/3' }} />
              <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="am-skeleton-shimmer" style={{ width: '48%', height: 11, borderRadius: 4 }} />
                  <div className="am-skeleton-shimmer" style={{ width: '28%', height: 11, borderRadius: 4 }} />
                </div>
                <div className="am-skeleton-shimmer" style={{ width: '85%', height: 14, borderRadius: 4 }} />
                <div className="am-skeleton-shimmer" style={{ width: '60%', height: 11, borderRadius: 4 }} />
                <div className="am-skeleton-shimmer" style={{ width: '40%', height: 16, borderRadius: 4, marginTop: 4 }} />
                <div className="am-skeleton-shimmer" style={{ width: '100%', height: 32, borderRadius: 10, marginTop: 4 }} />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--am-text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
          <h3 style={{ margin: '0 0 6px', color: 'var(--am-text)' }}>Belum Ada Produk</h3>
          <p style={{ margin: 0, fontSize: 13 }}>Tidak ada produk yang cocok dengan pencarian atau filter saat ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 w-full max-w-4xl lg:max-w-5xl mx-auto px-3 sm:px-4 py-4 pb-32">
          {products.map(p => (
            <ProductCardItem
              key={p.id}
              product={p}
              onSelect={() => setSelectedProduct(p)}
              onAddToCart={onAddToCart}
              isGuest={isGuest}
              onRequireLogin={onRequireLogin}
              onSuccessAddToCart={(prod, qty) => setSuccessPopup({ product: prod, qty })}
              currentUser={currentUser}
            />
          ))}
        </div>
      )}

      {/* Modal Detail Produk Multi-Foto (Maks 200KB) & Video Demo (Maks 5MB) */}
      <ProductDetailModal
        product={selectedProduct}
        theme={theme}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(prod, count) => {
          onAddToCart(prod, count);
          setSuccessPopup({ product: prod, qty: count });
        }}
        onDirectBuy={(prod, count) => {
          onAddToCart(prod, count);
          if (onNavigateCheckout) {
            onNavigateCheckout();
          }
        }}
        onChat={onChat}
        isGuest={isGuest}
        onRequireLogin={onRequireLogin}
        currentUser={currentUser}
      />

      {/* Success Popup Portal */}
      {successPopup && (
        <AddToCartSuccessModal
          productName={successPopup.product.name}
          qty={successPopup.qty}
          onClose={() => setSuccessPopup(null)}
          onGoToCart={onNavigateCheckout ? () => {
            setSuccessPopup(null);
            onNavigateCheckout();
          } : undefined}
        />
      )}
    </div>
  );
});

function AddToCartSuccessModal({
  productName,
  qty,
  onClose,
  onGoToCart
}: {
  productName: string;
  qty: number;
  onClose: () => void;
  onGoToCart?: () => void;
}) {
  useEffect(() => {
    const originalOverflow = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const modalJSX = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 99999,
        animation: 'fadeIn 0.15s ease-out'
      }}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-[90vw] max-w-sm sm:max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-6 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-150 border border-gray-100 dark:border-gray-800"
        style={{
          backgroundColor: 'var(--am-surface, #ffffff)',
          color: 'var(--am-text, #0f172a)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-4xl mb-3">🎉</span>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1" style={{ color: 'var(--am-text)' }}>
          Berhasil Ditambahkan!
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-6" style={{ color: 'var(--am-text-muted)' }}>
          <span className="font-semibold text-gray-800 dark:text-gray-200" style={{ color: 'var(--am-text)' }}>{qty}x {productName}</span> telah masuk ke keranjang belanja Anda.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            style={{
              borderColor: 'var(--am-border)',
              color: 'var(--am-text)',
              background: 'transparent'
            }}
          >
            Lanjut Belanja
          </button>
          {onGoToCart && (
            <button
              type="button"
              onClick={onGoToCart}
              className="flex-1 py-2.5 px-4 rounded-xl text-white text-xs sm:text-sm font-bold shadow-md transition flex items-center justify-center gap-1.5"
              style={{
                background: 'var(--am-primary, #5FA874)',
                boxShadow: '0 4px 12px rgba(95, 168, 116, 0.3)'
              }}
            >
              Lihat Keranjang 🛒
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalJSX, document.body)
    : modalJSX;
}

export default ProductList;
