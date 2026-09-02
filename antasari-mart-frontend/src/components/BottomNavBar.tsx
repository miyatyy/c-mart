import React, { useState, useEffect } from 'react';
import type { AppTab, CartItem } from '../types';

interface BottomNavBarProps {
  activeTab: AppTab;
  setActiveTab: (t: AppTab) => void;
  cartItems: CartItem[];
  chatUnread: number;
  isGuest?: boolean;
  onRequireLogin?: () => void;
  userRoles: string[];
  isSuperAdmin?: boolean;
  hasActiveOrder?: boolean;
  onOpenProfileModal?: () => void;
}

// 🎨 Standard SVG Vector Icons
function renderNavIcon(key: string) {
  switch (key) {
    case 'home':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      );
    case 'vending_simulator':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="3"/>
          <line x1="8" y1="6" x2="16" y2="6"/>
          <line x1="8" y1="10" x2="16" y2="10"/>
          <line x1="8" y1="14" x2="16" y2="14"/>
          <rect x="7" y="17" width="10" height="3" rx="1"/>
        </svg>
      );
    case 'cart':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="21" r="1"/>
          <circle cx="19" cy="21" r="1"/>
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
        </svg>
      );
    case 'chat':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      );
    case 'tracker':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      );
    case 'super_admin':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      );
    case 'seller':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <path d="M9 22V12h6v10"/>
        </svg>
      );
    case 'driver':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18.5" cy="17.5" r="3.5"/>
          <circle cx="5.5" cy="17.5" r="3.5"/>
          <path d="M15 6h4l3 6.5v5h-2"/>
          <path d="M2 17.5V11l4-5h9v11.5"/>
        </svg>
      );
    case 'admin':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      );
    case 'profile':
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      );
  }
}

export default function BottomNavBar({
  activeTab,
  setActiveTab,
  cartItems,
  chatUnread,
  isGuest,
  onRequireLogin,
  userRoles,
  isSuperAdmin,
  hasActiveOrder,
  onOpenProfileModal
}: BottomNavBarProps) {
  const cartCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // 📱 Otomatis deteksi saat keyboard HP terbuka agar navbar tidak terdorong naik ke atas keyboard
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let initialHeight = window.innerHeight;

    const handleResize = () => {
      const currentHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      // Jika tinggi layar mengecil drastis (>140px), berarti keyboard virtual HP sedang terbuka
      if (initialHeight - currentHeight > 140) {
        setIsKeyboardVisible(true);
      } else {
        setIsKeyboardVisible(false);
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
        setIsKeyboardVisible(true);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const active = document.activeElement as HTMLElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA' && active.tagName !== 'SELECT' && !active.isContentEditable)) {
          setIsKeyboardVisible(false);
        }
      }, 150);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }
    window.addEventListener('resize', handleResize);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Tab yang ditampilkan di navigasi bawah (Clean, Standar SVG Mobile App)
  const navItems: { key: AppTab | 'profile'; label: string; badge?: number }[] = [
    { key: 'home', label: 'Beranda' },
    { key: 'vending_simulator', label: 'Vending' },
    { key: 'cart', label: 'Keranjang', badge: cartCount },
    { key: 'chat', label: 'Pesan', badge: chatUnread },
    ...(hasActiveOrder ? [{ key: 'tracker' as AppTab, label: 'Lacak' }] : []),
    ...(isSuperAdmin
      ? [{ key: 'super_admin' as AppTab, label: 'Super Admin' }]
      : userRoles.includes('seller')
      ? [{ key: 'seller' as AppTab, label: 'Lapak' }]
      : userRoles.includes('driver')
      ? [{ key: 'driver' as AppTab, label: 'Tugas' }]
      : userRoles.includes('admin') || userRoles.includes('admin_reguler')
      ? [{ key: 'admin' as AppTab, label: 'Admin' }]
      : [{ key: 'profile', label: 'Akun' }])
  ];

  const handleTabClick = (key: AppTab | 'profile') => {
    if (key === 'profile') {
      if (isGuest && onRequireLogin) {
        onRequireLogin();
      } else if (onOpenProfileModal) {
        onOpenProfileModal();
      }
      return;
    }

    if (isGuest && (key === 'cart' || key === 'chat' || key === 'tracker' || key === 'seller' || key === 'driver')) {
      if (onRequireLogin) onRequireLogin();
      return;
    }

    setActiveTab(key as AppTab);
  };

  // Jangan render navbar jika keyboard HP sedang aktif
  if (isKeyboardVisible) {
    return null;
  }

  return (
    <div className="am-bottom-navbar-root">
      <style>{`
        .am-bottom-navbar-root {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: var(--am-surface, #ffffff);
          border-top: 1px solid var(--am-border, #e2e8f0);
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
          z-index: 1001;
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding: 6px 10px calc(6px + env(safe-area-inset-bottom, 0px));
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          max-width: 100vw;
          box-sizing: border-box;
          transition: background-color 0.3s ease, border-color 0.3s ease;
        }

        .am-bottom-nav-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          padding: 4px 2px;
          cursor: pointer;
          position: relative;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          color: var(--am-text-muted, #687D70);
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          border-radius: 12px;
        }

        .am-bottom-nav-btn:active {
          transform: scale(0.92);
        }

        .am-bottom-nav-btn.is-active {
          color: var(--am-primary, #5FA874);
        }

        .am-bottom-nav-icon-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 28px;
          border-radius: 14px;
          transition: all 0.25s ease;
          color: inherit;
        }

        .am-bottom-nav-btn.is-active .am-bottom-nav-icon-wrapper {
          background: var(--am-primary-light, rgba(95, 168, 116, 0.15));
          transform: translateY(-2px);
          color: var(--am-primary, #5FA874);
        }

        .am-bottom-nav-label {
          font-size: 10.5px;
          margin-top: 3px;
          font-weight: 600;
          letter-spacing: 0.2px;
          white-space: nowrap;
          color: inherit;
        }

        .am-bottom-nav-btn.is-active .am-bottom-nav-label {
          font-weight: 800;
          color: var(--am-primary, #5FA874);
        }

        .am-bottom-nav-badge {
          position: absolute;
          top: -3px;
          right: -3px;
          background: linear-gradient(135deg, #F4AEC2 0%, #E68FA5 100%);
          color: white;
          border-radius: 10px;
          font-size: 9.5px;
          font-weight: 800;
          padding: 1px 5px;
          min-width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(230, 143, 165, 0.45);
          border: 1.5px solid var(--am-surface, #ffffff);
          animation: pulseBadge 2s infinite;
        }

        @keyframes pulseBadge {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
      `}</style>

      {navItems.map(tab => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            onClick={() => handleTabClick(tab.key)}
            className={`am-bottom-nav-btn ${isActive ? 'is-active' : ''}`}
            aria-label={tab.label}
          >
            <div className="am-bottom-nav-icon-wrapper">
              {renderNavIcon(tab.key)}
              {Boolean(tab.badge && tab.badge > 0) && (
                <span className="am-bottom-nav-badge">
                  {tab.badge! > 9 ? '9+' : tab.badge}
                </span>
              )}
            </div>
            <span className="am-bottom-nav-label">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
