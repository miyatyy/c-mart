import { useState, useEffect, useRef } from 'react'
import type { ThemeMode, Campus } from '../types'

interface ChatPageProps {
  theme: ThemeMode
  campus: Campus
}

interface ChatMessage {
  id: number
  roomId: string
  sellerId: string
  sellerName: string
  buyerEmail: string
  buyerName: string
  senderId: string
  text: string
  time: string
  createdAt: string
}

export default function ChatPage({ theme: _theme }: ChatPageProps) {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [chats, setChats] = useState<ChatMessage[]>([])
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [loading, setLoading] = useState(true)
  
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('am_current_user') || '{"email": "miyya@gmail.com", "nama": "Miyatul", "role": "buyer"}');
    setCurrentUser(user);
    
    const identifier = user.role === 'seller' || user.role?.includes('admin') ? (user.id || user.email || 'seller_1') : user.email;
    fetchChats(identifier);

    const interval = setInterval(() => {
      fetchChats(identifier, true);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chats, activeRoomId]);

  async function fetchChats(identifier: string, isBackground = false) {
    try {
      const res = await fetch(`http://${window.location.hostname}:3000/api/chats/${identifier}`);
      const data = await res.json();
      if (data.success && data.chats) {
        setChats(data.chats);
        setActiveRoomId(currentActive => {
          if (!currentActive && data.chats.length > 0) {
            return data.chats[data.chats.length - 1].roomId;
          }
          return currentActive;
        });
      }
      if (!isBackground) setLoading(false);
    } catch (err) {
      console.error("Gagal mengambil data chat:", err);
      if (!isBackground) setLoading(false);
    }
  }

  // Kelompokkan pesan berdasarkan roomId
  const roomsMap = chats.reduce((acc: any, chat: ChatMessage) => {
    if (!acc[chat.roomId]) {
      acc[chat.roomId] = {
        roomId: chat.roomId,
        sellerId: chat.sellerId,
        sellerName: chat.sellerName,
        buyerEmail: chat.buyerEmail,
        buyerName: chat.buyerName,
        messages: []
      };
    }
    acc[chat.roomId].messages.push(chat);
    return acc;
  }, {});

  const chatRooms = Object.values(roomsMap);
  const activeRoom: any = chatRooms.find((r: any) => r.roomId === activeRoomId) || chatRooms[0];

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageInput.trim() || !activeRoom || !currentUser) return;

    // 💡 KUNCI UTAMA SAAT KIRIM:
    // Gunakan email akun yang sedang aktif login di browser sebagai senderId
    const senderId = currentUser.email;

    const payload = {
      roomId: activeRoom.roomId,
      sellerId: activeRoom.sellerId,
      sellerName: activeRoom.sellerName,
      buyerEmail: activeRoom.buyerEmail,
      buyerName: activeRoom.buyerName,
      senderId: senderId,
      text: messageInput.trim()
    };

    try {
      const res = await fetch(`http://${window.location.hostname}:3000/api/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.chat) {
        setMessageInput('');
        setChats(prev => [...prev, data.chat]);
      }
    } catch (err) {
      console.error("Gagal mengirim pesan:", err);
    }
  }

  async function handleDeleteMessage(chatId: number) {
    if (!confirm("Hapus pesan ini?")) return;
    try {
      const res = await fetch(`http://${window.location.hostname}:3000/api/chats/${chatId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setChats(prev => prev.filter(c => c.id !== chatId));
      }
    } catch (err) {
      console.error("Gagal menghapus pesan:", err);
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--am-text-muted)' }}>Memuat obrolan...</div>;
  }

  return (
    <div style={{ padding: '16px', maxWidth: 900, margin: '0 auto', fontFamily: 'var(--am-font-body)' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--am-text)', marginBottom: 16 }}>
        💬 Ruang Obrolan Interaktif Real-Time
      </h2>

      {chatRooms.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', background: 'var(--am-surface)', borderRadius: 16, border: '1px solid var(--am-border)' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📭</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--am-text)' }}>Belum ada obrolan aktif</div>
          <p style={{ fontSize: 13, color: 'var(--am-text-muted)', marginTop: 4 }}>
            Pesan dari pembeli akan muncul otomatis di sini.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', background: 'var(--am-surface)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--am-border)', minHeight: 500, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
          
          {/* Daftar Obrolan (Kiri) */}
          <div style={{ borderRight: '1px solid var(--am-border)', background: 'var(--am-bg2)', overflowY: 'auto' }}>
            <div style={{ padding: 14, fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)', borderBottom: '1px solid var(--am-border)' }}>
              DAFTAR OBROLAN ({chatRooms.length})
            </div>
            {chatRooms.map((room: any) => {
              const lastMsg = room.messages[room.messages.length - 1];
              const isSelected = room.roomId === activeRoom?.roomId;
              const displayName = currentUser?.role === 'seller' || currentUser?.role?.includes('admin') ? room.buyerName : room.sellerName;
              return (
                <div
                  key={room.roomId}
                  onClick={() => setActiveRoomId(room.roomId)}
                  style={{
                    padding: '12px 14px', borderBottom: '1px solid var(--am-border)', cursor: 'pointer',
                    background: isSelected ? 'rgba(0,180,216,0.1)' : 'transparent',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)' }}>{displayName}</span>
                    <span style={{ fontSize: 10, color: 'var(--am-text-muted)' }}>{lastMsg?.time}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--am-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {lastMsg?.text}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Jendela Chat Aktif (Kanan) */}
          <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--am-surface)' }}>
            {activeRoom ? (
              <>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--am-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--am-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    💬
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--am-text)' }}>
                      {currentUser?.role === 'seller' || currentUser?.role?.includes('admin') ? activeRoom.buyerName : activeRoom.sellerName}
                    </div>
                    <div style={{ fontSize: 11, color: '#16A34A' }}>● Real-Time Database Aktif</div>
                  </div>
                </div>

                {/* Area Bubble Pesan */}
                <div ref={chatScrollRef} style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 380 }}>
                  {activeRoom.messages.map((msg: ChatMessage) => {
                    // 💡 LOGIKA WHATSAPP MURNI & AKURAT:
                    // Apakah pengirim pesan ini (msg.senderId) adalah email akun yang sedang login saat ini?
                    // Jika YA -> Posisi di KANAN (isMe = true).
                    // Jika TIDAK -> Posisi di KIRI (isMe = false).
                    const isMe = msg.senderId === currentUser?.email;

                    return (
                      <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', position: 'relative' }}>
                        <div style={{
                          padding: '10px 14px', borderRadius: 14, fontSize: 13, lineHeight: 1.4,
                          // Pesan KITA di KANAN (hijau), pesan LAWAN BICARA di KIRI (abu-abu)
                          background: isMe ? 'var(--am-primary)' : 'var(--am-bg2)',
                          color: isMe ? 'white' : 'var(--am-text)',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.03)'
                        }}>
                          {msg.text}
                          <div style={{ fontSize: 9, textAlign: 'right', marginTop: 4, opacity: 0.8 }}>
                            {msg.time}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          title="Hapus pesan"
                          style={{
                            position: 'absolute', top: 2, [isMe ? 'left' : 'right']: -22,
                            background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, opacity: 0.6
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Form Kirim Pesan */}
                <form onSubmit={handleSendMessage} style={{ padding: '12px 16px', borderTop: '1px solid var(--am-border)', display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    className="am-input"
                    placeholder="Tulis pesan..."
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                    style={{ flex: '1', padding: '10px 14px', fontSize: 13, borderRadius: 999 }}
                  />
                  <button
                    type="submit"
                    className="am-btn-primary"
                    style={{ padding: '10px 20px', borderRadius: 999, fontSize: 13, fontWeight: 700 }}
                  >
                    Kirim 🚀
                  </button>
                </form>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--am-text-muted)' }}>
                Pilih obrolan di sebelah kiri.
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}