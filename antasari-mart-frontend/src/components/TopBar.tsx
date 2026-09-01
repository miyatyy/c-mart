import { useState } from 'react'
import type { AppTab, Campus, ThemeMode, UserRole, CartItem } from '../types'
import { useRealtimeLocation } from '../lib/useRealtimeLocation'

interface TopBarProps {
  theme: ThemeMode
  campus: Campus
  setCampus: (c: Campus) => void
  activeTab: AppTab
  setActiveTab: (t: AppTab) => void
  role: UserRole
  setRole: (r: UserRole) => void
  userName: string
  userEmail?: string
  userAvatar: string
  cartItems: CartItem[]
  chatUnread: number
  onToggleTheme: () => void
  onLogout: () => void
  isGuest?: boolean
  onRequireLogin?: () => void
  hasActiveOrder?: boolean
  onOpenProfileModal?: () => void
  onToggleMobileSidebar?: () => void
}

export default function TopBar({
  theme, campus, setCampus, activeTab: _activeTab, setActiveTab,
  role, userName, userEmail, userAvatar, isGuest, onRequireLogin,
  onLogout, onOpenProfileModal, onToggleMobileSidebar
}: TopBarProps) {
  const isAesthetic = theme === 'aesthetic'

  // 📡 Pelacakan GPS Real-Time dengan Reverse Geocoding
  const {
    status: gpsStatus,
    locationName: gpsLocationName,
    accuracy,
    distanceKm,
    refreshLocation
  } = useRealtimeLocation(campus, setCampus);

  const [showLocationTooltip, setShowLocationTooltip] = useState(false);

  const storedAvatar = typeof window !== 'undefined' ? localStorage.getItem('am_user_avatar') : null;
  const activeAvatar = storedAvatar || userAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=MayaSmile&backgroundColor=b6e3f4';

  const handleProfileClick = () => {
    if (isGuest) {
      if (onRequireLogin) onRequireLogin();
    } else if (onOpenProfileModal) {
      onOpenProfileModal();
    }
  }

  return (
    <header style={{ background: 'var(--am-surface)', borderBottom: '1px solid var(--am-border)', position: 'sticky', top: 0, zIndex: 100 }}>
      <style>{`
        @keyframes pulseGps {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 7px rgba(34, 197, 94, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        @keyframes pulseDetecting {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
        .gps-pulse-live {
          animation: pulseGps 2s infinite;
        }
        .gps-pulse-detecting {
          animation: pulseDetecting 1.2s infinite;
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', gap: 8 }}>
        
        {/* Sisi Kiri: Tombol Hamburger Menu + Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* 📱 Tombol Hamburger Menu Khusus HP */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onToggleMobileSidebar) onToggleMobileSidebar();
            }}
            aria-label="Buka Menu Sidebar"
            style={{
              background: 'var(--am-bg2)',
              border: '1px solid var(--am-border)',
              borderRadius: 10,
              width: 36,
              height: 36,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 'bold',
              color: 'var(--am-primary)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
              zIndex: 102
            }}
            title="Buka Sidebar Menu"
          >
            ☰
          </button>

          {/* Logo Antasari Mart */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setActiveTab('home')}>
            <div style={{
              width: 34, height: 34, borderRadius: isAesthetic ? '50%' : 8,
              background: 'linear-gradient(135deg, #5FA874 0%, #F4AEC2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 800, color: 'white', flexShrink: 0,
              boxShadow: '0 2px 8px rgba(95, 168, 116, 0.25)'
            }}>A</div>
            <div>
              <div className="am-heading" style={{ fontSize: isAesthetic ? 14.5 : 14, fontWeight: 800, color: 'var(--am-text)', lineHeight: 1.1 }}>
                Antasari Mart
              </div>
              <div style={{ fontSize: 10.5, color: '#5FA874', fontWeight: 600, lineHeight: 1.1, display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                <span>✨</span>
                <span>Campus Hub</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tengah: 🛰️ INDIKATOR GPS REAL-TIME (OTOMATIS TANPA TOMBOL BJM/BJB) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, position: 'relative' }}>
          <div
            onClick={() => {
              refreshLocation();
              setShowLocationTooltip(prev => !prev);
            }}
            title="Lokasi terdeteksi otomatis melalui GPS. Klik untuk refresh sinyal GPS!"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: gpsStatus === 'detecting' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(95, 168, 116, 0.1)',
              border: `1.5px solid ${gpsStatus === 'detecting' ? '#F59E0B' : '#5FA874'}`,
              borderRadius: 999,
              padding: '5px 12px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.2s ease',
              userSelect: 'none',
              maxWidth: '100%'
            }}
          >
            {/* Titik Radar Pulse */}
            <span
              className={gpsStatus === 'detecting' ? 'gps-pulse-detecting' : 'gps-pulse-live'}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: gpsStatus === 'detecting' ? '#F59E0B' : '#22C55E',
                display: 'inline-block',
                flexShrink: 0
              }}
            />

            {/* Teks Lokasi Otomatis GPS */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
              <div style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6, color: '#5FA874', lineHeight: 1 }}>
                🛰️ GPS REAL-TIME
              </div>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--am-text)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '135px',
                lineHeight: 1.2,
                marginTop: 1
              }}>
                {gpsLocationName}
              </div>
            </div>

            {/* Ikon Refresh */}
            <span
              style={{
                fontSize: 10,
                opacity: 0.7,
                marginLeft: 2,
                transform: gpsStatus === 'detecting' ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.5s ease'
              }}
            >
              🔄
            </span>
          </div>

          {/* Tooltip Info GPS Detail saat diklik */}
          {showLocationTooltip && (
            <div
              style={{
                position: 'absolute',
                top: '115%',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--am-surface)',
                border: '1px solid var(--am-border)',
                borderRadius: 14,
                padding: '12px 16px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                zIndex: 200,
                width: 250,
                textAlign: 'left',
                fontFamily: 'var(--am-font-body)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#5FA874' }}>📍 INFO LOKASI GPS</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLocationTooltip(false);
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--am-text-muted)' }}
                >
                  ✕
                </button>
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--am-text)', margin: '0 0 6px', fontWeight: 600 }}>
                {gpsLocationName}
              </p>
              <div style={{ fontSize: 10, color: 'var(--am-text-muted)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span>🎯 Kampus Aktif: <strong>{campus === 'banjarbaru' ? 'Kampus 2 Banjarbaru' : 'Kampus 1 Banjarmasin'}</strong></span>
                {distanceKm !== null && <span>📏 Jarak Kampus: ±{distanceKm} km</span>}
                {accuracy !== null && <span>📡 Akurasi GPS: ±{accuracy} meter</span>}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  refreshLocation();
                }}
                style={{
                  marginTop: 8,
                  width: '100%',
                  padding: '6px 0',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--am-primary)',
                  color: 'white',
                  fontSize: 10.5,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                🔄 Perbarui Lokasi Sekarang
              </button>
            </div>
          )}
        </div>

        {/* Sisi Kanan: Foto Profil & Tombol Masuk/Keluar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div 
            onClick={handleProfileClick}
            title="Klik untuk Edit Profil"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            {isGuest ? (
              <div style={{ 
                width: 32, height: 32, borderRadius: '50%', background: 'var(--am-bg2)', 
                border: '2px solid var(--am-border)', display: 'flex', alignItems: 'center', 
                justifyContent: 'center', fontSize: 14, flexShrink: 0, color: 'var(--am-text-muted)' 
              }}>
                👤
              </div>
            ) : (
              <img 
                src={activeAvatar} 
                alt={userName} 
                style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', background: '#e2e8f0', border: '2px solid var(--am-primary)', flexShrink: 0 }} 
              />
            )}
          </div>
          
          <button 
            onClick={onLogout}
            style={{ 
              background: isGuest ? 'var(--am-primary)' : '#EF4444', color: 'white', border: 'none', borderRadius: 8, 
              padding: '6px 10px', fontSize: 10.5, fontWeight: 800, cursor: 'pointer', letterSpacing: 0.3
            }}
          >
            {isGuest ? 'MASUK' : 'LOGOUT'}
          </button>
        </div>
      </div>
    </header>
  )
}
