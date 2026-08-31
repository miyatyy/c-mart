import { useState, useEffect, useRef } from 'react';
import type { Product, ThemeMode } from '../types';

interface PromoSlide {
  id: string;
  title: string;
  badge: string;
  badgeColor: string;
  subtitle: string;
  description: string;
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
    title: 'BLIND BAG KEYCHAIN MYSTERY',
    badge: '🔥 DISKON SPESIAL: RP 40.000 ➔ RP 35.000',
    badgeColor: 'linear-gradient(135deg, #FF4D6D 0%, #FF758F 100%)',
    subtitle: 'Myammiy Craft Exclusive Handmade',
    description: 'Suvenir gantungan kunci rajut kejutan (Sakura, Strawberry Tulip, K-Pop Charm). Ambil instan di Smart Vending Machine kampus!',
    image: '/banners/banner_blindbag.jpg',
    ctaText: '🎁 Beli Blind Bag Promo (Rp 35.000)',
    ctaAction: 'blind_bag'
  },
  {
    id: 'slide_custom_ganci',
    title: 'CUSTOM GANCI & AKSESORIS RAMBUT',
    badge: '🌸 HANDMADE CRAFT CANTIK',
    badgeColor: 'linear-gradient(135deg, #7209B7 0%, #B5179E 100%)',
    subtitle: 'Koleksi Estetik Myammiy Craft',
    description: 'Aksesoris rambut, bando, dan gantungan kunci rajut personalisasi mulai Rp 15.000. Hadiah manis untuk mahasiswi UIN Antasari!',
    image: '/banners/banner_ganci.jpg',
    ctaText: '🎀 Lihat Koleksi Aksesoris',
    ctaAction: 'category_aksesoris'
  },
  {
    id: 'slide_vending',
    title: 'SMART CAMPUS VENDING MACHINE',
    badge: '🤖 LAYANAN MANDIRI 24 JAM',
    badgeColor: 'linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)',
    subtitle: 'Inovasi IoT Kampus UIN Antasari',
    description: 'Belanja ganci & snack cepat tanpa antre! Scan QR Token via SeaBank / GoPay langsung keluar otomatis via motor penggerak ESP32.',
    image: '/banners/banner_vending.jpg',
    ctaText: '🤖 Coba Vending Machine',
    ctaAction: 'vending'
  },
  {
    id: 'slide_koperasi',
    title: 'KOPERASI MAHASISWA UIN ANTASARI',
    badge: '🎓 KEBUTUHAN AKADEMIK RESMI',
    badgeColor: 'linear-gradient(135deg, #166534 0%, #15803D 100%)',
    subtitle: 'Almamater, Buku Teks & Merchandise',
    description: 'Dapatkan jas almamater resmi UIN Antasari, buku kuliah hukum ekonomi syariah, dan paket ATK lengkap bergaransi resmi.',
    image: '/banners/banner_koperasi.jpg',
    ctaText: '🏛️ Buka Lapak Koperasi',
    ctaAction: 'filter_koperasi'
  },
  {
    id: 'slide_delivery',
    title: 'ANTASARI FOOD & SNACK EXPRESS',
    badge: '🛵 CEPAT • FRESH • RAMAH',
    badgeColor: 'linear-gradient(135deg, #EA580C 0%, #F97316 100%)',
    subtitle: 'Delivery Antar Gedung Kampus 1 & 2',
    description: 'Lapar saat jeda kuliah? Pesan nasi kuning, kue banjar, roti, dan minuman dingin langsung diantar ke depan ruang kelasmu!',
    image: '/banners/banner_delivery.jpg',
    ctaText: '🍱 Pesan Kuliner & Snack',
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

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
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

  const active = PROMO_SLIDES[currentSlide];

  return (
    <div
      style={{ marginBottom: 24, position: 'relative' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Container Carousel */}
      <div
        className="am-card"
        style={{
          position: 'relative',
          borderRadius: 24,
          overflow: 'hidden',
          aspectRatio: '16 / 8.5',
          minHeight: 220,
          maxHeight: 420,
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12)',
          background: '#1E293B',
          transition: 'all 0.4s ease'
        }}
      >
        {/* Background Image Banner */}
        <img
          src={active.image}
          alt={active.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            filter: 'brightness(0.92)',
            transition: 'opacity 0.5s ease-in-out',
            display: 'block'
          }}
        />

        {/* Gradient Overlay for Text Readability */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.4) 55%, rgba(15, 23, 42, 0.1) 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '24px 32px',
            color: 'white',
            maxWidth: '65%'
          }}
        >
          {/* Badge Promo */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '6px 14px',
              borderRadius: 30,
              background: active.badgeColor,
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              marginBottom: 10,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              width: 'fit-content'
            }}
          >
            {active.badge}
          </div>

          {/* Title */}
          <h2
            style={{
              margin: '0 0 6px',
              fontSize: 'clamp(18px, 3vw, 26px)',
              fontWeight: 900,
              lineHeight: 1.2,
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              color: '#FFFFFF'
            }}
          >
            {active.title}
          </h2>

          {/* Subtitle / Description */}
          <p
            style={{
              margin: '0 0 16px',
              fontSize: 'clamp(11px, 1.6vw, 13px)',
              opacity: 0.95,
              lineHeight: 1.4,
              textShadow: '0 1px 4px rgba(0,0,0,0.4)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {active.description}
          </p>

          {/* CTA Action Button */}
          <div>
            <button
              onClick={() => handleAction(active)}
              style={{
                padding: '10px 22px',
                borderRadius: 14,
                border: 'none',
                background: 'linear-gradient(135deg, #00B4D8 0%, #0077B6 100%)',
                color: 'white',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0, 180, 216, 0.4)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {active.ctaText}
            </button>
          </div>
        </div>

        {/* Slide Navigation Arrows */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          aria-label="Previous Slide"
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(8px)',
            color: '#1E293B',
            fontSize: 18,
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 10
          }}
        >
          ‹
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          aria-label="Next Slide"
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(8px)',
            color: '#1E293B',
            fontSize: 18,
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 10
          }}
        >
          ›
        </button>
      </div>

      {/* Dot Indicators */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 8,
          marginTop: 12
        }}
      >
        {PROMO_SLIDES.map((slide, idx) => (
          <button
            key={slide.id}
            onClick={() => setCurrentSlide(idx)}
            aria-label={`Slide ${idx + 1}`}
            style={{
              width: currentSlide === idx ? 28 : 8,
              height: 8,
              borderRadius: 10,
              border: 'none',
              background: currentSlide === idx ? 'var(--am-primary, #0077B6)' : '#CBD5E1',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              padding: 0
            }}
          />
        ))}
      </div>
    </div>
  );
}
