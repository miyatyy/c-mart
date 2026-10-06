import type { AppTab, CartItem } from '../types';
import { triggerHaptic } from '../utils/haptics';

interface BottomNavBarProps {
  activeTab: AppTab;
  setActiveTab: (t: AppTab) => void;
  cartItems?: CartItem[];
  chatUnread?: number;
  isGuest?: boolean;
  onRequireLogin?: () => void;
  userRoles?: string[];
  isSuperAdmin?: boolean;
  hasActiveOrder?: boolean;
  onOpenProfileModal?: () => void;
}

// 🎨 Clean Modern Vector Icons (Beranda, Vending, Notifikasi, Saya)
function renderNavIcon(key: string) {
  switch (key) {
    case 'home':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      );
    case 'vending_simulator':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="3"/>
          <line x1="8" y1="6" x2="16" y2="6"/>
          <line x1="8" y1="10" x2="16" y2="10"/>
          <line x1="8" y1="14" x2="16" y2="14"/>
          <rect x="7" y="17" width="10" height="3" rx="1"/>
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
  chatUnread = 0,
  isGuest,
  onRequireLogin,
  onOpenProfileModal
}: BottomNavBarProps) {
  // 🌟 MENU NAVIGASI BAWAH:
  // 1. Beranda (Home 🏠)
  // 2. Vending (Vending Machine & Loker Pintar 🤖)
  // 3. Notifikasi / Pesan (🔔)
  // 4. Saya (Profil Orang 👤)
  const navItems: { key: AppTab | 'profile' | 'notification'; label: string; badge?: number }[] = [
    { key: 'home', label: 'Beranda' },
    { key: 'vending_simulator', label: 'Vending' },
    { key: 'chat', label: 'Notifikasi', badge: chatUnread },
    { key: 'profile', label: 'Saya' }
  ];

  const handleTabClick = (key: AppTab | 'profile' | 'notification') => {
    triggerHaptic('light');
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

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-3 pt-1.5 flex justify-around items-center"
      style={{
        paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))'
      }}
    >
      {navItems.map(tab => {
        const isActive = tab.key === activeTab ||
                         ((tab.key === 'chat' || tab.key === 'notification') && activeTab === 'chat');
        return (
          <button
            key={tab.key}
            onClick={() => handleTabClick(tab.key)}
            className="flex-1 max-w-[140px] flex flex-col items-center justify-center bg-transparent border-none py-1 px-1 cursor-pointer select-none transition-all duration-200 group focus:outline-none"
            aria-label={tab.label}
          >
            <div
              className={`relative flex items-center justify-center w-11 h-7 rounded-full transition-all duration-200 ${
                isActive
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 -translate-y-0.5'
                  : 'text-gray-500 dark:text-gray-400 group-hover:text-emerald-600'
              }`}
            >
              {renderNavIcon(tab.key)}
              {Boolean(tab.badge && tab.badge > 0) && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-full text-[9.5px] font-extrabold px-1.5 min-w-[16px] h-4 flex items-center justify-center shadow-[0_2px_6px_rgba(239,68,68,0.45)] border-2 border-white dark:border-gray-900 animate-pulse">
                  {tab.badge! > 9 ? '9+' : tab.badge}
                </span>
              )}
            </div>
            <span
              className={`mt-0.5 text-xs transition-all duration-150 ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-gray-500 dark:text-gray-400 group-hover:text-emerald-600 font-medium'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
