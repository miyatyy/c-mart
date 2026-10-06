import { useState } from 'react';
import type { Campus, ThemeMode, AppTab } from '../types';
import { formatRupiah } from '../data';

interface LandingPageProps {
  theme: ThemeMode;
  campus: Campus;
  setCampus: (c: Campus) => void;
  onNavigateTab: (tab: AppTab) => void;
  onRequireLogin?: () => void;
  isGuest?: boolean;
  onOpenProModal?: () => void;
}

export default function LandingPage({
  theme,
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

  const campusData = {
    banjarmasin: {
      name: 'Kampus 1 Banjarmasin',
      address: 'Jl. Jend. A. Yani Km. 4.5, Banjarmasin Timur',
      spots: ['Kantin Utama', 'Perpustakaan Pusat', 'Fakultas Tarbiyah', 'Fakultas Syariah', 'Auditorium Mastur Jahri'],
      vendingLocation: 'Lantai 1 Gedung Rektorat & Depan Perpustakaan',
      tagline: 'Pusat Belanja & Layanan Mahasiswa Kampus Utama'
    },
    banjarbaru: {
      name: 'Kampus 2 Banjarbaru',
      address: 'Jl. Pandarahan, Guntung Manggis, Landasan Ulin, Banjarbaru',
      spots: ['Gedung Perkuliahan Terpadu', 'Fakultas Dakwah', 'Fakultas Ushuluddin', 'Ma\'had Al-Jami\'ah', 'Masjid Kampus 2'],
      vendingLocation: 'Lobi Gedung Perkuliahan Terpadu & Area Asrama Mahasiswa',
      tagline: 'Inovasi Smart Campus & Ekosistem Digital Modern'
    }
  };

  const previewProducts = [
    {
      id: 'p1',
      title: 'Buket Bunga Wisuda Satin Premium',
      category: 'craft',
      price: 45000,
      seller: 'Myammiy Craft',
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
      seller: 'Vending Machine Kampus Mart',
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
      a: 'Campus Mart adalah platform marketplace resmi yang mengintegrasikan seluruh ekosistem belanja di UIN Antasari. Menghubungkan mahasiswa pembeli, tenant kantin/koperasi, kurir antar-gedung sesama mahasiswa, hingga smart vending machine IoT.'
    },
    {
      q: 'Apakah pengantaran kurir bisa langsung sampai ke ruang kelas atau fakultas?',
      a: 'Ya! Kurir kami adalah mahasiswa aktif yang hafal seluk-beluk gedung di Kampus 1 Banjarmasin dan Kampus 2 Banjarbaru. Anda cukup menyertakan catatan lokasi gedung, lantai, dan ruang kelas saat checkout.'
    },
    {
      q: 'Bagaimana cara membuka toko/berjualan di Campus Mart?',
      a: 'Sangat mudah dan gratis! Mahasiswa cukup mendaftar akun, lalu mengajukan verifikasi data KTM (Kartu Tanda Mahasiswa). Setelah diverifikasi tim admin, Anda langsung dapat mengunggah foto produk, membuat kupon promosi, dan menerima orderan.'
    },
    {
      q: 'Metode pembayaran apa saja yang didukung?',
      a: 'Campus Mart mendukung QRIS (bisa scan dari BCA, BRI, Mandiri, BSI, Gopay, OVO, ShopeePay, Dana), SeaBank, Campus Wallet, serta metode Bayar di Tempat (COD) saat barang diterima.'
    },
    {
      q: 'Apa itu fitur Smart Vending Machine?',
      a: 'Merupakan mesin otomatis berteknologi IoT yang ditempatkan di spot strategis kampus. Anda bisa membeli snack, minuman dingin, dan Mystery Blind Bag secara mandiri dengan scan QRIS atau mencoba simulasinya di web ini.'
    },
    {
      q: 'Apa keuntungan berlangganan Antasari Mart PRO?',
      a: 'Dengan biaya mulai Rp10.000/bulan, anggota PRO menikmati Bebas Ongkir sepuasnya tanpa batas minimal belanja, prioritas penugasan kurir super cepat, lencana eksklusif di profil, dan diskon spesial dari tenant rekanan.'
    }
  ];

  return (
    <div className="w-full text-left transition-colors duration-300 font-sans">
      {/* 🌸 HEADER HERO TOP BANNER */}
      <section className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24 px-4 sm:px-6 lg:px-8 border-b border-[var(--am-border)] bg-gradient-to-b from-[var(--am-bg2)] via-[var(--am-bg)] to-[var(--am-surface)]">
        {/* Ambient Glowing Orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--am-primary)] opacity-10 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute top-1/3 right-10 w-80 h-80 bg-[var(--am-accent)] opacity-15 blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-6xl mx-auto relative z-10">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[var(--am-primary)]/30 bg-[var(--am-surface)]/80 backdrop-blur-md shadow-sm mb-6">
            <span className="flex h-2 w-2 rounded-full bg-[var(--am-primary)] animate-pulse" />
            <span className="text-xs font-bold tracking-wide uppercase text-[var(--am-primary)]">
              Digital Campus Commerce • UIN Antasari
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--am-primary)]/15 text-[var(--am-primary)]">
              2 Kampus Aktif
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: Headline & Call To Actions */}
            <div className="lg:col-span-7 space-y-6">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-extrabold tracking-tight text-[var(--am-text)] leading-[1.18]">
                Belanja, Jual & Antar Kebutuhan Kampus Jadi{' '}
                <span className="bg-gradient-to-r from-[var(--am-primary)] via-[#4D9562] to-[var(--am-accent-dark)] bg-clip-text text-transparent">
                  Lebih Mudah & Terintegrasi
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[var(--am-text-muted)] leading-relaxed max-w-2xl font-normal">
                Ekosistem marketplace cerdas untuk sivitas akademika UIN Antasari (Banjarmasin & Banjarbaru). Nikmati pesan-antar kurir ke depan ruang kelas, belanja produk karya mahasiswa, hingga jajan instan lewat Smart IoT Vending Machine.
              </p>

              {/* Campus Selector Pill Bar */}
              <div className="p-2 sm:p-2.5 rounded-2xl bg-[var(--am-surface)] border border-[var(--am-border)] shadow-sm inline-flex flex-wrap items-center gap-2 max-w-full">
                <span className="text-xs font-semibold text-[var(--am-text-muted)] px-2.5 flex items-center gap-1">
                  <span>📍</span> Pilih Kampus:
                </span>
                <button
                  onClick={() => setCampus('banjarmasin')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    campus === 'banjarmasin'
                      ? 'bg-[var(--am-primary)] text-white shadow-md shadow-[var(--am-primary)]/20 scale-102'
                      : 'text-[var(--am-text)] hover:bg-[var(--am-bg2)]'
                  }`}
                >
                  <span>🏛️</span> Banjarmasin (Km 4.5)
                </button>
                <button
                  onClick={() => setCampus('banjarbaru')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    campus === 'banjarbaru'
                      ? 'bg-[var(--am-primary)] text-white shadow-md shadow-[var(--am-primary)]/20 scale-102'
                      : 'text-[var(--am-text)] hover:bg-[var(--am-bg2)]'
                  }`}
                >
                  <span>🌿</span> Banjarbaru (Guntung Manggis)
                </button>
              </div>

              {/* CTA Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => onNavigateTab('home')}
                  className="px-6 py-3.5 rounded-xl font-bold text-sm sm:text-base text-white bg-gradient-to-r from-[var(--am-primary)] to-[var(--am-primary-dark)] hover:opacity-95 shadow-lg shadow-[var(--am-primary)]/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 cursor-pointer"
                >
                  <span>🛍️</span>
                  <span>Mulai Belanja Katalog</span>
                </button>

                <button
                  onClick={() => onNavigateTab('vending_simulator')}
                  className="px-5 py-3.5 rounded-xl font-bold text-sm sm:text-base text-[var(--am-text)] bg-[var(--am-surface)] border border-[var(--am-border)] hover:border-[var(--am-primary)] hover:bg-[var(--am-bg2)] transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>🤖</span>
                  <span>Coba Vending IoT</span>
                </button>

                {isGuest && (
                  <button
                    onClick={() => {
                      if (onRequireLogin) onRequireLogin();
                      else onNavigateTab('login_page');
                    }}
                    className="px-4 py-3.5 rounded-xl font-semibold text-sm text-[var(--am-primary)] hover:underline flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Masuk Akun</span>
                    <span>→</span>
                  </button>
                )}
              </div>

              {/* Trust Badges */}
              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-medium text-[var(--am-text-muted)]">
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>Verifikasi KTM Resmi</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>0% Potongan Lapak Mahasiswa</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>QRIS & E-Wallet Instant</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Card Showcase */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md rounded-3xl p-4 sm:p-5 bg-[var(--am-surface)] border border-[var(--am-border)] shadow-2xl backdrop-blur-xl">
                {/* Visual Header with Campus Banner */}
                <div className="relative h-48 sm:h-52 rounded-2xl overflow-hidden mb-4 border border-[var(--am-border)] group">
                  <img
                    src="/banners/banner_delivery.jpg"
                    alt="Pengantaran Kurir Kampus Mart"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-4 text-white">
                    <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-[var(--am-primary)] text-white w-fit mb-1">
                      Campus Express
                    </span>
                    <h2 className="text-base font-bold leading-snug">
                      Pengantaran Cepat Antar Gedung & Fakultas
                    </h2>
                    <p className="text-xs text-gray-200">
                      Diantar kurir mahasiswa langsung ke depan kelas atau lab
                    </p>
                  </div>
                </div>

                {/* Floating Interactive Status Mini-Card */}
                <div className="p-3.5 rounded-xl bg-[var(--am-bg2)] border border-[var(--am-border)] flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--am-primary)] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                      🛵
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[var(--am-text)]">
                        Pesanan Sedang Diantar
                      </div>
                      <div className="text-[11px] text-[var(--am-text-muted)]">
                        Menuju: Gedung Fakultas Tarbiyah (Lantai 2)
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-extrabold text-[var(--am-primary)] bg-[var(--am-surface)] px-2 py-1 rounded-md border border-[var(--am-border)] shadow-2xs">
                      ⚡ ~4 Menit
                    </span>
                  </div>
                </div>

                {/* Campus Spot Highlight Info */}
                <div className="p-3 rounded-xl bg-[var(--am-surface)] border border-[var(--am-border)] text-xs space-y-1.5">
                  <div className="flex justify-between items-center text-[var(--am-text)] font-semibold">
                    <span>📍 {campusData[campus].name}</span>
                    <span className="text-[10px] text-[var(--am-primary)] font-bold">Aktif & Buka</span>
                  </div>
                  <p className="text-[11px] text-[var(--am-text-muted)] line-clamp-1">
                    {campusData[campus].address}
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {campusData[campus].spots.slice(0, 3).map((sp, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--am-bg2)] text-[var(--am-text-muted)]">
                        • {sp}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Quick Action in Card */}
                <div className="mt-4 pt-3 border-t border-[var(--am-border)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--am-text)]">Mau jadi penjual?</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold dark:bg-emerald-950/60 dark:text-emerald-300">
                      0% Fee
                    </span>
                  </div>
                  <button
                    onClick={() => onNavigateTab('seller')}
                    className="text-xs font-bold text-[var(--am-primary)] hover:underline cursor-pointer"
                  >
                    Buka Toko Gratis →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 📊 KEY STATS COUNTER BAR */}
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
              Terhubung satu sistem
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

      {/* 🌟 6 PILAR EKOSISTEM UTAMA */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[var(--am-bg)]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold tracking-wider uppercase text-[var(--am-primary)] bg-[var(--am-primary)]/10 px-3 py-1 rounded-full">
              Fitur Unggulan
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--am-text)]">
              Semua Kebutuhan Kampus dalam Satu Aplikasi
            </h2>
            <p className="text-sm sm:text-base text-[var(--am-text-muted)]">
              Campus Mart dirancang khusus untuk memenuhi dinamika kehidupan perkuliahan, dari belanja hemat hingga peluang bisnis mandiri.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
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
                Lihat Semua Produk →
              </button>
            </div>

            {/* Card 2 */}
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
                Cek Pelacakan Pengantaran →
              </button>
            </div>

            {/* Card 3 */}
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
                Buka Simulator Vending →
              </button>
            </div>

            {/* Card 4 */}
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
                Pelajari Benefit PRO →
              </button>
            </div>

            {/* Card 5 */}
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

            {/* Card 6 */}
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

      {/* 👥 PILIH PERANMU DI CAMPUS MART (INTERACTIVE ROLE SWITCHER) */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[var(--am-surface)] border-y border-[var(--am-border)]">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold tracking-wider uppercase text-[var(--am-primary)] bg-[var(--am-primary)]/10 px-3 py-1 rounded-full">
              Satu Aplikasi Untuk Semua
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--am-text)]">
              Pilih Peranmu & Rasakan Manfaatnya
            </h2>
            <p className="text-sm sm:text-base text-[var(--am-text-muted)]">
              Setiap sivitas akademika memiliki peran dan kesempatan berkembang bersama Campus Mart.
            </p>
          </div>

          {/* Role Navigation Pills */}
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

          {/* Role Dynamic Content Card */}
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
                  <div className="pt-2">
                    <button
                      onClick={() => onNavigateTab('home')}
                      className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[var(--am-primary)] hover:opacity-90 shadow-md cursor-pointer"
                    >
                      Mulai Belanja Sekarang 🛍️
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
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[var(--am-bg)] via-[var(--am-bg2)] to-[var(--am-bg)]">
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
                <button
                  onClick={() => onNavigateTab('home')}
                  className="px-5 py-3 rounded-xl font-bold text-xs sm:text-sm text-[var(--am-text)] bg-[var(--am-bg2)] border border-[var(--am-border)] hover:bg-[var(--am-surface)] transition-all cursor-pointer"
                >
                  Lihat Lokasi Mesin
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
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[var(--am-surface)] border-b border-[var(--am-border)]">
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

            {/* Category Filter Pills */}
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
                      Beli 🛒
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
              <span>Jelajahi Ratusan Produk Lainnya di Katalog</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </section>

      {/* 🚀 3 LANGKAH MUDAH (HOW IT WORKS) */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[var(--am-bg)]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold tracking-wider uppercase text-[var(--am-primary)] bg-[var(--am-primary)]/10 px-3 py-1 rounded-full">
              Cara Kerja
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--am-text)]">
              Cuma 3 Langkah Mudah
            </h2>
            <p className="text-sm sm:text-base text-[var(--am-text-muted)]">
              Semudah memesan dari layar smartphone Anda saat jam istirahat kuliah.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-[var(--am-surface)] border border-[var(--am-border)] text-center space-y-4 relative z-10 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-[var(--am-primary)] text-white font-extrabold text-xl flex items-center justify-center mx-auto shadow-md">
                1
              </div>
              <h3 className="text-lg font-bold text-[var(--am-text)]">
                Pilih Kampus & Cari Produk
              </h3>
              <p className="text-xs sm:text-sm text-[var(--am-text-muted)] leading-relaxed">
                Tentukan lokasi Kampus 1 Banjarmasin atau Kampus 2 Banjarbaru. Jelajahi menu kantin, ATK, buket wisuda, atau merchandise resmi.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-[var(--am-surface)] border border-[var(--am-border)] text-center space-y-4 relative z-10 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-[var(--am-primary)] text-white font-extrabold text-xl flex items-center justify-center mx-auto shadow-md">
                2
              </div>
              <h3 className="text-lg font-bold text-[var(--am-text)]">
                Checkout & Bayar Praktis
              </h3>
              <p className="text-xs sm:text-sm text-[var(--am-text-muted)] leading-relaxed">
                Pilih metode bayar QRIS kilat, transfer e-wallet, atau Bayar di Tempat (COD). Masukkan kupon diskon toko jika ada.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-[var(--am-surface)] border border-[var(--am-border)] text-center space-y-4 relative z-10 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-[var(--am-primary)] text-white font-extrabold text-xl flex items-center justify-center mx-auto shadow-md">
                3
              </div>
              <h3 className="text-lg font-bold text-[var(--am-text)]">
                Ambil Mandiri / Diantar Kurir
              </h3>
              <p className="text-xs sm:text-sm text-[var(--am-text-muted)] leading-relaxed">
                Pilih opsi Pick-Up langsung di tenant, atau santai di ruang kelas dan tunggu kurir mahasiswa mengantarkan pesananmu sampai di tempat.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 💎 MEMBERSHIP PRO BANNER */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white rounded-none">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold tracking-wide uppercase">
              <span>💎</span> Langganan Spesial Sivitas
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold">
              Tingkatkan Pengalaman Belanja dengan Campus Mart PRO
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-xl">
              Cuma Rp10.000/bulan! Nikmati gratis ongkos kirim tanpa batas, voucher diskon khusus, prioritas kurir kilat, serta 0% biaya potongan untuk pelapak.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onOpenProModal}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs sm:text-sm bg-white text-emerald-800 hover:bg-gray-100 shadow-xl transition-all cursor-pointer text-center"
            >
              Langganan PRO Sekarang 🚀
            </button>
            <button
              onClick={() => onNavigateTab('home')}
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl font-semibold text-xs sm:text-sm bg-emerald-700/60 hover:bg-emerald-700 border border-white/20 text-white transition-all cursor-pointer text-center"
            >
              Coba Belanja Dulu
            </button>
          </div>
        </div>
      </section>

      {/* 💬 TESTIMONI SIVITAS AKADEMIKA */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[var(--am-surface)] border-b border-[var(--am-border)]">
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
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[var(--am-bg)]">
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
          <div className="text-4xl sm:text-5xl">🌸</div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--am-text)]">
            Siap Menikmati Kemudahan Belanja di Kampus UIN Antasari?
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-[var(--am-text-muted)] max-w-xl mx-auto leading-relaxed">
            Bergabunglah bersama ribuan sivitas akademika lainnya. Belanja praktis, dukung wirausaha mahasiswa, dan wujudkan Smart Campus bersama kami.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigateTab('home')}
              className="px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-[var(--am-primary)] hover:opacity-90 shadow-lg shadow-[var(--am-primary)]/20 transition-all cursor-pointer"
            >
              Mulai Belanja Sekarang 🛍️
            </button>
            {isGuest ? (
              <button
                onClick={() => {
                  if (onRequireLogin) onRequireLogin();
                  else onNavigateTab('login_page');
                }}
                className="px-6 py-3.5 rounded-xl font-bold text-sm text-[var(--am-text)] bg-[var(--am-surface)] border border-[var(--am-border)] hover:bg-[var(--am-bg2)] transition-all cursor-pointer"
              >
                Daftar Akun Baru 🔑
              </button>
            ) : (
              <button
                onClick={() => onNavigateTab('seller')}
                className="px-6 py-3.5 rounded-xl font-bold text-sm text-[var(--am-text)] bg-[var(--am-surface)] border border-[var(--am-border)] hover:bg-[var(--am-bg2)] transition-all cursor-pointer"
              >
                Buka Toko Gratis 🏬
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 📄 FOOTER COPYRIGHT */}
      <footer className="py-8 px-4 sm:px-6 border-t border-[var(--am-border)] bg-[var(--am-surface)] text-center text-xs text-[var(--am-text-muted)] space-y-2">
        <div className="flex items-center justify-center gap-2 font-bold text-[var(--am-text)]">
          <span>🌸 Campus Mart (Antasari Mart)</span>
          <span>•</span>
          <span>UIN Antasari Banjarmasin</span>
        </div>
        <p className="text-[11px]">
          Kampus 1: Jl. A. Yani Km 4.5 Banjarmasin | Kampus 2: Guntung Manggis Banjarbaru
        </p>
        <p className="text-[10px] text-[var(--am-text-muted)]/70">
          © {new Date().getFullYear()} Campus Mart Ecosystem. Hak Cipta Dilindungi Undang-Undang.
        </p>
      </footer>
    </div>
  );
}
