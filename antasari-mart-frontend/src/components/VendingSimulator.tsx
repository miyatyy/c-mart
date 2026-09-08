import { useState } from 'react';
import Swal from 'sweetalert2';
import type { ThemeMode } from '../types';
import { claimVendingApi, checkoutApi } from '../lib/api';
import { playCuteVendingSpinningMusic, playCuteVendingSuccessJingle, playCuteVendingFullExperience } from '../lib/vendingAudio';

interface VendingSimulatorProps {
  theme: ThemeMode;
}

interface BlindBagSlot {
  slotNumber: number;
  seriesName: string;
  originalPrice: number;
  originalPriceFormatted: string;
  discountPercent: number;
  price: number;
  priceFormatted: string;
  rarity: string;
  mysteryHint: string;
  themeColor: string;
  badge: string;
  icon: string;
  demoToken: string;
  campus: string;
}

const BLIND_BAG_LOCKERS: BlindBagSlot[] = [
  {
    slotNumber: 1,
    seriesName: 'Blind Bag Series 1 (35K)',
    originalPrice: 40000,
    originalPriceFormatted: 'Rp 40.000',
    discountPercent: 13,
    price: 35000,
    priceFormatted: 'Rp 35.000',
    rarity: 'Common ~ Rare',
    mysteryHint: '❓ Karakter Misterius Rahasia (Blind Box)',
    themeColor: '#10B981',
    badge: '🥉 35K',
    icon: '🎁',
    demoToken: 'BLIND-35K',
    campus: 'Loker Kampus 1 & 2'
  },
  {
    slotNumber: 2,
    seriesName: 'Blind Bag Series 2 (40K)',
    originalPrice: 48000,
    originalPriceFormatted: 'Rp 48.000',
    discountPercent: 17,
    price: 40000,
    priceFormatted: 'Rp 40.000',
    rarity: 'Rare ~ Super Rare',
    mysteryHint: '❓ Ganci Rajut & Aksesoris Misteri',
    themeColor: '#3B82F6',
    badge: '🥈 40K',
    icon: '✨',
    demoToken: 'BLIND-40K',
    campus: 'Loker Kampus 1 & 2'
  },
  {
    slotNumber: 3,
    seriesName: 'Blind Bag Series 3 (45K)',
    originalPrice: 55000,
    originalPriceFormatted: 'Rp 55.000',
    discountPercent: 18,
    price: 45000,
    priceFormatted: 'Rp 45.000',
    rarity: 'Super Rare ~ Secret',
    mysteryHint: '❓ Edisi Khusus Handcrafted Kawat Bulu',
    themeColor: '#8B5CF6',
    badge: '🥇 45K',
    icon: '🔮',
    demoToken: 'BLIND-45K',
    campus: 'Loker Kampus 1 & 2'
  },
  {
    slotNumber: 4,
    seriesName: 'Blind Bag Series 4 (50K TOP)',
    originalPrice: 65000,
    originalPriceFormatted: 'Rp 65.000',
    discountPercent: 23,
    price: 50000,
    priceFormatted: 'Rp 50.000',
    rarity: 'Ultra Secret Special',
    mysteryHint: '❓ Koleksi Terbatas Super Gemas & Misterius',
    themeColor: '#F59E0B',
    badge: '👑 50K TOP',
    icon: '👑',
    demoToken: 'BLIND-50K',
    campus: 'Loker Kampus 1 & 2'
  }
];

const PROMO_VOUCHERS = [
  {
    code: 'BLINDBAGMISTERI',
    title: 'Diskon Rp 5.000',
    desc: 'Potongan langsung semua seri',
    badge: '🔥 POPULER',
    discountAmount: 5000,
    minOrder: 'Min. Rp 35.000',
    color: '#10B981'
  },
  {
    code: 'GACHASURPRISE',
    title: 'Diskon Rp 10.000',
    desc: 'Khusus Series 45K & 50K TOP',
    badge: '🎁 SPESIAL',
    discountAmount: 10000,
    minOrder: 'Min. Rp 45.000',
    color: '#8B5CF6'
  },
  {
    code: 'GRATISONGKIRLOKER',
    title: 'Bebas Admin Loker',
    desc: 'Potongan biaya sistem loker',
    badge: '✨ HEMAT',
    discountAmount: 2000,
    minOrder: 'Semua Seri',
    color: '#3B82F6'
  }
];

const VENDING_LOCATIONS = [
  {
    id: 1,
    campus: 'Kampus 1 Banjarmasin',
    spot: 'Lobby Gedung Syariah & Ekonomi Islam (Lantai 1)',
    hours: '24 Jam Non-Stop',
    lockersCount: '4 Pintu Loker Blind Bag',
    status: 'Online & Terisi 🟢',
    note: 'Dekat pintu masuk utama & ATM Center'
  },
  {
    id: 2,
    campus: 'Kampus 2 Banjarbaru',
    spot: 'Lobby Rektorat & Perpustakaan Terpadu (Lantai 1)',
    hours: '24 Jam Non-Stop',
    lockersCount: '4 Pintu Loker Blind Bag',
    status: 'Online & Terisi 🟢',
    note: 'Samping ruang tunggu mahasiswa & Koperasi'
  }
];

// 🔊 Suara gacha pengeluaran Blind Bag misterius
function playGachaSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const notes = [587.33, 783.99, 987.77, 1318.51];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.09);
      gain.gain.setValueAtTime(0.22, ctx.currentTime + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.09 + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.09);
      osc.stop(ctx.currentTime + i * 0.09 + 0.28);
    });
  } catch (_e) {}
}

