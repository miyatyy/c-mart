import { useState, useEffect } from 'react';
import { triggerHaptic } from '../utils/haptics';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // 1. Cek apakah sudah running dalam mode Standalone PWA / Native
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return; // Sudah terpasang sebagai aplikasi
    }

    // 2. Cek apakah user pernah menunda pemasangan dalam 24 jam terakhir
    const dismissedUntil = localStorage.getItem('am_pwa_dismissed_until');
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
      return;
    }

    // 3. Deteksi iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    if (isIosDevice) {
      setIsIOS(true);
      // Tampilkan banner ringan untuk pengguna iOS
      setIsVisible(true);
      return;
    }

    // 4. Tangkap event native 'beforeinstallprompt' di Chrome/Android
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    triggerHaptic('medium');
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) {
      // Fallback jika browser belum men-trigger prompt (bisa tap manual titik tiga browser)
      alert('Untuk memasang di HP: Tap menu titik tiga (⋮) di pojok kanan atas browser, lalu pilih "Tambahkan ke Layar Utama" (Add to Home screen).');
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsVisible(false);
        setDeferredPrompt(null);
      }
    } catch (_err) {
      // Fallback
    }
  };

  const handleDismiss = () => {
    triggerHaptic('light');
    setIsVisible(false);
    setShowIOSGuide(false);
    // Tunda selama 2 hari
    localStorage.setItem('am_pwa_dismissed_until', String(Date.now() + 2 * 24 * 60 * 60 * 1000));
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Pemasangan Aplikasi Mobile"
      className="fixed bottom-16 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-emerald-500/20 dark:border-emerald-500/30 rounded-2xl p-4 shadow-[0_10px_35px_rgba(16,185,129,0.22)] ring-1 ring-emerald-500/10 dark:ring-emerald-400/20">
        
        {/* Konten Utama Banner */}
        <div className="flex items-start gap-3.5">
          <div className="relative shrink-0">
            <img
              src="/campus_mart_icon.png"
              alt="Campus Mart"
              className="w-13 h-13 rounded-2xl object-cover shadow-md border-2 border-emerald-100 dark:border-emerald-900"
              onError={(e) => {
                // Fallback icon jika gambar belum termuat
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                Aplikasi HP
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">1-Ketuk Buka</span>
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
              Pasang Campus Mart di Layar Utama HP
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-2 leading-relaxed">
              Buka cepat tanpa repot buka browser, hemat kuota & layar penuh tanpa address bar layaknya aplikasi Android native!
            </p>
          </div>

          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 -mr-1 -mt-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Tutup banner"
            aria-label="Tutup"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Petunjuk Khusus iOS Safari jika di-expand */}
        {showIOSGuide && (
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
            <p className="font-semibold flex items-center gap-1.5">
              <span>🍎 Petunjuk Pengguna iPhone / iPad:</span>
            </p>
            <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-tight text-amber-800 dark:text-amber-300">
              <li>Tap tombol <strong>Bagikan (Share)</strong> <span className="inline-block px-1 bg-white/60 dark:bg-black/30 rounded">⎋</span> di bilah bawah browser Safari.</li>
              <li>Gulir ke bawah lalu pilih menu <strong>"Tambahkan ke Layar Utama" (Add to Home Screen)</strong> ➕.</li>
              <li>Tap <strong>"Tambah"</strong> di pojok kanan atas. Selesai!</li>
            </ol>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-end gap-2">
          <button
            onClick={handleDismiss}
            className="px-3.5 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white rounded-lg transition-colors"
          >
            Nanti Saja
          </button>

          <button
            onClick={handleInstallClick}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 shadow-md shadow-emerald-600/30 rounded-xl transition-all duration-150 cursor-pointer"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>{isIOS ? 'Cara Pasang di iOS' : 'Pasang Sekarang'}</span>
          </button>
        </div>

      </div>
    </aside>
  );
}
