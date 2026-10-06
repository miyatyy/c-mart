import { useState, useEffect } from 'react';
import type { CartItem, DeliveryMethod, PaymentMethod, ThemeMode, Campus, SellerCoupon } from '../types';
import { formatRupiah } from '../data';
import { QRCodeSVG } from 'qrcode.react';
import { checkoutApi, deductStockApi, getVouchersApi, validateVoucherApi, MIDTRANS_CLIENT_KEY } from '../lib/api';
import { playCuteVendingSpinningMusic, playCuteVendingSuccessJingle } from '../lib/vendingAudio';
import { cleanupSnapOverlays, loadSnapScript } from '../lib/snapCleanup';
import { isUserProductOwner } from '../lib/productOwnership';

declare global {
  interface Window {
    snap: any;
  }
}

interface CheckoutProps {
  theme: ThemeMode;
  campus: Campus;
  items: CartItem[];
  onConfirmOrder: (method: DeliveryMethod, payment: PaymentMethod, location: string) => void;
  onBack: () => void;
}

function playCelebrationFanfare() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Jingle Nada Kemenangan Ceria (C5 -> E5 -> G5 -> C6)
    const melody = [
      { f: 523.25, d: 0.12, t: 0 },
      { f: 659.25, d: 0.12, t: 0.12 },
      { f: 783.99, d: 0.15, t: 0.24 },
      { f: 1046.50, d: 0.45, t: 0.39 }
    ];

    melody.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, ctx.currentTime + note.t);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + note.t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.t + note.d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + note.t);
      osc.stop(ctx.currentTime + note.t + note.d);
    });
  } catch (_e) {}
}

function speakVoice(text: string) {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1.05;
    utterance.pitch = 1.25;
    window.speechSynthesis.speak(utterance);
  } catch (_e) {}
}

