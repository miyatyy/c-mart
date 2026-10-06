import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { triggerHaptic } from '../utils/haptics';

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  title?: string;
  subtitle?: string;
}

// 🔊 Suara nada beep saat scan berhasil
function playScanSuccessBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch (_e) {}
}

export default function CameraBarcodeScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Scan QR & Barcode Kamera',
  subtitle = 'Arahkan kamera HP ke QR Code Vending Machine, Produk, atau Resi Kurir'
}: CameraBarcodeScannerModalProps) {
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isHttpOrigin, setIsHttpOrigin] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [isScanningFile, setIsScanningFile] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const readerElementId = 'am-html5-qr-reader';
  const fileReaderElementId = 'am-temp-file-scanner';

  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;
    setScannerError(null);
    setShowManualFallback(false);

    // 1. Cek apakah browser membatasi WebRTC karena HTTP IP (Bukan HTTPS & bukan localhost)
    const isSecure =
      typeof window !== 'undefined' &&
      (window.isSecureContext === true ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1');

    if (!isSecure && !navigator.mediaDevices?.getUserMedia) {
      setIsHttpOrigin(true);
      setScannerError('Koneksi HTTP (Belum HTTPS): Browser membatasi live video stream. Gunakan tombol Jepret Kamera di bawah untuk scan instan.');
      return;
    }

    setIsHttpOrigin(false);

    // 2. Inisialisasi Streaming Kamera Langsung
    const initScanner = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (isCancelled) return;

        if (!devices || devices.length === 0) {
          setScannerError('Tidak ada kamera yang terdeteksi di perangkat Anda.');
          return;
        }

        setCameras(devices);

        const backCamera = devices.find(d =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('belakang') ||
          d.label.toLowerCase().includes('environment')
        );
        const initialCameraId = backCamera ? backCamera.id : devices[0].id;
        setSelectedCameraId(initialCameraId);

        const html5QrCode = new Html5Qrcode(readerElementId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E
          ],
          verbose: false
        });
        scannerRef.current = html5QrCode;

        const getResponsiveQrbox = (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const edge = Math.max(160, Math.min(260, Math.floor(minEdge * 0.72)));
          return { width: edge, height: edge };
        };

        await html5QrCode.start(
          initialCameraId,
          {
            fps: 15,
            qrbox: getResponsiveQrbox,
            aspectRatio: 1.0
          },
          (decodedText) => {
            triggerHaptic('success');
            playScanSuccessBeep();

            let cleanedText = decodedText;
            try {
              const parsed = JSON.parse(decodedText);
              if (parsed && parsed.token) {
                cleanedText = String(parsed.token);
              }
            } catch (_e) {}

            onScanSuccess(cleanedText);
            handleClose();
          },
          () => {}
        );

        try {
          const track = (html5QrCode as any).getRunningTrackCameraCapabilities?.();
          if (track && track.torch) {
            setHasTorch(true);
          }
        } catch (_tErr) {}

      } catch (err: any) {
        if (isCancelled) return;
        console.warn('Gagal live kamera:', err);
        const msg = String(err?.message || err);
        if (msg.includes('Permission') || msg.includes('NotAllowedError')) {
          setScannerError('Izin akses kamera ditolak. Harap izinkan kamera di browser atau gunakan tombol jepret foto di bawah.');
        } else {
          setScannerError('Live kamera tidak didukung di koneksi ini. Gunakan tombol Jepret Kamera di bawah.');
        }
      }
    };

    const timer = setTimeout(initScanner, 150);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (_e) {}
      scannerRef.current = null;
    }
  };

  const handleClose = async () => {
    triggerHaptic('light');
    await stopScanner();
    onClose();
  };

  const handleSwitchCamera = async () => {
    triggerHaptic('medium');
    if (!scannerRef.current || cameras.length <= 1) return;

    try {
      const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      const nextCamera = cameras[nextIndex];

      await scannerRef.current.stop();
      setSelectedCameraId(nextCamera.id);

      const getResponsiveQrbox = (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const edge = Math.max(160, Math.min(260, Math.floor(minEdge * 0.72)));
        return { width: edge, height: edge };
      };

      await scannerRef.current.start(
        nextCamera.id,
        { fps: 15, qrbox: getResponsiveQrbox, aspectRatio: 1.0 },
        (decodedText) => {
          triggerHaptic('success');
          playScanSuccessBeep();
          let cleanedText = decodedText;
          try {
            const parsed = JSON.parse(decodedText);
            if (parsed && parsed.token) cleanedText = String(parsed.token);
          } catch (_e) {}
          onScanSuccess(cleanedText);
          handleClose();
        },
        () => {}
      );
    } catch (e) {
      console.warn('Gagal beralih kamera:', e);
    }
  };

  const handleToggleTorch = async () => {
    triggerHaptic('light');
    if (!scannerRef.current) return;
    try {
      const nextTorch = !isTorchOn;
      await (scannerRef.current as any).applyVideoConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setIsTorchOn(nextTorch);
    } catch (_e) {}
  };

  // 📸 SCAN LEWAT JEPRET FOTO KAMERA / FILE GALERI (100% BEBAS DARI LIMITASI HTTP)
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningFile(true);
    triggerHaptic('medium');

    try {
      const tempScanner = new Html5Qrcode(fileReaderElementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E
        ],
        verbose: false
      });

      const decodedText = await tempScanner.scanFile(file, true);
      tempScanner.clear();

      triggerHaptic('success');
      playScanSuccessBeep();

      let cleanedText = decodedText;
      try {
        const parsed = JSON.parse(decodedText);
        if (parsed && parsed.token) cleanedText = String(parsed.token);
      } catch (_e) {}

      onScanSuccess(cleanedText);
      handleClose();
    } catch (scanErr: any) {
      console.warn('Gagal membaca QR dari foto:', scanErr);
      alert('Tidak menemukan QR Code / Barcode pada foto. Pastikan gambar cukup terang dan tidak buram, atau gunakan input kode manual.');
    } finally {
      setIsScanningFile(false);
      e.target.value = '';
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    triggerHaptic('medium');
    onScanSuccess(manualInput.trim());
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100005] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      style={{
        paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))'
      }}
    >
      <style>{`
        @keyframes scanLaser {
          0% { top: 6%; opacity: 0.8; }
          50% { top: 92%; opacity: 1; }
          100% { top: 6%; opacity: 0.8; }
        }
        .am-scan-laser-line {
          animation: scanLaser 2.2s ease-in-out infinite;
        }
        #am-html5-qr-reader {
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: none !important;
          background: #000 !important;
        }
        #am-html5-qr-reader__scan_region {
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        #am-html5-qr-reader video {
          border-radius: 16px;
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>

      {/* Hidden dummy element for scanFile */}
      <div id={fileReaderElementId} style={{ display: 'none' }} />

      {/* Hidden File Inputs */}
      {/* 1. Jepret Foto Kamera HP Langsung (capture="environment") */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileScan}
        style={{ display: 'none' }}
      />
      {/* 2. Pilih dari Galeri */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileScan}
        style={{ display: 'none' }}
      />

      <div className="relative w-full max-w-sm sm:max-w-md bg-gray-900 border border-emerald-500/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-white">
        
        {/* Header Modal */}
        <div className="p-4 bg-gray-950/80 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-lg">
              📷
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">{title}</h3>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-gray-800 text-gray-300 hover:text-white flex items-center justify-center text-sm font-bold transition-colors"
            title="Tutup Scanner"
          >
            ✕
          </button>
        </div>

        {/* Viewfinder Kamera Container */}
        <div className="relative w-full aspect-square bg-black flex items-center justify-center overflow-hidden">
          
          {/* Target Element HTML5-QRCode (Live Stream) */}
          <div id={readerElementId} className="w-full h-full" />

          {/* Overlay Bingkai Scan Target Saat Live Streaming (Responsif HP) */}
          {!scannerError && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-[72%] h-[72%] max-w-[260px] max-h-[260px] aspect-square border-2 border-emerald-400/40 rounded-2xl sm:rounded-3xl">
                <div className="absolute -top-1 -left-1 w-6 h-6 sm:w-8 sm:h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl sm:rounded-tl-2xl"></div>
                <div className="absolute -top-1 -right-1 w-6 h-6 sm:w-8 sm:h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl sm:rounded-tr-2xl"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 sm:w-8 sm:h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl sm:rounded-bl-2xl"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-8 sm:h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl sm:rounded-br-2xl"></div>
                <div className="am-scan-laser-line absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34D399]"></div>
              </div>
            </div>
          )}

          {/* 💡 TAMPILAN SOLUSI JIKA BROWSER MEMBATASI LIVE VIDEO DI KONEKSI HTTP */}
          {scannerError && (
            <div className="absolute inset-0 p-5 flex flex-col items-center justify-center text-center bg-gray-950/95 z-20">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-3xl mb-3 shadow-lg">
                📸
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Pindai QR / Barcode</h4>
              <p className="text-xs text-gray-300 mb-4 leading-relaxed max-w-xs">
                {isHttpOrigin
                  ? 'Koneksi lokal HTTP membatasi video live. Tap tombol di bawah untuk langsung membuka kamera HP & jepret QR secara instan!'
                  : scannerError}
              </p>

              <div className="flex flex-col gap-2.5 w-full max-w-xs">
                {/* 🌟 TOMBOL UTAMA (HP): LANGSUNG BUKA KAMERA HP BAWAAN */}
                <button
                  onClick={() => {
                    triggerHaptic('medium');
                    cameraInputRef.current?.click();
                  }}
                  disabled={isScanningFile}
                  className="w-full py-3 px-4 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <span className="text-base">📸</span>
                  <span>{isScanningFile ? 'Memproses Foto...' : 'Buka Kamera HP & Jepret QR'}</span>
                </button>

                {/* 💻 TOMBOL KHUSUS LAPTOP: PINDAH KE LOCALHOST AGAR WEBCAM AKTIF LANGSUNG */}
                {typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname) && !/android|iphone|ipad/i.test(navigator.userAgent) && (
                  <button
                    onClick={() => {
                      window.location.href = window.location.href.replace(window.location.hostname, 'localhost');
                    }}
                    className="w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>💻</span>
                    <span>Buka via localhost (Nyalakan Webcam Laptop)</span>
                  </button>
                )}

                {/* TOMBOL KEDUA: PILIH DARI GALERI HP */}
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    galleryInputRef.current?.click();
                  }}
                  disabled={isScanningFile}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-gray-200 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <span>🖼️</span>
                  <span>Pilih Gambar dari Galeri / File</span>
                </button>
              </div>
            </div>
          )}

          {/* Floating Controls Saat Live Streaming */}
          {!scannerError && (
            <div className="absolute bottom-3 left-0 right-0 px-4 flex items-center justify-center gap-3 z-10">
              {cameras.length > 1 && (
                <button
                  onClick={handleSwitchCamera}
                  className="px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs font-semibold text-white flex items-center gap-1.5 shadow-md active:scale-95 transition-transform"
                >
                  <span>🔄</span>
                  <span>Ganti Kamera</span>
                </button>
              )}

              {hasTorch && (
                <button
                  onClick={handleToggleTorch}
                  className={`px-3.5 py-1.5 rounded-full backdrop-blur-md border text-xs font-semibold flex items-center gap-1.5 shadow-md active:scale-95 transition-all ${
                    isTorchOn
                      ? 'bg-amber-500 border-amber-400 text-gray-950 font-bold'
                      : 'bg-black/60 border-white/20 text-white'
                  }`}
                >
                  <span>{isTorchOn ? '🔦 Nyala' : '💡 Senter'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer: Opsi Alternatif Jepret / Galeri & Input Manual */}
        <div className="p-3.5 bg-gray-950 border-t border-gray-800 flex flex-col gap-2">
          {!scannerError && (
            <div className="flex items-center justify-around gap-2 text-xs">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center gap-1.5 text-gray-300 hover:text-white py-1 px-2.5 rounded-lg bg-gray-900 border border-gray-800"
              >
                <span>📸</span>
                <span>Jepret Foto</span>
              </button>
              <button
                onClick={() => galleryInputRef.current?.click()}
                className="flex items-center gap-1.5 text-gray-300 hover:text-white py-1 px-2.5 rounded-lg bg-gray-900 border border-gray-800"
              >
                <span>📁</span>
                <span>Pilih Galeri</span>
              </button>
            </div>
          )}

          {!showManualFallback ? (
            <button
              onClick={() => setShowManualFallback(true)}
              className="w-full text-center text-xs text-emerald-400 hover:text-emerald-300 font-semibold py-1 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Atau Ketik Kode Barcode/Token Manual</span>
              <span>✍️</span>
            </button>
          ) : (
            <form onSubmit={handleManualSubmit} className="flex gap-2 mt-1">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                placeholder="Contoh: BLIND-35K, ANTASARI-123..."
                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 font-mono font-bold focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md active:scale-95 transition-transform"
              >
                Gunakan
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
