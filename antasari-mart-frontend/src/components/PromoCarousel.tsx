import { useState, useEffect, useRef } from 'react';
import type { Product, ThemeMode } from '../types';

interface PromoSlide {
  id: string;
  title: string;
  badge: string;
  badgeColor: string;
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
    title: 'Blind Bag Keychain Mystery Promo',
    badge: '🔥 DISKON 40K ➔ 35K',
    badgeColor: '#FF3366',
    image: '/banners/banner_blindbag.jpg',
    ctaText: '🎁 Beli Promo Rp 35.000',
    ctaAction: 'blind_bag'
  },
  {
    id: 'slide_custom_ganci',
    title: 'Custom Ganci & Aksesoris Rambut',
    badge: '🌸 HANDMADE CRAFT',
    badgeColor: '#8B5CF6',
    image: '/banners/banner_ganci.jpg',
    ctaText: '🎀 Lihat Koleksi',
    ctaAction: 'category_aksesoris'
  },
  {
    id: 'slide_vending',
    title: 'Smart Vending Machine Kampus',
    badge: '🤖 BUKA 24 JAM',
    badgeColor: '#0284C7',
    image: '/banners/banner_vending.jpg',
    ctaText: '🤖 Coba Vending',
    ctaAction: 'vending'
  },
  {
    id: 'slide_koperasi',
    title: 'Koperasi Mahasiswa UIN Antasari',
    badge: '🎓 MERCHANDISE RESMI',
    badgeColor: '#16A34A',
    image: '/banners/banner_koperasi.jpg',
    ctaText: '🏛️ Buka Lapak Koperasi',
    ctaAction: 'filter_koperasi'
  },
  {
    id: 'slide_delivery',
    title: 'Antasari Food & Snack Express',
    badge: '🛵 DELIVERY KAMPUS',
    badgeColor: '#EA580C',
    image: '/banners/banner_delivery.jpg',
    ctaText: '🍱 Pesan Kuliner',
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

  const active = PROMO_SLIDES[currentSlide] || PROMO_SLIDES[0];
  if (!active) return null;

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
      {/* 📱💻 Frame Brosur Ramping & Elegan (Compact E-commerce Hero Slider) */}
      <div
        className="am-card"
        onClick={() => handleAction(active)}
        style={{
          position: 'relative',
          width: '100%',
          height: 'clamp(140px, 20vw, 210px)',
          maxHeight: 210,
          borderRadius: 16,
          overflow: 'hidden',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
          backgroundColor: '#0F172A',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}
      >
        {/* Gambar Brosur Proporsional Ramping */}
        <img
          src={active.image}
          alt={active.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
            transition: 'opacity 0.3s ease-in-out'
          }}
        />

        {/* Floating Pill CTA Aksi di Pojok Bawah */}
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            right: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            zIndex: 5
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAction(active);
            }}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: 'none',
              background: 'rgba(0, 119, 182, 0.9)',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              backdropFilter: 'blur(6px)',
              transition: 'transform 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.04)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <span>{active.ctaText}</span>
            <span style={{ fontSize: '1em' }}>➔</span>
          </button>
        </div>

        {/* Tombol Panah Kiri (Kompak & Elegan) */}
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
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(4px)',
            color: '#0F172A',
            fontSize: 18,
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            zIndex: 10
          }}
        >
          ‹
        </button>

        {/* Tombol Panah Kanan (Kompak & Elegan) */}
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
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(4px)',
            color: '#0F172A',
            fontSize: 18,
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
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
              width: currentSlide === idx ? 20 : 6,
              height: 6,
              borderRadius: 6,
              border: 'none',
              background: currentSlide === idx ? 'var(--am-primary, #0077B6)' : '#CBD5E1',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              padding: 0
            }}
          />
        ))}
      </div>
    </div>
  );
}