// 🛍️ Komponen Visual Kemasan Plastik Blind Bag Pink Glossy Mewah
function GlossyPinkBlindBag({
  tierLabel = '35K',
  isOpened = false,
  size = 80,
}: {
  tierLabel?: string;
  isOpened?: boolean;
  size?: number;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        filter: isOpened
          ? 'drop-shadow(0 6px 16px rgba(16, 185, 129, 0.45))'
          : 'drop-shadow(0 8px 18px rgba(255, 105, 180, 0.45))',
        transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: isOpened ? 'scale(1.05) rotate(-2deg)' : 'scale(1)',
        userSelect: 'none'
      }}
    >
      <svg
        width={size}
        height={size * 1.25}
        viewBox="0 0 100 125"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Gradasi Pink Glossy Plastik Foil */}
          <linearGradient id={`pinkGlossyGrad_${tierLabel}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF9AC6" />
            <stop offset="22%" stopColor="#FF65A3" />
            <stop offset="48%" stopColor="#FFE0EC" />
            <stop offset="52%" stopColor="#FF4D94" />
            <stop offset="78%" stopColor="#FF1493" />
            <stop offset="100%" stopColor="#C2185B" />
          </linearGradient>

          {/* Gradasi Cahaya Kilap Pantulan Plastik */}
          <linearGradient id={`foilHighlight_${tierLabel}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.9)" />
            <stop offset="35%" stopColor="rgba(255, 255, 255, 0.25)" />
            <stop offset="70%" stopColor="rgba(255, 255, 255, 0)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0.7)" />
          </linearGradient>
        </defs>

        {/* Gerigi Seal Bagian Atas */}
        <path
          d="M 12 14 L 16 8 L 20 14 L 24 8 L 28 14 L 32 8 L 36 14 L 40 8 L 44 14 L 48 8 L 52 14 L 56 8 L 60 14 L 64 8 L 68 14 L 72 8 L 76 14 L 80 8 L 84 14 L 88 8 L 88 18 L 12 18 Z"
          fill="#AD1457"
        />

        {/* Badan Utama Plastik Blind Bag (Glossy Pink Foil) */}
        <rect
          x="12"
          y="16"
          width="76"
          height="88"
          rx="7"
          fill={`url(#pinkGlossyGrad_${tierLabel})`}
        />

        {/* Efek Kilau / Highlight Cahaya Plastik Melengkung */}
        <path
          d="M 16 18 C 38 18 42 45 42 100 L 26 100 C 26 50 20 28 16 18 Z"
          fill={`url(#foilHighlight_${tierLabel})`}
          opacity="0.7"
        />

        {/* Garis Lipatan Seal Samping */}
        <line x1="16" y1="18" x2="16" y2="102" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
        <line x1="84" y1="18" x2="84" y2="102" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" />

        {/* Seal Horizontal Press Atas & Bawah */}
        <line x1="12" y1="23" x2="88" y2="23" stroke="rgba(173, 20, 87, 0.7)" strokeWidth="2" strokeDasharray="3,2" />
        <line x1="12" y1="97" x2="88" y2="97" stroke="rgba(173, 20, 87, 0.7)" strokeWidth="2" strokeDasharray="3,2" />

        {/* Gerigi Seal Bagian Bawah */}
        <path
          d="M 12 100 L 16 106 L 20 100 L 24 106 L 28 100 L 32 106 L 36 100 L 40 106 L 44 100 L 48 106 L 52 100 L 56 106 L 60 100 L 64 106 L 68 100 L 72 106 L 76 100 L 80 106 L 84 100 L 88 106 L 88 98 L 12 98 Z"
          fill="#AD1457"
        />

        {/* Badge Tengah Mystery Secret Seal */}
        <circle cx="50" cy="58" r="23" fill="#FFFFFF" opacity="0.96" />
        <circle cx="50" cy="58" r="20" fill="#FFF0F5" stroke="#E91E63" strokeWidth="1.8" strokeDasharray="3,2" />

        {/* Ikon Tanda Tanya Misteri / Gembok Terbuka */}
        <text
          x="50"
          y="66"
          textAnchor="middle"
          fontSize="22"
          fontWeight="900"
          fill="#E91E63"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {isOpened ? '🔓' : '❓'}
        </text>

        {/* Teks Mini di Atas Lingkaran */}
        <text
          x="50"
          y="33"
          textAnchor="middle"
          fontSize="7.5"
          fontWeight="900"
          letterSpacing="0.8"
          fill="#FFFFFF"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          ★ BLIND BAG ★
        </text>

        {/* Teks Mini Tier di Bawah Lingkaran */}
        <rect x="28" y="83" width="44" height="11" rx="5.5" fill="#FFFFFF" opacity="0.95" />
        <text
          x="50"
          y="91.5"
          textAnchor="middle"
          fontSize="7.5"
          fontWeight="900"
          fill="#AD1457"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          SERIES {tierLabel}
        </text>

        {/* Sparkles / Bintang Kilap Emas */}
        <circle cx="27" cy="38" r="2" fill="#FFE082" />
        <circle cx="73" cy="74" r="2" fill="#FFE082" />
        <path d="M 72 36 L 74 38 L 72 40 L 70 38 Z" fill="#FFFFFF" />
        <path d="M 26 74 L 28 76 L 26 78 L 24 76 Z" fill="#FFFFFF" />
      </svg>
    </div>
  );
}

