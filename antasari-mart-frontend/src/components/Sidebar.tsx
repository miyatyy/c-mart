import { useState, useEffect } from 'react'
import type { AppTab, UserRole, ThemeMode, Campus } from '../types'

interface SidebarProps {
  theme: ThemeMode
  role: UserRole
  activeTab: AppTab
  setActiveTab: (tab: AppTab) => void
  userName: string
  userEmail?: string
  userAvatar: string
  setUserAvatar: (avatar: string) => void
  campus: Campus
  setCampus: (campus: Campus) => void
  onLogout: () => void
  isGuest?: boolean
  onRequireLogin?: () => void
  hasActiveOrder?: boolean
  onOpenProModal?: () => void
  isOpenExternal?: boolean
  onCloseExternal?: () => void
  onToggleTheme?: () => void
}

const PRESET_AVATARS = [
  { id: 1, name: 'Maya (Ceria)', type: 'reguler', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MayaSmile&backgroundColor=b6e3f4' },
  { id: 2, name: 'Ahmad (Ramah)', type: 'reguler', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AhmadHappy&backgroundColor=c0aede' },
  { id: 3, name: 'Siti (Manis Senyum)', type: 'reguler', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=SitiJoy&backgroundColor=ffd5dc' },
  { id: 4, name: 'Rizky (Ceria)', type: 'reguler', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=RizkyFun&backgroundColor=d1d4f9' },
  { id: 5, name: 'Dewi (Friendly)', type: 'reguler', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DewiBright&backgroundColor=ffdfbf' },
  { id: 6, name: 'Fajar (Semangat)', type: 'reguler', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=FajarSmile&backgroundColor=c1f4c5' },
  { id: 7, name: 'Alya (Kreatif Ceria)', type: 'reguler', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AlyaCheer&backgroundColor=ffcdec' },
  { id: 8, name: 'Zain (Pro Senyum)', type: 'pro', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ZainPro&backgroundColor=00b4d8' },
  { id: 9, name: 'Zara (Pro Elegan)', type: 'pro', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ZaraPro&backgroundColor=7209b7' },
  { id: 10, name: 'Ken (Pro Stylish)', type: 'pro', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=KenPro&backgroundColor=f72585' }
];

// 🎨 Standard SVG Vector Icons for Sidebar
function renderSidebarIcon(key: string) {
  switch (key) {
    case 'home':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      );
    case 'cart':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="21" r="1"/>
          <circle cx="19" cy="21" r="1"/>
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
        </svg>
      );
    case 'tracker':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      );
    case 'chat':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      );
    case 'seller':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <path d="M9 22V12h6v10"/>
        </svg>
      );
    case 'driver':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18.5" cy="17.5" r="3.5"/>
          <circle cx="5.5" cy="17.5" r="3.5"/>
          <path d="M15 6h4l3 6.5v5h-2"/>
          <path d="M2 17.5V11l4-5h9v11.5"/>
        </svg>
      );
    case 'admin':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      );
    default:
      return null;
  }
}

export default function Sidebar({
  theme,
  role,
  activeTab,
  setActiveTab,
  userName,
  userEmail,
  userAvatar,
  setUserAvatar,
  campus,
  setCampus,
  onLogout,
  isGuest,
  onRequireLogin,
  hasActiveOrder = false,
  onOpenProModal,
  isOpenExternal = false,
  onCloseExternal,
  onToggleTheme
}: SidebarProps) {
  // Sinkronkan state buka/tutup desktop dengan tombol burger di TopBar (isOpenExternal)
  const [isOpen, setIsOpen] = useState(true)

  // Setiap kali tombol garis 3 di TopBar diklik (isOpenExternal berubah), sinkronkan status sidebar desktop
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth > 768) {
      setIsOpen(isOpenExternal);
    }
  }, [isOpenExternal]);

  const [showProfileModal, setShowProfileModal] = useState(false)
  const [currentName, setCurrentName] = useState(() => userName)
  const [selectedCampus, setSelectedCampus] = useState<Campus>(() => campus)
  const [currentAvatar, setCurrentAvatar] = useState(() => userAvatar)

  const [successPopupMessage, setSuccessPopupMessage] = useState<string | null>(null)

  const deliveryMethod = typeof window !== 'undefined' ? localStorage.getItem('am_delivery_method') || 'delivery' : 'delivery'
  const isPickup = deliveryMethod === 'pickup' || deliveryMethod === 'ambil_sendiri'
  const trackerLabel = isPickup ? 'Order Pick-Up' : 'Lacak Pengiriman'
  const trackerIcon = isPickup ? '🎟️' : '📍'

  const isSuperAdminUser = userEmail === 'miyya@gmail.com' || role === 'super_admin';

  const getSavedRoles = (): string[] => {
    if (isSuperAdminUser) return ['super_admin', 'buyer', 'seller', 'driver', 'admin'];
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
  const hasSeller = userRoles.includes('seller') || isSuperAdminUser;
  const hasDriver = userRoles.includes('driver') || isSuperAdminUser;
  const hasAdmin = userRoles.includes('admin') || userRoles.includes('admin_reguler') || userRoles.includes('admin_pro') || isSuperAdminUser;

  const getMenuByRole = () => {
    const menus: { key: AppTab; label: string }[] = [
      { key: 'home', label: 'Beranda' },
      { key: 'cart', label: 'Keranjang' },
    ];

    if (hasActiveOrder) {
      menus.push({ key: 'tracker', label: trackerLabel });
    }

    menus.push({ key: 'chat', label: 'Pesan' });

    if (hasSeller) {
      menus.push({ key: 'seller', label: 'Lapak' });
    }

    if (hasDriver) {
      menus.push({ key: 'driver', label: 'Tugas' });
    }

    if (hasAdmin) {
      menus.push({ key: 'admin', label: 'Koperasi' });
    }

    return menus;
  }

  const menuItems = getMenuByRole()

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const responsiveStyles = `
    @keyframes bounceIn {
      0% { opacity: 0; transform: scale(0.8) translateY(20px); }
      70% { transform: scale(1.05) translateY(-5px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes checkAnim {
      0% { transform: scale(0); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
    .success-modal-appear {
      animation: bounceIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
    .check-icon-anim {
      animation: checkAnim 0.4s ease-in-out 0.1s both;
    }

    /* 💻 DESKTOP SIDEBAR FIXED POSITION */
    .am-sidebar-main {
      width: ${isOpen ? '260px' : '80px'};
      background: var(--am-surface);
      border-right: 1px solid var(--am-border);
      display: flex;
      flex-direction: column;
      height: 100vh;
      position: fixed !important;
      top: 0;
      left: 0;
      bottom: 0;
      flex-shrink: 0;
      font-family: var(--am-font-body);
      transition: width 0.3s ease-in-out;
      box-shadow: 4px 0 15px rgba(0,0,0,0.03);
      overflow-x: hidden;
      z-index: 1000;
    }

    /* 📱 MOBILE HP: Sidebar Tersembunyi Rapi di Luar Layar (Tidak Menghalangi Beranda), Muncul Saat Menu Diklik */
    @media screen and (max-width: 768px) {
      .desktop-sidebar-spacer {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .am-sidebar-main {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        bottom: 0 !important;
        height: 100vh !important;
        height: 100dvh !important;
        width: min(82vw, 290px) !important;
        background: var(--am-surface) !important;
        color: var(--am-text) !important;
        border-right: 1px solid var(--am-border) !important;
        transform: translateX(-105%) !important;
        transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1) !important;
        box-shadow: 10px 0 35px rgba(0, 0, 0, 0.4) !important;
        z-index: 999999 !important;
        display: flex !important;
        flex-direction: column !important;
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch !important;
      }
      .am-sidebar-main.mobile-open {
        transform: translateX(0) !important;
      }
      .am-mobile-backdrop {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;
        background: rgba(0, 0, 0, 0.65) !important;
        backdrop-filter: blur(4px) !important;
        z-index: 999998 !important;
        animation: fadeInBackdrop 0.25s ease forwards;
      }
      @keyframes fadeInBackdrop {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    }
  `;

  // Di layar HP saat dibuka, sidebar selalu tampil penuh dengan label & profil
  const effectiveIsOpen = typeof window !== 'undefined' && window.innerWidth <= 768 ? true : isOpen;

  return (
    <>
      <style>{responsiveStyles}</style>

      {/* Backdrop Gelap untuk HP saat Menu Dibuka */}
      {isOpenExternal && (
        <div className="am-mobile-backdrop" onClick={onCloseExternal} />
      )}

      {/* Spacer agar konten utama di App.tsx tidak tertutup sidebar di desktop */}
      <div style={{ width: isOpen ? '260px' : '80px', flexShrink: 0, transition: 'width 0.3s ease-in-out' }} className="desktop-sidebar-spacer" />

      <aside className={`am-sidebar-main ${isOpenExternal ? 'mobile-open' : ''}`}>
        
        {/* Header Sidebar dengan Judul & Tombol Tutup Khusus HP */}
        <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--am-border)', height: 65, background: 'var(--am-surface)' }}>
          {effectiveIsOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🌸</span>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--am-primary)', whiteSpace: 'nowrap' }}>Antasari Mart</div>
            </div>
          ) : (
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--am-primary)', margin: '0 auto' }}>AM</div>
          )}

          {/* Tombol Tutup Silang (✕) di HP */}
          {isOpenExternal && (
            <button
              onClick={onCloseExternal}
              aria-label="Tutup Menu"
              style={{
                background: 'var(--am-bg2)',
                border: '1px solid var(--am-border)',
                borderRadius: 8,
                width: 32,
                height: 32,
                fontSize: 15,
                fontWeight: 'bold',
                cursor: 'pointer',
                color: 'var(--am-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          )}
        </div>

        {effectiveIsOpen && (
          <div style={{ padding: '16px', borderBottom: '1px solid var(--am-border)', textAlign: 'center' }}>
            {isGuest ? (
              <div style={{ 
                width: 56, height: 56, borderRadius: '50%', background: 'var(--am-bg2)', 
                border: '2px solid var(--am-border)', display: 'flex', alignItems: 'center', 
                justifyContent: 'center', fontSize: 26, margin: '0 auto 6px', color: 'var(--am-text-muted)' 
              }}>
                👤
              </div>
            ) : (
              <img 
                src={userAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Default&backgroundColor=b6e3f4'} 
                alt={currentName} 
                style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--am-primary)', marginBottom: 6 }} 
              />
            )}
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--am-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentName}</div>
            <div style={{ fontSize: 11, color: 'var(--am-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail || 'antasarimart@uin-antasari.ac.id'}</div>
            
            <div style={{ 
              display: 'inline-block', marginTop: 6, padding: '2px 10px', borderRadius: 999, 
              fontSize: 10, fontWeight: 700, background: isSuperAdminUser ? '#F59E0B' : 'var(--am-primary)', color: 'white' 
            }}>
              {isSuperAdminUser ? '👑 Super Admin' : (isGuest ? '👤 Tamu' : `Multi-Role (${userRoles.length})`)}
            </div>
          </div>
        )}

        <div style={{ flex: 1, padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
          {effectiveIsOpen && (
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--am-text-muted)', paddingLeft: 8, marginBottom: 4, letterSpacing: 1 }}>
              MENU UTAMA
            </div>
          )}

          {menuItems.map(item => {
            const isActive = activeTab === item.key
            return (
              <button
                key={item.key}
                onClick={() => {
                  if (isGuest && (item.key === 'cart' || item.key === 'chat' || item.key === 'tracker' || item.key === 'seller' || item.key === 'driver')) {
                    if (onRequireLogin) onRequireLogin();
                    return;
                  }
                  setActiveTab(item.key as AppTab);
                  if (window.innerWidth <= 768 && onCloseExternal) onCloseExternal();
                }}
                title={!effectiveIsOpen ? item.label : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                  padding: effectiveIsOpen ? '10px 14px' : '10px 0', 
                  justifyContent: effectiveIsOpen ? 'flex-start' : 'center',
                  borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: isActive ? 'var(--am-primary)' : 'transparent',
                  color: isActive ? 'white' : 'var(--am-text)',
                  fontWeight: isActive ? 700 : 500, fontSize: 13,
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, flexShrink: 0 }}>
                  {renderSidebarIcon(item.key)}
                </span>
                {effectiveIsOpen && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
              </button>
            )
          })}

          {/* 👑 TOMBOL KHUSUS SUPER ADMIN CENTER */}
          {isSuperAdminUser && (
            <button
              onClick={() => {
                setActiveTab('super_admin' as any);
                if (window.innerWidth <= 768 && onCloseExternal) onCloseExternal();
              }}
              title={!effectiveIsOpen ? "Super Admin Center" : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: effectiveIsOpen ? '10px 14px' : '10px 0', justifyContent: effectiveIsOpen ? 'flex-start' : 'center',
                borderRadius: 10, border: '1.5px dashed #F59E0B', cursor: 'pointer',
                background: activeTab === ('super_admin' as any) ? '#F59E0B' : 'rgba(245, 158, 11, 0.1)', 
                color: activeTab === ('super_admin' as any) ? 'white' : '#D97706', 
                fontWeight: 700, fontSize: 13, marginTop: 6, transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: 18 }}>👑</span>
              {effectiveIsOpen && <span style={{ whiteSpace: 'nowrap' }}>Super Admin Center</span>}
            </button>
          )}

          {/* 💎 TOMBOL MENU UPGRADE KE AKUN PRO */}
          {!isGuest && (
            <button
              onClick={() => {
                if (onOpenProModal) onOpenProModal();
                if (window.innerWidth <= 768 && onCloseExternal) onCloseExternal();
              }}
              title={!effectiveIsOpen ? "Antasari Mart PRO" : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: effectiveIsOpen ? '10px 14px' : '10px 0', 
                justifyContent: effectiveIsOpen ? 'flex-start' : 'center',
                borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #5FA874 0%, #243329 100%)',
                color: 'white', fontWeight: 700, fontSize: 13,
                marginTop: 6, boxShadow: '0 4px 12px rgba(244, 174, 194, 0.35)',
                transition: 'transform 0.2s'
              }}
            >
              <span style={{ fontSize: 18 }}>💎</span>
              {effectiveIsOpen && (
                <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                  <div style={{ whiteSpace: 'nowrap' }}>Antasari Mart PRO</div>
                  <div style={{ fontSize: 9, opacity: 0.85, fontWeight: 400 }}>Mulai Rp 10rb/bln</div>
                </div>
              )}
            </button>
          )}

          {effectiveIsOpen && (
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--am-text-muted)', paddingLeft: 8, marginTop: 16, marginBottom: 4, letterSpacing: 1 }}>
              PENGATURAN TAMPILAN
            </div>
          )}

          {/* ☀️ / 🌙 TOMBOL GANTI TEMA MODE SIANG / MODE MALAM */}
          {onToggleTheme && (
            <button
              onClick={() => {
                onToggleTheme();
                if (window.innerWidth <= 768 && onCloseExternal) onCloseExternal();
              }}
              title={theme === 'modern' ? "Ganti ke Mode Siang" : "Ganti ke Mode Malam"}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: effectiveIsOpen ? '10px 14px' : '10px 0', 
                justifyContent: effectiveIsOpen ? 'space-between' : 'center',
                borderRadius: 10, border: '1.5px solid var(--am-border)', cursor: 'pointer',
                background: 'var(--am-bg2)', color: 'var(--am-text)', fontWeight: 600, fontSize: 13,
                transition: 'background 0.2s', marginBottom: 6
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{theme === 'modern' ? '🌙' : '☀️'}</span>
                {effectiveIsOpen && (
                  <span style={{ whiteSpace: 'nowrap' }}>
                    {theme === 'modern' ? 'Mode Malam' : 'Mode Siang'}
                  </span>
                )}
              </div>
              {effectiveIsOpen && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
                  background: theme === 'modern' ? '#5FA874' : '#F59E0B', color: 'white'
                }}>
                  {theme === 'modern' ? '🌙 Malam' : '☀️ Siang'}
                </span>
              )}
            </button>
          )}

          {!isGuest && (
            <button
              onClick={() => {
                setShowProfileModal(true);
                if (window.innerWidth <= 768 && onCloseExternal) onCloseExternal();
              }}
              title={!effectiveIsOpen ? "Edit / Pengaturan Profil" : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: effectiveIsOpen ? '10px 14px' : '10px 0', 
                justifyContent: effectiveIsOpen ? 'flex-start' : 'center',
                borderRadius: 10, border: '1.5px solid var(--am-border)', cursor: 'pointer',
                background: 'var(--am-bg2)', color: 'var(--am-text)', fontWeight: 600, fontSize: 13,
                transition: 'background 0.2s',
              }}
            >
              <span style={{ fontSize: 18 }}>⚙️</span>
              {effectiveIsOpen && <span style={{ whiteSpace: 'nowrap' }}>Edit Profil</span>}
            </button>
          )}
        </div>

        <div style={{ padding: 12, borderTop: '1px solid var(--am-border)' }}>
          <button
            onClick={() => {
              onLogout();
              if (window.innerWidth <= 768 && onCloseExternal) onCloseExternal();
            }}
            title={!effectiveIsOpen ? "Keluar (Logout)" : undefined}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
              background: isGuest ? 'var(--am-primary)' : '#EF4444', color: 'white', fontWeight: 700, fontSize: 13,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            <span style={{ fontSize: 16 }}>{isGuest ? '🔑' : '🚪'}</span>
            {effectiveIsOpen && <span>{isGuest ? 'Masuk / Daftar' : 'Keluar'}</span>}
          </button>
        </div>
      </aside>

      {showProfileModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100001,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div className="am-card am-slide-up" style={{ width: '100%', maxWidth: 440, padding: 24, borderRadius: 20, background: 'var(--am-surface)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 className="am-heading" style={{ margin: 0, fontSize: 18, color: 'var(--am-text)' }}>⚙️ Pengaturan Profil</h3>
              <button onClick={() => setShowProfileModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--am-text-muted)' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: 'var(--am-bg2)', padding: 12, borderRadius: 14, border: '1px solid var(--am-border)', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--am-text)' }}>Ganti Avatar Kartun / Foto:</span>
                  <label style={{ fontSize: 10, color: 'var(--am-primary)', cursor: 'pointer', fontWeight: 700, background: 'var(--am-primary-light, rgba(95, 168, 116, 0.15))', padding: '3px 8px', borderRadius: 6 }}>
                    📁 Upload Galeri
                    <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <img 
                    src={currentAvatar} 
                    alt="Pratinjau Foto" 
                    style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', background: 'var(--am-bg2)', border: '3px solid var(--am-primary)' }} 
                  />
                </div>

                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--am-text-muted)', marginBottom: 6, textAlign: 'left' }}>Atau Pilih dari 10 Karakter Kartun Senyum Manis:</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, maxHeight: 100, overflowY: 'auto', padding: 4, background: 'var(--am-surface)', borderRadius: 10, border: '1px solid var(--am-border)' }}>
                  {PRESET_AVATARS.map(avatar => (
                    <div 
                      key={avatar.id}
                      onClick={() => setCurrentAvatar(avatar.url)}
                      title={avatar.name}
                      style={{
                        position: 'relative', cursor: 'pointer', borderRadius: '50%', overflow: 'hidden',
                        background: 'var(--am-bg2)', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: currentAvatar === avatar.url ? '3px solid var(--am-primary)' : '2px solid var(--am-border)',
                        boxShadow: currentAvatar === avatar.url ? '0 0 8px rgba(95, 168, 116, 0.35)' : 'none',
                        transition: 'all 0.2s', transform: currentAvatar === avatar.url ? 'scale(1.08)' : 'scale(1)'
                      }}
                    >
                      <img src={avatar.url} alt={avatar.name} style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
                      {avatar.type === 'pro' && (
                        <span style={{ position: 'absolute', bottom: 0, width: '100%', background: '#F59E0B', color: 'white', fontSize: 5, fontWeight: 800, textAlign: 'center' }}>PRO</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--am-text-muted)', display: 'block', marginBottom: 4 }}>Nama Lengkap</label>
                <input 
                  className="am-input" 
                  value={currentName} 
                  onChange={(e) => setCurrentName(e.target.value)} 
                  style={{ width: '100%', padding: '10px 12px', fontSize: 13, borderRadius: 8, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)' }} 
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--am-text-muted)', display: 'block', marginBottom: 4 }}>Email Akun</label>
                <input 
                  className="am-input" 
                  value={userEmail || 'miya@gmail.com'} 
                  disabled 
                  style={{ width: '100%', padding: '10px 12px', fontSize: 13, borderRadius: 8, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text-muted)', cursor: 'not-allowed' }} 
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--am-text-muted)', display: 'block', marginBottom: 4 }}>
                  Kampus Aktif (Lokasi Belanja)
                </label>
                <select 
                  className="am-input"
                  value={selectedCampus}
                  onChange={(e) => setSelectedCampus(e.target.value as Campus)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: 13, borderRadius: 8, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)', cursor: 'pointer' }}
                >
                  <option value="banjarmasin">📍 Kampus 1 Banjarmasin</option>
                  <option value="banjarbaru">📍 Kampus 2 Banjarbaru</option>
                </select>
              </div>

              <button 
                className="am-btn-primary" 
                style={{ width: '100%', padding: '12px 0', marginTop: 6, fontSize: 14, fontWeight: 'bold', borderRadius: 10 }}
                onClick={() => {
                  setCampus(selectedCampus);
                  setUserAvatar(currentAvatar); 
                  
                  localStorage.setItem('am_user_avatar', currentAvatar);
                  localStorage.setItem('am_user_campus', selectedCampus);
                  localStorage.setItem('am_user_name', currentName);

                  setShowProfileModal(false);
                  setSuccessPopupMessage("Profil, foto avatar, dan lokasi kampus berhasil diperbarui secara permanen!");
                }}
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {successPopupMessage && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100001,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          backdropFilter: 'blur(5px)'
        }}>
          <div className="success-modal-appear am-card" style={{
            width: '100%', maxWidth: 360, padding: 28, borderRadius: 24,
            background: 'var(--am-surface)', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div className="check-icon-anim" style={{
              width: 64, height: 64, margin: '0 auto 14px', background: 'rgba(74, 197, 108, 0.15)',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, color: '#4AC56C'
            }}>
              ✅
            </div>

            <h3 className="am-heading" style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: 'var(--am-text)' }}>
              Berhasil Disimpan! 🎉
            </h3>
            <p style={{ fontSize: 13, color: 'var(--am-text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
              {successPopupMessage}
            </p>

            <button
              className="am-btn-primary"
              onClick={() => setSuccessPopupMessage(null)}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
                background: 'var(--am-primary)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer'
              }}
            >
              Oke, Mengerti 👍
            </button>
          </div>
        </div>
      )}
    </>
  )
}