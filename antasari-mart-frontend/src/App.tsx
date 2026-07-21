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

export default function App() {
  const [_loggedIn, setLoggedIn] = useState(true)
  const [role, setRole] = useState<UserRole>('buyer')
  
  const [campus, setCampus] = useState<Campus>(() => {
    return (localStorage.getItem('am_user_campus') as Campus) || 'banjarmasin'
  })

  const [theme, setTheme] = useState<ThemeMode>('aesthetic')
  const [activeTab, setActiveTab] = useState<AppTab>('home')
  const [cart, setCart] = useState<CartItem[]>([])
  const [chatUnread, setChatUnread] = useState(0) // 💡 State dinamis untuk menghitung jumlah pesan belum dibaca
  
  const [user, setUser] = useState<any>(null)
  const isGuest = !user

  // 👉 Status pesanan aktif default FALSE, hanya true jika akun melakukan checkout nyata
  const [hasActiveOrder, setHasActiveOrder] = useState(() => {
    return !isGuest && localStorage.getItem('am_active_order') === 'true'
  })

  const currentUser = user || {
    id: 'guest',
    nama: 'Pengunjung Tamu',
    email: 'tamu@antasari.mart',
    role: 'buyer',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&auto=format'
  }

  const [modalMessage, setModalMessage] = useState<{ title: string; desc: string; icon: string } | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)

  const [userAvatar, setUserAvatar] = useState(() => {
    return localStorage.getItem('am_user_avatar') || currentUser.avatar
  })

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
    .cute-bounce-icon {
      animation: floatCute 2.5s ease-in-out infinite;
    }
    .modal-appear {
      animation: fadeInScale 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
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

  // 💡 Efek untuk mengambil jumlah pesan unread secara real-time dari database PostgreSQL
  useEffect(() => {
    if (isGuest || !currentUser?.email) {
      setChatUnread(0);
      return;
    }

    const fetchUnreadChats = async () => {
      try {
        const identifier = currentUser.role === 'seller' ? (currentUser.id || currentUser.email) : currentUser.email;
        const res = await fetch(`http://${window.location.hostname}:3000/api/chats/${identifier}`);
        const data = await res.json();
        if (data.success && data.chats) {
          // Hitung pesan yang dikirim oleh pihak lain (misal pembeli bertanya ke penjual)
          const unread = data.chats.filter((c: any) => c.senderId !== identifier).length;
          setChatUnread(unread > 0 ? unread : 0);
        }
      } catch (err) {
        console.error("Gagal mengambil status unread chat:", err);
      }
    };

    fetchUnreadChats();
    const interval = setInterval(fetchUnreadChats, 3000); // Polling setiap 3 detik
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
      await fetch(`http://${window.location.hostname}:3000/api/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: `room_${sellerId}_${buyerEmail}`,
          sellerId,
          sellerName,
          buyerEmail,
          buyerName,
          senderId: buyerEmail,
          text: initialMessage
        })
      });
    } catch (error) {
      console.error("Gagal membuat/mengirim chat room:", error);
    }

    setActiveTab('chat');
  }

  if (activeTab === ('login_page' as any)) {
    return <Login onLogin={(r, g, c, ud) => { handleLogin(r, g, c, ud); setActiveTab('home'); }} />
  }

  return (
    <div className={`am-root theme-${theme}`} style={{ display: 'flex', minHeight: '100vh', background: 'var(--am-bg)', position: 'relative' }}>
      <style>{customModalStyles}</style>
      
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
        userAvatar={userAvatar}
        setUserAvatar={setUserAvatar}
        campus={campus}
        setCampus={setCampus}
        onLogout={isGuest ? () => setShowLoginModal(true) : handleLogout}
        isGuest={isGuest}
        onRequireLogin={() => setShowLoginModal(true)}
        hasActiveOrder={hasActiveOrder}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar
          theme={theme}
          campus={campus}
          setCampus={setCampus}
          activeTab={activeTab}
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
          userAvatar={userAvatar}
          cartItems={cart}
          chatUnread={chatUnread} // 💡 Terhubung langsung ke database unread
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
              sellerId={currentUser.id || currentUser.email || 'seller_1'}
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
        </main>
      </div>

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