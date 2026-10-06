import { useState } from 'react';
import type { Campus, ThemeMode, AppTab } from '../types';
import { formatRupiah } from '../data';

interface LandingPageProps {
  theme: ThemeMode;
  onToggleTheme?: () => void;
  campus: Campus;
  setCampus: (c: Campus) => void;
  onNavigateTab: (tab: AppTab) => void;
  onRequireLogin?: () => void;
  isGuest?: boolean;
  onOpenProModal?: () => void;
}

export default function LandingPage({
  theme,
  onToggleTheme,
  campus,
  setCampus,
  onNavigateTab,
  onRequireLogin,
  isGuest,
  onOpenProModal
}: LandingPageProps) {
  const isDark = theme === 'modern';
  const [activeRoleTab, setActiveRoleTab] = useState<'buyer' | 'seller' | 'driver' | 'koperasi'>('buyer');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const campusData = {
    banjarmasin: {
      name: 'Kampus 1 Banjarmasin',
      address: 'Jl. Jend. A. Yani Km. 4.5, Banjarmasin Timur',
      spots: ['Kantin Utama Kampus', 'Perpustakaan Pusat', 'Fakultas Tarbiyah & Keguruan', 'Fakultas Syariah', 'Auditorium Mastur Jahri'],
      vendingLocation: 'Lantai 1 Gedung Rektorat & Area Perpustakaan',
      tagline: 'Pusat Layanan Akademik & Aktivitas Mahasiswa Kampus Utama'
    },
    banjarbaru: {
      name: 'Kampus 2 Banjarbaru',
      address: 'Jl. Pandarahan, Guntung Manggis, Landasan Ulin, Banjarbaru',
      spots: ['Gedung Perkuliahan Terpadu', 'Fakultas Dakwah & Ilmu Komunikasi', 'Fakultas Ushuluddin & Humaniora', 'Ma\'had Al-Jami\'ah', 'Masjid Kampus 2'],
      vendingLocation: 'Lobi Gedung Perkuliahan Terpadu & Area Asrama Mahasiswa',
      tagline: 'Inovasi Smart Campus & Fasilitas Perkuliahan Modern Terpadu'
    }
  };

  const previewProducts = [
    {
      id: 'p1',
      title: 'Buket Bunga Wisuda Satin Premium',
      category: 'craft',
      price: 45000,
      seller: 'Myammiy Craft (Karya Mahasiswa)',
      rating: 4.9,
      sold: 142,
      badge: 'Terlaris 🌸',
      campus: 'banjarmasin',
      image: '/banners/banner_ganci.jpg'
    },
    {
      id: 'p2',
      title: 'Paket Snack & Kopi Kampus Fresh',
      category: 'kuliner',
      price: 15000,
      seller: 'Kantin Berkah Tarbiyah',
      rating: 4.8,
      sold: 380,
      badge: 'Favorit Kuliah ☕',
      campus: 'banjarmasin',
      image: '/banners/banner_koperasi.jpg'
    },
    {
      id: 'p3',
      title: 'Mystery Blind Bag Boneka Keychain',
      category: 'vending',
      price: 25000,
      seller: 'Smart Vending UIN Antasari',
      rating: 5.0,
      sold: 95,
      badge: 'IoT Vending 🤖',
      campus: 'banjarbaru',
      image: '/banners/banner_blindbag.jpg'
    },
    {
      id: 'p4',
      title: 'Tote Bag Kanvas Eksklusif UIN Antasari',
      category: 'merch',
      price: 35000,
      seller: 'Koperasi Mahasiswa UIN',
      rating: 4.9,
      sold: 210,
      badge: 'Official Merchandise 🎓',
      campus: 'banjarbaru',
      image: '/banners/banner_delivery.jpg'
    }
  ];

  const filteredPreview = selectedCategory === 'all'
    ? previewProducts
    : previewProducts.filter(p => p.category === selectedCategory);

  const testimonials = [
    {
      name: 'Nabila Az-Zahra',
      faculty: 'Pendidikan Bahasa Inggris, Smtr 6',
      campus: 'Kampus 1 Banjarmasin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      text: 'Sangat terbantu kalau lagi praktikum atau jeda kelas cuma 15 menit. Tinggal pesan lewat Campus Mart, kurir langsung antar ke depan lab. Nggak perlu lari ke kantin luar gerbang lagi!'
    },
    {
      name: 'Ahmad Raihan',
      faculty: 'Ekonomi Syariah, Smtr 4',
      campus: 'Kampus 2 Banjarbaru',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&auto=format&fit=crop&q=80',
      text: 'Buka lapak jualan buket wisuda di sini gratis 0% komisi! Semenjak promosi di katalog Campus Mart, pesanan wisudawan dari dua kampus langsung membludak. Transaksinya juga aman pakai QRIS.'
    },
    {
      name: 'Dimas Kurniawan',
      faculty: 'Hukum Ekonomi Islam, Smtr 8',
      campus: 'Kampus 1 Banjarmasin',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      text: 'Gabung jadi driver kurir kampus sangat fleksibel. Sambil nunggu jam bimbingan skripsi, bisa ambil 3-4 orderan antar gedung. Tambahan uang saku bulanan lumayan banget!'
    }
  ];

  const faqs = [
    {
      q: 'Apa itu Campus Mart (Antasari Mart)?',
      a: 'Campus Mart adalah situs web dan platform resmi marketplace kampus UIN Antasari. Platform ini mengintegrasikan seluruh aktivitas jual-beli mahasiswa, tenant kantin, unit koperasi kampus, kurir antar-gedung sesama mahasiswa, hingga smart IoT vending machine di Kampus 1 Banjarmasin dan Kampus 2 Banjarbaru.'
    },
    {
      q: 'Bagaimana cara mulai berbelanja di Campus Mart?',
      a: 'Anda dapat langsung menjelajahi katalog melalui website ini, memilih produk makanan, ATK, buket, atau souvenir, lalu melakukan checkout. Anda bisa memilih apakah pesanan ingin diambil sendiri (Pick-Up) di tenant atau diantarkan langsung oleh kurir kampus ke ruang kelas atau gedung fakultas Anda.'
    },
    {
      q: 'Apakah pengantaran kurir bisa langsung sampai ke ruang kelas atau fakultas?',
      a: 'Ya! Kurir kami adalah mahasiswa aktif yang hafal seluruh denah gedung di Kampus 1 Banjarmasin dan Kampus 2 Banjarbaru. Anda cukup menyertakan catatan nama fakultas, lantai, dan nomor ruang saat checkout.'
    },
    {
      q: 'Bagaimana cara mahasiswa atau tenant membuka toko?',
      a: 'Pendaftaran toko di Campus Mart 100% gratis tanpa potongan komisi! Mahasiswa cukup mendaftar akun, lalu memverifikasi identitas menggunakan KTM (Kartu Tanda Mahasiswa). Setelah diverifikasi, Anda langsung dapat mengunggah produk, mengelola stok, dan membuat kupon diskon.'
    },
    {
      q: 'Metode pembayaran apa saja yang didukung?',
      a: 'Situs resmi Campus Mart mendukung QRIS (bisa scan dari BCA, BRI, Mandiri, BSI, Gopay, OVO, ShopeePay, Dana), SeaBank, Campus Wallet, serta metode Bayar di Tempat (COD) saat barang diterima.'
    },
    {
      q: 'Apa itu Smart IoT Vending Machine?',
      a: 'Smart Vending Machine adalah mesin penjualan otomatis berbasis IoT yang diletakkan di titik strategis kampus. Memungkinkan mahasiswa membeli snack, minuman dingin, dan souvenir blind-bag secara mandiri tanpa antre dengan pembayaran QRIS instan.'
    }
  ];

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full min-h-screen text-left transition-colors duration-300 font-sans bg-[var(--am-bg)] text-[var(--am-text)]">
      
      {/* 🏛️ NAVBAR RESMI SITUS WEB CAMPUS MART */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[var(--am-surface)]/95 border-b border-[var(--am-border)] shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          
          {/* Logo & Institusi */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection('hero')}>
            <img
              src="/campus_mart_icon.png"
              alt="Campus Mart Logo"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl object-cover shadow-md shadow-[var(--am-primary)]/20 flex-shrink-0 border border-[var(--am-border)]"
            />
            <div>
              <div className="text-base sm:text-lg font-extrabold tracking-tight text-[var(--am-text)] leading-tight flex items-center gap-2">
                <span>Campus Mart</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--am-primary)]/15 text-[var(--am-primary)] hidden sm:inline-block">
                  Situs Resmi UIN Antasari
                </span>
              </div>
              <div className="text-[11px] text-[var(--am-text-muted)] font-medium leading-none mt-0.5">
                Portal E-Commerce & Layanan Sivitas Akademika
              </div>
            </div>
          </div>

          {/* Navigasi Menu Situs Resmi */}
          <nav className="hidden lg:flex items-center gap-6 text-xs sm:text-sm font-semibold text-[var(--am-text-muted)]">
            <button onClick={() => scrollToSection('tentang')} className="hover:text-[var(--am-primary)] transition-colors cursor-pointer">
              Tentang Kami
            </button>
            <button onClick={() => scrollToSection('fitur')} className="hover:text-[var(--am-primary)] transition-colors cursor-pointer">
              Fitur Ekosistem
            </button>
            <button onClick={() => scrollToSection('peran')} className="hover:text-[var(--am-primary)] transition-colors cursor-pointer">
              Pilihan Peran
            </button>
            <button onClick={() => scrollToSection('vending')} className="hover:text-[var(--am-primary)] transition-colors cursor-pointer">
              Smart Vending
            </button>
            <button onClick={() => scrollToSection('katalog')} className="hover:text-[var(--am-primary)] transition-colors cursor-pointer">
              Katalog Produk
            </button>
            <button onClick={() => scrollToSection('faq')} className="hover:text-[var(--am-primary)] transition-colors cursor-pointer">
              FAQ
            </button>
          </nav>

          {/* Tombol Aksi di Navbar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mode Gelap / Terang */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                title={isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Malam'}
                className="w-9 h-9 rounded-xl border border-[var(--am-border)] bg-[var(--am-bg2)] flex items-center justify-center text-sm cursor-pointer hover:border-[var(--am-primary)] transition-colors"
              >
                {isDark ? '☀️' : '🌙'}
              </button>
            )}

            {/* Masuk Akun */}
            {isGuest ? (
              <button
                onClick={() => {
                  if (onRequireLogin) onRequireLogin();
                  else onNavigateTab('login_page');
                }}
                className="hidden sm:inline-flex px-3.5 py-2 rounded-xl text-xs font-bold text-[var(--am-text)] bg-[var(--am-surface)] border border-[var(--am-border)] hover:border-[var(--am-primary)] hover:bg-[var(--am-bg2)] transition-all cursor-pointer"
              >
                Masuk Akun
              </button>
            ) : null}

            {/* Tombol Utama: Mulai Belanja Sekarang */}
            <button
              onClick={() => onNavigateTab('home')}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[var(--am-primary)] to-[var(--am-primary-dark)] hover:opacity-95 shadow-md shadow-[var(--am-primary)]/20 transition-all cursor-pointer flex items-center gap-1.5 transform hover:scale-102"
            >
              <span>🛍️</span>
              <span>Mulai Belanja</span>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="lg:hidden w-9 h-9 rounded-xl border border-[var(--am-border)] bg-[var(--am-surface)] flex items-center justify-center text-lg cursor-pointer"
              aria-label="Menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[var(--am-border)] bg-[var(--am-surface)] px-4 py-4 space-y-3 shadow-lg">
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button onClick={() => scrollToSection('tentang')} className="p-2.5 rounded-xl bg-[var(--am-bg2)] text-left">
                🏛️ Tentang Kami
              </button>
              <button onClick={() => scrollToSection('fitur')} className="p-2.5 rounded-xl bg-[var(--am-bg2)] text-left">
                ✨ Fitur Ekosistem
              </button>
              <button onClick={() => scrollToSection('peran')} className="p-2.5 rounded-xl bg-[var(--am-bg2)] text-left">
                👥 Pilihan Peran
              </button>
              <button onClick={() => scrollToSection('vending')} className="p-2.5 rounded-xl bg-[var(--am-bg2)] text-left">
                🤖 Smart Vending
              </button>
              <button onClick={() => scrollToSection('katalog')} className="p-2.5 rounded-xl bg-[var(--am-bg2)] text-left">
                🛍️ Katalog Produk
              </button>
              <button onClick={() => scrollToSection('faq')} className="p-2.5 rounded-xl bg-[var(--am-bg2)] text-left">
                ❓ FAQ
              </button>
            </div>
            <div className="pt-2 border-t border-[var(--am-border)] flex gap-2">
              <button
                onClick={() => { setMobileMenuOpen(false); onNavigateTab('home'); }}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-[var(--am-primary)] text-center cursor-pointer shadow-sm"
              >
                Mulai Belanja Sekarang 🛍️
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 🌸 HERO SECTION: PORTAL UTAMA SITUS RESMI */}
      <section id="hero" className="relative overflow-hidden pt-10 pb-16 md:pt-16 md:pb-24 px-4 sm:px-6 lg:px-8 border-b border-[var(--am-border)] bg-gradient-to-b from-[var(--am-bg2)] via-[var(--am-bg)] to-[var(--am-surface)]">
        {/* Ambient Glowing Orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--am-primary)] opacity-10 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute top-1/3 right-10 w-80 h-80 bg-[var(--am-accent)] opacity-15 blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-6xl mx-auto relative z-10">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[var(--am-primary)]/30 bg-[var(--am-surface)]/80 backdrop-blur-md shadow-sm mb-6">
            <span className="flex h-2 w-2 rounded-full bg-[var(--am-primary)] animate-pulse" />
            <span className="text-xs font-bold tracking-wide uppercase text-[var(--am-primary)]">
              Portal Resmi Kampus Cerdas • UIN Antasari
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--am-primary)]/15 text-[var(--am-primary)]">
              2 Kampus Terhubung
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Sisi Kiri: Headline, Subtitle, Selector Kampus & Tombol Aksi */}
            <div className="lg:col-span-7 space-y-6">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-extrabold tracking-tight text-[var(--am-text)] leading-[1.18]">
                Situs Resmi Marketplace & Layanan Sivitas{' '}
                <span className="bg-gradient-to-r from-[var(--am-primary)] via-[#4D9562] to-[var(--am-accent-dark)] bg-clip-text text-transparent">
                  UIN Antasari
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[var(--am-text-muted)] leading-relaxed max-w-2xl font-normal">
                Pusat transaksi digital terintegrasi untuk mahasiswa, dosen, dan staf. Dari sarapan pagi kantin, perlengkapan kuliah & ATK, buket wisuda handmade, pesan-antar kurir ke depan ruang kelas, hingga smart IoT vending machine.
              </p>

              {/* Selector Kampus Interaktif */}
              <div className="p-2 sm:p-2.5 rounded-2xl bg-[var(--am-surface)] border border-[var(--am-border)] shadow-sm inline-flex flex-wrap items-center gap-2 max-w-full">
                <span className="text-xs font-semibold text-[var(--am-text-muted)] px-2.5 flex items-center gap-1">
                  <span>📍</span> Pilih Kampus Aktif:
                </span>
                <button
                  onClick={() => setCampus('banjarmasin')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    campus === 'banjarmasin'
                      ? 'bg-[var(--am-primary)] text-white shadow-md shadow-[var(--am-primary)]/20 scale-102'
                      : 'text-[var(--am-text)] hover:bg-[var(--am-bg2)]'
                  }`}
                >
                  <span>🏛️</span> Kampus 1 Banjarmasin (Km 4.5)
                </button>
                <button
                  onClick={() => setCampus('banjarbaru')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    campus === 'banjarbaru'
                      ? 'bg-[var(--am-primary)] text-white shadow-md shadow-[var(--am-primary)]/20 scale-102'
                      : 'text-[var(--am-text)] hover:bg-[var(--am-bg2)]'
                  }`}
                >
                  <span>🌿</span> Kampus 2 Banjarbaru (Guntung Manggis)
                </button>
              </div>

              {/* Tombol Aksi Utama */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => onNavigateTab('home')}
                  className="px-6 py-3.5 rounded-xl font-bold text-sm sm:text-base text-white bg-gradient-to-r from-[var(--am-primary)] to-[var(--am-primary-dark)] hover:opacity-95 shadow-lg shadow-[var(--am-primary)]/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 cursor-pointer"
                >
                  <span>🛍️</span>
                  <span>Mulai Belanja di Web</span>
                </button>

                <button
                  onClick={() => onNavigateTab('seller')}
                  className="px-5 py-3.5 rounded-xl font-bold text-sm sm:text-base text-[var(--am-text)] bg-[var(--am-surface)] border border-[var(--am-border)] hover:border-[var(--am-primary)] hover:bg-[var(--am-bg2)] transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>🏬</span>
                  <span>Buka Lapak Mahasiswa (0% Fee)</span>
                </button>

                <button
                  onClick={() => scrollToSection('vending')}
                  className="px-4 py-3.5 rounded-xl font-semibold text-sm text-[var(--am-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Smart Vending</span>
                  <span>↓</span>
                </button>
              </div>

              {/* Jaminan & Standar Mutu */}
              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-medium text-[var(--am-text-muted)]">
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>Verifikasi Identitas Mahasiswa (KTM)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>Pengantaran Langsung Antar Gedung</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>Pembayaran QRIS & E-Wallet Resmi</span>
                </div>
              </div>
            </div>

            {/* Sisi Kanan: Kartu Showcase Layanan Kampus */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md rounded-3xl p-5 bg-[var(--am-surface)] border border-[var(--am-border)] shadow-2xl backdrop-blur-xl">
                {/* Visual Header Banner */}
                <div className="relative h-48 sm:h-52 rounded-2xl overflow-hidden mb-4 border border-[var(--am-border)] group">
                  <img
                    src="/banners/banner_delivery.jpg"
                    alt="Pengantaran Kurir Kampus Mart"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex flex-col justify-end p-4 text-white">
                    <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-[var(--am-primary)] text-white w-fit mb-1">
                      Campus Delivery Hub
                    </span>
                    <h2 className="text-base font-bold leading-snug">
                      Layanan Pengantaran Cepat Antar Gedung Kampus
                    </h2>
                    <p className="text-xs text-gray-200">
                      Pesanan diantar langsung sesama mahasiswa ke meja kelas atau laboratorium
                    </p>
                  </div>
                </div>

                {/* Status Pengantaran Real-time */}
                <div className="p-3.5 rounded-xl bg-[var(--am-bg2)] border border-[var(--am-border)] flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--am-primary)] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                      🛵
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[var(--am-text)]">
                        Layanan Kurir Kampus Aktif
                      </div>
                      <div className="text-[11px] text-[var(--am-text-muted)]">
                        Pengantaran: Fakultas Tarbiyah, Syariah & Gedung Terpadu
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-extrabold text-[var(--am-primary)] bg-[var(--am-surface)] px-2 py-1 rounded-md border border-[var(--am-border)]">
                    ⚡ 15 Menit
                  </span>
                </div>

                {/* Informasi Lokasi Kampus yang Dipilih */}
                <div className="p-3 rounded-xl bg-[var(--am-surface)] border border-[var(--am-border)] text-xs space-y-1.5">
                  <div className="flex justify-between items-center text-[var(--am-text)] font-semibold">
                    <span>📍 {campusData[campus].name}</span>
                    <span className="text-[10px] text-[var(--am-primary)] font-bold">Layanan Dibuka</span>
                  </div>
                  <p className="text-[11px] text-[var(--am-text-muted)] line-clamp-1">
                    {campusData[campus].address}
                  </p>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {campusData[campus].spots.slice(0, 3).map((sp, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--am-bg2)] text-[var(--am-text-muted)]">
                        • {sp}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Pintasan Aksi ke Katalog */}
                <div className="mt-4 pt-3 border-t border-[var(--am-border)] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--am-text)]">Mau belanja sekarang?</span>
                  <button
                    onClick={() => onNavigateTab('home')}
                    className="text-xs font-bold text-[var(--am-primary)] hover:underline cursor-pointer"
                  >
                    Buka Katalog Belanja →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 📊 BAR STATISTIK PENCAPAIAN PLATFORM */}
      <section className="py-8 bg-[var(--am-surface)] border-b border-[var(--am-border)] px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
          <div className="p-4 rounded-2xl bg-[var(--am-bg2)]/50 border border-[var(--am-border)]/60">
            <div className="text-2xl sm:text-3xl font-extrabold text-[var(--am-primary)] mb-1">
              2 Kampus
            </div>
            <div className="text-xs sm:text-sm font-semibold text-[var(--am-text)]">
              Banjarmasin & Banjarbaru
            </div>
            <div className="text-[11px] text-[var(--am-text-muted)] mt-0.5">
              Satu portal terintegrasi
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--am-bg2)]/50 border border-[var(--am-border)]/60">
            <div className="text-2xl sm:text-3xl font-extrabold text-[var(--am-primary)] mb-1">
              15 Menit
            </div>
            <div className="text-xs sm:text-sm font-semibold text-[var(--am-text)]">
              Rata-rata Antar Cepat
            </div>
            <div className="text-[11px] text-[var(--am-text-muted)] mt-0.5">
              Langsung ke depan ruang kelas
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--am-bg2)]/50 border border-[var(--am-border)]/60">
            <div className="text-2xl sm:text-3xl font-extrabold text-[var(--am-primary)] mb-1">
              100+ Mitra
            </div>
            <div className="text-xs sm:text-sm font-semibold text-[var(--am-text)]">
              Tenant & Mahasiswa Kreatif
            </div>
            <div className="text-[11px] text-[var(--am-text-muted)] mt-0.5">
              Kantin, ATK, buket, buku
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--am-bg2)]/50 border border-[var(--am-border)]/60">
            <div className="text-2xl sm:text-3xl font-extrabold text-[var(--am-primary)] mb-1">
              0% Fee
            </div>
            <div className="text-xs sm:text-sm font-semibold text-[var(--am-text)]">
              Komisi Penjualan Mahasiswa
            </div>
            <div className="text-[11px] text-[var(--am-text-muted)] mt-0.5">
              Murni mendukung wirausaha muda
            </div>
          </div>
        </div>
      </section>

      {/* 🏛️ SECTION: TENTANG KAMI (PROFIL SITUS RESMI CAMPUS MART) */}
      <section id="tentang" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[var(--am-surface)] border-b border-[var(--am-border)]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold tracking-wider uppercase text-[var(--am-primary)] bg-[var(--am-primary)]/10 px-3 py-1 rounded-full">
              Profil Inisiatif Kampus
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--am-text)]">
              Membangun Ekosistem Digital Smart Campus UIN Antasari
            </h2>
            <p className="text-sm sm:text-base text-[var(--am-text-muted)] leading-relaxed">
              Campus Mart lahir sebagai inisiatif modernisasi layanan belanja, pemberdayaan wirausaha mahasiswa, dan digitalisasi unit koperasi di lingkungan Universitas Islam Negeri Antasari.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[var(--am-bg2)]/60 border border-[var(--am-border)] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xl">
                🎓
              </div>
              <h3 className="text-base font-bold text-[var(--am-text)]">
                Dukungan Penuh Wirausaha Mahasiswa
              </h3>
              <p className="text-xs sm:text-sm text-[var(--am-text-muted)] leading-relaxed">
                Kami menyediakan wadah promosi dan penjualan bebas biaya (0% komisi) bagi mahasiswa yang memiliki usaha produk kreatif, kuliner, buket wisuda, hingga jasa akademik.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--am-bg2)]/60 border border-[var(--am-border)] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xl">
                🏛️
              </div>
              <h3 className="text-base font-bold text-[var(--am-text)]">
                Konektivitas 2 Kampus Terintegrasi
              </h3>
              <p className="text-xs sm:text-sm text-[var(--am-text-muted)] leading-relaxed">
                Menghubungkan sivitas di Kampus 1 Banjarmasin dan Kampus 2 Banjarbaru dalam satu database terpusat, memudahkan pemesanan barang lintas unit dan gedung fakultas.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--am-bg2)]/60 border border-[var(--am-border)] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xl">
                🤖
              </div>
              <h3 className="text-base font-bold text-[var(--am-text)]">
                Modernisasi IoT & Pembayaran Cashless
              </h3>
              <p className="text-xs sm:text-sm text-[var(--am-text-muted)] leading-relaxed">
                Menerapkan standar transaksi QRIS nasional dan mengintegrasikan smart vending machine otomatis yang dapat diakses mandiri 24 jam di titik kumpul strategis mahasiswa.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 🌟 6 PILAR EKOSISTEM UTAMA */}
      <section id="fitur" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[var(--am-bg)]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold tracking-wider uppercase text-[var(--am-primary)] bg-[var(--am-primary)]/10 px-3 py-1 rounded-full">
              Fitur Ekosistem
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--am-text)]">
              Semua Kebutuhan Kampus dalam Satu Ekosistem
            </h2>
            <p className="text-sm sm:text-base text-[var(--am-text-muted)]">
              Campus Mart dirancang khusus untuk memenuhi dinamika kehidupan perkuliahan, dari belanja hemat hingga peluang bisnis mandiri.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[var(--am-surface)] border border-[var(--am-border)] hover:border-[var(--am-primary)]/50 transition-all hover:shadow-xl group space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🛍️
              </div>
              <h3 className="text-lg font-bold text-[var(--am-text)]">
                Katalog Lengkap Mahasiswa & Kantin
              </h3>
              <p className="text-xs sm:text-sm text-[var(--am-text-muted)] leading-relaxed">
                Mulai dari sarapan pagi kantin, makan siang, print makalah, ATK, buku kuliah, hingga buket wisuda cantik buatan sesama mahasiswa.
              </p>
              <button
                onClick={() => onNavigateTab('home')}
                className="text-xs font-bold text-[var(--am-primary)] flex items-center gap-1 group-hover:gap-2 transition-all cursor-pointer"
              >
                Jelajahi Katalog Belanja →
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--am-surface)] border border-[var(--am-border)] hover:border-[var(--am-primary)]/50 transition-all hover:shadow-xl group space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🛵
              </div>
              <h3 className="text-lg font-bold text-[var(--am-text)]">
                Kurir Khusus Kampus (Campus Courier)
              </h3>
              <p className="text-xs sm:text-sm text-[var(--am-text-muted)] leading-relaxed">
                Pengantaran spesifik antar gedung, laboratorium, ruang dekanat, sampai ke asrama. Driver mahasiswa hafal seluruh denah kampus.
              </p>
              <button
                onClick={() => onNavigateTab('tracker')}
                className="text-xs font-bold text-[var(--am-primary)] flex items-center gap-1 group-hover:gap-2 transition-all cursor-pointer"
              >
                Pelacakan Pengantaran Real-time →
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--am-surface)] border border-[var(--am-border)] hover:border-[var(--am-primary)]/50 transition-all hover:shadow-xl group space-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🤖
              </div>
              <h3 className="text-lg font-bold text-[var(--am-text)]">
                Smart IoT Vending Machine
              </h3>
              <p className="text-xs sm:text-sm text-[var(--am-text-muted)] leading-relaxed">
                Jajan mandiri 24 jam dengan scan QRIS atau rasakan keseruan Mystery Blind Bag kejutan langsung di spot vending kampus.
              </p>
              <button
                onClick={() => onNavigateTab('vending_simulator')}
                className="text-xs font-bold text-[var(--am-primary)] flex items-center gap-1 group-hover:gap-2 transition-all cursor-pointer"
              >
                Coba Simulator Vending →
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--am-surface)] border border-[var(--am-border)] hover:border-[var(--am-primary)]/50 transition-all hover:shadow-xl group space-y-4">
              <div className="w-12 h-12 rounded-xl bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                💎
              </div>
              <h3 className="text-lg font-bold text-[var(--am-text)]">
                Antasari Mart PRO Membership
              </h3>
              <p className="text-xs sm:text-sm text-[var(--am-text-muted)] leading-relaxed">
                Langganan bulanan super hemat cuma Rp10.000/bln. Bebas ongkir pengantaran sepuasnya, diskon eksklusif, & prioritas antrean.
              </p>
              <button
                onClick={onOpenProModal}
                className="text-xs font-bold text-[var(--am-primary)] flex items-center gap-1 group-hover:gap-2 transition-all cursor-pointer"
              >
                Info Langganan PRO →
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--am-surface)] border border-[var(--am-border)] hover:border-[var(--am-primary)]/50 transition-all hover:shadow-xl group space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                💬
              </div>
              <h3 className="text-lg font-bold text-[var(--am-text)]">
                Live Chat & Web Push Notifikasi
              </h3>
              <p className="text-xs sm:text-sm text-[var(--am-text-muted)] leading-relaxed">
                Tanya stok, request custom buket wisuda, atau konfirmasi pesanan langsung ke penjual dengan notifikasi instan di browsermu.
              </p>
              <button
                onClick={() => onNavigateTab('chat')}
                className="text-xs font-bold text-[var(--am-primary)] flex items-center gap-1 group-hover:gap-2 transition-all cursor-pointer"
              >
                Mulai Percakapan →
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--am-surface)] border border-[var(--am-border)] hover:border-[var(--am-primary)]/50 transition-all hover:shadow-xl group space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🛡️
              </div>
              <h3 className="text-lg font-bold text-[var(--am-text)]">
                Verifikasi KTM & Keamanan Berlapis
              </h3>
              <p className="text-xs sm:text-sm text-[var(--am-text-muted)] leading-relaxed">
                Pelapak diverifikasi melalui NIM dan foto Kartu Tanda Mahasiswa (KTM) aktif. Belanja aman, nyaman, dan terpercaya.
              </p>
              <button
                onClick={() => onNavigateTab('seller')}
                className="text-xs font-bold text-[var(--am-primary)] flex items-center gap-1 group-hover:gap-2 transition-all cursor-pointer"
              >
                Verifikasi Lapak Mahasiswa →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 👥 PILIH PERANMU DI CAMPUS MART */}
      <section id="peran" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[var(--am-surface)] border-y border-[var(--am-border)]">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold tracking-wider uppercase text-[var(--am-primary)] bg-[var(--am-primary)]/10 px-3 py-1 rounded-full">
              Satu Platform Untuk Semua
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--am-text)]">
              Pilih Peranmu & Rasakan Manfaatnya
            </h2>
            <p className="text-sm sm:text-base text-[var(--am-text-muted)]">
              Setiap sivitas akademika memiliki peran dan kesempatan berkembang bersama Campus Mart.
            </p>
          </div>

          <div className="flex justify-center flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => setActiveRoleTab('buyer')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeRoleTab === 'buyer'
                  ? 'bg-[var(--am-primary)] text-white shadow-md'
                  : 'bg-[var(--am-bg2)] text-[var(--am-text)] hover:bg-[var(--am-border)]'
              }`}
            >
              <span>🎓</span> Mahasiswa / Pembeli
            </button>
            <button
              onClick={() => setActiveRoleTab('seller')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeRoleTab === 'seller'
                  ? 'bg-[var(--am-primary)] text-white shadow-md'
                  : 'bg-[var(--am-bg2)] text-[var(--am-text)] hover:bg-[var(--am-border)]'
              }`}
            >
              <span>🏬</span> Pelapak / Mahasiswa Wirausaha
            </button>
            <button
              onClick={() => setActiveRoleTab('driver')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeRoleTab === 'driver'
                  ? 'bg-[var(--am-primary)] text-white shadow-md'
                  : 'bg-[var(--am-bg2)] text-[var(--am-text)] hover:bg-[var(--am-border)]'
              }`}
            >
              <span>🛵</span> Driver / Kurir Kampus
            </button>
            <button
              onClick={() => setActiveRoleTab('koperasi')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeRoleTab === 'koperasi'
                  ? 'bg-[var(--am-primary)] text-white shadow-md'
                  : 'bg-[var(--am-bg2)] text-[var(--am-text)] hover:bg-[var(--am-border)]'
              }`}
            >
              <span>🏢</span> Koperasi & Pengelola
            </button>
          </div>

          <div className="p-6 sm:p-10 rounded-3xl bg-[var(--am-bg2)]/60 border border-[var(--am-border)] max-w-4xl mx-auto">
            {activeRoleTab === 'buyer' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Untuk Mahasiswa, Dosen & Staf
                  </div>
                  <h3 className="text-2xl font-bold text-[var(--am-text)]">
                    Fokus Belajar, Kebutuhanmu Kami Antar
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--am-text-muted)] leading-relaxed">
                    Tidak perlu antre atau keluar gerbang kampus saat istirahat kuliah yang mepet. Pesan makanan, print tugas, atau beli kado wisuda cukup dari smartphone Anda.
                  </p>
                  <ul className="text-xs sm:text-sm space-y-2 text-[var(--am-text)]">
                    <li className="flex items-center gap-2">✨ Pengantaran sampai meja kelas atau perpustakaan</li>
                    <li className="flex items-center gap-2">✨ Bayar mudah QRIS, GoPay, SeaBank, atau COD</li>
                    <li className="flex items-center gap-2">✨ Pelacakan posisi kurir real-time di peta kampus</li>
                  </ul>
                  <div className="pt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => onNavigateTab('home')}
                      className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[var(--am-primary)] hover:opacity-90 shadow-md cursor-pointer"
                    >
                      Mulai Belanja di Web 🛍️
                    </button>
                  </div>
                </div>
                <div className="rounded-2xl overflow-hidden border border-[var(--am-border)] shadow-md">
                  <img
                    src="/banners/banner_delivery.jpg"
                    alt="Pembeli Mahasiswa"
                    className="w-full h-56 object-cover"
                  />
                </div>
              </div>
            )}

            {activeRoleTab === 'seller' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                    Dukungan UMKM & Wirausaha Kampus
                  </div>
                  <h3 className="text-2xl font-bold text-[var(--am-text)]">
                    Buka Lapak Sendiri, 0% Biaya Komisi
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--am-text-muted)] leading-relaxed">
                    Punya keahlian bikin buket, kue, makanan ringan, atau merchandise? Promosikan langsung ke ribuan sivitas akademika UIN Antasari tanpa potongan keuntungan!
                  </p>
                  <ul className="text-xs sm:text-sm space-y-2 text-[var(--am-text)]">
                    <li className="flex items-center gap-2">✨ Verifikasi mudah dengan foto KTM mahasiswa</li>
                    <li className="flex items-center gap-2">✨ Dashboard kelola pesanan & fitur kupon diskon toko</li>
                    <li className="flex items-center gap-2">✨ Notifikasi order langsung via browser</li>
                  </ul>
                  <div className="pt-2">
                    <button
                      onClick={() => onNavigateTab('seller')}
                      className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[var(--am-primary)] hover:opacity-90 shadow-md cursor-pointer"
                    >
                      Buka Lapak Sekarang 🏬
                    </button>
                  </div>
                </div>
                <div className="rounded-2xl overflow-hidden border border-[var(--am-border)] shadow-md">
                  <img
                    src="/banners/banner_ganci.jpg"
                    alt="Pelapak Wirausaha Mahasiswa"
                    className="w-full h-56 object-cover"
                  />
                </div>
              </div>
            )}

            {activeRoleTab === 'driver' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                    Peluang Tambahan Uang Saku
                  </div>
                  <h3 className="text-2xl font-bold text-[var(--am-text)]">
                    Penghasilan Fleksibel di Sela Jam Kuliah
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--am-text-muted)] leading-relaxed">
                    Manfaatkan waktu luang di sela jam kuliah untuk menjadi kurir antar-gedung. Rute dekat hanya di dalam area kampus dengan ongkos kirim transparan.
                  </p>
                  <ul className="text-xs sm:text-sm space-y-2 text-[var(--am-text)]">
                    <li className="flex items-center gap-2">✨ Jam kerja fleksibel sesuai jadwal kuliah</li>
                    <li className="flex items-center gap-2">✨ Radius pengantaran ringkas di dalam lingkungan kampus</li>
                    <li className="flex items-center gap-2">✨ Bonus dan prioritas order untuk kurir berprestasi</li>
                  </ul>
                  <div className="pt-2">
                    <button
                      onClick={() => onNavigateTab('driver')}
                      className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[var(--am-primary)] hover:opacity-90 shadow-md cursor-pointer"
                    >
                      Daftar Jadi Kurir Kampus 🛵
                    </button>
                  </div>
                </div>
                <div className="rounded-2xl overflow-hidden border border-[var(--am-border)] shadow-md">
                  <img
                    src="/banners/banner_delivery.jpg"
                    alt="Kurir Kampus"
                    className="w-full h-56 object-cover"
                  />
                </div>
              </div>
            )}

            {activeRoleTab === 'koperasi' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    Pengurus Koperasi & Pengelola
                  </div>
                  <h3 className="text-2xl font-bold text-[var(--am-text)]">
                    Digitalisasi Koperasi Kampus Menuju Smart Campus
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--am-text-muted)] leading-relaxed">
                    Koperasi UIN Antasari kini dapat memonitor stok inventaris, mengelola transaksi penjualan atribut/seragam kampus, dan menghasilkan laporan rekapitulasi otomatis.
                  </p>
                  <ul className="text-xs sm:text-sm space-y-2 text-[var(--am-text)]">
                    <li className="flex items-center gap-2">✨ Manajemen stok terpusat untuk 2 kampus</li>
                    <li className="flex items-center gap-2">✨ Laporan keuangan & riwayat pesanan otomatis</li>
                    <li className="flex items-center gap-2">✨ Broadcast pengumuman & voucher diskon massal</li>
                  </ul>
                  <div className="pt-2">
                    <button
                      onClick={() => onNavigateTab('admin')}
                      className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[var(--am-primary)] hover:opacity-90 shadow-md cursor-pointer"
                    >
                      Buka Panel Koperasi 🏢
                    </button>
                  </div>
                </div>
                <div className="rounded-2xl overflow-hidden border border-[var(--am-border)] shadow-md">
                  <img
                    src="/banners/banner_koperasi.jpg"
                    alt="Koperasi UIN Antasari"
                    className="w-full h-56 object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 🤖 SPOTLIGHT SMART VENDING MACHINE (IoT) */}
      <section id="vending" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[var(--am-bg)] via-[var(--am-bg2)] to-[var(--am-bg)]">
        <div className="max-w-6xl mx-auto rounded-3xl p-6 sm:p-10 lg:p-12 border border-[var(--am-border)] bg-[var(--am-surface)] shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 text-xs font-bold">
                <span>🤖 Inovasi Smart Campus</span>
                <span>•</span>
                <span>ESP32 & WebSocket IoT</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--am-text)]">
                Smart Vending Machine: Belanja Mandiri Tanpa Antre
              </h2>
              <p className="text-xs sm:text-sm md:text-base text-[var(--am-text-muted)] leading-relaxed">
                Tersedia di titik strategis kampus UIN Antasari. Cukup scan QRIS langsung di layar mesin untuk mendapatkan minuman dingin, camilan, atau Mystery Blind Bag kejutan.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-[var(--am-bg2)] border border-[var(--am-border)] space-y-1">
                  <div className="text-xs font-bold text-[var(--am-text)] flex items-center gap-1.5">
                    <span>🎁</span> Mystery Blind Bag
                  </div>
                  <div className="text-[11px] text-[var(--am-text-muted)]">
                    Koleksi gantungan kunci dan souvenir kampus eksklusif
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--am-bg2)] border border-[var(--am-border)] space-y-1">
                  <div className="text-xs font-bold text-[var(--am-text)] flex items-center gap-1.5">
                    <span>⚡</span> Pembayaran Cashless
                  </div>
                  <div className="text-[11px] text-[var(--am-text-muted)]">
                    Terintegrasi QRIS instan & notifikasi sukses waktu nyata
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  onClick={() => onNavigateTab('vending_simulator')}
                  className="px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-600/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>🕹️</span>
                  <span>Buka Simulator Vending Machine</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative rounded-2xl overflow-hidden border border-[var(--am-border)] shadow-xl group">
                <img
                  src="/banners/banner_vending.jpg"
                  alt="Vending Machine Campus Mart"
                  className="w-full h-72 sm:h-80 object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5 text-white">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500 text-white w-fit mb-1">
                    Live Simulator Ready
                  </span>
                  <div className="text-sm font-bold">
                    Coba transaksi simulasi di browser sekarang
                  </div>
                  <div className="text-xs text-gray-300">
                    Didukung animasi drop produk & suara mesin realistis
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🛍️ KATALOG POPULER PREVIEW */}
      <section id="katalog" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[var(--am-surface)] border-b border-[var(--am-border)]">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="text-xs font-bold tracking-wider uppercase text-[var(--am-primary)] bg-[var(--am-primary)]/10 px-3 py-1 rounded-full">
                Katalog Produk Terpilih
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--am-text)]">
                Produk Favorit Sivitas Akademika
              </h2>
              <p className="text-xs sm:text-sm text-[var(--am-text-muted)]">
                Intip beberapa produk populer yang siap dipesan di {campusData[campus].name}.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'Semua' },
                { id: 'craft', label: 'Buket & Wisuda' },
                { id: 'kuliner', label: 'Kuliner Kantin' },
                { id: 'vending', label: 'Vending IoT' },
                { id: 'merch', label: 'Merchandise' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-[var(--am-primary)] text-white shadow-xs'
                      : 'bg-[var(--am-bg2)] text-[var(--am-text)] hover:bg-[var(--am-border)]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredPreview.map(prod => (
              <div
                key={prod.id}
                className="rounded-2xl bg-[var(--am-surface)] border border-[var(--am-border)] overflow-hidden shadow-sm hover:shadow-lg transition-all group flex flex-col"
              >
                <div className="relative h-44 overflow-hidden bg-[var(--am-bg2)]">
                  <img
                    src={prod.image}
                    alt={prod.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-2.5 left-2.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[var(--am-surface)]/90 backdrop-blur-md text-[var(--am-text)] shadow-xs">
                    {prod.badge}
                  </span>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="text-[11px] text-[var(--am-text-muted)] flex items-center justify-between">
                      <span>{prod.seller}</span>
                      <span className="text-amber-500 font-bold">★ {prod.rating}</span>
                    </div>
                    <h3 className="text-sm font-bold text-[var(--am-text)] mt-1 line-clamp-2">
                      {prod.title}
                    </h3>
                  </div>

                  <div className="pt-2 border-t border-[var(--am-border)] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-[var(--am-text-muted)]">Harga Mahasiswa</div>
                      <div className="text-sm font-extrabold text-[var(--am-primary)]">
                        {formatRupiah(prod.price)}
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigateTab('home')}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--am-primary)] text-white hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                    >
                      Beli di Web 🛒
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-4">
            <button
              onClick={() => onNavigateTab('home')}
              className="px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-[var(--am-primary)] bg-[var(--am-bg2)] hover:bg-[var(--am-border)] transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <span>Jelajahi Ratusan Produk Lainnya di Katalog Belanja</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </section>

      {/* 💬 TESTIMONI SIVITAS AKADEMIKA */}
      <section id="testimoni" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[var(--am-surface)] border-b border-[var(--am-border)]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold tracking-wider uppercase text-[var(--am-primary)] bg-[var(--am-primary)]/10 px-3 py-1 rounded-full">
              Kisah & Ulasan
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--am-text)]">
              Apa Kata Mahasiswa & Mitra Kampus?
            </h2>
            <p className="text-sm sm:text-base text-[var(--am-text-muted)]">
              Pengalaman nyata dari mereka yang menggunakan Campus Mart setiap harinya.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-[var(--am-bg2)]/40 border border-[var(--am-border)] flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex text-amber-400 text-sm">★★★★★</div>
                  <p className="text-xs sm:text-sm text-[var(--am-text)] leading-relaxed italic">
                    "{t.text}"
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-[var(--am-border)]">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="w-10 h-10 rounded-full object-cover border border-[var(--am-primary)]"
                  />
                  <div>
                    <div className="text-xs font-bold text-[var(--am-text)]">{t.name}</div>
                    <div className="text-[11px] text-[var(--am-text-muted)]">{t.faculty}</div>
                    <div className="text-[10px] text-[var(--am-primary)] font-semibold">{t.campus}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ❓ FAQ ACCORDION */}
      <section id="faq" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[var(--am-bg)]">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold tracking-wider uppercase text-[var(--am-primary)] bg-[var(--am-primary)]/10 px-3 py-1 rounded-full">
              Pertanyaan Umum
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--am-text)]">
              Frequently Asked Questions (FAQ)
            </h2>
            <p className="text-sm sm:text-base text-[var(--am-text-muted)]">
              Punya pertanyaan mengenai cara penggunaan Campus Mart? Temukan jawabannya di sini.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-[var(--am-border)] bg-[var(--am-surface)] overflow-hidden transition-all shadow-xs"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex justify-between items-center gap-4 cursor-pointer hover:bg-[var(--am-bg2)]/50 transition-colors"
                  >
                    <span className="font-bold text-xs sm:text-sm text-[var(--am-text)]">
                      {faq.q}
                    </span>
                    <span className={`text-base font-extrabold text-[var(--am-primary)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                      ↓
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 sm:pb-5 text-xs sm:text-sm text-[var(--am-text-muted)] leading-relaxed border-t border-[var(--am-border)]/50 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 🏁 FINAL CTA FOOTER BANNER */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[var(--am-surface)] to-[var(--am-bg2)] border-t border-[var(--am-border)] text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex justify-center">
            <div className="relative group">
              <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-r from-[var(--am-primary)] to-[var(--am-accent)] opacity-40 blur-lg group-hover:opacity-75 transition duration-500"></div>
              <img 
                src="/campus_mart_icon.png" 
                alt="Campus Mart Logo" 
                className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-3xl shadow-xl border-2 border-[var(--am-border)] object-cover transform hover:scale-105 transition-all duration-300" 
              />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--am-text)]">
            Siap Menikmati Kemudahan Belanja di Kampus UIN Antasari?
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-[var(--am-text-muted)] max-w-xl mx-auto leading-relaxed">
            Mulai jelajahi katalog produk, pesan sarapan pagi, atau dukung usaha sesama mahasiswa melalui situs resmi Campus Mart.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigateTab('home')}
              className="px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-[var(--am-primary)] hover:opacity-90 shadow-lg shadow-[var(--am-primary)]/20 transition-all cursor-pointer"
            >
              Mulai Belanja Sekarang 🛍️
            </button>
            <button
              onClick={() => onNavigateTab('seller')}
              className="px-6 py-3.5 rounded-xl font-bold text-sm text-[var(--am-text)] bg-[var(--am-surface)] border border-[var(--am-border)] hover:bg-[var(--am-bg2)] transition-all cursor-pointer"
            >
              Buka Lapak Mahasiswa 🏬
            </button>
          </div>
        </div>
      </section>

      {/* 📄 FOOTER RESMI INSTITUSI */}
      <footer className="py-10 px-4 sm:px-6 lg:px-8 border-t border-[var(--am-border)] bg-[var(--am-surface)] text-xs text-[var(--am-text-muted)] space-y-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2.5 font-bold text-sm text-[var(--am-text)]">
              <img 
                src="/campus_mart_icon.png" 
                alt="Campus Mart Logo" 
                className="w-6 h-6 rounded-lg object-cover border border-[var(--am-border)] shadow-xs" 
              />
              <span>Campus Mart</span>
              <span>•</span>
              <span>UIN Antasari Banjarmasin</span>
            </div>
            <p className="text-[11px]">
              Situs Resmi Marketplace, Unit Koperasi & Layanan Pengantaran Sivitas Akademika
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-semibold">
            <button onClick={() => scrollToSection('tentang')} className="hover:text-[var(--am-primary)] cursor-pointer">Tentang</button>
            <button onClick={() => scrollToSection('fitur')} className="hover:text-[var(--am-primary)] cursor-pointer">Fitur</button>
            <button onClick={() => scrollToSection('katalog')} className="hover:text-[var(--am-primary)] cursor-pointer">Katalog</button>
            <button onClick={() => scrollToSection('faq')} className="hover:text-[var(--am-primary)] cursor-pointer">FAQ</button>
            <a 
              href="https://github.com/miyatyy/ma-project-fix/raw/main/antasari_mart_release.apk" 
              className="hover:text-[var(--am-primary)] text-[var(--am-text-muted)]/80"
              title="Tersedia juga versi Android APK"
            >
              Versi Android (.apk)
            </a>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-4 border-t border-[var(--am-border)]/60 text-center text-[10px] text-[var(--am-text-muted)]/70 flex flex-col sm:flex-row justify-between gap-2">
          <p>Kampus 1: Jl. A. Yani Km 4.5 Banjarmasin | Kampus 2: Guntung Manggis Banjarbaru</p>
          <p>© {new Date().getFullYear()} Campus Mart UIN Antasari. Hak Cipta Dilindungi Undang-Undang.</p>
        </div>
      </footer>
    </div>
  );
}
