import { useState, useEffect } from 'react'
import type { CartItem, DeliveryMethod, PaymentMethod, ThemeMode, Campus } from '../types'
import { formatRupiah } from '../data'
import { QRCodeSVG } from 'qrcode.react'

declare global {
  interface Window {
    snap: any;
  }
}

interface CheckoutProps {
  theme: ThemeMode
  campus: Campus
  items: CartItem[]
  onConfirmOrder: (method: DeliveryMethod, payment: PaymentMethod, location: string) => void
  onBack: () => void
}

export default function Checkout({ theme: _theme, campus, items, onConfirmOrder, onBack }: CheckoutProps) {
  const isOnlyGanciInCart = items.every(i => 
    (i.product as any).sellerId === 'seller_1' || 
    i.product.name.toLowerCase().includes('ganci')
  );

  const [delivery, setDelivery] = useState<DeliveryMethod | 'vending'>(isOnlyGanciInCart ? 'vending' : 'pickup')
  const [payment, setPayment] = useState<PaymentMethod>('cod')
  
  const [selectedDropdownLocation, setSelectedDropdownLocation] = useState('')
  const [customLocationText, setCustomLocationText] = useState('')
  const [isCustomLocation, setIsCustomLocation] = useState(false)

  const [step, setStep] = useState<'form' | 'searching_driver' | 'success' | 'vending_qr' | 'vending_dispensing' | 'vending_done' | 'receipt_pickup'>('form')
  const [countdown, setCountdown] = useState(10)

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

  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const deliveryFee = delivery === 'courier' ? 5000 : 0
  const total = subtotal + deliveryFee

  const LOCATIONS = campus === 'banjarmasin'
    ? ['Gedung Syariah Lt. 1', 'Gedung Syariah Lt. 2', 'Gedung Dakwah Lt. 3', 'Gedung Tarbiyah', 'Kantin Belakang Tarbiyah', 'Perpustakaan Pusat', 'Masjid Kampus', 'Gedung Rektorat', 'Area Parkir Utama']
    : ['Gedung A Banjarbaru', 'Gedung B Banjarbaru', 'Kantin Kampus 2', 'Masjid Kampus 2', 'Perpustakaan Kampus 2']

  const finalLocation = delivery === 'pickup' 
    ? 'Ambil Sendiri di Tenant / Warung Koperasi' 
    : delivery === 'vending'
    ? 'Ambil di Vending Machine Antasari'
    : (isCustomLocation ? customLocationText.trim() : selectedDropdownLocation);

  useEffect(() => {
    const snapScriptUrl = 'https://app.sandbox.midtrans.com/snap/snap.js';
    const clientKey = 'Mid-client-8jHsm2sYfBK8gz1A';

    const script = document.createElement('script');
    script.src = snapScriptUrl;
    script.setAttribute('data-client-key', clientKey);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
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
      }, 2500);
    }

    return () => clearInterval(timer);
  }, [step, countdown]);

  function showVendingQR(data: any, orderId?: string) {
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
    try {
      const backendUrl = `http://${window.location.hostname}:5000/api/checkout`;
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: `ANTASARI-${Date.now()}`,
          grossAmount: total,
          customerDetails: {
            name: "Mahasiswa UIN Antasari",
            email: "mahasiswa@uin-antasari.ac.id"
          },
          items: items,
          deliveryMethod: delivery
        })
      });

      const data = await response.json();

      if (data.success && data.token) {
        window.snap.pay(data.token, {
          onSuccess: function (result: any) {
            showVendingQR(data, result.order_id);
          },
          onPending: function (result: any) {
            showVendingQR(data, result.order_id);
          },
          onError: function (_result: any) {
            alert("Pembayaran gagal, silakan coba lagi.");
          },
          onClose: function () {
            showVendingQR(data);
          }
        });
      } else {
        alert("Gagal terhubung ke Midtrans: " + (data.message || ''));
      }
    } catch (error) {
      console.error("Error koneksi checkout:", error);
      alert("Terjadi kesalahan koneksi ke server.");
    }
  }

  async function processOrderWithoutMidtrans(deliveryMethod: DeliveryMethod | 'vending') {
    const generatedOrderId = `ANTASARI-${Date.now()}`;
    try {
      const backendUrl = `http://${window.location.hostname}:5000/api/checkout`;
      await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: generatedOrderId,
          grossAmount: total,
          items: items,
          deliveryMethod: deliveryMethod
        })
      });
    } catch (error) {
      console.error("Gagal mengurangi stok produk:", error);
    }

    if (deliveryMethod === 'vending') {
      const vendingObj = {
        vendingToken: `VEND-${Math.floor(100000 + Math.random() * 900000)}`,
        slotNumber: 1,
        orderId: generatedOrderId
      };
      setVendingResult(vendingObj);
      localStorage.setItem('am_active_vending_qr', JSON.stringify(vendingObj));
      setCountdown(10);
      setStep('vending_qr');
    } else if (deliveryMethod === 'pickup') {
      setReceiptData({
        orderId: generatedOrderId,
        queueNumber: `A-${Math.floor(10 + Math.random() * 89)}`,
        total: total
      });
      setStep('receipt_pickup');
    } else {
      processOrderSuccess(deliveryMethod);
    }
  }

  function processOrderSuccess(deliveryMethod: DeliveryMethod | 'vending') {
    if (deliveryMethod === 'courier') {
      setStep('searching_driver');
      setTimeout(() => {
        setStep('success');
        onConfirmOrder('courier', payment, finalLocation);
      }, 5000);
    } else {
      setStep('success');
      onConfirmOrder('pickup', payment, finalLocation);
    }
  }

  function handleStartProcess() {
    if (delivery === 'courier' && !finalLocation) {
      alert("Mohon pilih atau ketik lokasi pengantaran terlebih dahulu!");
      return;
    }

    if (payment === 'qris') {
      handleMidtransPayment();
    } else {
      processOrderWithoutMidtrans(delivery);
    }
  }

  if (step === 'receipt_pickup' && receiptData) {
    return (
      <div className="am-slide-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 20px', gap: 16, maxWidth: 440, margin: '0 auto' }}>
        <div className="am-card" style={{ padding: 24, width: '100%', borderRadius: 20, background: '#FFFFFF', border: '2px dashed #00B4D8', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', color: '#334155' }}>
          
          <div style={{ textAlign: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>🛒 Struk Antrian Warung</div>
            <h3 style={{ margin: 0, fontSize: 18, color: '#0F172A', fontWeight: 800 }}>ANTASARI MART</h3>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748B' }}>Koperasi & Kantin Mahasiswa UIN Antasari</p>
          </div>

          <div style={{ textAlign: 'center', background: '#F0F9FF', padding: 14, borderRadius: 12, border: '1px solid #BAE6FD', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>Nomor Antrian Ambil:</div>
            <div style={{ fontSize: 38, fontWeight: 900, color: '#0284C7', letterSpacing: 1 }}>{receiptData.queueNumber}</div>
            <div style={{ fontSize: 10, color: '#0284C7' }}>Tunjukkan struk ini ke kasir/penjual warung saat mengambil barang</div>
          </div>

          <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>No. Transaksi:</span>
              <span style={{ fontWeight: 600 }}>{receiptData.orderId}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Metode Bayar:</span>
              <span style={{ fontWeight: 600, color: '#16A34A' }}>{payment === 'cod' ? 'Tunai di Warung (COD)' : payment.toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Lokasi Ambil:</span>
              <span style={{ fontWeight: 600 }}>Koperasi / Tenant Kampus</span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Rincian Barang:</div>
            {items.map(i => (
              <div key={i.product.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, color: '#475569' }}>
                <span>{i.product.name} x{i.quantity}</span>
                <span style={{ fontWeight: 600 }}>{formatRupiah(i.product.price * i.quantity)}</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '2px solid #0F172A', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>Total Bayar Tunai:</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#00B4D8' }}>{formatRupiah(receiptData.total)}</span>
          </div>

        </div>

        <button 
          className="am-btn-primary"
          onClick={() => {
            localStorage.removeItem('am_active_vending_qr');
            onConfirmOrder('pickup', payment, finalLocation);
          }}
          style={{ width: '100%', padding: '14px 0', borderRadius: 12, fontSize: 15, background: '#00B4D8', fontWeight: 700 }}
        >
          Selesai & Kembali ke Beranda 🏠
        </button>
      </div>
    );
  }

  if (step === 'vending_qr' && vendingData) {
    return (
      <div className="am-slide-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 24px', gap: 16, maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ width: 70, height: 70, background: 'rgba(0, 180, 216, 0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>📱</div>
        <h2 className="am-heading" style={{ margin: 0, fontSize: 22, color: 'var(--am-text)' }}>Scan QR di Mesin Vending</h2>
        
        <div className="am-card" style={{ padding: 24, width: '100%', borderRadius: 16, background: 'var(--am-surface)', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 13, color: 'var(--am-text-muted)', marginBottom: 12 }}>
            Arahkan QR Code ke scanner <strong>Mesin Vending Antasari Mart</strong> dalam:
          </div>

          <div style={{ fontSize: 28, fontWeight: 800, color: '#00B4D8', marginBottom: 16, background: 'rgba(0,180,216,0.1)', padding: '6px 16px', borderRadius: 999, display: 'inline-block' }}>
            ⏱️ 00:{countdown < 10 ? `0${countdown}` : countdown}
          </div>

          <div>
            <div style={{ background: '#FFFFFF', padding: 16, borderRadius: 12, display: 'inline-block', border: '2px solid #00B4D8' }}>
              <QRCodeSVG value={vendingData.vendingToken} size={210} level="H" />
            </div>
          </div>

          <div style={{ marginTop: 16, padding: '12px', background: 'var(--am-bg2)', borderRadius: 10, color: 'var(--am-text)', fontWeight: 600, fontSize: 13 }}>
            Kode Token: <code style={{ color: '#00B4D8' }}>{vendingData.vendingToken}</code> <br />
            Posisi Vending: Rel Slot No. {vendingData.slotNumber}
          </div>
        </div>

        <button 
          className="am-btn-primary" 
          onClick={() => { 
            localStorage.removeItem('am_active_vending_qr');
            setStep('vending_dispensing'); 
            setTimeout(() => setStep('vending_done'), 2500); 
          }}
          style={{ width: '100%', padding: '14px 0', fontSize: 14, borderRadius: 12, background: '#25D366' }}
        >
          ⚡ Simulasi Langsung Scan Berhasil
        </button>
      </div>
    );
  }

  if (step === 'vending_dispensing') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 24px', gap: 20, textAlign: 'center' }}>
        <style>{`
          @keyframes dropItem {
            0% { transform: translateY(-40px) rotate(0deg); opacity: 0; }
            50% { transform: translateY(10px) rotate(15deg); opacity: 1; }
            75% { transform: translateY(-5px) rotate(-10deg); }
            100% { transform: translateY(0) rotate(0deg); }
          }
          .vending-drop-anim {
            animation: dropItem 1.2s ease-in-out infinite;
          }
        `}</style>

        <div style={{ fontSize: 72 }} className="vending-drop-anim">
          🤖📦
        </div>

        <h2 className="am-heading" style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--am-text)' }}>
          QR Bekerja! Mesin Sedang Menjatuhkan Pesananmu...
        </h2>
        <p style={{ margin: 0, color: 'var(--am-text-muted)', fontSize: 13, maxWidth: 320 }}>
          Klek... Klak... Motor rel Vending Machine sedang berputar! ⚙️
        </p>
      </div>
    );
  }

  if (step === 'vending_done') {
    return (
      <div className="am-slide-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px', gap: 20, maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <style>{`
          @keyframes bounceCute {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-15px); }
          }
          .cute-bounce {
            animation: bounceCute 1.5s infinite;
          }
        `}</style>

        <div className="cute-bounce" style={{ fontSize: 80, margin: '10px 0' }}>
          🎁🧸✨
        </div>

        <h2 className="am-heading" style={{ margin: 0, fontSize: 24, color: '#2E7D32', fontWeight: 800 }}>
          Silakan Ambil Barang Anda!
        </h2>

        <div className="am-card" style={{ padding: 20, width: '100%', borderRadius: 16, background: '#E8F5E9', border: '2px solid #81C784' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1B5E20', marginBottom: 8 }}>
            Pesanan Ganci Kawat Bulu Berhasil Keluar! 🌸
          </div>
          <div style={{ fontSize: 13, color: '#2E7D32' }}>
            Barang sudah berada di laci/kotak pengambilan bagian bawah Mesin Vending. Terima kasih sudah berbelanja di Antasari Mart!
          </div>
        </div>

        <button 
          className="am-btn-primary" 
          onClick={() => {
            localStorage.removeItem('am_active_vending_qr');
            onConfirmOrder('pickup', payment, finalLocation);
          }}
          style={{ width: '100%', padding: '15px 0', fontSize: 16, borderRadius: 12, background: 'var(--am-primary)' }}
        >
          Selesai & Kembali ke Beranda 🏠
        </button>
      </div>
    );
  }

  if (step === 'searching_driver') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 24px', gap: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>🛵💨</div>
        <h2 className="am-heading" style={{ margin: '10px 0 0', fontSize: 20, fontWeight: 700, color: 'var(--am-text)' }}>
          Sedang Mencari Driver Terdekat...
        </h2>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="am-slide-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 24px', gap: 16, maxWidth: 480, margin: '0 auto' }}>
        <div style={{ fontSize: 36 }}>✅</div>
        <h2 className="am-heading" style={{ margin: 0, fontSize: 22, color: 'var(--am-text)' }}>Pesanan Berhasil Dibuat!</h2>
        <button className="am-btn-primary" onClick={onBack} style={{ width: '100%', padding: '14px 0', borderRadius: 12 }}>Kembali ke Beranda 🏠</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 16px 100px', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={onBack} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 20, color: 'var(--am-text)' }}>←</button>
        <h2 className="am-heading" style={{ margin: 0, fontSize: 20, color: 'var(--am-text)' }}>Checkout Pesanan</h2>
      </div>

      <div className="am-card" style={{ padding: 16, marginBottom: 16, borderRadius: 16 }}>
        <h3 className="am-heading" style={{ margin: '0 0 12px', fontSize: 15, color: 'var(--am-text)' }}>📦 Metode Pengambilan</h3>
        
        {!isOnlyGanciInCart && (
          <div style={{ fontSize: 12, color: '#D97706', backgroundColor: '#FEF3C7', padding: '8px 12px', borderRadius: 8, marginBottom: 10 }}>
            ⚠️ Pilihan <strong>Vending Machine</strong> hanya tersedia khusus untuk produk <strong>Ganci Myammiy Craft (Rp 25.000)</strong>.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { key: 'vending', label: 'Vending Machine', sub: 'Khusus Ganci', icon: '🤖', disabled: !isOnlyGanciInCart },
            { key: 'courier', label: 'Kurir Kampus', sub: `+${formatRupiah(5000)}`, icon: '🛵', disabled: false },
            { key: 'pickup', label: 'Ambil Sendiri', sub: 'Gratis Struk', icon: '🚶', disabled: false },
          ].map(d => (
            <button
              key={d.key}
              disabled={d.disabled}
              onClick={() => setDelivery(d.key as any)}
              style={{
                padding: '12px 6px', borderRadius: 12, cursor: d.disabled ? 'not-allowed' : 'pointer',
                opacity: d.disabled ? 0.4 : 1,
                border: `2px solid ${delivery === d.key ? 'var(--am-primary)' : 'var(--am-border)'}`,
                background: delivery === d.key ? 'rgba(0,180,216,0.08)' : 'var(--am-surface)',
                textAlign: 'center', transition: 'all 0.2s', fontFamily: 'var(--am-font-body)',
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 4 }}>{d.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--am-text)', lineHeight: 1.2 }}>{d.label}</div>
              <div style={{ fontSize: 10, color: delivery === d.key ? 'var(--am-primary)' : 'var(--am-text-muted)', marginTop: 2 }}>{d.sub}</div>
            </button>
          ))}
        </div>

        {delivery === 'courier' && (
          <div style={{ marginTop: 14 }} className="am-slide-up">
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--am-text-muted)', display: 'block', marginBottom: 6 }}>
              📍 Lokasi Antar (Gedung/Ruang Spesifik)
            </label>
            
            <select
              className="am-input"
              value={isCustomLocation ? 'custom_option' : selectedDropdownLocation}
              onChange={e => {
                if (e.target.value === 'custom_option') {
                  setIsCustomLocation(true);
                  setSelectedDropdownLocation('');
                } else {
                  setIsCustomLocation(false);
                  setSelectedDropdownLocation(e.target.value);
                }
              }}
              style={{ width: '100%', padding: '10px 12px', fontSize: 13, marginBottom: isCustomLocation ? 8 : 0, borderRadius: 8 }}
            >
              <option value="">-- Pilih lokasi kampus --</option>
              {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              <option value="custom_option">✏️ Ketik Lokasi Spesifik Sendiri (Lainnya)...</option>
            </select>

            {isCustomLocation && (
              <textarea
                className="am-input"
                placeholder="Contoh: Ruang Dosen Fakultas Syariah Lt. 2 / Depan Gedung Student Center"
                value={customLocationText}
                onChange={e => setCustomLocationText(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', fontSize: 13, resize: 'vertical', minHeight: 65, marginTop: 4, borderRadius: 8 }}
              />
            )}
          </div>
        )}
      </div>

      <div className="am-card" style={{ padding: 16, marginBottom: 16, borderRadius: 16 }}>
        <h3 className="am-heading" style={{ margin: '0 0 12px', fontSize: 15, color: 'var(--am-text)' }}>💳 Metode Pembayaran</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { key: 'qris', label: 'QRIS / Midtrans', icon: '📱' },
            { key: 'dana', label: 'DANA', icon: '💙' },
            { key: 'gopay', label: 'GoPay', icon: '💚' },
            { key: 'cod', label: 'Bayar Tunai (COD)', icon: '💵' },
          ].map(p => (
            <button
              key={p.key}
              onClick={() => setPayment(p.key as PaymentMethod)}
              style={{
                padding: '10px 8px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                border: `2px solid ${payment === p.key ? 'var(--am-primary)' : 'var(--am-border)'}`,
                background: payment === p.key ? 'rgba(0,180,216,0.08)' : 'var(--am-surface)',
                display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--am-font-body)',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 20 }}>{p.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--am-text)' }}>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="am-card" style={{ padding: 16, marginBottom: 20, borderRadius: 16 }}>
        <h3 className="am-heading" style={{ margin: '0 0 12px', fontSize: 15, color: 'var(--am-text)' }}>🧾 Ringkasan Pesanan</h3>
        {items.map(i => (
          <div key={i.product.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--am-text-muted)', marginBottom: 6 }}>
            <span>{i.product.name} ×{i.quantity}</span>
            <span style={{ fontWeight: 600, color: 'var(--am-text)' }}>{formatRupiah(i.product.price * i.quantity)}</span>
          </div>
        ))}
        <hr className="am-divider" style={{ margin: '8px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--am-text-muted)', marginBottom: 4 }}>
          <span>Ongkos kirim</span>
          <span>{delivery === 'courier' ? formatRupiah(deliveryFee) : 'Gratis'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700 }}>
          <span style={{ color: 'var(--am-text)' }}>Total</span>
          <span style={{ color: 'var(--am-primary)' }}>{formatRupiah(total)}</span>
        </div>
      </div>

      <button
        className="am-btn-primary"
        style={{ width: '100%', padding: '15px 0', fontSize: 16, opacity: (delivery === 'courier' && !finalLocation) ? 0.6 : 1, borderRadius: 12 }}
        disabled={delivery === 'courier' && !finalLocation}
        onClick={handleStartProcess}
      >
        {payment === 'qris' 
          ? '📱 Bayar dengan Midtrans & Dapatkan QR' 
          : (delivery === 'vending' 
              ? '🤖 Ambil di Vending Machine' 
              : (delivery === 'pickup' ? '📄 Cetak Struk Antrian Warung' : '🛵 Pesan & Cari Driver'))}
      </button>
    </div>
  )
}