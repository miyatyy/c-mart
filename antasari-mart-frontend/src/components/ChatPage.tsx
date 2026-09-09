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
  avatar?: string;
}

interface RoomInfo {
  roomId: string;
  otherId: string;
  otherName: string;
  otherRole: string;
  otherAvatar?: string;
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

const POPULAR_EMOJIS = ['👍', '❤️', '🌸', '😂', '🛍️', '🙏', '🔥', '🛵', '✨', '🎁', '📦', '💯'];

function buildRoomId(a: string, b: string) {
  return [String(a).toLowerCase().trim(), String(b).toLowerCase().trim()].sort().join('__');
}

function playNotificationSound(type: 'send' | 'receive' = 'receive') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'send') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      }
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

function formatMessageDateBadge(dateString?: string): string {
  if (!dateString) return 'Hari Ini';
  try {
    const msgDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (msgDate.toDateString() === today.toDateString()) {
      return 'Hari Ini';
    } else if (msgDate.toDateString() === yesterday.toDateString()) {
      return 'Kemarin';
    } else {
      return msgDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: msgDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  } catch {
    return 'Hari Ini';
  }
}

// 🎙️ Voice Note Player Component
function VoiceNoteBubble({ 
  audioUrl, 
  duration = 5, 
  isMine 
}: { 
  audioUrl?: string; 
  duration?: number; 
  isMine: boolean;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };
    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) {
      if (isPlaying) {
        setIsPlaying(false);
      } else {
        setIsPlaying(true);
        let sec = 0;
        const interval = setInterval(() => {
          sec += 1;
          setCurrentTime(sec);
          if (sec >= duration) {
            clearInterval(interval);
            setIsPlaying(false);
            setCurrentTime(0);
          }
        }, 1000);
      }
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(true);
      });
    }
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const waveBars = [6, 12, 18, 24, 14, 20, 26, 18, 10, 22, 16, 26, 12, 18, 8, 14, 20];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '4px 0',
      minWidth: 190
    }}>
      <button
        type="button"
        onClick={togglePlay}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: 'none',
          background: isMine ? 'rgba(255,255,255,0.25)' : 'var(--am-primary, #10B981)',
          color: 'white',
          fontSize: 15,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.15s ease'
        }}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 24 }}>
          {waveBars.map((h, i) => {
            const pct = (i / waveBars.length);
            const active = isPlaying && (currentTime / duration) >= pct;
            return (
              <div
                key={i}
                style={{
                  width: 3,
                  height: `${h}px`,
                  borderRadius: 3,
                  background: isMine 
                    ? (active ? '#FFFFFF' : 'rgba(255,255,255,0.45)')
                    : (active ? 'var(--am-primary, #10B981)' : 'var(--am-border, #E1ECE4)'),
                  transition: 'background 0.1s ease, transform 0.1s ease',
                  transform: isPlaying ? 'scaleY(1.15)' : 'scaleY(1)'
                }}
              />
            );
          })}
        </div>
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          opacity: 0.85,
          display: 'flex',
          justifyContent: 'space-between',
          color: isMine ? 'rgba(255,255,255,0.9)' : 'var(--am-text-muted)'
        }}>
          <span>{formatSec(currentTime)}</span>
          <span>{formatSec(duration)} 🎙️</span>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage({ theme: _theme, campus: _campus, onBack }: ChatPageProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [chats, setChats] = useState<BackendChatMessage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [pendingContact, setPendingContact] = useState<Contact | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'seller' | 'driver' | 'admin'>('all');
  const [inAppToast, setInAppToast] = useState<{ title: string; desc: string } | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);

  // Emoji Popover & Lightbox States
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);

  // Voice Note Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Refs
  const pageRootRef = useRef<HTMLDivElement>(null);
  const bottomFormRef = useRef<HTMLFormElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const prevChatsLengthRef = useRef<number>(0);

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

  // Helper untuk membaca chat terisolasi per akun pengguna
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

  const updateScopedLocalChatReactions = (userEmail: string, msgId: number, emoji: string) => {
    try {
      const cleanEmail = userEmail.toLowerCase().trim();
      const existing = getScopedLocalChats(cleanEmail);
      const target = existing.find(m => m.id === msgId);
      if (target) {
        if (!target.reactions) target.reactions = {};
        target.reactions[emoji] = (target.reactions[emoji] || 0) + 1;
        localStorage.setItem(`am_local_chats_${cleanEmail}`, JSON.stringify(existing));
      }
    } catch (_e) {}
  };

  const fetchChats = async (identifier: string, isPolling = false) => {
    if (!identifier) return;
    try {
      const data = await getChatsApi(identifier);
      const serverList = (data.success && Array.isArray(data.chats)) ? data.chats : [];
      const localList = getScopedLocalChats(identifier);

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
          playNotificationSound('receive');
          setInAppToast({
            title: `💬 Pesan Baru dari ${newMsg.senderName || 'Pengirim'}`,
            desc: newMsg.text || (newMsg.mediaType === 'image' ? '📷 Mengirim gambar' : '🎙️ Pesan suara')
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
      
      const cleanMyId = String(identifier).toLowerCase().trim();
      // Filter out user's own account so user doesn't chat with self
      list = list.filter((c: Contact) => String(c.email).toLowerCase().trim() !== cleanMyId);

      const hasMyammiy = list.some((c: Contact) => c.email === 'seller_1' || c.nama.toLowerCase().includes('myammiy'));
      if (!hasMyammiy && cleanMyId !== 'seller_1') {
        list.unshift({
          id: 9999,
          nama: 'Myammiy Craft (Katalog Resmi)',
          email: 'seller_1',
          role: 'seller',
          avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Myammiy'
        });
      }
      setContacts(list);
    } catch (e) {
      console.error('Gagal mengambil daftar kontak:', e);
      setContacts([
        { id: 9999, nama: 'Myammiy Craft (Katalog Resmi)', email: 'seller_1', role: 'seller', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Myammiy' }
      ]);
    }
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('am_user_session') || localStorage.getItem('am_current_user') || '{"email": "miyya@gmail.com", "nama": "Pengguna", "role": "buyer"}');
    setCurrentUser(user);

    const identifier = user.email || 'pengguna@antasari.com';
    fetchChats(identifier);
    fetchContacts(identifier);

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
          role: target.role || 'seller',
          avatar: target.avatar
        });
        localStorage.removeItem('am_target_chat_contact');
      } catch (_e) {}
    }

    const interval = setInterval(() => {
      fetchChats(identifier, true);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // 📱 Auto-Lock Visual Viewport Height & Position against Mobile Virtual Keyboard
  useEffect(() => {
    const handleViewportChange = () => {
      if (typeof window !== 'undefined' && window.visualViewport && pageRootRef.current) {
        const vh = window.visualViewport.height;
        const offsetTop = window.visualViewport.offsetTop || 0;
        
        if (window.innerWidth <= 768) {
          pageRootRef.current.style.height = `${vh}px`;
          pageRootRef.current.style.top = `${offsetTop}px`;
        } else {
          pageRootRef.current.style.height = '';
          pageRootRef.current.style.top = '';
        }

        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }
    };

    if (typeof window !== 'undefined' && window.visualViewport) {
      handleViewportChange();
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
    }

    return () => {
      if (typeof window !== 'undefined' && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      }
    };
  }, [activeRoomId]);

  const rooms = useMemo(() => {
    if (!currentUser) return [];
    const myId = String(currentUser.email).toLowerCase().trim();
    const roomMap = new Map<string, RoomInfo>();

    chats.forEach(c => {
      const senderClean = String(c.senderId).toLowerCase().trim();
      const receiverClean = String(c.receiverId).toLowerCase().trim();

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
          otherAvatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(otherName || otherId)}`,
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
        otherAvatar: pendingContact.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(pendingContact.nama)}`,
        messages: []
      };
    }
    if (!activeRoomId) return null;
    return rooms.find(r => r.roomId === activeRoomId) || null;
  }, [rooms, activeRoomId, pendingContact, currentUser]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chats, activeRoomId, isOtherTyping, selectedImagePreview]);

  const isCurrentRoomHandedOver = activeRoom ? Boolean(handovers[activeRoom.roomId]) : false;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setSelectedImagePreview(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleStartRecording = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
        setRecordingSeconds(0);

        recordingTimerRef.current = setInterval(() => {
          setRecordingSeconds(prev => prev + 1);
        }, 1000);
      } else {
        setIsRecording(true);
        setRecordingSeconds(0);
        recordingTimerRef.current = setInterval(() => {
          setRecordingSeconds(prev => prev + 1);
        }, 1000);
      }
    } catch (_err) {
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    }
  };

  const handleStopAndSendRecording = () => {
    if (!isRecording) return;
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);

    const finalDuration = Math.max(1, recordingSeconds);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        dispatchOutgoingMessage({
          text: '🎙️ Pesan Suara',
          mediaType: 'audio',
          mediaUrl: audioUrl,
          audioDuration: finalDuration
        });
      };
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
    } else {
      dispatchOutgoingMessage({
        text: '🎙️ Pesan Suara',
        mediaType: 'audio',
        audioDuration: finalDuration
      });
    }
  };

  const handleCancelRecording = () => {
    if (!isRecording) return;
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
    }
  };

  const dispatchOutgoingMessage = async (msgPayload: {
    text: string;
    mediaType?: 'text' | 'image' | 'audio';
    mediaUrl?: string;
    audioDuration?: number;
  }) => {
    if (!activeRoom || !currentUser) return;

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
      text: msgPayload.text,
      time: timeNow,
      createdAt: new Date().toISOString(),
      mediaType: msgPayload.mediaType || 'text',
      mediaUrl: msgPayload.mediaUrl,
      audioDuration: msgPayload.audioDuration,
      status: 'read'
    };

    saveScopedLocalChat(currentUser.email, newLocalMsg);
    setChats(prev => [...prev, newLocalMsg]);
    playNotificationSound('send');

    try {
      await sendChatApi({
        fromId: currentUser.email,
        fromName: currentUser.nama || currentUser.name || 'Pengguna',
        fromRole: currentUser.role || 'buyer',
        toId: activeRoom.otherId,
        toName: activeRoom.otherName,
        toRole: activeRoom.otherRole,
        text: msgPayload.text,
        mediaType: msgPayload.mediaType,
        mediaUrl: msgPayload.mediaUrl,
        audioDuration: msgPayload.audioDuration
      });
    } catch (_err) {
      console.warn('Chat disimpan lokal & siap disinkronkan.');
    }

    if (pendingContact) setPendingContact(null);
    setActiveRoomId(activeRoom.roomId);

    if (handovers[activeRoom.roomId]) {
      return;
    }

    const otherId = activeRoom.otherId;
    const otherName = activeRoom.otherName;
    const otherRole = activeRoom.otherRole;
    const buyerName = currentUser.nama || currentUser.name || 'Kakak';
    const lowerText = msgPayload.text.toLowerCase();

    const isClosing = CLOSING_KEYWORDS.some(kw => lowerText.includes(kw));

    setIsOtherTyping(true);

    setTimeout(async () => {
      let aiReplyText = '';

      if (isClosing) {
        aiReplyText = `Wah, siap Kak ${buyerName}! 🌸 Percakapan ini sekarang sudah otomatis kami alihkan ke Admin Penjual ${otherName} untuk proses konfirmasi order & transaksi lebih lanjut yaa. Admin kami akan segera membalas di sini. Terima kasih banyak dan happy shopping! 🥰✨`;
        setRoomHandover(activeRoom.roomId, true);
      } else if (msgPayload.mediaType === 'image') {
        aiReplyText = `Terima kasih fotonya Kak ${buyerName}! 🌸 Gambarnya sudah kami terima dengan jelas. Ada yang ingin ditanyakan terkait produk ini? 😊📸`;
      } else if (msgPayload.mediaType === 'audio') {
        aiReplyText = `Halo Kak ${buyerName}! 🎙️ Pesan suaranya sudah kami dengarkan. Kami siap membantu pesanannya yaa! ✨`;
      } else {
        try {
          const aiRes = await askSellerAIApi({
            sellerId: otherId,
            sellerName: otherName,
            sellerRole: otherRole,
            buyerName: buyerName,
            message: msgPayload.text,
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
          senderId: otherId === currentUser.email ? `${otherId}_seller_ai` : otherId,
          senderName: otherName,
          senderRole: isCurrentRoomHandedOver ? (otherRole || 'seller') : 'ai',
          receiverId: currentUser.email,
          receiverName: currentUser.nama || currentUser.name || 'Pengguna',
          receiverRole: currentUser.role || 'buyer',
          text: aiReplyText,
          time: aiMsgTime,
          createdAt: new Date().toISOString(),
          status: 'read'
        };

        saveScopedLocalChat(currentUser.email, aiMsg);
        setChats(prev => [...prev, aiMsg]);
        playNotificationSound('receive');

        window.dispatchEvent(new CustomEvent('am_trigger_notification', {
          detail: {
            id: String(aiMsg.id),
            senderId: otherId,
            senderName: otherName,
            senderRole: otherRole,
            senderAvatar: activeRoom.otherAvatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(otherName)}`,
            roomId: activeRoom.roomId,
            text: aiReplyText,
            time: aiMsgTime,
            isAi: !isCurrentRoomHandedOver
          }
        }));

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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedImagePreview) {
      const caption = messageInput.trim() || '📷 Foto terkirim';
      dispatchOutgoingMessage({
        text: caption,
        mediaType: 'image',
        mediaUrl: selectedImagePreview
      });
      setSelectedImagePreview(null);
      setMessageInput('');
      setShowEmojiPicker(false);
      return;
    }

    if (!messageInput.trim()) return;
    const text = messageInput.trim();
    setMessageInput('');
    setShowEmojiPicker(false);
    dispatchOutgoingMessage({ text });
  };

  const handleReactToMessage = (msgId: number, emoji: string) => {
    if (!currentUser) return;
    updateScopedLocalChatReactions(currentUser.email, msgId, emoji);
    setChats(prev => prev.map(m => {
      if (m.id === msgId) {
        const reactions = { ...(m.reactions || {}) };
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        return { ...m, reactions };
      }
      return m;
    }));
  };

  const handleInputFocus = () => {
    setTimeout(() => {
      if (typeof window !== 'undefined' && window.visualViewport && pageRootRef.current && window.innerWidth <= 768) {
        pageRootRef.current.style.height = `${window.visualViewport.height}px`;
        pageRootRef.current.style.top = `${window.visualViewport.offsetTop || 0}px`;
      }
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
      bottomFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 120);
    setTimeout(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
      bottomFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 300);
  };

  // Filter Contacts
  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.nama.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.role.toLowerCase().includes(contactSearch.toLowerCase());
    
    if (activeCategoryFilter === 'all') return matchesSearch;
    if (activeCategoryFilter === 'seller') return matchesSearch && (c.role === 'seller' || c.email.includes('seller'));
    if (activeCategoryFilter === 'driver') return matchesSearch && (c.role === 'driver' || c.email.includes('driver'));
    if (activeCategoryFilter === 'admin') return matchesSearch && (c.role === 'admin' || c.role === 'super_admin');
    return matchesSearch;
  });

  // Filter Rooms
  const filteredRooms = rooms.filter(r => {
    const matchesSearch = r.otherName.toLowerCase().includes(contactSearch.toLowerCase()) ||
      r.otherId.toLowerCase().includes(contactSearch.toLowerCase()) ||
      r.messages.some(m => m.text?.toLowerCase().includes(contactSearch.toLowerCase()));
    
    if (activeCategoryFilter === 'all') return matchesSearch;
    if (activeCategoryFilter === 'seller') return matchesSearch && (r.otherRole === 'seller' || r.otherId.includes('seller'));
    if (activeCategoryFilter === 'driver') return matchesSearch && (r.otherRole === 'driver' || r.otherId.includes('driver'));
    if (activeCategoryFilter === 'admin') return matchesSearch && (r.otherRole === 'admin' || r.otherRole === 'super_admin');
    return matchesSearch;
  });

  return (
    <div ref={pageRootRef} className="am-chat-page-root">
      <style>{`
        .am-chat-page-root {
          display: flex;
          height: calc(100vh - 135px);
          min-height: 520px;
          max-width: 1200px;
          margin: 0 auto;
          background: var(--am-surface, #ffffff);
          border-radius: 20px;
          border: 1px solid var(--am-border, #e8e1d5);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          position: relative;
          font-family: var(--am-font-body);
        }

        .am-chat-sidebar-pane {
          width: 330px;
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
          height: 100%;
          position: relative;
          overflow: hidden;
        }

        @media (max-width: 768px) {
          .am-chat-page-root {
            position: fixed !important;
            top: 56px !important;
            left: 0 !important;
            right: 0 !important;
            bottom: calc(60px + env(safe-area-inset-bottom, 0px)) !important;
            width: 100vw !important;
            height: auto !important;
            max-height: none !important;
            border-radius: 0 !important;
            border: none !important;
            z-index: 100 !important;
            background: var(--am-surface, #FFFFFF);
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
            margin: 0 !important;
          }
          .am-chat-sidebar-pane {
            width: 100% !important;
            height: 100% !important;
            flex: 1;
            display: ${activeRoom ? 'none' : 'flex'} !important;
            padding-bottom: 12px;
            box-sizing: border-box;
            overflow-y: auto;
          }
          .am-chat-content-pane {
            width: 100% !important;
            height: 100% !important;
            flex: 1;
            display: ${activeRoom ? 'flex' : 'none'} !important;
            flex-direction: column !important;
            overflow: hidden !important;
            position: relative;
          }
        }

        /* 💬 PESAN SAYA (USER SENDER - KANAN) */
        .am-chat-msg-row-user {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 10px;
          padding: 0 4px;
          animation: amChatBubbleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .am-chat-bubble-user {
          max-width: 80%;
          padding: 10px 14px 6px 14px;
          border-radius: 20px 20px 4px 20px;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          color: #ffffff;
          box-shadow: 0 3px 12px rgba(16, 185, 129, 0.28);
          word-break: break-word;
          font-size: 13.5px;
          line-height: 1.45;
          position: relative;
        }

        .am-chat-bubble-user .am-chat-time {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.9);
          text-align: right;
          margin-top: 4px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
        }

        /* 💬 PESAN LAWAN BICARA (PARTNER - KIRI) */
        .am-chat-msg-row-partner {
          display: flex;
          justify-content: flex-start;
          align-items: flex-end;
          gap: 8px;
          margin-bottom: 10px;
          padding: 0 4px;
          animation: amChatBubbleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .am-chat-bubble-partner {
          max-width: 80%;
          padding: 10px 14px 6px 14px;
          border-radius: 20px 20px 20px 4px;
          background: var(--am-surface, #ffffff);
          color: var(--am-text, #243329);
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
          border: 1px solid var(--am-border, #E1ECE4);
          word-break: break-word;
          font-size: 13.5px;
          line-height: 1.45;
          position: relative;
        }

        .am-chat-bubble-partner .am-chat-time {
          font-size: 10px;
          color: var(--am-text-muted, #8FA596);
          text-align: right;
          margin-top: 4px;
        }

        @keyframes amChatBubbleIn {
          0% { opacity: 0; transform: translateY(8px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes amWavePulsing {
          0% { transform: scale(1); }
          50% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }

        .am-chat-avatar-circle {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: var(--am-bg2, #F0F7F2);
          color: var(--am-primary, #10B981);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
        }

        .am-chat-online-dot {
          position: absolute;
          bottom: 1px;
          right: 1px;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #10B981;
          border: 2px solid var(--am-surface, #ffffff);
        }

        .am-chat-room-card {
          padding: 12px 14px;
          border-bottom: 1px solid var(--am-border, #E1ECE4);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.15s ease;
        }

        .am-chat-room-card:hover {
          background: var(--am-bg2, #F0F7F2);
        }

        .am-chat-room-card.is-active {
          background: rgba(16, 185, 129, 0.12);
          border-left: 4px solid var(--am-primary, #10B981);
        }

        .am-typing-dots {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 6px;
        }
        .am-typing-dots span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--am-primary, #10B981);
          display: inline-block;
          animation: amBouncingDot 1.2s infinite ease-in-out;
        }
        .am-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .am-typing-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes amBouncingDot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }

        .am-filter-pill {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          border: 1px solid var(--am-border);
          background: var(--am-surface);
          color: var(--am-text-muted);
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .am-filter-pill.active {
          background: var(--am-primary, #10B981);
          color: white;
          border-color: var(--am-primary, #10B981);
        }
      `}</style>

      {/* Hidden File Input untuk Unggah Foto / Struk */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageFileChange}
      />

      {/* Lightbox Zoom Modal untuk Gambar */}
      {activeLightboxImage && (
        <div
          onClick={() => setActiveLightboxImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <img
              src={activeLightboxImage}
              alt="Zoom Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '82vh',
                borderRadius: 16,
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                objectFit: 'contain'
              }}
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
              <a
                href={activeLightboxImage}
                download="lampiran_chat_antasari.png"
                style={{
                  padding: '8px 16px',
                  borderRadius: 20,
                  background: 'var(--am-primary, #10B981)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 12,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                ⬇️ Unduh Gambar
              </a>
              <button
                onClick={() => setActiveLightboxImage(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 20,
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 12,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                ✕ Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating In-App Toast Notification */}
      {inAppToast && (
        <div style={{
          position: 'absolute',
          top: 14,
          right: 14,
          background: 'var(--am-surface, #ffffff)',
          color: 'var(--am-text, #243329)',
          padding: '12px 18px',
          borderRadius: 16,
          boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
          border: '1.5px solid var(--am-primary, #10B981)',
          zIndex: 9999,
          maxWidth: 320,
          animation: 'amChatBubbleIn 0.3s ease-out'
        }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--am-primary, #10B981)', marginBottom: 2 }}>{inAppToast.title}</div>
          <div style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.3 }}>{inAppToast.desc}</div>
        </div>
      )}

      {/* 📋 PANE KIRI: DAFTAR OBROLAN & KONTAK */}
      <div className="am-chat-sidebar-pane">
        <div style={{ padding: '14px 16px 10px', background: 'var(--am-surface, #ffffff)', borderBottom: '1px solid var(--am-border, #e8e1d5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {onBack && (
                <button
                  onClick={onBack}
                  aria-label="Kembali ke Beranda"
                  style={{
                    background: 'var(--am-primary-light, rgba(16,185,129,0.12))',
                    border: '1.5px solid var(--am-primary, #10B981)',
                    borderRadius: 12,
                    padding: '5px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 12,
                    color: 'var(--am-primary, #10B981)',
                    cursor: 'pointer',
                    fontWeight: 800
                  }}
                  title="Kembali ke Halaman Beranda"
                >
                  <span>← Beranda</span>
                </button>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 19 }}>💬</span>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--am-text)' }}>Obrolan Kampus</h3>
              </div>
            </div>

            <button
              onClick={() => setShowContactPicker(p => !p)}
              style={{
                padding: '6px 12px',
                borderRadius: 16,
                border: 'none',
                background: showContactPicker ? '#687D70' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: 'white',
                fontWeight: 700,
                fontSize: 11,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)'
              }}
            >
              {showContactPicker ? '✕ Batal' : '+ Chat Baru'}
            </button>
          </div>

          <input
            type="text"
            placeholder={showContactPicker ? '🔍 Cari nama kontak...' : '🔍 Cari nama / pesan...'}
            value={contactSearch}
            onChange={e => setContactSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 12,
              border: '1px solid var(--am-border, #e8e1d5)',
              fontSize: 12,
              boxSizing: 'border-box',
              background: 'var(--am-bg2, #f3ece2)',
              color: 'var(--am-text)',
              outline: 'none',
              marginBottom: 8
            }}
          />

          <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2 }}>
            <button
              className={`am-filter-pill ${activeCategoryFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCategoryFilter('all')}
            >
              Semua ({rooms.length})
            </button>
            <button
              className={`am-filter-pill ${activeCategoryFilter === 'seller' ? 'active' : ''}`}
              onClick={() => setActiveCategoryFilter('seller')}
            >
              🏪 Penjual
            </button>
            <button
              className={`am-filter-pill ${activeCategoryFilter === 'driver' ? 'active' : ''}`}
              onClick={() => setActiveCategoryFilter('driver')}
            >
              🛵 Kurir
            </button>
            <button
              className={`am-filter-pill ${activeCategoryFilter === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveCategoryFilter('admin')}
            >
              🛡️ Admin
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {showContactPicker ? (
            <div style={{ padding: '8px' }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--am-text-muted)', padding: '6px 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
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
                    borderRadius: 14,
                    cursor: 'pointer',
                    marginBottom: 5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'var(--am-surface, #FFFFFF)',
                    border: '1px solid var(--am-border, #e8e1d5)',
                    transition: 'all 0.15s'
                  }}
                >
                  <div className="am-chat-avatar-circle">
                    {c.avatar ? (
                      <img src={c.avatar} alt={c.nama} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      ROLE_EMOJI[c.role] || '👤'
                    )}
                    <span className="am-chat-online-dot"></span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--am-text)' }}>{c.nama}</div>
                    <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>
                      {ROLE_LABEL[c.role] || c.role} • {c.email}
                    </div>
                  </div>
                  <span style={{ fontSize: 14, color: 'var(--am-primary, #10B981)', fontWeight: 800 }}>→</span>
                </div>
              ))}
            </div>
          ) : filteredRooms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--am-text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--am-text)', marginBottom: 4 }}>Belum ada obrolan</div>
              <p style={{ fontSize: 11.5, margin: '0 0 16px', color: 'var(--am-text-muted)' }}>Mulai pesan dengan Penjual, Driver, atau Admin!</p>
              <button
                onClick={() => setShowContactPicker(true)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'var(--am-primary, #10B981)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)'
                }}
              >
                + Mulai Obrolan Baru
              </button>
            </div>
          ) : (
            filteredRooms.map(r => {
              const isActive = activeRoom?.roomId === r.roomId;
              const isRoomHanded = Boolean(handovers[r.roomId]);
              const lastMsg = r.messages[r.messages.length - 1];
              const lastText = lastMsg?.mediaType === 'image' 
                ? '📷 [Foto / Struk]' 
                : (lastMsg?.mediaType === 'audio' ? '🎙️ [Pesan Suara]' : (lastMsg?.text || 'Mulai percakapan...'));

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
                    {r.otherAvatar ? (
                      <img src={r.otherAvatar} alt={r.otherName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      ROLE_EMOJI[r.otherRole] || '👤'
                    )}
                    <span className="am-chat-online-dot"></span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--am-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.otherName}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--am-text-muted)', flexShrink: 0 }}>
                        {lastMsg?.time || ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11.5, color: 'var(--am-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '68%' }}>
                        {lastText}
                      </span>
                      <span style={{
                        fontSize: 9.5,
                        padding: '1px 6px',
                        borderRadius: 8,
                        background: isRoomHanded ? 'rgba(5, 150, 105, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                        color: isRoomHanded ? '#10B981' : '#059669',
                        fontWeight: 800,
                        flexShrink: 0
                      }}>
                        {isRoomHanded ? 'Admin' : 'AI Active'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 💬 PANE KANAN: RUANG CHAT AKTIF */}
      <div className="am-chat-content-pane">
        {activeRoom ? (
          <>
            {/* Header Ruang Chat */}
            <div style={{
              padding: '10px 14px',
              background: 'var(--am-surface, #ffffff)',
              borderBottom: '1px solid var(--am-border, #e8e1d5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              zIndex: 20,
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
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
                    color: 'var(--am-text)',
                    cursor: 'pointer',
                    fontWeight: 800,
                    flexShrink: 0
                  }}
                  title="Kembali ke daftar pesan"
                >
                  <span>←</span>
                  <span style={{ fontSize: 11 }}>Pesan</span>
                </button>

                <div className="am-chat-avatar-circle" style={{ width: 38, height: 38, flexShrink: 0 }}>
                  {activeRoom.otherAvatar ? (
                    <img src={activeRoom.otherAvatar} alt={activeRoom.otherName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    ROLE_EMOJI[activeRoom.otherRole] || '👤'
                  )}
                  <span className="am-chat-online-dot"></span>
                </div>

                <div style={{ minWidth: 0 }}>
                  <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: 'var(--am-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeRoom.otherName}
                  </h4>
                  <div style={{ fontSize: 10.5, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>● Online</span>
                    <span style={{ color: 'var(--am-border)' }}>•</span>
                    <span style={{ color: isCurrentRoomHandedOver ? '#10B981' : 'var(--am-primary, #10B981)', fontWeight: 700 }}>
                      {isCurrentRoomHandedOver ? 'Admin Penjual (Live)' : 'Asisten AI Kampus'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {isCurrentRoomHandedOver ? (
                  <button
                    onClick={() => setRoomHandover(activeRoom.roomId, false)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 10,
                      border: '1px solid var(--am-primary, #10B981)',
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: 'var(--am-primary, #10B981)',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title="Aktifkan kembali asisten AI"
                  >
                    🌸 Aktifkan AI
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
                      padding: '5px 10px',
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
                    👤 Hubungi Admin
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
                fontWeight: 700,
                flexShrink: 0
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
                background: 'var(--am-bg, #faf7f2)',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain'
              }}
            >
              {activeRoom.messages.length === 0 ? (
                <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--am-text-muted)', padding: '20px' }}>
                  <div style={{ fontSize: 38, marginBottom: 6 }}>👋</div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--am-text)' }}>Mulai Percakapan</div>
                  <p style={{ fontSize: 12, margin: '4px 0 0', color: 'var(--am-text-muted)' }}>
                    Tanyakan stok produk, COD, atau konfirmasi pesanan ke <strong>{activeRoom.otherName}</strong>!
                  </p>
                </div>
              ) : (
                activeRoom.messages.map((m, idx) => {
                  const cleanSender = String(m.senderId || '').toLowerCase().trim();
                  const cleanReceiver = String(m.receiverId || '').toLowerCase().trim();
                  const cleanMyId = String(currentUser.email || '').toLowerCase().trim();
                  const cleanOtherId = String(activeRoom.otherId || '').toLowerCase().trim();

                  // 🎯 Logika Pemisahan Kolom Bubble (Kiri vs Kanan):
                  // Pesan Lawan Bicara (Partner/Toko/AI - Sisi KIRI):
                  // 1. Pesan memiliki peran 'ai' atau ID berakhiran '_seller_ai'
                  // 2. Sender adalah lawan bicara (cleanSender === cleanOtherId dan cleanOtherId !== cleanMyId)
                  // 3. Receiver adalah user saat ini (cleanReceiver === cleanMyId dan cleanSender !== cleanMyId)
                  // 4. Jika dalam self-room/room yang sama, jika pesan adalah respon AI/seller
                  const isPartnerReply = 
                    m.senderRole === 'ai' ||
                    cleanSender.endsWith('_seller_ai') ||
                    (cleanSender === cleanOtherId && cleanOtherId !== cleanMyId) ||
                    (cleanReceiver === cleanMyId && cleanSender !== cleanMyId) ||
                    (cleanSender === cleanMyId && cleanReceiver === cleanMyId && (
                      m.senderRole === 'seller' || 
                      m.senderRole === 'ai' || 
                      m.text?.toLowerCase().includes('terima kasih sudah menghubungi') || 
                      m.text?.toLowerCase().includes('katalog produk kami siap dipesan')
                    ));

                  const isMine = !isPartnerReply && cleanSender === cleanMyId;

                  const prevMsg = idx > 0 ? activeRoom.messages[idx - 1] : null;
                  const showDateBadge = !prevMsg || formatMessageDateBadge(m.createdAt) !== formatMessageDateBadge(prevMsg.createdAt);

                  return (
                    <React.Fragment key={m.id || idx}>
                      {showDateBadge && (
                        <div style={{ textAlign: 'center', margin: '14px 0 10px' }}>
                          <span style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: 12,
                            background: 'var(--am-surface, #ffffff)',
                            border: '1px solid var(--am-border, #E1ECE4)',
                            color: 'var(--am-text-muted)',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                          }}>
                            📅 {formatMessageDateBadge(m.createdAt)}
                          </span>
                        </div>
                      )}

                      {isMine ? (
                        <div className="am-chat-msg-row-user">
                          <div className="am-chat-bubble-user">
                            {m.mediaType === 'image' && m.mediaUrl && (
                              <div style={{ marginBottom: 6, borderRadius: 12, overflow: 'hidden', cursor: 'pointer' }} onClick={() => setActiveLightboxImage(m.mediaUrl!)}>
                                <img src={m.mediaUrl} alt="Foto terkirim" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 12 }} />
                              </div>
                            )}

                            {m.mediaType === 'audio' ? (
                              <VoiceNoteBubble audioUrl={m.mediaUrl} duration={m.audioDuration || 4} isMine={true} />
                            ) : (
                              m.text && <div>{m.text}</div>
                            )}

                            {m.reactions && Object.keys(m.reactions).length > 0 && (
                              <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                                {Object.entries(m.reactions).map(([emoji, count]) => (
                                  <span key={emoji} style={{
                                    fontSize: 11,
                                    padding: '1px 5px',
                                    borderRadius: 10,
                                    background: 'rgba(255,255,255,0.25)',
                                    color: 'white',
                                    fontWeight: 700
                                  }}>
                                    {emoji} {count > 1 ? count : ''}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="am-chat-time">
                              <span>{m.time}</span>
                              <span style={{ fontSize: 11, color: '#E0F2FE' }} title="Terkirim & Dibaca">✓✓</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="am-chat-msg-row-partner">
                          <div className="am-chat-avatar-circle" style={{ width: 34, height: 34, fontSize: 16, flexShrink: 0 }}>
                            {ROLE_EMOJI[m.senderRole || activeRoom.otherRole] || '🏪'}
                          </div>
                          <div className="am-chat-bubble-partner">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <span style={{ fontSize: 11.5, fontWeight: 900, color: 'var(--am-primary, #10B981)' }}>
                                {m.senderName || activeRoom.otherName}
                              </span>
                              <span style={{
                                fontSize: 9.5,
                                fontWeight: 800,
                                padding: '1px 6px',
                                borderRadius: 6,
                                background: (m.senderRole === 'ai' || !isCurrentRoomHandedOver) ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                color: (m.senderRole === 'ai' || !isCurrentRoomHandedOver) ? '#F43F5E' : '#10B981'
                              }}>
                                {(m.senderRole === 'ai' || !isCurrentRoomHandedOver) ? '🌸 Asisten AI' : (ROLE_LABEL[m.senderRole || activeRoom.otherRole] || 'Penjual')}
                              </span>
                            </div>

                            {m.mediaType === 'image' && m.mediaUrl && (
                              <div style={{ marginBottom: 6, borderRadius: 12, overflow: 'hidden', cursor: 'pointer' }} onClick={() => setActiveLightboxImage(m.mediaUrl!)}>
                                <img src={m.mediaUrl} alt="Foto terkirim" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 12 }} />
                              </div>
                            )}

                            {m.mediaType === 'audio' ? (
                              <VoiceNoteBubble audioUrl={m.mediaUrl} duration={m.audioDuration || 4} isMine={false} />
                            ) : (
                              m.text && <div>{m.text}</div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 6 }}>
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {m.reactions && Object.entries(m.reactions).map(([emoji, count]) => (
                                  <span key={emoji} style={{
                                    fontSize: 11,
                                    padding: '1px 5px',
                                    borderRadius: 10,
                                    background: 'var(--am-bg2)',
                                    border: '1px solid var(--am-border)',
                                    fontWeight: 700
                                  }}>
                                    {emoji} {count > 1 ? count : ''}
                                  </span>
                                ))}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <button
                                  type="button"
                                  onClick={() => handleReactToMessage(m.id, '❤️')}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: 0 }}
                                  title="Beri reaksi suka"
                                >
                                  ❤️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReactToMessage(m.id, '👍')}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: 0 }}
                                  title="Beri reaksi jempol"
                                >
                                  👍
                                </button>
                                <div className="am-chat-time" style={{ margin: 0 }}>{m.time}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })
              )}

              {isOtherTyping && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  borderRadius: 16,
                  background: 'var(--am-surface, #ffffff)',
                  border: '1px solid var(--am-border, #E1ECE4)',
                  fontSize: 12,
                  color: 'var(--am-text-muted)',
                  alignSelf: 'flex-start',
                  marginBottom: 8,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                }}>
                  <span>{activeRoom.otherName} sedang mengetik</span>
                  <div className="am-typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Question Suggestion Chips */}
            <div style={{
              padding: '6px 12px 2px',
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              background: 'var(--am-surface, #ffffff)',
              borderTop: '1px solid var(--am-border, #e8e1d5)',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>
              {[
                '🌸 Stok produk masih ada?',
                '🎁 Bahan kawat bulu / rajut?',
                '🛵 Bisa COD di fakultas?',
                '📍 Di mana posisi Vending Machine?',
                '💳 Mau konfirmasi order & transfer',
                '🧾 Boleh minta nota struk pembelian?'
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setMessageInput(chip);
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 14,
                    border: '1px solid var(--am-border, #E1ECE4)',
                    background: 'var(--am-bg2, #F0F7F2)',
                    color: 'var(--am-text, #243329)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Preview Lampiran Gambar Sebelum Dikirim */}
            {selectedImagePreview && (
              <div style={{
                padding: '8px 14px',
                background: 'var(--am-surface, #ffffff)',
                borderTop: '1px solid var(--am-border, #e8e1d5)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexShrink: 0
              }}>
                <div style={{ position: 'relative', width: 54, height: 54, borderRadius: 10, overflow: 'hidden', border: '1.5px solid var(--am-primary)' }}>
                  <img src={selectedImagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => setSelectedImagePreview(null)}
                    style={{
                      position: 'absolute', top: 2, right: 2,
                      width: 18, height: 18, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.65)', color: 'white',
                      border: 'none', fontSize: 10, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ flex: 1, fontSize: 12, color: 'var(--am-text-muted)' }}>
                  <strong>Foto siap dikirim.</strong> Tambahkan pesan di bawah atau tekan tombol kirim!
                </div>
              </div>
            )}

            {/* Emoji Quick Picker Popover */}
            {showEmojiPicker && (
              <div style={{
                padding: '8px 12px',
                background: 'var(--am-surface, #ffffff)',
                borderTop: '1px solid var(--am-border, #e8e1d5)',
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                flexShrink: 0
              }}>
                {POPULAR_EMOJIS.map(em => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => {
                      setMessageInput(prev => prev + em);
                    }}
                    style={{
                      fontSize: 18,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 6px',
                      borderRadius: 8,
                      transition: 'transform 0.1s'
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}

            {/* WhatsApp Style Bottom Message Input Bar */}
            <form
              ref={bottomFormRef}
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
              <button
                type="button"
                onClick={() => setShowEmojiPicker(p => !p)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 20,
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: showEmojiPicker ? 'var(--am-primary)' : 'var(--am-text-muted)'
                }}
                title="Pilih Emoji"
              >
                😊
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 18,
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--am-text-muted)'
                }}
                title="Kirim Foto / Bukti Struk"
              >
                📎
              </button>

              {isRecording ? (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 14px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: 24,
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444', animation: 'amWavePulsing 1s infinite' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#EF4444' }}>
                      Merekam: 00:{recordingSeconds < 10 ? '0' : ''}{recordingSeconds}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      onClick={handleCancelRecording}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6B7280',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      ✕ Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleStopAndSendRecording}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 14,
                        background: '#EF4444',
                        color: 'white',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      Kirim VN 🚀
                    </button>
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  placeholder={
                    selectedImagePreview 
                      ? 'Tambahkan keterangan foto...' 
                      : (isCurrentRoomHandedOver ? `Tulis pesan untuk Admin ${activeRoom.otherName}...` : `Tulis pesan untuk ${activeRoom.otherName}...`)
                  }
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onFocus={handleInputFocus}
                  onClick={handleInputFocus}
                  style={{
                    flex: 1,
                    padding: '11px 16px',
                    borderRadius: 24,
                    border: '1px solid var(--am-border, #e8e1d5)',
                    fontSize: 13.5,
                    outline: 'none',
                    background: 'var(--am-bg2, #f3ece2)',
                    color: 'var(--am-text)',
                    boxSizing: 'border-box'
                  }}
                />
              )}

              {!isRecording && !messageInput.trim() && !selectedImagePreview ? (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'var(--am-bg2, #F0F7F2)',
                    color: 'var(--am-primary, #10B981)',
                    fontSize: 18,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: 'var(--am-border)'
                  }}
                  title="Tahan / Ketuk untuk Rekam Pesan Suara (Voice Note)"
                >
                  🎙️
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!messageInput.trim() && !selectedImagePreview}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: 'none',
                    background: (messageInput.trim() || selectedImagePreview) ? 'var(--am-primary, #10B981)' : 'var(--am-border, #E1ECE4)',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: 16,
                    cursor: (messageInput.trim() || selectedImagePreview) ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: (messageInput.trim() || selectedImagePreview) ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
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
              )}
            </form>
          </>
        ) : (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--am-text-muted)', padding: '30px' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>💬</div>
            <h3 style={{ margin: '0 0 6px', fontSize: 18, color: 'var(--am-text)' }}>Pesan Kampus UIN Antasari</h3>
            <p style={{ fontSize: 13, margin: 0, color: 'var(--am-text-muted)', maxWidth: 360 }}>
              Pilih salah satu obrolan dari daftar di sebelah kiri untuk mulai mengirim pesan, foto produk, atau voice note!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
