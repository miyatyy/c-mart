import { useState, useEffect, useRef, useMemo } from 'react';
import Swal from 'sweetalert2';
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
  super_admin: 'Super Admin'
};

const ROLE_EMOJI: Record<string, string> = {
  buyer: '🛍️',
  seller: '🏪',
  driver: '🛵',
  admin: '🛡️',
  super_admin: '👑'
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
  const [_loading, setLoading] = useState(true);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [filterRole, _setFilterRole] = useState<string>('all');
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

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Pesan Baru dari ${newMsg.senderName}`, {
              body: newMsg.text,
              icon: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MayaSmile'
            });
          }
        }
      }

      prevChatsLengthRef.current = combined.length;
      setChats(combined);
    } catch (e) {
      const combined = getCombinedChats([]);
      setChats(combined);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async (identifier: string) => {
    try {
      const data = await getContactsApi(identifier);
      if (data.success && Array.isArray(data.contacts)) {
        setContacts(data.contacts);
      }
    } catch (e) {
      console.error("Gagal mengambil daftar kontak:", e);
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

    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
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
    return rooms.find(r => r.roomId === activeRoomId) || rooms[0] || null;
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

    // Save to local storage cache
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
      console.warn("Backend chat API offline, stored locally.");
    }

    if (pendingContact) setPendingContact(null);
    setActiveRoomId(activeRoom.roomId);

    // Smart simulated auto-reply from seller after 2 seconds
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
    }, 2000);
  };

  const filteredContacts = contacts.filter(c =>
    (filterRole === 'all' || c.role === filterRole) &&
    (c.nama.toLowerCase().includes(contactSearch.toLowerCase()) || c.email.toLowerCase().includes(contactSearch.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 70px)', background: 'var(--am-bg)', fontFamily: 'var(--am-font-body)', position: 'relative' }}>
      {inAppToast && (
        <div style={{
          position: 'absolute',
          top: 16,
          right: 20,
          background: 'var(--am-surface)',
          color: 'var(--am-text)',
          padding: '14px 20px',
          borderRadius: 16,
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          border: '1.5px solid var(--am-primary)',
          zIndex: 9999,
          maxWidth: 340
        }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--am-primary)', marginBottom: 4 }}>{inAppToast.title}</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>{inAppToast.desc}</div>
        </div>
      )}

      {/* Sidebar Daftar Chat / Kontak */}
      <div style={{ width: 320, borderRight: '1px solid var(--am-border)', background: 'var(--am-surface)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--am-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--am-text)' }}>💬 Obrolan Kampus</h3>
            <button
              onClick={() => setShowContactPicker(p => !p)}
              style={{ padding: '6px 12px', borderRadius: 10, border: 'none', background: 'var(--am-primary)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
            >
              + Chat Baru
            </button>
          </div>

          {showContactPicker && (
            <input
              type="text"
              placeholder="Cari nama kontak / role..."
              value={contactSearch}
              onChange={e => setContactSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--am-border)', fontSize: 12, boxSizing: 'border-box' }}
            />
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {showContactPicker ? (
            <div style={{ padding: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--am-text-muted)', padding: '6px 8px' }}>PILIH KONTAK TUJUAN:</div>
              {filteredContacts.map(c => (
                <div
                  key={c.id}
                  onClick={() => {
                    setPendingContact(c);
                    setActiveRoomId(buildRoomId(currentUser.email, c.email));
                    setShowContactPicker(false);
                  }}
                  style={{ padding: '10px', borderRadius: 10, cursor: 'pointer', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--am-bg2)' }}
                >
                  <div style={{ fontSize: 20 }}>{ROLE_EMOJI[c.role] || '👤'}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--am-text)' }}>{c.nama}</div>
                    <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>{ROLE_LABEL[c.role] || c.role} • {c.email}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--am-text-muted)', fontSize: 13 }}>
              Belum ada riwayat pesan.<br />Klik <strong>+ Chat Baru</strong> untuk memulai obrolan.
            </div>
          ) : (
            rooms.map(r => {
              const isActive = activeRoom?.roomId === r.roomId;
              const lastMsg = r.messages[r.messages.length - 1];
              return (
                <div
                  key={r.roomId}
                  onClick={() => { setActiveRoomId(r.roomId); setPendingContact(null); }}
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid var(--am-border)',
                    cursor: 'pointer',
                    background: isActive ? 'rgba(0, 180, 216, 0.1)' : 'transparent',
                    borderLeft: isActive ? '4px solid var(--am-primary)' : '4px solid transparent'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--am-text)' }}>
                      {ROLE_EMOJI[r.otherRole] || '👤'} {r.otherName}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--am-text-muted)' }}>{lastMsg?.time}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--am-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {lastMsg?.text || 'Mulai percakapan...'}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat View */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--am-bg)' }}>
        {activeRoom ? (
          <>
            {/* Header Chat */}
            <div style={{ padding: '14px 20px', background: 'var(--am-surface)', borderBottom: '1px solid var(--am-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 24 }}>{ROLE_EMOJI[activeRoom.otherRole] || '👤'}</div>
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--am-text)' }}>{activeRoom.otherName}</h4>
                <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>{ROLE_LABEL[activeRoom.otherRole] || activeRoom.otherRole} • {activeRoom.otherId}</div>
              </div>
            </div>

            {/* Bubble Chat List */}
            <div ref={chatScrollRef} style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeRoom.messages.length === 0 ? (
                <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--am-text-muted)', fontSize: 13 }}>
                  Kirim pesan pertama Anda ke <strong>{activeRoom.otherName}</strong>! 👋
                </div>
              ) : (
                activeRoom.messages.map((m, idx) => {
                  const isMine = m.senderId.toLowerCase() === currentUser.email.toLowerCase();
                  return (
                    <div
                      key={idx}
                      style={{
                        alignSelf: isMine ? 'flex-end' : 'flex-start',
                        maxWidth: '70%',
                        padding: '10px 14px',
                        borderRadius: isMine ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                        background: isMine ? 'var(--am-primary)' : 'var(--am-surface)',
                        color: isMine ? 'white' : 'var(--am-text)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                        border: isMine ? 'none' : '1px solid var(--am-border)'
                      }}
                    >
                      <div style={{ fontSize: 13, lineHeight: 1.4 }}>{m.text}</div>
                      <div style={{ fontSize: 10, textAlign: 'right', marginTop: 4, opacity: 0.75 }}>{m.time}</div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Form Kirim Pesan */}
            <form onSubmit={handleSendMessage} style={{ padding: '14px 20px', background: 'var(--am-surface)', borderTop: '1px solid var(--am-border)', display: 'flex', gap: 10 }}>
              <input
                type="text"
                placeholder={`Tulis pesan untuk ${activeRoom.otherName}...`}
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: '1px solid var(--am-border)', fontSize: 13, outline: 'none', background: 'var(--am-bg)', color: 'var(--am-text)' }}
              />
              <button
                type="submit"
                style={{ padding: '0 20px', borderRadius: 12, border: 'none', background: 'var(--am-primary)', color: 'white', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
              >
                Kirim 🚀
              </button>
            </form>
          </>
        ) : (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--am-text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>💬</div>
            <h3>Pilih obrolan dari daftar untuk mulai berbalas pesan</h3>
          </div>
        )}
      </div>
    </div>
  );
}
