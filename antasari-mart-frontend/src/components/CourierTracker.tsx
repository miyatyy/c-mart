import { useState, useEffect } from 'react'
import type { ThemeMode, Campus } from '../types'
import { MOCK_DRIVERS } from '../data'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

interface CourierTrackerProps {
  theme: ThemeMode
  campus: Campus
  orderId?: string
  driverName?: string
  driverPhone?: string
  driverAvatar?: string
  userName?: string
  userEmail?: string
  onFinishTracking?: () => void
}

type DeliveryStatus = 'searching' | 'found' | 'heading_seller' | 'picked_up' | 'on_the_way' | 'arrived'

const STATUS_STEPS: { key: DeliveryStatus; label: string; icon: string; desc: string }[] = [
  { key: 'searching', label: 'Menyiapkan Pesanan', icon: '🔍', desc: 'Sistem mencari driver terdekat...' },
  { key: 'found', label: 'Driver Ditemukan', icon: '✅', desc: 'Driver menerima pesananmu' },
  { key: 'heading_seller', label: 'Menuju Toko', icon: '🛵', desc: 'Driver dalam perjalanan ke toko penjual' },
  { key: 'picked_up', label: 'Pesanan Diambil', icon: '📦', desc: 'Driver sudah mengambil pesananmu' },
  { key: 'on_the_way', label: 'Dalam Perjalanan', icon: '🚀', desc: 'Driver sedang menuju lokasimu' },
  { key: 'arrived', label: 'Pesanan Tiba!', icon: '🎉', desc: 'Pesananmu sudah sampai. Selamat menikmati!' },
]

