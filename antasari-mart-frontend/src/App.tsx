import { useState, useEffect } from 'react'
import type { AppTab, Campus, CartItem, DeliveryMethod, PaymentMethod, ThemeMode, UserRole } from './types'
import type { Product } from './types'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import ProductList from './components/ProductList'
import Cart from './components/Cart'
import Checkout from './components/Checkout'
import CourierTracker from './components/CourierTracker'
import SellerDashboard from './components/SellerDashboard'
import AdminPanel from './components/AdminPanel'
import DriverDashboard from './components/DriverDashboard'
import Login from './components/Login'
import ChatPage from './components/ChatPage'
import ProModal from './components/ProModal'
import SuperAdminPanel from './components/SuperAdminPanel' // 👑 Impor Panel Super Admin

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

export default function App() {
  const [_loggedIn, setLoggedIn] = useState(true)
  const [role, setRole] = useState<UserRole>('buyer')
  
  const [campus, setCampus] = useState<Campus>(() => {
    return (localStorage.getItem('am_user_campus') as Campus) || 'banjarmasin'
  })

  const [theme, setTheme] = useState<ThemeMode>('aesthetic')
  const [activeTab, setActiveTab] = useState<AppTab>('home')
  const [cart, setCart] = useState<CartItem[]>([])
  const [chatUnread, setChatUnread] = useState(0)
  
  const [user, setUser] = useState<any>(null)
  const isGuest = !user

  const [hasActiveOrder, setHasActiveOrder] = useState(() => {
    return !isGuest && localStorage.getItem('am_active_order') === 'true'
  })

  const currentUser = user || {
    id: 'guest',
    nama: 'Pengunjung Tamu',
    email: 'tamu@antasari.mart',
    role: 'buyer',
    avatar: ''
  }

  const [modalMessage, setModalMessage] = useState<{ title: string; desc: string; icon: string } | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showProModal, setShowProModal] = useState(false)

  // 💡 State untuk Modal Edit Profil & Pop-up Sukses
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [currentName, setCurrentName] = useState(currentUser.nama || currentUser.name || 'Pengunjung Tamu')
  const [selectedCampus, setSelectedCampus] = useState<Campus>(campus)
  const [userAvatar, setUserAvatar] = useState(() => {
    return localStorage.getItem('am_user_avatar') || currentUser.avatar
  })
  const [currentAvatar, setCurrentAvatar] = useState(userAvatar)
  const [successPopupMessage, setSuccessPopupMessage] = useState<string | null>(null)

  const customModalStyles = `
    @keyframes floatCute {
      0% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-8px) rotate(3deg); }
      100% { transform: translateY(0px) rotate(0deg); }
    }
    @keyframes fadeInScale {
      0% { opacity: 0; transform: scale(0.85) translateY(10px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
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
    .cute-bounce-icon {
      animation: floatCute 2.5s ease-in-out infinite;
    }
    .modal-appear {
      animation: fadeInScale 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
    .success-modal-appear {
      animation: bounceIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
    .check-icon-anim {
      animation: checkAnim 0.4s ease-in-out 0.1s both;
    }
  `

  useEffect(() => {
    const saved = localStorage.getItem('am_tab') as AppTab | null
    if (saved) setActiveTab(saved)
  }, [])

  useEffect(() => {
    localStorage.setItem('am_tab', activeTab)
  }, [activeTab])

  useEffect(() => {
    localStorage.setItem('am_user_campus', campus)
  }, [campus])

  useEffect(() => {
    if (isGuest || !currentUser?.email) {
      setChatUnread(0);
      return;
    }

    const fetchUnreadChats = async () => {
      try {
        const identifier = currentUser.email;
        const res = await fetch(`http://${window.location.hostname}:5000/api/chats/${identifier}`);
        const data = await res.json();
        if (data.success && data.chats) {
          const unread = data.chats.filter((c: any) => c.receiverId === identifier && c.senderId !== identifier).length;
          setChatUnread(unread > 0 ? unread : 0);
        }
      } catch (err) {
        console.error("Gagal mengambil status unread chat:", err);
      }
    };

    fetchUnreadChats();
    const interval = setInterval(fetchUnreadChats, 3000);
    return () => clearInterval(interval);
  }, [currentUser, isGuest]);

  function handleLogin(r: UserRole, _gender: 'male' | 'female', c: Campus, userData: any) {
    setRole(userData.role || r)
    setUser(userData)
    setCampus(c)
    localStorage.setItem('am_user_campus', c)
    if (userData.avatar) {
      setUserAvatar(userData.avatar)
      localStorage.setItem('am_user_avatar', userData.avatar)
    }
    setLoggedIn(true)
  }

  function handleLogout() {
    setUser(null)
    setRole('buyer')
    localStorage.removeItem('am_user_avatar')
    localStorage.removeItem('am_user_name')
    localStorage.removeItem('am_active_order')
    localStorage.removeItem('am_delivery_method')
    setHasActiveOrder(false)
    setChatUnread(0)
    setActiveTab('home')
    setModalMessage({
      title: 'Berhasil Keluar! 👋',
      desc: 'Anda telah keluar dari akun dan kembali ke mode pengunjung tamu.',
      icon: '🚪'
    })
  }

  function handleRoleChange(r: UserRole) {
    if (isGuest) {
      setShowLoginModal(true);
      return;
    }
    setRole(r)
    if (r !== 'buyer') setTheme('modern')
    setActiveTab(r === 'seller' ? 'seller' : r === 'driver' ? 'driver' : r === 'admin' ? 'admin' : 'home')
  }

  function addToCart(product: Product, qty: number) {
    if (isGuest) {
      setShowLoginModal(true);
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i)
      return [...prev, { product, quantity: qty }]
    })
  }

  function handleCheckout(_method: DeliveryMethod, _payment: PaymentMethod, _location: string) {
    setCart([])
    localStorage.setItem('am_active_order', 'true')
    setHasActiveOrder(true)
    setActiveTab('tracker')
  }

  async function handleOpenChat(sellerId: string, sellerName: string, productName: string) {
    if (isGuest) {
      setShowLoginModal(true);
      return;
    }

    const buyerEmail = currentUser.email || 'miyya@gmail.com';
    const buyerName = currentUser.nama || currentUser.name || 'Miyatul';
    const initialMessage = `Halo Kak ${sellerName}, saya ingin bertanya mengenai produk "${productName}" apakah stoknya tersedia?`;

    try {
      await fetch(`http://${window.location.hostname}:5000/api/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromId: buyerEmail,
          fromName: buyerName,
          fromRole: currentUser.role || 'buyer',
          toId: sellerId,
          toName: sellerName,
          toRole: 'seller',
          text: initialMessage
        })
      });
    } catch (error) {
      console.error("Gagal membuat/mengirim chat room:", error);
    }

    setActiveTab('chat');
  }

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

  if (activeTab === ('login_page' as any)) {
    return <Login onLogin={(r, g, c, ud) => { handleLogin(r, g, c, ud); setActiveTab('home'); }} />
  }

  return (
    <div className={`am-root theme-${theme}`} style={{ display: 'flex', minHeight: '100vh', background: 'var(--am-bg)', position: 'relative' }}>
      <style>{customModalStyles}</style>
      
      {/* Sidebar khusus desktop */}
      <div className="hidden md:block">
        <Sidebar
          theme={theme}
          role={role}
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (isGuest && (tab === 'seller' || tab === 'driver' || tab === 'admin' || tab === 'cart' || tab === 'chat' || tab === 'tracker')) {
              setShowLoginModal(true);
              return;
            }
            if (tab === 'tracker' && !hasActiveOrder) {
              setModalMessage({
                title: isGuest ? 'Silakan Login Dulu 🔒' : 'Belum Ada Pesanan 🛵',
                desc: isGuest 
                  ? 'Fitur Lacak / Order Pick-Up hanya dapat diakses setelah kamu login dan memiliki pesanan aktif.' 
                  : 'Belum ada pesanan aktif. Lakukan checkout pesanan terlebih dahulu untuk membuka fitur ini.',
                icon: '📍'
              });
              return;
            }
            setActiveTab(tab);
          }}
          userName={currentUser.nama || currentUser.name || 'Pengunjung Tamu'}
          userEmail={currentUser.email}
          userAvatar={isGuest ? '' : userAvatar}
          setUserAvatar={setUserAvatar}
          campus={campus}
          setCampus={setCampus}
          onLogout={isGuest ? () => setShowLoginModal(true) : handleLogout}
          isGuest={isGuest}
          onRequireLogin={() => setShowLoginModal(true)}
          hasActiveOrder={hasActiveOrder}
          onOpenProModal={() => {
            if (isGuest) {
              setShowLoginModal(true);
            } else {
              setShowProModal(true);
            }
          }}
        />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar
          theme={theme}
          campus={campus}
          setCampus={setCampus}
          activeTab={activeTab}
          onOpenProfileModal={() => {
            if (isGuest) {
              setShowLoginModal(true);
            } else {
              setShowProfileModal(true);
            }
          }}
          setActiveTab={(tab) => {
            if (isGuest && (tab === 'cart' || tab === 'chat' || tab === 'tracker')) {
              setShowLoginModal(true);
              return;
            }
            if (tab === 'tracker' && !hasActiveOrder) {
              setModalMessage({
                title: isGuest ? 'Silakan Login Dulu 🔒' : 'Belum Ada Pesanan 🛵',
                desc: isGuest 
                  ? 'Fitur Lacak / Order Pick-Up hanya dapat diakses setelah kamu login dan memiliki pesanan aktif.' 
                  : 'Belum ada pesanan aktif. Lakukan checkout pesanan terlebih dahulu untuk membuka fitur ini.',
                icon: '📍'
              });
              return;
            }
            setActiveTab(tab);
          }}
          role={role}
          setRole={handleRoleChange}
          userName={currentUser.nama || currentUser.name || 'Pengunjung'}
          userEmail={currentUser.email}
          userAvatar={isGuest ? '' : userAvatar}
          cartItems={cart}
          chatUnread={chatUnread}
          onToggleTheme={() => setTheme(t => t === 'aesthetic' ? 'modern' : 'aesthetic')}
          onLogout={isGuest ? () => setShowLoginModal(true) : handleLogout}
          isGuest={isGuest}
          onRequireLogin={() => setShowLoginModal(true)}
          hasActiveOrder={hasActiveOrder}
        />

        <main style={{ flex: 1, paddingBottom: 40 }}>
          {activeTab === 'home' && (
            <ProductList
              theme={theme}
              campus={campus}
              cartItems={cart}
              onAddToCart={addToCart}
              onChat={handleOpenChat}
              onNavigateCheckout={() => setActiveTab('checkout')}
            />
          )}
          {activeTab === 'cart' && (
            isGuest ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--am-text-muted)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🛒🔒</div>
                <h3 style={{ color: 'var(--am-text)', margin: '0 0 8px' }}>Akses Keranjang Dibatasi</h3>
                <p style={{ fontSize: 13, marginBottom: 20 }}>Silakan login atau daftar terlebih dahulu untuk melihat isi keranjang belanjaanmu.</p>
                <button className="am-btn-primary" onClick={() => setShowLoginModal(true)} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'var(--am-primary)', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                  Masuk / Daftar Sekarang 🚀
                </button>
              </div>
            ) : (
              <Cart
                theme={theme}
                items={cart}
                onUpdateQty={(id, qty) => setCart(prev => prev.map(i => i.product.id === id ? { ...i, quantity: qty } : i))}
                onRemove={id => setCart(prev => prev.filter(i => i.product.id !== id))}
                onCheckout={() => setActiveTab('checkout')}
                onContinueShopping={() => setActiveTab('home')}
              />
            )
          )}
          {activeTab === 'checkout' && (
            <Checkout
              theme={theme}
              campus={campus}
              items={cart}
              onConfirmOrder={handleCheckout}
              onBack={() => setActiveTab('cart')}
            />
          )}
          {activeTab === 'tracker' && (
            hasActiveOrder ? (
              <CourierTracker 
                theme={theme} 
                campus={campus} 
                userName={currentUser.nama || currentUser.name || 'Pengunjung'}
                userEmail={currentUser.email}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--am-text-muted)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
                <h3 style={{ color: 'var(--am-text)', margin: '0 0 8px' }}>Fitur Terkunci</h3>
                <p style={{ fontSize: 13 }}>
                  {isGuest 
                    ? 'Silakan login terlebih dahulu dan lakukan checkout pesanan untuk melihat status pesanan.' 
                    : 'Lakukan checkout pesanan terlebih dahulu untuk membuka fitur ini.'}
                </p>
              </div>
            )
          )}
          {activeTab === 'chat' && (
            isGuest ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--am-text-muted)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>💬🔒</div>
                <h3 style={{ color: 'var(--am-text)', margin: '0 0 8px' }}>Akses Pesan Dibatasi</h3>
                <p style={{ fontSize: 13, marginBottom: 20 }}>Silakan login terlebih dahulu untuk mulai mengirim pesan kepada penjual.</p>
                <button className="am-btn-primary" onClick={() => setShowLoginModal(true)} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'var(--am-primary)', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                  Masuk / Daftar Sekarang 🚀
                </button>
              </div>
            ) : (
              <ChatPage theme={theme} campus={campus} />
            )
          )}
          {activeTab === 'seller' && (
            <SellerDashboard
              theme={theme}
              campus={campus}
              sellerId={currentUser.email || 'seller_1'}
              sellerName={currentUser.nama || currentUser.name || 'Penjual Koperasi'}
            />
          )}
          {activeTab === 'driver' && (
            <DriverDashboard
              theme={theme}
              campus={campus}
              driverName={currentUser.nama || currentUser.name || 'Driver Antasari'}
            />
          )}
          {activeTab === 'admin' && (
            <AdminPanel theme={theme} />
          )}
          {activeTab === ('super_admin' as any) && (
            <SuperAdminPanel theme={theme} />
          )}
        </main>
      </div>

      {showProModal && (
        <ProModal 
          user={currentUser} 
          onClose={() => setShowProModal(false)} 
        />
      )}

      {/* 💡 Modal Pengaturan Profil yang dipicu saat Foto Profil di TopBar diklik */}
      {showProfileModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div className="am-card modal-appear" style={{ width: '100%', maxWidth: 440, padding: 24, borderRadius: 20, background: 'var(--am-surface)', maxHeight: '90vh', overflowY: 'auto' }}>
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
                  value={currentUser.email || 'miya@gmail.com'} 
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

                  if (user) {
                    setUser({ ...user, nama: currentName, avatar: currentAvatar });
                  }

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

      {/* Pop-up Pesan Berhasil Disimpan */}
      {successPopupMessage && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999,
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

      {modalMessage && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          backdropFilter: 'blur(5px)'
        }}>
          <div className="modal-appear am-card" style={{
            width: '100%', maxWidth: 380, padding: 30, borderRadius: 24,
            background: 'var(--am-surface)', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div className="cute-bounce-icon" style={{ fontSize: 52, marginBottom: 12 }}>
              {modalMessage.icon}
            </div>

            <h3 className="am-heading" style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: 'var(--am-text)' }}>
              {modalMessage.title}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--am-text-muted)', lineHeight: 1.5, marginBottom: 24 }}>
              {modalMessage.desc}
            </p>

            <button
              className="am-btn-primary"
              onClick={() => setModalMessage(null)}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
                background: 'var(--am-primary)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer'
              }}
            >
              Baik, Mengerti 👍
            </button>
          </div>
        </div>
      )}

      {showLoginModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          backdropFilter: 'blur(5px)'
        }}>
          <div className="modal-appear am-card" style={{
            width: '100%', maxWidth: 380, padding: 30, borderRadius: 24,
            background: 'var(--am-surface)', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div className="cute-bounce-icon" style={{ fontSize: 52, marginBottom: 12 }}>
              🧸✨
            </div>

            <h3 className="am-heading" style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: 'var(--am-text)' }}>
              Ups, Mau Masuk Menu Ini? 🛍️
            </h3>
            <p style={{ fontSize: 13, color: 'var(--am-text-muted)', lineHeight: 1.5, marginBottom: 24 }}>
              Kamu harus <strong>Login</strong> atau <strong>Daftar</strong> terlebih dahulu untuk mengakses Keranjang, Pesan, dan fitur belanja lainnya di Antasari Mart.
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowLoginModal(false)}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid var(--am-border)',
                  background: 'var(--am-bg2)', color: 'var(--am-text)', fontWeight: 600, fontSize: 13, cursor: 'pointer'
                }}
              >
                Nanti Saja
              </button>
              <button
                className="am-btn-primary"
                onClick={() => {
                  setShowLoginModal(false);
                  setActiveTab('login_page' as any);
                }}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
                  background: 'var(--am-primary)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer'
                }}
              >
                Masuk / Daftar 🚀
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}