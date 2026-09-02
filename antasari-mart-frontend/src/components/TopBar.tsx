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
  onLogout, onOpenProfileModal, onToggleMobileSidebar, onToggleTheme
}: TopBarProps) {
  const isAesthetic = theme === 'aesthetic'

  // 📡 Pelacakan GPS Real-Time dengan Reverse Geocoding & Webhook
  const {
    status: gpsStatus,
    cityName: gpsCityName,
  } = useRealtimeLocation(campus, setCampus);

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
              color: 'var(--am-primary)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
              zIndex: 102
            }}
            title="Buka Sidebar Menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          {/* Logo Antasari Mart */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setActiveTab('home')}>
            <div style={{
              width: 34, height: 34, borderRadius: isAesthetic ? '50%' : 8,
              background: 'linear-gradient(135deg, #5FA874 0%, #F4AEC2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 800, color: 'white', flexShrink: 0,
              boxShadow: '0 2px 8px rgba(95, 168, 116, 0.25)'
            }}>A</div>
            <div style={{ whiteSpace: 'nowrap' }}>
              <div className="am-heading" style={{ fontSize: isAesthetic ? 14 : 13.5, fontWeight: 800, color: 'var(--am-text)', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                Antasari Mart
              </div>
              <div style={{ fontSize: 10, color: 'var(--am-primary)', fontWeight: 600, lineHeight: 1.1, display: 'flex', alignItems: 'center', gap: 3, marginTop: 2, whiteSpace: 'nowrap' }}>
                <span>Campus Hub</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tengah: 📍 SIMBOL LOKASI DENGAN 1 KATA NAMA KOTA DI BAWAHNYA (REAL-TIME AUTO) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <div
            title={`Lokasi Aktif: ${gpsCityName || (campus === 'banjarbaru' ? 'Banjarbaru' : 'Banjarmasin')} (Terdeteksi Real-Time)`}
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px 8px',
              borderRadius: 12,
              background: 'transparent',
              userSelect: 'none'
            }}
          >
            {/* Simbol Ikon Lokasi SVG dengan Radar Ringan */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', color: 'var(--am-primary)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
                <circle cx="12" cy="10" r="2.8" fill="currentColor"/>
              </svg>
              {/* Titik Pulse Live Indikator */}
              <span
                className={gpsStatus === 'detecting' ? 'gps-pulse-detecting' : 'gps-pulse-live'}
                style={{
                  position: 'absolute',
                  top: -1,
                  right: -3,
                  width: 5.5,
                  height: 5.5,
                  borderRadius: '50%',
                  background: gpsStatus === 'detecting' ? '#F59E0B' : '#10B981'
                }}
              />
            </div>

            {/* 1 Kata Keterangan Nama Kota di Bawah Simbol */}
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                color: 'var(--am-text)',
                lineHeight: 1.1,
                marginTop: 2,
                letterSpacing: 0.2,
                textTransform: 'capitalize',
                whiteSpace: 'nowrap'
              }}
            >
              {gpsCityName || (campus === 'banjarbaru' ? 'Banjarbaru' : 'Banjarmasin')}
            </span>
          </div>
        </div>

        {/* Sisi Kanan: Toggle Mode Gelap/Terang + Foto Profil & Tombol Masuk/Keluar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Tombol Cepat Ganti Tema Terang/Gelap */}
          <button
            onClick={onToggleTheme}
            title={theme === 'modern' ? "Ganti ke Mode Terang (Siang)" : "Ganti ke Mode Gelap (Malam)"}
            aria-label="Ganti Tema Mode Gelap / Terang"
            style={{
              background: 'var(--am-bg2)',
              border: '1px solid var(--am-border)',
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--am-text)',
              fontSize: 14,
              transition: 'all 0.2s ease'
            }}
          >
            {theme === 'modern' ? (
              /* Sun Icon */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              /* Moon Icon */
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--am-text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
            ) : (
              <img 
                src={activeAvatar} 
                alt={userName} 
                style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', background: 'var(--am-bg2)', border: '2px solid var(--am-primary)', flexShrink: 0 }} 
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