export default function Checkout({ theme: _theme, campus, items, onConfirmOrder, onBack }: CheckoutProps) {
  // 🔑 STRICT: HANYA produk Gantungan Kunci / Ganci / Blind Bag Keychain yang boleh Vending Machine
  const isGanciOrKeychain = (p: any) => {
    if (!p) return false;
    const name = (p.name || p.nama_produk || '').toLowerCase();
    const id = (p.id || '').toLowerCase();

    return (
      id === 'blind_bag_myammiy_35k' ||
      id.includes('ganci') ||
      id.includes('blind_bag') ||
      name.includes('ganci') ||
      name.includes('gantungan') ||
      name.includes('blind bag') ||
      name.includes('blindbag') ||
      name.includes('keychain') ||
      name.includes('kawat bulu') ||
      name.includes('pipe cleaner')
    );
  };

  const isOnlyGanciInCart = items.length > 0 && items.every(i => isGanciOrKeychain(i.product));

  const [delivery, setDelivery] = useState<DeliveryMethod | 'vending'>(() => {
    const saved = (typeof window !== 'undefined' ? localStorage.getItem('am_delivery_method') : '')?.toLowerCase();
    if (saved === 'vending' && isOnlyGanciInCart) return 'vending';
    if (saved === 'courier' || saved === 'delivery' || saved === 'antar') return 'courier';
    if (saved === 'pickup') return 'pickup';
    return isOnlyGanciInCart ? 'vending' : 'pickup';
  });
  const [payment, setPayment] = useState<PaymentMethod | 'seabank' | 'gopay' | 'campus_wallet' | 'qris_sim'>('qris_sim');
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    const saved = localStorage.getItem('am_wallet_balance');
    return saved ? Number(saved) : 250000;
  });
  const [qrisSecsLeft, setQrisSecsLeft] = useState(300);

  // Dynamic QRIS countdown
  useEffect(() => {
    if (payment === 'qris_sim') {
      const interval = setInterval(() => {
        setQrisSecsLeft(prev => (prev > 0 ? prev - 1 : 300));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [payment]);
  
  const [selectedDropdownLocation, setSelectedDropdownLocation] = useState('');
  const [customLocationText, setCustomLocationText] = useState('');
  const [isCustomLocation, setIsCustomLocation] = useState(false);

  const [step, setStep] = useState<'form' | 'searching_driver' | 'success' | 'vending_qr' | 'vending_dispensing' | 'vending_done' | 'receipt_pickup'>('form');
  const [countdown, setCountdown] = useState(10);
  const [loadingPayment, setLoadingPayment] = useState(false);

  // Coupon / Voucher promotion states
  const [appliedCoupon, setAppliedCoupon] = useState<SellerCoupon | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [deliveryDiscount, setDeliveryDiscount] = useState<number>(0);
  const [couponInput, setCouponInput] = useState<string>('');
  const [couponLoading, setCouponLoading] = useState<boolean>(false);
  const [couponMsg, setCouponMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<SellerCoupon[]>([]);
  const [showCouponList, setShowCouponList] = useState<boolean>(false);

  const [vendingData, setVendingResult] = useState<{
    vendingToken: string;
    slotNumber: number;
    orderId: string;
  } | null>(null);

  const [receiptData, setReceiptData] = useState<{
    orderId: string;
    queueNumber: string;
    total: number;
  } | null>(null);

  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const rawDeliveryFee = delivery === 'courier' ? 5000 : 0;
  const finalDeliveryFee = Math.max(0, rawDeliveryFee - deliveryDiscount);
  const total = Math.max(0, subtotal - discountAmount + (delivery === 'vending' || delivery === 'pickup' ? 0 : finalDeliveryFee));
  const totalSavings = discountAmount + (delivery === 'courier' ? deliveryDiscount : 0);

  // Load available coupons and applied coupon from sessionStorage
  useEffect(() => {
    getVouchersApi(undefined, true).then(res => {
      if (res && res.success && res.vouchers) {
        setAvailableCoupons(res.vouchers);
      }
    }).catch(() => {});

    try {
      const saved = sessionStorage.getItem('am_applied_coupon');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.voucher) {
          setAppliedCoupon(parsed.voucher);
          setCouponInput(parsed.voucher.code);
          if (parsed.discountAmount) setDiscountAmount(parsed.discountAmount);
          if (parsed.deliveryDiscount) setDeliveryDiscount(parsed.deliveryDiscount);
        }
      }
    } catch (_e) {}
  }, []);

  // Recalculate discount automatically if items, subtotal or delivery changes
  useEffect(() => {
    if (!appliedCoupon) {
      setDiscountAmount(0);
      setDeliveryDiscount(0);
      return;
    }
    const rawDelivery = delivery === 'courier' ? 5000 : 0;
    validateVoucherApi(appliedCoupon.code, items, subtotal, rawDelivery).then(res => {
      if (res && res.success) {
        setDiscountAmount(res.discountAmount || 0);
        setDeliveryDiscount(res.deliveryDiscount || 0);
        sessionStorage.setItem('am_applied_coupon', JSON.stringify({
          voucher: res.voucher || appliedCoupon,
          discountAmount: res.discountAmount || 0,
          deliveryDiscount: res.deliveryDiscount || 0,
          totalSavings: res.totalSavings || 0
        }));
      } else {
        setDiscountAmount(0);
        setDeliveryDiscount(0);
        setCouponMsg({ type: 'error', text: res.message || 'Kupon tidak lagi memenuhi syarat minimal belanja.' });
        setAppliedCoupon(null);
        sessionStorage.removeItem('am_applied_coupon');
      }
    }).catch(() => {});
  }, [appliedCoupon?.code, subtotal, delivery, items.length]);

  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = (codeToApply || couponInput).trim().toUpperCase();
    if (!code) {
      setCouponMsg({ type: 'error', text: 'Silakan masukkan kode kupon promo.' });
      return;
    }
    setCouponLoading(true);
    setCouponMsg(null);
    try {
      const rawDelivery = delivery === 'courier' ? 5000 : 0;
      const res = await validateVoucherApi(code, items, subtotal, rawDelivery);
      if (res && res.success && res.voucher) {
        setAppliedCoupon(res.voucher);
        setCouponInput(res.voucher.code);
        setDiscountAmount(res.discountAmount || 0);
        setDeliveryDiscount(res.deliveryDiscount || 0);
        setCouponMsg({ type: 'success', text: `🎉 Kupon ${res.voucher.code} berhasil diterapkan!` });
        sessionStorage.setItem('am_applied_coupon', JSON.stringify({
          voucher: res.voucher,
          discountAmount: res.discountAmount || 0,
          deliveryDiscount: res.deliveryDiscount || 0,
          totalSavings: res.totalSavings || 0
        }));
      } else {
        setCouponMsg({ type: 'error', text: res.message || 'Kode voucher tidak valid atau kedaluwarsa.' });
      }
    } catch (err: any) {
      setCouponMsg({ type: 'error', text: err?.message || 'Gagal memvalidasi kupon.' });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setDiscountAmount(0);
    setDeliveryDiscount(0);
    setCouponMsg(null);
    sessionStorage.removeItem('am_applied_coupon');
  };

  const CAMPUS_ZONES = campus === 'banjarmasin'
    ? {
        jastipGedung: [
          'Fakultas Tarbiyah - Lobi Utama Lt. 1',
          'Fakultas Tarbiyah - Lt. 2 / Lt. 3',
          'Fakultas Syariah - Lobi Depan',
          'Fakultas Ushuluddin & Humaniora',
          'Fakultas Dakwah & Ilmu Komunikasi',
          'Fakultas FEBI (Ekonomi Islam)',
          'Gedung Pascasarjana Lt. 1',
          'Perpustakaan Pusat UIN Antasari',
          'Gedung Rektorat (Lobi Utama)'
        ],
        codSafeZones: [
          '🛡️ COD Safe Zone: Pos Satpam Gerbang 1 (Utama)',
          '🛡️ COD Safe Zone: Selasar Masjid Kampus UIN',
          '🛡️ COD Safe Zone: Gazebo Pujasera Kantin Belakang',
          '🛡️ COD Safe Zone: Depan Gedung Student Center'
        ]
      }
    : {
        jastipGedung: [
          'Gedung Kuliah Terpadu A Banjarbaru',
          'Gedung Kuliah B Banjarbaru',
          'Perpustakaan Kampus 2 Banjarbaru',
          'Lobi Rektorat Kampus 2 Banjarbaru'
        ],
        codSafeZones: [
          '🛡️ COD Safe Zone: Pos Satpam Gerbang Utama Kampus 2',
          '🛡️ COD Safe Zone: Selasar Masjid Kampus 2',
          '🛡️ COD Safe Zone: Pujasera Kantin Kampus 2'
        ]
      };

  const LOCATIONS = [...CAMPUS_ZONES.jastipGedung, ...CAMPUS_ZONES.codSafeZones];

  const finalLocation = delivery === 'pickup' 
    ? 'Ambil Sendiri di Tenant / Warung Koperasi' 
    : delivery === 'vending'
    ? 'Ambil di Vending Machine Antasari'
    : (isCustomLocation ? customLocationText.trim() : selectedDropdownLocation);

  useEffect(() => {
    cleanupSnapOverlays();
    return () => {
      cleanupSnapOverlays();
    };
  }, []);

  useEffect(() => {
    const savedVending = localStorage.getItem('am_active_vending_qr');
    if (savedVending) {
      try {
        const parsed = JSON.parse(savedVending);
        setVendingResult(parsed);
        setStep('vending_qr');
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    let timer: any;
    if (step === 'vending_qr' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (step === 'vending_qr' && countdown === 0) {
      localStorage.removeItem('am_active_vending_qr');
      setStep('vending_dispensing');
      playCuteVendingSpinningMusic(2500);
      setTimeout(() => {
        setStep('vending_done');
        playCuteVendingSuccessJingle();
        const speechMsg = 'Yaaay! Selamat Kakak! Paket Blind Bag Mystery kamu berhasil dikeluarkan! Silakan ambil di boks mesin vending yaa!';
        setTimeout(() => speakVoice(speechMsg), 400);
      }, 2500);
    }

    return () => clearInterval(timer);
  }, [step, countdown, items]);

  function deductOrderedStock(orderItems: CartItem[]) {
    try {
      const stockOverrides: Record<string, number> = JSON.parse(localStorage.getItem('am_stock_overrides') || '{}');
      orderItems.forEach(item => {
        const pId = item.product.id;
        const current = stockOverrides[pId] !== undefined ? stockOverrides[pId] : (item.product.stock !== undefined ? item.product.stock : 50);
        stockOverrides[pId] = Math.max(0, current - item.quantity);
      });
      localStorage.setItem('am_stock_overrides', JSON.stringify(stockOverrides));
      window.dispatchEvent(new Event('storage'));
      deductStockApi(orderItems).catch(() => {});

      // 🛍️ Simpan ke Riwayat Pesanan Pribadi Pengguna (Universal Purchasing Semua Role)
      const activeUser = JSON.parse(localStorage.getItem('am_user_session') || '{}');
      const orderRecord = {
        id: `ORD-${Date.now()}`,
        orderId: `ANTASARI-${Date.now()}`,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: delivery === 'vending' ? 'claimed' : 'on_the_way',
        total: total,
        deliveryMethod: delivery,
        items: orderItems.map(i => ({
          name: i.product.name,
          qty: i.quantity,
          price: i.product.price,
          sellerName: i.product.sellerName
        })),
        sellerName: orderItems[0]?.product?.sellerName || 'Tenant Kampus',
        buyerEmail: activeUser.email || '',
        buyerName: activeUser.nama || activeUser.name || 'Pengguna',
        location: finalLocation
      };

      const existingMyOrders = JSON.parse(localStorage.getItem('am_my_orders') || '[]');
      localStorage.setItem('am_my_orders', JSON.stringify([orderRecord, ...existingMyOrders]));
      window.dispatchEvent(new CustomEvent('am_order_created', { detail: orderRecord }));
    } catch (_e) {}
  }

    function triggerEsp32Dispense(vendingObj?: any) {
    const totalQty = items.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1;
    const slotNum = vendingObj?.slotNumber || 1;
    const prodName = items[0]?.product?.name || "Blind Bag Keychain Mystery";

    const payload = {
      orderId: vendingObj?.orderId || `ANTASARI-${Date.now()}`,
      productName: prodName,
      slotNumber: slotNum,
      slot: slotNum,
      quantity: totalQty,
      qty: totalQty,
      buyerName: "Mahasiswa UIN Antasari"
    };

    // 1. Cloud Vercel / MongoDB Atlas Primary Trigger
    fetch('https://ma-project-fix.vercel.app/api/vending/trigger-dispense', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json()).then(d => console.log('Vending cloud trigger OK:', d)).catch(err => console.warn("Vending trigger error:", err));

    // 2. Direct Local WiFi IP Hook to ESP32 (Instant 0.01s)
    try {
      const savedIp = localStorage.getItem('am_esp32_ip');
      if (savedIp) {
        const cleanIp = savedIp.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        fetch(`http://${cleanIp}/dispense?slot=${slotNum}&qty=${totalQty}`, { mode: 'no-cors' }).catch(() => {});
      }
    } catch (_e) {}
  }

  function showVendingQR(data: any, orderId?: string) {
    deductOrderedStock(items);
    if (delivery === 'vending') {
      const vendingObj = {
        vendingToken: data.vendingToken || `VEND-${Math.floor(100000 + Math.random() * 900000)}`,
        slotNumber: data.slotNumber || 1,
        orderId: orderId || `ANTASARI-${Date.now()}`
      };

      setVendingResult(vendingObj);
      localStorage.setItem('am_active_vending_qr', JSON.stringify(vendingObj));
      setCountdown(10);
      setStep('vending_qr');
      triggerEsp32Dispense(vendingObj);
    } else {
      processOrderSuccess(delivery as DeliveryMethod);
    }
  }

  async function handleMidtransPayment() {
    const activeUser = JSON.parse(localStorage.getItem('am_user_session') || '{}');
    const hasOwnProduct = items.some(i => isUserProductOwner(i.product, activeUser));
    if (hasOwnProduct) {
      alert('Penjual tidak dapat membeli produk dari tokonya sendiri.');
      return;
    }

    setLoadingPayment(true);
    try {
      const orderId = `ANTASARI-${Date.now()}`;
      
      let snapToken = '';
      try {
        const data = await checkoutApi({
          orderId,
          grossAmount: total,
          customerDetails: {
            name: activeUser.nama || activeUser.name || "Mahasiswa UIN Antasari",
            email: activeUser.email || "mahasiswa@uin-antasari.ac.id"
          },
          items: items,
          deliveryMethod: delivery
        });
        if (data && data.token) {
          snapToken = data.token;
        }
      } catch (_apiErr) {
        console.warn("Backend checkout API offline, using client-side checkout handling.");
      }

      if (snapToken) {
        try {
          await loadSnapScript();
        } catch (_loadErr) {
          console.warn("Gagal memuat script Midtrans Snap:", _loadErr);
        }

        if (window.snap) {
          window.snap.pay(snapToken, {
            onSuccess: function (result: any) {
              cleanupSnapOverlays();
              showVendingQR({}, result?.order_id || orderId);
            },
            onPending: function (result: any) {
              cleanupSnapOverlays();
              showVendingQR({}, result?.order_id || orderId);
            },
            onError: function (_result: any) {
              cleanupSnapOverlays();
              showVendingQR({}, orderId);
            },
            onClose: function () {
              cleanupSnapOverlays();
              showVendingQR({}, orderId);
            }
          });
          return;
        }
      }

      // Instant simulation for Midtrans/QRIS payment
      setTimeout(() => {
        showVendingQR({}, orderId);
      }, 600);
    } catch (error: any) {
      console.error("Midtrans Error:", error);
      showVendingQR({}, `ANTASARI-${Date.now()}`);
    } finally {
      setLoadingPayment(false);
    }
  }

  async function handleRegularOrder() {
    const activeUser = JSON.parse(localStorage.getItem('am_user_session') || '{}');
    const hasOwnProduct = items.some(i => isUserProductOwner(i.product, activeUser));
    if (hasOwnProduct) {
      alert('Penjual tidak dapat membeli produk dari tokonya sendiri.');
      return;
    }

    if (payment === 'campus_wallet') {
      if (walletBalance < total) {
        alert(`Saldo Dompet Kampus Anda (${formatRupiah(walletBalance)}) tidak mencukupi untuk pembayaran ${formatRupiah(total)}. Silakan lakukan simulasi Top Up saldo terlebih dahulu.`);
        return;
      }
      const newBal = walletBalance - total;
      setWalletBalance(newBal);
      localStorage.setItem('am_wallet_balance', String(newBal));
      window.dispatchEvent(new Event('storage'));
    }

    setLoadingPayment(true);
    const orderId = `ANTASARI-${Date.now()}`;

    try {
      try {
        await checkoutApi({
          orderId,
          grossAmount: total,
          customerDetails: {
            name: activeUser.nama || activeUser.name || "Mahasiswa UIN Antasari",
            email: activeUser.email || "mahasiswa@uin-antasari.ac.id"
          },
          items: items,
          deliveryMethod: delivery
        });
      } catch (_apiErr) {
        console.warn("Backend sync offline, completing order locally.");
      }

      if (delivery === 'vending') {
        showVendingQR({
          vendingToken: `VEND-${Math.floor(100000 + Math.random() * 900000)}`,
          slotNumber: 1
        }, orderId);
      } else {
        processOrderSuccess(delivery as DeliveryMethod);
      }
    } catch (e: any) {
      console.error(e);
      if (delivery === 'vending') {
        showVendingQR({
          vendingToken: `VEND-${Math.floor(100000 + Math.random() * 900000)}`,
          slotNumber: 1
        }, orderId);
      } else {
        processOrderSuccess(delivery as DeliveryMethod);
      }
    } finally {
      setLoadingPayment(false);
    }
  }

  function processOrderSuccess(selectedDelivery: DeliveryMethod) {
    deductOrderedStock(items);
    const orderId = `ANTASARI-${Date.now()}`;
    const deliveryType = selectedDelivery === 'pickup' ? 'pickup' : 'delivery';
    const isCash = payment === 'cash';
    const cleanPaymentMethod = isCash ? 'cash' : 'midtrans';
    const cleanPaymentStatus = isCash ? 'unpaid' : 'paid';
    const pickupStatus = deliveryType === 'pickup' ? 'pending' : undefined;
    const deliveryStatus = deliveryType === 'delivery' ? 'pending' : undefined;

    const activeUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('am_user_session') || '{}') : {};

    const newOrderData = {
      orderId,
      id: orderId,
      sellerId: items[0]?.product?.sellerId || 'seller_1',
      buyerId: activeUser.id || activeUser.email || 'buyer_user',
      buyerName: activeUser.nama || activeUser.name || 'Mahasiswa UIN Antasari',
      buyerEmail: activeUser.email || 'mahasiswa@uin-antasari.ac.id',
      buyerLocation: finalLocation || 'Area Kampus UIN Antasari',
      items: items.map(i => ({
        product: i.product,
        productName: i.product?.name || (i as any).nama_produk,
        quantity: i.quantity,
        price: i.product?.price || 0
      })),
      total,
      totalAmount: total,
      deliveryMethod: selectedDelivery,
      deliveryType,
      paymentMethod: cleanPaymentMethod,
      paymentStatus: cleanPaymentStatus,
      pickupStatus,
      deliveryStatus,
      driverId: null,
      driverName: null,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      const existingStr = localStorage.getItem('am_my_orders');
      const existing = existingStr ? JSON.parse(existingStr) : [];
      const updated = [newOrderData, ...(Array.isArray(existing) ? existing : [])];
      localStorage.setItem('am_my_orders', JSON.stringify(updated));
      localStorage.setItem('am_active_order_id', orderId);
      localStorage.setItem('am_delivery_type', deliveryType);
      window.dispatchEvent(new CustomEvent('am_order_created', { detail: newOrderData }));
    } catch (_e) {}

    // Asinkronus sync ke backend database
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrderData)
    }).catch(err => console.warn('Sync /api/orders error:', err));

    if (selectedDelivery === 'pickup') {
      const newReceipt = {
        orderId,
        queueNumber: `AM-${Math.floor(100 + Math.random() * 900)}`,
        total: total
      };
      setReceiptData(newReceipt);
      setStep('receipt_pickup');
      speakVoice('Pesanan berhasil dibuat. Pesanan sedang disiapkan oleh kasir koperasi kampus.');
    } else {
      setStep('searching_driver');
      speakVoice('Mencari driver kurir Antasari terdekat.');
      setTimeout(() => {
        setStep('success');
        speakVoice('Driver berhasil ditemukan. Menuju toko penjual.');
        // Gojek-like auto-transition to live tracking map after brief confirmation
        setTimeout(() => {
          onConfirmOrder('courier', payment, finalLocation);
        }, 2200);
      }, 2600);
    }
  }

  if (items.length === 0 && step === 'form') {
    return (
      <div style={{ padding: '60px 16px', textAlign: 'center', color: 'var(--am-text-muted)' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
        <h3 style={{ color: 'var(--am-text)' }}>Keranjang Belanja Kosong</h3>
        <p style={{ fontSize: 13, marginBottom: 20 }}>Pilih produk terlebih dahulu sebelum melakukan checkout.</p>
        <button onClick={onBack} className="am-btn-primary" style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: 'var(--am-primary)', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
          Kembali Belanja
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 flex flex-col items-center min-h-screen pb-16 w-full" style={{ fontFamily: 'var(--am-font-body)' }}>
      {step === 'form' && (
        <div className="w-full flex flex-col gap-5">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onBack} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--am-text)' }}>
              ←
            </button>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--am-text)' }}>Checkout Pembayaran</h2>
          </div>

          {/* Banner Peringatan jika Keranjang Memuat Produk Toko Sendiri */}
          {(() => {
            const activeUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('am_user_session') || '{}') : {};
            const hasOwnProduct = items.some(i => isUserProductOwner(i.product, activeUser));
            if (!hasOwnProduct) return null;
            return (
              <div style={{ padding: '14px 18px', background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 16, color: '#DC2626', fontWeight: 700, fontSize: 13, lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>⚠️</span>
                <div>
                  <strong>Peringatan Validasi:</strong> Penjual tidak dapat membeli produk dari tokonya sendiri. Silakan kembali ke Keranjang dan hapus produk tersebut sebelum melanjutkan.
                </div>
              </div>
            );
          })()}

          {/* Rincian Produk */}
          <div className="am-card" style={{ padding: 20, borderRadius: 20, background: 'var(--am-surface)' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: 'var(--am-text)' }}>Rincian Pesanan</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map(item => (
                <div key={item.product.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--am-text)' }}>{item.product.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>{item.quantity} x {formatRupiah(item.product.price)}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--am-primary)' }}>
                    {formatRupiah(item.product.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Metode Pengambilan */}
          <div className="am-card" style={{ padding: 20, borderRadius: 20, background: 'var(--am-surface)' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: 'var(--am-text)' }}>Metode Pengambilan</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              {[
                {
                  id: 'vending',
                  title: '🤖 Vending Machine',
                  desc: isOnlyGanciInCart 
                    ? 'Ambil instan via QR Scanner' 
                    : '⚠️ Khusus suvenir Blind Bag Myammiy Store',
                  disabled: !isOnlyGanciInCart
                },
                { id: 'pickup', title: '🚶 Pick-Up Mandiri', desc: 'Ambil di tenant/koperasi', disabled: false },
                { id: 'courier', title: '🛵 Kurir Antasari (+Rp5.000)', desc: 'Diantar langsung ke lokasimu', disabled: false }
              ].map(opt => (
                <div
                  key={opt.id}
                  onClick={() => {
                    if (opt.disabled) {
                      alert('Mesin Vending hanya khusus untuk produk Blind Bag Suvenir / Ganci karya Myammiy Store! Produk lain (seperti Almamater, Buku, dll) silakan pilih Pick-Up Mandiri atau Kurir Antasari.');
                      return;
                    }
                    setDelivery(opt.id as any);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('am_delivery_method', opt.id);
                    }
                  }}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    border: `2px solid ${delivery === opt.id ? 'var(--am-primary)' : 'var(--am-border)'}`,
                    background: opt.disabled 
                      ? 'var(--am-bg2)' 
                      : (delivery === opt.id ? 'var(--am-primary-light, rgba(95, 168, 116, 0.15))' : 'var(--am-surface)'),
                    opacity: opt.disabled ? 0.65 : 1,
                    cursor: opt.disabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: (!opt.disabled && delivery === opt.id) ? '0 4px 12px rgba(95, 168, 116, 0.15)' : 'none'
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 13, color: opt.disabled ? 'var(--am-text-muted)' : 'var(--am-text)', marginBottom: 2 }}>
                    {opt.title}
                  </div>
                  <div style={{ fontSize: 11, color: opt.disabled ? '#e11d48' : 'var(--am-text-muted)', fontWeight: opt.disabled ? 600 : 400 }}>
                    {opt.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lokasi Pengantaran jika Courier */}
          {delivery === 'courier' && (
            <div className="am-card" style={{ padding: 20, borderRadius: 20, background: 'var(--am-surface)' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--am-text)' }}>Titik Antar di Kampus</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <select
                  value={selectedDropdownLocation}
                  onChange={e => {
                    setSelectedDropdownLocation(e.target.value);
                    setIsCustomLocation(false);
                  }}
                  style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--am-border)', background: 'var(--am-surface)', color: 'var(--am-text)', fontSize: 13, fontWeight: 600 }}
                >
                  <option value="">-- Pilih Titik Antar / COD Kampus --</option>
                  <optgroup label="🏢 Jastip Antar Gedung Fakultas / Ruang Kuliah">
                    {CAMPUS_ZONES.jastipGedung.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </optgroup>
                  <optgroup label="🛡️ Titik Temu COD Aman Resmi (Safe Meet-Up Zone)">
                    {CAMPUS_ZONES.codSafeZones.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </optgroup>
                </select>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)' }}>Atau tulis patokan detail:</label>
                  <input
                    type="text"
                    placeholder="Contoh: Depan Gazebo samping Kantin..."
                    value={customLocationText}
                    onChange={e => {
                      setCustomLocationText(e.target.value);
                      setIsCustomLocation(true);
                    }}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--am-border)', background: 'var(--am-surface)', color: 'var(--am-text)', fontSize: 13, marginTop: 4, boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Metode Pembayaran */}
          <div className="am-card w-full" style={{ padding: 20, borderRadius: 20, background: 'var(--am-surface)' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: 'var(--am-text)' }}>Pilih Metode Pembayaran</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full mb-6">
              {[
                { id: 'qris_sim', label: '⚡ QRIS Dinamis (Simulator)', desc: 'Scan & Instan Otomatis' },
                { id: 'campus_wallet', label: '💳 Dompet Kampus', desc: `Saldo: ${formatRupiah(walletBalance)}` },
                { id: 'seabank', label: '🌊 SeaBank (Nurmiyaty)', desc: 'Transfer Bank' },
                { id: 'gopay', label: '💚 GoPay (Nurmiyaty)', desc: 'E-Wallet' },
                { id: 'qris', label: '💳 Midtrans Snap', desc: 'Gateway Resmi' },
                { id: 'cod', label: '💵 Bayar Tunai (COD / Kasir)', desc: 'Bayar Langsung' }
              ].map(pm => (
                <div
                  key={pm.id}
                  onClick={() => setPayment(pm.id as any)}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: `2px solid ${payment === pm.id ? 'var(--am-primary)' : 'var(--am-border)'}`,
                    background: payment === pm.id ? 'var(--am-primary-light, rgba(95, 168, 116, 0.15))' : 'var(--am-surface)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    color: 'var(--am-text)',
                    boxShadow: payment === pm.id ? '0 4px 12px rgba(95, 168, 116, 0.15)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 2 }}>{pm.label}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--am-text-muted)' }}>{pm.desc}</div>
                </div>
              ))}
            </div>

            {/* Kotak QRIS Dinamis Simulator */}
            {payment === 'qris_sim' && (
              <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center p-6 rounded-2xl bg-[var(--am-bg2)] border-2 border-emerald-500 shadow-xl my-4 text-center">
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16, 185, 129, 0.15)', color: '#059669', padding: '4px 12px', borderRadius: 12, fontSize: 11.5, fontWeight: 800, marginBottom: 12 }}>
                  <span>⚡ QRIS DINAMIS KAMPUS SIMULATOR</span>
                </div>
                <div style={{ display: 'inline-block', padding: 14, background: 'white', borderRadius: 20, boxShadow: '0 6px 20px rgba(0,0,0,0.1)', marginBottom: 12 }}>
                  <QRCodeSVG
                    value={`00020101021226580016ID.CO.CAMPUSMART0118936000000000000000520454115303360540${total}5802ID5912ANTASARIMART6013BANJARMASIN6304ABCD`}
                    size={175}
                  />
                </div>
                <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginBottom: 2 }}>
                  Nominal Pembayaran:
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--am-primary)', marginBottom: 6 }}>
                  {formatRupiah(total)}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                  ⏱️ Selesaikan pembayaran dalam: <strong style={{ color: '#e11d48' }}>{Math.floor(qrisSecsLeft / 60).toString().padStart(2, '0')}:{(qrisSecsLeft % 60).toString().padStart(2, '0')}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playCelebrationFanfare();
                    handleRegularOrder();
                  }}
                  disabled={loadingPayment}
                  style={{
                    width: '100%',
                    maxWidth: 320,
                    padding: '12px 24px',
                    borderRadius: 14,
                    border: 'none',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  ⚡ Simulasi Bayar QRIS Sukses (Instan)
                </button>
              </div>
            )}

            {/* Kotak Saldo Dompet Kampus (AntasariPay) */}
            {payment === 'campus_wallet' && (
              <div style={{ padding: 18, borderRadius: 16, background: 'var(--am-bg2)', border: '1.5px solid var(--am-primary)', marginTop: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 24 }}>💳</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--am-primary)', textTransform: 'uppercase' }}>
                        DOMPET KAMPUS (ANTASARIPAY)
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)' }}>
                        Saldo Tersedia: <strong>{formatRupiah(walletBalance)}</strong>
                      </div>
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 800,
                    background: walletBalance >= total ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: walletBalance >= total ? '#059669' : '#dc2626'
                  }}>
                    {walletBalance >= total ? '✓ Saldo Cukup' : '⚠️ Saldo Kurang'}
                  </div>
                </div>

                <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
                  {walletBalance >= total
                    ? `Total pesanan ${formatRupiah(total)} akan langsung dipotong dari saldo dompet Anda secara instan tanpa biaya admin.`
                    : `Saldo Anda tidak mencukupi untuk membayar ${formatRupiah(total)}. Silakan lakukan simulasi Top Up di bawah ini.`
                  }
                </div>

                {/* Top Up Simulator Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--am-text-muted)' }}>Top-Up Simulator:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newBal = walletBalance + 50000;
                      setWalletBalance(newBal);
                      localStorage.setItem('am_wallet_balance', String(newBal));
                      window.dispatchEvent(new Event('storage'));
                    }}
                    style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--am-border)', background: 'var(--am-surface)', color: 'var(--am-primary)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Rp 50.000
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newBal = walletBalance + 100000;
                      setWalletBalance(newBal);
                      localStorage.setItem('am_wallet_balance', String(newBal));
                      window.dispatchEvent(new Event('storage'));
                    }}
                    style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--am-border)', background: 'var(--am-surface)', color: 'var(--am-primary)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Rp 100.000
                  </button>
                </div>
              </div>
            )}

            {/* Kotak Rincian Rekening SeaBank */}
            {payment === 'seabank' && (
              <div style={{ padding: 18, borderRadius: 16, background: 'var(--am-bg2)', border: '1.5px solid var(--am-primary)', marginTop: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--am-primary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  🌊 QR & REKENING SEABANK INDONESIA
                </div>
                <div style={{ display: 'inline-block', padding: 12, background: 'white', borderRadius: 16, boxShadow: '0 4px 15px rgba(0,0,0,0.08)', marginBottom: 12 }}>
                  <QRCodeSVG value="https://app.seabank.co.id/transfer?account=901156882439" size={150} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--am-text-muted)', marginBottom: 2 }}>
                  Nomor Rekening SeaBank:
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--am-primary)', letterSpacing: 2, marginBottom: 4 }}>
                  901156882439
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--am-text)', marginBottom: 12 }}>
                  Atas Nama: <strong>Nurmiyaty</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('901156882439');
                    alert('Nomor rekening SeaBank (901156882439) a.n. Nurmiyaty berhasil disalin! 📋');
                  }}
                  style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: 'var(--am-primary)', color: 'white', fontSize: 12, fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 8px rgba(95, 168, 116, 0.25)' }}
                >
                  📋 Salin Nomor Rekening SeaBank
                </button>
              </div>
            )}

            {/* Kotak Rincian GoPay */}
            {payment === 'gopay' && (
              <div style={{ padding: 18, borderRadius: 16, background: 'var(--am-bg2)', border: '1.5px solid var(--am-primary)', marginTop: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--am-primary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  💚 QR & NOMOR GOPAY / QRIS
                </div>
                <div style={{ display: 'inline-block', padding: 12, background: 'white', borderRadius: 16, boxShadow: '0 4px 15px rgba(0,0,0,0.08)', marginBottom: 12 }}>
                  <QRCodeSVG value="https://gopay.co.id/pay?phone=08813576012" size={150} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--am-text-muted)', marginBottom: 2 }}>
                  Nomor Telepon GoPay:
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--am-primary)', letterSpacing: 2, marginBottom: 4 }}>
                  08813576012
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--am-text)', marginBottom: 12 }}>
                  Atas Nama: <strong>Nurmiyaty</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('08813576012');
                    alert('Nomor GoPay (08813576012) a.n. Nurmiyaty berhasil disalin! 📋');
                  }}
                  style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: '#059669', color: 'white', fontSize: 12, fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)' }}
                >
                  📋 Salin Nomor GoPay
                </button>
              </div>
            )}
          </div>

          {/* 🎟️ Kupon & Voucher Promo Diskon */}
          <div className="am-card" style={{ padding: 20, borderRadius: 20, background: 'var(--am-surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>🎟️</span>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--am-text)' }}>Kupon & Voucher Promo</h3>
              </div>
              {availableCoupons.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCouponList(!showCouponList)}
                  style={{
                    border: 'none',
                    background: 'rgba(95, 168, 116, 0.12)',
                    color: 'var(--am-primary)',
                    padding: '4px 10px',
                    borderRadius: 8,
                    fontSize: 11.5,
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {showCouponList ? 'Tutup Daftar ▲' : `Lihat Kupon (${availableCoupons.length}) ▼`}
                </button>
              )}
            </div>

            {/* Input & Terapkan */}
            {!appliedCoupon ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Ketik kode kupon (contoh: MYAMMIY10)..."
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyCoupon();
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: '1.5px dashed var(--am-border)',
                    background: 'var(--am-bg2)',
                    color: 'var(--am-text)',
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: 1
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleApplyCoupon()}
                  disabled={couponLoading || !couponInput.trim()}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 12,
                    border: 'none',
                    background: 'var(--am-primary)',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: (couponLoading || !couponInput.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (couponLoading || !couponInput.trim()) ? 0.6 : 1,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {couponLoading ? 'Memeriksa...' : 'Terapkan'}
                </button>
              </div>
            ) : (
              /* Kupon Terpasang */
              <div style={{
                background: 'linear-gradient(135deg, rgba(95, 168, 116, 0.12), rgba(16, 185, 129, 0.15))',
                border: '1.5px solid var(--am-primary)',
                borderRadius: 14,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: 'var(--am-primary)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18
                  }}>
                    🏷️
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 13, color: 'var(--am-primary)' }}>
                        {appliedCoupon.code}
                      </span>
                      <span style={{ fontSize: 10, background: 'var(--am-primary)', color: 'white', padding: '1px 6px', borderRadius: 6, fontWeight: 800 }}>
                        {appliedCoupon.discountType === 'percentage'
                          ? `Diskon ${appliedCoupon.discountValue}%`
                          : appliedCoupon.discountType === 'shipping'
                          ? `Gratis Ongkir ${formatRupiah(appliedCoupon.discountValue)}`
                          : `Potongan ${formatRupiah(appliedCoupon.discountValue)}`}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--am-text-muted)', marginTop: 2 }}>
                      {appliedCoupon.sellerName ? `Voucher Toko: ${appliedCoupon.sellerName}` : 'Voucher Seluruh Toko'}
                      {appliedCoupon.minSpend > 0 ? ` • Min. ${formatRupiah(appliedCoupon.minSpend)}` : ''}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid #ef4444',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  ✕ Hapus
                </button>
              </div>
            )}

            {/* Pesan Feedback Kupon */}
            {couponMsg && (
              <div style={{
                marginTop: 8,
                padding: '8px 12px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                background: couponMsg.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                color: couponMsg.type === 'success' ? '#10B981' : '#EF4444',
                border: `1px solid ${couponMsg.type === 'success' ? '#10B981' : '#EF4444'}`
              }}>
                {couponMsg.text}
              </div>
            )}

            {/* List Kupon Tersedia */}
            {showCouponList && availableCoupons.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 10, borderTop: '1px solid var(--am-border)' }}>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--am-text-muted)' }}>
                  PILIH DARI KUPON TOKO AKTIF:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                  {availableCoupons.map(c => {
                    const isSelected = appliedCoupon?.code === c.code;
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleApplyCoupon(c.code)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 12,
                          border: `1.5px dashed ${isSelected ? 'var(--am-primary)' : 'var(--am-border)'}`,
                          background: isSelected ? 'var(--am-primary-light, rgba(95, 168, 116, 0.12))' : 'var(--am-bg2)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 6
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 900, color: 'var(--am-primary)', fontSize: 12 }}>
                              {c.code}
                            </span>
                            <span style={{ fontSize: 9.5, background: 'rgba(95, 168, 116, 0.18)', color: 'var(--am-primary)', padding: '1px 5px', borderRadius: 4, fontWeight: 800 }}>
                              {c.discountType === 'percentage' ? `${c.discountValue}%` : formatRupiah(c.discountValue)}
                            </span>
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--am-text-muted)', marginTop: 2 }}>
                            {c.sellerName ? `🏪 ${c.sellerName}` : '🌐 Semua Toko'}
                          </div>
                        </div>
                        <button
                          type="button"
                          style={{
                            padding: '4px 8px',
                            borderRadius: 6,
                            border: 'none',
                            background: isSelected ? '#10B981' : 'var(--am-primary)',
                            color: 'white',
                            fontSize: 10,
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          {isSelected ? '✓ Terpasang' : 'Pilih'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Ringkasan Total & Tombol Konfirmasi */}
          <div className="am-card" style={{ padding: 20, borderRadius: 20, background: 'var(--am-surface)' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: 'var(--am-text)' }}>Ringkasan Pembayaran</h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: 'var(--am-text-muted)' }}>
              <span>Subtotal Produk</span>
              <span>{formatRupiah(subtotal)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: 'var(--am-text-muted)' }}>
              <span>Biaya Pengantaran</span>
              <span>{delivery === 'courier' ? formatRupiah(rawDeliveryFee) : (delivery === 'vending' ? 'Ambil di Vending (Rp0)' : 'Ambil Mandiri (Rp0)')}</span>
            </div>

            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#10B981', fontWeight: 700 }}>
                <span>🏷️ Diskon Kupon Toko ({appliedCoupon?.code})</span>
                <span>-{formatRupiah(discountAmount)}</span>
              </div>
            )}

            {deliveryDiscount > 0 && delivery === 'courier' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#10B981', fontWeight: 700 }}>
                <span>🛵 Diskon Biaya Ongkir</span>
                <span>-{formatRupiah(deliveryDiscount)}</span>
              </div>
            )}

            {totalSavings > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(52, 211, 153, 0.18))',
                border: '1px solid #10B981',
                padding: '8px 12px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 800,
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                margin: '10px 0 14px'
              }}>
                <span>🎉 Total Hemat Kupon Promosi:</span>
                <span>{formatRupiah(totalSavings)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, fontSize: 17, fontWeight: 900, color: 'var(--am-primary)', borderTop: '1px solid var(--am-border)', paddingTop: 12 }}>
              <span>Total Pembayaran</span>
              <span>{formatRupiah(total)}</span>
            </div>

            {(() => {
              const activeUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('am_user_session') || '{}') : {};
              const hasOwnProduct = items.some(i => isUserProductOwner(i.product, activeUser));
              const isSubmitDisabled = loadingPayment || hasOwnProduct;

              return (
                <button
                  onClick={() => {
                    if (hasOwnProduct) {
                      alert('Penjual tidak dapat membeli produk dari tokonya sendiri.');
                      return;
                    }
                    if (payment === 'qris') {
                      handleMidtransPayment();
                    } else {
                      handleRegularOrder();
                    }
                  }}
                  disabled={isSubmitDisabled}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: 14,
                    border: 'none',
                    background: hasOwnProduct ? '#64748B' : 'linear-gradient(135deg, #5FA874 0%, #5FA874 100%)',
                    color: 'white',
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
                    boxShadow: !hasOwnProduct ? '0 4px 14px rgba(244, 174, 194, 0.35)' : 'none',
                    opacity: hasOwnProduct ? 0.7 : 1
                  }}
                >
                  {hasOwnProduct
                    ? '⚠️ Penjual Tidak Dapat Membeli Produk Sendiri'
                    : loadingPayment
                    ? 'Memproses Pesanan...'
                    : payment === 'campus_wallet'
                    ? `Bayar Instan Potong Dompet (${formatRupiah(total)}) 💳`
                    : payment === 'qris_sim'
                    ? `Konfirmasi Bayar QRIS Dinamis (${formatRupiah(total)}) ⚡`
                    : (delivery === 'vending')
                      ? ((payment === 'seabank' || payment === 'gopay') ? 'Saya Sudah Transfer, Dapatkan Token Vending 🚀' : payment === 'qris' ? 'Bayar via Midtrans Snap 💳' : 'Dapatkan Token Vending 🚀')
                      : (delivery === 'pickup')
                        ? ((payment === 'seabank' || payment === 'gopay') ? 'Saya Sudah Transfer, Ambil Struk Antrean Toko 🧾' : payment === 'qris' ? 'Bayar via Midtrans Snap 💳' : 'Ambil Struk Antrean Toko 🧾')
                        : ((payment === 'seabank' || payment === 'gopay') ? 'Saya Sudah Transfer, Lacak Kurir Pengantar 🛵' : payment === 'qris' ? 'Bayar via Midtrans Snap 💳' : 'Konfirmasi Pesanan Kurir 🛵')
                  }
                </button>
              );
            })()}
          </div>
        </div>
      )}

      {/* Tampilan Vending QR & IoT Synchronized Dispenser */}
      {step === 'vending_qr' && vendingData && (
        <div className="am-card" style={{ padding: 26, borderRadius: 24, background: 'var(--am-surface)', textAlign: 'center', border: '1.5px solid var(--am-primary)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#DCFCE7', color: '#166534', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, marginBottom: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
            <span>📡 IoT Smart Locker Synchronized</span>
          </div>

          <div style={{ fontSize: 44, marginBottom: 6 }}>🎁🤖</div>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900, color: 'var(--am-text)' }}>
            Blind Bag Loker Siap Diambil!
          </h2>
          <p style={{ fontSize: 12.5, color: 'var(--am-text-muted)', marginBottom: 16 }}>
            Scan kode QR ini di depan scanner loker kampus atau ketik kode token di bawah untuk membuka pintu.
          </p>

          <div style={{ display: 'inline-block', padding: 14, background: 'white', borderRadius: 16, boxShadow: '0 6px 20px rgba(0,0,0,0.08)', marginBottom: 14 }}>
            <QRCodeSVG value={vendingData.vendingToken} size={180} />
          </div>

          <div style={{
            background: 'var(--am-bg2)',
            padding: '12px 16px',
            borderRadius: 14,
            border: '1.5px dashed var(--am-primary)',
            maxWidth: 340,
            margin: '0 auto 16px'
          }}>
            <div style={{ fontSize: 11, color: 'var(--am-text-muted)', marginBottom: 2 }}>KODE TOKEN PENGAMBILAN:</div>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 2, color: 'var(--am-primary)' }}>
              {vendingData.vendingToken}
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#10B981', marginTop: 4 }}>
              🚪 Loker: Slot #{vendingData.slotNumber || 1} (Kampus 1 & 2)
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 340, margin: '0 auto' }}>
            <button
              onClick={() => {
                setStep('vending_dispensing');
                playCuteVendingSpinningMusic(2500);
                setTimeout(() => {
                  playCuteVendingSuccessJingle();
                  setStep('vending_done');
                }, 2500);
              }}
              style={{
                padding: '12px 20px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: 'white',
                fontWeight: 800,
                fontSize: 13.5,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
              }}
            >
              🚀 Buka Pintu Loker Sekarang (Kirim Sinyal IoT & Putar Musik 🎵)
            </button>
          </div>
        </div>
      )}

      {step === 'vending_dispensing' && (
        <div className="am-card" style={{ padding: 40, borderRadius: 24, background: 'var(--am-surface)', textAlign: 'center', border: '2px solid #F43F5E' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, fontSize: 26, marginBottom: 12 }}>
            <span style={{ animation: 'bounce 0.8s infinite alternate' }}>🎵</span>
            <span style={{ animation: 'bounce 0.8s 0.2s infinite alternate' }}>🎶</span>
            <span style={{ animation: 'bounce 0.8s 0.4s infinite alternate' }}>✨</span>
            <span style={{ animation: 'bounce 0.8s 0.6s infinite alternate' }}>🌸</span>
          </div>

          <div style={{
            width: 80,
            height: 80,
            margin: '0 auto 16px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFE4E6, #FCE7F3)',
            border: '3px dashed #F43F5E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 40,
            animation: 'spin 2s linear infinite'
          }}>
            ⚙️
          </div>

          <h3 style={{ margin: '0 0 8px', color: '#9F1239', fontWeight: 900 }}>Mesin Sedang Berputar... 🎀</h3>
          <p style={{ fontSize: 13, color: '#881337', marginBottom: 12 }}>
            🎶 Musik imut sedang diputar melalui <strong>speaker laptop</strong>. Paket Blind Bag Anda sedang dikeluarkan ke boks loker!
          </p>
          <div style={{ display: 'inline-block', background: '#FFE4E6', color: '#E11D48', padding: '4px 14px', borderRadius: 20, fontSize: 11.5, fontWeight: 800 }}>
            ● Motor Spiral Aktif (IoT Real-Time)
          </div>
        </div>
      )}

      {step === 'vending_done' && (
        <div className="am-card" style={{ padding: 32, borderRadius: 24, background: 'var(--am-surface)', textAlign: 'center' }}>
          <div style={{ fontSize: 60, marginBottom: 10, animation: 'floatCute 2s ease-in-out infinite' }}>🎁🎉</div>
          <h2 style={{ margin: '0 0 6px', color: '#16A34A', fontSize: 22, fontWeight: 900 }}>Selamat! Paket Berhasil Dikeluarkan! 🎉</h2>
          
          <div style={{
            margin: '18px auto 22px',
            padding: '22px 20px',
            borderRadius: 20,
            background: 'linear-gradient(135deg, #FFF0F5 0%, #FFE4E6 100%)',
            border: '2px dashed #FF6B8B',
            maxWidth: 380,
            animation: 'bounceIn 0.5s ease-out'
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#FF6B8B', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>
              ✨ MYSTERY BLIND BAG KEYCHAIN ✨
            </div>
            <div style={{ fontSize: 48, margin: '8px 0' }}>🛍️❓🎁</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#9F1239', marginBottom: 6 }}>
              Paket Blind Bag Misteri Siap Diambil!
            </div>
            <p style={{ fontSize: 12.5, color: '#881337', margin: '0 0 10px', lineHeight: 1.5 }}>
              Silakan ambil kantong Blind Bag fisikmu di boks pengambilan mesin vending, lalu buka bungkusnya langsung untuk melihat kejutan karakter di dalamnya! 🥰
            </p>
            <div style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 20, background: '#FF4D6D', color: 'white', fontSize: 11, fontWeight: 800 }}>
              100% Mystery Surprise 🔒
            </div>
          </div>

          <p style={{ fontSize: 13, color: 'var(--am-text-muted)', marginBottom: 20 }}>
            Terima kasih telah berbelanja produk Myammiy Craft di Campus Mart & Vending Machine UIN Antasari!
          </p>
          <button
            onClick={() => {
              localStorage.removeItem('am_active_order');
              localStorage.removeItem('am_active_vending_qr');
              onBack();
            }}
            style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #5FA874 0%, #3D8B54 100%)', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(95, 168, 116, 0.35)' }}
          >
            Selesai & Kembali ke Beranda 🏠
          </button>
        </div>
      )}

      {/* Tampilan Struk Pick-Up di Toko Koperasi (Bukan Vending Machine) */}
      {step === 'receipt_pickup' && receiptData && (
        <div className="am-card" style={{ padding: '32px 20px', borderRadius: 24, background: 'var(--am-surface)', textAlign: 'center', maxWidth: 520, margin: '0 auto', border: '1.5px solid var(--am-primary)' }}>
          <div style={{ fontSize: 46, marginBottom: 8 }}>🏪🧾</div>
          <div style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, background: 'rgba(74, 197, 108, 0.15)', color: '#166534', fontSize: 11.5, fontWeight: 800, marginBottom: 10 }}>
            🟢 Pesanan Sedang Disiapkan
          </div>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, color: 'var(--am-text)', fontWeight: 900 }}>
            Pesanan Sedang Disiapkan Penjual!
          </h2>
          <p style={{ fontSize: 13, color: 'var(--am-text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
            Tunjukkan nomor antrean ini ke <strong>Stand Kasir Toko Koperasi Kampus UIN Antasari</strong> ({campus === 'banjarmasin' ? 'Kampus 1 Banjarmasin' : 'Kampus 2 Banjarbaru'}).
          </p>

          <div style={{ background: 'var(--am-bg2)', padding: '22px 18px', borderRadius: 18, marginBottom: 22, border: '2px dashed var(--am-primary)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--am-text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
              NOMOR ANTRIAN PENGAMBILAN KASIR
            </div>
            <div style={{ fontSize: 42, fontWeight: 900, color: 'var(--am-primary)', letterSpacing: 2 }}>
              {receiptData.queueNumber}
            </div>
            <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginTop: 4 }}>
              Order ID: {receiptData.orderId}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', marginTop: 8, display: 'inline-block', background: 'rgba(74, 197, 108, 0.15)', padding: '4px 12px', borderRadius: 20 }}>
              📍 Titik Ambil: Stand Kasir Koperasi Kampus
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => onConfirmOrder('pickup', payment, finalLocation)}
              style={{ width: '100%', padding: '13px 20px', borderRadius: 12, border: 'none', background: 'var(--am-primary)', color: 'white', fontWeight: 800, fontSize: 13.5, cursor: 'pointer', boxShadow: '0 4px 14px rgba(95, 168, 116, 0.3)' }}
            >
              Lihat Detail Struk & Peta Stand Kasir 📍
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('am_active_order');
                onBack();
              }}
              style={{ width: '100%', padding: '11px 20px', borderRadius: 12, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >
              🏠 Selesai & Kembali ke Beranda
            </button>
          </div>
        </div>
      )}

      {/* Mencari Driver Kurir (Gojek / Grab Style Radar UI) */}
      {step === 'searching_driver' && (
        <div className="am-card" style={{ padding: '40px 20px', borderRadius: 24, background: 'var(--am-surface)', textAlign: 'center', maxWidth: 480, margin: '0 auto', border: '1.5px solid var(--am-primary)' }}>
          <style>{`
            @keyframes amRadarPulse {
              0% { transform: scale(0.6); opacity: 0.8; }
              50% { opacity: 0.4; }
              100% { transform: scale(2.2); opacity: 0; }
            }
            @keyframes amMotorBounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-8px); }
            }
          `}</style>
          <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(95, 168, 116, 0.25)', animation: 'amRadarPulse 2s cubic-bezier(0.2, 0.8, 0.4, 1) infinite' }} />
            <div style={{ position: 'absolute', inset: 15, borderRadius: '50%', background: 'rgba(95, 168, 116, 0.35)', animation: 'amRadarPulse 2s cubic-bezier(0.2, 0.8, 0.4, 1) infinite 0.6s' }} />
            <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'linear-gradient(135deg, #5FA874 0%, #3D8B54 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: 'white', zIndex: 2, boxShadow: '0 8px 20px rgba(95, 168, 116, 0.4)', animation: 'amMotorBounce 1.4s ease-in-out infinite' }}>
              🛵
            </div>
          </div>
          <div style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, background: 'rgba(95, 168, 116, 0.12)', color: 'var(--am-primary)', fontSize: 11.5, fontWeight: 800, marginBottom: 10 }}>
            ● Radar GPS Kurir Aktif
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 19, fontWeight: 900, color: 'var(--am-text)' }}>
            Mencari Kurir Mahasiswa Terdekat...
          </h3>
          <p style={{ fontSize: 13, color: 'var(--am-text-muted)', margin: '0 auto 16px', maxWidth: 360, lineHeight: 1.5 }}>
            Sistem otomatis sedang menghubungkan pesananmu dengan kurir mahasiswa terdekat di area Kampus UIN Antasari.
          </p>
          <div style={{ fontSize: 12, color: 'var(--am-primary)', fontWeight: 700 }}>
            ⏳ Menghubungkan ke armada aktif...
          </div>
        </div>
      )}

      {/* Driver Ditemukan (Gojek / Grab Style Driver Found) */}
      {step === 'success' && (
        <div className="am-card" style={{ padding: '36px 20px', borderRadius: 24, background: 'var(--am-surface)', textAlign: 'center', maxWidth: 480, margin: '0 auto', border: '2px solid #10B981' }}>
          <div style={{ fontSize: 52, marginBottom: 8, animation: 'bounce 0.6s ease-out' }}>🛵🎉</div>
          <div style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, background: '#DCFCE7', color: '#166534', fontSize: 11.5, fontWeight: 800, marginBottom: 12 }}>
            ✓ Kurir Terkonfirmasi
          </div>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, color: '#16A34A', fontWeight: 900 }}>
            Kurir Berhasil Ditemukan!
          </h2>
          <p style={{ fontSize: 13, color: 'var(--am-text-muted)', marginBottom: 18, lineHeight: 1.5 }}>
            <strong>Ahmad Fauzi</strong> (Honda Vario 125 - DA 4521 AB) menerima pesananmu dan sedang meluncur ke toko penjual!
          </p>

          <div style={{ background: 'var(--am-bg2)', padding: '14px 16px', borderRadius: 16, border: '1px solid var(--am-border)', marginBottom: 20, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="https://i.pravatar.cc/150?img=8" alt="Driver" style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', border: '2px solid #10B981' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--am-text)' }}>Ahmad Fauzi</div>
              <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>⭐ 4.9 • Mahasiswa Fakultas Tarbiyah</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, background: '#DCFCE7', color: '#166534', padding: '3px 8px', borderRadius: 8 }}>
              🛵 Siap Antar
            </span>
          </div>

          <button
            onClick={() => onConfirmOrder('courier', payment, finalLocation)}
            style={{ width: '100%', padding: '13px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: 'white', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)' }}
          >
            Buka Peta Live Tracking Sekarang 📍
          </button>
        </div>
      )}
    </div>
  );
}
