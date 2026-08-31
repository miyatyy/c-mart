import { useState, useEffect, useRef } from 'react';
import type { Product, ThemeMode } from '../types';

interface PromoSlide {
  id: string;
  badge: string;
  badgeBg: string;
  title: string;
  priceHighlight?: {
    original?: string;
    promo: string;
  };
  subtitle: string;
  bgGradient: string;
  image: string;
  ctaText: string;
  ctaAction: 'blind_bag' | 'category_aksesoris' | 'vending' | 'filter_koperasi' | 'category_makanan';
}

interface PromoCarouselProps {
  theme?: ThemeMode;
  onAddToCart?: (product: Product, qty?: number) => void;
  onFilterCategory?: (category: string) => void;
  onFilterType?: (type: 'all' | 'koperasi' | 'mahasiswa') => void;
  onOpenVending?: () => void;
}

const PROMO_SLIDES: PromoSlide[] = [
  {
    id: 'slide_blind_bag',
    badge: '🔥 PROMO SPESIAL MYAMMIY CRAFT',
    badgeBg: 'rgba(255, 255, 255, 0.25)',
    title: 'Blind Bag Keychain Mystery',
    priceHighlight: {
      original: 'Rp 40.000',
      promo: 'Rp 35.000'
    },
    subtitle: 'Ganci rajut suvenir kejutan handmade eksklusif. Siap ambil instan di Vending Machine!',
    bgGradient: 'linear-gradient(135deg, #FF4D6D 0%, #C9184A 50%, #800F2F 100%)',
    image: '/banners/banner_blindbag.jpg',
    ctaText: '🎁 Beli Promo Rp 35.000',
    ctaAction: 'blind_bag'
  },
  {
    id: 'slide_custom_ganci',
    badge: '🌸 HANDMADE CRAFT CANTIK',
    badgeBg: 'rgba(255, 255, 255, 0.25)',
    title: 'Custom Ganci & Aksesoris Rambut',
    priceHighlight: {
      promo: 'Mulai Rp 15.000'
    },
    subtitle: 'Gantungan kunci rajut kustom & bando estetik karya mahasiswi UIN Antasari.',
    bgGradient: 'linear-gradient(135deg, #7B2CBF 0%, #5A189A 50%, #3C096C 100%)',
    image: '/banners/banner_ganci.jpg',
    ctaText: '🎀 Lihat Katalog Aksesoris',
    ctaAction: 'category_aksesoris'
  },
  {
    id: 'slide_vending',
    badge: '🤖 INOVASI KAMPUS 24 JAM',
    badgeBg: 'rgba(255, 255, 255, 0.25)',
    title: 'Smart Vending Machine Kampus',
    priceHighlight: {
      promo: 'Scan QR • Langsung Keluar!'
    },
    subtitle: 'Belanja mandiri cepat tanpa antre! Support transfer SeaBank & GoPay a.n. Nurmiyaty.',
    bgGradient: 'linear-gradient(135deg, #0077B6 0%, #023E8A 50%, #03045E 100%)',
    image: '/banners/banner_vending.jpg',
    ctaText: '🤖 Coba Vending Machine',
    ctaAction: 'vending'
  },
  {
    id: 'slide_koperasi',
    badge: '🎓 KOPERASI MAHASISWA RESMI',
    badgeBg: 'rgba(255, 255, 255, 0.25)',
    title: 'Jas Almamater & Buku Kuliah',
    priceHighlight: {
      promo: 'Lengkap & Bergaransi'
    },
    subtitle: 'Dapatkan almamater resmi UIN Antasari, buku teks syariah, & perlengkapan akademik.',
    bgGradient: 'linear-gradient(135deg, #15803D 0%, #166534 50%, #14532D 100%)',
    image: '/banners/banner_koperasi.jpg',
    ctaText: '🏛️ Buka Lapak Koperasi',
    ctaAction: 'filter_koperasi'
  },
  {
    id: 'slide_delivery',
    badge: '🛵 CEPAT • FRESH • RAMAH',
    badgeBg: 'rgba(255, 255, 255, 0.25)',
    title: 'Antasari Food & Snack Express',
    priceHighlight: {
      promo: 'Antar Sampai Kelas!'
    },
    subtitle: 'Pesan makan siang, kue banjar, & minuman segar antar gedung kampus 1 & 2.',
    bgGradient: 'linear-gradient(135deg, #EA580C 0%, #C2410C 50%, #9A3412 100%)',
    image: '/banners/banner_delivery.jpg',
    ctaText: '🍱 Pesan Kuliner Kampus',
    ctaAction: 'category_makanan'
  }
];

