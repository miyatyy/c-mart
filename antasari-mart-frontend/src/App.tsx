import { useState, useEffect, useRef, useMemo, Component, type ReactNode } from 'react';
import type { AppTab, Campus, CartItem, DeliveryMethod, PaymentMethod, SessionUser, ThemeMode, UserRole } from './types';
import type { Product } from './types';
import { formatRupiah } from './data';
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
import StandaloneVueChat from './components/chat/StandaloneVueChat';
import ProModal from './components/ProModal';
import { ProfileModal, SuccessPopup, InfoModal, LoginPromptModal } from './components/AppModals';
import SuperAdminPanel from './components/SuperAdminPanel';
import VendingSimulator from './components/VendingSimulator';
import MyammiyVoiceAssistant from './components/MyammiyVoiceAssistant';
import BottomNavBar from './components/BottomNavBar';
import InAppNotification, { type InAppNotificationData } from './components/InAppNotification';
import DebugSystemMenu from './components/DebugSystemMenu';
import { getChatsApi, sendChatApi } from './lib/api';
import { getSocket } from './lib/socket';
import { getUserAvatar, saveUserAvatarToGlobalMap, PRESET_AVATARS } from './lib/userAvatars';
import { normalizeUserId, subscribeToCloudChatStream } from './lib/cloudChatSync';
import { cleanupSnapOverlays } from './lib/snapCleanup';
import { isUserProductOwner } from './lib/productOwnership';
import { requestBrowserNotificationPermission, showSystemWebNotification } from './lib/webNotification';

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
          <div style={{ fontSize: 54, marginBottom: 12 }}>🌸 Campus Mart</div>
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

  // 🔔 In-App Push Notification & Quick Reply State
  const [inAppNotification, setInAppNotification] = useState<InAppNotificationData | null>(null);
  const lastNotifiedChatIdRef = useRef<string | number | null>(null);

  // 🧹 Bersihkan overlay atau iframe Midtrans Snap saat berganti tab / halaman + Reset Scroll
  useEffect(() => {
    cleanupSnapOverlays();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [activeTab]);

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

  const [isChatRoomActive, setIsChatRoomActive] = useState(false);
  const isFullScreenChat = activeTab === 'chat' && isChatRoomActive;

  const [hasActiveOrder, setHasActiveOrder] = useState(() => {
    return !isGuest && localStorage.getItem('am_active_order') === 'true';
  });

  const currentUser = useMemo(() => {
    return user || {
      id: 'guest',
      nama: 'Pengunjung Tamu',
      email: 'tamu@antasari.mart',
      role: 'buyer' as UserRole,
      roles: ['buyer' as UserRole],
      avatar: ''
    };
  }, [user]);

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
    .am-main-content-container {
      padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px));
    }
    .am-main-content-container.chat-active {
      padding-bottom: 0 !important;
    }
    @media (min-width: 768px) {
      .am-main-content-container {
        padding-bottom: 0 !important;
      }
      .am-hide-on-desktop-chat {
        display: none !important;
      }
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
        // Jangan tampilkan floating in-app popup jika sedang berada di layar obrolan
        if (activeTab === 'chat' && e.detail.type !== 'order') {
          return;
        }
        setInAppNotification(e.detail);
      }
    };
    const handleUserChanged = (e: any) => {
      if (e && e.detail) {
        setUser(e.detail);
      }
    };
    window.addEventListener('am_trigger_notification', handleCustomNotification);
    window.addEventListener('am_user_changed', handleUserChanged);
    return () => {
      window.removeEventListener('am_trigger_notification', handleCustomNotification);
      window.removeEventListener('am_user_changed', handleUserChanged);
    };
  }, [activeTab]);

  useEffect(() => {
    // Request permission for Web Push Notifications on app load
    requestBrowserNotificationPermission().catch(() => {});
  }, []);

  useEffect(() => {
    if (isGuest || !currentUser?.email || currentUser.email === 'tamu@antasari.mart') {
      return;
    }

    const myNorm = normalizeUserId(currentUser.email);
    const activeTabRef = { current: activeTab };
    activeTabRef.current = activeTab;
    const isChatRoomActiveRef = { current: isChatRoomActive };
    isChatRoomActiveRef.current = isChatRoomActive;

    const handleIncomingChatMessage = (incomingMsg: any) => {
      if (!incomingMsg) return;
      const sNorm = normalizeUserId(incomingMsg.senderId || incomingMsg.fromId);
      const rNorm = normalizeUserId(incomingMsg.receiverId || incomingMsg.toId);
      const isToMe = rNorm === myNorm;
      if (!isToMe || sNorm === myNorm) return;

      const effectiveRoomId = incomingMsg.roomId || buildRoomId(sNorm, rNorm);
      const senderName = incomingMsg.senderName || incomingMsg.fromName || 'Pengguna Antasari';
      const senderRole = incomingMsg.senderRole || incomingMsg.fromRole || 'buyer';
      const senderAvatar = getUserAvatar(incomingMsg.senderId || sNorm, senderName, senderRole);
      const msgText = incomingMsg.text || 'Mengirim pesan baru';
      const timeStr = incomingMsg.time || 'Baru saja';

      setChatUnread(prev => prev + 1);

      // 🔔 1. Tampilkan In-App Floating Notification Bubble jika tidak sedang berada di tab obrolan
      const isInChat = activeTabRef.current === 'chat';
      if (!isInChat) {
        setInAppNotification({
          id: String(incomingMsg.id || Date.now()),
          senderId: incomingMsg.senderId || sNorm,
          senderName,
          senderRole,
          senderAvatar,
          roomId: effectiveRoomId,
          text: msgText,
          time: timeStr
        });
      }

      // 🌐 2. Tampilkan Browser System Push Notification jika tab/layar di latar belakang atau tidak fokus
      if (document.hidden || !document.hasFocus() || activeTabRef.current !== 'chat' || !isChatRoomActiveRef.current) {
        showSystemWebNotification(`Pesan baru dari ${senderName}`, {
          body: msgText,
          icon: senderAvatar,
          tag: `chat_${effectiveRoomId}`,
          data: { roomId: effectiveRoomId, senderId: incomingMsg.senderId || sNorm },
          onClick: () => {
            setActiveTab('chat');
            localStorage.setItem('am_target_chat_room', effectiveRoomId);
            setIsChatRoomActive(true);
            window.dispatchEvent(new CustomEvent('am_open_chat_room', {
              detail: { roomId: effectiveRoomId, senderId: incomingMsg.senderId || sNorm }
            }));
          }
        });
      }
    };

    // ⚡ 1. Langganan Cloud Realtime Stream (SSE) Global di App.tsx (< 100ms Push)
    const unsubscribeCloudStream = subscribeToCloudChatStream(currentUser.email, handleIncomingChatMessage);

    const handleIncomingOrderNotification = (orderData: any) => {
      if (!orderData) return;
      const activeUser = currentUser || (() => {
        try { return JSON.parse(localStorage.getItem('am_user_session') || '{}'); } catch { return {}; }
      })();
      const isSellerOrAdmin = activeUser.role === 'seller' || activeUser.role === 'admin' || activeUser.role === 'super_admin' ||
        (Array.isArray(activeUser.roles) && (activeUser.roles.includes('seller') || activeUser.roles.includes('admin') || activeUser.roles.includes('super_admin')));

      if (!isSellerOrAdmin) return;

      const buyerName = orderData.buyerName || orderData.customerDetails?.name || 'Mahasiswa UIN';
      const totalStr = orderData.total ? formatRupiah(orderData.total) : (orderData.grossAmount ? formatRupiah(orderData.grossAmount) : '');
      const itemSummary = orderData.items && orderData.items.length > 0 
        ? orderData.items.map((i: any) => `${i.qty || i.quantity || 1}x ${i.name || i.product?.name || 'Produk'}`).join(', ')
        : 'Produk Kampus';

      setInAppNotification({
        id: `order_${Date.now()}`,
        senderId: 'order_system',
        senderName: `Pesanan Baru dari ${buyerName}`,
        senderRole: 'buyer',
        text: `${itemSummary}${totalStr ? ` • Total: ${totalStr}` : ''}`,
        time: 'Baru saja',
        type: 'order',
        orderData: orderData
      });
    };

    // ⚡ 2. Socket.io Real-time Global Unread & Notification Listener
    const socket = getSocket();
    if (socket) {
      socket.on('new_chat_notification', handleIncomingChatMessage);
      socket.on('chat_list_update', handleIncomingChatMessage);
      socket.on('new_order_notification', handleIncomingOrderNotification);
    }

    const handleLocalOrderCreated = (e: any) => {
      if (e && e.detail) {
        handleIncomingOrderNotification(e.detail);
      }
    };
    window.addEventListener('am_order_created', handleLocalOrderCreated);

    let isFetchingChats = false;
    // 🔄 3. Polling Sinkronisasi Rutin Unread Chat
    const fetchUnreadChats = async () => {
      if (isFetchingChats) return;
      isFetchingChats = true;
      try {
        const identifier = myNorm;
        const data = await getChatsApi(identifier);
        if (data.success && Array.isArray(data.chats)) {
          const unreadChats = data.chats.filter((c: any) => {
            const receiverNorm = normalizeUserId(c.receiverId);
            const senderNorm = normalizeUserId(c.senderId);
            const isToMe = receiverNorm === myNorm;
            const isFromMe = senderNorm === myNorm;
            return isToMe && !isFromMe && c.isRead !== true;
          });
          setChatUnread(prev => prev === unreadChats.length ? prev : unreadChats.length);
        }
      } catch (_err) {
        try {
          const local = JSON.parse(localStorage.getItem(`am_local_chats_${myNorm}`) || '[]');
          const unread = local.filter((c: any) => {
            const receiverNorm = normalizeUserId(c.receiverId);
            const senderNorm = normalizeUserId(c.senderId);
            const isToMe = receiverNorm === myNorm;
            const isFromMe = senderNorm === myNorm;
            return isToMe && !isFromMe && c.isRead !== true;
          });
          setChatUnread(prev => prev === unread.length ? prev : unread.length);
        } catch (_e) {}
      } finally {
        isFetchingChats = false;
      }
    };

    fetchUnreadChats();
    const interval = setInterval(fetchUnreadChats, 15000);

    const handleChatRead = () => {
      try {
        const local = JSON.parse(localStorage.getItem(`am_local_chats_${myNorm}`) || '[]');
        const unread = local.filter((c: any) => {
          const receiverNorm = normalizeUserId(c.receiverId);
          const senderNorm = normalizeUserId(c.senderId);
          const isToMe = receiverNorm === myNorm;
          const isFromMe = senderNorm === myNorm;
          return isToMe && !isFromMe && c.isRead !== true;
        });
        setChatUnread(unread.length);
      } catch (_e) {}
    };
    window.addEventListener('am_chat_read', handleChatRead);

    return () => {
      unsubscribeCloudStream();
      clearInterval(interval);
      window.removeEventListener('am_chat_read', handleChatRead);
      window.removeEventListener('am_order_created', handleLocalOrderCreated);
      if (socket) {
        socket.off('new_chat_notification', handleIncomingChatMessage);
        socket.off('chat_list_update', handleIncomingChatMessage);
        socket.off('new_order_notification', handleIncomingOrderNotification);
      }
    };
  }, [currentUser.email, isGuest]);

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

    saveUserAvatarToGlobalMap(updatedUser.email, effectiveName, updatedUser.avatar || '');

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
    if (tab === 'chat') {
      localStorage.removeItem('am_target_chat_room');
      localStorage.removeItem('am_target_chat');
      localStorage.removeItem('am_target_chat_contact');
      window.dispatchEvent(new CustomEvent('am_reset_chat_view'));
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
    if (isUserProductOwner(product, currentUser)) {
      alert('Penjual tidak dapat membeli produk dari tokonya sendiri.');
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

    const effectiveSellerId = sellerId || 'seller_1';
    const effectiveSellerName = sellerName || (effectiveSellerId === 'seller_1' ? 'Myammiy Craft (Katalog Resmi)' : 'Penjual Toko');
    const sellerAvatar = getUserAvatar(effectiveSellerId, effectiveSellerName, 'seller');

    const buyerEmail = currentUser.email;
    const buyerName = currentUser.nama || currentUser.name || 'Pengguna';
    const targetRoomId = [buyerEmail.toLowerCase().trim(), effectiveSellerId.toLowerCase().trim()].sort().join('__');
    const initialMessage = `Halo Kak ${effectiveSellerName}, saya tertarik dan ingin bertanya mengenai produk "${productName}" apakah stoknya masih tersedia?`;
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Simpan target kontak ke localStorage agar ChatPage langsung membuka chat penjual
    localStorage.setItem('am_target_chat_contact', JSON.stringify({
      id: Date.now(),
      nama: effectiveSellerName,
      email: effectiveSellerId,
      role: 'seller',
      avatar: sellerAvatar,
      productName
    }));

    // 2. Buat & Simpan pesan langsung ke daftar obrolan lokal kedua akun
    const localMsg = {
      id: Date.now(),
      roomId: targetRoomId,
      senderId: buyerEmail,
      senderName: buyerName,
      senderRole: currentUser.role || 'buyer',
      receiverId: effectiveSellerId,
      receiverName: effectiveSellerName,
      receiverRole: 'seller',
      text: initialMessage,
      time: timeNow,
      createdAt: new Date().toISOString()
    };

    try {
      const bKey = `am_local_chats_${buyerEmail.toLowerCase().trim()}`;
      const existingB = JSON.parse(localStorage.getItem(bKey) || '[]');
      const existsB = existingB.some((c: any) => c.text === initialMessage && c.time === timeNow);
      if (!existsB) {
        existingB.push({ ...localMsg, isRead: true });
        localStorage.setItem(bKey, JSON.stringify(existingB));
      }

      const sKey = `am_local_chats_${effectiveSellerId.toLowerCase().trim()}`;
      const existingS = JSON.parse(localStorage.getItem(sKey) || '[]');
      const existsS = existingS.some((c: any) => c.text === initialMessage && c.time === timeNow);
      if (!existsS) {
        existingS.push({ ...localMsg, isRead: false });
        localStorage.setItem(sKey, JSON.stringify(existingS));
      }
    } catch (_e) {}

    // 3. Kirim ke backend jika online
    sendChatApi({
      fromId: buyerEmail,
      fromName: buyerName,
      fromRole: currentUser.role || 'buyer',
      toId: effectiveSellerId,
      toName: effectiveSellerName,
      toRole: 'seller',
      text: initialMessage
    }).catch(() => {});

    // 4. Tampilkan popup konfirmasi & langsung buka tab Obrolan
    setSuccessPopupMessage(`💬 Membuka obrolan dengan Kak ${effectiveSellerName} untuk produk "${productName}"...`);
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
    <div
      className={`am-root theme-${theme} min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col md:flex-row pt-0 m-0`}
      style={{ display: 'flex', minHeight: '100vh', background: 'var(--am-bg)', position: 'relative', paddingTop: 0, marginTop: 0 }}
    >
      <style>{customModalStyles}</style>

      {activeTab !== 'chat' && (
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
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, paddingTop: 0, marginTop: 0, height: activeTab === 'chat' ? '100vh' : undefined, maxHeight: activeTab === 'chat' ? '100vh' : undefined, overflow: activeTab === 'chat' ? 'hidden' : undefined }}>
        {activeTab !== 'chat' && (
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
        )}

        <main
          className={`am-main-content-container ${activeTab === 'chat' || isFullScreenChat ? 'chat-active pb-0 md:pb-0' : 'pb-24 md:pb-0'}`}
          style={{
            flex: 1,
            paddingBottom: activeTab === 'chat' || isFullScreenChat ? 0 : undefined,
            minHeight: activeTab === 'chat' ? '100vh' : (isFullScreenChat ? '100vh' : 'calc(100vh - 60px)'),
            height: activeTab === 'chat' ? '100vh' : undefined,
            maxHeight: activeTab === 'chat' ? '100vh' : undefined,
            overflow: activeTab === 'chat' ? 'hidden' : undefined,
            display: activeTab === 'chat' ? 'flex' : undefined,
            flexDirection: activeTab === 'chat' ? 'column' : undefined,
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <div
            key={activeTab}
            className="am-page-transition"
            style={{
              minHeight: activeTab === 'chat' ? '100%' : (isFullScreenChat ? '100vh' : 'calc(100vh - 140px)'),
              height: activeTab === 'chat' ? '100%' : undefined,
              maxHeight: activeTab === 'chat' ? '100vh' : undefined,
              flex: activeTab === 'chat' ? 1 : undefined,
              display: activeTab === 'chat' ? 'flex' : 'block',
              flexDirection: activeTab === 'chat' ? 'column' : undefined,
              overflow: activeTab === 'chat' ? 'hidden' : undefined
            }}
          >
            {activeTab === 'home' && (
              <ProductList
                theme={theme}
                campus={campus}
                cartItems={cart}
                onAddToCart={addToCart}
                onChat={handleOpenChat}
                onNavigateCheckout={() => setActiveTab('checkout')}
                onOpenVending={() => setActiveTab('vending_simulator')}
                isGuest={isGuest}
                onRequireLogin={() => setShowLoginModal(true)}
                currentUser={currentUser}
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
                  currentUser={currentUser}
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
                <StandaloneVueChat
                  theme={theme}
                  campus={campus}
                  onBack={() => setActiveTab('home')}
                  onRoomActiveChange={setIsChatRoomActive}
                />
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
                driverEmail={currentUser.email || ''}
                onNavigateTab={(targetTab) => handleSetActiveTab(targetTab as any)}
                cartItemCount={cart.reduce((acc, i) => acc + (i.quantity || 1), 0)}
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
          </div>
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
            setSuccessPopupMessage('Selamat! Akun Anda kini telah resmi di-upgrade ke Campus Mart PRO 💎');
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
            saveUserAvatarToGlobalMap(currentUser.email || currentName, currentName, currentAvatar);
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
          onLogout={isGuest ? () => setActiveTab('login_page') : handleLogout}
          isGuest={isGuest}
          onNavigateTab={(targetTab) => handleSetActiveTab(targetTab as any)}
          userRoles={currentUser.roles || [role]}
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
      {activeTab !== 'login_page' && activeTab !== 'chat' && !isFullScreenChat && (
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
        notification={activeTab === 'chat' && inAppNotification?.type !== 'order' ? null : inAppNotification}
        onDismiss={() => setInAppNotification(null)}
        onOpenSellerDashboard={() => {
          setInAppNotification(null);
          setActiveTab('seller');
        }}
        onOpenChat={(roomId, senderId) => {
          setInAppNotification(null);
          setActiveTab('chat');
          const myNorm = normalizeUserId(currentUser.email);
          const effectiveRoomId = roomId || (senderId ? buildRoomId(myNorm, normalizeUserId(senderId)) : null);
          if (effectiveRoomId) {
            localStorage.setItem('am_target_chat_room', effectiveRoomId);
            setIsChatRoomActive(true);
            window.dispatchEvent(new CustomEvent('am_open_chat_room', {
              detail: { roomId: effectiveRoomId, senderId }
            }));
          }
        }}
        currentUserId={currentUser.id || currentUser.email || 'user_active'}
        currentUserName={currentUser.nama || currentUser.name || 'Pengguna Antasari'}
        currentUserRole={role || 'buyer'}
        theme={theme}
      />

      {/* 🛠️ FLOATING DEBUG & LAPOR BUG SYSTEM (Disembunyikan khusus saat ruang chat aktif agar tidak menutupi tombol kirim) */}
      {activeTab !== 'login_page' && !isFullScreenChat && (
        <DebugSystemMenu
          theme={theme}
          userEmail={currentUser?.email}
          userName={currentUser?.nama || currentUser?.name || 'Pengguna Antasari'}
          userRole={role || 'buyer'}
          isGuest={isGuest}
        />
      )}
    </div>
  );
}
