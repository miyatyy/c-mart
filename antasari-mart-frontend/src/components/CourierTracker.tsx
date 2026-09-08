import { useState, useEffect, useMemo, useRef } from 'react'
import type { ThemeMode, Campus } from '../types'
import { MOCK_DRIVERS } from '../data'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface CourierTrackerProps {
  theme?: ThemeMode
  campus: Campus
  hasActiveOrder?: boolean
  orderId?: string
  driverName?: string
  driverPhone?: string
  driverAvatar?: string
  userName?: string
  userEmail?: string
  onFinishTracking?: () => void
  onNavigateHome?: () => void
  onNavigateCart?: () => void
}

type DeliveryStatus = 'searching' | 'found' | 'heading_seller' | 'picked_up' | 'on_the_way' | 'arrived'
type MapLayerStyle = 'modern' | 'dark' | 'satellite' | 'osm'

const STATUS_STEPS: { key: DeliveryStatus; label: string; icon: string; desc: string }[] = [
  { key: 'searching', label: 'Menyiapkan Pesanan', icon: '🔍', desc: 'Sistem mencari driver terdekat...' },
  { key: 'found', label: 'Driver Ditemukan', icon: '✅', desc: 'Driver menerima pesananmu' },
  { key: 'heading_seller', label: 'Menuju Toko', icon: '🛵', desc: 'Driver dalam perjalanan ke toko penjual' },
  { key: 'picked_up', label: 'Pesanan Diambil', icon: '📦', desc: 'Driver sudah mengambil pesananmu' },
  { key: 'on_the_way', label: 'Dalam Perjalanan', icon: '🚀', desc: 'Driver sedang menuju lokasimu' },
  { key: 'arrived', label: 'Pesanan Tiba!', icon: '🎉', desc: 'Pesananmu sudah sampai. Selamat menikmati!' },
]

// Default Kampus UIN Antasari Coordinates
const CAMPUS_COORDINATES: Record<Campus, [number, number]> = {
  banjarmasin: [-3.316823, 114.590142], // Kampus 1 A. Yani
  banjarbaru: [-3.447512, 114.832219],  // Kampus 2 Guntung Manggis
}

// Map Tile Layers
const MAP_LAYERS: Record<MapLayerStyle, { url: string; attribution: string; label: string; icon: string }> = {
  modern: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    label: 'Modern Clean',
    icon: '🌟'
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO Dark 3D</a>',
    label: 'Dark 3D',
    icon: '🌙'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri & NASA',
    label: 'Satelit Foto Udara',
    icon: '🛰️'
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    label: 'OSM Standar',
    icon: '🗺️'
  }
}

// Helper: Hitung jarak Haversine (meter)
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return Math.round(R * c)
}

// Helper component to smoothly center Leaflet map
function MapController({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(center, zoom || map.getZoom(), { duration: 1.2 })
  }, [center, zoom, map])
  return null
}

