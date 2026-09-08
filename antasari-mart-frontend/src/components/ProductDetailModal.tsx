import { useState, useEffect } from 'react';
import type { Product, ThemeMode } from '../types';
import { formatRupiah } from '../data';

interface ProductDetailModalProps {
  product: Product | null;
  theme?: ThemeMode;
  onClose: () => void;
  onAddToCart: (product: Product, qty: number) => void;
  onDirectBuy?: (product: Product, qty: number) => void;
  onChat: (sellerId: string, sellerName: string, productName: string) => void;
  isGuest?: boolean;
  onRequireLogin?: () => void;
}

export default function ProductDetailModal({
  product,
  theme: _theme,
  onClose,
  onAddToCart,
  onDirectBuy,
  onChat,
  isGuest,
  onRequireLogin
}: ProductDetailModalProps) {
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [activeMediaTab, setActiveMediaTab] = useState<'photos' | 'video'>('photos');
  const [qty, setQty] = useState(1);
  const [addedToast, setAddedToast] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    setSelectedMediaIndex(0);
    setActiveMediaTab('photos');
    setQty(1);
    setAddedToast(false);
    setShowInfo(false);
  }, [product?.id]);

  if (!product) return null;

  // Kumpulkan seluruh foto produk
  let rawImages: string[] = [];
  if (product.images && product.images.length > 0) {
    rawImages = product.images;
  } else if (product.image) {
    rawImages = [product.image];
  } else {
    rawImages = ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&auto=format'];
  }

  // Jika nama produk mengandung "ganci rajut", sertakan galeri foto rajut lengkap
  if ((product.name || '').toLowerCase().includes('ganci rajut')) {
    rawImages = [
      '/products/ganci_rajut_1.jpg',
      '/products/ganci_rajut_2.jpg',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop'
    ];
  }

  const allImages = rawImages.map(img => {
    if (!img) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&auto=format';
    if (img.includes('ganci_rajut') && !img.startsWith('/products/')) {
      return '/products/ganci_rajut_1.jpg';
    }
    return img;
  });

  const hasVideo = true; // Setiap produk didukung video demo
  let activeVideoUrl = product.videoUrl;
  if (!activeVideoUrl || activeVideoUrl.includes('gtv-videos-bucket') || (product.name || '').toLowerCase().includes('ganci rajut')) {
    activeVideoUrl = '/products/ganci_demo.mp4';
  }

  const currentImage = allImages[selectedMediaIndex] || allImages[0];

  const handleNextPhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedMediaIndex((prev) => (prev + 1) % allImages.length);
  };

  const handlePrevPhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedMediaIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleAdd = () => {
    if (isGuest) {
      onClose();
      if (onRequireLogin) onRequireLogin();
      return;
    }
    onAddToCart(product, qty);
    setAddedToast(true);
    setTimeout(() => {
      setAddedToast(false);
      onClose();
    }, 1200);
  };

  const handleBuyNow = () => {
    if (isGuest) {
      onClose();
      if (onRequireLogin) onRequireLogin();
      return;
    }
    if (onDirectBuy) {
      onDirectBuy(product, qty);
    } else {
      onAddToCart(product, qty);
    }
    onClose();
  };

  const handleChatSeller = () => {
    if (isGuest) {
      onClose();
      if (onRequireLogin) onRequireLogin();
      return;
    }
    onChat(product.sellerId, product.sellerName, product.name);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 6, 23, 0.88)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        zIndex: 100000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 16px 20px',
        animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        overflowY: 'auto'
      }}
      onClick={onClose}
    >
      {/* 🔝 TOP HEADER BAR: Tab Switcher & Tombol Tutup */}
      <div
        style={{
          width: '100%',
          maxWidth: 900,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
          padding: '4px 0'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Switcher Foto vs Video Demo */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            background: 'rgba(255, 255, 255, 0.12)',
            padding: '5px 8px',
            borderRadius: 30,
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
          }}
        >
          <button
            onClick={() => setActiveMediaTab('photos')}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: 'none',
              fontSize: 12.5,
              fontWeight: 800,
              cursor: 'pointer',
              background: activeMediaTab === 'photos' ? '#10B981' : 'transparent',
              color: 'white',
              boxShadow: activeMediaTab === 'photos' ? '0 4px 14px rgba(16, 185, 129, 0.45)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>📸 Foto Produk</span>
            <span style={{ fontSize: 10.5, opacity: 0.9 }}>({allImages.length})</span>
          </button>

          <button
            onClick={() => setActiveMediaTab('video')}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: 'none',
              fontSize: 12.5,
              fontWeight: 800,
              cursor: 'pointer',
              background: activeMediaTab === 'video' ? '#F43F5E' : 'transparent',
              color: 'white',
              boxShadow: activeMediaTab === 'video' ? '0 4px 14px rgba(244, 63, 94, 0.45)' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>🎥 Video Demo</span>
            <span style={{ fontSize: 9.5, background: 'rgba(255,255,255,0.25)', padding: '1px 6px', borderRadius: 6 }}>≤ 5MB</span>
          </button>
        </div>

        {/* Tombol Tutup Bulat */}
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.14)',
            border: '1px solid rgba(255, 255, 255, 0.22)',
            borderRadius: '50%',
            width: 40,
            height: 40,
            color: 'white',
            fontSize: 18,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.8)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Tutup (ESC / Klik di luar)"
        >
          ✕
        </button>
      </div>

      {/* 🖼️ TAMPILAN UTAMA PRODUK: SCREENSHOWCASE BERSIH */}
      <div
        style={{
          width: '100%',
          maxWidth: 900,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          margin: '12px 0'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {activeMediaTab === 'photos' ? (
          /* 1. FOCUS FOTO PRODUK (LIGHTBOX) */
          <div
            style={{
              position: 'relative',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Foto Utama Besar */}
            <div
              style={{
                position: 'relative',
                maxHeight: '60vh',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 24,
                overflow: 'hidden',
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65)'
              }}
            >
              <img
                src={currentImage}
                alt={product.name}
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop';
                }}
                style={{
                  maxHeight: '58vh',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  transition: 'transform 0.3s ease, opacity 0.25s ease',
                  userSelect: 'none'
                }}
              />

              {/* Indikator Urutan Foto */}
              <div
                style={{
                  position: 'absolute',
                  top: 14,
                  left: 14,
                  background: 'rgba(0, 0, 0, 0.65)',
                  color: 'white',
                  fontSize: 11.5,
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: 14,
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)'
                }}
              >
                📸 {selectedMediaIndex + 1} / {allImages.length}
              </div>

              {/* Navigasi Panah Kiri */}
              {allImages.length > 1 && (
                <button
                  onClick={handlePrevPhoto}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    fontSize: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.85)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)'}
                  title="Foto Sebelumnya"
                >
                  ‹
                </button>
              )}

              {/* Navigasi Panah Kanan */}
              {allImages.length > 1 && (
                <button
                  onClick={handleNextPhoto}
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    fontSize: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.85)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)'}
                  title="Foto Berikutnya"
                >
                  ›
                </button>
              )}
            </div>

            {/* Strip Thumbnail Foto di Bawah */}
            {allImages.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  marginTop: 12,
                  padding: '6px 12px',
                  background: 'rgba(0, 0, 0, 0.45)',
                  borderRadius: 16,
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  overflowX: 'auto',
                  maxWidth: '100%'
                }}
              >
                {allImages.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedMediaIndex(idx)}
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 10,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: selectedMediaIndex === idx ? '2.5px solid #10B981' : '1.5px solid rgba(255, 255, 255, 0.2)',
                      transform: selectedMediaIndex === idx ? 'scale(1.08)' : 'scale(1)',
                      boxShadow: selectedMediaIndex === idx ? '0 0 12px rgba(16, 185, 129, 0.6)' : 'none',
                      flexShrink: 0,
                      transition: 'all 0.15s ease',
                      background: '#0F172A'
                    }}
                  >
                    <img
                      src={imgUrl}
                      alt={`Thumbnail ${idx + 1}`}
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop';
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* 2. FOCUS PEMUTAR VIDEO DEMO PRODUK (≤5MB) */
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxHeight: '62vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 24,
              overflow: 'hidden',
              background: '#000000',
              border: '1.5px solid rgba(244, 63, 94, 0.4)',
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.8)'
            }}
          >
            <video
              src={activeVideoUrl}
              controls
              autoPlay
              playsInline
              style={{
                width: '100%',
                maxHeight: '60vh',
                objectFit: 'contain'
              }}
            >
              Browser Anda tidak mendukung pemutar video HTML5.
            </video>
          </div>
        )}
      </div>

      {/* 🚀 FLOATING BOTTOM ACTION BAR: RINGKAS, ELEGAN & BEBAS DARI DESKRIPSI PANJANG */}
      <div
        style={{
          width: '100%',
          maxWidth: 680,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          borderRadius: 22,
          padding: '14px 18px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          zIndex: 10
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Baris 1: Judul, Toko & Harga */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 10.5, fontWeight: 900, textTransform: 'uppercase', background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', padding: '2px 7px', borderRadius: 6 }}>
                {product.category.toUpperCase()}
              </span>
              <span style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 700 }}>
                🏪 {product.sellerName}
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.2px' }}>
              {product.name}
            </h3>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#34D399' }}>
              {formatRupiah(product.price)}
            </div>
            <div style={{ fontSize: 11.5, color: product.stock > 0 ? '#4ADE80' : '#F87171', fontWeight: 800 }}>
              {product.stock > 0 ? `📦 Sisa Stok: ${product.stock} pcs` : '❌ Stok Habis'}
            </div>
          </div>
        </div>

        {/* Collapsible Info Deskripsi (Hanya muncul jika di-klik pengguna) */}
        {showInfo && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#E2E8F0',
              fontSize: 12.5,
              lineHeight: 1.5,
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            {product.description || 'Produk pilihan berkualitas siap dipesan di Antasari Mart.'}
          </div>
        )}

        {/* Toast Notifikasi Berhasil Ditambahkan */}
        {addedToast && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              background: 'rgba(16, 185, 129, 0.25)',
              border: '1px solid #10B981',
              color: '#6EE7B7',
              fontSize: 12,
              fontWeight: 800,
              textAlign: 'center',
              animation: 'fadeIn 0.15s ease-out'
            }}
          >
            ✅ {qty}x {product.name} berhasil dimasukkan ke keranjang!
          </div>
        )}

        {/* Baris 2: Pengatur Kuantitas & Tombol Aksi */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Stepper Jumlah */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 12,
              padding: '2px 4px'
            }}
          >
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 900,
                fontSize: 15
              }}
            >
              -
            </button>
            <span style={{ fontWeight: 900, fontSize: 14, color: 'white', minWidth: 24, textAlign: 'center' }}>
              {qty}
            </span>
            <button
              onClick={() => setQty((q) => Math.min(product.stock || 50, q + 1))}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 900,
                fontSize: 15
              }}
            >
              +
            </button>
          </div>

          {/* Tombol Info Deskripsi (Opsional/Toggle) */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            title="Lihat Deskripsi"
            style={{
              padding: '8px 12px',
              borderRadius: 12,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: showInfo ? 'rgba(59, 130, 246, 0.3)' : 'rgba(30, 41, 59, 0.6)',
              color: 'white',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {showInfo ? '✕ Tutup Info' : 'ℹ️ Info'}
          </button>

          {/* Tombol Chat Penjual */}
          <button
            onClick={handleChatSeller}
            title="Tanya Penjual"
            style={{
              padding: '8px 12px',
              borderRadius: 12,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(30, 41, 59, 0.6)',
              color: 'white',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            💬 Tanya
          </button>

          {/* Tombol Tambah ke Keranjang */}
          <button
            onClick={handleAdd}
            disabled={product.stock <= 0}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 12,
              border: '1.5px solid #10B981',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34D399',
              fontWeight: 800,
              fontSize: 12.5,
              cursor: product.stock <= 0 ? 'not-allowed' : 'pointer',
              opacity: product.stock <= 0 ? 0.5 : 1,
              transition: 'all 0.15s ease',
              minWidth: 100,
              textAlign: 'center'
            }}
          >
            ➕ Keranjang
          </button>

          {/* Tombol Beli Langsung */}
          <button
            onClick={handleBuyNow}
            disabled={product.stock <= 0}
            style={{
              flex: 1.2,
              padding: '10px 14px',
              borderRadius: 12,
              border: 'none',
              background: product.stock <= 0 ? '#64748B' : 'linear-gradient(135deg, #10B981, #059669)',
              color: 'white',
              fontWeight: 800,
              fontSize: 12.5,
              cursor: product.stock <= 0 ? 'not-allowed' : 'pointer',
              boxShadow: product.stock > 0 ? '0 4px 14px rgba(16, 185, 129, 0.4)' : 'none',
              transition: 'all 0.15s ease',
              minWidth: 110,
              textAlign: 'center'
            }}
          >
            ⚡ Beli Sekarang
          </button>
        </div>
      </div>
    </div>
  );
}
