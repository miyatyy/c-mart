import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Product, ThemeMode, SellerCoupon } from '../types';
import { formatRupiah } from '../data';
import { getVouchersApi } from '../lib/api';
import { DEFAULT_PRODUCT_IMAGE_FALLBACK } from './ProductList';
import { isUserProductOwner } from '../lib/productOwnership';

interface ProductDetailModalProps {
  product: Product | null;
  theme?: ThemeMode;
  onClose: () => void;
  onAddToCart: (product: Product, qty: number) => void;
  onDirectBuy?: (product: Product, qty: number) => void;
  onChat: (sellerId: string, sellerName: string, productName: string) => void;
  isGuest?: boolean;
  onRequireLogin?: () => void;
  currentUser?: any;
}

export default function ProductDetailModal({
  product,
  theme: _theme,
  onClose,
  onAddToCart,
  onDirectBuy,
  onChat,
  isGuest,
  onRequireLogin,
  currentUser
}: ProductDetailModalProps) {
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [activeMediaTab, setActiveMediaTab] = useState<'photos' | 'video'>('photos');
  const [qty, setQty] = useState(1);
  const [addedToast, setAddedToast] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [sellerVouchers, setSellerVouchers] = useState<SellerCoupon[]>([]);
  const [copiedVoucherCode, setCopiedVoucherCode] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedMediaIndex(0);
    setActiveMediaTab('photos');
    setQty(1);
    setAddedToast(false);
    setShowFullDesc(false);
    setCopiedVoucherCode(null);

    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }

    if (product) {
      getVouchersApi(product.sellerId, true)
        .then(res => {
          if (res && res.success && res.vouchers) {
            const valid = res.vouchers.filter(v => !v.sellerId || v.sellerId === product.sellerId);
            setSellerVouchers(valid);
          }
        })
        .catch(() => {});
    }
  }, [product?.id, product?.sellerId]);

  // 🔒 Kunci scroll halaman latar saat modal aktif
  useEffect(() => {
    if (!product) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [product]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!product) return null;

  // Gather product images
  let rawImages: string[] = [];
  if (product.images && product.images.length > 0) {
    rawImages = product.images;
  } else if (product.image) {
    rawImages = [product.image];
  } else {
    rawImages = ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=450&fit=crop&auto=format'];
  }

  if ((product.name || '').toLowerCase().includes('ganci rajut')) {
    rawImages = [
      '/products/ganci_rajut_1.jpg',
      '/products/ganci_rajut_2.jpg',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop'
    ];
  }

  const allImages = rawImages.map(img => {
    if (!img) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=450&fit=crop&auto=format';
    if (img.includes('ganci_rajut') && !img.startsWith('/products/')) {
      return '/products/ganci_rajut_1.jpg';
    }
    return img;
  });

  let activeVideoUrl = product.videoUrl;
  if (!activeVideoUrl || activeVideoUrl.includes('gtv-videos-bucket') || (product.name || '').toLowerCase().includes('ganci rajut')) {
    activeVideoUrl = '/products/ganci_demo.mp4';
  }

  const currentImage = allImages[selectedMediaIndex] || allImages[0];

  const handleNextPhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedMediaIndex(prev => (prev + 1) % allImages.length);
  };

  const handlePrevPhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedMediaIndex(prev => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const effectiveUser = currentUser || (() => {
    try {
      return JSON.parse(localStorage.getItem('am_user_session') || localStorage.getItem('am_current_user') || '{}');
    } catch {
      return null;
    }
  })();

  const isOwnProduct = isUserProductOwner(product, effectiveUser);

  const handleAdd = () => {
    if (isGuest) {
      onClose();
      if (onRequireLogin) onRequireLogin();
      return;
    }
    if (isOwnProduct) {
      alert('Penjual tidak dapat membeli produk dari tokonya sendiri.');
      return;
    }
    onAddToCart(product, qty);
    setAddedToast(true);
    setTimeout(() => {
      setAddedToast(false);
      onClose();
    }, 1100);
  };

  const handleBuyNow = () => {
    if (isGuest) {
      onClose();
      if (onRequireLogin) onRequireLogin();
      return;
    }
    if (isOwnProduct) {
      alert('Penjual tidak dapat membeli produk dari tokonya sendiri.');
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

  // Determine delivery display string
  const pickupMethodDisplay = product.isKoperasi
    ? 'Koperasi Kampus / COD Gedung'
    : (product.name?.toLowerCase().includes('ganci') || product.name?.toLowerCase().includes('blind bag') || product.name?.toLowerCase().includes('keychain'))
    ? 'Vending Machine Kampus / COD Gedung'
    : 'Koperasi Kampus / COD Gedung';

  const defaultMaterial = (product.name || '').toLowerCase().includes('almamater') || (product.name || '').toLowerCase().includes('jaket')
    ? 'Kain Drill Resmi & Bordir Komputer'
    : (product.name || '').toLowerCase().includes('ganci') || (product.name || '').toLowerCase().includes('keychain') || (product.name || '').toLowerCase().includes('blind bag')
    ? 'Kawat Bulu (Pipe Cleaner) & Benang Rajut Premium'
    : (product.category === 'makanan' || product.category === 'minuman')
    ? 'Bahan Makanan Segar & Higienis'
    : 'Bahan Pilihan Berkualitas';

  const availableStock = product.stock !== undefined ? product.stock : ((product as any).stok !== undefined ? (product as any).stok : 50);

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      {/* 📦 KARTU MODAL (Putih Bersih, Responsif Otomatis di HP, Tablet, Laptop) */}
      <div
        className="relative w-full sm:max-w-4xl max-h-[92vh] sm:max-h-[90vh] bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* 📱 Mobile Drag Handle Pill */}
        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* 🔝 HEADER MODAL: Tombol Tab Foto/Video & Tombol Close */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900 z-10">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveMediaTab('photos')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMediaTab === 'photos'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              📷 Foto Produk ({allImages.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveMediaTab('video')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMediaTab === 'video'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              📹 Video Demo <span className="text-[10px] text-gray-400">≤5MB</span>
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Modal Detail Produk"
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* 📜 BODY MODAL: 1 Kolom di HP (Scrollable), 2 Kolom di Tablet & Laptop */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* KOLOM KIRI: SLIDER FOTO / GAMBAR UTAMA ATAU VIDEO */}
          <div className="flex flex-col gap-3">
            {activeMediaTab === 'photos' ? (
              <>
                <div className="relative w-full aspect-square bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 flex items-center justify-center shadow-inner">
                  <img
                    src={currentImage || DEFAULT_PRODUCT_IMAGE_FALLBACK}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    onError={e => {
                      if (e.currentTarget.src !== DEFAULT_PRODUCT_IMAGE_FALLBACK) {
                        e.currentTarget.src = DEFAULT_PRODUCT_IMAGE_FALLBACK;
                      }
                    }}
                  />
                  {/* Badge Counter Foto */}
                  <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold rounded-lg z-2">
                    📷 {selectedMediaIndex + 1} / {allImages.length}
                  </div>

                  {/* Badge Koperasi */}
                  {product.isKoperasi && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-md z-2 flex items-center gap-1">
                      🏛️ Koperasi
                    </div>
                  )}

                  {/* Panah Navigasi Foto */}
                  {allImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={handlePrevPhoto}
                        aria-label="Foto Sebelumnya"
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors z-2 cursor-pointer text-lg font-bold"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={handleNextPhoto}
                        aria-label="Foto Selanjutnya"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors z-2 cursor-pointer text-lg font-bold"
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnail List */}
                {allImages.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {allImages.map((img, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setSelectedMediaIndex(idx)}
                        className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                          selectedMediaIndex === idx
                            ? 'border-emerald-500 scale-105 shadow-sm opacity-100'
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={img || DEFAULT_PRODUCT_IMAGE_FALLBACK}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Pemutar Video Demo */
              <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden border border-gray-700 flex items-center justify-center shadow-lg">
                <video
                  src={activeVideoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                >
                  Browser Anda tidak mendukung pemutar video.
                </video>
              </div>
            )}
          </div>

          {/* KOLOM KANAN: DETAIL PRODUK, HARGA, & VOUCHER */}
          <div className="flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    {product.category || 'AKSESORIS'}
                  </span>
                  {product.sellerName && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                      🏪 {product.sellerName}
                    </span>
                  )}
                </div>
                {availableStock > 0 ? (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                    📦 Stok {availableStock} pcs
                  </span>
                ) : (
                  <span className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                    ❌ Stok Habis
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-snug">
                {product.name}
              </h2>

              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                {formatRupiah(product.price)}
              </div>

              {/* Spesifikasi Produk */}
              <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3.5 space-y-2 text-xs border border-gray-100 dark:border-gray-700/60">
                <div className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Spesifikasi Produk
                </div>
                <div className="grid grid-cols-3 gap-1 text-gray-500 dark:text-gray-400">
                  <div>Bahan</div>
                  <div className="col-span-2 text-gray-800 dark:text-gray-200 font-medium">
                    : {product.material || defaultMaterial}
                  </div>
                  <div>Pengambilan</div>
                  <div className="col-span-2 text-gray-800 dark:text-gray-200 font-medium">
                    : {pickupMethodDisplay}
                  </div>
                  <div>Kondisi</div>
                  <div className="col-span-2 text-gray-800 dark:text-gray-200 font-medium">
                    : Baru (Resmi Mahasiswa)
                  </div>
                  <div>Kategori</div>
                  <div className="col-span-2 text-gray-800 dark:text-gray-200 font-medium capitalize">
                    : {product.category || '-'}
                  </div>
                </div>
              </div>

              {/* Voucher Toko */}
              {sellerVouchers.length > 0 ? (
                <div className="p-3 bg-red-50/70 dark:bg-red-950/30 rounded-xl border border-dashed border-red-200 dark:border-red-900 text-xs space-y-2">
                  <div className="font-bold text-red-600 dark:text-red-400 flex items-center justify-between">
                    <span className="flex items-center gap-1">🎟️ Voucher Toko Tersedia</span>
                    <span className="text-[10px] bg-red-100 dark:bg-red-900/60 px-1.5 py-0.5 rounded font-bold">
                      {sellerVouchers.length} Kupon Aktif
                    </span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {sellerVouchers.map(v => {
                      const isCopied = copiedVoucherCode === v.code;
                      const discountLabel =
                        v.discountType === 'percentage'
                          ? `Diskon ${v.discountValue}%`
                          : v.discountType === 'shipping'
                          ? `Gratis Ongkir ${formatRupiah(v.discountValue)}`
                          : `Potongan ${formatRupiah(v.discountValue)}`;
                      return (
                        <div
                          key={v.id}
                          onClick={() => {
                            navigator.clipboard.writeText(v.code);
                            setCopiedVoucherCode(v.code);
                            setTimeout(() => setCopiedVoucherCode(null), 2000);
                          }}
                          className="flex items-center gap-1.5 shrink-0 bg-white dark:bg-gray-800 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800 cursor-pointer shadow-xs hover:border-red-400 transition-colors"
                          title="Klik untuk salin kode voucher"
                        >
                          <span className="font-mono font-bold text-red-600 dark:text-red-400">{v.code}</span>
                          <span className="text-[10px] bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-300 px-1.5 py-0.5 rounded font-semibold">
                            {discountLabel}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold text-white ${isCopied ? 'bg-emerald-600' : 'bg-red-600'}`}>
                            {isCopied ? '✓' : 'Salin'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-red-50/70 dark:bg-red-950/30 rounded-xl border border-dashed border-red-200 dark:border-red-900 text-xs">
                  <div className="font-bold text-red-600 dark:text-red-400 mb-1 flex items-center gap-1">
                    🎟️ Voucher Toko Tersedia
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 text-[11px]">
                    Gunakan kode diskon saat checkout untuk potongan harga hemat kampus.
                  </div>
                </div>
              )}

              {/* Deskripsi Produk */}
              <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 text-xs border border-gray-100 dark:border-gray-700/60 space-y-1">
                <div className="font-bold text-gray-700 dark:text-gray-300">Deskripsi Produk:</div>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                  {showFullDesc || (product.description && product.description.length <= 130)
                    ? (product.description || 'Produk pilihan berkualitas tinggi siap dipesan di Campus Mart.')
                    : `${(product.description || 'Produk pilihan berkualitas tinggi siap dipesan di Campus Mart.').slice(0, 130)}...`}
                </p>
                {product.description && product.description.length > 130 && (
                  <button
                    type="button"
                    onClick={() => setShowFullDesc(!showFullDesc)}
                    className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer pt-0.5"
                  >
                    {showFullDesc ? 'Tampilkan Lebih Sedikit ▲' : 'Selengkapnya ▼'}
                  </button>
                )}
              </div>

              {/* Banner Peringatan Produk Milik Sendiri */}
              {isOwnProduct && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold text-center">
                  ℹ️ Ini adalah produk dari etalase toko Anda sendiri.
                </div>
              )}

              {/* Toast Notifikasi Keranjang */}
              {addedToast && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-500 text-emerald-700 dark:text-emerald-300 text-xs font-bold text-center animate-fade-in">
                  ✅ {qty}x {product.name} berhasil dimasukkan ke keranjang!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 🚀 FOOTER MODAL: Tombol Aksi Bawah (Sticky & Jelas) */}
        <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 sm:gap-4 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {!isOwnProduct && (
            <div className="flex items-center border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 px-2 py-1 shrink-0">
              <button
                type="button"
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="px-2 font-bold text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white cursor-pointer select-none text-base"
              >
                -
              </button>
              <span className="px-2 text-sm font-semibold text-gray-900 dark:text-white min-w-[20px] text-center">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty(q => Math.min(availableStock, q + 1))}
                className="px-2 font-bold text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white cursor-pointer select-none text-base"
              >
                +
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleChatSeller}
            className="px-3 sm:px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 font-semibold text-xs sm:text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
          >
            💬 Tanya
          </button>

          {isOwnProduct ? (
            <button
              disabled
              className="flex-1 py-2.5 px-3 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-500 font-bold text-xs sm:text-sm cursor-not-allowed text-center"
            >
              🛍️ Produk Toko Anda Sendiri
            </button>
          ) : (
            <>
              {/* Tambah ke Keranjang */}
              <button
                type="button"
                onClick={handleAdd}
                disabled={availableStock <= 0}
                className="flex-1 py-2.5 px-3 rounded-xl border-2 border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold text-xs sm:text-sm hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Keranjang
              </button>

              {/* Beli Sekarang */}
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={availableStock <= 0}
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ⚡ Beli Sekarang
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
