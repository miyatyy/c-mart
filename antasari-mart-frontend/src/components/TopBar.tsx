import { useState } from 'react'
import type { AppTab, Campus, ThemeMode, UserRole, CartItem } from '../types'
import { useRealtimeLocation } from '../lib/useRealtimeLocation'
import { getUserAvatar } from '../lib/userAvatars'
import { triggerHaptic } from '../utils/haptics'
import CameraBarcodeScannerModal from './CameraBarcodeScannerModal'
import Swal from 'sweetalert2'

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
  role,
  userName, userEmail, userAvatar, isGuest, onRequireLogin,
  cartItems, chatUnread,
  onOpenProfileModal, onToggleMobileSidebar, onToggleTheme
}: TopBarProps) {
  const isAesthetic = theme === 'aesthetic'
  const totalCartCount = cartItems.reduce((acc, i) => acc + (i.quantity || 1), 0)

  // 📡 Pelacakan GPS Real-Time dengan Reverse Geocoding
  const {
    status: gpsStatus,
    cityName: gpsCityName,
  } = useRealtimeLocation(campus, setCampus);

  const storedAvatar = typeof window !== 'undefined' ? localStorage.getItem('am_user_avatar') : null;
  const activeAvatar = getUserAvatar(userEmail || userName, userName, role, storedAvatar || userAvatar);

  const handleProfileClick = () => {
    triggerHaptic('light');
    if (isGuest) {
      if (onRequireLogin) onRequireLogin();
    } else if (onOpenProfileModal) {
      onOpenProfileModal();
    }
  }

  const handleChatClick = () => {
    triggerHaptic('light');
    if (isGuest && onRequireLogin) {
      onRequireLogin();
      return;
    }
    setActiveTab('chat');
  }

  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleScanClick = () => {
    triggerHaptic('medium');
    setIsScannerOpen(true);
  };

  const handleScanSuccess = (scannedText: string) => {
    const textUpper = scannedText.toUpperCase();
    if (textUpper.includes('BLIND') || textUpper.includes('VEND') || textUpper.includes('SLOT')) {
      setActiveTab('vending_simulator');
      Swal.fire({
        icon: 'success',
        title: 'Token Vending Terdeteksi! 🤖',
        text: `Membuka Vending Machine dengan token: ${scannedText}`,
        confirmButtonColor: '#10B981',
        timer: 2500
      });
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('am_vending_token_scanned', { detail: scannedText }));
      }, 500);
    } else if (textUpper.startsWith('ANTASARI-') || textUpper.includes('ORDER')) {
      localStorage.setItem('am_active_order_id', scannedText);
      setActiveTab('tracker');
      Swal.fire({
        icon: 'success',
        title: 'Nomor Pesanan Terdeteksi! 🛵',
        text: `Membuka pelacakan pengiriman kurir: ${scannedText}`,
        confirmButtonColor: '#10B981',
        timer: 2500
      });
    } else {
      Swal.fire({
        icon: 'info',
        title: 'Hasil Scan Barcode / QR',
        html: `<div style="text-align:center;"><p style="font-size:13px;color:#64748B;">Kode berhasil dibaca:</p><code style="font-size:16px;font-weight:bold;color:#10B981;background:#F0FDF4;padding:6px 12px;border-radius:8px;display:inline-block;">${scannedText}</code></div>`,
        confirmButtonColor: '#10B981'
      });
    }
  };

  const handleCartClick = () => {
    triggerHaptic('light');
    if (isGuest && onRequireLogin) {
      onRequireLogin();
      return;
    }
    setActiveTab('cart');
  }

  return (
    <header className="sticky top-0 z-50 pt-0 mt-0" style={{ background: 'var(--am-surface)', borderBottom: '1px solid var(--am-border)', position: 'sticky', top: 0, zIndex: 100, paddingTop: 'env(safe-area-inset-top, 0px)', marginTop: 0 }}>
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
        .topbar-icon-btn {
          position: relative;
          background: var(--am-bg2);
          border: 1px solid var(--am-border);
          border-radius: 10px;
          width: 38px;
          height: 38px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--am-text);
          transition: all 0.2s ease;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
        }
        .topbar-icon-btn:active {
          transform: scale(0.92);
        }
        .topbar-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: linear-gradient(135deg, #EF4444 0%, #F43F5E 100%);
          color: white;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 800;
          padding: 1px 5px;
          min-width: 17px;
          height: 17px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
          border: 1.5px solid var(--am-surface, #ffffff);
        }
      `}</style>

      <div className="w-full flex items-center justify-between px-4 sm:px-6 py-2.5 gap-3" style={{ paddingLeft: 'max(16px, env(safe-area-inset-left, 16px))', paddingRight: 'max(16px, env(safe-area-inset-right, 16px))' }}>
        
        {/* Sisi Kiri: Tombol Hamburger Menu + Logo Campus Mart */}
        <div className="flex items-center gap-3 pl-0 sm:pl-1">
          {/* 📱 Tombol Hamburger Menu (Hanya tampil di Mobile < 768px, karena di Desktop sudah ada Sidebar tetap) */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onToggleMobileSidebar) onToggleMobileSidebar();
            }}
            aria-label="Buka Menu Sidebar"
            className="topbar-icon-btn md:hidden flex-shrink-0"
            title="Buka Sidebar Menu"
            style={{ width: 36, height: 36 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          {/* Logo Campus Mart */}
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setActiveTab('home')}>
            <img
              src="/campus_mart_icon.png"
              alt="Campus Mart Logo"
              className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover shadow-sm border border-[var(--am-border)]"
            />
            <div style={{ whiteSpace: 'nowrap' }}>
              <div className="am-heading" style={{ fontSize: isAesthetic ? 14 : 13.5, fontWeight: 800, color: 'var(--am-text)', lineHeight: 1.15 }}>
                Campus Mart
              </div>
              <div style={{ fontSize: 10, color: 'var(--am-primary)', fontWeight: 600, lineHeight: 1.15, marginTop: 2 }}>
                Campus Hub
              </div>
            </div>
          </div>

          {/* 🌟 Tombol Navigasi Cepat ke Website Utama */}
          <button
            onClick={() => setActiveTab('landing_page')}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border bg-[var(--am-bg2)] text-[var(--am-text)] border-[var(--am-border)] hover:border-[var(--am-primary)] hover:bg-[var(--am-surface)] shadow-2xs"
            title="Kembali ke Website Utama / Landing Page"
          >
            <span>🌐 Website Utama</span>
          </button>
        </div>

        {/* Tengah: 📍 SIMBOL LOKASI REAL-TIME */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <div
            title={`Lokasi Aktif: ${gpsCityName || (campus === 'banjarbaru' ? 'Banjarbaru' : 'Banjarmasin')}`}
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px 6px',
              borderRadius: 10,
              background: 'transparent',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', color: 'var(--am-primary)' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
                <circle cx="12" cy="10" r="2.8" fill="currentColor"/>
              </svg>
              <span
                className={gpsStatus === 'detecting' ? 'gps-pulse-detecting' : 'gps-pulse-live'}
                style={{
                  position: 'absolute',
                  top: -1,
                  right: -3,
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: gpsStatus === 'detecting' ? '#F59E0B' : '#10B981'
                }}
              />
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: 'var(--am-text)',
                lineHeight: 1.1,
                marginTop: 2,
                textTransform: 'capitalize',
                whiteSpace: 'nowrap'
              }}
            >
              {gpsCityName || (campus === 'banjarbaru' ? 'Banjarbaru' : 'Banjarmasin')}
            </span>
          </div>
        </div>

        {/* Sisi Kanan: 📷 SCAN + 💬 CHAT + 🛒 KERANJANG + 🌓 TEMA + 👤 AVATAR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          
          {/* 📷 0. Tombol Scan Barcode & QR Kamera */}
          <button
            onClick={handleScanClick}
            className="topbar-icon-btn"
            title="Scan QR & Barcode Kamera"
            aria-label="Buka Scanner Kamera"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
              <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
              <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
              <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>

          {/* 💬 1. Tombol Chat / Pesan di Pojok Kanan Atas */}
          <button
            onClick={handleChatClick}
            className="topbar-icon-btn"
            title="Chat & Pesan Masuk"
            aria-label="Buka Chat"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {chatUnread > 0 && (
              <span className="topbar-badge">
                {chatUnread > 9 ? '9+' : chatUnread}
              </span>
            )}
          </button>

          {/* 🛒 2. Tombol Keranjang di Pojok Kanan Atas */}
          <button
            onClick={handleCartClick}
            className="topbar-icon-btn"
            title="Keranjang Belanja"
            aria-label="Buka Keranjang"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="21" r="1"/>
              <circle cx="19" cy="21" r="1"/>
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
            </svg>
            {totalCartCount > 0 && (
              <span className="topbar-badge">
                {totalCartCount > 9 ? '9+' : totalCartCount}
              </span>
            )}
          </button>

          {/* 🌓 3. Tombol Ganti Mode Gelap/Terang */}
          <button
            onClick={onToggleTheme}
            className="topbar-icon-btn"
            title={theme === 'modern' ? "Ganti ke Mode Terang (Siang)" : "Ganti ke Mode Gelap (Malam)"}
            aria-label="Ganti Tema"
            style={{ width: 34, height: 34 }}
          >
            {theme === 'modern' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--am-text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          {/* 👤 4. Foto Profil Pengguna */}
          <div 
            onClick={handleProfileClick}
            title="Klik untuk Lihat Profil & Akun"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            {isGuest ? (
              <div style={{ 
                width: 34, height: 34, borderRadius: '50%', background: 'var(--am-bg2)', 
                border: '1.5px solid var(--am-border)', display: 'flex', alignItems: 'center', 
                justifyContent: 'center', fontSize: 13, flexShrink: 0, color: 'var(--am-text-muted)' 
              }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
            ) : (
              <img 
                src={activeAvatar} 
                alt={userName} 
                style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', background: 'var(--am-bg2)', border: '2px solid var(--am-primary)', flexShrink: 0 }} 
              />
            )}
          </div>

        </div>
      </div>

      {/* 📷 MODAL SCANNER KAMERA REALTIME */}
      <CameraBarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        title="Scanner QR & Barcode Kamera"
        subtitle="Arahkan kamera HP ke QR Vending, Barcode Produk, atau Resi Kurir"
      />
    </header>
  )
}
