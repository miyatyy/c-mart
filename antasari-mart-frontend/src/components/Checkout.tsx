import { useState } from 'react'
import type { CartItem, DeliveryMethod, PaymentMethod, ThemeMode, Campus } from '../types'
import { formatRupiah } from '../data'

interface CheckoutProps {
  theme: ThemeMode
  campus: Campus
  items: CartItem[]
  onConfirmOrder: (method: DeliveryMethod, payment: PaymentMethod, location: string) => void
  onBack: () => void
}

export default function Checkout({ theme: _theme, campus, items, onConfirmOrder, onBack }: CheckoutProps) {
  const [delivery, setDelivery] = useState<DeliveryMethod>('courier')
  const [payment, setPayment] = useState<PaymentMethod>('qris')
  
  const [selectedDropdownLocation, setSelectedDropdownLocation] = useState('')
  const [customLocationText, setCustomLocationText] = useState('')
  const [isCustomLocation, setIsCustomLocation] = useState(false)

  const [step, setStep] = useState<'form' | 'scan_qris' | 'searching_driver' | 'success'>('form')

  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const deliveryFee = delivery === 'courier' ? 3000 : 0
  const total = subtotal + deliveryFee

  const LOCATIONS = campus === 'banjarmasin'
    ? ['Gedung Syariah Lt. 1', 'Gedung Syariah Lt. 2', 'Gedung Dakwah Lt. 3', 'Gedung Tarbiyah', 'Kantin Belakang Tarbiyah', 'Perpustakaan Pusat', 'Masjid Kampus', 'Gedung Rektorat', 'Area Parkir Utama']
    : ['Gedung A Banjarbaru', 'Gedung B Banjarbaru', 'Kantin Kampus 2', 'Masjid Kampus 2', 'Perpustakaan Kampus 2']

  const finalLocation = delivery === 'pickup' 
    ? 'Ambil Sendiri di Tenant Koperasi' 
    : (isCustomLocation ? customLocationText.trim() : selectedDropdownLocation);

  function handleStartProcess() {
    if (delivery === 'courier' && !finalLocation) {
      alert("Mohon pilih atau ketik lokasi pengantaran terlebih dahulu!");
      return;
    }

    if (payment === 'qris') {
      setStep('scan_qris');
    } else if (delivery === 'courier') {
      triggerSearchDriver();
    } else {
      setStep('success');
      localStorage.setItem('am_active_order', 'true');
      localStorage.setItem('am_delivery_method', delivery); // 👉 Menyimpan 'pickup' dengan benar
      onConfirmOrder(delivery, payment, finalLocation);
    }
  }

  function triggerSearchDriver() {
    if (delivery === 'courier') {
      setStep('searching_driver');
      setTimeout(() => {
        setStep('success');
        localStorage.setItem('am_active_order', 'true');
        localStorage.setItem('am_delivery_method', 'courier');
        onConfirmOrder(delivery, payment, finalLocation);
      }, 5000);
    } else {
      setStep('success');
      localStorage.setItem('am_active_order', 'true');
      localStorage.setItem('am_delivery_method', 'pickup'); // 👉 Menyimpan 'pickup' dengan benar
      onConfirmOrder(delivery, payment, finalLocation);
    }
  }

  const deliveryAnimationStyles = `
    @keyframes driveCar {
      0% { transform: translateX(-100px); }
      50% { transform: translateX(120px); }
      100% { transform: translateX(-100px); }
    }
    @keyframes radarPulse {
      0% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.15); opacity: 0.3; }
      100% { transform: scale(0.95); opacity: 0.8; }
    }
    .driver-vehicle {
      animation: driveCar 2.5s ease-in-out infinite;
    }
    .radar-circle {
      animation: radarPulse 2s ease-in-out infinite;
    }
  `;

  if (step === 'scan_qris') {
    return (
      <div className="am-slide-up" style={{ maxWidth: 420, margin: '40px auto', padding: 24, textAlign: 'center' }}>
        <h2 className="am-heading" style={{ fontSize: 22, fontWeight: 700, color: 'var(--am-text)', marginBottom: 8 }}>
          📱 Pembayaran QRIS
        </h2>
        <p style={{ fontSize: 13, color: 'var(--am-text-muted)', marginBottom: 20 }}>
          Scan kode QR di bawah ini menggunakan aplikasi m-Banking atau E-Wallet kamu.
        </p>

        <div className="am-card" style={{ padding: 24, background: 'var(--am-surface)', borderRadius: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--am-text)', marginBottom: 12 }}>
            Total Tagihan: <strong style={{ color: 'var(--am-primary)' }}>{formatRupiah(total)}</strong>
          </div>
          
          <div style={{
            width: 180, height: 180, margin: '0 auto 16px', background: 'white', borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px dashed var(--am-primary)',
            boxShadow: '0 8px 20px rgba(0,0,0,0.06)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 56 }}>📷</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#333', marginTop: 4 }}>ANTASARI_MART_QRIS</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--am-text-muted)' }}>Mendukung QRIS, GoPay, OVO, DANA, BCA, Mandiri, dll.</div>
        </div>

        <button
          className="am-btn-primary"
          onClick={triggerSearchDriver}
          style={{ width: '100%', padding: '14px 0', fontSize: 15, fontWeight: 700, borderRadius: 12 }}
        >
          {delivery === 'courier' ? '✅ Selesai Scan & Bayar (Lanjut Cari Driver) 🚀' : '✅ Selesai Scan & Buat Pesanan Pick-Up 🎟️'}
        </button>
      </div>
    );
  }

  if (step === 'searching_driver') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 24px', gap: 20, textAlign: 'center' }}>
        <style>{deliveryAnimationStyles}</style>

        <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="radar-circle" style={{
            position: 'absolute', inset: 0, background: 'rgba(0, 180, 216, 0.2)', borderRadius: '50%'
          }} />
          <div className="driver-vehicle" style={{ fontSize: 48, zIndex: 2 }}>
            🛵💨
          </div>
        </div>

        <h2 className="am-heading" style={{ margin: '10px 0 0', fontSize: 20, fontWeight: 700, color: 'var(--am-text)' }}>
          Sedang Mencari Driver Terdekat...
        </h2>
        <p style={{ margin: 0, color: 'var(--am-text-muted)', fontSize: 13, maxWidth: 300, lineHeight: 1.5 }}>
          Sistem sedang menghubungkan pesananmu dengan mitra kurir/jasa antar di kampus {campus === 'banjarmasin' ? 'Banjarmasin' : 'Banjarbaru'}. Mohon tunggu sebentar ya!
        </p>

        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%', background: 'var(--am-primary)',
              animation: `pulse 1s ease-in-out ${i * 0.25}s infinite`,
            }} />
          ))}
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="am-slide-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 24px', gap: 16, maxWidth: 480, margin: '0 auto' }}>
        <div style={{ width: 70, height: 70, background: 'rgba(74,197,108,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>✅</div>
        <h2 className="am-heading" style={{ margin: 0, fontSize: 22, color: 'var(--am-text)' }}>Pesanan Berhasil Dibuat!</h2>
        
        {delivery === 'courier' ? (
          <div className="am-card" style={{ padding: 20, width: '100%', borderRadius: 16, background: 'var(--am-surface)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', marginBottom: 12, textAlign: 'center', background: 'rgba(22,163,74,0.1)', padding: '6px', borderRadius: 8 }}>
              🎉 Driver Ditemukan & Siap Mengantar Pesananmu!
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&auto=format" alt="Driver" style={{ width: 68, height: 68, borderRadius: '50%', border: '3px solid var(--am-primary)', objectFit: 'cover' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--am-text)' }}>Ahmad Fauzi, S.Kom</div>
                <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginTop: 2 }}>⭐ 4.9 · 234 pengantaran · Mahasiswa FEBI</div>
                <div style={{ fontSize: 11, color: 'var(--am-primary)', fontWeight: 600, marginTop: 4 }}>🛵 Honda Beat · DA 4567 AM</div>
              </div>
              <a
                href="https://wa.me/628121235001"
                target="_blank"
                rel="noreferrer"
                style={{ padding: '8px 14px', background: '#25D366', color: 'white', borderRadius: 999, fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                📱 WA
              </a>
            </div>

            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--am-text-muted)', borderTop: '1px solid var(--am-border)', paddingTop: 10 }}>
              📍 <strong>Tujuan Pengantaran:</strong> {finalLocation}
            </div>

            <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--am-bg2)', borderRadius: 8, fontSize: 12, color: 'var(--am-text-muted)' }}>
              🛵 Driver sedang menuju lapak penjual. Cek menu <strong>Lacak Pengiriman</strong> di sidebar untuk memantau perjalanan secara real-time.
            </div>
          </div>
        ) : (
          <div className="am-card" style={{ padding: 20, width: '100%', borderRadius: 16, background: 'var(--am-surface)', textAlign: 'center' }}>
            <div style={{ fontSize: 42, marginBottom: 8 }}>🎟️</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--am-text)', marginBottom: 4 }}>
              Ambil Sendiri di Tenant Koperasi
            </div>
            <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginBottom: 16 }}>
              Silakan buka menu <strong>Order Pick-Up</strong> di sidebar atau navigasi atas untuk melihat nomor antrian pengambilanmu.
            </div>
          </div>
        )}

        <div className="am-card" style={{ padding: 16, width: '100%', borderRadius: 16, background: 'var(--am-surface)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)', marginBottom: 8 }}>Ringkasan Pesanan</div>
          {items.map(i => (
            <div key={i.product.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--am-text-muted)', marginBottom: 4 }}>
              <span>{i.product.name} ×{i.quantity}</span>
              <span>{formatRupiah(i.product.price * i.quantity)}</span>
            </div>
          ))}
          <hr className="am-divider" style={{ margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: 'var(--am-primary)' }}>
            <span>Total Pembayaran</span>
            <span>{formatRupiah(total)}</span>
          </div>
        </div>
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
        <h3 className="am-heading" style={{ margin: '0 0 12px', fontSize: 15, color: 'var(--am-text)' }}>📦 Metode Pengiriman</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { key: 'courier', label: 'Antar Kurir Kampus', sub: `+${formatRupiah(3000)}`, icon: '🛵' },
            { key: 'pickup', label: 'Ambil Sendiri', sub: 'Gratis', icon: '🚶' },
          ].map(d => (
            <button
              key={d.key}
              onClick={() => setDelivery(d.key as DeliveryMethod)}
              style={{
                flex: 1, padding: '12px 8px', borderRadius: 12, cursor: 'pointer',
                border: `2px solid ${delivery === d.key ? 'var(--am-primary)' : 'var(--am-border)'}`,
                background: delivery === d.key ? 'rgba(0,180,216,0.08)' : 'var(--am-surface)',
                textAlign: 'center', transition: 'all 0.2s', fontFamily: 'var(--am-font-body)',
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 4 }}>{d.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text)', lineHeight: 1.3 }}>{d.label}</div>
              <div style={{ fontSize: 11, color: delivery === d.key ? 'var(--am-primary)' : 'var(--am-text-muted)', marginTop: 2 }}>{d.sub}</div>
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
            { key: 'qris', label: 'QRIS', icon: '📱' },
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
          <span>Ongkos kirim kurir</span>
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
        {payment === 'qris' ? '📱 Lanjut Bayar QRIS & Konfirmasi' : (delivery === 'courier' ? '🛵 Pesan & Cari Driver' : '✅ Konfirmasi Pesanan Ambil Sendiri')}
      </button>
    </div>
  )
}