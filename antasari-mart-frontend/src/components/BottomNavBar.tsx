import React from 'react';
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

  // Tab yang ditampilkan di navigasi bawah (Clean, Intuitif, Standar Mobile App)
  const navItems: { key: AppTab | 'profile'; label: string; icon: string; badge?: number }[] = [
    { key: 'home', label: 'Beranda', icon: '🏠' },
    { key: 'vending_simulator', label: 'Vending', icon: '🤖' },
    { key: 'cart', label: 'Keranjang', icon: '🛒', badge: cartCount },
    { key: 'chat', label: 'Pesan', icon: '💬', badge: chatUnread },
    ...(hasActiveOrder ? [{ key: 'tracker' as AppTab, label: 'Lacak', icon: '📍' }] : []),
    ...(isSuperAdmin
      ? [{ key: 'super_admin' as AppTab, label: 'Super Admin', icon: '👑' }]
      : userRoles.includes('seller')
      ? [{ key: 'seller' as AppTab, label: 'Lapak', icon: '🏪' }]
      : userRoles.includes('driver')
      ? [{ key: 'driver' as AppTab, label: 'Tugas', icon: '🛵' }]
      : userRoles.includes('admin') || userRoles.includes('admin_reguler')
      ? [{ key: 'admin' as AppTab, label: 'Admin', icon: '⚙️' }]
      : [{ key: 'profile', label: 'Akun', icon: '👤' }])
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
          box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.08);
          z-index: 999;
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding: 6px 12px calc(6px + env(safe-area-inset-bottom, 0px));
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          max-width: 100vw;
          box-sizing: border-box;
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
          color: var(--am-text-muted, #64748b);
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          border-radius: 12px;
        }

        .am-bottom-nav-btn:active {
          transform: scale(0.92);
        }

        .am-bottom-nav-btn.is-active {
          color: var(--am-primary, #4A8FE7);
        }

        .am-bottom-nav-icon-wrapper {
          position: relative;
          font-size: 20px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 30px;
          border-radius: 16px;
          transition: all 0.25s ease;
        }

        .am-bottom-nav-btn.is-active .am-bottom-nav-icon-wrapper {
          background: var(--am-primary-light, #EBF4FC);
          transform: translateY(-2px);
        }

        .am-bottom-nav-label {
          font-size: 10.5px;
          margin-top: 3px;
          font-weight: 600;
          letter-spacing: 0.2px;
          white-space: nowrap;
        }

        .am-bottom-nav-btn.is-active .am-bottom-nav-label {
          font-weight: 800;
          color: var(--am-primary, #4A8FE7);
        }

        .am-bottom-nav-badge {
          position: absolute;
          top: -2px;
          right: -4px;
          background: #ef4444;
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
          box-shadow: 0 2px 5px rgba(239, 68, 68, 0.4);
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
              <span>{tab.icon}</span>
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
