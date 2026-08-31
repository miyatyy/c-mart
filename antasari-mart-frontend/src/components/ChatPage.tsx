import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { ThemeMode, Campus } from '../types';
import { getChatsApi, sendChatApi, getContactsApi, type BackendChatMessage } from '../lib/api';

interface ChatPageProps {
  theme: ThemeMode;
  campus: Campus;
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
  return [a, b].map(s => s.toLowerCase()).sort().join('__');
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

export default function ChatPage({ theme: _theme }: ChatPageProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [chats, setChats] = useState<BackendChatMessage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [pendingContact, setPendingContact] = useState<Contact | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [inAppToast, setInAppToast] = useState<{ title: string; desc: string } | null>(null);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const prevChatsLengthRef = useRef<number>(0);

  const getCombinedChats = (serverChats: BackendChatMessage[] = []) => {
    let localChats: BackendChatMessage[] = [];
    try {
      localChats = JSON.parse(localStorage.getItem('am_local_chats') || '[]');
    } catch (_e) {
      localChats = [];
    }
    const map = new Map<string, BackendChatMessage>();
    [...localChats, ...serverChats].forEach(c => {
      const key = `${c.senderId}_${c.receiverId}_${c.text}_${c.time}`;
      map.set(key, c);
    });
    return Array.from(map.values());
  };

  const fetchChats = async (identifier: string, isPolling = false) => {
    try {
      const data = await getChatsApi(identifier);
      const serverList = (data.success && Array.isArray(data.chats)) ? data.chats : [];
      const combined = getCombinedChats(serverList);

      if (isPolling && combined.length > prevChatsLengthRef.current) {
        const newMsg = combined[combined.length - 1];
        if (newMsg.senderId.toLowerCase() !== identifier.toLowerCase()) {
          playNotificationSound();
          setInAppToast({
            title: `💬 Pesan Baru dari ${newMsg.senderName}`,
            desc: newMsg.text
          });
          setTimeout(() => setInAppToast(null), 4000);
        }
      }

      prevChatsLengthRef.current = combined.length;
      setChats(combined);
    } catch (_e) {
      const combined = getCombinedChats([]);
      setChats(combined);
    }
  };

  const fetchContacts = async (identifier: string) => {
    try {
      const data = await getContactsApi(identifier);
      if (data.success && Array.isArray(data.contacts)) {
        setContacts(data.contacts);
      }
    } catch (e) {
      console.error('Gagal mengambil daftar kontak:', e);
    }
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('am_user_session') || localStorage.getItem('am_current_user') || '{"email": "miyya@gmail.com", "nama": "Pengguna", "role": "buyer"}');
    setCurrentUser(user);

    const identifier = user.email;
    fetchChats(identifier);
    fetchContacts(identifier);

    // Cek target kontak dari klik etalase ("Tanya Penjual")
    const targetContactStr = localStorage.getItem('am_target_chat_contact');
    if (targetContactStr) {
      try {
        const target = JSON.parse(targetContactStr);
        const rId = buildRoomId(identifier, target.email || 'seller_1');
        setActiveRoomId(rId);
        setPendingContact({
          id: target.id || Date.now(),
          nama: target.nama || 'Penjual',
          email: target.email || 'seller_1',
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

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chats, activeRoomId]);

  const rooms = useMemo(() => {
    if (!currentUser) return [];
    const myId = currentUser.email;
    const roomMap = new Map<string, RoomInfo>();

    chats.forEach(c => {
      const isSender = c.senderId.toLowerCase() === myId.toLowerCase();
      const otherId = isSender ? c.receiverId : c.senderId;
      const otherName = isSender ? c.receiverName : c.senderName;
      const otherRole = isSender ? c.receiverRole : c.senderRole;
      const rId = c.roomId || buildRoomId(myId, otherId);

      if (!roomMap.has(rId)) {
        roomMap.set(rId, {
          roomId: rId,
          otherId,
          otherName: otherName || otherId,
          otherRole: otherRole || 'buyer',
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeRoom || !currentUser) return;

    const textToSend = messageInput.trim();
    setMessageInput('');

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
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString()
    };

    try {
      const existingLocal: BackendChatMessage[] = JSON.parse(localStorage.getItem('am_local_chats') || '[]');
      existingLocal.push(newLocalMsg);
      localStorage.setItem('am_local_chats', JSON.stringify(existingLocal));
    } catch (_e) {}

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
      console.warn('Backend chat API offline, stored locally.');
    }

    if (pendingContact) setPendingContact(null);
    setActiveRoomId(activeRoom.roomId);

    // Smart simulated auto-reply from seller after 1.8 seconds
    const otherId = activeRoom.otherId;
    const otherName = activeRoom.otherName;
    const otherRole = activeRoom.otherRole;
    setTimeout(() => {
      const replyMsg: BackendChatMessage = {
        id: Date.now() + 1,
        roomId: activeRoom.roomId,
        senderId: otherId,
        senderName: otherName,
        senderRole: otherRole,
        receiverId: currentUser.email,
        receiverName: currentUser.nama || currentUser.name || 'Pengguna',
        receiverRole: currentUser.role || 'buyer',
        text: `Halo Kak ${currentUser.nama || ''}! Terima kasih sudah menghubungi kami. Pesan Anda sudah kami terima dan stok siap dipesan! 😊✨`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date().toISOString()
      };

      try {
        const localList: BackendChatMessage[] = JSON.parse(localStorage.getItem('am_local_chats') || '[]');
        localList.push(replyMsg);
        localStorage.setItem('am_local_chats', JSON.stringify(localList));
      } catch (_e) {}

      setChats(prev => [...prev, replyMsg]);
      playNotificationSound();
      setInAppToast({
        title: `💬 Balasan dari ${otherName}`,
        desc: replyMsg.text
      });
      setTimeout(() => setInAppToast(null), 4500);
    }, 1800);
  };

  const filteredContacts = contacts.filter(c =>
    c.nama.toLowerCase().includes(contactSearch.toLowerCase()) || c.email.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const hasActive = Boolean(activeRoom);

  return (
    <div className={`am-chat-app-root ${hasActive ? 'is-room-open' : 'is-room-closed'}`}>
      <style>{`
        .am-chat-app-root {
          display: flex;
          width: 100%;
          height: calc(100vh - 65px);
          height: calc(100dvh - 65px);
          background: var(--am-bg, #f8fafc);
          font-family: var(--am-font-body, system-ui, -apple-system, sans-serif);
          position: relative;
          overflow: hidden;
        }

        /* 📱 RESPONSIVE WHATSAPP / MESSENGER ENGINE */
        .am-chat-sidebar-pane {
          width: 360px;
          min-width: 320px;
          max-width: 400px;
          border-right: 1px solid var(--am-border, #e2e8f0);
          background: var(--am-surface, #ffffff);
          display: flex;
          flex-direction: column;
          height: 100%;
          z-index: 10;
        }

        .am-chat-content-pane {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--am-bg, #f1f5f9);
          position: relative;
          min-width: 0;
        }

        /* Pure CSS media query for mobile screens */
        @media screen and (max-width: 768px) {
          .am-chat-app-root.is-room-open .am-chat-sidebar-pane {
            display: none !important;
          }
          .am-chat-app-root.is-room-open .am-chat-content-pane {
            display: flex !important;
            width: 100% !important;
          }
          .am-chat-app-root.is-room-closed .am-chat-sidebar-pane {
            display: flex !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 100% !important;
            border-right: none !important;
          }
          .am-chat-app-root.is-room-closed .am-chat-content-pane {
            display: none !important;
          }
        }

        .am-chat-bubble-user {
          align-self: flex-end;
          max-width: 82%;
          padding: 10px 14px 6px;
          border-radius: 16px 16px 2px 16px;
          background: #0077B6;
          color: #ffffff;
          box-shadow: 0 1.5px 4px rgba(0, 0, 0, 0.12);
          position: relative;
          word-break: break-word;
          font-size: 13.5px;
          line-height: 1.45;
        }

        .am-chat-bubble-partner {
          align-self: flex-start;
          max-width: 82%;
          padding: 10px 14px 6px;
          border-radius: 16px 16px 16px 2px;
          background: var(--am-surface, #ffffff);
          color: var(--am-text, #1e293b);
          box-shadow: 0 1.5px 4px rgba(0, 0, 0, 0.08);
          border: 1px solid var(--am-border, #e2e8f0);
          position: relative;
          word-break: break-word;
          font-size: 13.5px;
          line-height: 1.45;
        }

        .am-chat-avatar-circle {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--am-bg2, #f1f5f9);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
          position: relative;
        }

        .am-chat-online-dot {
          position: absolute;
          bottom: 1px;
          right: 1px;
          width: 11px;
          height: 11px;
          border-radius: 50%;
          background: #22c55e;
          border: 2px solid white;
        }

        .am-chat-room-card {
          padding: 12px 16px;
          border-bottom: 1px solid var(--am-border, #f1f5f9);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: background 0.15s ease;
        }

        .am-chat-room-card:hover {
          background: var(--am-bg2, #f8fafc);
        }

        .am-chat-room-card.is-active {
          background: rgba(0, 119, 182, 0.08);
          border-left: 4px solid #0077B6;
        }
      `}</style>

      {/* Floating In-App Toast Notification */}
      {inAppToast && (
        <div style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'var(--am-surface, #ffffff)',
          color: 'var(--am-text, #1e293b)',
          padding: '12px 18px',
          borderRadius: 16,
          boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
          border: '1.5px solid #0077B6',
          zIndex: 9999,
          maxWidth: 320,
          animation: 'bounceIn 0.3s ease-out'
        }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#0077B6', marginBottom: 2 }}>{inAppToast.title}</div>
          <div style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.3 }}>{inAppToast.desc}</div>
        </div>
      )}

      {/* 📋 PANE KIRI: DAFTAR OBROLAN (WHATSAPP LIST STYLE) */}
      <div className="am-chat-sidebar-pane">
        {/* Header Daftar Obrolan */}
        <div style={{ padding: '16px', background: 'var(--am-surface, #ffffff)', borderBottom: '1px solid var(--am-border, #e2e8f0)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>💬</span>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: 'var(--am-text, #1e293b)' }}>Pesan Kampus</h3>
            </div>
            <button
              onClick={() => setShowContactPicker(p => !p)}
              style={{
                padding: '7px 14px',
                borderRadius: 20,
                border: 'none',
                background: showContactPicker ? 'var(--am-text-muted, #64748b)' : 'linear-gradient(135deg, #0077B6 0%, #0096C7 100%)',
                color: 'white',
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 119, 182, 0.25)'
              }}
            >
              {showContactPicker ? '✕ Tutup' : '+ Chat Baru'}
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder={showContactPicker ? 'Cari nama kontak tujuan...' : '🔍 Cari obrolan...'}
              value={contactSearch}
              onChange={e => setContactSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: 12,
                border: '1px solid var(--am-border, #e2e8f0)',
                fontSize: 12.5,
                boxSizing: 'border-box',
                background: 'var(--am-bg2, #f8fafc)',
                color: 'var(--am-text, #1e293b)',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* List Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {showContactPicker ? (
            /* Mode Pilih Kontak Baru */
            <div style={{ padding: '8px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', padding: '8px 10px', textTransform: 'uppercase', letterSpacing: 0.8 }}>
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
                    gap: 12,
                    background: 'var(--am-bg2, #f8fafc)',
                    transition: 'background 0.15s'
                  }}
                >
                  <div className="am-chat-avatar-circle">
                    {ROLE_EMOJI[c.role] || '👤'}
                    <span className="am-chat-online-dot"></span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--am-text, #1e293b)' }}>{c.nama}</div>
                    <div style={{ fontSize: 11, color: 'var(--am-text-muted, #64748b)' }}>
                      {ROLE_LABEL[c.role] || c.role} • {c.email}
                    </div>
                  </div>
                  <span style={{ fontSize: 14, color: '#0077B6', fontWeight: 800 }}>→</span>
                </div>
              ))}
            </div>
          ) : rooms.length === 0 ? (
            /* Riwayat Kosong */
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--am-text-muted, #64748b)' }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>💬</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--am-text, #1e293b)', marginBottom: 4 }}>Belum ada obrolan</div>
              <p style={{ fontSize: 12, margin: '0 0 16px' }}>Mulai percakapan dengan penjual atau sesama mahasiswa!</p>
              <button
                onClick={() => setShowContactPicker(true)}
                style={{
                  padding: '9px 18px',
                  borderRadius: 12,
                  border: 'none',
                  background: '#0077B6',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: 12.5,
                  cursor: 'pointer'
                }}
              >
                + Mulai Obrolan Baru
              </button>
            </div>
          ) : (
            /* Daftar Room Obrolan Aktif */
            rooms.map(r => {
              const isActive = activeRoom?.roomId === r.roomId;
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
                      <span style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--am-text, #1e293b)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.otherName}
                      </span>
                      <span style={{ fontSize: 10.5, color: '#94a3b8', flexShrink: 0 }}>
                        {lastMsg?.time || ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--am-text-muted, #64748b)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {lastMsg?.text || 'Mulai percakapan...'}
                      </span>
                      <span style={{ fontSize: 9.5, padding: '2px 6px', borderRadius: 6, background: 'var(--am-bg2, #f1f5f9)', color: '#64748b', fontWeight: 700, flexShrink: 0, marginLeft: 6 }}>
                        {ROLE_LABEL[r.otherRole] || r.otherRole}
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
              padding: '12px 16px',
              background: 'var(--am-surface, #ffffff)',
              borderBottom: '1px solid var(--am-border, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              zIndex: 20
            }}>
              {/* Back Button (Always available on mobile to return to list) */}
              <button
                onClick={() => {
                  setActiveRoomId(null);
                  setPendingContact(null);
                }}
                style={{
                  background: 'var(--am-bg2, #f1f5f9)',
                  border: '1px solid var(--am-border, #e2e8f0)',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  color: 'var(--am-text, #1e293b)',
                  cursor: 'pointer',
                  fontWeight: 900
                }}
                title="Kembali ke daftar pesan"
              >
                ←
              </button>

              <div className="am-chat-avatar-circle" style={{ width: 40, height: 40, fontSize: 20 }}>
                {ROLE_EMOJI[activeRoom.otherRole] || '👤'}
                <span className="am-chat-online-dot"></span>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 900, color: 'var(--am-text, #1e293b)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeRoom.otherName}
                </h4>
                <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>● Online</span>
                  <span style={{ color: '#94a3b8' }}>•</span>
                  <span style={{ color: '#64748b' }}>{ROLE_LABEL[activeRoom.otherRole] || activeRoom.otherRole}</span>
                </div>
              </div>
            </div>

            {/* Message Bubbles Area */}
            <div
              ref={chatScrollRef}
              style={{
                flex: 1,
                padding: '16px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                background: 'var(--am-bg, #f8fafc)'
              }}
            >
              {activeRoom.messages.length === 0 ? (
                <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--am-text-muted, #64748b)', padding: '20px' }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>👋</div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--am-text, #1e293b)' }}>Mulai Percakapan</div>
                  <p style={{ fontSize: 12, margin: '4px 0 0' }}>Kirim pesan pertamamu ke <strong>{activeRoom.otherName}</strong>!</p>
                </div>
              ) : (
                activeRoom.messages.map((m, idx) => {
                  const isMine = m.senderId.toLowerCase() === currentUser.email.toLowerCase();
                  return (
                    <div
                      key={idx}
                      className={isMine ? 'am-chat-bubble-user' : 'am-chat-bubble-partner'}
                    >
                      <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{m.text}</div>
                      <div style={{
                        fontSize: 10,
                        textAlign: 'right',
                        marginTop: 4,
                        opacity: 0.8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 3
                      }}>
                        <span>{m.time}</span>
                        {isMine && <span style={{ fontSize: 11 }}>✓✓</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* WhatsApp Style Bottom Message Input Bar */}
            <form
              onSubmit={handleSendMessage}
              style={{
                padding: '10px 14px',
                background: 'var(--am-surface, #ffffff)',
                borderTop: '1px solid var(--am-border, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                zIndex: 20
              }}
            >
              <input
                type="text"
                placeholder={`Ketik pesan untuk ${activeRoom.otherName}...`}
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: 24,
                  border: '1px solid var(--am-border, #e2e8f0)',
                  fontSize: 13.5,
                  outline: 'none',
                  background: 'var(--am-bg2, #f8fafc)',
                  color: 'var(--am-text, #1e293b)',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="submit"
                disabled={!messageInput.trim()}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  border: 'none',
                  background: messageInput.trim() ? 'linear-gradient(135deg, #0077B6 0%, #0096C7 100%)' : 'var(--am-border, #cbd5e1)',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: 16,
                  cursor: messageInput.trim() ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: messageInput.trim() ? '0 3px 10px rgba(0, 119, 182, 0.35)' : 'none',
                  flexShrink: 0,
                  transition: 'all 0.2s ease'
                }}
                title="Kirim Pesan"
              >
                ➤
              </button>
            </form>
          </>
        ) : (
          /* Desktop Standby View saat belum memilih room */
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--am-text-muted, #64748b)', padding: '30px' }}>
            <div style={{ fontSize: 54, marginBottom: 12 }}>💬</div>
            <h3 style={{ margin: '0 0 6px', fontSize: 18, color: 'var(--am-text, #1e293b)' }}>Pesan Kampus UIN Antasari</h3>
            <p style={{ fontSize: 13, margin: 0 }}>Pilih salah satu percakapan dari daftar di sebelah kiri untuk mulai mengobrol.</p>
          </div>
        )}
      </div>
    </div>
  );
}
