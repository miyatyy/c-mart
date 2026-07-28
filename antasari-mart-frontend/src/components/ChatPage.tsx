import { useState, useEffect, useRef, useMemo } from 'react'
import Swal from 'sweetalert2'
import type { ThemeMode, Campus } from '../types'

interface ChatPageProps {
  theme: ThemeMode
  campus: Campus
}

interface ChatMessage {
  id: number
  roomId: string
  senderId: string
  senderName: string
  senderRole: string
  receiverId: string
  receiverName: string
  receiverRole: string
  text: string
  time: string
  createdAt: string
}

interface Contact {
  id: number
  nama: string
  email: string
  role: string
}

interface RoomInfo {
  roomId: string
  otherId: string
  otherName: string
  otherRole: string
  messages: ChatMessage[]
}

const ROLE_LABEL: Record<string, string> = {
  buyer: 'Pembeli',
  seller: 'Penjual',
  driver: 'Driver',
  admin: 'Admin',
}

const ROLE_EMOJI: Record<string, string> = {
  buyer: '🛍️',
  seller: '🏪',
  driver: '🛵',
  admin: '🛡️',
}

function buildRoomId(a: string, b: string) {
  return [a, b].map(s => s.toLowerCase()).sort().join('__')
}

export default function ChatPage({ theme: _theme }: ChatPageProps) {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [chats, setChats] = useState<ChatMessage[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)
  const [pendingContact, setPendingContact] = useState<Contact | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [showContactPicker, setShowContactPicker] = useState(false)
  const [contactSearch, setContactSearch] = useState('')

  const chatScrollRef = useRef<HTMLDivElement>(null)
  const apiBase = `http://${window.location.hostname}:5000`
  
  // 💡 Menyimpan jumlah pesan terakhir untuk memicu notifikasi browser saat ada pesan baru
  const prevChatsLengthRef = useRef<number>(0)

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('am_current_user') || '{"email": "miyya@gmail.com", "nama": "Miyatul", "role": "buyer"}')
    setCurrentUser(user)

    const identifier = user.email
    fetchChats(identifier)
    fetchContacts(identifier)

    // 💡 Meminta izin notifikasi browser Chrome saat halaman chat dibuka
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission()
    }

    const interval = setInterval(() => {
      fetchChats(identifier, true)
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chats, activeRoomId])

  async function fetchChats(identifier: string, isBackground = false) {
    try {
      const res = await fetch(`${apiBase}/api/chats/${identifier}`)
      const data = await res.json()
      if (data.success && data.chats) {
        // 💡 Cek apakah ada pesan masuk baru dari orang lain untuk memicu notifikasi Chrome
        if (isBackground && data.chats.length > prevChatsLengthRef.current) {
          const latestMsg = data.chats[data.chats.length - 1]
          if (latestMsg.senderId !== identifier) {
            triggerBrowserNotification(latestMsg.senderName, latestMsg.text)
          }
        }
        prevChatsLengthRef.current = data.chats.length
        setChats(data.chats)
      }
      if (!isBackground) setLoading(false)
    } catch (err) {
      console.error('Gagal mengambil data chat:', err)
      if (!isBackground) setLoading(false)
    }
  }

  // 💡 Fungsi memunculkan pop-up notifikasi di pojok kanan bawah Chrome
  function triggerBrowserNotification(senderName: string, text: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`💬 Pesan Baru dari ${senderName}`, {
        body: text,
        icon: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AntasariMart&backgroundColor=00b4d8'
      })
    }
  }

  async function fetchContacts(identifier: string) {
    try {
      const res = await fetch(`${apiBase}/api/users/contacts/${identifier}`)
      const data = await res.json()
      if (data.success && data.contacts) {
        setContacts(data.contacts)
      }
    } catch (err) {
      console.error('Gagal mengambil daftar kontak:', err)
    }
  }

  const chatRooms: RoomInfo[] = useMemo(() => {
    if (!currentUser) return []
    const me = currentUser.email
    const map: Record<string, RoomInfo> = {}

    chats.forEach(msg => {
      const isMeSender = msg.senderId === me
      const otherId = isMeSender ? msg.receiverId : msg.senderId
      const otherName = isMeSender ? msg.receiverName : msg.senderName
      const otherRole = isMeSender ? msg.receiverRole : msg.senderRole

      if (!map[msg.roomId]) {
        map[msg.roomId] = { roomId: msg.roomId, otherId, otherName, otherRole, messages: [] }
      }
      map[msg.roomId].messages.push(msg)
    })

    return Object.values(map).sort((a, b) => {
      const lastA = a.messages[a.messages.length - 1]
      const lastB = b.messages[b.messages.length - 1]
      return new Date(lastA?.createdAt).getTime() - new Date(lastB?.createdAt).getTime()
    })
  }, [chats, currentUser])

  const activeRoom: RoomInfo | null = useMemo(() => {
    if (pendingContact) {
      return {
        roomId: buildRoomId(currentUser?.email || '', pendingContact.email),
        otherId: pendingContact.email,
        otherName: pendingContact.nama,
        otherRole: pendingContact.role,
        messages: [],
      }
    }
    return chatRooms.find(r => r.roomId === activeRoomId) || null
  }, [chatRooms, activeRoomId, pendingContact, currentUser])

  function openRoom(room: RoomInfo) {
    setPendingContact(null)
    setActiveRoomId(room.roomId)
  }

  function openContact(contact: Contact) {
    const existing = chatRooms.find(r => r.otherId === contact.email)
    if (existing) {
      openRoom(existing)
    } else {
      setActiveRoomId(null)
      setPendingContact(contact)
    }
    setShowContactPicker(false)
    setContactSearch('')
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!messageInput.trim() || !activeRoom || !currentUser) return

    const payload = {
      fromId: currentUser.email,
      fromName: currentUser.nama || currentUser.name || currentUser.email,
      fromRole: currentUser.role || 'buyer',
      toId: activeRoom.otherId,
      toName: activeRoom.otherName,
      toRole: activeRoom.otherRole,
      text: messageInput.trim(),
    }

    try {
      const res = await fetch(`${apiBase}/api/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success && data.chat) {
        setMessageInput('')
        setChats(prev => [...prev, data.chat])
        prevChatsLengthRef.current = prevChatsLengthRef.current + 1
        setPendingContact(null)
        setActiveRoomId(data.chat.roomId)
      }
    } catch (err) {
      console.error('Gagal mengirim pesan:', err)
    }
  }

  async function handleDeleteMessage(chatId: number) {
    const result = await Swal.fire({
      title: 'Hapus Pesan?',
      text: "Pesan yang dihapus tidak dapat dikembalikan lagi.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      background: '#ffffff',
      color: '#333333',
    })

    if (!result.isConfirmed) return

    try {
      const res = await fetch(`${apiBase}/api/chats/${chatId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setChats(prev => prev.filter(c => c.id !== chatId))
        prevChatsLengthRef.current = Math.max(0, prevChatsLengthRef.current - 1)
        
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Pesan berhasil dihapus',
          showConfirmButton: false,
          timer: 1500,
          timerProgressBar: true
        })
      }
    } catch (err) {
      console.error('Gagal menghapus pesan:', err)
    }
  }

  const filteredContacts = contacts.filter(c =>
    !contactSearch.trim() ||
    c.nama.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(contactSearch.toLowerCase()) ||
    (ROLE_LABEL[c.role] || c.role).toLowerCase().includes(contactSearch.toLowerCase())
  )

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--am-text-muted)' }}>Memuat obrolan...</div>
  }

  return (
    <div style={{ padding: '16px', maxWidth: 900, margin: '0 auto', fontFamily: 'var(--am-font-body)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--am-text)', margin: 0 }}>
          💬 Ruang Obrolan
        </h2>
        <button
          onClick={() => setShowContactPicker(true)}
          className="am-btn-primary"
          style={{ padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}
        >
          + Obrolan Baru
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', background: 'var(--am-surface)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--am-border)', minHeight: 500, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>

        {/* Daftar Obrolan (Kiri) */}
        <div style={{ borderRight: '1px solid var(--am-border)', background: 'var(--am-bg2)', overflowY: 'auto' }}>
          <div style={{ padding: 14, fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)', borderBottom: '1px solid var(--am-border)' }}>
            DAFTAR OBROLAN ({chatRooms.length})
          </div>
          {chatRooms.length === 0 && !pendingContact && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--am-text-muted)', fontSize: 12 }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>📭</div>
              Belum ada obrolan.<br />Tekan "+ Obrolan Baru" untuk mulai chat dengan penjual, pembeli, driver, atau admin.
            </div>
          )}
          {chatRooms.map(room => {
            const lastMsg = room.messages[room.messages.length - 1]
            const isSelected = !pendingContact && room.roomId === activeRoom?.roomId
            return (
              <div
                key={room.roomId}
                onClick={() => openRoom(room)}
                style={{
                  padding: '12px 14px', borderBottom: '1px solid var(--am-border)', cursor: 'pointer',
                  background: isSelected ? 'rgba(0,180,216,0.1)' : 'transparent',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ROLE_EMOJI[room.otherRole] || '👤'} {room.otherName}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--am-text-muted)', flexShrink: 0 }}>{lastMsg?.time}</span>
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--am-primary)', marginBottom: 2 }}>
                  {ROLE_LABEL[room.otherRole] || room.otherRole}
                </div>
                <div style={{ fontSize: 12, color: 'var(--am-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {lastMsg?.senderId === currentUser?.email ? 'Anda: ' : ''}{lastMsg?.text}
                </div>
              </div>
            )
          })}
          {pendingContact && (
            <div style={{ padding: '12px 14px', background: 'rgba(0,180,216,0.1)', borderBottom: '1px solid var(--am-border)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)' }}>
                {ROLE_EMOJI[pendingContact.role] || '👤'} {pendingContact.nama}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--am-primary)' }}>
                {ROLE_LABEL[pendingContact.role] || pendingContact.role} · Obrolan baru
              </div>
            </div>
          )}
        </div>

        {/* Jendela Chat Aktif (Kanan) */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--am-surface)' }}>
          {activeRoom ? (
            <>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--am-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--am-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {ROLE_EMOJI[activeRoom.otherRole] || '👤'}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--am-text)' }}>
                    {activeRoom.otherName}
                  </div>
                  <div style={{ fontSize: 11, color: '#16A34A' }}>
                    ● {ROLE_LABEL[activeRoom.otherRole] || activeRoom.otherRole} · Real-Time
                  </div>
                </div>
              </div>

              {/* Area Bubble Pesan */}
              <div ref={chatScrollRef} style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 380 }}>
                {activeRoom.messages.length === 0 && (
                  <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--am-text-muted)', fontSize: 13 }}>
                    Belum ada pesan. Kirim pesan pertama ke {activeRoom.otherName} 👋
                  </div>
                )}
                {activeRoom.messages.map((msg: ChatMessage) => {
                  const isMe = msg.senderId === currentUser?.email

                  return (
                    <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', position: 'relative' }}>
                      <div style={{
                        padding: '10px 14px', borderRadius: 14, fontSize: 13, lineHeight: 1.4,
                        background: isMe ? 'var(--am-primary)' : 'var(--am-bg2)',
                        color: isMe ? 'white' : 'var(--am-text)',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
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
                          background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, opacity: 0.6,
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Form Kirim Pesan */}
              <form onSubmit={handleSendMessage} style={{ padding: '12px 16px', borderTop: '1px solid var(--am-border)', display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="am-input"
                  placeholder={`Tulis pesan untuk ${activeRoom.otherName}...`}
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  style={{ flex: '1', padding: '10px 14px', fontSize: 13, borderRadius: 999 }}
                />
                <button
                  type="submit"
                  className="am-btn-primary"
                  style={{ padding: '10px 20px', borderRadius: 999, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}
                >
                  Kirim 🚀
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--am-text-muted)', gap: 10 }}>
              <div style={{ fontSize: 40 }}>💬</div>
              <div>Pilih obrolan di sebelah kiri, atau mulai obrolan baru.</div>
            </div>
          )}
        </div>

      </div>

      {showContactPicker && (
        <div
          onClick={() => setShowContactPicker(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="am-card"
            style={{ width: '100%', maxWidth: 420, maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: 'var(--am-surface)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}
          >
            <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--am-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--am-text)' }}>Pilih Kontak</h3>
                <button onClick={() => setShowContactPicker(false)} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: 'var(--am-text-muted)' }}>✕</button>
              </div>
              <input
                className="am-input"
                placeholder="Cari nama, email, atau role (penjual/driver/admin)..."
                value={contactSearch}
                onChange={e => setContactSearch(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', fontSize: 13, borderRadius: 10 }}
                autoFocus
              />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredContacts.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--am-text-muted)', fontSize: 13 }}>
                  Tidak ada kontak ditemukan.
                </div>
              )}
              {filteredContacts.map(contact => (
                <div
                  key={contact.email}
                  onClick={() => openContact(contact)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', cursor: 'pointer', borderBottom: '1px solid var(--am-border)' }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--am-bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {ROLE_EMOJI[contact.role] || '👤'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {contact.nama}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>
                      {ROLE_LABEL[contact.role] || contact.role} · {contact.email}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}