export default function CourierTracker({ 
  theme: _theme, 
  campus, 
  driverName = 'Ahmad Fauzi', 
  driverPhone = '08121235001', 
  driverAvatar = 'https://i.pravatar.cc/150?img=8',
  userName = 'Miyatul',
  userEmail = 'miyya@gmail.com',
  onFinishTracking
}: CourierTrackerProps) {
  // 👉 Deteksi pickup secara persisten dan akurat
  const savedMethod = localStorage.getItem('am_delivery_method') || ''
  const isPickup = savedMethod === 'pickup' || savedMethod === 'ambil_sendiri' || savedMethod === 'Ambil Sendiri'

  const [statusIndex, setStatusIndex] = useState(0)
  
  const [currentPosition, setCurrentPosition] = useState<[number, number]>([-3.3168, 114.5901])
  const [locationName, setLocationName] = useState('Mendeteksi lokasi aktif GPS...')

  const [showRatingModal, setShowRatingModal] = useState(false)
  const [sellerRating, setSellerRating] = useState(5)
  const [driverRating, setDriverRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [isRated, setIsRated] = useState(false)

  const [showPointNotification, setShowPointNotification] = useState(false)
  const [totalPoints, setTotalPoints] = useState(() => {
    return parseInt(localStorage.getItem('am_user_points') || '145', 10)
  })

  // Nomor antrian acak unik untuk ambil sendiri
  const [queueNumber] = useState(() => {
    return 'AM-' + Math.floor(100 + Math.random() * 900)
  })

  const drivers = MOCK_DRIVERS.filter(d => d.campus === campus)

  useEffect(() => {
    if (!isPickup && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentPosition([position.coords.latitude, position.coords.longitude])
          setLocationName('Titik Toko Koperasi Antasari Mart')
        },
        () => {
          setLocationName('Koperasi Kampus UIN Antasari (' + (campus === 'banjarmasin' ? 'Banjarmasin' : 'Banjarbaru') + ')')
        },
        { enableHighAccuracy: true }
      )
    }
  }, [campus, isPickup])

  useEffect(() => {
    if (isPickup) return 
    if (statusIndex >= STATUS_STEPS.length - 1) return
    const t = setTimeout(() => {
      const nextIndex = statusIndex + 1
      setStatusIndex(nextIndex)
      if (nextIndex === STATUS_STEPS.length - 1 && !isRated) {
        setShowRatingModal(true)
      }
    }, 4000)
    return () => clearTimeout(t)
  }, [statusIndex, isRated, isPickup])

  const currentStatus = STATUS_STEPS[statusIndex]
  const progressPct = (statusIndex / (STATUS_STEPS.length - 1)) * 100

  function handleFinishPickupOrRating() {
    setShowRatingModal(true)
  }

  function handleConfirmRatingAndPoints() {
    setIsRated(true)
    setShowRatingModal(false)

    const updatedPoints = totalPoints + 5
    setTotalPoints(updatedPoints)
    localStorage.setItem('am_user_points', updatedPoints.toString())

    setShowPointNotification(true)
  }

  function handleClosePointNotification() {
    setShowPointNotification(false)
    // 👉 Bersihkan status pesanan aktif & metode pengiriman
    localStorage.removeItem('am_active_order')
    localStorage.removeItem('am_delivery_method')
    
    if (onFinishTracking) {
      onFinishTracking()
    } else {
      window.location.hash = '#home'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    }
  }

  const ratingModalStyles = `
    @keyframes bounceIn {
      0% { opacity: 0; transform: scale(0.8) translateY(20px); }
      70% { transform: scale(1.05) translateY(-5px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes floatCute {
      0% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-4px) rotate(1deg); }
      100% { transform: translateY(0px) rotate(0deg); }
    }
    .cute-receipt {
      animation: floatCute 3s ease-in-out infinite;
    }
    .rating-modal-appear {
      animation: bounceIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
    .star-btn {
      transition: transform 0.2s;
      cursor: pointer;
    }
    .star-btn:hover {
      transform: scale(1.2);
    }
  `;

  // ==================== TAMPILAN KHUSUS AMBIL SENDIRI (STRUK & NOMOR ANTRIAN AESTHETIC) ====================
  if (isPickup) {
    return (
      <div style={{ padding: '20px 16px 80px', maxWidth: 540, margin: '0 auto', fontFamily: 'var(--am-font-body)' }}>
        <style>{ratingModalStyles}</style>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h2 className="am-heading" style={{ margin: '0 0 4px', fontSize: 22, color: 'var(--am-text)' }}>
            🎟️ Struk Pengambilan Mandiri
          </h2>
          <p style={{ fontSize: 13, color: 'var(--am-text-muted)', margin: 0 }}>
            Tunjukkan struk digital estetik ini ke tenant toko koperasi! ✨
          </p>
        </div>

        <div className="cute-receipt am-card" style={{
          padding: 30, borderRadius: 28, background: 'var(--am-surface)',
          boxShadow: '0 15px 35px rgba(0,0,0,0.08)', border: '2px dashed var(--am-primary)',
          textAlign: 'center', marginBottom: 20
        }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🛍️</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--am-text-muted)', letterSpacing: 2, marginBottom: 2 }}>
            ANTASARI MART KOPERASI
          </div>
          <div style={{ fontSize: 12, color: 'var(--am-primary)', fontWeight: 700, marginBottom: 16 }}>
            Kampus {campus === 'banjarmasin' ? 'Banjarmasin (BJM)' : 'Banjarbaru (BJB)'}
          </div>

          <div style={{ padding: '6px 14px', background: 'rgba(74, 197, 108, 0.15)', color: '#16A34A', borderRadius: 999, fontSize: 12, fontWeight: 700, display: 'inline-block', marginBottom: 16 }}>
            🟢 Pesanan Siap Diambil di Kasir
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--am-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            NOMOR ANTRIAN
          </div>
          <div style={{ fontSize: 48, fontWeight: 900, color: 'var(--am-primary)', margin: '4px 0 16px', letterSpacing: 3 }}>
            {queueNumber}
          </div>

          <div style={{ background: 'var(--am-bg2)', padding: 16, borderRadius: 16, textAlign: 'left', marginBottom: 20, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid var(--am-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--am-text-muted)' }}>Nama Pemesan:</span>
              <span style={{ fontWeight: 700, color: 'var(--am-text)' }}>{userName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--am-text-muted)' }}>Email Akun:</span>
              <span style={{ fontWeight: 700, color: 'var(--am-text)' }}>{userEmail}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--am-text-muted)' }}>Metode:</span>
              <span style={{ fontWeight: 700, color: 'var(--am-text)' }}>Ambil Sendiri di Toko 🏪</span>
            </div>
          </div>

          <p style={{ fontSize: 12, color: 'var(--am-text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
            Silakan datang langsung ke tenant toko koperasi atau hubungi penjual via chat jika sudah sampai di lokasi.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a
              href="https://wa.me/628121235001?text=Halo%20Admin,%20saya%20ingin%20konfirmasi%20pesanan%20dengan%20Nomor%20Antrian%20"
              target="_blank"
              rel="noreferrer"
              style={{
                padding: '12px 0', background: '#25D366', color: 'white', borderRadius: 12,
                fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)'
              }}
            >
              💬 Chat Seller / Tenant Toko (WhatsApp)
            </a>

            {!isRated ? (
              <button
                className="am-btn-primary"
                onClick={handleFinishPickupOrRating}
                style={{ width: '100%', padding: '12px 0', borderRadius: 12, fontSize: 13, fontWeight: 700, background: 'var(--am-primary)', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                ✅ Pesanan Selesai Diambil & Ambil +5 Poin 🎁
              </button>
            ) : (
              <div style={{ padding: '12px', background: 'rgba(74,197,108,0.1)', borderRadius: 10, textAlign: 'center', color: '#16A34A', fontSize: 13, fontWeight: 700 }}>
                ✨ Terima kasih! Struk selesai digunakan.
              </div>
            )}
          </div>
        </div>

        {/* MODAL RATING UNTUK PICKUP */}
        {showRatingModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            backdropFilter: 'blur(5px)'
          }}>
            <div className="rating-modal-appear am-card" style={{
              width: '100%', maxWidth: 420, padding: 28, borderRadius: 24,
              background: 'var(--am-surface)', textAlign: 'left', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 42, marginBottom: 4 }}>⭐</div>
                <h3 className="am-heading" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--am-text)' }}>
                  Beri Penilaian Toko Koperasi
                </h3>
                <p style={{ fontSize: 12, color: 'var(--am-text-muted)', marginTop: 4 }}>
                  Isi ulasan untuk mendapatkan <strong style={{ color: 'var(--am-primary)' }}>+5 Poin Antasari Mart!</strong> 🎁
                </p>
              </div>

              <div style={{ marginBottom: 16, padding: 12, background: 'var(--am-bg2)', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)', marginBottom: 6 }}>
                  🏪 Rating Pelayanan Tenant Koperasi
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, fontSize: 28 }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <span
                      key={star}
                      className="star-btn"
                      onClick={() => setSellerRating(star)}
                      style={{ color: star <= sellerRating ? '#F59E0B' : '#D1D5DB' }}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)', display: 'block', marginBottom: 6 }}>
                  💬 Catatan / Ulasan Singkat (Opsional)
                </label>
                <textarea
                  className="am-input"
                  placeholder="Contoh: Pelayanan kasir cepat dan ramah!"
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: 13, borderRadius: 8, minHeight: 70, resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowRatingModal(false)}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1.5px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  Nanti Saja
                </button>
                <button
                  className="am-btn-primary"
                  onClick={handleConfirmRatingAndPoints}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: 'var(--am-primary)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  Kirim & Ambil Poin 🚀
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NOTIFIKASI POIN */}
        {showPointNotification && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            backdropFilter: 'blur(5px)'
          }}>
            <div className="rating-modal-appear am-card" style={{
              width: '100%', maxWidth: 380, padding: 30, borderRadius: 24,
              background: 'var(--am-surface)', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}>
              <div style={{ fontSize: 52, marginBottom: 10 }}>🎉</div>
              <div style={{
                display: 'inline-block', padding: '4px 12px', background: 'rgba(74, 197, 108, 0.15)',
                color: '#16A34A', borderRadius: 999, fontSize: 12, fontWeight: 700, marginBottom: 12
              }}>
                +5 Poin Berhasil Ditambahkan! 🌟
              </div>

              <h3 className="am-heading" style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: 'var(--am-text)' }}>
                Notifikasi Antasari Mart
              </h3>
              <p style={{ fontSize: 13, color: 'var(--am-text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
                Total poinmu sekarang: <strong style={{ color: 'var(--am-primary)', fontSize: 15 }}>{totalPoints} Poin</strong>.
              </p>

              <div style={{ padding: 12, background: 'var(--am-bg2)', borderRadius: 14, marginBottom: 20, fontSize: 12, color: 'var(--am-text)', textAlign: 'left' }}>
                🎯 <strong>Event Spesial Poin:</strong> Kumpulkan hingga <strong>2000 Poin</strong> untuk klaim bonus spesial & potongan promo menarik di setiap pembelian berikutnya di Antasari Mart! 🚀
              </div>

              <button
                className="am-btn-primary"
                onClick={handleClosePointNotification}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
                  background: 'var(--am-primary)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer'
                }}
              >
                Mantap, Lanjutkan Berbelanja 👍
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ==================== TAMPILAN NORMAL KURIR (DELIVERY) ====================
  return (
    <div style={{ padding: '16px 16px 80px', maxWidth: 800, margin: '0 auto', fontFamily: 'var(--am-font-body)' }}>
      <style>{ratingModalStyles}</style>

      <h2 className="am-heading" style={{ margin: '0 0 16px', fontSize: 20, color: 'var(--am-text)' }}>
        📍 Lacak Pesanan Real-Time
      </h2>

      <div className="am-card" style={{ padding: 20, marginBottom: 16, borderRadius: 16, background: 'var(--am-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', fontSize: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: statusIndex === STATUS_STEPS.length - 1 ? 'rgba(74,197,108,0.12)' : 'rgba(0,180,216,0.12)',
          }}>
            {currentStatus.icon}
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--am-text)' }}>{currentStatus.label}</div>
            <div style={{ fontSize: 13, color: 'var(--am-text-muted)', marginTop: 2 }}>{currentStatus.desc}</div>
          </div>
        </div>

        <div style={{ background: 'var(--am-border)', borderRadius: 999, height: 6, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{
            height: '100%', borderRadius: 999, transition: 'width 0.8s ease',
            width: `${progressPct}%`,
            background: statusIndex === STATUS_STEPS.length - 1 ? '#22C55E' : 'var(--am-primary)',
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          {STATUS_STEPS.map((s, i) => (
            <div
              key={s.key}
              title={s.label}
              style={{
                width: 10, height: 10, borderRadius: '50%',
                background: i <= statusIndex ? 'var(--am-primary)' : 'var(--am-border)',
                transition: 'background 0.4s',
              }}
            />
          ))}
        </div>

        {statusIndex === STATUS_STEPS.length - 1 && !isRated && (
          <button
            className="am-btn-primary"
            onClick={() => setShowRatingModal(true)}
            style={{ width: '100%', padding: '12px 0', borderRadius: 12, fontSize: 13, fontWeight: 700, background: 'var(--am-primary)', color: 'white', border: 'none', cursor: 'pointer' }}
          >
            ⭐ Beri Rating & Dapatkan +5 Poin Antasari Mart! 🎁
          </button>
        )}

        {isRated && (
          <div style={{ padding: '10px', background: 'rgba(74,197,108,0.1)', borderRadius: 10, textAlign: 'center', color: '#16A34A', fontSize: 13, fontWeight: 700 }}>
            ✨ Ulasan terkirim! Poin telah ditambahkan.
          </div>
        )}
      </div>

      {statusIndex >= 1 && (
        <div className="am-card am-slide-up" style={{ padding: 16, marginBottom: 16, borderRadius: 16, background: 'var(--am-surface)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Driver Kamu
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ position: 'relative' }}>
              <img src={driverAvatar} alt={driverName} style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid var(--am-primary)', objectFit: 'cover' }} />
              <div style={{
                position: 'absolute', bottom: 0, right: 0, width: 14, height: 14,
                background: '#22C55E', borderRadius: '50%', border: '2px solid var(--am-surface)',
              }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--am-text)' }}>{driverName}</div>
              <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginTop: 2 }}>⭐ 4.9 · 234 pengantaran · Kurir Kampus UIN</div>
            </div>
            <a
              href={`https://wa.me/62${driverPhone.replace(/^0/, '')}`}
              target="_blank"
              rel="noreferrer"
              style={{ padding: '8px 16px', background: '#25D366', color: 'white', borderRadius: 999, fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              📱 WhatsApp
            </a>
          </div>
        </div>
      )}

      <div className="am-card" style={{ overflow: 'hidden', marginBottom: 16, borderRadius: 16, background: 'var(--am-surface)' }}>
        <div style={{ padding: '14px 16px 10px', fontSize: 14, fontWeight: 700, color: 'var(--am-text)' }}>
          🗺 Peta Real-Time Kampus {campus === 'banjarmasin' ? 'Banjarmasin' : 'Banjarbaru'}
        </div>
        <div style={{ height: 380, width: '100%', position: 'relative' }}>
          <MapContainer 
            center={currentPosition} 
            zoom={16} 
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={currentPosition}>
              <Popup>
                📍 <strong>{locationName}</strong> <br /> Kurir sedang menuju ke titik ini.
              </Popup>
            </Marker>
          </MapContainer>
        </div>
      </div>

      <div className="am-card" style={{ padding: 16, borderRadius: 16, background: 'var(--am-surface)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)', marginBottom: 12 }}>🛵 Driver Aktif Lainnya di Kampus</div>
        {drivers.map(d => (
          <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--am-border)' }}>
            <div style={{ position: 'relative' }}>
              <img src={d.avatar} alt={d.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, background: d.isOnline ? '#22C55E' : '#9CA3AF', borderRadius: '50%', border: '2px solid var(--am-surface)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--am-text)' }}>{d.name}</div>
              <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>⭐ {d.rating} · {d.totalDeliveries} pengantaran</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: d.isOnline ? '#22C55E' : '#9CA3AF' }}>
              {d.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        ))}
      </div>

      {showRatingModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          backdropFilter: 'blur(5px)'
        }}>
          <div className="rating-modal-appear am-card" style={{
            width: '100%', maxWidth: 420, padding: 28, borderRadius: 24,
            background: 'var(--am-surface)', textAlign: 'left', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 42, marginBottom: 4 }}>⭐</div>
              <h3 className="am-heading" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--am-text)' }}>
                Beri Ulasan & Penilaian
              </h3>
              <p style={{ fontSize: 12, color: 'var(--am-text-muted)', marginTop: 4 }}>
                Isi ulasan penjual & driver untuk dapat <strong style={{ color: 'var(--am-primary)' }}>+5 Poin Antasari Mart!</strong> 🎁
              </p>
            </div>

            <div style={{ marginBottom: 16, padding: 12, background: 'var(--am-bg2)', borderRadius: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)', marginBottom: 6 }}>
                🏪 Rating Penjual (Toko)
              </div>
              <div style={{ display: 'flex', gap: 6, fontSize: 24 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <span
                    key={star}
                    className="star-btn"
                    onClick={() => setSellerRating(star)}
                    style={{ color: star <= sellerRating ? '#F59E0B' : '#D1D5DB' }}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)', display: 'block', marginBottom: 6 }}>
                💬 Catatan / Ulasan Singkat (Opsional)
              </label>
              <textarea
                className="am-input"
                placeholder="Contoh: Mantap, makanan enak!"
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', fontSize: 13, borderRadius: 8, minHeight: 70, resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowRatingModal(false)}
                style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1.5px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                Nanti Saja
              </button>
              <button
                className="am-btn-primary"
                onClick={handleConfirmRatingAndPoints}
                style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: 'var(--am-primary)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                Kirim & Ambil Poin 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {showPointNotification && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          backdropFilter: 'blur(5px)'
        }}>
          <div className="rating-modal-appear am-card" style={{
            width: '100%', maxWidth: 380, padding: 30, borderRadius: 24,
            background: 'var(--am-surface)', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>🎉</div>
            <div style={{
              display: 'inline-block', padding: '4px 12px', background: 'rgba(74, 197, 108, 0.15)',
              color: '#16A34A', borderRadius: 999, fontSize: 12, fontWeight: 700, marginBottom: 12
            }}>
              +5 Poin Berhasil Ditambahkan! 🌟
            </div>

            <h3 className="am-heading" style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: 'var(--am-text)' }}>
              Notifikasi Antasari Mart
            </h3>
            <p style={{ fontSize: 13, color: 'var(--am-text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
              Terima kasih telah memberikan ulasan! Total poinmu sekarang: <strong style={{ color: 'var(--am-primary)', fontSize: 15 }}>{totalPoints} Poin</strong>.
            </p>

            <div style={{ padding: 12, background: 'var(--am-bg2)', borderRadius: 14, marginBottom: 20, fontSize: 12, color: 'var(--am-text)', textAlign: 'left' }}>
              🎯 <strong>Event Spesial Poin:</strong> Kumpulkan hingga <strong>2000 Poin</strong> untuk klaim bonus spesial & potongan promo menarik di setiap pembelian berikutnya di Antasari Mart! 🚀
            </div>

            <button
              className="am-btn-primary"
              onClick={handleClosePointNotification}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
                background: 'var(--am-primary)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer'
              }}
            >
              Mantap, Lanjutkan Berbelanja 👍
            </button>
          </div>
        </div>
      )}
    </div>
  )
}