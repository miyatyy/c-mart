import { useState, useEffect } from 'react';
import type { CartItem, DeliveryMethod, PaymentMethod, ThemeMode, Campus } from '../types';
import { formatRupiah } from '../data';
import { QRCodeSVG } from 'qrcode.react';
import { checkoutApi, MIDTRANS_CLIENT_KEY } from '../lib/api';

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

export default function Checkout({ theme: _theme, campus, items, onConfirmOrder, onBack }: CheckoutProps) {
  const isOnlyGanciInCart = items.length > 0 && items.every(i => 
    (i.product as any).sellerId === 'seller_1' || 
    i.product.name.toLowerCase().includes('ganci')
  );

  const [delivery, setDelivery] = useState<DeliveryMethod | 'vending'>(isOnlyGanciInCart ? 'vending' : 'pickup');
  const [payment, setPayment] = useState<PaymentMethod>('cod');
  
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
    setLoadingPayment(true);
    try {
      const activeUser = JSON.parse(localStorage.getItem('am_user_session') || '{}');
      const data = await checkoutApi({
        orderId: `ANTASARI-${Date.now()}`,
        grossAmount: total,
        customerDetails: {
          name: activeUser.nama || activeUser.name || "Mahasiswa UIN Antasari",
          email: activeUser.email || "mahasiswa@uin-antasari.ac.id"
        },
        items: items,
        deliveryMethod: delivery
      });

      if (data.success && data.token && window.snap) {
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
    } catch (error: any) {
      console.error(error);
      alert("Terjadi kesalahan server saat checkout.");
    } finally {
      setLoadingPayment(false);
    }
  }

  async function handleRegularOrder() {
    setLoadingPayment(true);
    try {
      const activeUser = JSON.parse(localStorage.getItem('am_user_session') || '{}');
      const data = await checkoutApi({
        orderId: `ANTASARI-${Date.now()}`,
        grossAmount: total,
        customerDetails: {
          name: activeUser.nama || activeUser.name || "Mahasiswa UIN Antasari",
          email: activeUser.email || "mahasiswa@uin-antasari.ac.id"
        },
        items: items,
        deliveryMethod: delivery
      });

      if (data.success) {
        if (delivery === 'vending') {
          showVendingQR(data);
        } else {
          processOrderSuccess(delivery as DeliveryMethod);
        }
      } else {
        alert(data.message || 'Gagal memproses pesanan.');
      }
    } catch (e: any) {
      console.error(e);
      alert("Terjadi kesalahan koneksi saat memproses pesanan.");
    } finally {
      setLoadingPayment(false);
    }
  }

  function processOrderSuccess(selectedDelivery: DeliveryMethod) {
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
                    border: `2px solid ${delivery === opt.id ? 'var(--am-primary)' : 'var(--am-border)'}`,
                    background: delivery === opt.id ? 'rgba(0, 180, 216, 0.08)' : 'var(--am-surface)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
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
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: 'var(--am-text)' }}>Metode Pembayaran</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              {[
                { id: 'qris', label: '💳 Midtrans / QRIS / E-Wallet' },
                { id: 'cod', label: '💵 Bayar Tunai (COD / Kasir)' }
              ].map(pm => (
                <div
                  key={pm.id}
                  onClick={() => setPayment(pm.id as any)}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: `2px solid ${payment === pm.id ? 'var(--am-primary)' : 'var(--am-border)'}`,
                    background: payment === pm.id ? 'rgba(0, 180, 216, 0.08)' : 'var(--am-surface)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 13,
                    textAlign: 'center',
                    color: 'var(--am-text)'
                  }}
                >
                  {pm.label}
                </div>
              ))}
            </div>
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
                background: 'linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)',
                color: 'white',
                fontSize: 15,
                fontWeight: 800,
                cursor: loadingPayment ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(0, 180, 216, 0.3)'
              }}
            >
              {loadingPayment ? 'Memproses Pesanan...' : payment === 'qris' ? 'Bayar via Midtrans Snap 💳' : 'Konfirmasi Pesanan Sekarang 🚀'}
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
        <div className="am-card" style={{ padding: 30, borderRadius: 24, background: 'var(--am-surface)', textAlign: 'center' }}>
          <div style={{ fontSize: 54, marginBottom: 12 }}>🎉✅</div>
          <h2 style={{ margin: '0 0 8px', color: '#16A34A' }}>Barang Berhasil Diambil!</h2>
          <p style={{ fontSize: 13, color: 'var(--am-text-muted)', marginBottom: 24 }}>
            Terima kasih telah berbelanja menggunakan Antasari Smart Vending Machine.
          </p>
          <button
            onClick={() => onConfirmOrder('pickup', payment, finalLocation)}
            style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: 'var(--am-primary)', color: 'white', fontWeight: 800, cursor: 'pointer' }}
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