export default function VendingSimulator({ theme: _theme }: VendingSimulatorProps) {
  const [inputToken, setInputToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [dispenseData, setDispenseData] = useState<any>(null);
  const [openedSlot, setOpenedSlot] = useState<number | null>(null);
  const [isSpinningVisual, setIsSpinningVisual] = useState(false);
  const [spinningSlotNumber, setSpinningSlotNumber] = useState<number | null>(null);

  // 💳 Direct Payment State
  const [selectedSlotForPayment, setSelectedSlotForPayment] = useState<BlindBagSlot | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'qris' | 'va' | 'wallet' | 'cash'>('qris');
  const [appliedVoucher, setAppliedVoucher] = useState<string>('BLINDBAGMISTERI');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [esp32IpInput, setEsp32IpInput] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('am_esp32_ip') || '' : ''));
  const [purchaseQty, setPurchaseQty] = useState(1);

  // 🎵 Handler Uji Coba Musik Imut Mesin Vending Berputar di Speaker Laptop
  const handleTestSpinningWithMusic = (slotNumber: number = 1) => {
    setIsSpinningVisual(true);
    setSpinningSlotNumber(slotNumber);
    triggerEsp32Hardware(`ANTASARI-${Date.now()}`, 'Blind Bag Mystery Ganci', slotNumber, 1);

    // Mainkan musik ceria gacha saat berputar (2.8 detik)
    playCuteVendingFullExperience(2800, () => {
      setIsSpinningVisual(false);
      setOpenedSlot(slotNumber);
      Swal.fire({
        icon: 'success',
        title: '🎶 Mesin Berhasil Berputar! 🎁✨',
        html: `
          <div style="text-align: center; padding: 10px 14px; font-size: 13.5px;">
            <div style="font-size: 44px; margin-bottom: 8px;">🎉🎀🧸✨</div>
            <div style="font-weight: 800; color: #16A34A; font-size: 15px; margin-bottom: 6px;">
              Musik Imut & Rotasi Mesin Sukses 100%!
            </div>
            <p style="color: #4B5563; margin: 0 0 10px; line-height: 1.5;">
              Melodi ceria gachapon dan jingle kemenangan berhasil dimainkan melalui speaker laptop Anda.
            </p>
            <div style="background: #DCFCE7; padding: 8px 12px; border-radius: 8px; color: #166534; font-size: 12px; font-weight: 700;">
              🚪 Loker Slot #${slotNumber} terbuka & siap digunakan.
            </div>
          </div>
        `,
        confirmButtonColor: '#10B981',
        confirmButtonText: 'Keren Banget! 👍'
      });
    });
  };

  // Menghitung besaran diskon berdasarkan kupon yang sedang aktif dipakai
  const getVoucherDiscount = (slot: BlindBagSlot) => {
    if (appliedVoucher === 'BLINDBAGMISTERI') return 5000;
    if (appliedVoucher === 'GACHASURPRISE') {
      return slot.price >= 45000 ? 10000 : 0;
    }
    if (appliedVoucher === 'GRATISONGKIRLOKER') return 2000;
    return 0;
  };

  const calculateTotalPrice = (slot: BlindBagSlot, qty: number = 1) => {
    const discount = getVoucherDiscount(slot);
    return Math.max(0, (slot.price * qty) - discount);
  };

  // 🔥 Handler Klik Pakai / Klaim Kupon
  const handleApplyVoucher = (voucherCode: string) => {
    if (appliedVoucher === voucherCode) {
      // Toggle lepas kupon jika diklik lagi
      setAppliedVoucher('');
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: 'Kupon dilepas',
        showConfirmButton: false,
        timer: 1500
      });
      return;
    }

    setAppliedVoucher(voucherCode);
    const voucher = PROMO_VOUCHERS.find(v => v.code === voucherCode);

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `🎉 Kupon ${voucher?.title || voucherCode} Dipakai!`,
      text: 'Potongan otomatis diterapkan saat Anda membeli Blind Bag!',
      showConfirmButton: false,
      timer: 2300,
      timerProgressBar: true
    });
  };

    const triggerEsp32Hardware = (orderId?: string, productName?: string, slot?: number, quantity: number = 1) => {
    const finalQty = quantity || 1;
    const finalSlot = slot || 1;
    const prod = productName || 'Blind Bag Mystery Ganci';

    const payload = {
      orderId: orderId || `ANTASARI-${Date.now()}`,
      productName: prod,
      slotNumber: finalSlot,
      slot: finalSlot,
      quantity: finalQty,
      qty: finalQty,
      buyerName: 'Pembeli Antasari Mart'
    };

    // 1. Cloud MongoDB Atlas Queue Trigger
    fetch('https://ma-project-fix.vercel.app/api/vending/trigger-dispense', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json()).then(d => console.log('Vending simulator trigger OK:', d)).catch(e => console.warn('Trigger ESP32 cloud offline:', e));

    // 2. Direct Local WiFi IP Hook to ESP32 (Instant 0.01s)
    try {
      const savedIp = localStorage.getItem('am_esp32_ip');
      if (savedIp) {
        const cleanIp = savedIp.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        fetch(`http://${cleanIp}/dispense?slot=${finalSlot}&qty=${finalQty}`, { mode: 'no-cors' }).catch(() => {});
      }
    } catch (_e) {}
  };

  const handleSimulateClaim = async (tokenToUse?: string) => {
    const token = (tokenToUse || inputToken).trim();
    if (!token) {
      Swal.fire({
        icon: 'warning',
        title: 'Masukkan Token Loker',
        text: 'Silakan beli Blind Bag atau ketik kode token yang Anda miliki.',
        confirmButtonColor: '#5FA874'
      });
      return;
    }

    setLoading(true);
    setDispenseData(null);
    setIsSpinningVisual(true);
    setSpinningSlotNumber(1);

    // 🎵 Mainkan musik imut saat mesin berputar
    const stopMusic = playCuteVendingSpinningMusic(2600);
    triggerEsp32Hardware(`ANTASARI-${Date.now()}`, 'Blind Bag Mystery Ganci', 1, 2);

    try {
      // 1. Coba verifikasi dengan API Backend
      const data = await claimVendingApi(token);

      // Tunggu putaran motor & musik selesai
      await new Promise(r => setTimeout(r, 2600));
      setIsSpinningVisual(false);
      playCuteVendingSuccessJingle();

      if (data.success && data.dispense) {
        setDispenseData(data.dispense);
        setOpenedSlot(data.dispense.slotNumber || 1);

        Swal.fire({
          icon: 'success',
          title: 'Loker Terbuka! 🚪🎁',
          html: `
            <div style="text-align: left; background: #F0FDF4; padding: 14px 16px; border-radius: 14px; border: 1.5px solid #86EFAC; font-size: 13px;">
              <div style="font-size: 15px; font-weight: 800; color: #16A34A; margin-bottom: 4px;">
                🎉 ${data.dispense.productName || 'Blind Bag Keychain Misterius'}
              </div>
              <div style="color: #374151; margin-bottom: 4px;">
                <strong>🔢 Nomor Loker:</strong> <span style="color: #16A34A; font-weight: 800;">Slot #${data.dispense.slotNumber}</span>
              </div>
              <div style="color: #374151; margin-bottom: 8px;">
                <strong>👤 Penerima:</strong> ${data.dispense.buyerName || 'Pembeli'}
              </div>
              <div style="background: #DCFCE7; padding: 8px 10px; border-radius: 8px; color: #166534; font-size: 12px; font-weight: 600;">
                ✨ Pintu loker telah terbuka otomatis. Ambil Blind Bag kamu dan rasakan keseruan misteri gancinya! 🔮
              </div>
            </div>
          `,
          confirmButtonColor: '#16A34A',
          confirmButtonText: 'Ambil Blind Bag & Tutup'
        });
      } else {
        // Matching demo token Blind Bag
        const matchingDemo = BLIND_BAG_LOCKERS.find(d => 
          d.demoToken.toLowerCase() === token.toLowerCase() || 
          token.toLowerCase().includes(String(d.slotNumber))
        );

        if (matchingDemo) {
          const mockDispense = {
            orderId: `AM-${Date.now().toString().slice(-6)}`,
            slotNumber: matchingDemo.slotNumber,
            productName: matchingDemo.seriesName,
            price: matchingDemo.priceFormatted,
            buyerName: 'Pembeli Misteri',
            campus: 'Loker Kampus'
          };
          setDispenseData(mockDispense);
          setOpenedSlot(matchingDemo.slotNumber);

          Swal.fire({
            icon: 'success',
            title: `Pintu Loker Slot #${matchingDemo.slotNumber} Terbuka! 🚪✨`,
            html: `
              <div style="text-align: left; background: #F0FDF4; padding: 14px 16px; border-radius: 14px; border: 1.5px solid #86EFAC; font-size: 13px;">
                <div style="font-size: 15px; font-weight: 800; color: #16A34A; margin-bottom: 4px;">
                  🎁 ${matchingDemo.seriesName} (${matchingDemo.priceFormatted})
                </div>
                <div style="color: #374151; margin-bottom: 4px;">
                  <strong>🏷️ Tingkat Kelangkaan:</strong> ${matchingDemo.rarity}
                </div>
                <div style="color: #374151; margin-bottom: 8px;">
                  <strong>🔢 Nomor Slot:</strong> <span style="color: #16A34A; font-weight: 800;">Loker Slot #${matchingDemo.slotNumber}</span>
                </div>
                <div style="background: #DCFCE7; padding: 8px 10px; border-radius: 8px; color: #166534; font-size: 12px; font-weight: 600;">
                  🔮 Isi di dalamnya masih tersegel rahasia! Buka kemasannya dan lihat karakter ganci yang kamu dapatkan! ✨
                </div>
              </div>
            `,
            confirmButtonColor: '#16A34A',
            confirmButtonText: 'Ambil Blind Bag & Selesai'
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Token Tidak Dikenali ❌',
            text: 'Kode token salah atau sudah pernah diambil. Silakan gunakan token valid atau beli Blind Bag sekarang!',
            confirmButtonColor: '#EF4444'
          });
        }
      }
    } catch (_err) {
      setIsSpinningVisual(false);
      stopMusic();
      playCuteVendingSuccessJingle();
      // Fallback matching
      const matchingDemo = BLIND_BAG_LOCKERS.find(d => d.demoToken.toLowerCase() === token.toLowerCase()) || BLIND_BAG_LOCKERS[0];
      setDispenseData({
        orderId: `AM-${Date.now().toString().slice(-6)}`,
        slotNumber: matchingDemo.slotNumber,
        productName: matchingDemo.seriesName,
        price: matchingDemo.priceFormatted,
        buyerName: 'Pembeli Misteri'
      });
      setOpenedSlot(matchingDemo.slotNumber);

      Swal.fire({
        icon: 'success',
        title: `Loker Slot #${matchingDemo.slotNumber} Terbuka! 🚪✨`,
        text: `Mengeluarkan ${matchingDemo.seriesName}. Silakan ambil Blind Bag Anda!`,
        confirmButtonColor: '#16A34A'
      });
    } finally {
      setIsSpinningVisual(false);
      setLoading(false);
    }
  };

  // 💳 Helper penyelesaian transaksi & pengeluaran loker
  const completeVendingDispense = (generatedToken: string, finalPrice: number, slotData: BlindBagSlot, quantity: number = 1) => {
    // Simpan riwayat transaksi lokal
    const newTx = {
      id: `TX-${Date.now()}`,
      item: slotData.seriesName,
      price: finalPrice,
      paymentMethod: selectedPaymentMethod,
      token: generatedToken,
      slotNumber: slotData.slotNumber,
      date: new Date().toLocaleString('id-ID'),
      status: 'PAID & DISPENSED'
    };
    const existingTx = JSON.parse(localStorage.getItem('am_user_transactions') || '[]');
    existingTx.unshift(newTx);
    localStorage.setItem('am_user_transactions', JSON.stringify(existingTx));

    // Tutup modal checkout
    setSelectedSlotForPayment(null);
    setInputToken(generatedToken);

    // Animasi putar motor & musik imut
    setIsSpinningVisual(true);
    setSpinningSlotNumber(slotData.slotNumber);
    playCuteVendingSpinningMusic(2600);
    triggerEsp32Hardware(newTx.id, slotData.seriesName, slotData.slotNumber, quantity);

    setTimeout(() => {
      setIsSpinningVisual(false);
      playCuteVendingSuccessJingle();

      // Buka loker otomatis dengan token baru
      setDispenseData({
        orderId: newTx.id,
        slotNumber: slotData.slotNumber,
        productName: slotData.seriesName,
        price: `Rp ${finalPrice.toLocaleString('id-ID')}`,
        buyerName: 'Anda (Pembayaran Berhasil)'
      });
      setOpenedSlot(slotData.slotNumber);

      Swal.fire({
        icon: 'success',
        title: 'Pembayaran Sukses & Loker Terbuka! 💳🎉',
        html: `
          <div style="text-align: left; background: #F0FDF4; padding: 14px 16px; border-radius: 14px; border: 1.5px solid #86EFAC; font-size: 13px;">
            <div style="font-size: 14.5px; font-weight: 800; color: #16A34A; margin-bottom: 6px;">
              ✅ ${slotData.seriesName}
            </div>
            <div style="color: #374151; margin-bottom: 3px;">
              <strong>💰 Total Dibayar:</strong> Rp ${finalPrice.toLocaleString('id-ID')}
            </div>
            <div style="color: #374151; margin-bottom: 3px;">
              <strong>🔑 Kode Token Anda:</strong> <code style="background: #EAF5EE; color: #16A34A; font-weight: 800; padding: 2px 6px; border-radius: 4px;">${generatedToken}</code>
            </div>
            <div style="color: #374151; margin-bottom: 8px;">
              <strong>🚪 Nomor Loker:</strong> <span style="color: #16A34A; font-weight: 800;">Slot #${slotData.slotNumber}</span>
            </div>
            <div style="background: #DCFCE7; padding: 8px 10px; border-radius: 8px; color: #166534; font-size: 12px; font-weight: 700;">
              ✨ Pintu loker sudah dibuka! Silakan ambil Blind Bag kamu sekarang! 🎁
            </div>
          </div>
        `,
        confirmButtonColor: '#16A34A',
        confirmButtonText: 'Ambil Blind Bag & Selesai'
      });
    }, 2600);
  };

  // 💳 Proses Pembayaran Langsung untuk Membuka Loker
  const handleExecutePayment = async () => {
    if (!selectedSlotForPayment) return;

    setIsProcessingPayment(true);

    try {
      const generatedToken = `VEND-${selectedSlotForPayment.demoToken.split('-')[1]}-${Math.floor(1000 + Math.random() * 9000)}`;
      const finalPrice = calculateTotalPrice(selectedSlotForPayment, purchaseQty);
      const slotData = selectedSlotForPayment;
      const currentQty = purchaseQty;

      // 💳 Jika memilih QRIS / Midtrans & Snap SDK tersedia
      if (selectedPaymentMethod === 'qris' && typeof window !== 'undefined' && window.snap) {
        try {
          const res = await checkoutApi({
            grossAmount: finalPrice,
            customerDetails: { name: 'Pembeli Blind Bag' },
            items: [{ productId: `slot_${slotData.slotNumber}`, name: slotData.seriesName, price: finalPrice, quantity: currentQty }],
            deliveryMethod: 'vending'
          });

          if (res && res.token) {
            window.snap.pay(res.token, {
              onSuccess: () => {
                completeVendingDispense(generatedToken, finalPrice, slotData, currentQty);
              },
              onPending: () => {
                completeVendingDispense(generatedToken, finalPrice, slotData, currentQty);
              },
              onError: () => {
                Swal.fire({ icon: 'error', title: 'Pembayaran Dibatalkan', text: 'Silakan selesaikan pembayaran untuk membuka loker.' });
              },
              onClose: () => {
                completeVendingDispense(generatedToken, finalPrice, slotData, currentQty);
              }
            });
            return;
          }
        } catch (_err) {
          // Fallback instan
        }
      }

      completeVendingDispense(generatedToken, finalPrice, slotData, currentQty);
    } catch (_e) {
      Swal.fire({
        icon: 'error',
        title: 'Pembayaran Gagal',
        text: 'Silakan coba lagi.'
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div style={{ padding: '14px 12px 100px', maxWidth: 1000, margin: '0 auto', fontFamily: 'var(--am-font-body)' }}>
      <style>{`
        @keyframes lockerOpenAnim {
          0% { transform: scale(0.95); }
          50% { transform: scale(1.03); }
          100% { transform: scale(1); }
        }
        .locker-card-active {
          animation: lockerOpenAnim 0.4s ease-out;
          border-color: #10B981 !important;
          background: rgba(16, 185, 129, 0.08) !important;
        }
        .am-vending-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (max-width: 360px) {
          .am-vending-grid {
            gap: 8px;
          }
        }
      `}</style>

      {/* 🚀 HEADER UTAMA BLIND BAG VENDING LOCKER */}
      <div
        className="am-card"
        style={{
          background: 'linear-gradient(135deg, #1E2E24 0%, #2A4535 50%, #173224 100%)',
          color: '#FFFFFF',
          padding: '18px 16px',
          borderRadius: 20,
          marginBottom: 14,
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.12)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: 'white',
              fontSize: 10,
              fontWeight: 800,
              padding: '2px 7px',
              borderRadius: 6,
              letterSpacing: 0.3
            }}>
              ● LOKER 24 JAM
            </span>
            <span style={{ fontSize: 11, opacity: 0.9, fontWeight: 700 }}>UIN Antasari</span>
          </div>

          <h1 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 900, letterSpacing: -0.3, color: '#FFFFFF' }}>
            Blind Bag Keychain Locker 🎀✨
          </h1>
          <p style={{ margin: 0, fontSize: 11.5, color: 'rgba(255, 255, 255, 0.88)', lineHeight: 1.4, maxWidth: 580 }}>
            Pilih seri Blind Bag favoritmu, <strong>klaim kupon di bawah</strong>, dan bayar instan untuk membuka pintu loker otomatis! 🔮
          </p>
        </div>

        <div style={{
          position: 'absolute',
          right: -10,
          bottom: -15,
          fontSize: 85,
          opacity: 0.12,
          userSelect: 'none',
          pointerEvents: 'none'
        }}>
          🎁
        </div>
      </div>

      {/* 📡 KONTROLER HARDWARE ESP32 IOT */}
      <div style={{
        background: 'var(--am-surface)',
        border: '1.5px solid var(--am-border)',
        borderRadius: 16,
        padding: '12px 16px',
        marginBottom: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>🤖</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--am-text)' }}>
              Hardware ESP32 Vending IoT
            </div>
            <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>
              {esp32IpInput ? `Terhubung ke IP: ${esp32IpInput}` : 'Mode Cloud Otomatis (Hotspot Aktif)'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={() => {
              triggerEsp32Hardware(`ANTASARI-${Date.now()}`, 'Blind Bag Mystery Ganci', 1, 2);
              Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: '⚡ Sinyal Terkirim ke ESP32!',
                text: 'Motor Stepper berputar...',
                showConfirmButton: false,
                timer: 2000
              });
            }}
            style={{
              padding: '7px 14px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #5FA874 0%, #F4AEC2 100%)',
              color: 'white',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(95,168,116,0.3)'
            }}
          >
            ⚙️ Tes Putar Motor
          </button>
          
          <button
            onClick={() => {
              Swal.fire({
                title: '🔌 Hubungkan IP ESP32',
                html: `
                  <p style="font-size:13px;color:#64748B;margin-bottom:12px;">
                    Masukkan IP ESP32 dari Hotspot HP / Serial Monitor (contoh: <code>192.168.43.123</code>) agar website bisa memutar motor secara instan:
                  </p>
                  <input id="swal-esp32-ip" class="swal2-input" placeholder="Contoh: 192.168.43.123" value="${esp32IpInput}" style="font-size:14px;">
                `,
                showCancelButton: true,
                confirmButtonText: 'Simpan & Tes Putar',
                confirmButtonColor: '#5FA874',
                preConfirm: () => {
                  const input = (document.getElementById('swal-esp32-ip') as HTMLInputElement)?.value;
                  return input;
                }
              }).then((result) => {
                if (result.isConfirmed && result.value) {
                  const clean = result.value.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
                  setEsp32IpInput(clean);
                  localStorage.setItem('am_esp32_ip', clean);
                  fetch(`http://${clean}/dispense`, { mode: 'no-cors' }).catch(() => {});
                  Swal.fire({
                    icon: 'success',
                    title: 'Tersimpan!',
                    text: `IP ESP32 (${clean}) berhasil disimpan dan motor diuji putar!`,
                    confirmButtonColor: '#5FA874'
                  });
                }
              });
            }}
            style={{
              padding: '7px 12px',
              borderRadius: 10,
              border: '1px solid var(--am-border)',
              background: 'var(--am-bg2)',
              color: 'var(--am-text)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ⚙️ Atur IP
          </button>
        </div>
      </div>

      {/* 🎵 SPEAKER LAPTOP: MUSIK IMUT MESIN VENDING BERPUTAR (KAWAII GACHA SYNTH) */}
      <div style={{
        background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
        color: 'white',
        borderRadius: 16,
        padding: '14px 18px',
        marginBottom: 16,
        boxShadow: '0 8px 24px rgba(67, 56, 202, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #EC4899, #8B5CF6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            boxShadow: '0 4px 12px rgba(236, 72, 153, 0.35)',
            transform: isSpinningVisual ? 'rotate(360deg) scale(1.1)' : 'none',
            transition: 'transform 0.8s ease-in-out'
          }}>
            {isSpinningVisual ? '⚙️' : '🎵'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13.5, fontWeight: 900 }}>Speaker Laptop: Musik Imut Mesin Berputar</span>
              <span style={{ fontSize: 10, background: '#10B981', color: 'white', padding: '2px 7px', borderRadius: 6, fontWeight: 800 }}>
                ● AKTIF DI LAPTOP / HP
              </span>
            </div>
            <div style={{ fontSize: 11.5, opacity: 0.9, marginTop: 2 }}>
              {isSpinningVisual
                ? '🎶 Sedang memutar melodi gacha imut saat motor spiral berputar...'
                : 'Musik ceria & jingle gashapon manis otomatis berbunyi di speaker laptop saat mesin berputar! ✨'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => handleTestSpinningWithMusic(1)}
            disabled={isSpinningVisual}
            style={{
              padding: '9px 18px',
              borderRadius: 12,
              border: 'none',
              background: isSpinningVisual ? '#475569' : 'linear-gradient(135deg, #EC4899, #F43F5E)',
              color: 'white',
              fontSize: 12.5,
              fontWeight: 800,
              cursor: isSpinningVisual ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(244, 63, 94, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'transform 0.15s ease'
            }}
          >
            <span>{isSpinningVisual ? '⏳ Mesin Berputar...' : '▶️ Uji Coba Musik Imut (Putar Mesin) 🎶'}</span>
          </button>
        </div>
      </div>

      {/* 🌸 MODAL ANIMASI SPESIAL: MESIN VENDING BERPUTAR DENGAN MUSIK IMUT */}
      {isSpinningVisual && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF1F2 100%)',
            borderRadius: 24,
            padding: '32px 28px',
            maxWidth: 420,
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
            border: '2px solid #F43F5E',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Cute Floating Music Notes */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, fontSize: 24, marginBottom: 12 }}>
              <span style={{ animation: 'bounce 0.8s infinite alternate' }}>🎵</span>
              <span style={{ animation: 'bounce 0.8s 0.2s infinite alternate' }}>🎶</span>
              <span style={{ animation: 'bounce 0.8s 0.4s infinite alternate' }}>✨</span>
              <span style={{ animation: 'bounce 0.8s 0.6s infinite alternate' }}>🌸</span>
            </div>

            {/* Rotating Gear / Spiral Animation */}
            <div style={{
              width: 96,
              height: 96,
              margin: '0 auto 16px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FFE4E6, #FCE7F3)',
              border: '4px dashed #F43F5E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
              animation: 'spin 2s linear infinite'
            }}>
              ⚙️
            </div>

            <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 900, color: '#9F1239' }}>
              Mesin Sedang Berputar... 🎀
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#881337', lineHeight: 1.5 }}>
              🎶 Musik imut sedang dimainkan melalui <strong>speaker laptop</strong> Anda. Motor spiral sedang menurunkan paket Blind Bag dari <strong>Slot #{spinningSlotNumber || 1}</strong>!
            </p>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#FFE4E6',
              padding: '6px 16px',
              borderRadius: 20,
              color: '#E11D48',
              fontSize: 12,
              fontWeight: 800
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F43F5E' }} />
              <span>Memutar Musik Kawaii & Mengeluarkan Paket...</span>
            </div>
          </div>
        </div>
      )}

      {/* 🎟️ KUPON PROMO RINGKAS DENGAN FITUR "PAKAI / KLAIM" LANGSUNG */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 15 }}>🎟️</span>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--am-text, #2D3748)' }}>
              Kupon Promo Spesial (Klaim & Pakai)
            </span>
          </div>
          <span style={{ fontSize: 10, color: 'var(--am-primary, #5FA874)', fontWeight: 700 }}>Pilih kupon ➔</span>
        </div>

        {/* Horizontal Scrollable Mini Chips */}
        <div style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 4,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          {PROMO_VOUCHERS.map((voucher) => {
            const isApplied = appliedVoucher === voucher.code;

            return (
              <div
                key={voucher.code}
                onClick={() => handleApplyVoucher(voucher.code)}
                style={{
                  flexShrink: 0,
                  background: isApplied ? 'var(--am-primary-light, #EAF5EE)' : 'var(--am-surface, #ffffff)',
                  border: isApplied ? '1.5px solid var(--am-primary, #10B981)' : '1px solid var(--am-border, #E1ECE4)',
                  borderRadius: 12,
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: isApplied ? '0 3px 10px rgba(16, 185, 129, 0.2)' : '0 2px 6px rgba(0,0,0,0.03)',
                  cursor: 'pointer',
                  maxWidth: 245,
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  background: isApplied ? '#10B981' : voucher.color,
                  color: 'white',
                  fontSize: 9,
                  fontWeight: 900,
                  padding: '3px 6px',
                  borderRadius: 6,
                  letterSpacing: 0.3
                }}>
                  {voucher.badge}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: isApplied ? '#065F46' : 'var(--am-text, #2D3748)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {voucher.title}
                  </div>
                  <div style={{ fontSize: 9.5, color: isApplied ? '#047857' : 'var(--am-text-muted, #687D70)' }}>
                    {voucher.desc}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApplyVoucher(voucher.code);
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: 'none',
                    background: isApplied ? '#10B981' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    color: 'white',
                    fontSize: 10,
                    fontWeight: 800,
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: isApplied ? 'none' : '0 2px 6px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  {isApplied ? 'Dipakai ✓' : 'Pakai ⚡'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 📥 KARTU INPUT TOKEN KLAIM (BAGI YANG SUDAH PUNYA TOKEN) */}
      <div
        className="am-card"
        style={{
          background: 'var(--am-surface, #ffffff)',
          border: '1.5px solid var(--am-primary, #5FA874)',
          padding: '14px 16px',
          borderRadius: 16,
          marginBottom: 18,
          boxShadow: '0 3px 12px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: 'var(--am-primary-light, #EAF5EE)',
            color: 'var(--am-primary, #5FA874)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 17,
            flexShrink: 0
          }}>
            🔑
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--am-text, #2D3748)' }}>
              Punya Kode Token? Masukkan di Sini
            </h3>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--am-text-muted, #687D70)' }}>
              Ketik kode token pesanan untuk membuka pintu loker instan
            </p>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSimulateClaim(); }} style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            placeholder="Contoh: BLIND-35K, BLIND-40K..."
            value={inputToken}
            onChange={e => setInputToken(e.target.value.toUpperCase())}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 10,
              border: '1.5px solid var(--am-border, #E1ECE4)',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.8,
              outline: 'none',
              background: 'var(--am-bg2, #F0F7F2)',
              color: 'var(--am-text, #243329)',
              boxSizing: 'border-box'
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #5FA874 0%, #4D9562 100%)',
              color: 'white',
              fontSize: 12.5,
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 3px 10px rgba(95, 168, 116, 0.3)',
              flexShrink: 0
            }}
          >
            {loading ? '...' : 'Buka Loker 🚀'}
          </button>
        </form>

        {/* LOG DISPENSE */}
        {dispenseData && (
          <div style={{
            marginTop: 12,
            padding: '10px 12px',
            borderRadius: 12,
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1.5px solid #10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 6,
            animation: 'lockerOpenAnim 0.3s ease-out'
          }}>
            <div>
              <div style={{ fontWeight: 800, color: '#065F46', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>✅ Pintu Loker Terbuka</span>
                <span style={{ background: '#10B981', color: 'white', fontSize: 9.5, padding: '1px 5px', borderRadius: 4 }}>
                  Slot #{dispenseData.slotNumber}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#047857', marginTop: 2 }}>
                {dispenseData.productName} • <strong>Siap Diambil</strong>
              </div>
            </div>
            <button
              onClick={() => {
                setDispenseData(null);
                setOpenedSlot(null);
                setInputToken('');
              }}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: 'none',
                background: '#10B981',
                color: 'white',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Tutup ✕
            </button>
          </div>
        )}
      </div>

      {/* 🗄️ RAK SIMULASI 2 KOLOM BLIND BAG KEYCHAIN (PERSIS HALAMAN UTAMA) */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 900, color: 'var(--am-text, #2D3748)' }}>
              Koleksi Blind Bag Loker 🛍️
            </h3>
            <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--am-text-muted, #687D70)' }}>
              Pilih seri favorit & bayar langsung untuk membuka loker
            </p>
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--am-primary)', background: 'var(--am-primary-light)', padding: '3px 8px', borderRadius: 8 }}>
            4 Seri Tersedia
          </span>
        </div>

        {/* 🌟 GRID 2 KOLOM PERSIS HALAMAN UTAMA */}
        <div className="am-vending-grid">
          {BLIND_BAG_LOCKERS.map((locker) => {
            const isThisOpened = openedSlot === locker.slotNumber;

            return (
              <div
                key={locker.slotNumber}
                className={`am-card ${isThisOpened ? 'locker-card-active' : ''}`}
                style={{
                  background: 'var(--am-surface, #ffffff)',
                  border: isThisOpened ? '2px solid #10B981' : `1px solid var(--am-border, #E1ECE4)`,
                  borderRadius: 16,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isThisOpened ? '0 8px 24px rgba(16, 185, 129, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
                  transition: 'transform 0.2s ease',
                  position: 'relative'
                }}
              >
                <div>
                  {/* 🖼️ GAMBAR FULL KOLOM SESUAI RASIO */}
                  <div style={{
                    width: '100%',
                    height: 155,
                    position: 'relative',
                    overflow: 'hidden',
                    background: 'linear-gradient(135deg, #FFF0F5 0%, #FCE7F3 50%, #FDF2F8 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottom: '1px solid var(--am-border, #E1ECE4)'
                  }}>
                    {/* Badge Nomor Slot di Kiri Atas */}
                    <div style={{
                      position: 'absolute',
                      top: 7,
                      left: 7,
                      background: isThisOpened ? '#10B981' : 'rgba(30, 46, 36, 0.85)',
                      backdropFilter: 'blur(4px)',
                      color: 'white',
                      fontSize: 9.5,
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: 6,
                      zIndex: 3,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                    }}>
                      {isThisOpened ? '🔓 TERBUKA' : `🚪 SLOT #${locker.slotNumber}`}
                    </div>

                    {/* Badge Diskon Merah di Kanan Atas */}
                    <div style={{
                      position: 'absolute',
                      top: 7,
                      right: 7,
                      background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                      color: 'white',
                      fontSize: 9.5,
                      fontWeight: 900,
                      padding: '2px 7px',
                      borderRadius: 6,
                      zIndex: 3,
                      boxShadow: '0 2px 6px rgba(239, 68, 68, 0.35)',
                      letterSpacing: 0.3
                    }}>
                      -{locker.discountPercent}%
                    </div>

                    {/* Visual Kemasan Plastik Blind Bag Pink Glossy */}
                    <div style={{ transform: 'translateY(4px)' }}>
                      <GlossyPinkBlindBag
                        tierLabel={locker.demoToken.split('-')[1] || `${locker.price / 1000}K`}
                        isOpened={isThisOpened}
                        size={78}
                      />
                    </div>
                  </div>

                  {/* 📝 INFO KONTEN PRODUK BLIND BAG */}
                  <div style={{ padding: '10px 10px 6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 10, color: 'var(--am-primary, #5FA874)', fontWeight: 800 }}>
                        {locker.rarity}
                      </span>
                      <span style={{
                        fontSize: 8.5,
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: 4,
                        background: locker.themeColor,
                        color: 'white'
                      }}>
                        {locker.badge}
                      </span>
                    </div>

                    <h4 style={{
                      margin: '0 0 4px',
                      fontSize: 12.5,
                      fontWeight: 800,
                      color: 'var(--am-text, #2D3748)',
                      lineHeight: 1.25,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {locker.seriesName}
                    </h4>

                    {/* Deskripsi Misteri Singkat */}
                    <p style={{
                      fontSize: 10,
                      color: 'var(--am-text-muted, #687D70)',
                      margin: '0 0 6px',
                      lineHeight: 1.3,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {locker.mysteryHint}
                    </p>

                    {/* Harga Coret & Harga Diskon */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
                      <div style={{ fontWeight: 900, fontSize: 14.5, color: locker.themeColor }}>
                        {locker.priceFormatted}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--am-text-muted, #9CA3AF)', textDecoration: 'line-through', fontWeight: 600 }}>
                        {locker.originalPriceFormatted}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 🔘 TOMBOL AKSI */}
                <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <button
                    onClick={() => setSelectedSlotForPayment(locker)}
                    style={{
                      width: '100%',
                      padding: '8px 6px',
                      borderRadius: 10,
                      border: 'none',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: 'white',
                      fontSize: 11.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                    }}
                  >
                    <span>💳 Beli & Buka</span>
                  </button>

                  <button
                    onClick={() => {
                      setInputToken(locker.demoToken);
                      handleSimulateClaim(locker.demoToken);
                    }}
                    style={{
                      width: '100%',
                      padding: '5px 6px',
                      borderRadius: 8,
                      border: '1px solid var(--am-border, #E1ECE4)',
                      background: 'var(--am-bg2, #F0F7F2)',
                      color: 'var(--am-text-muted, #687D70)',
                      fontSize: 9.5,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    ⚡ Demo ({locker.demoToken})
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 💳 MODAL PEMBAYARAN LANGSUNG BLIND BAG */}
      {selectedSlotForPayment && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: 16,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'var(--am-surface, #ffffff)',
            color: 'var(--am-text, #243329)',
            borderRadius: 22,
            padding: '20px',
            maxWidth: 420,
            width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            border: '1.5px solid var(--am-primary, #5FA874)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>🛍️</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900 }}>Pembayaran Blind Bag</h3>
                  <div style={{ fontSize: 11, color: 'var(--am-text-muted, #687D70)' }}>Slot #{selectedSlotForPayment.slotNumber} Loker Kampus</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedSlotForPayment(null)}
                style={{
                  background: 'var(--am-bg2, #F0F7F2)',
                  border: 'none',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: 15,
                  color: 'var(--am-text-muted, #687D70)'
                }}
              >
                ✕
              </button>
            </div>

            {/* Rincian Produk Misterius */}
            <div style={{
              background: 'var(--am-bg2, #F0F7F2)',
              borderRadius: 14,
              padding: '10px 12px',
              marginBottom: 12,
              border: '1px solid var(--am-border, #E1ECE4)',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <GlossyPinkBlindBag
                tierLabel={selectedSlotForPayment.demoToken.split('-')[1] || `${selectedSlotForPayment.price / 1000}K`}
                size={48}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                  <span style={{ fontWeight: 800, fontSize: 13 }}>{selectedSlotForPayment.seriesName}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--am-text-muted, #9CA3AF)', textDecoration: 'line-through', fontWeight: 600 }}>
                      {selectedSlotForPayment.originalPriceFormatted}
                    </div>
                    <div style={{ fontWeight: 900, color: selectedSlotForPayment.themeColor, fontSize: 13 }}>
                      {selectedSlotForPayment.priceFormatted} <span style={{ fontSize: 9.5, color: '#EF4444', fontWeight: 800 }}>(-{selectedSlotForPayment.discountPercent}%)</span>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--am-text-muted, #687D70)' }}>
                  {selectedSlotForPayment.mysteryHint}
                </div>
              </div>
            </div>

            {/* Pilihan Metode Pembayaran */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 6 }}>Pilih Metode Pembayaran:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('qris')}
                  style={{
                    padding: '8px',
                    borderRadius: 10,
                    border: selectedPaymentMethod === 'qris' ? '2px solid var(--am-primary, #5FA874)' : '1px solid var(--am-border, #E1ECE4)',
                    background: selectedPaymentMethod === 'qris' ? 'var(--am-primary-light, #EAF5EE)' : 'var(--am-surface, #ffffff)',
                    color: 'var(--am-text, #243329)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  <span style={{ fontSize: 16 }}>📱</span>
                  <span>QRIS Instan</span>
                  <span style={{ fontSize: 8.5, color: '#16A34A', fontWeight: 800 }}>OVO/GoPay/Shopee</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('va')}
                  style={{
                    padding: '8px',
                    borderRadius: 10,
                    border: selectedPaymentMethod === 'va' ? '2px solid var(--am-primary, #5FA874)' : '1px solid var(--am-border, #E1ECE4)',
                    background: selectedPaymentMethod === 'va' ? 'var(--am-primary-light, #EAF5EE)' : 'var(--am-surface, #ffffff)',
                    color: 'var(--am-text, #243329)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  <span style={{ fontSize: 16 }}>🏛️</span>
                  <span>Virtual Account</span>
                  <span style={{ fontSize: 8.5, color: 'var(--am-text-muted, #687D70)' }}>BSI/Mandiri/BRI</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('wallet')}
                  style={{
                    padding: '8px',
                    borderRadius: 10,
                    border: selectedPaymentMethod === 'wallet' ? '2px solid var(--am-primary, #5FA874)' : '1px solid var(--am-border, #E1ECE4)',
                    background: selectedPaymentMethod === 'wallet' ? 'var(--am-primary-light, #EAF5EE)' : 'var(--am-surface, #ffffff)',
                    color: 'var(--am-text, #243329)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  <span style={{ fontSize: 16 }}>🪙</span>
                  <span>Antasari Pay</span>
                  <span style={{ fontSize: 8.5, color: '#16A34A', fontWeight: 800 }}>Saldo Kampus</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('cash')}
                  style={{
                    padding: '8px',
                    borderRadius: 10,
                    border: selectedPaymentMethod === 'cash' ? '2px solid var(--am-primary, #5FA874)' : '1px solid var(--am-border, #E1ECE4)',
                    background: selectedPaymentMethod === 'cash' ? 'var(--am-primary-light, #EAF5EE)' : 'var(--am-surface, #ffffff)',
                    color: 'var(--am-text, #243329)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  <span style={{ fontSize: 16 }}>💵</span>
                  <span>Loket Koperasi</span>
                  <span style={{ fontSize: 8.5, color: 'var(--am-text-muted, #687D70)' }}>Bayar di Lokasi</span>
                </button>
              </div>
            </div>

                        {/* 🔢 Pilih Jumlah / Qty Blind Bag */}
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--am-bg2, #F0F7F2)', padding: '8px 12px', borderRadius: 10, border: '1px solid var(--am-border, #E1ECE4)' }}>
              <span style={{ fontWeight: 800, fontSize: 12, color: 'var(--am-text, #2D3748)' }}>🔢 Jumlah Pembelian:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setPurchaseQty(Math.max(1, purchaseQty - 1))}
                  style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--am-border)', background: 'white', fontWeight: 900, cursor: 'pointer' }}
                >
                  -
                </button>
                <span style={{ fontWeight: 900, fontSize: 14, minWidth: 24, textAlign: 'center', color: 'var(--am-text, #2D3748)' }}>
                  {purchaseQty}
                </span>
                <button
                  type="button"
                  onClick={() => setPurchaseQty(Math.min(10, purchaseQty + 1))}
                  style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--am-border)', background: 'white', fontWeight: 900, cursor: 'pointer' }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Pilihan Kupon Diskon Interaktif */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontWeight: 800, fontSize: 11.5 }}>Kupon Promo Aktif:</span>
                {appliedVoucher && (
                  <span style={{ fontSize: 10.5, color: '#16A34A', fontWeight: 700 }}>
                    Hemat Rp {getVoucherDiscount(selectedSlotForPayment).toLocaleString('id-ID')} 🎉
                  </span>
                )}
              </div>

              {/* Daftar Pilihan Kupon Cepat */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {PROMO_VOUCHERS.map((v) => {
                  const isVoucherActive = appliedVoucher === v.code;
                  return (
                    <div
                      key={v.code}
                      onClick={() => handleApplyVoucher(v.code)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        background: isVoucherActive ? 'rgba(16, 185, 129, 0.12)' : 'var(--am-bg2, #F0F7F2)',
                        border: isVoucherActive ? '1.5px solid #10B981' : '1px solid var(--am-border, #E1ECE4)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12 }}>🎟️</span>
                        <span style={{ fontWeight: 800, fontSize: 11, color: isVoucherActive ? '#065F46' : 'var(--am-text, #2D3748)' }}>
                          {v.title}
                        </span>
                      </div>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: isVoucherActive ? '#10B981' : 'var(--am-primary, #5FA874)',
                        background: isVoucherActive ? '#DCFCE7' : 'transparent',
                        padding: '2px 6px',
                        borderRadius: 4
                      }}>
                        {isVoucherActive ? 'Dipakai ✓' : 'Pilih'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rincian Total */}
            <div style={{ borderTop: '1px solid var(--am-border, #E1ECE4)', paddingTop: 10, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--am-text-muted, #687D70)', marginBottom: 3 }}>
                <span>Harga Blind Bag</span>
                <span>{selectedSlotForPayment.priceFormatted}</span>
              </div>
              {getVoucherDiscount(selectedSlotForPayment) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#16A34A', marginBottom: 4 }}>
                  <span>Potongan Kupon ({appliedVoucher})</span>
                  <span>-Rp {getVoucherDiscount(selectedSlotForPayment).toLocaleString('id-ID')}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 900, color: 'var(--am-text, #2D3748)' }}>
                <span>Total Pembayaran ({purchaseQty} Pcs)</span>
                <span style={{ color: '#10B981' }}>Rp {calculateTotalPrice(selectedSlotForPayment, purchaseQty).toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Tombol Konfirmasi Bayar & Buka Loker */}
            <button
              onClick={handleExecutePayment}
              disabled={isProcessingPayment}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: 'white',
                fontSize: 13,
                fontWeight: 900,
                cursor: isProcessingPayment ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
              }}
            >
              {isProcessingPayment ? 'Memproses Transaksi...' : '🚀 Bayar Sekarang & Buka Loker'}
            </button>
          </div>
        </div>
      )}

      {/* 📍 TITIK LOKASI MESIN LOKER */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 18 }}>📍</span>
          <div>
            <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: 'var(--am-text, #2D3748)' }}>
              Lokasi Mesin Loker Blind Bag Kampus
            </h3>
            <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--am-text-muted, #687D70)' }}>
              Titik pengambilan otomatis di Kampus 1 & Kampus 2
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
          {VENDING_LOCATIONS.map((loc) => (
            <div
              key={loc.id}
              className="am-card"
              style={{
                background: 'var(--am-surface, #ffffff)',
                border: '1px solid var(--am-border, #E1ECE4)',
                borderRadius: 14,
                padding: '12px 14px',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--am-primary, #5FA874)' }}>
                  🏛️ {loc.campus}
                </span>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: '#059669', background: '#DCFCE7', padding: '1px 5px', borderRadius: 4 }}>
                  {loc.status}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--am-text, #2D3748)', marginBottom: 3 }}>
                {loc.spot}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--am-text-muted, #687D70)', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <div>⏰ Operasional: <strong>{loc.hours}</strong></div>
                <div>🗄️ Unit: <strong>{loc.lockersCount}</strong></div>
                <div>📌 Lokasi: <em>{loc.note}</em></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 📖 PANDUAN CARA BELI & AMBIL BLIND BAG */}
      <div
        className="am-card"
        style={{
          background: 'var(--am-surface, #ffffff)',
          border: '1px solid var(--am-border, #E1ECE4)',
          borderRadius: 16,
          padding: '16px',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
        }}
      >
        <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800, color: 'var(--am-text, #2D3748)' }}>
          💡 Cara Membeli & Mengambil di Loker
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          <div style={{ background: 'var(--am-bg2, #F0F7F2)', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--am-border, #E1ECE4)' }}>
            <div style={{ fontSize: 20, marginBottom: 2 }}>1️⃣</div>
            <div style={{ fontWeight: 800, fontSize: 12, color: 'var(--am-text, #2D3748)', marginBottom: 2 }}>Pilih Seri Blind Bag</div>
            <div style={{ fontSize: 10.5, color: 'var(--am-text-muted, #687D70)', lineHeight: 1.35 }}>
              Pilih seri <strong>35K, 40K, 45K, atau 50K</strong> lalu klik tombol <strong>💳 Beli & Buka</strong>.
            </div>
          </div>
          <div style={{ background: 'var(--am-bg2, #F0F7F2)', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--am-border, #E1ECE4)' }}>
            <div style={{ fontSize: 20, marginBottom: 2 }}>2️⃣</div>
            <div style={{ fontWeight: 800, fontSize: 12, color: 'var(--am-text, #2D3748)', marginBottom: 2 }}>Bayar via QRIS / VA</div>
            <div style={{ fontSize: 10.5, color: 'var(--am-text-muted, #687D70)', lineHeight: 1.35 }}>
              Pilih metode bayar (QRIS / Bank VA / Saldo) dan dapatkan <strong>Kode Token Unik</strong> Anda.
            </div>
          </div>
          <div style={{ background: 'var(--am-bg2, #F0F7F2)', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--am-border, #E1ECE4)' }}>
            <div style={{ fontSize: 20, marginBottom: 2 }}>3️⃣</div>
            <div style={{ fontWeight: 800, fontSize: 12, color: 'var(--am-text, #2D3748)', marginBottom: 2 }}>Pintu Loker Terbuka!</div>
            <div style={{ fontSize: 10.5, color: 'var(--am-text-muted, #687D70)', lineHeight: 1.35 }}>
              Pintu loker terbuka otomatis dan <strong>nikmati kejutan Blind Bag Keychain kamu! 🎁✨</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
