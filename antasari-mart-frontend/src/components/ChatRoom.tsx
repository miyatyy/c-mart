import React, { useState, useEffect, useRef } from 'react';
import type { ThemeMode } from '../types';
import { 
  getSocket, 
  joinChatRoom, 
  sendSocketMessage, 
  sendTypingStart, 
  sendTypingStop, 
  sendMarkAsRead, 
  registerSocketUser, 
  isSocketConnected 
} from '../lib/socket';
import { getChatsApi, sendChatApi, type BackendChatMessage } from '../lib/api';
import { normalizeUserId, buildRoomId, createChatFingerprint, broadcastSoketiAction, subscribeToSoketiRoom } from '../lib/cloudChatSync';

interface ChatRoomProps {
  theme?: ThemeMode;
  chatId?: string;
  storeId?: string;
  storeName: string;
  currentUser: { email: string; nama?: string; name?: string; role?: string };
  onBack: () => void;
}

interface MessageItem {
  id: string | number;
  sender: string;
  text: string;
  time: string;
  senderId?: string;
  status?: 'sent' | 'delivered' | 'read';
  isRead?: boolean;
}

export default function ChatRoom({ storeId = 'seller_1', storeName, currentUser, onBack, chatId }: ChatRoomProps) {
  const currentUserName = currentUser.nama || currentUser.name || 'Pengguna';
  const currentUserEmail = currentUser.email || 'raisa14@gmail.com';
  const myNorm = normalizeUserId(currentUserEmail);
  const targetEmail = normalizeUserId(storeId);
  const activeRoomId = chatId || buildRoomId(myNorm, targetEmail);

  const [messages, setMessages] = useState<MessageItem[]>([
    { 
      id: '1', 
      sender: currentUserName, 
      text: `Halo Kak, mau nanya produk ini apakah stoknya masih ada?`, 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(':', '.'),
      status: 'read',
      senderId: myNorm
    },
    { 
      id: '2', 
      sender: storeName, 
      text: `Halo Kak ${currentUserName}, ada yang bisa kami bantu? Stok tersedia ya!`, 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(':', '.'),
      status: 'read',
      senderId: targetEmail
    }
  ]);
  
  const [inputText, setInputText] = useState('');
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const lastPollTimeRef = useRef<number>(0);
  const activeRoomIdRef = useRef<string>(activeRoomId);
  const typingTimeoutRef = useRef<any>(null);
  const isCurrentlyTypingRef = useRef<boolean>(false);
  const partnerTypingSafetyTimerRef = useRef<any>(null);

  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior
      });
    }
  };

  // 1. Socket Event Handling: Join Room, Pendaftaran User & Pasang Listener Real-Time
  useEffect(() => {
    registerSocketUser(currentUserEmail);
    joinChatRoom(activeRoomId, currentUserEmail);
    sendMarkAsRead(activeRoomId, myNorm);
    markCloudChatAsRead(currentUserEmail, activeRoomId);

    const socket = getSocket();

    const handleIncomingMessage = (incomingMessage: any) => {
      if (!incomingMessage) return;
      const sNorm = normalizeUserId(incomingMessage.senderId || incomingMessage.fromId);
      const rNorm = normalizeUserId(incomingMessage.receiverId || incomingMessage.toId);
      const msgRoomId = (incomingMessage.roomId || buildRoomId(sNorm, rNorm)).toLowerCase().trim();
      const currentRoom = activeRoomIdRef.current.toLowerCase().trim();

      if (msgRoomId === currentRoom || (sNorm === myNorm && rNorm === targetEmail) || (sNorm === targetEmail && rNorm === myNorm)) {
        const isFromPartner = sNorm !== myNorm;
        const newMsgItem: MessageItem = {
          id: incomingMessage.id || Date.now(),
          sender: incomingMessage.senderName || incomingMessage.fromName || (sNorm === myNorm ? currentUserName : storeName),
          text: incomingMessage.text || '',
          time: incomingMessage.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(':', '.'),
          senderId: sNorm,
          status: isFromPartner ? 'read' : (incomingMessage.status || 'sent'),
          isRead: isFromPartner ? true : (incomingMessage.isRead || false)
        };

        if (isFromPartner) {
          sendMarkAsRead(activeRoomId, myNorm);
          markCloudChatAsRead(currentUserEmail, activeRoomId);
        }

        setMessages((prev) => {
          const exists = prev.some(m => String(m.id) === String(newMsgItem.id) || (m.text === newMsgItem.text && m.time === newMsgItem.time));
          if (exists) return prev;
          return [...prev, newMsgItem];
        });

        setTimeout(() => scrollToBottom('smooth'), 50);
      }
    };

    const handleUserTyping = (data: any) => {
      const currentRoom = activeRoomIdRef.current.toLowerCase().trim();
      const rId = String(data?.roomId || '').toLowerCase().trim();
      const uId = String(data?.userId || '').toLowerCase().trim();
      if (uId && uId === myNorm) return;

      if (!rId || rId === currentRoom || currentRoom.includes(uId) || uId === targetEmail) {
        setIsOtherTyping(true);
        if (partnerTypingSafetyTimerRef.current) {
          clearTimeout(partnerTypingSafetyTimerRef.current);
        }
        partnerTypingSafetyTimerRef.current = setTimeout(() => {
          setIsOtherTyping(false);
        }, 3000);
      }
    };

    const handleUserStopTyping = (data: any) => {
      const currentRoom = activeRoomIdRef.current.toLowerCase().trim();
      const rId = String(data?.roomId || '').toLowerCase().trim();
      const uId = String(data?.userId || '').toLowerCase().trim();
      if (!rId || rId === currentRoom || currentRoom.includes(uId) || uId === targetEmail) {
        if (partnerTypingSafetyTimerRef.current) {
          clearTimeout(partnerTypingSafetyTimerRef.current);
        }
        setIsOtherTyping(false);
      }
    };

    const handleMessagesRead = (data: any) => {
      const targetRoom = String(data?.roomId || '').toLowerCase().trim();
      const currentRoom = activeRoomIdRef.current.toLowerCase().trim();
      if (targetRoom === currentRoom || targetRoom.includes(targetEmail) || targetRoom.includes(myNorm)) {
        setMessages(prev => prev.map(m => ({ ...m, status: 'read', isRead: true })));
      }
    };

    if (socket) {
      socket.on('new_message', handleIncomingMessage);
      socket.on('receive_message', handleIncomingMessage);
      socket.on('user_typing', handleUserTyping);
      socket.on('user_stop_typing', handleUserStopTyping);
      socket.on('messages_read', handleMessagesRead);

      const handleConnect = () => {
        registerSocketUser(currentUserEmail);
        socket.emit('join_room', activeRoomIdRef.current, currentUserEmail);
      };
      socket.on('connect', handleConnect);
    }

    const handleLocalMessagesRead = (e: any) => {
      handleMessagesRead(e.detail);
    };
    const handleLocalUserTyping = (e: any) => {
      handleUserTyping(e.detail);
    };
    const handleLocalUserStopTyping = (e: any) => {
      handleUserStopTyping(e.detail);
    };

    window.addEventListener('am_messages_read', handleLocalMessagesRead);
    window.addEventListener('am_user_typing', handleLocalUserTyping);
    window.addEventListener('am_user_stop_typing', handleLocalUserStopTyping);

    return () => {
      window.removeEventListener('am_messages_read', handleLocalMessagesRead);
      window.removeEventListener('am_user_typing', handleLocalUserTyping);
      window.removeEventListener('am_user_stop_typing', handleLocalUserStopTyping);
      if (partnerTypingSafetyTimerRef.current) {
        clearTimeout(partnerTypingSafetyTimerRef.current);
      }

      if (socket) {
        socket.off('new_message', handleIncomingMessage);
        socket.off('receive_message', handleIncomingMessage);
        socket.off('user_typing', handleUserTyping);
        socket.off('user_stop_typing', handleUserStopTyping);
        socket.off('messages_read', handleMessagesRead);
        socket.off('connect', handleConnect);
      }
    };
  }, [activeRoomId, myNorm, targetEmail, currentUserName, storeName, currentUserEmail]);

  // 2. Watcher: Otomatis tandai pesan sebagai sudah dibaca saat ruang obrolan terbuka dan pesan lawan bicara tampil di layar
  useEffect(() => {
    const hasUnreadPartner = messages.some(m => {
      const senderNorm = normalizeUserId(m.senderId || (m.sender !== currentUserName ? targetEmail : myNorm));
      return senderNorm !== myNorm && (m.isRead !== true || m.status !== 'read');
    });

    if (hasUnreadPartner) {
      sendMarkAsRead(activeRoomId, myNorm);
      markCloudChatAsRead(currentUserEmail, activeRoomId);
      setMessages(prev => prev.map(m => {
        const senderNorm = normalizeUserId(m.senderId || (m.sender !== currentUserName ? targetEmail : myNorm));
        if (senderNorm !== myNorm) {
          return { ...m, isRead: true, status: 'read' as const };
        }
        return m;
      }));
    }
  }, [messages, activeRoomId, myNorm, targetEmail, currentUserName, currentUserEmail]);

  // 3. Fetch Initial Chats & Fallback Polling Ringan (3-4 detik jika socket offline)
  const fetchRoomChats = async () => {
    try {
      const res = await getChatsApi(currentUserEmail);
      if (res.success && Array.isArray(res.chats)) {
        const filtered = res.chats.filter((c: BackendChatMessage) => {
          const sNorm = normalizeUserId(c.senderId);
          const rNorm = normalizeUserId(c.receiverId);
          return (sNorm === myNorm && rNorm === targetEmail) || (sNorm === targetEmail && rNorm === myNorm) || c.roomId === activeRoomId;
        });

        if (filtered.length > 0) {
          const formatted: MessageItem[] = filtered.map((c: BackendChatMessage) => ({
            id: c.id || createChatFingerprint(c),
            sender: c.senderName || (normalizeUserId(c.senderId) === myNorm ? currentUserName : storeName),
            text: c.text,
            time: c.time || '12.00',
            senderId: c.senderId,
            status: c.status || (c.isRead ? 'read' : 'sent'),
            isRead: c.isRead
          }));

          setMessages(prev => {
            if (formatted.length >= prev.length) {
              return formatted;
            }
            return prev;
          });
        }
      }
    } catch (_e) {}
  };

  useEffect(() => {
    fetchRoomChats();

    const pollInterval = setInterval(() => {
      const isSocketOk = isSocketConnected();
      const requiredInterval = isSocketOk ? 12000 : 3500;
      const now = Date.now();

      if (now - lastPollTimeRef.current >= requiredInterval) {
        lastPollTimeRef.current = now;
        fetchRoomChats();
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [currentUserEmail, myNorm, targetEmail, activeRoomId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (!isCurrentlyTypingRef.current) {
      isCurrentlyTypingRef.current = true;
      sendTypingStart(activeRoomId, myNorm, currentUserName);
      broadcastSoketiAction(myNorm, targetEmail, 'typing', {
        roomId: activeRoomId,
        userId: myNorm,
        name: currentUserName,
        userName: currentUserName,
        isTyping: true
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isCurrentlyTypingRef.current = false;
      sendTypingStop(activeRoomId, myNorm, currentUserName);
      broadcastSoketiAction(myNorm, targetEmail, 'typing', {
        roomId: activeRoomId,
        userId: myNorm,
        name: currentUserName,
        userName: currentUserName,
        isTyping: false
      });
    }, 1500);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isCurrentlyTypingRef.current) {
      isCurrentlyTypingRef.current = false;
      sendTypingStop(activeRoomId, myNorm, currentUserName);
      broadcastSoketiAction(myNorm, targetEmail, 'typing', {
        roomId: activeRoomId,
        userId: myNorm,
        name: currentUserName,
        userName: currentUserName,
        isTyping: false
      });
    }

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
    const msgText = inputText.trim();
    const msgId = Date.now();

    const newMsg: MessageItem = {
      id: msgId,
      sender: currentUserName,
      text: msgText,
      time: currentTime,
      senderId: myNorm,
      status: 'sent',
      isRead: false
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setTimeout(() => scrollToBottom('smooth'), 50);

    // ⚡ Siarkan pesan baru ke Soketi Room Channel Real-Time
    try {
      broadcastSoketiAction(myNorm, targetEmail, 'NewMessage', {
        id: msgId,
        senderId: myNorm,
        receiverId: targetEmail,
        roomId: activeRoomId,
        text: msgText,
        content: msgText,
        createdAt: new Date().toISOString()
      });
    } catch (_e) {}

    sendSocketMessage({
      roomId: activeRoomId,
      senderId: myNorm,
      senderName: currentUserName,
      senderRole: currentUser.role || 'buyer',
      receiverId: targetEmail,
      receiverName: storeName,
      receiverRole: 'seller',
      text: msgText,
      time: currentTime,
      createdAt: new Date().toISOString()
    });

    try {
      await sendChatApi({
        id: msgId,
        fromId: myNorm,
        fromName: currentUserName,
        fromRole: currentUser.role || 'buyer',
        toId: targetEmail,
        toName: storeName,
        toRole: 'seller',
        text: msgText
      });
    } catch (_err) {}
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      minHeight: '100dvh', 
      backgroundColor: '#efeae2',
      maxWidth: '100%', 
      margin: '0 auto',
      fontFamily: 'Segoe UI, Helvetica, Arial, sans-serif'
    }}>
      
      {/* 1. HEADER CHAT */}
      <div style={{ 
        height: 56,
        padding: '0 16px', 
        backgroundColor: '#005c4b',
        color: '#fff',
        display: 'flex', 
        alignItems: 'center', 
        gap: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        zIndex: 10,
        flexShrink: 0,
        boxSizing: 'border-box'
      }}>
        <button 
          onClick={onBack} 
          style={{ 
            background: 'none', 
            border: 'none', 
            fontSize: 22, 
            cursor: 'pointer', 
            color: '#fff',
            padding: 0,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          ←
        </button>
        
        {/* Foto Profil Bulat & Nama Toko */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div style={{ 
            width: 40, height: 40, borderRadius: '50%', backgroundColor: '#667781', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' 
          }}>
            {storeName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, lineHeight: '1.2' }}>{storeName}</div>
            {isOtherTyping ? (
              <div style={{ fontSize: 11, color: '#10B981', fontStyle: 'italic', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#10B981' }}></span>
                <span>sedang mengetik...</span>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: '#e2fdd9' }}>online</div>
            )}
          </div>
        </div>
      </div>

      {/* 2. BODY RUANG CHAT */}
      <div 
        ref={chatScrollRef}
        style={{ 
          flex: 1, 
          padding: '16px 20px', 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 6,
          backgroundImage: 'radial-gradient(#d1d7db 0.75px, transparent 0.75px)',
          backgroundSize: '24px 24px'
        }}
      >
        {Array.from(new Map(messages.map(m => [m.id ? String(m.id) : `${m.time}_${m.senderId}_${m.text}`, m])).values()).map(msg => {
          const isMe = msg.sender === currentUserName || (msg.senderId && normalizeUserId(msg.senderId) === myNorm);
          return (
            <div 
              key={msg.id} 
              style={{ 
                alignSelf: isMe ? 'flex-end' : 'flex-start', 
                maxWidth: '75%',
                marginBottom: 2
              }}
            >
              <div style={{
                padding: '8px 12px 6px 12px', 
                borderRadius: isMe ? '8px 0px 8px 8px' : '0px 8px 8px 8px',
                backgroundColor: isMe ? '#d9fdd3' : '#ffffff',
                color: '#111b21',
                boxShadow: '0 1px 0.5px rgba(11,20,26,0.13)',
                position: 'relative',
                wordBreak: 'break-word'
              }}>
                <span style={{ fontSize: 14.5, lineHeight: '1.4', display: 'inline', paddingRight: 45 }}>
                  {msg.text}
                </span>
                
                {/* Waktu & Centang ala WhatsApp */}
                <div style={{ 
                  fontSize: 10, 
                  color: '#667781', 
                  float: 'right',
                  marginLeft: 8,
                  marginTop: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  position: 'relative',
                  bottom: -2
                }}>
                  <span>{msg.time}</span>
                  {isMe && (() => {
                    const st = msg.status;
                    const isRd = msg.isRead === true || st === 'read';
                    if (isRd) {
                      return <span style={{ color: '#34B7F1', fontSize: 12, fontWeight: 800, letterSpacing: -1.5, display: 'inline-block' }} title="Dibaca (Read)">✓✓</span>;
                    }
                    if (st === 'delivered') {
                      return <span style={{ color: '#8696a0', fontSize: 12, fontWeight: 700, letterSpacing: -1.5, display: 'inline-block' }} title="Terkirim (Delivered)">✓✓</span>;
                    }
                    return <span style={{ color: '#8696a0', fontSize: 12, fontWeight: 700, display: 'inline-block' }} title="Terkirim ke Server (Sent)">✓</span>;
                  })()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. FOOTER / INPUT KETIK PESAN */}
      <form 
        onSubmit={handleSendMessage} 
        style={{ 
          padding: '10px 16px', 
          backgroundColor: '#f0f2f5', 
          display: 'flex', 
          alignItems: 'center',
          gap: 8 
        }}
      >
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          placeholder="Ketik pesan..."
          style={{ 
            flex: 1, 
            padding: '11px 16px', 
            borderRadius: 8, 
            border: 'none', 
            outline: 'none', 
            backgroundColor: '#ffffff', 
            color: '#111b21',
            fontSize: 15,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        />
        
        <button 
          type="submit" 
          disabled={!inputText.trim()}
          style={{ 
            width: 44, 
            height: 44, 
            backgroundColor: '#10B981',
            color: '#fff', 
            border: 'none', 
            borderRadius: '50%', 
            cursor: inputText.trim() ? 'pointer' : 'default',
            opacity: inputText.trim() ? 1 : 0.6,
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: inputText.trim() ? '0 2px 8px rgba(16, 185, 129, 0.35)' : 'none',
            flexShrink: 0,
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          title="Kirim Pesan"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </form>
    </div>
  );
}