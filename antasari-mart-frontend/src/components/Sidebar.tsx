import { useState } from 'react'
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
  { id: 10, name: 'Ken (Pro Stylish)', type: 'pro', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=KenPro&backgroundColor=f72585' },
];

export default function Sidebar({
  theme: _theme,
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
  onOpenProModal
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [currentName, setCurrentName] = useState(userName)
  const [selectedCampus, setSelectedCampus] = useState<Campus>(campus)
  const [currentAvatar, setCurrentAvatar] = useState(userAvatar)

  const [successPopupMessage, setSuccessPopupMessage] = useState<string | null>(null)

  const deliveryMethod = typeof window !== 'undefined' ? localStorage.getItem('am_delivery_method') || 'delivery' : 'delivery'
  const isPickup = deliveryMethod === 'pickup' || deliveryMethod === 'ambil_sendiri'
  const trackerLabel = isPickup ? 'Order Pick-Up' : 'Lacak Pengiriman'
  const trackerIcon = isPickup ? '🎟️' : '📍'

  const getMenuByRole = () => {
    switch (role) {
      case 'buyer':
        return [
          { key: 'home', label: 'Beranda Belanja', icon: '🏠' },
          { key: 'cart', label: 'Keranjang Saya', icon: '🛒' },
          ...(hasActiveOrder ? [{ key: 'tracker', label: trackerLabel, icon: trackerIcon }] : []),
          { key: 'chat', label: 'Pesan / Chat', icon: '💬' },
        ]
      case 'seller':
        return [
          { key: 'home', label: 'Katalog Beranda', icon: '🏠' },
          { key: 'seller', label: 'Dashboard Lapak', icon: '🏪' },
          { key: 'chat', label: 'Chat Pembeli', icon: '💬' },
        ]
      case 'driver':
        return [
          { key: 'home', label: 'Beranda', icon: '🏠' },
          { key: 'driver', label: 'Tugas Pengiriman', icon: '🛵' },
        ]
      case 'admin':
      case 'admin_reguler':
      case 'admin_pro':
      case 'super_admin':
        return [
          { key: 'home', label: 'Beranda Utama', icon: '🏠' },
          { key: 'admin', label: 'Panel Kontrol Admin', icon: '⚙️' },
          { key: 'chat', label: 'Pesan Pembeli', icon: '💬' },
        ]
      default:
        return [{ key: 'home', label: 'Beranda', icon: '🏠' }]
    }
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

  const successModalStyles = `
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
  `;

  return (
    <>
      <style>{successModalStyles}</style>
      <aside style={{
        width: isOpen ? 260 : 80,
        background: 'var(--am-surface)',
        borderRight: '1px solid var(--am-border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        flexShrink: 0,
        fontFamily: 'var(--am-font-body)',
        transition: 'width 0.3s ease-in-out',
        boxShadow: '4px 0 15px rgba(0,0,0,0.03)',
        overflowX: 'hidden'
      }}>
        
        <div style={{ padding: '12px 16px', display: 'flex', justifyContent: isOpen ? 'flex-end' : 'center', borderBottom: '1px solid var(--am-border)' }}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{
              background: 'var(--am-bg2)', border: '1px solid var(--am-border)', borderRadius: 8,
              width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 'bold', color: 'var(--am-text)'
            }}
            title={isOpen ? "Tutup Sidebar" : "Buka Sidebar"}
          >
            {isOpen ? '◀' : '☰'}
          </button>
        </div>

        {isOpen && (
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
              fontSize: 10, fontWeight: 700, background: 'var(--am-primary)', color: 'white' 
            }}>
              {role === 'buyer' && (isGuest ? '👤 Pengunjung Tamu' : '🛍 Pembeli')}
              {role === 'seller' && '🏪 Penjual'}
              {role === 'driver' && '🛵 Driver'}
              {role === 'super_admin' ? '👑 Super Admin' : (role.includes('admin') ? '🏢 Admin Koperasi' : '')}
            </div>
          </div>
        )}

        <div style={{ flex: 1, padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
          {isOpen && (
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
                  if (isGuest && (item.key === 'cart' || item.key === 'chat' || item.key === 'tracker')) {
                    if (onRequireLogin) onRequireLogin();
                    return;
                  }
                  setActiveTab(item.key as AppTab);
                }}
                title={!isOpen ? item.label : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                  padding: isOpen ? '10px 14px' : '10px 0', 
                  justifyContent: isOpen ? 'flex-start' : 'center',
                  borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: isActive ? 'var(--am-primary)' : 'transparent',
                  color: isActive ? 'white' : 'var(--am-text)',
                  fontWeight: isActive ? 700 : 500, fontSize: 13,
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                {isOpen && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
              </button>
            )
          })}

          {/* 👑 TOMBOL KHUSUS SUPER ADMIN CENTER */}
          {(userEmail === 'miyya@gmail.com' || role === 'super_admin') && (
            <button
              onClick={() => setActiveTab('super_admin' as any)}
              title={!isOpen ? "Super Admin Center" : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: isOpen ? '10px 14px' : '10px 0', justifyContent: isOpen ? 'flex-start' : 'center',
                borderRadius: 10, border: '1px dashed #F59E0B', cursor: 'pointer',
                background: activeTab === ('super_admin' as any) ? '#F59E0B' : 'rgba(245, 158, 11, 0.1)', 
                color: activeTab === ('super_admin' as any) ? 'white' : '#D97706', 
                fontWeight: 700, fontSize: 13, marginTop: 6, transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: 18 }}>👑</span>
              {isOpen && <span style={{ whiteSpace: 'nowrap' }}>Super Admin Center</span>}
            </button>
          )}

          {/* 💎 TOMBOL MENU UPGRADE KE AKUN PRO */}
          {!isGuest && (
            <button
              onClick={() => {
                if (onOpenProModal) onOpenProModal();
              }}
              title={!isOpen ? "Antasari Mart PRO" : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: isOpen ? '10px 14px' : '10px 0', 
                justifyContent: isOpen ? 'flex-start' : 'center',
                borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #00B4D8 0%, #03045E 100%)',
                color: 'white', fontWeight: 700, fontSize: 13,
                marginTop: 6, boxShadow: '0 4px 12px rgba(0, 180, 216, 0.25)',
                transition: 'transform 0.2s'
              }}
            >
              <span style={{ fontSize: 18 }}>💎</span>
              {isOpen && (
                <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                  <div style={{ whiteSpace: 'nowrap' }}>Antasari Mart PRO</div>
                  <div style={{ fontSize: 9, opacity: 0.85, fontWeight: 400 }}>Mulai Rp 10rb/bln</div>
                </div>
              )}
            </button>
          )}

          {isOpen && !isGuest && (
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--am-text-muted)', paddingLeft: 8, marginTop: 16, marginBottom: 4, letterSpacing: 1 }}>
              PENGATURAN
            </div>
          )}

          {!isGuest && (
            <button
              onClick={() => setShowProfileModal(true)}
              title={!isOpen ? "Edit / Pengaturan Profil" : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: isOpen ? '10px 14px' : '10px 0', 
                justifyContent: isOpen ? 'flex-start' : 'center',
                borderRadius: 10, border: '1.5px solid var(--am-border)', cursor: 'pointer',
                background: 'var(--am-bg2)', color: 'var(--am-text)', fontWeight: 600, fontSize: 13,
                transition: 'background 0.2s',
              }}
            >
              <span style={{ fontSize: 18 }}>⚙️</span>
              {isOpen && <span style={{ whiteSpace: 'nowrap' }}>Edit Profil</span>}
            </button>
          )}
        </div>

        <div style={{ padding: 12, borderTop: '1px solid var(--am-border)' }}>
          <button
            onClick={onLogout}
            title={!isOpen ? "Keluar (Logout)" : undefined}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
              background: isGuest ? 'var(--am-primary)' : '#EF4444', color: 'white', fontWeight: 700, fontSize: 13,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            <span style={{ fontSize: 16 }}>{isGuest ? '🔑' : '🚪'}</span>
            {isOpen && <span>{isGuest ? 'Masuk / Daftar' : 'Keluar'}</span>}
          </button>
        </div>
      </aside>

      {showProfileModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div className="am-card am-slide-up" style={{ width: '100%', maxWidth: 440, padding: 24, borderRadius: 20, background: 'var(--am-surface)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 className="am-heading" style={{ margin: 0, fontSize: 18, color: 'var(--am-text)' }}>⚙️ Pengaturan Profil</h3>
              <button onClick={() => setShowProfileModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--am-text-muted)' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 14, border: '1px solid var(--am-border)', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 'bold', color: '#334155' }}>Ganti Avatar Kartun / Foto:</span>
                  <label style={{ fontSize: 10, color: '#0077B6', cursor: 'pointer', fontWeight: 700, background: '#E0F2FE', padding: '3px 8px', borderRadius: 6 }}>
                    📁 Upload Galeri
                    <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <img 
                    src={currentAvatar} 
                    alt="Pratinjau Foto" 
                    style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', background: '#e2e8f0', border: '3px solid var(--am-primary)' }} 
                  />
                </div>

                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', marginBottom: 6, textAlign: 'left' }}>Atau Pilih dari 10 Karakter Kartun Senyum Manis:</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, maxHeight: 100, overflowY: 'auto', padding: 2, background: '#ffffff', borderRadius: 10, border: '1px solid #CBD5E1' }}>
                  {PRESET_AVATARS.map(avatar => (
                    <div 
                      key={avatar.id}
                      onClick={() => setCurrentAvatar(avatar.url)}
                      title={avatar.name}
                      style={{
                        position: 'relative', cursor: 'pointer', borderRadius: '50%', overflow: 'hidden',
                        background: '#f8fafc', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: currentAvatar === avatar.url ? '3px solid #00B4D8' : '2px solid #CBD5E1',
                        boxShadow: currentAvatar === avatar.url ? '0 0 8px rgba(0, 180, 216, 0.4)' : 'none',
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
                  <option value="banjarmasin">📍 Banjarmasin (BJM)</option>
                  <option value="banjarbaru">📍 Banjarbaru (BJB)</option>
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
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
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