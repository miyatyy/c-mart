import { useState, useEffect } from 'react';
import type { CartItem, DeliveryMethod, PaymentMethod, ThemeMode, Campus } from '../types';
import { formatRupiah } from '../data';
import { QRCodeSVG } from 'qrcode.react';
import { checkoutApi, deductStockApi, MIDTRANS_CLIENT_KEY } from '../lib/api';

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
  const isVendingItem = (p: any) => {
    if (!p) return false;
    const name = (p.name || p.nama_produk || '').toLowerCase();
    const desc = (p.description || p.deskripsi || '').toLowerCase();
    const seller = (p.sellerId || p.sellerName || p.seller_name || '').toLowerCase();
    const category = (p.category || p.kategori || '').toLowerCase();
    
    return (
      p.slotNumber !== undefined ||
      p.isVending === true ||
      p.id === 'blind_bag_myammiy_35k' ||
      seller.includes('myammiy') ||
      seller.includes('seller_1') ||
      name.includes('ganci') ||
      name.includes('gantungan') ||
      name.includes('blind bag') ||
      name.includes('blindbag') ||
      name.includes('keychain') ||
      name.includes('pipe cleaner') ||
      name.includes('kawat bulu') ||
      name.includes('chenille') ||
      name.includes('rajut') ||
      name.includes('bando') ||
      name.includes('snack') ||
      name.includes('keripik') ||
      name.includes('roti') ||
      name.includes('aksesoris') ||
      category === 'kerajinan' ||
      category === 'aksesoris' ||
      desc.includes('ganci') ||
      desc.includes('blind bag')
    );
  };

  const isOnlyGanciInCart = items.length > 0 && items.every(i => isVendingItem(i.product));

  const [delivery, setDelivery] = useState<DeliveryMethod | 'vending'>(isOnlyGanciInCart ? 'vending' : 'pickup');
  const [payment, setPayment] = useState<PaymentMethod | 'seabank' | 'gopay'>('seabank');
  
  const [selectedDropdownLocation, setSelectedDropdownLocation] = useState('');
  const [customLocationText, setCustomLocationText] = useState('');
  const [isCustomLocation, setIsCustomLocation] = useState(false);

  const [step, setStep] = useState<'form' | 'searching_driver' | 'success' | 'vending_qr' | 'vending_dispensing' | 'vending_done' | 'receipt_pickup'>('form');
  const [countdown, setCountdown] = useState(10);
  const [loadingPayment, setLoadingPayment] = useState(false);

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
  const deliveryFee = delivery === 'courier' ? 5000 : 0;
  const total = subtotal + deliveryFee;

  const LOCATIONS = campus === 'banjarmasin'
    ? ['Gedung Syariah Lt. 1', 'Gedung Syariah Lt. 2', 'Gedung Dakwah Lt. 3', 'Gedung Tarbiyah', 'Kantin Belakang Tarbiyah', 'Perpustakaan Pusat', 'Masjid Kampus', 'Gedung Rektorat', 'Area Parkir Utama']
    : ['Gedung A Banjarbaru', 'Gedung B Banjarbaru', 'Kantin Kampus 2', 'Masjid Kampus 2', 'Perpustakaan Kampus 2'];

  const finalLocation = delivery === 'pickup' 
    ? 'Ambil Sendiri di Tenant / Warung Koperasi' 
    : delivery === 'vending'
    ? 'Ambil di Vending Machine Antasari'
    : (isCustomLocation ? customLocationText.trim() : selectedDropdownLocation);

  useEffect(() => {
    const snapScriptUrl = 'https://app.sandbox.midtrans.com/snap/snap.js';
    const script = document.createElement('script');
    script.src = snapScriptUrl;
    script.setAttribute('data-client-key', MIDTRANS_CLIENT_KEY);
    document.body.appendChild(script);

    return () => {
      try {
        document.body.removeChild(script);
      } catch (_e) {}
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
      setTimeout(() => {
        setStep('vending_done');
        playCelebrationFanfare();
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
    } else {
      processOrderSuccess(delivery as DeliveryMethod);
    }
  }

  async function handleMidtransPayment() {
    setLoadingPayment(true);
    try {
      const activeUser = JSON.parse(localStorage.getItem('am_user_session') || '{}');
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

      if (snapToken && window.snap) {
        window.snap.pay(snapToken, {
          onSuccess: function (result: any) {
            showVendingQR({}, result?.order_id || orderId);
          },
          onPending: function (result: any) {
            showVendingQR({}, result?.order_id || orderId);
          },
          onError: function (_result: any) {
            showVendingQR({}, orderId);
          },
          onClose: function () {
            showVendingQR({}, orderId);
          }
        });
      } else {
        // Instant simulation for Midtrans/QRIS payment
        setTimeout(() => {
          showVendingQR({}, orderId);
        }, 600);
      }
    } catch (error: any) {
      console.error("Midtrans Error:", error);
      showVendingQR({}, `ANTASARI-${Date.now()}`);
    } finally {
      setLoadingPayment(false);
    }
  }

  async function handleRegularOrder() {
    setLoadingPayment(true);
    const orderId = `ANTASARI-${Date.now()}`;
    const activeUser = JSON.parse(localStorage.getItem('am_user_session') || '{}');

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
    if (selectedDelivery === 'pickup') {
      const newReceipt = {
        orderId: `ANTASARI-${Date.now()}`,
        queueNumber: `A-${Math.floor(10 + Math.random() * 90)}`,
        total: total
      };
      setReceiptData(newReceipt);
      setStep('receipt_pickup');
    } else {
      setStep('searching_driver');
      setTimeout(() => {
        setStep('success');
      }, 3000);
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
    <div style={{ padding: '24px 16px 80px', maxWidth: 800, margin: '0 auto', fontFamily: 'var(--am-font-body)' }}>
      {step === 'form' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onBack} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--am-text)' }}>
              ←
            </button>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--am-text)' }}>Checkout Pembayaran</h2>
          </div>

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
                { id: 'vending', title: '🤖 Vending Machine', desc: 'Ambil instan via QR Scanner' },
                { id: 'pickup', title: '🚶 Pick-Up Mandiri', desc: 'Ambil di tenant/koperasi' },
                { id: 'courier', title: '🛵 Kurir Antasari (+Rp5.000)', desc: 'Diantar langsung ke lokasimu' }
              ].map(opt => (
                <div
                  key={opt.id}
                  onClick={() => setDelivery(opt.id as any)}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    border: `2px solid ${delivery === opt.id ? '#5FA874' : 'var(--am-border)'}`,
                    background: delivery === opt.id ? '#FCE7EE' : 'var(--am-surface)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: delivery === opt.id ? '0 4px 12px rgba(95, 168, 116, 0.15)' : 'none'
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--am-text)', marginBottom: 2 }}>{opt.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>{opt.desc}</div>
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
                  style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--am-border)', background: 'var(--am-surface)', color: 'var(--am-text)', fontSize: 13 }}
                >
                  <option value="">-- Pilih Titik Gedung Kampus --</option>
                  {LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
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
          <div className="am-card" style={{ padding: 20, borderRadius: 20, background: 'var(--am-surface)' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: 'var(--am-text)' }}>Pilih Metode Pembayaran</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              {[
                { id: 'seabank', label: '🌊 SeaBank (Nurmiyaty)' },
                { id: 'gopay', label: '💚 GoPay (Nurmiyaty)' },
                { id: 'qris', label: '💳 Midtrans Snap' },
                { id: 'cod', label: '💵 Bayar Tunai (COD / Kasir)' }
              ].map(pm => (
                <div
                  key={pm.id}
                  onClick={() => setPayment(pm.id as any)}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: `2px solid ${payment === pm.id ? '#5FA874' : 'var(--am-border)'}`,
                    background: payment === pm.id ? '#FCE7EE' : 'var(--am-surface)',
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: 12,
                    textAlign: 'center',
                    color: 'var(--am-text)',
                    boxShadow: payment === pm.id ? '0 4px 12px rgba(95, 168, 116, 0.15)' : 'none'
                  }}
                >
                  {pm.label}
                </div>
              ))}
            </div>

            {/* Kotak Rincian Rekening SeaBank */}
            {payment === 'seabank' && (
              <div style={{ padding: 18, borderRadius: 16, background: '#FAFDFB', border: '1.5px solid #5FA874', marginTop: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#4D9562', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  🌊 QR & REKENING SEABANK INDONESIA
                </div>
                <div style={{ display: 'inline-block', padding: 12, background: 'white', borderRadius: 16, boxShadow: '0 4px 15px rgba(0,0,0,0.08)', marginBottom: 12 }}>
                  <QRCodeSVG value="https://app.seabank.co.id/transfer?account=901156882439" size={150} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--am-text-muted)', marginBottom: 2 }}>
                  Nomor Rekening SeaBank:
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#3A744C', letterSpacing: 2, marginBottom: 4 }}>
                  901156882439
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#4D9562', marginBottom: 12 }}>
                  Atas Nama: <strong>Nurmiyaty</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('901156882439');
                    alert('Nomor rekening SeaBank (901156882439) a.n. Nurmiyaty berhasil disalin! 📋');
                  }}
                  style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: '#4D9562', color: 'white', fontSize: 12, fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 8px rgba(95, 168, 116, 0.25)' }}
                >
                  📋 Salin Nomor Rekening SeaBank
                </button>
              </div>
            )}

            {/* Kotak Rincian GoPay */}
            {payment === 'gopay' && (
              <div style={{ padding: 18, borderRadius: 16, background: '#ECFDF5', border: '1.5px solid #10B981', marginTop: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#065F46', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  💚 QR & NOMOR GOPAY / QRIS
                </div>
                <div style={{ display: 'inline-block', padding: 12, background: 'white', borderRadius: 16, boxShadow: '0 4px 15px rgba(0,0,0,0.08)', marginBottom: 12 }}>
                  <QRCodeSVG value="https://gopay.co.id/pay?phone=08813576012" size={150} />
                </div>
                <div style={{ fontSize: 13, color: '#064E3B', marginBottom: 2 }}>
                  Nomor Telepon GoPay:
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#047857', letterSpacing: 2, marginBottom: 4 }}>
                  08813576012
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#059669', marginBottom: 12 }}>
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

          {/* Ringkasan Total & Tombol Konfirmasi */}
          <div className="am-card" style={{ padding: 20, borderRadius: 20, background: 'var(--am-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: 'var(--am-text-muted)' }}>
              <span>Subtotal Produk</span>
              <span>{formatRupiah(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13, color: 'var(--am-text-muted)' }}>
              <span>Biaya Pengantaran</span>
              <span>{formatRupiah(deliveryFee)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, fontSize: 16, fontWeight: 900, color: 'var(--am-primary)', borderTop: '1px solid var(--am-border)', paddingTop: 12 }}>
              <span>Total Pembayaran</span>
              <span>{formatRupiah(total)}</span>
            </div>

            <button
              onClick={() => {
                if (payment === 'qris') {
                  handleMidtransPayment();
                } else {
                  handleRegularOrder();
                }
              }}
              disabled={loadingPayment}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 14,
                border: 'none',
                background: 'linear-gradient(135deg, #5FA874 0%, #5FA874 100%)',
                color: 'white',
                fontSize: 15,
                fontWeight: 800,
                cursor: loadingPayment ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(244, 174, 194, 0.35)'
              }}
            >
              {loadingPayment ? 'Memproses Pesanan...' : (payment === 'seabank' || payment === 'gopay') ? 'Saya Sudah Transfer, Dapatkan Token Vending 🚀' : payment === 'qris' ? 'Bayar via Midtrans Snap 💳' : 'Konfirmasi Pesanan Sekarang 🚀'}
            </button>
          </div>
        </div>
      )}

      {/* Tampilan Vending QR */}
      {step === 'vending_qr' && vendingData && (
        <div className="am-card" style={{ padding: 30, borderRadius: 24, background: 'var(--am-surface)', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🤖✨</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, color: 'var(--am-text)' }}>QR Klaim Vending Machine</h2>
          <p style={{ fontSize: 13, color: 'var(--am-text-muted)', marginBottom: 20 }}>
            Scan kode QR di layar mesin vending kampus atau masukkan kode token untuk mengeluarkan barang.
          </p>

          <div style={{ display: 'inline-block', padding: 16, background: 'white', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', marginBottom: 16 }}>
            <QRCodeSVG value={vendingData.vendingToken} size={200} />
          </div>

          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 2, color: 'var(--am-primary)', marginBottom: 12 }}>
            TOKEN: {vendingData.vendingToken}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#16A34A', marginBottom: 20 }}>
            Slot Mesin: #{vendingData.slotNumber}
          </div>

          <div style={{ fontSize: 12, color: '#DC2626', fontWeight: 700, marginBottom: 20 }}>
            ⏳ Menghubungkan ke Mesin Vending dalam {countdown} detik...
          </div>

          <button
            onClick={() => {
              setStep('vending_dispensing');
              setTimeout(() => setStep('vending_done'), 2000);
            }}
            style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'var(--am-primary)', color: 'white', fontWeight: 700, cursor: 'pointer' }}
          >
            Simulasikan Pengambilan Mesin Sekarang 📦
          </button>
        </div>
      )}

      {step === 'vending_dispensing' && (
        <div className="am-card" style={{ padding: 40, borderRadius: 24, background: 'var(--am-surface)', textAlign: 'center' }}>
          <div style={{ fontSize: 54, marginBottom: 12 }}>⚙️📦</div>
          <h3 style={{ margin: '0 0 8px', color: 'var(--am-text)' }}>Mesin Sedang Mengeluarkan Barang...</h3>
          <p style={{ fontSize: 13, color: 'var(--am-text-muted)' }}>Mohon tunggu, gantungan kunci / barang Anda sedang diturunkan ke boks pengambilan.</p>
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
            onClick={() => onConfirmOrder('pickup', payment, finalLocation)}
            style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #5FA874 0%, #5FA874 100%)', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(244, 174, 194, 0.35)' }}
          >
            Selesai & Kembali ke Beranda 🏠
          </button>
        </div>
      )}

      {/* Tampilan Struk Pick-Up */}
      {step === 'receipt_pickup' && receiptData && (
        <div className="am-card" style={{ padding: 30, borderRadius: 24, background: 'var(--am-surface)', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🧾✨</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, color: 'var(--am-text)' }}>Nomor Antrean Pesanan</h2>
          <p style={{ fontSize: 13, color: 'var(--am-text-muted)', marginBottom: 20 }}>
            Tunjukkan nomor antrean ini ke kasir/tenant saat mengambil pesanan.
          </p>

          <div style={{ background: 'var(--am-bg2)', padding: '20px', borderRadius: 16, marginBottom: 24 }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--am-primary)', letterSpacing: 2 }}>
              {receiptData.queueNumber}
            </div>
            <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginTop: 4 }}>
              Order ID: {receiptData.orderId}
            </div>
          </div>

          <button
            onClick={() => onConfirmOrder('pickup', payment, finalLocation)}
            style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: 'var(--am-primary)', color: 'white', fontWeight: 800, cursor: 'pointer' }}
          >
            Kembali ke Beranda 🏠
          </button>
        </div>
      )}

      {/* Mencari Driver */}
      {step === 'searching_driver' && (
        <div className="am-card" style={{ padding: 40, borderRadius: 24, background: 'var(--am-surface)', textAlign: 'center' }}>
          <div style={{ fontSize: 54, marginBottom: 12 }}>🛵🔍</div>
          <h3 style={{ margin: '0 0 8px', color: 'var(--am-text)' }}>Mencari Driver Antasari Terdekat...</h3>
          <p style={{ fontSize: 13, color: 'var(--am-text-muted)' }}>Sistem sedang menyambungkan pesananmu dengan kurir mahasiswa yang bertugas.</p>
        </div>
      )}

      {step === 'success' && (
        <div className="am-card" style={{ padding: 30, borderRadius: 24, background: 'var(--am-surface)', textAlign: 'center' }}>
          <div style={{ fontSize: 54, marginBottom: 12 }}>🛵🎉</div>
          <h2 style={{ margin: '0 0 8px', color: '#16A34A' }}>Driver Berhasil Ditemukan!</h2>
          <p style={{ fontSize: 13, color: 'var(--am-text-muted)', marginBottom: 24 }}>
            Kurir sedang menuju lokasi penjual untuk mengambil pesananmu.
          </p>
          <button
            onClick={() => onConfirmOrder('courier', payment, finalLocation)}
            style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: 'var(--am-primary)', color: 'white', fontWeight: 800, cursor: 'pointer' }}
          >
            Lihat Status Pengantaran 📍
          </button>
        </div>
      )}
    </div>
  );
}
