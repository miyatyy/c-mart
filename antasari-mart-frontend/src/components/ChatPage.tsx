import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { ThemeMode, Campus } from '../types';
import { getChatsApi, sendChatApi, getContactsApi, askSellerAIApi, type BackendChatMessage } from '../lib/api';

interface ChatPageProps {
  theme: ThemeMode;
  campus: Campus;
  onBack?: () => void;
}

interface Contact {
  id: number;
  nama: string;
  email: string;
  role: string;
}

interface RoomInfo {
  roomId: string;
  otherId: string;
  otherName: string;
  otherRole: string;
  messages: BackendChatMessage[];
}

const ROLE_LABEL: Record<string, string> = {
  buyer: 'Pembeli',
  seller: 'Penjual',
  driver: 'Driver',
  admin: 'Admin',
  super_admin: 'Super Admin',
  ai: 'Asisten AI'
};

const ROLE_EMOJI: Record<string, string> = {
  buyer: '🛍️',
  seller: '🏪',
  driver: '🛵',
  admin: '🛡️',
  super_admin: '👑',
  ai: '🌸'
};

function buildRoomId(a: string, b: string) {
  return [String(a).toLowerCase().trim(), String(b).toLowerCase().trim()].sort().join('__');
}

function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (_e) {}
}

const CLOSING_KEYWORDS = [
  'deal', 'beli sekarang', 'mau beli', 'mau pesan', 'mau order', 'order sekarang',
  'transfer', 'sudah bayar', 'sudah tf', 'nomor rekening', 'rekening',
  'bicara dengan admin', 'hubungi admin', 'admin asli', 'minta wa', 'whatsapp',
  'terima kasih', 'makasih', 'terimakasih', 'siap kak', 'oke siap', 'closing',
  'baik kak terima kasih', 'oke makasih'
];