export default function PromoCarousel({
  theme: _theme,
  onAddToCart,
  onFilterCategory,
  onFilterType,
  onOpenVending
}: PromoCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Auto-Slide Interval (4.5 detik)
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % PROMO_SLIDES.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [isPaused]);

  const handlePrev = () => {
    setCurrentSlide(prev => (prev === 0 ? PROMO_SLIDES.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentSlide(prev => (prev + 1) % PROMO_SLIDES.length);
  };

  const handleTouchStart = (e: any) => {
    if (e && e.touches && e.touches[0]) {
      touchStartX.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = (e: any) => {
    if (e && e.changedTouches && e.changedTouches[0]) {
      touchEndX.current = e.changedTouches[0].clientX;
      const diff = touchStartX.current - touchEndX.current;
      if (Math.abs(diff) > 30) {
        if (diff > 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
    }
  };

  const handleAction = (slide: PromoSlide) => {
    if (slide.ctaAction === 'blind_bag') {
      const blindBagProduct: Product = {
        id: 'blind_bag_myammiy_35k',
        name: 'Blind Bag Keychain Mystery (Myammiy Craft)',
        description: 'Blind bag suvenir kejutan buatan tangan (handmade) eksklusif Myammiy Craft. Berisi mystery ganci rajut sakura, strawberry tulip, atau charm kpop! Siap ambil di Vending Machine Kampus.',
        price: 35000,
        stock: 50,
        category: 'kerajinan',
        campus: 'banjarmasin',
        sellerId: 'seller_1',
        sellerName: 'Myammiy Craft',
        image: '/banners/banner_blindbag.jpg',
        isKoperasi: false,
        slotNumber: 1,
        rating: 5.0,
        sold: 28
      };
      if (onAddToCart) onAddToCart(blindBagProduct, 1);
    } else if (slide.ctaAction === 'category_aksesoris') {
      if (onFilterCategory) onFilterCategory('kerajinan');
    } else if (slide.ctaAction === 'vending') {
      if (onOpenVending) onOpenVending();
    } else if (slide.ctaAction === 'filter_koperasi') {
      if (onFilterType) onFilterType('koperasi');
    } else if (slide.ctaAction === 'category_makanan') {
      if (onFilterCategory) onFilterCategory('makanan');
    }
  };

  return (
    <div
      style={{
        marginBottom: 20,
        position: 'relative',
        userSelect: 'none',
        width: '100%'
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 📱💻 Frame Banner Full-Width Responsif (Tanpa Ruang Kosong / Blur) */}
      <div
        className="am-card"
        style={{
          position: 'relative',
          width: '100%',
          height: 'clamp(160px, 22vw, 210px)',
          maxHeight: 210,
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.08)',
          backgroundColor: '#0F172A'
        }}
      >
        {/* 🚀 Silky Smooth Horizontal Sliding Track */}
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            transform: `translateX(-${currentSlide * 100}%)`,
            transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)'
          }}
        >
          {PROMO_SLIDES.map((slide) => (
            <div
              key={slide.id}
              onClick={() => handleAction(slide)}
              style={{
                minWidth: '100%',
                width: '100%',
                height: '100%',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'clamp(12px, 2.5vw, 20px) clamp(16px, 3.5vw, 32px)',
                background: slide.bgGradient,
                cursor: 'pointer',
                overflow: 'hidden',
                color: '#FFFFFF',
                boxSizing: 'border-box'
              }}
            >
              {/* SISI KIRI: Teks Promo Tajam, Jelas & Mudah Dibaca */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  zIndex: 3,
                  maxWidth: '62%',
                  paddingRight: 10
                }}
              >
                {/* Badge Tag */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: slide.badgeBg,
                    backdropFilter: 'blur(6px)',
                    fontSize: 'clamp(9px, 1.2vw, 11px)',
                    fontWeight: 900,
                    letterSpacing: 0.5,
                    marginBottom: 6,
                    width: 'fit-content'
                  }}
                >
                  {slide.badge}
                </div>

                {/* Judul Utama */}
                <h2
                  style={{
                    margin: '0 0 4px',
                    fontSize: 'clamp(15px, 2.3vw, 22px)',
                    fontWeight: 900,
                    lineHeight: 1.15,
                    color: '#FFFFFF',
                    textShadow: '0 2px 4px rgba(0,0,0,0.25)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {slide.title}
                </h2>

                {/* Highlight Harga / Diskon */}
                {slide.priceHighlight && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    {slide.priceHighlight.original && (
                      <span
                        style={{
                          fontSize: 'clamp(11px, 1.5vw, 14px)',
                          textDecoration: 'line-through',
                          opacity: 0.8,
                          fontWeight: 600
                        }}
                      >
                        {slide.priceHighlight.original}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 'clamp(13px, 1.8vw, 18px)',
                        fontWeight: 900,
                        color: '#FFE600',
                        textShadow: '0 1px 4px rgba(0,0,0,0.4)'
                      }}
                    >
                      {slide.priceHighlight.promo}
                    </span>
                  </div>
                )}

                {/* Subtitle Deskripsi */}
                <p
                  style={{
                    margin: '0 0 10px',
                    fontSize: 'clamp(10px, 1.3vw, 12px)',
                    opacity: 0.92,
                    lineHeight: 1.3,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {slide.subtitle}
                </p>

                {/* Tombol CTA */}
                <div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction(slide);
                    }}
                    style={{
                      padding: 'clamp(6px, 1.2vw, 8px) clamp(12px, 2vw, 18px)',
                      borderRadius: 14,
                      border: 'none',
                      background: '#FFFFFF',
                      color: '#0F172A',
                      fontSize: 'clamp(10px, 1.3vw, 12px)',
                      fontWeight: 900,
                      cursor: 'pointer',
                      boxShadow: '0 3px 12px rgba(0,0,0,0.2)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <span>{slide.ctaText}</span>
                    <span style={{ color: '#FF3366', fontWeight: 900 }}>➔</span>
                  </button>
                </div>
              </div>

              {/* SISI KANAN: Visual Produk High-Res Pas & Menonjol */}
              <div
                style={{
                  width: '38%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  position: 'relative'
                }}
              >
                <img
                  src={slide.image}
                  alt={slide.title}
                  style={{
                    maxHeight: '100%',
                    maxWidth: '100%',
                    objectFit: 'cover',
                    borderRadius: 14,
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                    border: '2px solid rgba(255, 255, 255, 0.4)',
                    display: 'block'
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Tombol Panah Kiri */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          aria-label="Slide Sebelumnya"
          style={{
            position: 'absolute',
            left: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 30,
            height: 30,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(4px)',
            color: '#0F172A',
            fontSize: 18,
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
            zIndex: 10
          }}
        >
          ‹
        </button>

        {/* Tombol Panah Kanan */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          aria-label="Slide Berikutnya"
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 30,
            height: 30,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(4px)',
            color: '#0F172A',
            fontSize: 18,
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
            zIndex: 10
          }}
        >
          ›
        </button>
      </div>

      {/* Titik Navigasi Slide (Dots Indicators) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
          marginTop: 8
        }}
      >
        {PROMO_SLIDES.map((slide, idx) => (
          <button
            key={slide.id}
            onClick={() => setCurrentSlide(idx)}
            aria-label={`Slide ${idx + 1}`}
            style={{
              width: currentSlide === idx ? 22 : 6,
              height: 6,
              borderRadius: 6,
              border: 'none',
              background: currentSlide === idx ? 'var(--am-primary, #0077B6)' : '#CBD5E1',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
              padding: 0
            }}
          />
        ))}
      </div>
    </div>
  );
}
