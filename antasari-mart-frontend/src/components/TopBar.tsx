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
  userEmail?: string // 💡 Ditambahkan untuk mendeteksi email super admin
  userAvatar: string
  cartItems: CartItem[]
  chatUnread: number
  onToggleTheme: () => void
  onLogout: () => void
  isGuest?: boolean
  onRequireLogin?: () => void
  hasActiveOrder?: boolean
}

export default function TopBar({
  theme, campus, setCampus, activeTab, setActiveTab,
  role, userName, userEmail, userAvatar, cartItems, chatUnread, onToggleTheme,
  onLogout, isGuest, onRequireLogin, hasActiveOrder = false
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

  const navTabs: { key: AppTab; label: string; icon: string; roles: UserRole[] }[] = [
    { key: 'home', label: 'Beranda', icon: '🏠', roles: ['buyer', 'seller', 'driver', 'admin', 'admin_reguler', 'admin_pro', 'super_admin'] },
    { key: 'cart', label: 'Keranjang', icon: '🛒', roles: ['buyer'] },
    ...(hasActiveOrder ? [{ key: 'tracker' as AppTab, label: trackerLabel, icon: trackerIcon, roles: ['buyer'] }] : []),
    { key: 'chat', label: 'Pesan', icon: '💬', roles: ['buyer', 'seller', 'super_admin'] },
    { key: 'seller', label: 'Lapak', icon: '🏪', roles: ['seller'] },
    { key: 'driver', label: 'Tugas', icon: '🛵', roles: ['driver'] },
    { key: 'admin', label: 'Admin', icon: '⚙️', roles: ['admin', 'admin_reguler', 'admin_pro'] },
    ...(isSuperAdmin ? [{ key: 'super_admin' as AppTab, label: 'Super Admin', icon: '👑', roles: ['super_admin'] }] : []),
  ]

  const visibleTabs = navTabs.filter(t => t.roles.includes(role) || (isSuperAdmin && t.key === 'super_admin'))

  return (
    <header style={{ background: 'var(--am-surface)', borderBottom: '1px solid var(--am-border)', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', gap: 8 }}>
        
        {/* Logo */}
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

        {/* Right: theme toggle + role badge + avatar + LOGOUT / LOGIN */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={onToggleTheme}
            title={isAesthetic ? 'Mode Modern' : 'Mode Aesthetic'}
            style={{
              width: 32, height: 32, borderRadius: isAesthetic ? '50%' : 6,
              border: '1.5px solid var(--am-border)', background: 'var(--am-bg2)',
              cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {isAesthetic ? '🌸' : '⚡'}
          </button>

          <div style={{ 
            fontSize: 11, padding: '4px 8px', fontWeight: 700, 
            background: isSuperAdmin ? '#F59E0B' : 'var(--am-primary)', color: 'white', borderRadius: 6 
          }}>
            {isSuperAdmin ? '👑 Super Admin' : (role === 'buyer' && (isGuest ? '👤 Pengunjung Tamu' : '🛍 Pembeli'))}
            {!isSuperAdmin && role === 'seller' && '🏪 Penjual'}
            {!isSuperAdmin && role === 'driver' && '🛵 Driver'}
            {!isSuperAdmin && role === 'admin' && '⚙️ Admin'}
            {!isSuperAdmin && role === 'admin_reguler' && '⚙️ Admin Reguler'}
            {!isSuperAdmin && role === 'admin_pro' && '💎 Admin Pro'}
          </div>

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

      {/* Bottom nav tabs */}
      <nav style={{ display: 'flex', borderTop: '1px solid var(--am-border)', overflowX: 'auto' }} className="scroll-hide">
        {visibleTabs.map(tab => {
          const isActive = activeTab === tab.key
          const badge = tab.key === 'cart' ? cartCount : tab.key === 'chat' ? chatUnread : 0
          return (
            <button
              key={tab.key}
              onClick={() => {
                if (isGuest && (tab.key === 'cart' || tab.key === 'chat' || tab.key === 'tracker')) {
                  if (onRequireLogin) onRequireLogin();
                  return;
                }
                setActiveTab(tab.key);
              }}
              style={{
                flex: '1 0 auto', minWidth: 60, padding: '8px 4px',
                border: 'none', background: 'transparent', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                position: 'relative',
                borderBottom: isActive ? '2.5px solid var(--am-primary)' : '2.5px solid transparent',
                transition: 'border-color 0.2s',
              }}
            >
              <span style={{ fontSize: 18 }}>{tab.icon}</span>
              <span style={{
                fontSize: 10, fontWeight: isActive ? 700 : 400,
                color: isActive ? 'var(--am-primary)' : 'var(--am-text-muted)',
                fontFamily: 'var(--am-font-body)',
              }}>{tab.label}</span>
              {badge > 0 && (
                <span style={{
                  position: 'absolute', top: 4, right: 'calc(50% - 18px)',
                  background: '#EF4444', color: 'white', borderRadius: 999,
                  fontSize: 9, fontWeight: 700, padding: '1px 5px', minWidth: 16, textAlign: 'center',
                }}>
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </header>
  )
}