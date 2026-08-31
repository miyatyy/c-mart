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
              background: 'var(--am-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: 'white', flexShrink: 0,
            }}>A</div>
            <div>
              <div className="am-heading" style={{ fontSize: isAesthetic ? 15 : 14, fontWeight: 700, color: 'var(--am-text)', lineHeight: 1.1 }}>
                Antasari Mart
              </div>
              <div style={{ fontSize: 10, color: 'var(--am-text-muted)', lineHeight: 1 }}>
                {campus === 'banjarmasin' ? '📍 Banjarmasin' : '📍 Banjarbaru'}
              </div>
            </div>
          </div>
        </div>

        {/* Center: campus switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--am-bg2)', borderRadius: 999, padding: 3, gap: 2 }}>
            {(['banjarmasin', 'banjarbaru'] as Campus[]).map(c => (
              <button
                key={c}
                onClick={() => setCampus(c)}
                style={{
                  padding: '3px 10px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600, fontFamily: 'var(--am-font-body)',
                  background: campus === c ? 'var(--am-primary)' : 'transparent',
                  color: campus === c ? 'white' : 'var(--am-text-muted)',
                  transition: 'all 0.2s',
                }}
              >
                {c === 'banjarmasin' ? 'BJM' : 'BJB'}
              </button>
            ))}
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