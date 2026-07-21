import { useState, useEffect, useRef } from 'react'
import type { ThemeMode, ChatRoom, ChatMessage } from '../types'
import { MOCK_CHAT_ROOMS } from '../data'

interface ChatViewProps {
  theme: ThemeMode
  currentUserId: string
  currentUserName: string
  initialRoom?: string
}

export default function ChatView({ theme, currentUserId, currentUserName, initialRoom }: ChatViewProps) {
  const [rooms, setRooms] = useState<ChatRoom[]>(MOCK_CHAT_ROOMS)
  const [activeRoomId, setActiveRoomId] = useState<string | null>(initialRoom || null)
  const [message, setMessage] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const isAesthetic = theme === 'aesthetic'

  const activeRoom = rooms.find(r => r.id === activeRoomId) || null

  useEffect(() => {
    if (initialRoom) setActiveRoomId(initialRoom)
  }, [initialRoom])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeRoom?.messages.length])

  function sendMessage() {
    if (!message.trim() || !activeRoomId) return
    const newMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      senderId: currentUserId,
      senderName: currentUserName,
      content: message.trim(),
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    }
    setRooms(prev => prev.map(r =>
      r.id === activeRoomId
        ? { ...r, messages: [...r.messages, newMsg], lastMessage: newMsg.content, lastTime: newMsg.timestamp, unread: 0 }
        : r
    ))
    setMessage('')
  }

  const otherParticipant = (room: ChatRoom) =>
    room.participants.find(p => p.id !== currentUserId) || room.participants[0]

  // Mobile: show either list or chat
  const showList = !activeRoomId

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 110px)', overflow: 'hidden' }}>
      {/* Room list — hidden on mobile when a room is active */}
      <div style={{
        width: activeRoomId ? 0 : '100%',
        flexShrink: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        borderRight: `1px solid var(--am-border)`,
        transition: 'width 0.3s',
      }}>
        <div style={{ padding: '16px 16px 8px' }}>
          <h2 className="am-heading" style={{ margin: '0 0 12px', fontSize: 18, color: 'var(--am-text)' }}>💬 Pesan</h2>
        </div>
        {rooms.map(room => {
          const other = otherParticipant(room)
          return (
            <div
              key={room.id}
              onClick={() => {
                setActiveRoomId(room.id)
                setRooms(prev => prev.map(r => r.id === room.id ? { ...r, unread: 0 } : r))
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                cursor: 'pointer', borderBottom: '1px solid var(--am-border)',
                background: activeRoomId === room.id ? 'rgba(122,158,126,0.08)' : 'transparent',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img src={other.avatar} alt={other.name} style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover' }} />
                {room.unread > 0 && (
                  <span style={{
                    position: 'absolute', top: -2, right: -2, background: '#EF4444', color: 'white',
                    borderRadius: 999, fontSize: 9, fontWeight: 700, padding: '1px 5px', minWidth: 16, textAlign: 'center',
                  }}>{room.unread}</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)' }}>{other.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--am-text-muted)' }}>{room.lastTime}</span>
                </div>
                {room.productName && (
                  <div style={{ fontSize: 10, color: 'var(--am-primary)', marginBottom: 1, fontWeight: 600 }}>
                    📦 {room.productName}
                  </div>
                )}
                <div style={{ fontSize: 12, color: 'var(--am-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {room.lastMessage}
                </div>
              </div>
            </div>
          )
        })}

        {rooms.length === 0 && (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--am-text-muted)' }}>
            <div style={{ fontSize: 40 }}>💬</div>
            <div style={{ marginTop: 8, fontSize: 14 }}>Belum ada percakapan</div>
          </div>
        )}
      </div>

      {/* Chat area */}
      {activeRoom && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Chat header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
            borderBottom: '1px solid var(--am-border)', background: 'var(--am-surface)',
            flexShrink: 0,
          }}>
            <button
              onClick={() => setActiveRoomId(null)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 20, color: 'var(--am-text)', padding: 0 }}
            >←</button>
            <img
              src={otherParticipant(activeRoom).avatar}
              alt=""
              style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }}
            />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--am-text)' }}>{otherParticipant(activeRoom).name}</div>
              {activeRoom.productName && (
                <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>re: {activeRoom.productName}</div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }} className="scroll-hide">
            {activeRoom.messages.map(msg => {
              const isMine = msg.senderId === currentUserId
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '75%',
                    padding: '10px 14px',
                    borderRadius: isMine
                      ? isAesthetic ? '20px 20px 4px 20px' : '8px 8px 2px 8px'
                      : isAesthetic ? '20px 20px 20px 4px' : '8px 8px 8px 2px',
                    background: isMine ? 'var(--am-primary)' : 'var(--am-surface)',
                    border: isMine ? 'none' : '1px solid var(--am-border)',
                    boxShadow: isMine ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                  }}>
                    <div style={{ fontSize: 14, color: isMine ? 'white' : 'var(--am-text)', lineHeight: 1.5 }}>
                      {msg.content}
                    </div>
                    <div style={{ fontSize: 10, color: isMine ? 'rgba(255,255,255,0.7)' : 'var(--am-text-muted)', marginTop: 4, textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 3 }}>
                      {msg.timestamp}
                      {isMine && (
                        <span style={{ fontSize: 11 }}>
                          {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px',
            borderTop: '1px solid var(--am-border)',
            display: 'flex', gap: 8, alignItems: 'flex-end',
            background: 'var(--am-surface)', flexShrink: 0,
          }}>
            <input
              className="am-input"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Ketik pesan..."
              style={{ flex: 1, padding: '10px 14px', fontSize: 14, borderRadius: 999 }}
            />
            <button
              className="am-btn-primary"
              style={{
                width: 44, height: 44, borderRadius: '50%', padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
                opacity: !message.trim() ? 0.6 : 1,
              }}
              disabled={!message.trim()}
              onClick={sendMessage}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Empty state when no active room on desktop */}
      {!activeRoom && !showList && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'var(--am-text-muted)' }}>
          <div style={{ fontSize: 48 }}>💬</div>
          <div>Pilih percakapan untuk mulai chat</div>
        </div>
      )}
    </div>
  )
}