export default function CourierTracker({ 
  theme: _theme, 
  campus, 
  hasActiveOrder = false,
  driverName = 'Ahmad Fauzi', 
  driverPhone = '08121235001', 
  driverAvatar = 'https://i.pravatar.cc/150?img=8',
  userName = 'Pengunjung',
  userEmail = 'pengguna@antasari.ac.id',
  onFinishTracking,
  onNavigateHome,
  onNavigateCart
}: CourierTrackerProps) {
  const savedActive = hasActiveOrder && localStorage.getItem('am_active_order') === 'true'
  const savedMethod = (localStorage.getItem('am_delivery_method') || '').toLowerCase()
  
  const isCourierActive = savedActive && (savedMethod === 'delivery' || savedMethod === 'kurir' || savedMethod === 'antar')
  const isPickupActive = savedActive && (savedMethod === 'pickup' || savedMethod === 'ambil_sendiri' || savedMethod === 'ambil')

  const defaultCenter = CAMPUS_COORDINATES[campus] || CAMPUS_COORDINATES.banjarmasin
  const [userCoords, setUserCoords] = useState<[number, number]>(defaultCenter)
  const [userAccuracy, setUserAccuracy] = useState<number>(10)
  const [gpsStatus, setGpsStatus] = useState<'locating' | 'active' | 'denied_or_fallback'>('locating')
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [mapZoom, setMapZoom] = useState<number>(16)
  const [refreshKey, setRefreshKey] = useState<number>(0)
  const [mapStyle, setMapStyle] = useState<MapLayerStyle>('modern')

  // Nominatim Reverse Geocoding States
  const [resolvedAddress, setResolvedAddress] = useState<string>('Memuat alamat lokasi...')
  const [isGeocodingLoading, setIsGeocodingLoading] = useState<boolean>(false)
  const [addressCopied, setAddressCopied] = useState<boolean>(false)
  const lastGeocodeCoords = useRef<[number, number] | null>(null)

  // Pencarian Lokasi / Autocomplete
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isSearching, setIsSearching] = useState<boolean>(false)
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null)

  const [statusIndex, setStatusIndex] = useState(0)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [sellerRating, setSellerRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [isRated, setIsRated] = useState(false)

  const [showPointNotification, setShowPointNotification] = useState(false)
  const [totalPoints, setTotalPoints] = useState(() => {
    return parseInt(localStorage.getItem('am_user_points') || '145', 10)
  })

  const [queueNumber] = useState(() => {
    return 'AM-' + Math.floor(100 + Math.random() * 900)
  })

  const drivers = MOCK_DRIVERS.filter(d => d.campus === campus)

  // Jarak ke Koperasi Kampus
  const distanceToShop = useMemo(() => {
    const campusCoords = CAMPUS_COORDINATES[campus] || CAMPUS_COORDINATES.banjarmasin
    return calculateDistanceMeters(userCoords[0], userCoords[1], campusCoords[0], campusCoords[1])
  }, [userCoords, campus])

  // OpenStreetMap Nominatim Reverse Geocoding Function
  const fetchNominatimAddress = async (lat: number, lng: number) => {
    if (lastGeocodeCoords.current && 
        Math.abs(lastGeocodeCoords.current[0] - lat) < 0.0001 && 
        Math.abs(lastGeocodeCoords.current[1] - lng) < 0.0001) {
      return
    }

    setIsGeocodingLoading(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: { 'Accept-Language': 'id-ID, id;q=0.9, en;q=0.8' }
      })
      if (res.ok) {
        const data = await res.json()
        if (data && data.display_name) {
          setResolvedAddress(data.display_name)
          lastGeocodeCoords.current = [lat, lng]
        }
      } else {
        setResolvedAddress(`Kawasan Kampus UIN Antasari (${campus === 'banjarmasin' ? 'Banjarmasin' : 'Banjarbaru'})`)
      }
    } catch {
      setResolvedAddress(`Kawasan Kampus UIN Antasari (${campus === 'banjarmasin' ? 'Banjarmasin' : 'Banjarbaru'})`)
    } finally {
      setIsGeocodingLoading(false)
    }
  }

  // Real-time GPS Watcher
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('denied_or_fallback')
      fetchNominatimAddress(defaultCenter[0], defaultCenter[1])
      return
    }

    setGpsStatus('locating')

    const updateLocation = (position: GeolocationPosition) => {
      const lat = position.coords.latitude
      const lng = position.coords.longitude
      const acc = Math.round(position.coords.accuracy || 10)
      setUserCoords([lat, lng])
      setUserAccuracy(acc)
      setGpsStatus('active')
      setLastUpdated(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      fetchNominatimAddress(lat, lng)
    }

    navigator.geolocation.getCurrentPosition(
      updateLocation,
      (err) => {
        console.warn('GPS initial fallback:', err.message)
        setGpsStatus('denied_or_fallback')
        setUserCoords(CAMPUS_COORDINATES[campus] || CAMPUS_COORDINATES.banjarmasin)
        fetchNominatimAddress(defaultCenter[0], defaultCenter[1])
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    )

    const watchId = navigator.geolocation.watchPosition(
      updateLocation,
      (err) => {
        console.warn('GPS watch error:', err.message)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [campus, refreshKey])

  useEffect(() => {
    if (!isCourierActive) return
    if (statusIndex >= STATUS_STEPS.length - 1) return
    const t = setTimeout(() => {
      const nextIndex = statusIndex + 1
      setStatusIndex(nextIndex)
      if (nextIndex === STATUS_STEPS.length - 1 && !isRated) {
        setShowRatingModal(true)
      }
    }, 4500)
    return () => clearTimeout(t)
  }, [statusIndex, isRated, isCourierActive])

  const handleRecenterToUser = () => {
    if (navigator.geolocation) {
      setGpsStatus('locating')
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          setUserCoords([lat, lng])
          setUserAccuracy(Math.round(position.coords.accuracy || 10))
          setGpsStatus('active')
          setMapZoom(17)
          setRefreshKey(prev => prev + 1)
          fetchNominatimAddress(lat, lng)
        },
        () => {
          setGpsStatus('denied_or_fallback')
        },
        { enableHighAccuracy: true, timeout: 5000 }
      )
    }
  }

  const handleOpenInNativeMaps = () => {
    const [lat, lng] = userCoords
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    window.open(url, '_blank')
  }

  const handleCopyAddress = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(resolvedAddress)
      setAddressCopied(true)
      setTimeout(() => setAddressCopied(false), 2500)
    }
  }

  const handleSearchLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setSearchFeedback(null)

    try {
      const queryWithCampus = `${searchQuery.trim()}, Banjarmasin, Kalimantan Selatan`
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryWithCampus)}&limit=1`, {
        headers: { 'Accept-Language': 'id-ID, id;q=0.9, en;q=0.8' }
      })
      if (res.ok) {
        const results = await res.json()
        if (results && results.length > 0) {
          const target = results[0]
          const targetLat = parseFloat(target.lat)
          const targetLng = parseFloat(target.lon)
          setUserCoords([targetLat, targetLng])
          setResolvedAddress(target.display_name)
          setMapZoom(17)
          setSearchFeedback(`📍 Ditemukan: ${target.display_name.slice(0, 45)}...`)
        } else {
          setSearchFeedback('Lokasi tidak ditemukan di sekitar area kampus.')
        }
      }
    } catch {
      setSearchFeedback('Gagal mencari lokasi. Coba ketik nama jalan yang lebih spesifik.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleClearOrderTracking = () => {
    localStorage.removeItem('am_active_order')
    localStorage.removeItem('am_delivery_method')
    if (onFinishTracking) onFinishTracking()
  }

  const userPulseIcon = useMemo(() => {
    return L.divIcon({
      className: 'am-pulse-user-marker',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(59, 130, 246, 0.35); animation: amPulseRipple 1.8s ease-out infinite;"></div>
          <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background: rgba(59, 130, 246, 0.55);"></div>
          <div style="width: 16px; height: 16px; border-radius: 50%; background: #2563EB; border: 3px solid #FFFFFF; box-shadow: 0 2px 8px rgba(37, 99, 235, 0.6); position: relative; z-index: 3;"></div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22]
    })
  }, [])

  const campusShopIcon = useMemo(() => {
    return L.divIcon({
      className: 'am-campus-shop-marker',
      html: `
        <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #10B981, #059669); color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; border: 3px solid #FFFFFF; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.45); cursor: pointer;">
          🏪
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    })
  }, [])

  const courierMarkerIcon = useMemo(() => {
    return L.divIcon({
      className: 'am-courier-live-marker',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(249, 115, 22, 0.3); animation: amPulseRipple 1.5s ease-out infinite;"></div>
          <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #F97316, #EA580C); color: white; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.5); position: relative; z-index: 3;">
            🛵
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22]
    })
  }, [])

  const driverLiveCoords = useMemo<[number, number]>(() => {
    const baseCampus = CAMPUS_COORDINATES[campus] || CAMPUS_COORDINATES.banjarmasin
    const ratio = statusIndex / (STATUS_STEPS.length - 1)
    const lat = baseCampus[0] + (userCoords[0] - baseCampus[0]) * ratio + (statusIndex < 3 ? 0.0015 : 0)
    const lng = baseCampus[1] + (userCoords[1] - baseCampus[1]) * ratio + (statusIndex < 3 ? 0.0015 : 0)
    return [lat, lng]
  }, [campus, statusIndex, userCoords])

  const currentStatus = STATUS_STEPS[statusIndex]
  const progressPct = (statusIndex / (STATUS_STEPS.length - 1)) * 100

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
    localStorage.removeItem('am_active_order')
    localStorage.removeItem('am_delivery_method')
    
    if (onFinishTracking) {
      onFinishTracking()
    } else if (onNavigateHome) {
      onNavigateHome()
    } else {
      window.location.hash = '#home'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    }
  }

  const customTrackerStyles = `
    @keyframes amPulseRipple {
      0% { transform: scale(0.6); opacity: 0.9; }
      100% { transform: scale(2.0); opacity: 0; }
    }
    @keyframes amBounceIn {
      0% { opacity: 0; transform: scale(0.85) translateY(15px); }
      70% { transform: scale(1.03) translateY(-4px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes amFloatSoft {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-4px); }
      100% { transform: translateY(0px); }
    }
    .am-rating-modal-appear {
      animation: amBounceIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
    .am-soft-float {
      animation: amFloatSoft 3s ease-in-out infinite;
    }
    .am-star-btn {
      transition: transform 0.15s ease, filter 0.15s ease;
      cursor: pointer;
    }
    .am-star-btn:hover {
      transform: scale(1.25);
    }
    .am-layer-chip {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      border: 1.5px solid var(--am-border);
      background: var(--am-surface);
      color: var(--am-text-muted);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.2s ease;
    }
    .am-layer-chip.active {
      background: var(--am-primary);
      color: white;
      border-color: var(--am-primary);
      box-shadow: 0 2px 8px rgba(74,197,108,0.35);
    }
  `

  if (isPickupActive) {
    return (
      <div style={{ padding: '20px 16px 80px', maxWidth: 540, margin: '0 auto', fontFamily: 'var(--am-font-body)' }}>
        <style>{customTrackerStyles}</style>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h2 className="am-heading" style={{ margin: '0 0 4px', fontSize: 22, color: 'var(--am-text)' }}>
            🎟️ Struk Pengambilan Mandiri
          </h2>
          <p style={{ fontSize: 13, color: 'var(--am-text-muted)', margin: 0 }}>
            Tunjukkan struk digital ini ke kasir / tenant toko koperasi kampus! ✨
          </p>
        </div>

        <div className="am-soft-float am-card" style={{
          padding: 28, borderRadius: 24, background: 'var(--am-surface)',
          boxShadow: '0 15px 35px rgba(0,0,0,0.08)', border: '2px dashed var(--am-primary)',
          textAlign: 'center', marginBottom: 20
        }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🛍️</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--am-text-muted)', letterSpacing: 2, marginBottom: 2 }}>
            ANTASARI MART KOPERASI
          </div>
          <div style={{ fontSize: 13, color: 'var(--am-primary)', fontWeight: 700, marginBottom: 16 }}>
            Kampus {campus === 'banjarmasin' ? '1 Banjarmasin' : '2 Banjarbaru'}
          </div>

          <div style={{ padding: '6px 14px', background: 'rgba(74, 197, 108, 0.15)', color: '#16A34A', borderRadius: 999, fontSize: 12, fontWeight: 700, display: 'inline-block', marginBottom: 16 }}>
            🟢 Pesanan Siap Diambil di Kasir
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--am-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            NOMOR ANTRIAN
          </div>
          <div style={{ fontSize: 46, fontWeight: 900, color: 'var(--am-primary)', margin: '4px 0 16px', letterSpacing: 3 }}>
            {queueNumber}
          </div>

          <div style={{ background: 'var(--am-bg2)', padding: 16, borderRadius: 16, textAlign: 'left', marginBottom: 20, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid var(--am-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--am-text-muted)' }}>Nama Pemesan:</span>
              <span style={{ fontWeight: 700, color: 'var(--am-text)' }}>{userName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--am-text-muted)' }}>Email:</span>
              <span style={{ fontWeight: 700, color: 'var(--am-text)' }}>{userEmail}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--am-text-muted)' }}>Metode:</span>
              <span style={{ fontWeight: 700, color: 'var(--am-text)' }}>Ambil Sendiri di Toko 🏪</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a
              href="https://wa.me/628121235001?text=Halo%20Admin,%20saya%20ingin%20konfirmasi%20pengambilan%20pesanan%20Antasari%20Mart%20Nomor%20Antrian%20"
              target="_blank"
              rel="noreferrer"
              style={{
                padding: '12px 0', background: '#25D366', color: 'white', borderRadius: 12,
                fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)'
              }}
            >
              💬 Hubungi Admin / Penjual Toko
            </a>

            <button
              className="am-btn-primary"
              onClick={handleClosePointNotification}
              style={{ width: '100%', padding: '12px 0', borderRadius: 12, fontSize: 13, fontWeight: 700, background: 'var(--am-primary)', color: 'white', border: 'none', cursor: 'pointer' }}
            >
              ✅ Selesai & Kembali ke Peta Lokasi
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isCourierActive) {
    return (
      <div style={{ padding: '16px 16px 80px', maxWidth: 780, margin: '0 auto', fontFamily: 'var(--am-font-body)' }}>
        <style>{customTrackerStyles}</style>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 className="am-heading" style={{ margin: 0, fontSize: 20, color: 'var(--am-text)' }}>
              🛵 Lacak Pengiriman Kurir Kampus
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--am-text-muted)' }}>
              Pesanan aktif sedang diantar menuju titik lokasimu secara real-time
            </p>
          </div>
          <button
            onClick={handleClearOrderTracking}
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text-muted)', cursor: 'pointer'
            }}
          >
            Tutup Lacak ✕
          </button>
        </div>

        <div className="am-card" style={{ padding: 20, marginBottom: 16, borderRadius: 18, background: 'var(--am-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', fontSize: 26,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: statusIndex === STATUS_STEPS.length - 1 ? 'rgba(74,197,108,0.15)' : 'rgba(249, 115, 22, 0.15)',
            }}>
              {currentStatus.icon}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--am-text)' }}>{currentStatus.label}</div>
              <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginTop: 2 }}>{currentStatus.desc}</div>
            </div>
          </div>

          <div style={{ background: 'var(--am-border)', borderRadius: 999, height: 6, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{
              height: '100%', borderRadius: 999, transition: 'width 0.8s ease',
              width: `${progressPct}%`,
              background: statusIndex === STATUS_STEPS.length - 1 ? '#22C55E' : 'linear-gradient(90deg, #F97316, #10B981)',
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            {STATUS_STEPS.map((s, i) => (
              <div
                key={s.key}
                title={s.label}
                style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: i <= statusIndex ? (statusIndex === STATUS_STEPS.length - 1 ? '#22C55E' : '#F97316') : 'var(--am-border)',
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
              ⭐ Beri Ulasan & Ambil +5 Poin Antasari Mart! 🎁
            </button>
          )}

          {isRated && (
            <div style={{ padding: '10px', background: 'rgba(74,197,108,0.1)', borderRadius: 10, textAlign: 'center', color: '#16A34A', fontSize: 13, fontWeight: 700 }}>
              ✨ Pesanan selesai! Ulasan dan poin telah tersimpan.
            </div>
          )}
        </div>

        <div className="am-card" style={{ padding: 16, marginBottom: 16, borderRadius: 18, background: 'var(--am-surface)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--am-text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Driver Kurir Pengantar
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ position: 'relative' }}>
              <img src={driverAvatar} alt={driverName} style={{ width: 52, height: 52, borderRadius: '50%', border: '2.5px solid #F97316', objectFit: 'cover' }} />
              <div style={{
                position: 'absolute', bottom: 0, right: 0, width: 14, height: 14,
                background: '#22C55E', borderRadius: '50%', border: '2px solid var(--am-surface)',
              }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--am-text)' }}>{driverName}</div>
              <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginTop: 2 }}>⭐ 4.9 · Kurir Resmi Kampus UIN</div>
            </div>
            <a
              href={`https://wa.me/62${driverPhone.replace(/^0/, '')}?text=Halo%20Driver%20${driverName},%20saya%20pemesan%20di%20Antasari%20Mart`}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: '9px 16px', background: '#25D366', color: 'white', borderRadius: 999,
                fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)'
              }}
            >
              📱 WhatsApp
            </a>
          </div>
        </div>

        <div className="am-card" style={{ overflow: 'hidden', marginBottom: 16, borderRadius: 18, background: 'var(--am-surface)', border: '1px solid var(--am-border)' }}>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--am-border)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🗺️</span> Peta Perjalanan Kurir → Titik Anda
            </div>
            <button
              onClick={handleOpenInNativeMaps}
              style={{
                padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)', cursor: 'pointer'
              }}
            >
              Buka Maps HP ↗
            </button>
          </div>

          <div style={{ height: 350, width: '100%', position: 'relative' }}>
            <MapContainer 
              center={userCoords} 
              zoom={16} 
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
            >
              <MapController center={driverLiveCoords} />
              <TileLayer
                attribution={MAP_LAYERS[mapStyle].attribution}
                url={MAP_LAYERS[mapStyle].url}
              />

              <Marker position={driverLiveCoords} icon={courierMarkerIcon}>
                <Popup>
                  🛵 <strong>Driver: {driverName}</strong><br />
                  {currentStatus.label}
                </Popup>
              </Marker>

              <Marker position={userCoords} icon={userPulseIcon}>
                <Popup>
                  📍 <strong>Lokasi Anda</strong><br />
                  Titik Pengantaran Pesanan
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>

        {showRatingModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            backdropFilter: 'blur(5px)'
          }}>
            <div className="am-rating-modal-appear am-card" style={{
              width: '100%', maxWidth: 420, padding: 26, borderRadius: 24,
              background: 'var(--am-surface)', textAlign: 'left', boxShadow: '0 20px 40px rgba(0,0,0,0.25)'
            }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 40, marginBottom: 4 }}>⭐</div>
                <h3 className="am-heading" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--am-text)' }}>
                  Beri Ulasan Pengantaran
                </h3>
                <p style={{ fontSize: 12, color: 'var(--am-text-muted)', marginTop: 4 }}>
                  Ulas pelayanan driver & dapatkan <strong style={{ color: 'var(--am-primary)' }}>+5 Poin Antasari Mart!</strong> 🎁
                </p>
              </div>

              <div style={{ marginBottom: 16, padding: 12, background: 'var(--am-bg2)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)', marginBottom: 6 }}>
                  🛵 Rating Pengantaran Driver
                </div>
                <div style={{ display: 'flex', gap: 6, fontSize: 24 }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <span
                      key={star}
                      className="am-star-btn"
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
                  placeholder="Contoh: Kurir cepat sampai dan makanan diantar dengan aman!"
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: 13, borderRadius: 10, minHeight: 70, resize: 'vertical' }}
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
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            backdropFilter: 'blur(5px)'
          }}>
            <div className="am-rating-modal-appear am-card" style={{
              width: '100%', maxWidth: 380, padding: 28, borderRadius: 24,
              background: 'var(--am-surface)', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
              <div style={{
                display: 'inline-block', padding: '4px 12px', background: 'rgba(74, 197, 108, 0.15)',
                color: '#16A34A', borderRadius: 999, fontSize: 12, fontWeight: 700, marginBottom: 12
              }}>
                +5 Poin Berhasil Ditambahkan! 🌟
              </div>
              <h3 className="am-heading" style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 700, color: 'var(--am-text)' }}>
                Antasari Rewards
              </h3>
              <p style={{ fontSize: 13, color: 'var(--am-text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
                Terima kasih! Total poinmu saat ini: <strong style={{ color: 'var(--am-primary)', fontSize: 15 }}>{totalPoints} Poin</strong>.
              </p>
              <button
                className="am-btn-primary"
                onClick={handleClosePointNotification}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
                  background: 'var(--am-primary)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer'
                }}
              >
                Kembali ke Peta Lokasi 👍
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '16px 16px 80px', maxWidth: 840, margin: '0 auto', fontFamily: 'var(--am-font-body)' }}>
      <style>{customTrackerStyles}</style>

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
          <h2 className="am-heading" style={{ margin: 0, fontSize: 22, color: 'var(--am-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📍</span> Titik Lokasi Real-Time Anda
          </h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
              borderRadius: 999, fontSize: 11, fontWeight: 700,
              background: gpsStatus === 'active' ? 'rgba(74, 197, 108, 0.15)' : 'rgba(59, 130, 246, 0.15)',
              color: gpsStatus === 'active' ? '#16A34A' : '#2563EB'
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: gpsStatus === 'active' ? '#16A34A' : '#2563EB', display: 'inline-block' }} />
              {gpsStatus === 'active' ? 'GPS Live Terhubung' : (gpsStatus === 'locating' ? 'Mendeteksi GPS...' : 'Mode Kampus')}
            </span>
            <span style={{
              padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
              background: 'var(--am-bg2)', color: 'var(--am-text-muted)', border: '1px solid var(--am-border)'
            }}>
              🏫 {campus === 'banjarmasin' ? 'Kampus 1 Banjarmasin' : 'Kampus 2 Banjarbaru'}
            </span>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--am-text-muted)' }}>
          Terhubung otomatis ke <strong>OpenStreetMap Nominatim Reverse Geocoding API</strong> & layer peta presisi tinggi.
        </p>
      </div>

      <form onSubmit={handleSearchLocation} style={{ marginBottom: 14, display: 'flex', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            className="am-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Cari nama gedung / fakultas / tempat di sekitar kampus..."
            style={{ width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 13 }}
          />
        </div>
        <button
          type="submit"
          disabled={isSearching}
          style={{
            padding: '10px 18px', borderRadius: 12, border: 'none',
            background: 'var(--am-primary)', color: 'white', fontWeight: 700, fontSize: 13,
            cursor: isSearching ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 2px 8px rgba(74,197,108,0.25)'
          }}
        >
          {isSearching ? 'Mencari...' : 'Cari Titik'}
        </button>
      </form>
      {searchFeedback && (
        <div style={{ fontSize: 12, color: 'var(--am-primary)', marginBottom: 12, fontWeight: 600, padding: '4px 8px', background: 'rgba(74,197,108,0.1)', borderRadius: 8 }}>
          {searchFeedback}
        </div>
      )}

      <div className="am-card" style={{
        padding: '14px 16px', marginBottom: 14, borderRadius: 16,
        background: 'var(--am-surface)', border: '1.5px solid var(--am-border)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
          <span style={{ fontSize: 22, marginTop: 2 }}>🏡</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--am-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ALAMAT ANDA TERDETEKSI (NOMINATIM API)
              </span>
              {isGeocodingLoading && (
                <span style={{ fontSize: 10, color: '#2563EB', fontWeight: 700 }}>🔄 Memperbarui...</span>
              )}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)', lineHeight: 1.45 }}>
              {resolvedAddress}
            </div>
            <div style={{ fontSize: 11, color: 'var(--am-text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span>📏 Jarak ke Koperasi: <strong>{distanceToShop < 1000 ? `${distanceToShop} Meter` : `${(distanceToShop/1000).toFixed(1)} Km`}</strong></span>
              <span>🚶 Waktu tempuh: <strong>±{Math.max(1, Math.round(distanceToShop / 70))} menit</strong></span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={handleCopyAddress}
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              border: '1px solid var(--am-border)', background: addressCopied ? 'rgba(74,197,108,0.15)' : 'var(--am-bg2)',
              color: addressCopied ? '#16A34A' : 'var(--am-text)', cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            {addressCopied ? '✓ Tersalin!' : '📋 Salin Alamat'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, overflowX: 'auto', paddingBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--am-text-muted)', textTransform: 'uppercase', marginRight: 4, whiteSpace: 'nowrap' }}>
          TEMA PETA:
        </span>
        {(Object.keys(MAP_LAYERS) as MapLayerStyle[]).map(key => (
          <button
            key={key}
            onClick={() => setMapStyle(key)}
            className={`am-layer-chip ${mapStyle === key ? 'active' : ''}`}
          >
            <span>{MAP_LAYERS[key].icon}</span>
            <span>{MAP_LAYERS[key].label}</span>
          </button>
        ))}
      </div>

      <div className="am-card" style={{ overflow: 'hidden', marginBottom: 16, borderRadius: 20, background: 'var(--am-surface)', border: '1px solid var(--am-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
        <div style={{
          padding: '12px 16px', background: 'var(--am-surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
          borderBottom: '1px solid var(--am-border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{MAP_LAYERS[mapStyle].icon}</span>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)' }}>
                Peta Perangkat ({MAP_LAYERS[mapStyle].label})
              </span>
              {lastUpdated && (
                <span style={{ fontSize: 11, color: 'var(--am-text-muted)', marginLeft: 6 }}>
                  (Update: {lastUpdated})
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleRecenterToUser}
              title="Pusatkan ke titik lokasi saya sekarang"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)', cursor: 'pointer'
              }}
            >
              🎯 Pusatkan Titik Saya
            </button>
            <button
              onClick={handleOpenInNativeMaps}
              title="Buka titik koordinat ini di aplikasi Maps bawaan HP / Google Maps"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                border: 'none', background: 'var(--am-primary)', color: 'white', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(74,197,108,0.3)'
              }}
            >
              🗺️ Buka di Maps HP
            </button>
          </div>
        </div>

        <div style={{ height: 380, width: '100%', position: 'relative' }}>
          <MapContainer 
            center={userCoords} 
            zoom={mapZoom} 
            style={{ width: '100%', height: '100%' }}
          >
            <MapController center={userCoords} zoom={mapZoom} />
            <TileLayer
              key={mapStyle}
              attribution={MAP_LAYERS[mapStyle].attribution}
              url={MAP_LAYERS[mapStyle].url}
            />

            <Circle
              center={userCoords}
              radius={userAccuracy}
              pathOptions={{
                color: mapStyle === 'dark' ? '#60A5FA' : '#3B82F6',
                fillColor: mapStyle === 'dark' ? '#93C5FD' : '#60A5FA',
                fillOpacity: 0.22,
                weight: 1.5,
              }}
            />

            <Marker position={userCoords} icon={userPulseIcon}>
              <Popup>
                <div style={{ textAlign: 'center', padding: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1E40AF', marginBottom: 2 }}>
                    📍 Posisi Anda Terdeteksi
                  </div>
                  <div style={{ fontSize: 11, color: '#4B5563', marginBottom: 4 }}>
                    Koordinat: {userCoords[0].toFixed(5)}, {userCoords[1].toFixed(5)}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#059669' }}>
                    Akurasi: ±{userAccuracy} meter
                  </div>
                </div>
              </Popup>
            </Marker>

            <Marker position={CAMPUS_COORDINATES[campus] || CAMPUS_COORDINATES.banjarmasin} icon={campusShopIcon}>
              <Popup>
                <div style={{ textAlign: 'center', padding: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#065F46', marginBottom: 2 }}>
                    🏪 Toko Koperasi Antasari Mart
                  </div>
                  <div style={{ fontSize: 11, color: '#4B5563' }}>
                    Kampus {campus === 'banjarmasin' ? '1 Banjarmasin' : '2 Banjarbaru'}
                  </div>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>

        <div style={{
          padding: '14px 16px', background: 'var(--am-bg2)',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12,
          borderTop: '1px solid var(--am-border)'
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--am-text-muted)', fontWeight: 600 }}>KOORDINAT GPS LIVE</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)', marginTop: 2, fontFamily: 'monospace' }}>
              {userCoords[0].toFixed(6)}, {userCoords[1].toFixed(6)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--am-text-muted)', fontWeight: 600 }}>STATUS AKURASI SINYAL</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#16A34A', marginTop: 2 }}>
              🟢 ±{userAccuracy} Meter (Sangat Akurat)
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--am-text-muted)', fontWeight: 600 }}>LOKASI KAMPUS TERDEKAT</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)', marginTop: 2 }}>
              UIN Antasari ({campus === 'banjarmasin' ? 'Banjarmasin' : 'Banjarbaru'})
            </div>
          </div>
        </div>
      </div>

      <div className="am-card" style={{ padding: 18, borderRadius: 18, background: 'var(--am-surface)', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--am-text)' }}>🛵 Kurir Kampus Standby</div>
            <div style={{ fontSize: 12, color: 'var(--am-text-muted)' }}>Kurir resmi yang siap mengantarkan pesananmu dengan cepat</div>
          </div>
          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(74, 197, 108, 0.15)', color: '#16A34A', fontWeight: 700 }}>
            {drivers.filter(d => d.isOnline).length} Siap Antar
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {drivers.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--am-bg2)', borderRadius: 12, border: '1px solid var(--am-border)' }}>
              <div style={{ position: 'relative' }}>
                <img src={d.avatar} alt={d.name} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, background: d.isOnline ? '#22C55E' : '#9CA3AF', borderRadius: '50%', border: '2px solid var(--am-surface)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)' }}>{d.name}</div>
                <div style={{ fontSize: 11, color: 'var(--am-text-muted)', marginTop: 2 }}>⭐ {d.rating} · {d.totalDeliveries} pengantaran sukses</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: d.isOnline ? '#16A34A' : '#9CA3AF', padding: '4px 8px', borderRadius: 8, background: d.isOnline ? 'rgba(74,197,108,0.1)' : 'rgba(156,163,175,0.1)' }}>
                {d.isOnline ? '🟢 Siap Antar' : '⚪ Offline'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={onNavigateHome}
          className="am-btn-primary"
          style={{
            flex: 1, padding: '13px 0', borderRadius: 14, fontSize: 13, fontWeight: 700,
            background: 'var(--am-primary)', color: 'white', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 14px rgba(74,197,108,0.3)'
          }}
        >
          <span>🛍️</span> Jelajahi & Pesan Produk Sekarang
        </button>
        {onNavigateCart && (
          <button
            onClick={onNavigateCart}
            style={{
              padding: '13px 20px', borderRadius: 14, fontSize: 13, fontWeight: 700,
              border: '1.5px solid var(--am-border)', background: 'var(--am-surface)', color: 'var(--am-text)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <span>🛒</span> Keranjang
          </button>
        )}
      </div>
    </div>
  )
}