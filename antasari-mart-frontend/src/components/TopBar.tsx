import { useState, useEffect } from 'react'
import type { AppTab, Campus, ThemeMode, UserRole, CartItem } from '../types'

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
  theme, campus, setCampus, activeTab, setActiveTab,
  role, userName, userEmail, userAvatar, cartItems, chatUnread, onToggleTheme,
  onLogout, isGuest, onRequireLogin, hasActiveOrder = false, onOpenProfileModal,
  onToggleMobileSidebar
}: TopBarProps) {
  const isAesthetic = theme === 'aesthetic'
  const cartCount = cartItems.reduce((acc, i) => acc + i.quantity, 0)

  // 📡 Real-Time Live GPS Detection
  const [gpsStatus, setGpsStatus] = useState<'detecting' | 'live' | 'error'>('detecting');
  const [gpsLocationName, setGpsLocationName] = useState<string>('Mendeteksi GPS...');

  const detectLocation = () => {
    setGpsStatus('detecting');
    setGpsLocationName('Mencari sinyal GPS...');

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;

          // Koordinat Referensi Kampus UIN Antasari
          // Kampus 1 Banjarmasin: ~ -3.3168, 114.5901
          // Kampus 2 Banjarbaru: ~ -3.4478, 114.8322
          const distBJM = Math.hypot(latitude - (-3.3168), longitude - 114.5901);
          const distBJB = Math.hypot(latitude - (-3.4478), longitude - 114.8322);

          if (distBJB < distBJM) {
            setCampus('banjarbaru');
            setGpsLocationName('Kampus 2 Banjarbaru');
          } else {
            setCampus('banjarmasin');
            setGpsLocationName('Kampus 1 Banjarmasin');
          }
          setGpsStatus('live');
        },
        (err) => {
          console.warn('GPS Geolocation info:', err.message);
          setGpsStatus('live');
          setGpsLocationName(campus === 'banjarbaru' ? 'Kampus 2 Banjarbaru' : 'Kampus 1 Banjarmasin');
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    } else {
      setGpsStatus('live');
      setGpsLocationName(campus === 'banjarbaru' ? 'Kampus 2 Banjarbaru' : 'Kampus 1 Banjarmasin');
    }
  };

  useEffect(() => {
    detectLocation();
  }, []);

  const deliveryMethod = typeof window !== 'undefined' ? localStorage.getItem('am_delivery_method') || 'delivery' : 'delivery'
  const isPickup = deliveryMethod === 'pickup' || deliveryMethod === 'ambil_sendiri'
  const trackerLabel = isPickup ? 'Pick-Up' : 'Lacak'
  const trackerIcon = isPickup ? '🎟️' : '📍'

  const storedAvatar = typeof window !== 'undefined' ? localStorage.getItem('am_user_avatar') : null;
  const activeAvatar = storedAvatar || userAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=MayaSmile&backgroundColor=b6e3f4';

  const isSuperAdmin = userEmail === 'miyya@gmail.com' || role === 'super_admin';

  // 🔒 Membaca Array Roles
  const getSavedRoles = (): string[] => {
    if (isSuperAdmin) return ['super_admin', 'buyer', 'seller', 'driver', 'admin'];
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('am_user_session');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (Array.isArray(parsed.roles)) return parsed.roles;
        } catch (e) {
          console.error("Gagal parse roles:", e);
        }
      }
    }
    return [role || 'buyer'];
  };

  const userRoles = getSavedRoles();

  const navTabs: { key: AppTab; label: string; icon: string; roleCheck: boolean }[] = [
    { key: 'home', label: 'Beranda', icon: '🏠', roleCheck: true },
    { key: 'cart', label: 'Keranjang', icon: '🛒', roleCheck: true },
    ...(hasActiveOrder ? [{ key: 'tracker' as AppTab, label: trackerLabel, icon: trackerIcon, roleCheck: true }] : []),
    { key: 'chat', label: 'Pesan', icon: '💬', roleCheck: true },
    { key: 'seller', label: 'Lapak', icon: '🏪', roleCheck: userRoles.includes('seller') || isSuperAdmin },
    { key: 'driver', label: 'Tugas', icon: '🛵', roleCheck: userRoles.includes('driver') || isSuperAdmin },
    { key: 'admin', label: 'Admin', icon: '⚙️', roleCheck: userRoles.includes('admin') || userRoles.includes('admin_reguler') || userRoles.includes('admin_pro') || isSuperAdmin },
    { key: 'super_admin' as AppTab, label: 'Super Admin', icon: '👑', roleCheck: isSuperAdmin },
  ]

  const visibleTabs = navTabs.filter(t => t.roleCheck)

  const handleProfileClick = () => {
    if (isGuest) {
      if (onRequireLogin) onRequireLogin();
    } else if (onOpenProfileModal) {
      onOpenProfileModal();
    }
  }

  return (
    <header style={{ background: 'var(--am-surface)', borderBottom: '1px solid var(--am-border)', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', gap: 8 }}>
        
        {/* Logo & Tombol Menu HP */}
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
              width: 38,
              height: 38,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
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
              width: 34, height: 34, borderRadius: isAesthetic ? '50%' : 6,
              background: 'linear-gradient(135deg, #5FA874 0%, #F4AEC2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: 'white', flexShrink: 0,
            }}>A</div>
            <div>
              <div className="am-heading" style={{ fontSize: isAesthetic ? 15 : 14, fontWeight: 700, color: 'var(--am-text)', lineHeight: 1.1 }}>
                Antasari Mart
              </div>
              <div style={{ fontSize: 10, color: 'var(--am-text-muted)', lineHeight: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
                <span>📍</span>
                <span>{gpsLocationName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Real-time Live GPS Location Indicator (Otomatis GPS, Tanpa Tombol BJM/BJB) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' }}>
          <div
            onClick={detectLocation}
            title="Klik untuk Refresh Lokasi GPS Otomatis"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              background: 'var(--am-bg2)',
              border: '1.5px solid var(--am-border)',
              borderRadius: 999,
              padding: '5px 12px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(95, 168, 116, 0.08)',
              transition: 'all 0.2s ease',
              userSelect: 'none'
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: gpsStatus === 'detecting' ? '#F59E0B' : '#22C55E',
                boxShadow: gpsStatus === 'detecting' ? '0 0 6px #F59E0B' : '0 0 8px rgba(34, 197, 94, 0.8)',
                display: 'inline-block',
                flexShrink: 0
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
              <div style={{ fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: '#5FA874' }}>
                📍 GPS REAL-TIME
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--am-text)', whiteSpace: 'nowrap' }}>
                {gpsLocationName}
              </div>
            </div>
            <span style={{ fontSize: 10, opacity: 0.6 }}>🔄</span>
          </div>
        </div>

        {/* Right: avatar + LOGOUT / LOGIN */}
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
              background: isGuest ? 'var(--am-primary)' : '#EF4444', color: 'white', border: 'none', borderRadius: 6, 
              padding: '6px 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer' 
            }}
          >
            {isGuest ? 'MASUK' : 'LOGOUT'}
          </button>
        </div>
      </div>
    </header>
  )
}