export default function ChatPage({ theme: _theme, campus: _campus, onBack }: ChatPageProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [chats, setChats] = useState<BackendChatMessage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [pendingContact, setPendingContact] = useState<Contact | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [inAppToast, setInAppToast] = useState<{ title: string; desc: string } | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);

  // Status Handover: jika true, AI tidak lagi membalas otomatis (ditangani langsung oleh Admin Penjual)
  const [handovers, setHandovers] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('am_chat_handovers') || '{}');
    } catch (_e) {
      return {};
    }
  });

  const setRoomHandover = (roomId: string, status: boolean) => {
    setHandovers(prev => {
      const next = { ...prev, [roomId]: status };
      localStorage.setItem('am_chat_handovers', JSON.stringify(next));
      return next;
    });
  };

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const prevChatsLengthRef = useRef<number>(0);

  // Helper untuk membaca chat terisolasi per akun pengguna (tidak tercampur akun lain)
  const getScopedLocalChats = (userEmail: string): BackendChatMessage[] => {
    try {
      const cleanEmail = userEmail.toLowerCase().trim();
      return JSON.parse(localStorage.getItem(`am_local_chats_${cleanEmail}`) || '[]');
    } catch (_e) {
      return [];
    }
  };

  const saveScopedLocalChat = (userEmail: string, msg: BackendChatMessage) => {
    try {
      const cleanEmail = userEmail.toLowerCase().trim();
      const existing = getScopedLocalChats(cleanEmail);
      existing.push(msg);
      localStorage.setItem(`am_local_chats_${cleanEmail}`, JSON.stringify(existing));
    } catch (_e) {}
  };

  const fetchChats = async (identifier: string, isPolling = false) => {
    if (!identifier) return;
    try {
      const data = await getChatsApi(identifier);
      const serverList = (data.success && Array.isArray(data.chats)) ? data.chats : [];
      const localList = getScopedLocalChats(identifier);

      // Gabungkan pesan unik
      const map = new Map<string, BackendChatMessage>();
      [...serverList, ...localList].forEach(c => {
        const key = c.id ? String(c.id) : `${c.senderId}_${c.receiverId}_${c.text}_${c.time}`;
        map.set(key, c);
      });
      const combined = Array.from(map.values()).sort((a, b) => {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      });

      if (isPolling && combined.length > prevChatsLengthRef.current) {
        const newMsg = combined[combined.length - 1];
        if (newMsg && newMsg.senderId.toLowerCase() !== identifier.toLowerCase()) {
          playNotificationSound();
          setInAppToast({
            title: `💬 Pesan Baru dari ${newMsg.senderName || 'Pengirim'}`,
            desc: newMsg.text
          });
          setTimeout(() => setInAppToast(null), 4000);
        }
      }

      prevChatsLengthRef.current = combined.length;
      setChats(combined);
    } catch (_e) {
      const localList = getScopedLocalChats(identifier);
      setChats(localList);
    }
  };

  const fetchContacts = async (identifier: string) => {
    try {
      const data = await getContactsApi(identifier);
      let list = (data.success && Array.isArray(data.contacts)) ? data.contacts : [];
      
      // Pastikan ada kontak Toko Utama (Myammiy Craft)
      const hasMyammiy = list.some((c: Contact) => c.email === 'seller_1' || c.nama.toLowerCase().includes('myammiy'));
      if (!hasMyammiy) {
        list.unshift({
          id: 9999,
          nama: 'Myammiy Craft (Katalog Resmi)',
          email: 'seller_1',
          role: 'seller'
        });
      }
      setContacts(list);
    } catch (e) {
      console.error('Gagal mengambil daftar kontak:', e);
      setContacts([
        { id: 9999, nama: 'Myammiy Craft (Katalog Resmi)', email: 'seller_1', role: 'seller' }
      ]);
    }
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('am_user_session') || localStorage.getItem('am_current_user') || '{"email": "miyya@gmail.com", "nama": "Pengguna", "role": "buyer"}');
    setCurrentUser(user);

    const identifier = user.email || 'pengguna@antasari.com';
    fetchChats(identifier);
    fetchContacts(identifier);

    // Cek target kontak dari klik etalase ("Tanya Penjual")
    const targetContactStr = localStorage.getItem('am_target_chat_contact');
    if (targetContactStr) {
      try {
        const target = JSON.parse(targetContactStr);
        const targetEmail = target.email || 'seller_1';
        const rId = buildRoomId(identifier, targetEmail);
        setActiveRoomId(rId);
        setPendingContact({
          id: target.id || Date.now(),
          nama: target.nama || 'Penjual Antasari',
          email: targetEmail,
          role: target.role || 'seller'
        });
        localStorage.removeItem('am_target_chat_contact');
      } catch (_e) {}
    }

    const interval = setInterval(() => {
      fetchChats(identifier, true);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // 📱 Sinkronisasi tinggi visual viewport saat virtual keyboard HP terbuka
  useEffect(() => {
    const handleViewportResize = () => {
      if (typeof window !== 'undefined' && window.visualViewport) {
        const height = window.visualViewport.height;
        document.documentElement.style.setProperty('--am-chat-vh', `${height}px`);
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }
    };

    if (typeof window !== 'undefined' && window.visualViewport) {
      handleViewportResize();
      window.visualViewport.addEventListener('resize', handleViewportResize);
      window.visualViewport.addEventListener('scroll', handleViewportResize);
    }

    return () => {
      if (typeof window !== 'undefined' && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
        window.visualViewport.removeEventListener('scroll', handleViewportResize);
        document.documentElement.style.removeProperty('--am-chat-vh');
      }
    };
  }, [activeRoomId]);

  // Kelompokkan room berdasarkan identitas lawan bicara secara tepat & terisolasi
  const rooms = useMemo(() => {
    if (!currentUser) return [];
    const myId = String(currentUser.email).toLowerCase().trim();
    const roomMap = new Map<string, RoomInfo>();

    chats.forEach(c => {
      const senderClean = String(c.senderId).toLowerCase().trim();
      const receiverClean = String(c.receiverId).toLowerCase().trim();

      // Hanya masukkan pesan yang memang melibatkan currentUser
      if (senderClean !== myId && receiverClean !== myId) {
        return;
      }

      const isSender = senderClean === myId;
      const otherId = isSender ? c.receiverId : c.senderId;
      const otherName = isSender ? (c.receiverName || c.receiverId) : (c.senderName || c.senderId);
      const otherRole = isSender ? (c.receiverRole || 'seller') : (c.senderRole || 'buyer');
      const rId = c.roomId || buildRoomId(myId, otherId);

      if (!roomMap.has(rId)) {
        roomMap.set(rId, {
          roomId: rId,
          otherId,
          otherName: otherName || otherId,
          otherRole: otherRole || 'seller',
          messages: []
        });
      }
      roomMap.get(rId)!.messages.push(c);
    });

    return Array.from(roomMap.values());
  }, [chats, currentUser]);

  const activeRoom = useMemo(() => {
    if (pendingContact && currentUser) {
      const rId = buildRoomId(currentUser.email, pendingContact.email);
      const existing = rooms.find(r => r.roomId === rId);
      if (existing) return existing;
      return {
        roomId: rId,
        otherId: pendingContact.email,
        otherName: pendingContact.nama,
        otherRole: pendingContact.role,
        messages: []
      };
    }
    if (!activeRoomId) return null;
    return rooms.find(r => r.roomId === activeRoomId) || null;
  }, [rooms, activeRoomId, pendingContact, currentUser]);

  useEffect(() => {
    if (activeRoom) {
      document.body.classList.add('in-active-chat');
    } else {
      document.body.classList.remove('in-active-chat');
    }
    return () => {
      document.body.classList.remove('in-active-chat');
    };
  }, [activeRoom]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chats, activeRoomId, isOtherTyping]);

  const isCurrentRoomHandedOver = activeRoom ? Boolean(handovers[activeRoom.roomId]) : false;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeRoom || !currentUser) return;

    const textToSend = messageInput.trim();
    setMessageInput('');

    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newLocalMsg: BackendChatMessage = {
      id: Date.now(),
      roomId: activeRoom.roomId,
      senderId: currentUser.email,
      senderName: currentUser.nama || currentUser.name || 'Pengguna',
      senderRole: currentUser.role || 'buyer',
      receiverId: activeRoom.otherId,
      receiverName: activeRoom.otherName,
      receiverRole: activeRoom.otherRole,
      text: textToSend,
      time: timeNow,
      createdAt: new Date().toISOString()
    };

    saveScopedLocalChat(currentUser.email, newLocalMsg);
    setChats(prev => [...prev, newLocalMsg]);
    playNotificationSound();

    try {
      await sendChatApi({
        fromId: currentUser.email,
        fromName: currentUser.nama || currentUser.name || 'Pengguna',
        fromRole: currentUser.role || 'buyer',
        toId: activeRoom.otherId,
        toName: activeRoom.otherName,
        toRole: activeRoom.otherRole,
        text: textToSend
      });
    } catch (_err) {
      console.warn('Chat disimpan lokal & siap disinkronkan.');
    }

    if (pendingContact) setPendingContact(null);
    setActiveRoomId(activeRoom.roomId);

    // Jika sudah di-handover ke admin penjual, AI tidak membalas otomatis
    if (handovers[activeRoom.roomId]) {
      return;
    }

    // 🤖 Respon AI DeepSeek untuk toko seller
    const otherId = activeRoom.otherId;
    const otherName = activeRoom.otherName;
    const otherRole = activeRoom.otherRole;
    const buyerName = currentUser.nama || currentUser.name || 'Kakak';
    const lowerText = textToSend.toLowerCase();

    const isClosing = CLOSING_KEYWORDS.some(kw => lowerText.includes(kw));

    setIsOtherTyping(true);

    setTimeout(async () => {
      let aiReplyText = '';

      if (isClosing) {
        aiReplyText = `Wah, siap Kak ${buyerName}! 🌸 Percakapan ini sekarang sudah otomatis kami alihkan ke Admin Penjual ${otherName} untuk proses konfirmasi order & transaksi lebih lanjut yaa. Admin kami akan segera membalas di sini. Terima kasih banyak dan happy shopping! 🥰✨`;
        setRoomHandover(activeRoom.roomId, true);
      } else {
        try {
          const aiRes = await askSellerAIApi({
            sellerId: otherId,
            sellerName: otherName,
            sellerRole: otherRole,
            buyerName: buyerName,
            message: textToSend,
            history: activeRoom.messages
          });

          if (aiRes && aiRes.success && aiRes.reply && aiRes.reply.trim()) {
            aiReplyText = aiRes.reply.trim();
          }
        } catch (_e) {}

        if (!aiReplyText) {
          const isMyammiy = otherName.toLowerCase().includes('myammiy') || otherId.includes('seller_1');
          if (isMyammiy) {
            if (lowerText.includes('bahan') || lowerText.includes('rajut') || lowerText.includes('kawat') || lowerText.includes('pipe cleaner')) {
              aiReplyText = `Hai Kak ${buyerName}! 🌸 Untuk gantungan kunci di Myammiy Craft kami buat 100% HANDMADE DARI PIPE CLEANER (KAWAT BULU CHENILLE) premium yaa, bukan rajut! Bahannya lembut, padat, dan dibentuk sangat rapi! 🥰✨`;
            } else if (lowerText.includes('harga') || lowerText.includes('diskon') || lowerText.includes('berapa')) {
              aiReplyText = `Hai Kak ${buyerName}! 🌸 Blind Bag Keychain Mystery kami harganya Rp 35.000 (lagi diskon spesial dari harga normal Rp 40.000 lho!). Sudah dapat ganci pipe cleaner aesthetic dan siap ambil di Vending Machine! 🎁✨`;
            } else if (lowerText.includes('stok') || lowerText.includes('ready') || lowerText.includes('ada')) {
              aiReplyText = `Stok Blind Bag Keychain Pipe Cleaner kami masih ready banget Kak ${buyerName}! Boleh langsung di-checkout sebelum kehabisan yaa! 🌸🥰`;
            } else {
              aiReplyText = `Hai Kak ${buyerName}! 🌸 Selamat datang di ${otherName}. Semua produk handmade pipe cleaner & aksesoris kami siap dipesan. Ada yang mau ditanyakan seputar stok atau pemesanan? 😊✨`;
            }
          } else {
            aiReplyText = `Halo Kak ${buyerName}! Terima kasih sudah menghubungi ${otherName}. Pesan Anda sudah kami terima dan katalog produk kami siap dipesan yaa! 😊🛍️`;
          }
        }
      }

      setIsOtherTyping(false);

      if (aiReplyText) {
        const aiMsgTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const aiMsg: BackendChatMessage = {
          id: Date.now() + 1,
          roomId: activeRoom.roomId,
          senderId: otherId,
          senderName: otherName,
          senderRole: otherRole,
          receiverId: currentUser.email,
          receiverName: currentUser.nama || currentUser.name || 'Pengguna',
          receiverRole: currentUser.role || 'buyer',
          text: aiReplyText,
          time: aiMsgTime,
          createdAt: new Date().toISOString()
        };

        saveScopedLocalChat(currentUser.email, aiMsg);
        setChats(prev => [...prev, aiMsg]);
        playNotificationSound();

        try {
          await sendChatApi({
            fromId: otherId,
            fromName: otherName,
            fromRole: otherRole,
            toId: currentUser.email,
            toName: currentUser.nama || currentUser.name || 'Pengguna',
            toRole: currentUser.role || 'buyer',
            text: aiReplyText
          });
        } catch (_err) {}
      }
    }, 1200);
  };

  const filteredContacts = contacts.filter(c =>
    c.nama.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.role.toLowerCase().includes(contactSearch.toLowerCase())
  );

  return (
    <div className="am-chat-page-root">
      <style>{`
        .am-chat-page-root {
          display: flex;
          height: calc(100vh - 125px);
          min-height: 520px;
          max-width: 1200px;
          margin: 0 auto;
          background: var(--am-surface, #ffffff);
          border-radius: 18px;
          border: 1px solid var(--am-border, #e8e1d5);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
          overflow: hidden;
          position: relative;
        }

        .am-chat-sidebar-pane {
          width: 320px;
          flex-shrink: 0;
          border-right: 1px solid var(--am-border, #e8e1d5);
          background: var(--am-bg, #faf7f2);
          display: flex;
          flex-direction: column;
        }

        .am-chat-content-pane {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--am-surface, #ffffff);
          min-width: 0;
          position: relative;
        }

        body.in-active-chat .am-bottom-navbar-root {
          display: none !important;
        }
        body.in-active-chat main {
          padding-bottom: 0 !important;
        }

        @media (max-width: 768px) {
          .am-chat-page-root {
            height: var(--am-chat-vh, 100dvh);
            max-height: var(--am-chat-vh, 100dvh);
            border-radius: 0;
            border: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: auto;
            z-index: 1000;
            background: var(--am-surface, #FFFFFF);
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .am-chat-sidebar-pane {
            width: 100%;
            height: 100%;
            display: ${activeRoom ? 'none' : 'flex'};
            padding-bottom: 72px;
            box-sizing: border-box;
          }
          .am-chat-content-pane {
            width: 100%;
            height: 100%;
            max-height: 100%;
            display: ${activeRoom ? 'flex' : 'none'};
            flex-direction: column;
            overflow: hidden;
          }
        }

        /* 💬 PESAN SAYA (USER SENDER - KANAN) */
        .am-chat-msg-row-user {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 8px;
          padding: 0 4px;
        }

        .am-chat-bubble-user {
          max-width: 78%;
          padding: 10px 14px 6px 14px;
          border-radius: 18px 18px 4px 18px;
          background: #5FA874;
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(95, 168, 116, 0.25);
          word-break: break-word;
          font-size: 13.5px;
          line-height: 1.45;
        }

        .am-chat-bubble-user .am-chat-time {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.9);
          text-align: right;
          margin-top: 4px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 3px;
        }

        /* 💬 PESAN LAWAN BICARA (PARTNER - KIRI) */
        .am-chat-msg-row-partner {
          display: flex;
          justify-content: flex-start;
          align-items: flex-end;
          gap: 8px;
          margin-bottom: 8px;
          padding: 0 4px;
        }

        .am-chat-bubble-partner {
          max-width: 78%;
          padding: 10px 14px 6px 14px;
          border-radius: 18px 18px 18px 4px;
          background: var(--am-surface, #ffffff);
          color: var(--am-text, #243329);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          border: 1px solid var(--am-border, #E1ECE4);
          word-break: break-word;
          font-size: 13.5px;
          line-height: 1.45;
        }

        .am-chat-bubble-partner .am-chat-time {
          font-size: 10px;
          color: var(--am-text-muted, #8FA596);
          text-align: right;
          margin-top: 4px;
        }

        .am-chat-avatar-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--am-bg2, #F0F7F2);
          color: var(--am-primary, #5FA874);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
        }

        .am-chat-online-dot {
          position: absolute;
          bottom: 1px;
          right: 1px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--am-primary, #5FA874);
          border: 2px solid var(--am-surface, #ffffff);
        }

        .am-chat-room-card {
          padding: 12px 14px;
          border-bottom: 1px solid var(--am-border, #E1ECE4);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: background 0.15s ease;
        }

        .am-chat-room-card:hover {
          background: var(--am-bg2, #F0F7F2);
        }

        .am-chat-room-card.is-active {
          background: var(--am-primary-light, #EAF5EE);
          border-left: 4px solid var(--am-primary, #5FA874);
        }

        .am-chat-typing-bubble {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 16px 16px 16px 4px;
          background: var(--am-surface, #ffffff);
          color: var(--am-text-muted, #687D70);
          border: 1px solid var(--am-border, #E1ECE4);
          font-size: 12px;
          font-style: italic;
          margin-bottom: 8px;
          align-self: flex-start;
        }
      `}</style>

      {/* Floating In-App Toast Notification */}
      {inAppToast && (
        <div style={{
          position: 'absolute',
          top: 14,
          right: 14,
          background: 'var(--am-surface, #ffffff)',
          color: 'var(--am-text, #243329)',
          padding: '12px 18px',
          borderRadius: 14,
          boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
          border: '1.5px solid var(--am-primary, #5FA874)',
          zIndex: 9999,
          maxWidth: 320,
          animation: 'bounceIn 0.3s ease-out'
        }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--am-primary, #5FA874)', marginBottom: 2 }}>{inAppToast.title}</div>
          <div style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.3 }}>{inAppToast.desc}</div>
        </div>
      )}

      {/* 📋 PANE KIRI: DAFTAR OBROLAN (WHATSAPP LIST STYLE) */}
      <div className="am-chat-sidebar-pane">
        {/* Header Daftar Obrolan */}
        <div style={{ padding: '12px 16px', background: 'var(--am-surface, #ffffff)', borderBottom: '1px solid var(--am-border, #e8e1d5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {onBack && (
                <button
                  onClick={onBack}
                  aria-label="Kembali ke Beranda"
                  style={{
                    background: 'var(--am-primary-light, #EAF5EE)',
                    border: '1.5px solid var(--am-primary, #5FA874)',
                    borderRadius: 12,
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    color: 'var(--am-primary, #5FA874)',
                    cursor: 'pointer',
                    fontWeight: 800,
                    boxShadow: '0 2px 6px rgba(95, 168, 116, 0.15)',
                    transition: 'all 0.15s ease'
                  }}
                  title="Kembali ke Halaman Beranda"
                >
                  <span style={{ fontSize: 14 }}>←</span>
                  <span>Beranda</span>
                </button>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 18 }}>💬</span>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--am-text, #2D3748)' }}>Pesan Kampus</h3>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => {
                  const sampleNotification = {
                    id: `sim_${Date.now()}`,
                    senderId: 'seller_1',
                    senderName: 'Toko Myammiy Craft',
                    senderRole: 'seller',
                    senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MyammiyStore',
                    roomId: 'room_simulasi_myammiy',
                    text: 'Halo kak! Pesanan Ganci Rajut kawat bulu kamu sudah siap di loket, mau diantar sekarang? 🌸✨',
                    time: 'Baru saja'
                  };
                  window.dispatchEvent(new CustomEvent('am_trigger_notification', { detail: sampleNotification }));
                }}
                title="Coba simulasi pop-up notifikasi masuk dan fitur balas cepat"
                style={{
                  padding: '5px 8px',
                  borderRadius: 12,
                  border: '1px solid var(--am-primary)',
                  background: 'var(--am-primary-light, rgba(95,168,116,0.15))',
                  color: 'var(--am-primary)',
                  fontWeight: 700,
                  fontSize: 10.5,
                  cursor: 'pointer'
                }}
              >
                🔔 Tes Pop-Up
              </button>
              <button
                onClick={() => setShowContactPicker(p => !p)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 16,
                  border: 'none',
                  background: showContactPicker ? '#687D70' : 'linear-gradient(135deg, #5FA874 0%, #4D9562 100%)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 11,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(95, 168, 116, 0.25)'
                }}
              >
                {showContactPicker ? '✕ Batal' : '+ Chat Baru'}
              </button>
            </div>
          </div>

          {/* Search Box */}
          <input
            type="text"
            placeholder={showContactPicker ? 'Cari nama kontak...' : '🔍 Cari obrolan...'}
            value={contactSearch}
            onChange={e => setContactSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid var(--am-border, #e8e1d5)',
              fontSize: 12,
              boxSizing: 'border-box',
              background: 'var(--am-bg2, #f3ece2)',
              color: 'var(--am-text, #2D3748)',
              outline: 'none'
            }}
          />
        </div>

        {/* List Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {showContactPicker ? (
            /* Mode Pilih Kontak Baru */
            <div style={{ padding: '8px' }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--am-text-muted, #718096)', padding: '6px 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                PILIH KONTAK TUJUAN ({filteredContacts.length}):
              </div>
              {filteredContacts.map(c => (
                <div
                  key={c.id}
                  onClick={() => {
                    setPendingContact(c);
                    setActiveRoomId(buildRoomId(currentUser.email, c.email));
                    setShowContactPicker(false);
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    cursor: 'pointer',
                    marginBottom: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'var(--am-surface, #FFFFFF)',
                    border: '1px solid var(--am-border, #e8e1d5)',
                    transition: 'all 0.15s'
                  }}
                >
                  <div className="am-chat-avatar-circle">
                    {ROLE_EMOJI[c.role] || '👤'}
                    <span className="am-chat-online-dot"></span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--am-text, #2D3748)' }}>{c.nama}</div>
                    <div style={{ fontSize: 11, color: 'var(--am-text-muted, #718096)' }}>
                      {ROLE_LABEL[c.role] || c.role} • {c.email}
                    </div>
                  </div>
                  <span style={{ fontSize: 14, color: 'var(--am-primary, #5FA874)', fontWeight: 800 }}>→</span>
                </div>
              ))}
            </div>
          ) : rooms.length === 0 ? (
            /* Riwayat Kosong */
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--am-text-muted, #718096)' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--am-text, #2D3748)', marginBottom: 4 }}>Belum ada obrolan</div>
              <p style={{ fontSize: 11.5, margin: '0 0 16px', color: 'var(--am-text-muted)' }}>Mulai pesan dengan Penjual atau Admin!</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setShowContactPicker(true)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'var(--am-primary, #5FA874)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(95, 168, 116, 0.25)'
                  }}
                >
                  + Mulai Obrolan
                </button>
                {onBack && (
                  <button
                    onClick={onBack}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 10,
                      border: '1px solid var(--am-border, #e8e1d5)',
                      background: 'var(--am-bg2, #f3ece2)',
                      color: 'var(--am-text, #2D3748)',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    ← Kembali ke Beranda
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Daftar Room Obrolan Aktif */
            rooms.map(r => {
              const isActive = activeRoom?.roomId === r.roomId;
              const isRoomHanded = Boolean(handovers[r.roomId]);
              const lastMsg = r.messages[r.messages.length - 1];
              return (
                <div
                  key={r.roomId}
                  onClick={() => {
                    setActiveRoomId(r.roomId);
                    setPendingContact(null);
                  }}
                  className={`am-chat-room-card ${isActive ? 'is-active' : ''}`}
                >
                  <div className="am-chat-avatar-circle">
                    {ROLE_EMOJI[r.otherRole] || '👤'}
                    <span className="am-chat-online-dot"></span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--am-text, #2D3748)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.otherName}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--am-text-muted, #A0AEC0)', flexShrink: 0 }}>
                        {lastMsg?.time || ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11.5, color: 'var(--am-text-muted, #718096)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%' }}>
                        {lastMsg?.text || 'Mulai percakapan...'}
                      </span>
                      <span style={{
                        fontSize: 9,
                        padding: '1px 5px',
                        borderRadius: 6,
                        background: isRoomHanded ? 'rgba(5, 150, 105, 0.12)' : 'var(--am-primary-light, #EAF5EE)',
                        color: isRoomHanded ? '#10B981' : 'var(--am-primary, #5FA874)',
                        fontWeight: 800,
                        flexShrink: 0
                      }}>
                        {isRoomHanded ? 'Admin' : 'AI Ready'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 💬 PANE KANAN: RUANG CHAT AKTIF (WHATSAPP CONVERSATION VIEW) */}
      <div className="am-chat-content-pane">
        {activeRoom ? (
          <>
            {/* WhatsApp Styled App Bar Header */}
            <div style={{
              padding: '10px 14px',
              background: 'var(--am-surface, #ffffff)',
              borderBottom: '1px solid var(--am-border, #e8e1d5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              zIndex: 20
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                {/* Back to Chat List Button */}
                <button
                  onClick={() => {
                    setActiveRoomId(null);
                    setPendingContact(null);
                  }}
                  style={{
                    background: 'var(--am-bg2, #f3ece2)',
                    border: '1px solid var(--am-border, #e8e1d5)',
                    borderRadius: 10,
                    padding: '6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    color: 'var(--am-text, #2D3748)',
                    cursor: 'pointer',
                    fontWeight: 800,
                    flexShrink: 0
                  }}
                  title="Kembali ke daftar pesan"
                >
                  <span style={{ fontSize: 14 }}>←</span>
                  <span style={{ fontSize: 11 }}>Pesan</span>
                </button>

                <div className="am-chat-avatar-circle" style={{ width: 36, height: 36, fontSize: 16, flexShrink: 0 }}>
                  {ROLE_EMOJI[activeRoom.otherRole] || '👤'}
                  <span className="am-chat-online-dot"></span>
                </div>

                <div style={{ minWidth: 0 }}>
                  <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: 'var(--am-text, #2D3748)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeRoom.otherName}
                  </h4>
                  <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span>● Online</span>
                    <span style={{ color: 'var(--am-border)' }}>•</span>
                    <span style={{ color: isCurrentRoomHandedOver ? '#10B981' : 'var(--am-primary, #5FA874)', fontWeight: 700 }}>
                      {isCurrentRoomHandedOver ? 'Admin Penjual' : 'Asisten AI'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Action Buttons in Chat Room */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {onBack && (
                  <button
                    onClick={onBack}
                    style={{
                      padding: '5px 9px',
                      borderRadius: 10,
                      border: '1px solid var(--am-border, #e8e1d5)',
                      background: 'var(--am-bg2, #f3ece2)',
                      color: 'var(--am-text, #2D3748)',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                    title="Kembali langsung ke Beranda Utama"
                  >
                    <span>🏠</span>
                    <span>Beranda</span>
                  </button>
                )}

                {isCurrentRoomHandedOver ? (
                  <button
                    onClick={() => setRoomHandover(activeRoom.roomId, false)}
                    style={{
                      padding: '5px 8px',
                      borderRadius: 10,
                      border: '1px solid var(--am-primary, #5FA874)',
                      background: 'var(--am-primary-light, #EAF5EE)',
                      color: 'var(--am-primary, #5FA874)',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title="Aktifkan kembali asisten AI"
                  >
                    Bantuan AI
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setRoomHandover(activeRoom.roomId, true);
                      setInAppToast({
                        title: 'Dialihkan ke Admin Penjual',
                        desc: `Percakapan sekarang diteruskan langsung ke Admin ${activeRoom.otherName}.`
                      });
                    }}
                    style={{
                      padding: '5px 8px',
                      borderRadius: 10,
                      border: '1px solid #10B981',
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: '#10B981',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title="Alihkan obrolan langsung ke Admin Toko Asli"
                  >
                    Hubungi Admin
                  </button>
                )}
              </div>
            </div>

            {/* Handover Alert Ribbon */}
            {isCurrentRoomHandedOver && (
              <div style={{
                padding: '6px 14px',
                background: 'rgba(16, 185, 129, 0.12)',
                borderBottom: '1px solid rgba(16, 185, 129, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 11,
                color: '#10B981',
                fontWeight: 700
              }}>
                <span>Obrolan dialihkan ke Admin Penjual Langsung.</span>
                <span style={{ fontSize: 9.5, background: '#10B981', color: 'white', padding: '1px 6px', borderRadius: 8 }}>Live</span>
              </div>
            )}

            {/* Message Bubbles Area */}
            <div
              ref={chatScrollRef}
              style={{
                flex: 1,
                padding: '14px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--am-bg, #faf7f2)'
              }}
            >
              {activeRoom.messages.length === 0 ? (
                <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--am-text-muted, #718096)', padding: '20px' }}>
                  <div style={{ fontSize: 36, marginBottom: 6 }}>👋</div>
                  <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--am-text, #2D3748)' }}>Mulai Percakapan</div>
                  <p style={{ fontSize: 11.5, margin: '4px 0 0', color: 'var(--am-text-muted)' }}>Tanyakan stok produk atau pemesanan ke <strong>{activeRoom.otherName}</strong>!</p>
                </div>
              ) : (
                activeRoom.messages.map((m, idx) => {
                  const cleanSender = String(m.senderId).toLowerCase().trim();
                  const cleanMyId = String(currentUser.email).toLowerCase().trim();
                  const isMine = cleanSender === cleanMyId;

                  if (isMine) {
                    // 🔵 Pesan Saya (Kanan)
                    return (
                      <div key={idx} className="am-chat-msg-row-user">
                        <div className="am-chat-bubble-user">
                          <div>{m.text}</div>
                          <div className="am-chat-time">
                            <span>{m.time}</span>
                            <span style={{ fontSize: 11 }}>✓✓</span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // ⚪ Pesan Lawan Bicara (Kiri)
                  return (
                    <div key={idx} className="am-chat-msg-row-partner">
                      <div className="am-chat-avatar-circle" style={{ width: 28, height: 28, fontSize: 14 }}>
                        {ROLE_EMOJI[m.senderRole || activeRoom.otherRole] || '👤'}
                      </div>
                      <div className="am-chat-bubble-partner">
                        <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--am-primary, #5FA874)', marginBottom: 2 }}>
                          {m.senderName || activeRoom.otherName}
                        </div>
                        <div>{m.text}</div>
                        <div className="am-chat-time">{m.time}</div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing Indicator */}
              {isOtherTyping && (
                <div className="am-chat-typing-bubble">
                  <span>{activeRoom.otherName} sedang mengetik...</span>
                </div>
              )}
            </div>

            {/* WhatsApp Style Bottom Message Input Bar */}
            <form
              onSubmit={handleSendMessage}
              style={{
                flexShrink: 0,
                padding: '8px 12px',
                background: 'var(--am-surface, #FFFFFF)',
                borderTop: '1px solid var(--am-border, #e8e1d5)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 -2px 10px rgba(0,0,0,0.04)',
                boxSizing: 'border-box',
                position: 'relative',
                zIndex: 10
              }}
            >
              <input
                type="text"
                placeholder={isCurrentRoomHandedOver ? `Tulis pesan untuk Admin ${activeRoom.otherName}...` : `Tulis pesan untuk ${activeRoom.otherName}...`}
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                onFocus={() => {
                  setTimeout(() => {
                    if (typeof window !== 'undefined' && window.visualViewport) {
                      document.documentElement.style.setProperty('--am-chat-vh', `${window.visualViewport.height}px`);
                    }
                    if (chatScrollRef.current) {
                      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
                    }
                  }, 120);
                  setTimeout(() => {
                    if (chatScrollRef.current) {
                      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
                    }
                  }, 300);
                }}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: 24,
                  border: '1px solid var(--am-border, #e8e1d5)',
                  fontSize: 13.5,
                  outline: 'none',
                  background: 'var(--am-bg2, #f3ece2)',
                  color: 'var(--am-text, #2D3748)',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="submit"
                disabled={!messageInput.trim()}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  border: 'none',
                  background: messageInput.trim() ? 'var(--am-primary, #5FA874)' : 'var(--am-border, #E1ECE4)',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: 16,
                  cursor: messageInput.trim() ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: messageInput.trim() ? '0 2px 8px rgba(95, 168, 116, 0.3)' : 'none',
                  flexShrink: 0,
                  transition: 'all 0.2s ease'
                }}
                title="Kirim Pesan"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </form>
          </>
        ) : (
          /* Desktop Standby View saat belum memilih room */
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--am-text-muted, #718096)', padding: '30px' }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>💬</div>
            <h3 style={{ margin: '0 0 6px', fontSize: 17, color: 'var(--am-text, #2D3748)' }}>Pesan Kampus UIN Antasari</h3>
            <p style={{ fontSize: 12.5, margin: 0, color: 'var(--am-text-muted)' }}>Pilih salah satu obrolan dari daftar di sebelah kiri untuk mulai mengirim pesan.</p>
          </div>
        )}
      </div>
    </div>
  );
}
