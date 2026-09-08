import { useState, useEffect, useRef, Component, type ReactNode } from 'react';
import type { AppTab, Campus, CartItem, DeliveryMethod, PaymentMethod, SessionUser, ThemeMode, UserRole } from './types';
import type { Product } from './types';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import ProductList from './components/ProductList';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import CourierTracker from './components/CourierTracker';
import SellerDashboard from './components/SellerDashboard';
import AdminPanel from './components/AdminPanel';
import DriverDashboard from './components/DriverDashboard';
import Login from './components/Login';
import ChatPage from './components/ChatPage';
import ProModal from './components/ProModal';
import { ProfileModal, SuccessPopup, InfoModal, LoginPromptModal } from './components/AppModals';
import SuperAdminPanel from './components/SuperAdminPanel';
import VendingSimulator from './components/VendingSimulator';
import MyammiyVoiceAssistant from './components/MyammiyVoiceAssistant';
import BottomNavBar from './components/BottomNavBar';
import CampusMartSplashScreen from './components/CampusMartSplashScreen';
import InAppNotification, { type InAppNotificationData } from './components/InAppNotification';
import { getChatsApi, sendChatApi } from './lib/api';

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

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; errorText?: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorText: error?.message || error?.toString() || 'Pembaruan komponen' };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("App Crash Caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ fontSize: 54, marginBottom: 12 }}>🌸 Antasari Mart</div>
          <h2 style={{ color: '#5FA874', margin: '0 0 8px' }}>Memuat Ulang Tampilan...</h2>
          <p style={{ color: '#64748B', marginBottom: 16 }}>Sistem baru saja diperbarui. Silakan klik tombol di bawah untuk menyinkronkan:</p>
          {this.state.errorText && (
            <div style={{ margin: '0 auto 20px', padding: '8px 16px', background: '#F1F5F9', color: '#475569', borderRadius: 8, fontSize: 12, maxWidth: 500, fontFamily: 'monospace' }}>
              Info: {this.state.errorText}
            </div>
          )}
          <button
            onClick={() => {
              localStorage.removeItem('am_tab');
              localStorage.removeItem('am_stock_overrides');
              this.setState({ hasError: false });
              window.location.reload();
            }}
            style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #5FA874 0%, #5FA874 100%)', color: 'white', fontWeight: 'bold', fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 14px rgba(244, 174, 194, 0.35)' }}
          >
            Buka Halaman Sekarang 🚀
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const VALID_CAMPUSES: Campus[] = ['banjarmasin', 'banjarbaru'];

export default function App() {
  return (
    <ErrorBoundary>
      <MainAppContent />
    </ErrorBoundary>
  );
}

function MainAppContent() {
  const [_loggedIn, setLoggedIn] = useState(true);
  const [role, setRole] = useState<UserRole>('buyer');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [campus, setCampus] = useState<Campus>(() => {
    const saved = localStorage.getItem('am_user_campus');
    return saved && (VALID_CAMPUSES as string[]).includes(saved) ? (saved as Campus) : 'banjarmasin';
  });

  const [theme, setTheme] = useState<ThemeMode>('aesthetic');
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [chatUnread, setChatUnread] = useState(0);
  const [showSplash, setShowSplash] = useState(true);

  // 🔔 In-App Push Notification & Quick Reply State
  const [inAppNotification, setInAppNotification] = useState<InAppNotificationData | null>(null);
  const lastNotifiedChatIdRef = useRef<string | number | null>(null);

  function getEffectiveUserName(u: SessionUser | null): string {
    if (!u) return 'Pengunjung Tamu';
    if (u.nama && u.nama !== 'Pengunjung Tamu' && u.nama !== 'Pengunjung') return u.nama;
    if (u.name && u.name !== 'Pengunjung Tamu' && u.name !== 'Pengunjung') return u.name;
    const savedCustomName = localStorage.getItem('am_user_name');
    if (savedCustomName && savedCustomName !== 'Pengunjung Tamu') return savedCustomName;
    if (u.email === 'miyya@gmail.com' || u.email === 'mnurmiyaty2@gmail.com') return 'Nurmiyaty (Super Admin)';
    const prefix = u.email.split('@')[0];
    return prefix.replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  const [user, setUser] = useState<SessionUser | null>(() => {
    const savedUser = localStorage.getItem('am_user_session');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        const effectiveName = getEffectiveUserName(parsed);
        return { ...parsed, nama: effectiveName, name: effectiveName };
      } catch (e) {
        console.error("Gagal parse user session:", e);
        return null;
      }
    }
    return null;
  });

  const isGuest = !user;

  const [hasActiveOrder, setHasActiveOrder] = useState(() => {
    return !isGuest && localStorage.getItem('am_active_order') === 'true';
  });

  const currentUser = user || {
    id: 'guest',
    nama: 'Pengunjung Tamu',
    email: 'tamu@antasari.mart',
    role: 'buyer' as UserRole,
    roles: ['buyer' as UserRole],
    avatar: ''
  };

  const [modalMessage, setModalMessage] = useState<{ title: string; desc: string; icon: string } | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentName, setCurrentName] = useState(() => getEffectiveUserName(user));
  const [selectedCampus, setSelectedCampus] = useState<Campus>(() => campus);
  const [userAvatar, setUserAvatar] = useState<string>(() => {
    return localStorage.getItem('am_user_avatar') || currentUser.avatar || '';
  });
  const [currentAvatar, setCurrentAvatar] = useState<string>(() => {
    return localStorage.getItem('am_user_avatar') || currentUser.avatar || '';
  });
  const [successPopupMessage, setSuccessPopupMessage] = useState<string | null>(null);

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
  `;

  useEffect(() => {
    const saved = localStorage.getItem('am_tab') as AppTab | null;
    if (saved) {
      if (isGuest && ['cart', 'checkout', 'chat', 'seller', 'driver', 'admin', 'super_admin'].includes(saved)) {
        setActiveTab('home');
      } else {
        setActiveTab(saved);
      }
    }
  }, [isGuest]);

  useEffect(() => {
    localStorage.setItem('am_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('am_user_campus', campus);
  }, [campus]);

  useEffect(() => {
    if (user) {
      const realName = getEffectiveUserName(user);
      setCurrentName(realName);
      if (user.avatar) {
        setUserAvatar(user.avatar);
        setCurrentAvatar(user.avatar);
      }
      const userRoles = Array.isArray(user.roles) ? user.roles : [user.role || 'buyer'];
      setRole(userRoles[0] as UserRole);
    }
  }, [user]);

  useEffect(() => {
    // Listener untuk pemicu notifikasi kustom dari seluruh aplikasi
    const handleCustomNotification = (e: any) => {
      if (e && e.detail) {
        setInAppNotification(e.detail);
      }
    };
    window.addEventListener('am_trigger_notification', handleCustomNotification);
    return () => window.removeEventListener('am_trigger_notification', handleCustomNotification);
  }, []);

  useEffect(() => {
    const fetchUnreadChats = async () => {
      if (isGuest || !currentUser?.email) {
        setChatUnread(0);
        return;
      }

      try {
        const identifier = currentUser.email;
        const data = await getChatsApi(identifier);
        if (data.success && Array.isArray(data.chats)) {
          const unreadChats = data.chats.filter((c: any) =>
            c.receiverId === identifier && c.isRead === false
          );
          setChatUnread(Math.max(0, unreadChats.length));

          // 🔔 Jika ada pesan baru masuk dan pengguna tidak sedang di tab chat, tampilkan pop-up notifikasi
          if (unreadChats.length > 0) {
            const latestUnread = unreadChats[unreadChats.length - 1];
            if (latestUnread && latestUnread.id !== lastNotifiedChatIdRef.current) {
              lastNotifiedChatIdRef.current = latestUnread.id;
              if (activeTab !== 'chat') {
                setInAppNotification({
                  id: String(latestUnread.id),
                  senderId: latestUnread.senderId,
                  senderName: latestUnread.senderName || 'Pengguna Antasari',
                  senderRole: latestUnread.senderRole || 'seller',
                  senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + encodeURIComponent(latestUnread.senderName || 'User'),
                  roomId: latestUnread.roomId,
                  text: latestUnread.text,
                  time: latestUnread.time || 'Baru saja'
                });
              }
            }
          }
        }
      } catch (_err) {
        // Fallback offline / mock mode
        try {
          const local = JSON.parse(localStorage.getItem(`am_local_chats_${currentUser.email.toLowerCase().trim()}`) || '[]');
          const unread = local.filter((c: any) => c.receiverId?.toLowerCase() === currentUser.email?.toLowerCase() && c.isRead === false);
          setChatUnread(unread.length);
        } catch (_e) {}
      }
    };

    fetchUnreadChats();
    const interval = setInterval(fetchUnreadChats, 3000);
    return () => clearInterval(interval);
  }, [currentUser, isGuest, activeTab]);

  function handleLogin(r: UserRole, _gender: 'male' | 'female', c: Campus, userData: any) {
    const effectiveName = getEffectiveUserName(userData);
    const updatedUser = { ...userData, nama: effectiveName, name: effectiveName };

    const userRoles = Array.isArray(updatedUser.roles) ? updatedUser.roles : [updatedUser.role || r];
    setRole(userRoles[0]);
    setUser(updatedUser);
    setCurrentName(effectiveName);
    if (updatedUser.avatar) {
      setUserAvatar(updatedUser.avatar);
      setCurrentAvatar(updatedUser.avatar);
      localStorage.setItem('am_user_avatar', updatedUser.avatar);
    }
    setCampus(c);

    localStorage.setItem('am_user_session', JSON.stringify(updatedUser));
    localStorage.setItem('am_current_user', JSON.stringify(updatedUser));
    localStorage.setItem('am_user_name', effectiveName);
    localStorage.setItem('am_user_campus', c);
  }

  function handleLogout() {
    setUser(null);
    setRole('buyer');
    localStorage.removeItem('am_user_session');
    localStorage.removeItem('am_current_user');
    localStorage.removeItem('am_user_avatar');
    localStorage.removeItem('am_user_name');
    localStorage.removeItem('am_active_order');
    localStorage.removeItem('am_delivery_method');
    setHasActiveOrder(false);
    setChatUnread(0);
    setActiveTab('home');
    setModalMessage({
      title: 'Berhasil Keluar! 👋',
      desc: 'Anda telah keluar dari akun dan kembali ke mode pengunjung tamu.',
      icon: '🚪'
    });
  }

  const handleSetActiveTab = (tab: AppTab) => {
    const guestRestricted: AppTab[] = ['cart', 'checkout', 'chat', 'seller', 'driver', 'admin', 'super_admin'];
    if (isGuest && guestRestricted.includes(tab)) {
      setShowLoginModal(true);
      return;
    }
    setActiveTab(tab);
    setIsMobileSidebarOpen(false);
  };

  function handleRoleChange(r: UserRole) {
    if (isGuest) {
      setShowLoginModal(true);
      return;
    }
    setRole(r);
    if (r !== 'buyer') setTheme('modern');
    setActiveTab(r === 'seller' ? 'seller' : r === 'driver' ? 'driver' : r === 'admin' ? 'admin' : 'home');
  }

  function addToCart(product: Product, qty: number) {
    if (isGuest) {
      setShowLoginModal(true);
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i);
      return [...prev, { product, quantity: qty }];
    });
  }

  function handleCheckout(method: DeliveryMethod, _payment: PaymentMethod, _location: string) {
    setCart([]);
    localStorage.setItem('am_active_order', 'true');
    localStorage.setItem('am_delivery_method', method);
    setHasActiveOrder(true);
    setActiveTab('tracker');
  }

  async function handleOpenChat(sellerId: string, sellerName: string, productName: string) {
    if (isGuest || !currentUser?.email) {
      setShowLoginModal(true);
      return;
    }

    const buyerEmail = currentUser.email;
    const buyerName = currentUser.nama || currentUser.name || 'Pengguna';
    const targetRoomId = [buyerEmail.toLowerCase(), (sellerId || 'seller_1').toLowerCase()].sort().join('__');
    const initialMessage = `Halo Kak ${sellerName}, saya tertarik dan ingin bertanya mengenai produk "${productName}" apakah stoknya masih tersedia?`;

    // 1. Simpan target kontak ke localStorage agar ChatPage langsung membukanya
    localStorage.setItem('am_target_chat_contact', JSON.stringify({
      id: Date.now(),
      nama: sellerName,
      email: sellerId || 'seller_1',
      role: 'seller',
      productName
    }));

    // 2. Buat & Simpan pesan langsung ke daftar obrolan lokal
    const localMsg = {
      id: Date.now(),
      roomId: targetRoomId,
      senderId: buyerEmail,
      senderName: buyerName,
      senderRole: currentUser.role || 'buyer',
      receiverId: sellerId || 'seller_1',
      receiverName: sellerName,
      receiverRole: 'seller',
      text: initialMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString()
    };

    try {
      const existingLocal = JSON.parse(localStorage.getItem('am_local_chats') || '[]');
      existingLocal.push(localMsg);
      localStorage.setItem('am_local_chats', JSON.stringify(existingLocal));
    } catch (_e) {}

    // 3. Update counter unread
    setChatUnread(prev => prev + 1);

    // 4. Kirim ke backend jika online
    sendChatApi({
      fromId: buyerEmail,
      fromName: buyerName,
      fromRole: currentUser.role || 'buyer',
      toId: sellerId || 'seller_1',
      toName: sellerName,
      toRole: 'seller',
      text: initialMessage
    }).catch(() => {});

    // 5. Tampilkan popup konfirmasi & langsung buka tab Obrolan
    setSuccessPopupMessage(`💬 Pesan terkirim ke Kak ${sellerName} untuk produk "${productName}"!`);
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

  if (activeTab === 'login_page') {
    return <Login onLogin={(r, g, c, ud) => { handleLogin(r, g, c, ud); setActiveTab('home'); }} />;
  }

  return (
    <div className={`am-root theme-${theme}`} style={{ display: 'flex', minHeight: '100vh', background: 'var(--am-bg)', position: 'relative' }}>
      <style>{customModalStyles}</style>

      {/* 🌸 ELEGANT CAMPUS MART PASTEL SPLASH SCREEN */}
      {showSplash && <CampusMartSplashScreen onFinish={() => setShowSplash(false)} />}

      <Sidebar
        theme={theme}
        role={role}
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        userName={currentUser.nama || currentUser.name || 'Pengunjung Tamu'}
        userEmail={currentUser.email}
        userAvatar={isGuest ? '' : userAvatar}
        setUserAvatar={setUserAvatar}
        campus={campus}
        setCampus={setCampus}
        onLogout={isGuest ? () => setActiveTab('login_page') : handleLogout}
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
        isOpenExternal={isMobileSidebarOpen}
        onCloseExternal={() => setIsMobileSidebarOpen(false)}
        onToggleTheme={() => setTheme(t => t === 'aesthetic' ? 'modern' : 'aesthetic')}
      />

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
          setActiveTab={handleSetActiveTab}
          role={role}
          setRole={handleRoleChange}
          userName={currentUser.nama || currentUser.name || 'Pengunjung'}
          userEmail={currentUser.email}
          userAvatar={isGuest ? '' : userAvatar}
          cartItems={cart}
          chatUnread={chatUnread}
          onToggleTheme={() => setTheme(t => t === 'aesthetic' ? 'modern' : 'aesthetic')}
          onLogout={isGuest ? () => setActiveTab('login_page') : handleLogout}
          isGuest={isGuest}
          onRequireLogin={() => setShowLoginModal(true)}
          hasActiveOrder={hasActiveOrder}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
        />

        <main style={{ flex: 1, paddingBottom: 72, minHeight: 'calc(100vh - 60px)' }}>
          {activeTab === 'home' && (
            <ProductList
              theme={theme}
              campus={campus}
              cartItems={cart}
              onAddToCart={addToCart}
              onChat={handleOpenChat}
              onNavigateCheckout={() => setActiveTab('checkout')}
              onOpenVending={() => setActiveTab('vending')}
              isGuest={isGuest}
              onRequireLogin={() => setShowLoginModal(true)}
            />
          )}
          {activeTab === 'cart' && (
            isGuest ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--am-text-muted)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
                <h3 style={{ color: 'var(--am-text)', margin: '0 0 8px' }}>Fitur Keranjang Terkunci</h3>
                <p style={{ fontSize: 13, marginBottom: 20 }}>Silakan Masuk atau Daftar akun terlebih dahulu untuk melihat dan mengelola keranjang belanja.</p>
                <button onClick={() => setShowLoginModal(true)} style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: 'var(--am-primary)', color: 'white', fontWeight: 800, cursor: 'pointer' }}>
                  🔑 Masuk / Daftar Akun
                </button>
              </div>
            ) : (
              <Cart
                theme={theme}
                items={cart}
                onUpdateQty={(id, qty) => setCart(prev => prev.map(i => i.product.id === id ? { ...i, quantity: qty } : i))}
                onRemove={id => setCart(prev => prev.filter(i => i.product.id !== id))}
                onCheckout={() => {
                  if (isGuest) {
                    setShowLoginModal(true);
                  } else {
                    setActiveTab('checkout');
                  }
                }}
                onContinueShopping={() => setActiveTab('home')}
                onAddToCart={addToCart}
              />
            )
          )}
          {activeTab === 'checkout' && (
            isGuest ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--am-text-muted)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
                <h3 style={{ color: 'var(--am-text)', margin: '0 0 8px' }}>Fitur Belanja Terkunci</h3>
                <p style={{ fontSize: 13, marginBottom: 20 }}>Tingkat keamanan akun aktif: Anda harus Masuk atau Mendaftar akun terlebih dahulu sebelum dapat membeli barang.</p>
                <button onClick={() => setShowLoginModal(true)} style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: 'var(--am-primary)', color: 'white', fontWeight: 800, cursor: 'pointer' }}>
                  🔑 Masuk / Daftar Akun Sekarang
                </button>
              </div>
            ) : (
              <Checkout
                theme={theme}
                campus={campus}
                items={cart}
                onConfirmOrder={handleCheckout}
                onBack={() => setActiveTab('home')}
              />
            )
          )}
          {activeTab === 'tracker' && (
            <CourierTracker
              theme={theme}
              campus={campus}
              hasActiveOrder={hasActiveOrder}
              userName={currentUser.nama || currentUser.name || 'Pengunjung'}
              userEmail={currentUser.email}
              onNavigateHome={() => setActiveTab('home')}
              onNavigateCart={() => setActiveTab('cart')}
              onFinishTracking={() => {
                setHasActiveOrder(false)
                setActiveTab('home')
              }}
            />
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
              <ChatPage theme={theme} campus={campus} onBack={() => setActiveTab('home')} />
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
            <AdminPanel
              theme={theme}
              campus={campus}
              currentUserId={currentUser.email || 'admin@koperasi.com'}
              currentUserName={currentUser.nama || currentUser.name || 'Pengurus Koperasi'}
            />
          )}

          {activeTab === 'super_admin' && (
            <SuperAdminPanel
              theme={theme}
            />
          )}

          {activeTab === 'vending_simulator' && (
            <VendingSimulator
              theme={theme}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      {modalMessage && (
        <InfoModal
          data={modalMessage}
          onClose={() => setModalMessage(null)}
        />
      )}

      {showLoginModal && (
        <LoginPromptModal
          onDismiss={() => setShowLoginModal(false)}
          onGoToLogin={() => {
            setShowLoginModal(false);
            setActiveTab('login_page');
          }}
        />
      )}

      {showProModal && (
        <ProModal
          theme={theme}
          user={currentUser}
          onClose={() => setShowProModal(false)}
          onSuccess={() => {
            setShowProModal(false);
            setSuccessPopupMessage('Selamat! Akun Anda kini telah resmi di-upgrade ke Antasari Mart PRO 💎');
          }}
        />
      )}

      {showProfileModal && (
        <ProfileModal
          email={currentUser.email}
          currentName={currentName}
          setCurrentName={setCurrentName}
          currentAvatar={currentAvatar}
          setCurrentAvatar={setCurrentAvatar}
          selectedCampus={selectedCampus}
          setSelectedCampus={setSelectedCampus}
          presetAvatars={PRESET_AVATARS}
          onImageChange={handleImageChange}
          onSave={() => {
            setCampus(selectedCampus);
            setUserAvatar(currentAvatar);
            localStorage.setItem('am_user_avatar', currentAvatar);
            localStorage.setItem('am_user_name', currentName);
            if (user) {
              const updated = { ...user, nama: currentName, name: currentName, avatar: currentAvatar };
              setUser(updated);
              localStorage.setItem('am_user_session', JSON.stringify(updated));
              localStorage.setItem('am_current_user', JSON.stringify(updated));
            }
            setShowProfileModal(false);
            setSuccessPopupMessage('Profil & Avatar Anda berhasil diperbarui! ✨');
          }}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {successPopupMessage && (
        <SuccessPopup
          message={successPopupMessage}
          onClose={() => setSuccessPopupMessage(null)}
        />
      )}

      {/* Floating AI Voice Assistant Myammiy (Disembunyikan di tab chat agar tidak menghalangi) */}
      {activeTab !== 'login_page' && activeTab !== 'chat' && (
        <MyammiyVoiceAssistant
          onAddToCart={addToCart}
          onNavigateTab={(targetTab) => setActiveTab(targetTab as AppTab)}
        />
      )}

      {/* 📱 MODERN FIXED BOTTOM NAVIGATION BAR */}
      {activeTab !== 'login_page' && (
        <BottomNavBar
          activeTab={activeTab}
          setActiveTab={handleSetActiveTab}
          cartItems={cart}
          chatUnread={chatUnread}
          isGuest={isGuest}
          onRequireLogin={() => setShowLoginModal(true)}
          userRoles={currentUser.roles || ['buyer']}
          isSuperAdmin={currentUser.email === 'miyya@gmail.com' || role === 'super_admin'}
          hasActiveOrder={hasActiveOrder}
          onOpenProfileModal={() => {
            if (isGuest) {
              setShowLoginModal(true);
            } else {
              setShowProfileModal(true);
            }
          }}
        />
      )}

      {/* 🔔 FLOATING IN-APP PUSH NOTIFICATION & QUICK REPLY POP-UP */}
      <InAppNotification
        notification={inAppNotification}
        onDismiss={() => setInAppNotification(null)}
        onOpenChat={(roomId, _senderId) => {
          setInAppNotification(null);
          setActiveTab('chat');
          if (roomId) {
            localStorage.setItem('am_target_chat_room', roomId);
          }
        }}
        currentUserId={currentUser.id || currentUser.email || 'user_active'}
        currentUserName={currentUser.nama || currentUser.name || 'Pengguna Antasari'}
        currentUserRole={role || 'buyer'}
        theme={theme}
      />
    </div>
  );
}
