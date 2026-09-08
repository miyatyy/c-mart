import { useState, useEffect } from 'react';
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

// 🎨 Standard SVG Vector Icons (3 Menu Utama: Beranda, Notifikasi/Pesan, Saya/Profil)
function renderNavIcon(key: string) {
  switch (key) {
    case 'home':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      );
    case 'notification':
    case 'chat':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      );
    case 'profile':
    default:
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      );
  }
}

export default function BottomNavBar({
  activeTab,
  setActiveTab,
  chatUnread,
  isGuest,
  onRequireLogin,
  onOpenProfileModal
}: BottomNavBarProps) {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // 📱 Otomatis sembunyikan saat keyboard HP terbuka
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let initialHeight = window.innerHeight;

    const handleResize = () => {
      const currentHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
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

  // 🌟 HANYA 3 MENU UTAMA SESUAI PERMINTAAN USER:
  // 1. Beranda (Home 🏠)
  // 2. Notifikasi / Pesan (🔔 / 💬)
  // 3. Saya (Profil Orang 👤)
  const navItems: { key: AppTab | 'profile' | 'notification'; label: string; badge?: number }[] = [
    { key: 'home', label: 'Beranda' },
    { key: 'chat', label: 'Notifikasi', badge: chatUnread },
    { key: 'profile', label: 'Saya' }
  ];

  const handleTabClick = (key: AppTab | 'profile' | 'notification') => {
    if (key === 'profile') {
      if (isGuest && onRequireLogin) {
        onRequireLogin();
      } else if (onOpenProfileModal) {
        onOpenProfileModal();
      }
      return;
    }

    if (key === 'chat' || key === 'notification') {
      if (isGuest && onRequireLogin) {
        onRequireLogin();
        return;
      }
      setActiveTab('chat');
      return;
    }

    setActiveTab(key as AppTab);
  };

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
          padding: 8px 16px calc(8px + env(safe-area-inset-bottom, 0px));
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
          padding: 4px 6px;
          cursor: pointer;
          position: relative;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          color: var(--am-text-muted, #687D70);
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          border-radius: 14px;
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
          width: 44px;
          height: 30px;
          border-radius: 16px;
          transition: all 0.25s ease;
          color: inherit;
        }

        .am-bottom-nav-btn.is-active .am-bottom-nav-icon-wrapper {
          background: var(--am-primary-light, rgba(95, 168, 116, 0.15));
          transform: translateY(-2px);
          color: var(--am-primary, #5FA874);
        }

        .am-bottom-nav-label {
          font-size: 11px;
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
          right: 2px;
          background: linear-gradient(135deg, #EF4444 0%, #F43F5E 100%);
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
          box-shadow: 0 2px 6px rgba(239, 68, 68, 0.45);
          border: 1.5px solid var(--am-surface, #ffffff);
          animation: pulseBadge 2s infinite;
        }

        @keyframes pulseBadge {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
      `}</style>

      {navItems.map(tab => {
        const isActive = (tab.key === 'home' && activeTab === 'home') ||
                         ((tab.key === 'chat' || tab.key === 'notification') && activeTab === 'chat');
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
