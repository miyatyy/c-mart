import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { ThemeMode, Campus } from '../types';
import { getChatsApi, sendChatApi, getContactsApi, askSellerAIApi, markChatAsReadApi, type BackendChatMessage } from '../lib/api';
import { 
  getSocket, 
  joinChatRoom, 
  sendSocketMessage, 
  sendTypingStatus, 
  sendTypingStart, 
  sendTypingStop, 
  sendMarkAsRead, 
  registerSocketUser, 
  isSocketConnected 
} from '../lib/socket';
import { getUserAvatar, MYAMMIY_STORE_AVATAR, saveUserAvatarToGlobalMap } from '../lib/userAvatars';
import { 
  normalizeUserId, 
  buildRoomId, 
  getDeterministicRoomId, 
  subscribeToCloudChatStream, 
  createChatFingerprint,
  subscribeToSoketiRoom,
  broadcastSoketiAction,
  getSoketiRoomChannel,
  getEcho
} from '../lib/cloudChatSync';
import { cleanupSnapOverlays } from '../lib/snapCleanup';
import { requestBrowserNotificationPermission } from '../lib/webNotification';
import VueChatWrapper from './chat/VueChatWrapper';

interface ChatPageProps {
  theme: ThemeMode;
  campus: Campus;
  onBack?: () => void;
  onRoomActiveChange?: (isActive: boolean) => void;
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

export const isRoleSeller = (role?: string, name?: string, id?: string): boolean => {
  const r = (role || '').toLowerCase().trim();
  const n = (name || '').toLowerCase().trim();
  const i = (id || '').toLowerCase().trim();
  if (r === 'ai') return true; // Asisten AI milik Toko Penjual
  if (r === 'buyer' || r === 'pembeli' || r === 'driver' || r === 'kurir') return false;
  if (r === 'seller' || r === 'penjual' || r === 'merchant' || r === 'store') return true;
  if (i.includes('seller') || i.includes('toko') || i.includes('merchant') || i === 's1' || i === 's2' || i === 's3' || i.includes('udin')) return true;
  if (n.includes('myammiy') || n.includes('craft') || n.includes('official') || n.includes('toko') || n.includes('katalog resmi') || n.includes('penjual') || n.includes('udin') || n.includes('koperasi')) return true;
  return false;
};

export const isRoleBuyer = (role?: string, name?: string, id?: string): boolean => {
  const r = (role || '').toLowerCase().trim();
  if (r === 'ai') return false; // AI BUKAN pembeli
  if (isRoleSeller(role, name, id)) return false;
  const i = (id || '').toLowerCase().trim();
  if (r === 'driver' || r === 'kurir' || r === 'admin' || r === 'super_admin' || i === 'admin') return false;
  return true; // Pure human customer
};

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

      setTimeout(() => {
        try { ctx.close(); } catch (_e) {}
      }, 500);
    }
  } catch (_e) {}
}

const HANDOVER_KEYWORDS = [
  'admin', 'mana admin', 'manusia', 'orang asli', 'hubungkan ke admin',
  'gak ngerti', 'ga ngerti', 'bicara sama admin', 'owner', 'penjual asli',
  'orang', 'mana adminnya', 'asli', 'bicara langsung', 'hubungi admin',
  'orang beneran', 'bukan bot', 'asisten manusia', 'bicara dengan admin'
];

const CLOSING_KEYWORDS = [
  'deal', 'beli sekarang', 'mau beli', 'mau pesan', 'mau order', 'order sekarang',
  'transfer', 'sudah bayar', 'sudah tf', 'nomor rekening', 'rekening',
  'minta wa', 'whatsapp',
  'terima kasih', 'makasih', 'terimakasih', 'siap kak', 'oke siap', 'closing',
  'baik kak terima kasih', 'oke makasih'
];

function format24HourTime(timeStr?: string): string {
  if (!timeStr) {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }
  const str = String(timeStr).trim();
  if (str.includes('T') || str.includes('-')) {
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
    } catch {}
  }
  if (str.toLowerCase().includes('am') || str.toLowerCase().includes('pm')) {
    const isPm = str.toLowerCase().includes('pm');
    const clean = str.replace(/[^\d:.]/g, '').trim();
    const parts = clean.split(/[:.]/);
    if (parts.length >= 2) {
      let h = parseInt(parts[0], 10);
      const m = parts[1].padStart(2, '0');
      if (isPm && h < 12) h += 12;
      if (!isPm && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${m}`;
    }
  }
  if (str.includes('.') && !str.includes(':')) {
    const parts = str.split('.');
    if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
  }
  return str.replace('.', ':');
}

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

export default function ChatPage({ theme: _theme, campus: _campus, onBack, onRoomActiveChange }: ChatPageProps) {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const raw = localStorage.getItem('am_user_session') || localStorage.getItem('am_current_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const email = parsed.email || 'raisa14@gmail.com';
          const nama = parsed.nama || parsed.name || 'Raisa';
          const role = parsed.role || 'buyer';
          return { ...parsed, email, nama, name: nama, role };
        }
      }
    } catch (_e) {}
    return { email: 'raisa14@gmail.com', nama: 'Raisa', name: 'Raisa', role: 'buyer', roles: ['buyer'], id: 101 };
  });
  const currentUserRef = useRef<any>(currentUser);
  const [chats, setChats] = useState<BackendChatMessage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [pendingContact, setPendingContact] = useState<Contact | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'buyer' | 'seller' | 'driver' | 'admin'>('all');
  const [chatEngine, setChatEngine] = useState<'default' | 'vue_franken'>('default');
  const [inAppToast, setInAppToast] = useState<{ title: string; desc: string } | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [typingPartnerName, setTypingPartnerName] = useState('');
  const [isGeneratingAiReply, setIsGeneratingAiReply] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [showDevAccountSwitcher, setShowDevAccountSwitcher] = useState(false);
  const [showRoomMenu, setShowRoomMenu] = useState(false);
  const [showAiToolsDrawer, setShowAiToolsDrawer] = useState(false);
  const [isAutoPilotEnabled, setIsAutoPilotEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('am_seller_autopilot') === 'true';
    } catch {
      return false;
    }
  });

  // Notify parent (App.tsx) whenever activeRoom status changes for full-screen mode
  useEffect(() => {
    onRoomActiveChange?.(Boolean(activeRoomId));
    return () => {
      onRoomActiveChange?.(false);
    };
  }, [activeRoomId, onRoomActiveChange]);

  // Keep currentUserRef in sync with state
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Request browser notification permission on app mount
  useEffect(() => {
    requestBrowserNotificationPermission().catch(() => {});
  }, []);

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
  const typingTimeoutRef = useRef<any>(null);
  const isCurrentlyTypingRef = useRef<boolean>(false);
  const partnerTypingSafetyTimerRef = useRef<any>(null);

  // ⚡ SOKETI SINGLETON REFS: Menyimpan instance channel aktif agar tidak ter-recreate tiap render
  const activeSoketiChannelRef = useRef<any>(null);
  const activeSoketiUnsubRef = useRef<(() => void) | null>(null);
  const currentSubscribedRoomIdRef = useRef<string | null>(null);

  // ⌨️ Debounced trigger typing ke channel Soketi
  const emitTypingToSocket = (isTyping: boolean = true) => {
    const user = currentUserRef.current;
    if (!user) return;
    const currentRoomId = activeRoomIdRef.current;
    if (!currentRoomId) return;

    const myId = user.id || user.email || 'raisa14@gmail.com';
    const myName = user.name || user.nama || 'Raisa';
    const myNorm = normalizeUserId(user.email || user.id || 'raisa14@gmail.com');

    const parts = currentRoomId.includes('___') ? currentRoomId.split('___') : currentRoomId.split('__');
    const otherNorm = parts.length > 1
      ? (parts[0] === myNorm ? parts[1] : parts[0])
      : (currentRoomId === myNorm ? (myNorm === 'udin14@gmail.com' ? 'raisa14@gmail.com' : 'udin14@gmail.com') : currentRoomId);

    if (!activeSoketiChannelRef.current) {
      activeSoketiChannelRef.current = getSoketiRoomChannel(myNorm, otherNorm);
    }

    const typingPayload = {
      userId: myId,
      name: myName,
      userName: myName,
      roomId: currentRoomId,
      isTyping
    };

    // 1. Direct trigger ke instance channel Soketi via activeSoketiChannelRef
    if (activeSoketiChannelRef.current) {
      try {
        if (typeof activeSoketiChannelRef.current.trigger === 'function') {
          activeSoketiChannelRef.current.trigger(isTyping ? 'client-typing' : 'client-stop-typing', typingPayload);
        } else if (typeof activeSoketiChannelRef.current.whisper === 'function') {
          activeSoketiChannelRef.current.whisper(isTyping ? 'typing' : 'stop-typing', typingPayload);
        }
      } catch (_e) {}
    }

    // 2. Broadcast via broadcastSoketiAction (whisper + channel trigger)
    try {
      broadcastSoketiAction(myNorm, otherNorm, 'typing', typingPayload);
    } catch (_e) {}

    // 3. Fallback Socket.io
    try {
      if (isTyping) {
        sendTypingStart(currentRoomId, myNorm, myName);
      } else {
        sendTypingStop(currentRoomId, myNorm, myName);
      }
    } catch (_e) {}
  };

  const handleUserTypingInput = () => {
    if (!isCurrentlyTypingRef.current) {
      isCurrentlyTypingRef.current = true;
      emitTypingToSocket(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isCurrentlyTypingRef.current = false;
      emitTypingToSocket(false);
    }, 1800);
  };
  const pageRootRef = useRef<HTMLDivElement>(null);
  const bottomFormRef = useRef<HTMLFormElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const prevChatsLengthRef = useRef<number>(0);
  const activeRoomIdRef = useRef<string | null>(null);
  const lastAutoRepliedMsgIdRef = useRef<string | number | null>(null);
  const chatsRef = useRef<BackendChatMessage[]>([]);
  const lastReadDispatchRef = useRef<{ [roomId: string]: number }>({});
  const notifiedMsgIdsRef = useRef<Set<string>>(new Set());
  const isFetchingChatsRef = useRef<boolean>(false);

  // 🛡️ KUNCI PEMICU AI (DEBOUNCE & LOCKING):
  // Menjamin API AI hanya dipanggil 1 kali per pesan dan mencegah eksekusi paralel ganda
  const isAiReplyingRef = useRef<boolean>(false);
  const lastAiRepliedUserMsgKeyRef = useRef<string>('');
  const aiReplyTimerRef = useRef<any>(null);
  const lastAiReplyTimestampRef = useRef<number>(0);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior
      });
    }
  };

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
      const cleanEmail = normalizeUserId(userEmail);
      const raw: BackendChatMessage[] = JSON.parse(localStorage.getItem(`am_local_chats_${cleanEmail}`) || '[]');
      return raw;
    } catch (_e) {
      return [];
    }
  };

  const saveScopedLocalChat = (userEmail: string, msg: BackendChatMessage) => {
    try {
      if (!userEmail) return;
      const cleanEmail = normalizeUserId(userEmail);
      const existing = getScopedLocalChats(cleanEmail);
      const fpKey = createChatFingerprint(msg);
      const exists = existing.some(c => 
        (c.id && String(c.id) === String(msg.id)) || 
        createChatFingerprint(c) === fpKey
      );
      if (!exists) {
        existing.push(msg);
        localStorage.setItem(`am_local_chats_${cleanEmail}`, JSON.stringify(existing));
      }
    } catch (_e) {}
  };

  const updateScopedLocalChatReactions = (userEmail: string, msgId: number, emoji: string) => {
    try {
      const cleanEmail = normalizeUserId(userEmail);
      const existing = getScopedLocalChats(cleanEmail);
      const target = existing.find(m => m.id === msgId);
      if (target) {
        if (!target.reactions) target.reactions = {};
        target.reactions[emoji] = (target.reactions[emoji] || 0) + 1;
        localStorage.setItem(`am_local_chats_${cleanEmail}`, JSON.stringify(existing));
      }
    } catch (_e) {}
  };

  const markRoomAsRead = async (targetRoomId: string) => {
    if (!currentUserRef.current?.email || !targetRoomId) return;
    const myNorm = normalizeUserId(currentUserRef.current.email);
    const cleanRoomId = String(targetRoomId).toLowerCase().trim();

    // 🛡️ Pastikan benar-benar ada pesan unread dari lawan bicara di ruangan ini sebelum memicu update
    const hasUnread = chatsRef.current.some(msg => {
      const msgRoomId = (msg.roomId || buildRoomId(msg.senderId, msg.receiverId)).toLowerCase().trim();
      const msgReceiverNorm = normalizeUserId(msg.receiverId);
      const msgSenderNorm = normalizeUserId(msg.senderId);
      const isTargetRoom = msgRoomId === cleanRoomId || buildRoomId(msg.senderId, msg.receiverId) === cleanRoomId;
      const isPartnerMsg = msgSenderNorm !== myNorm || msgReceiverNorm === myNorm;
      return isTargetRoom && isPartnerMsg && (msg.isRead !== true || msg.status !== 'read');
    });

    if (!hasUnread) return;

    // 1. Update state in-memory secara instan agar UI reaktif
    setChats(prev => {
      let localHasChange = false;
      const updated = prev.map(msg => {
        const msgRoomId = (msg.roomId || buildRoomId(msg.senderId, msg.receiverId)).toLowerCase().trim();
        const msgReceiverNorm = normalizeUserId(msg.receiverId);
        const msgSenderNorm = normalizeUserId(msg.senderId);
        const isTargetRoom = msgRoomId === cleanRoomId || buildRoomId(msg.senderId, msg.receiverId) === cleanRoomId;
        const isPartnerMsg = msgSenderNorm !== myNorm || msgReceiverNorm === myNorm;

        if (isTargetRoom && isPartnerMsg && (msg.isRead !== true || msg.status !== 'read')) {
          localHasChange = true;
          return { ...msg, isRead: true, status: 'read' as const };
        }
        return msg;
      });
      return localHasChange ? updated : prev;
    });

    // 2. Update localStorage terisolasi
    try {
      const localKey = `am_local_chats_${myNorm}`;
      const localList: BackendChatMessage[] = JSON.parse(localStorage.getItem(localKey) || '[]');
      let localChanged = false;
      const updatedLocal = localList.map(msg => {
        const msgRoomId = (msg.roomId || buildRoomId(msg.senderId, msg.receiverId)).toLowerCase().trim();
        const msgReceiverNorm = normalizeUserId(msg.receiverId);
        const msgSenderNorm = normalizeUserId(msg.senderId);
        const isTargetRoom = msgRoomId === cleanRoomId || buildRoomId(msg.senderId, msg.receiverId) === cleanRoomId;
        const isPartnerMsg = msgSenderNorm !== myNorm || msgReceiverNorm === myNorm;

        if (isTargetRoom && isPartnerMsg && (msg.isRead !== true || msg.status !== 'read')) {
          localChanged = true;
          return { ...msg, isRead: true, status: 'read' as const };
        }
        return msg;
      });
      if (localChanged) {
        localStorage.setItem(localKey, JSON.stringify(updatedLocal));
      }
    } catch (_e) {}

    // 3. Panggil API backend, WebSocket, dan Redis Cloud Sync untuk update database & partner
    try {
      sendMarkAsRead(cleanRoomId, myNorm);
      await markChatAsReadApi(myNorm, cleanRoomId);
      await markCloudChatAsRead(myNorm, cleanRoomId);
    } catch (_e) {}

    // 4. Pancarkan event dengan throttle ketat (maksimal 1x per 2.5 detik per room)
    const now = Date.now();
    if (!lastReadDispatchRef.current[cleanRoomId] || now - lastReadDispatchRef.current[cleanRoomId] > 2500) {
      lastReadDispatchRef.current[cleanRoomId] = now;
      window.dispatchEvent(new CustomEvent('am_chat_read', {
        detail: { roomId: cleanRoomId, identifier: myNorm }
      }));
      window.dispatchEvent(new CustomEvent('am_messages_read', {
        detail: { roomId: cleanRoomId, readerId: myNorm }
      }));
    }
  };

  const fetchChats = async (identifier?: string, isPolling = false) => {
    const targetEmail = identifier || currentUserRef.current?.email || 'raisa14@gmail.com';
    if (!targetEmail) return;
    if (isPolling && isFetchingChatsRef.current) return;
    isFetchingChatsRef.current = true;
    try {
      const myNorm = normalizeUserId(targetEmail);
      const data = await getChatsApi(targetEmail);
      const serverList = (data.success && Array.isArray(data.chats)) ? data.chats : [];
      const localList = getScopedLocalChats(targetEmail);

      const uniqueList: BackendChatMessage[] = [];
      const seenKeys = new Set<string>();
      [...serverList, ...localList].forEach(c => {
        if (!c) return;
        const textClean = (c.text || (c as any).content || '').trim();
        const rawTime = c.time || c.createdAt || (c as any).created_at || '';
        const normTime = format24HourTime(rawTime);
        const timeKey = normTime ? normTime.substring(0, 5) : '';
        const rawSender = String(c.senderId || (c as any).fromId || '');
        const senderKey = normalizeUserId(rawSender) || rawSender;

        const idStr = c.id != null ? String(c.id) : '';
        const clientStr = (c as any).client_id != null ? String((c as any).client_id) : '';

        // 🔍 Cari apakah pesan ini sudah ada di uniqueList berdasarkan ID numerik, string, atau client_id
        let existingIdx = -1;
        if (idStr || clientStr) {
          existingIdx = uniqueList.findIndex(m => 
            (idStr && m.id != null && String(m.id) === idStr) ||
            (clientStr && (m as any).client_id != null && String((m as any).client_id) === clientStr) ||
            (idStr && (m as any).client_id != null && String((m as any).client_id) === idStr) ||
            (clientStr && m.id != null && String(m.id) === clientStr)
          );
        }

        if (existingIdx !== -1) {
          // ✏️ Jika sudah ada, utamakan versi yang telah diedit atau teks yang paling baru
          const existing = uniqueList[existingIdx];
          const isCEdited = Boolean((c as any).isEdited || (c as any).is_edited);
          const isTextDiff = (c.text || (c as any).content) !== (existing.text || (existing as any).content);

          if (isCEdited || (isTextDiff && (c.updatedAt || (c as any).updated_at || (c as any).edited_at))) {
            uniqueList[existingIdx] = {
              ...existing,
              ...c,
              text: c.text || (c as any).content,
              content: c.text || (c as any).content,
              isEdited: true,
              is_edited: true,
              updatedAt: c.updatedAt || (c as any).updated_at || (c as any).edited_at || new Date().toISOString()
            };
          }
          return;
        }

        const uniqueKey = idStr ? `id_${idStr}` : `${senderKey}_${textClean}_${timeKey}`;
        const contentKey = textClean ? `${senderKey}_${textClean}_${timeKey}` : '';

        // 🛡️ Jika pesan memiliki ID unik, jangan suppress berdasarkan contentKey lama
        const isDuplicate = seenKeys.has(uniqueKey) || (contentKey && !idStr && seenKeys.has(contentKey));
        if (!isDuplicate) {
          seenKeys.add(uniqueKey);
          if (contentKey) seenKeys.add(contentKey);
          uniqueList.push(c);
        }
      });

      const combined = uniqueList.sort((a, b) => {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      });

      if (isPolling && prevChatsLengthRef.current > 0 && combined.length > prevChatsLengthRef.current) {
        const newMsg = combined[combined.length - 1];
        if (newMsg && normalizeUserId(newMsg.senderId) !== myNorm) {
          const msgRoomId = (newMsg.roomId || buildRoomId(newMsg.senderId, newMsg.receiverId)).toLowerCase().trim();
          const isViewingThisRoom = activeRoomIdRef.current && activeRoomIdRef.current.toLowerCase().trim() === msgRoomId;

          if (isViewingThisRoom) {
            markRoomAsRead(msgRoomId);
          } else {
            const msgIdStr = String(newMsg.id || `${newMsg.senderId}_${newMsg.time || ''}`);
            if (!notifiedMsgIdsRef.current.has(msgIdStr)) {
              notifiedMsgIdsRef.current.add(msgIdStr);
              playNotificationSound('receive');
              window.dispatchEvent(new CustomEvent('am_trigger_notification', {
                detail: {
                  id: msgIdStr,
                  senderId: newMsg.senderId,
                  senderName: newMsg.senderName || 'Pengirim Antasari',
                  senderRole: newMsg.senderRole || 'buyer',
                  senderAvatar: getUserAvatar(newMsg.senderId, newMsg.senderName, newMsg.senderRole),
                  roomId: msgRoomId,
                  text: newMsg.text || (newMsg.mediaType === 'image' ? '📷 Mengirim gambar' : '🎙️ Pesan suara'),
                  time: newMsg.time || 'Baru saja'
                }
              }));
            }
          }
        }
      }

      prevChatsLengthRef.current = combined.length;
      setChats(prev => {
        if (prev.length === combined.length) {
          let hasDiff = false;
          for (let i = 0; i < prev.length; i++) {
            const p = prev[i];
            const c = combined[i];
            if (
              p.id !== c.id ||
              p.isRead !== c.isRead ||
              p.status !== c.status ||
              p.text !== c.text ||
              p.mediaUrl !== c.mediaUrl ||
              JSON.stringify(p.reactions || {}) !== JSON.stringify(c.reactions || {})
            ) {
              hasDiff = true;
              break;
            }
          }
          if (!hasDiff) return prev;
        }
        return combined;
      });
    } catch (_e) {
      const localList = getScopedLocalChats(targetEmail);
      setChats(prev => {
        if (prev.length === localList.length) {
          let hasDiff = false;
          for (let i = 0; i < prev.length; i++) {
            if (
              prev[i].id !== localList[i].id ||
              prev[i].isRead !== localList[i].isRead ||
              prev[i].text !== localList[i].text
            ) {
              hasDiff = true;
              break;
            }
          }
          if (!hasDiff) return prev;
        }
        return localList;
      });
    } finally {
      isFetchingChatsRef.current = false;
    }
  };

  const handleManualSync = async () => {
    setIsSyncingCloud(true);
    const targetEmail = currentUserRef.current?.email || 'raisa14@gmail.com';
    await fetchChats(targetEmail);
    await fetchContacts(targetEmail);
    setTimeout(() => {
      setIsSyncingCloud(false);
      setInAppToast({
        title: '✅ Obrolan Berhasil Disinkronkan',
        desc: 'Semua pesan terbaru dari laptop & HP sudah disinkronkan 100%!'
      });
      setTimeout(() => setInAppToast(null), 3000);
    }, 600);
  };

  const fetchContacts = async (identifier: string) => {
    try {
      const myNorm = normalizeUserId(identifier);
      const data = await getContactsApi(identifier);
      let list = (data.success && Array.isArray(data.contacts)) ? data.contacts : [];
      
      // Filter out user's own account so user doesn't chat with self
      list = list.filter((c: Contact) => normalizeUserId(c.email) !== myNorm);

      // Sinkronkan akun-akun terdaftar lokal ke dalam daftar kontak (Udin, Raisa, dll)
      try {
        const regUsers: any[] = JSON.parse(localStorage.getItem('am_registered_users') || '[]');
        regUsers.forEach((u: any) => {
          const uMailNorm = normalizeUserId(u.email);
          if (uMailNorm && uMailNorm !== myNorm) {
            const existingIdx = list.findIndex(c => normalizeUserId(c.email) === uMailNorm);
            const resolvedAv = getUserAvatar(u.email, u.nama || u.name, u.role || (u.roles && u.roles[0]), u.avatar);
            if (existingIdx >= 0) {
              list[existingIdx].avatar = resolvedAv;
              list[existingIdx].nama = u.nama || u.name || list[existingIdx].nama;
            } else {
              list.push({
                id: u.id || Date.now(),
                nama: u.nama || u.name || uMailNorm,
                email: uMailNorm,
                role: (u.roles && u.roles[0]) || u.role || 'buyer',
                avatar: resolvedAv
              });
            }
          }
        });
      } catch (_e) {}

      // Pastikan setiap kontak memiliki avatar yang 100% konsisten
      list = list.map((c: Contact) => ({
        ...c,
        avatar: getUserAvatar(c.email, c.nama, c.role, c.avatar)
      }));

      const hasMyammiy = list.some((c: Contact) => normalizeUserId(c.email) === 'seller_1' || c.nama.toLowerCase().includes('myammiy'));
      if (!hasMyammiy && myNorm !== 'seller_1') {
        list.unshift({
          id: 9999,
          nama: 'Myammiy Craft (Katalog Resmi)',
          email: 'seller_1',
          role: 'seller',
          avatar: MYAMMIY_STORE_AVATAR
        });
      }
      setContacts(prev => {
        if (prev.length === list.length) {
          const isIdentical = prev.every((item, idx) => {
            const c = list[idx];
            return item.id === c.id && item.email === c.email && item.nama === c.nama && item.role === c.role && item.avatar === c.avatar;
          });
          if (isIdentical) return prev;
        }
        return list;
      });
    } catch (e) {
      console.error('Gagal mengambil daftar kontak:', e);
      setContacts(prev => {
        if (prev.length === 1 && prev[0].email === 'seller_1') return prev;
        return [
          { id: 9999, nama: 'Myammiy Craft (Katalog Resmi)', email: 'seller_1', role: 'seller', avatar: MYAMMIY_STORE_AVATAR }
        ];
      });
    }
  };

  useEffect(() => {
    cleanupSnapOverlays();
    const snapContainer = document.getElementById('snap-container');
    if (snapContainer) snapContainer.remove();
    document.querySelectorAll('iframe[src*="midtrans"], .snap-popup, #snap-overlay, #snap-midtrans').forEach(el => el.remove());

    let identifier = 'raisa14@gmail.com';
    let myNorm = 'raisa14@gmail.com';
    try {
      const saved = localStorage.getItem('am_user_session') || localStorage.getItem('am_current_user');
      const user = saved ? JSON.parse(saved) : { email: 'raisa14@gmail.com', nama: 'Raisa', role: 'buyer' };
      const safeUser = {
        email: user.email || 'raisa14@gmail.com',
        nama: user.nama || user.name || 'Raisa',
        name: user.nama || user.name || 'Raisa',
        role: user.role || 'buyer',
        ...user
      };
      setCurrentUser(safeUser);
      currentUserRef.current = safeUser;
      identifier = safeUser.email || 'raisa14@gmail.com';
      myNorm = normalizeUserId(identifier);
    } catch (_e) {}

    registerSocketUser(identifier);
    fetchChats(identifier);
    fetchContacts(identifier);

    const targetRoomStr = localStorage.getItem('am_target_chat_room');
    if (targetRoomStr) {
      setActiveRoomId(targetRoomStr);
      activeRoomIdRef.current = targetRoomStr;
      localStorage.removeItem('am_target_chat_room');
    }

    const targetChatStr = localStorage.getItem('am_target_chat');
    if (targetChatStr) {
      try {
        const target = JSON.parse(targetChatStr);
        const targetEmail = normalizeUserId(target.email || 'seller_1');
        const rId = buildRoomId(myNorm, targetEmail);
        setActiveRoomId(rId);
        activeRoomIdRef.current = rId;
        setPendingContact({
          id: target.id || Date.now(),
          nama: target.nama || 'Penjual Antasari',
          email: targetEmail,
          role: target.role || 'seller',
          avatar: target.avatar
        });
        localStorage.removeItem('am_target_chat');
      } catch (_e) {}
    }

    const targetContactStr = localStorage.getItem('am_target_chat_contact');
    if (targetContactStr) {
      try {
        const target = JSON.parse(targetContactStr);
        const targetEmail = normalizeUserId(target.email || 'seller_1');
        const rId = buildRoomId(myNorm, targetEmail);
        setActiveRoomId(rId);
        activeRoomIdRef.current = rId;
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

    // ⚡ 1. Langganan Cloud Realtime Stream via SSE (Sinkronisasi HP & Laptop < 100ms)
    const unsubscribeCloudStream = subscribeToCloudChatStream(() => currentUserRef.current?.email || 'raisa14@gmail.com', (incomingMsg) => {
      if (!incomingMsg) return;
      const currentEmail = currentUserRef.current?.email || 'raisa14@gmail.com';
      const activeMyNorm = normalizeUserId(currentEmail);

      const sNorm = normalizeUserId(incomingMsg.senderId);
      const rNorm = normalizeUserId(incomingMsg.receiverId);

      // Sinkronkan avatar pengirim secara instan ke cache lokal
      if (incomingMsg.senderAvatar && sNorm) {
        saveUserAvatarToGlobalMap(sNorm, incomingMsg.senderName, incomingMsg.senderAvatar, false);
      }

      const isForMe = sNorm === activeMyNorm || rNorm === activeMyNorm ||
        (activeMyNorm === 'udin14@gmail.com' && (sNorm.includes('udin') || rNorm.includes('udin'))) ||
        (activeMyNorm === 'raisa14@gmail.com' && (sNorm.includes('raisa') || rNorm.includes('raisa')));
      if (!isForMe) return;

      const normalizedMsg: BackendChatMessage = {
        ...incomingMsg,
        senderId: sNorm,
        receiverId: rNorm,
        roomId: buildRoomId(sNorm, rNorm)
      };

      setChats(prev => {
        const textClean = (normalizedMsg.text || (normalizedMsg as any).content || '').trim();
        const rawTime = normalizedMsg.time || normalizedMsg.createdAt || (normalizedMsg as any).created_at || '';
        const normTime = format24HourTime(rawTime);
        const timeKey = normTime ? normTime.substring(0, 5) : '';
        const idKey = normalizedMsg.id != null ? String(normalizedMsg.id) : '';
        const contentKey = textClean ? `${sNorm}_${textClean}_${timeKey}` : '';

        const exists = prev.some(c => {
          if (idKey && c.id != null && String(c.id) === idKey) return true;
          if (contentKey) {
            const cSender = normalizeUserId(c.senderId || (c as any).fromId);
            const cText = (c.text || (c as any).content || '').trim();
            const cTime = format24HourTime(c.time || c.createdAt || (c as any).created_at);
            const cTimeKey = cTime ? cTime.substring(0, 5) : '';
            if (`${cSender}_${cText}_${cTimeKey}` === contentKey) return true;
          }
          return false;
        });

        if (exists) return prev;

        // 🛡️ DEDUPING RESIDUAL: Cegah burst double AI dari cloud stream
        const isIncomingAi =
          normalizedMsg.senderRole === 'ai' ||
          (normalizedMsg as any).sender_role === 'ai' ||
          normalizedMsg.senderId === 'myammiy_ai' ||
          normalizeUserId(normalizedMsg.senderId).includes('ai') ||
          (normalizedMsg.senderName && normalizedMsg.senderName.toLowerCase().includes('asisten'));

        if (isIncomingAi) {
          const lastInRoom = [...prev].reverse().find(c => {
            const cRoom = (c.roomId || buildRoomId(c.senderId, c.receiverId)).toLowerCase().trim();
            return cRoom === normalizedMsg.roomId.toLowerCase().trim();
          });
          if (lastInRoom) {
            const isLastAi =
              lastInRoom.senderRole === 'ai' ||
              (lastInRoom as any).sender_role === 'ai' ||
              lastInRoom.senderId === 'myammiy_ai' ||
              normalizeUserId(lastInRoom.senderId).includes('ai') ||
              (lastInRoom.senderName && lastInRoom.senderName.toLowerCase().includes('asisten'));
            const lastTime = lastInRoom.createdAt ? new Date(lastInRoom.createdAt).getTime() : 0;
            const thisTime = normalizedMsg.createdAt ? new Date(normalizedMsg.createdAt).getTime() : Date.now();
            if (isLastAi && (Math.abs(thisTime - lastTime) < 3500 || (lastInRoom.text && normalizedMsg.text && lastInRoom.text.trim() === normalizedMsg.text.trim()))) {
              console.warn('🛡️ [ChatPage:CloudStream] Suppressed duplicate AI burst message');
              return prev;
            }
          }
        }

        const isViewingThisRoom = activeRoomIdRef.current && (activeRoomIdRef.current.toLowerCase().trim() === normalizedMsg.roomId.toLowerCase().trim());
        if (sNorm !== activeMyNorm) {
          if (isViewingThisRoom) {
            normalizedMsg.isRead = true;
            markRoomAsRead(normalizedMsg.roomId);
          } else {
            const msgIdStr = String(normalizedMsg.id || `${normalizedMsg.senderId}_${normalizedMsg.time || ''}`);
            if (!notifiedMsgIdsRef.current.has(msgIdStr)) {
              notifiedMsgIdsRef.current.add(msgIdStr);
              playNotificationSound('receive');
              window.dispatchEvent(new CustomEvent('am_trigger_notification', {
                detail: {
                  id: msgIdStr,
                  senderId: normalizedMsg.senderId,
                  senderName: normalizedMsg.senderName || 'Pengirim Antasari',
                  senderRole: normalizedMsg.senderRole || 'buyer',
                  senderAvatar: normalizedMsg.senderAvatar || getUserAvatar(normalizedMsg.senderId, normalizedMsg.senderName, normalizedMsg.senderRole),
                  roomId: normalizedMsg.roomId,
                  text: normalizedMsg.text || (normalizedMsg.mediaType === 'image' ? '📷 Mengirim gambar' : '🎙️ Pesan suara'),
                  time: normalizedMsg.time || 'Baru saja'
                }
              }));
            }
          }
        }

        return [...prev, normalizedMsg];
      });
    });

    // ⚡ 2. Event listener untuk update lokal tab
    const handleNewCloudChatEvent = (e: any) => {
      const msg = e.detail as BackendChatMessage;
      if (msg) {
        if (msg.senderAvatar && msg.senderId) {
          saveUserAvatarToGlobalMap(msg.senderId, msg.senderName, msg.senderAvatar, false);
        }
        setChats(prev => {
          const sNorm = normalizeUserId(msg.senderId || (msg as any).fromId);
          const rNorm = normalizeUserId(msg.receiverId || (msg as any).toId);
          const textClean = (msg.text || (msg as any).content || '').trim();
          const rawTime = msg.time || msg.createdAt || (msg as any).created_at || '';
          const normTime = format24HourTime(rawTime);
          const timeKey = normTime ? normTime.substring(0, 5) : '';
          const idKey = msg.id != null ? String(msg.id) : '';
          const contentKey = textClean ? `${sNorm}_${textClean}_${timeKey}` : '';

          const exists = prev.some(c => {
            if (idKey && c.id != null && String(c.id) === idKey) return true;
            if (contentKey) {
              const cSender = normalizeUserId(c.senderId || (c as any).fromId);
              const cText = (c.text || (c as any).content || '').trim();
              const cTime = format24HourTime(c.time || c.createdAt || (c as any).created_at);
              const cTimeKey = cTime ? cTime.substring(0, 5) : '';
              if (`${cSender}_${cText}_${cTimeKey}` === contentKey) return true;
            }
            return false;
          });
          if (exists) return prev;
          return [...prev, { ...msg, senderId: sNorm, receiverId: rNorm, roomId: buildRoomId(sNorm, rNorm) }];
        });
      }
    };
    window.addEventListener('am_new_cloud_chat', handleNewCloudChatEvent);

    // ✏️ Listener Pembaruan Teks Pesan Real-Time (Edit Pesan)
    const handleIncomingMessageUpdatedEvent = (e: any) => {
      const data = e?.detail || e;
      if (!data || data.id == null) return;
      const targetIdStr = String(data.id);
      const targetClientIdStr = data.client_id ? String(data.client_id) : '';
      const updatedText = data.text;
      const editTime = data.edited_at || data.updated_at || data.updatedAt || new Date().toISOString();

      setChats(prev => {
        let changed = false;
        const next = prev.map(m => {
          const matchId = (m.id != null && String(m.id) === targetIdStr) ||
                          ((m as any).client_id != null && String((m as any).client_id) === targetIdStr) ||
                          (targetClientIdStr && m.id != null && String(m.id) === targetClientIdStr) ||
                          (targetClientIdStr && (m as any).client_id != null && String((m as any).client_id) === targetClientIdStr);
          const matchOldText = !matchId && data.old_text && ((m.text || (m as any).content || '').trim() === data.old_text.trim());

          if (matchId || matchOldText) {
            changed = true;
            return {
              ...m,
              text: updatedText,
              content: updatedText,
              isEdited: true,
              is_edited: true,
              updatedAt: editTime
            };
          }
          return m;
        });
        return changed ? next : prev;
      });
    };
    window.addEventListener('am_message_updated', handleIncomingMessageUpdatedEvent);

    // 🗑️ Listener Hapus Pesan Real-Time
    const handleIncomingMessageDeletedEvent = (e: any) => {
      const data = e?.detail || e;
      if (!data || data.id == null) return;
      const targetIdStr = String(data.id);
      const targetClientIdStr = data.client_id ? String(data.client_id) : '';
      const delText = 'Pesan ini telah dihapus untuk semua orang';

      setChats(prev => {
        let changed = false;
        const next = prev.map(m => {
          const matchId = (m.id != null && String(m.id) === targetIdStr) ||
                          ((m as any).client_id != null && String((m as any).client_id) === targetIdStr) ||
                          (targetClientIdStr && m.id != null && String(m.id) === targetClientIdStr);
          if (matchId) {
            changed = true;
            return {
              ...m,
              text: delText,
              content: delText,
              isDeleted: true,
              is_deleted: true
            };
          }
          return m;
        });
        return changed ? next : prev;
      });
    };
    window.addEventListener('am_message_deleted', handleIncomingMessageDeletedEvent);

    // ⚡ 3. Socket.io Real-Time Event Listeners (new_message, receive_message, chat_list_update)
    const socket = getSocket();
    const handleSocketIncomingMessage = (incomingMsg: any) => {
      if (!incomingMsg) return;
      const currentEmail = currentUserRef.current?.email || 'raisa14@gmail.com';
      const activeMyNorm = normalizeUserId(currentEmail);

      const sNorm = normalizeUserId(incomingMsg.senderId || incomingMsg.fromId);
      const rNorm = normalizeUserId(incomingMsg.receiverId || incomingMsg.toId);
      const targetRoomId = (incomingMsg.roomId || buildRoomId(sNorm, rNorm)).toLowerCase().trim();

      if (incomingMsg.senderAvatar && sNorm) {
        saveUserAvatarToGlobalMap(sNorm, incomingMsg.senderName, incomingMsg.senderAvatar, false);
      }

      const isForMe = sNorm === activeMyNorm || rNorm === activeMyNorm ||
        (activeMyNorm === 'udin14@gmail.com' && (sNorm.includes('udin') || rNorm.includes('udin'))) ||
        (activeMyNorm === 'raisa14@gmail.com' && (sNorm.includes('raisa') || rNorm.includes('raisa')));
      if (!isForMe) return;

      const normalizedMsg: BackendChatMessage = {
        ...incomingMsg,
        senderId: sNorm,
        receiverId: rNorm,
        roomId: targetRoomId
      };

      setChats(prev => {
        const fpKey = createChatFingerprint(normalizedMsg);
        const incomingId = normalizedMsg.id != null ? String(normalizedMsg.id) : '';
        const incomingMongoId = normalizedMsg._id != null ? String(normalizedMsg._id) : '';
        const incomingText = (normalizedMsg.text || '').trim();
        const incomingSender = normalizeUserId(normalizedMsg.senderId || (normalizedMsg as any).fromId);
        
        const existingIndex = prev.findIndex(c => {
          const cId = c.id != null ? String(c.id) : '';
          const cMongoId = c._id != null ? String(c._id) : '';
          if (cId && incomingId && cId === incomingId) return true;
          if (cMongoId && incomingMongoId && cMongoId === incomingMongoId) return true;
          const cFp = createChatFingerprint(c);
          if (cFp === fpKey) return true;
          const cText = (c.text || '').trim();
          const cSender = normalizeUserId(c.senderId || (c as any).fromId);
          if (cText && incomingText && cText === incomingText && cSender && incomingSender && cSender === incomingSender) {
            return true;
          }
          return false;
        });

        if (existingIndex !== -1) {
          // Update status existing message in place (tanpa membuat bubble ganda)
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            ...normalizedMsg,
            id: updated[existingIndex].id || normalizedMsg.id
          };
          return updated;
        }

        // 🛡️ DEDUPING RESIDUAL: Cegah burst double AI dari socket broadcast
        const isIncomingAi =
          normalizedMsg.senderRole === 'ai' ||
          (normalizedMsg as any).sender_role === 'ai' ||
          normalizedMsg.senderId === 'myammiy_ai' ||
          normalizeUserId(normalizedMsg.senderId).includes('ai') ||
          (normalizedMsg.senderName && normalizedMsg.senderName.toLowerCase().includes('asisten'));

        if (isIncomingAi) {
          const lastInRoom = [...prev].reverse().find(c => {
            const cRoom = (c.roomId || buildRoomId(c.senderId, c.receiverId)).toLowerCase().trim();
            return cRoom === targetRoomId;
          });
          if (lastInRoom) {
            const isLastAi =
              lastInRoom.senderRole === 'ai' ||
              (lastInRoom as any).sender_role === 'ai' ||
              lastInRoom.senderId === 'myammiy_ai' ||
              normalizeUserId(lastInRoom.senderId).includes('ai') ||
              (lastInRoom.senderName && lastInRoom.senderName.toLowerCase().includes('asisten'));
            const lastTime = lastInRoom.createdAt ? new Date(lastInRoom.createdAt).getTime() : 0;
            const thisTime = normalizedMsg.createdAt ? new Date(normalizedMsg.createdAt).getTime() : Date.now();
            if (isLastAi && (Math.abs(thisTime - lastTime) < 3500 || (lastInRoom.text && normalizedMsg.text && lastInRoom.text.trim() === normalizedMsg.text.trim()))) {
              console.warn('🛡️ [ChatPage:Socket] Suppressed duplicate AI burst message in room:', targetRoomId);
              return prev;
            }
          }
        }

        const currentActiveRoom = activeRoomIdRef.current ? activeRoomIdRef.current.toLowerCase().trim() : null;
        const isViewingThisRoom = currentActiveRoom && (
          currentActiveRoom === targetRoomId || 
          currentActiveRoom === buildRoomId(sNorm, rNorm).toLowerCase().trim()
        );

        if (sNorm !== activeMyNorm) {
          if (isViewingThisRoom) {
            normalizedMsg.isRead = true;
            markRoomAsRead(targetRoomId);
          } else {
            const msgIdStr = String(normalizedMsg.id || `${normalizedMsg.senderId}_${normalizedMsg.time || ''}`);
            if (!notifiedMsgIdsRef.current.has(msgIdStr)) {
              notifiedMsgIdsRef.current.add(msgIdStr);
              playNotificationSound('receive');
              window.dispatchEvent(new CustomEvent('am_trigger_notification', {
                detail: {
                  id: msgIdStr,
                  senderId: normalizedMsg.senderId,
                  senderName: normalizedMsg.senderName || 'Pengirim Antasari',
                  senderRole: normalizedMsg.senderRole || 'buyer',
                  senderAvatar: normalizedMsg.senderAvatar || getUserAvatar(normalizedMsg.senderId, normalizedMsg.senderName, normalizedMsg.senderRole),
                  roomId: targetRoomId,
                  text: normalizedMsg.text || (normalizedMsg.mediaType === 'image' ? '📷 Mengirim gambar' : '🎙️ Pesan suara'),
                  time: normalizedMsg.time || 'Baru saja'
                }
              }));
            }
          }
        }

        // Auto-scroll ke bawah saat pesan baru masuk di ruang obrolan aktif
        if (isViewingThisRoom) {
          setTimeout(() => scrollToBottom('smooth'), 50);
        }

        return [...prev, normalizedMsg];
      });
    };

    if (socket) {
      socket.on('new_message', handleSocketIncomingMessage);
      socket.on('receive_message', handleSocketIncomingMessage);
    }

    // 💬 Listener Sinkronisasi Daftar Obrolan (Chat List Update & Badge)
    const handleChatListUpdate = (data: any) => {
      if (data && (data.text || data.roomId)) {
        handleSocketIncomingMessage(data);
      } else {
        const activeEmail = currentUserRef.current?.email || 'raisa14@gmail.com';
        fetchChats(activeEmail, true);
      }
    };

    if (socket) {
      socket.on('chat_list_update', handleChatListUpdate);
      socket.on('new_chat_notification', handleChatListUpdate);
    }

    // ⌨️ Status Mengetik Realtime (Typing Start & Stop dengan Safety Timeout 3 Detik)
    const handleUserTyping = (data: any) => {
      const currentActiveRoom = activeRoomIdRef.current ? activeRoomIdRef.current.toLowerCase().trim() : null;
      if (!currentActiveRoom) return;
      const rId = String(data?.roomId || '').toLowerCase().trim();
      const uId = String(data?.userId || '').toLowerCase().trim();
      const myNorm = normalizeUserId(currentUserRef.current?.email || '');

      // Jangan anggap ketikan diri sendiri sebagai lawan bicara
      if (uId && uId === myNorm) return;

      if (!rId || rId === currentActiveRoom || currentActiveRoom.includes(uId)) {
        setIsOtherTyping(true);

        // 3 detik safety timeout jika stop event terlewat karena latensi
        if (partnerTypingSafetyTimerRef.current) {
          clearTimeout(partnerTypingSafetyTimerRef.current);
        }
        partnerTypingSafetyTimerRef.current = setTimeout(() => {
          setIsOtherTyping(false);
        }, 3000);
      }
    };

    const handleUserStopTyping = (data: any) => {
      const currentActiveRoom = activeRoomIdRef.current ? activeRoomIdRef.current.toLowerCase().trim() : null;
      if (!currentActiveRoom) return;
      const rId = String(data?.roomId || '').toLowerCase().trim();
      const uId = String(data?.userId || '').toLowerCase().trim();
      if (!rId || rId === currentActiveRoom || currentActiveRoom.includes(uId)) {
        if (partnerTypingSafetyTimerRef.current) {
          clearTimeout(partnerTypingSafetyTimerRef.current);
        }
        setIsOtherTyping(false);
      }
    };

    // 👀 Status Pesan Dibaca Realtime (Messages Read)
    const handleMessagesRead = (data: any) => {
      const targetRoom = String(data?.roomId || '').toLowerCase().trim();
      const readerId = normalizeUserId(data?.readerId || data?.identifier || '');
      const myNorm = normalizeUserId(currentUserRef.current?.email || '');

      setChats(prev => prev.map(m => {
        const msgRoom = (m.roomId || buildRoomId(m.senderId, m.receiverId)).toLowerCase().trim();
        const sNorm = normalizeUserId(m.senderId);
        const rNorm = normalizeUserId(m.receiverId);

        const isTargetRoom = (targetRoom && msgRoom === targetRoom) ||
          (readerId && (sNorm === readerId || rNorm === readerId)) ||
          (targetRoom && (targetRoom.includes(sNorm) || targetRoom.includes(rNorm)));

        if (isTargetRoom) {
          return { ...m, isRead: true, status: 'read' as const };
        }
        return m;
      }));
    };

    if (socket) {
      socket.on('user_typing', handleUserTyping);
      socket.on('user_stop_typing', handleUserStopTyping);
      socket.on('messages_read', handleMessagesRead);
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

    // 🔌 Otomatis join ulang & daftar user saat socket tersambung kembali
    const handleSocketConnect = () => {
      const currentEmail = currentUserRef.current?.email || 'raisa14@gmail.com';
      registerSocketUser(currentEmail);
      if (activeRoomIdRef.current) {
        joinChatRoom(activeRoomIdRef.current, currentEmail);
      }
    };
    if (socket) {
      socket.on('connect', handleSocketConnect);
    }

    // 🔄 4. Fallback Polling Ringan (Jika Socket Terputus/Offline):
    // Jika koneksi WebSocket gagal atau offline -> interval polling ringan setiap 3–4 detik
    // Jika WebSocket terhubung normal -> background polling santai setiap 12 detik
    let lastPollTime = Date.now();
    const interval = setInterval(() => {
      const activeEmail = currentUserRef.current?.email || 'raisa14@gmail.com';
      const isSocketOk = isSocketConnected();
      const requiredInterval = isSocketOk ? 12000 : 3500; // 3.5 detik saat offline/terputus
      const now = Date.now();

      if (now - lastPollTime >= requiredInterval) {
        lastPollTime = now;
        fetchChats(activeEmail, true);
      }
    }, 1000);

    const handleAvatarUpdated = () => {
      const activeEmail = currentUserRef.current?.email || 'raisa14@gmail.com';
      fetchContacts(activeEmail);
      // 🛡️ Jangan panggil fetchChats di sini untuk mencegah cascading event storm
    };
    window.addEventListener('am_avatar_updated', handleAvatarUpdated);

    const handleResetChatView = () => {
      setActiveRoomId(null);
      activeRoomIdRef.current = null;
      setPendingContact(null);
    };
    window.addEventListener('am_reset_chat_view', handleResetChatView);

    return () => {
      unsubscribeCloudStream();
      window.removeEventListener('am_new_cloud_chat', handleNewCloudChatEvent);
      window.removeEventListener('am_message_updated', handleIncomingMessageUpdatedEvent);
      window.removeEventListener('am_message_deleted', handleIncomingMessageDeletedEvent);
      clearInterval(interval);
      window.removeEventListener('am_avatar_updated', handleAvatarUpdated);
      window.removeEventListener('am_reset_chat_view', handleResetChatView);
      window.removeEventListener('am_messages_read', handleLocalMessagesRead);
      window.removeEventListener('am_user_typing', handleLocalUserTyping);
      window.removeEventListener('am_user_stop_typing', handleLocalUserStopTyping);
      if (partnerTypingSafetyTimerRef.current) {
        clearTimeout(partnerTypingSafetyTimerRef.current);
      }

      if (socket) {
        socket.off('new_message', handleSocketIncomingMessage);
        socket.off('receive_message', handleSocketIncomingMessage);
        socket.off('chat_list_update', handleChatListUpdate);
        socket.off('new_chat_notification', handleChatListUpdate);
        socket.off('user_typing', handleUserTyping);
        socket.off('user_stop_typing', handleUserStopTyping);
        socket.off('messages_read', handleMessagesRead);
        socket.off('connect', handleSocketConnect);
      }
      if (activeSoketiUnsubRef.current) {
        try { activeSoketiUnsubRef.current(); } catch (_e) {}
        activeSoketiUnsubRef.current = null;
      }
      activeSoketiChannelRef.current = null;
      currentSubscribedRoomIdRef.current = null;
    };
  }, []);

  // ⚡ Bergabung ke Room WebSocket & Langganan Channel Soketi saat activeRoomId berubah
  useEffect(() => {
    if (!activeRoomId) return;
    activeRoomIdRef.current = activeRoomId;
    joinChatRoom(activeRoomId);
    const s = getSocket();
    if (s && s.connected) {
      s.emit('join_room', activeRoomId);
    }

    const currentEmail = currentUserRef.current?.email || 'raisa14@gmail.com';
    const myNorm = normalizeUserId(currentEmail);
    const parts = activeRoomId.includes('___') ? activeRoomId.split('___') : activeRoomId.split('__');
    const partnerId = parts.length > 1
      ? (parts[0] === myNorm ? parts[1] : parts[0])
      : (activeRoomId === myNorm ? (myNorm === 'udin14@gmail.com' ? 'raisa14@gmail.com' : 'udin14@gmail.com') : activeRoomId);

    const targetRoomId = buildRoomId(myNorm, partnerId);
    const channelName = `chat-room-${targetRoomId}`;

    // 🛡️ Jangan putus koneksi jika masih berada di room yang sama persis
    if (currentSubscribedRoomIdRef.current === targetRoomId && activeSoketiChannelRef.current) {
      return;
    }

    // Unsubscribe room sebelumnya HANYA saat berpindah kontak
    if (activeSoketiUnsubRef.current) {
      try { activeSoketiUnsubRef.current(); } catch (_e) {}
      activeSoketiUnsubRef.current = null;
    }
    activeSoketiChannelRef.current = null;
    currentSubscribedRoomIdRef.current = targetRoomId;

    activeSoketiChannelRef.current = getSoketiRoomChannel(myNorm, partnerId);

    activeSoketiUnsubRef.current = subscribeToSoketiRoom(myNorm, partnerId, {
      onNewMessage: (incomingMsg: any) => {
        if (!incomingMsg) return;
        const sNorm = normalizeUserId(incomingMsg.senderId || incomingMsg.fromId);
        const rNorm = normalizeUserId(incomingMsg.receiverId || incomingMsg.toId);
        const isMine = sNorm === myNorm || incomingMsg.client_instance_id === CLIENT_INSTANCE_ID;

        // Hindari duplikasi pesan milik sendiri
        if (isMine) return;

        const normalizedMsg: BackendChatMessage = {
          ...incomingMsg,
          id: incomingMsg.id || Date.now(),
          senderId: sNorm,
          receiverId: rNorm,
          roomId: incomingMsg.roomId || targetRoomId,
          text: incomingMsg.text || incomingMsg.content || '',
          content: incomingMsg.content || incomingMsg.text || '',
          createdAt: incomingMsg.createdAt || incomingMsg.created_at || new Date().toISOString()
        };

        setChats(prevChats => {
          const idKey = String(normalizedMsg.id);
          const clientKey = (normalizedMsg as any).client_id != null ? String((normalizedMsg as any).client_id) : '';
          const exists = prevChats.some(c => 
            String(c.id) === idKey ||
            (clientKey && (c as any).client_id != null && String((c as any).client_id) === clientKey)
          );
          if (exists) return prevChats;
          const updated = [...prevChats, normalizedMsg];
          saveScopedLocalChat(myNorm, normalizedMsg);
          saveScopedLocalChat(sNorm, normalizedMsg);
          return updated;
        });

        setIsPartnerTyping(false);
        setIsOtherTyping(false);
        if (partnerTypingSafetyTimerRef.current) {
          clearTimeout(partnerTypingSafetyTimerRef.current);
        }
        playNotificationSound('receive');
      },
      onMessageUpdated: (data) => {
        window.dispatchEvent(new CustomEvent('am_message_updated', { detail: data }));
      },
      onMessageDeleted: (data) => {
        window.dispatchEvent(new CustomEvent('am_message_deleted', { detail: data }));
      },
      onReactionAdded: (data) => {
        window.dispatchEvent(new CustomEvent('am_chat_reaction', { detail: data }));
      },
      onTyping: (data: any) => {
        const incomingSenderId = normalizeUserId(String(data.userId || data.senderId || ''));
        if (incomingSenderId && incomingSenderId === myNorm) return;

        const isTyping = data.isTyping !== undefined ? Boolean(data.isTyping) : true;
        if (isTyping) {
          const senderDisplayName = data.name || data.userName || activeRoom?.otherName || 'Lawan bicara';
          setTypingPartnerName(senderDisplayName);
          setIsPartnerTyping(true);
          setIsOtherTyping(true);
          if (partnerTypingSafetyTimerRef.current) {
            clearTimeout(partnerTypingSafetyTimerRef.current);
          }
          partnerTypingSafetyTimerRef.current = setTimeout(() => {
            setIsPartnerTyping(false);
            setIsOtherTyping(false);
          }, 2500);
        } else {
          setIsPartnerTyping(false);
          setIsOtherTyping(false);
          if (partnerTypingSafetyTimerRef.current) {
            clearTimeout(partnerTypingSafetyTimerRef.current);
          }
        }
      }
    });

    // ⚡ Direct bind ke instance channel Soketi untuk responsivitas seketika
    if (activeSoketiChannelRef.current && typeof activeSoketiChannelRef.current.bind === 'function') {
      try {
        activeSoketiChannelRef.current.bind('client-typing', (data: any) => {
          const incomingSenderId = normalizeUserId(String(data.userId || data.senderId || ''));
          if (incomingSenderId && incomingSenderId !== myNorm) {
            setTypingPartnerName(data.name || data.userName || activeRoom?.otherName || 'Lawan bicara');
            setIsPartnerTyping(true);
            setIsOtherTyping(true);
            if (partnerTypingSafetyTimerRef.current) clearTimeout(partnerTypingSafetyTimerRef.current);
            partnerTypingSafetyTimerRef.current = setTimeout(() => {
              setIsPartnerTyping(false);
              setIsOtherTyping(false);
            }, 2500);
          }
        });

        activeSoketiChannelRef.current.bind('NewMessage', (incomingMsg: any) => {
          if (!incomingMsg) return;
          const sNorm = normalizeUserId(incomingMsg.senderId || incomingMsg.fromId);
          if (sNorm === myNorm || incomingMsg.client_instance_id === CLIENT_INSTANCE_ID) return;

          setChats(prevChats => {
            const idKey = String(incomingMsg.id);
            const exists = prevChats.some(c => String(c.id) === idKey);
            if (exists) return prevChats;
            const updated = [...prevChats, incomingMsg];
            saveScopedLocalChat(myNorm, incomingMsg);
            return updated;
          });
          setIsPartnerTyping(false);
          setIsOtherTyping(false);
        });
      } catch (_e) {}
    }
  }, [activeRoomId]);

  const rooms = useMemo(() => {
    if (!currentUser) return [];
    const myNorm = normalizeUserId(currentUser.email);
    const myNameClean = String(currentUser.nama || currentUser.name || '').toLowerCase().trim();
    const roomMap = new Map<string, RoomInfo>();

    const contactMap = new Map<string, Contact>();
    contacts.forEach(ct => {
      contactMap.set(normalizeUserId(ct.email), ct);
    });

    chats.forEach(c => {
      const senderNorm = normalizeUserId(c.senderId);
      const receiverNorm = normalizeUserId(c.receiverId);

      if (senderNorm !== myNorm && receiverNorm !== myNorm) {
        return;
      }

      const isSender = senderNorm === myNorm;
      const otherId = isSender ? receiverNorm : senderNorm;
      if (!otherId || otherId === myNorm) return;

      const rId = buildRoomId(myNorm, otherId);

      if (!roomMap.has(rId)) {
        roomMap.set(rId, {
          roomId: rId,
          otherId,
          otherName: otherId,
          otherRole: 'buyer',
          otherAvatar: getUserAvatar(otherId, otherId, 'buyer'),
          messages: []
        });
      }
      roomMap.get(rId)!.messages.push(c);
    });

    // 🎯 Sempurnakan nama lawan bicara (partner) dari pesan nyata di setiap room
    roomMap.forEach((room) => {
      const otherId = room.otherId;
      const matchedContact = contactMap.get(otherId);

      // Cari nama lawan bicara langsung dari pesan yang dikirim oleh partner
      const incomingPartnerMsgs = room.messages.filter(m => {
        const sNorm = normalizeUserId(m.senderId || (m as any).fromId);
        return sNorm === otherId || sNorm !== myNorm;
      });

      const partnerMsg = incomingPartnerMsgs.slice().reverse().find(m => {
        const sName = (m.senderName || (m as any).fromName || '').trim();
        return sName && sName.toLowerCase() !== myNameClean && !sName.toLowerCase().includes('nurmiyaty');
      });

      let finalName = '';
      if (partnerMsg && (partnerMsg.senderName || (partnerMsg as any).fromName)) {
        finalName = (partnerMsg.senderName || (partnerMsg as any).fromName)!.trim();
      } else if (matchedContact?.nama && matchedContact.nama.toLowerCase().trim() !== myNameClean && !matchedContact.nama.toLowerCase().includes('nurmiyaty')) {
        finalName = matchedContact.nama;
      } else if (otherId === 'udin14@gmail.com' || otherId.includes('udin')) {
        finalName = 'Udin (Penjual)';
      } else if (otherId === 'raisa14@gmail.com' || otherId.includes('raisa')) {
        finalName = 'Raisa (Pembeli)';
      } else if (otherId === 'seller_1' || otherId.includes('myammiy')) {
        finalName = 'Myammiy Craft (Katalog Resmi)';
      } else if (otherId === 's1' || otherId.includes('koperasi')) {
        finalName = 'Koperasi Mahasiswa UIN Antasari';
      } else if (otherId === 's2') {
        finalName = 'Toko Siti — Hijab & Aksesoris';
      } else if (otherId === 's3') {
        finalName = 'Habibi Snack Corner';
      } else if (otherId.includes('@')) {
        const rawUname = otherId.split('@')[0].replace(/[0-9]/g, '');
        finalName = rawUname ? rawUname.charAt(0).toUpperCase() + rawUname.slice(1) : otherId.split('@')[0];
      } else {
        finalName = matchedContact?.nama || otherId;
      }

      let finalRole = 'buyer';
      if (partnerMsg?.senderRole) {
        finalRole = partnerMsg.senderRole;
      } else if (matchedContact?.role) {
        finalRole = matchedContact.role;
      } else if (otherId.includes('udin')) {
        finalRole = 'seller';
      } else if (otherId.includes('raisa')) {
        finalRole = 'buyer';
      } else if (otherId.includes('koperasi') || otherId === 's1' || otherId.includes('admin')) {
        finalRole = 'admin';
      } else if (otherId.includes('driver') || otherId.includes('kurir')) {
        finalRole = 'driver';
      } else {
        finalRole = isRoleSeller(finalRole, finalName, otherId) ? 'seller' : 'buyer';
      }

      room.otherName = finalName;
      room.otherRole = finalRole;
      room.otherAvatar = getUserAvatar(otherId, finalName, finalRole, matchedContact?.avatar);
    });

    return Array.from(roomMap.values());
  }, [chats, currentUser, contacts]);

  const activeRoom = useMemo(() => {
    try {
      const myNorm = normalizeUserId(currentUser?.email || 'raisa14@gmail.com');
      const myNameClean = String(currentUser?.nama || currentUser?.name || '').toLowerCase().trim();

      if (pendingContact) {
        const otherNorm = normalizeUserId(pendingContact.email || 'seller_1');
        const rId = buildRoomId(myNorm, otherNorm);
        const existing = rooms.find(r => r.roomId === rId);
        if (existing) return existing;

        const pRole = pendingContact.role?.toLowerCase() || '';
        let resolvedRole = 'buyer';
        if (pRole.includes('admin')) resolvedRole = 'admin';
        else if (pRole.includes('driver') || pRole.includes('kurir')) resolvedRole = 'driver';
        else if (isRoleSeller(pendingContact.role, pendingContact.nama, pendingContact.email)) resolvedRole = 'seller';

        const resolvedName = otherNorm.includes('udin') ? 'Udin (Penjual)' : (otherNorm.includes('raisa') ? 'Raisa (Pembeli)' : (pendingContact.nama || 'Kontak Kampus'));

        return {
          roomId: rId,
          otherId: otherNorm,
          otherName: resolvedName,
          otherRole: resolvedRole,
          otherAvatar: getUserAvatar(otherNorm, resolvedName, resolvedRole, pendingContact.avatar),
          messages: []
        };
      }

      if (activeRoomId) {
        const found = rooms.find(r => (r.roomId || '').toLowerCase().trim() === activeRoomId.toLowerCase().trim());
        if (found) return found;

        // 🛡️ Fallback jika room belum terindeks:
        const parts = activeRoomId.includes('___') ? activeRoomId.split('___') : activeRoomId.split('__');
        const otherId = parts.length > 1
          ? (parts[0] === myNorm ? parts[1] : (parts[1] === myNorm ? parts[0] : parts[0]))
          : (activeRoomId === myNorm ? (myNorm === 'udin14@gmail.com' ? 'raisa14@gmail.com' : 'udin14@gmail.com') : activeRoomId);

        if (otherId) {
          const roomMessages = (chats || []).filter(m => {
            if (!m) return false;
            const sNorm = normalizeUserId(m.senderId || (m as any).fromId);
            const rNorm = normalizeUserId(m.receiverId || (m as any).toId);
            return (sNorm === myNorm && rNorm === otherId) || (sNorm === otherId && rNorm === myNorm) || m.roomId === activeRoomId;
          });

          const incomingPartnerMsg = roomMessages.slice().reverse().find(m => {
            const sNorm = normalizeUserId(m.senderId || (m as any).fromId);
            const sName = (m.senderName || (m as any).fromName || '').trim();
            return sNorm === otherId && sName && sName.toLowerCase() !== myNameClean && !sName.toLowerCase().includes('nurmiyaty');
          });

          const matchedContact = contacts.find(ct => normalizeUserId(ct.email) === otherId);
          const otherName = incomingPartnerMsg?.senderName || (otherId === 'udin14@gmail.com' || otherId.includes('udin') ? 'Udin (Penjual)' : (otherId === 'raisa14@gmail.com' || otherId.includes('raisa') ? 'Raisa (Pembeli)' : (otherId === 'seller_1' ? 'Myammiy Craft (Katalog Resmi)' : (matchedContact?.nama || otherId))));
          const otherRole = incomingPartnerMsg?.senderRole || (matchedContact?.role || (otherId.includes('udin') ? 'seller' : 'buyer'));

          return {
            roomId: activeRoomId,
            otherId,
            otherName,
            otherRole,
            otherAvatar: getUserAvatar(otherId, otherName, otherRole, matchedContact?.avatar),
            messages: roomMessages
          };
        }
      }
    } catch (err) {
      console.error('Error calculating activeRoom:', err);
    }
    return null;
  }, [rooms, activeRoomId, pendingContact, currentUser, contacts, chats]);

  // 🚪 Sinkronisasi Listener am_open_chat_room & am_target_chat_room setelah rooms terinisialisasi
  useEffect(() => {
    const handleOpenRoomEvent = (e: any) => {
      const targetRoomId = e?.detail?.roomId || e?.detail;
      const senderId = e?.detail?.senderId;
      const senderName = e?.detail?.senderName;
      const senderRole = e?.detail?.senderRole;
      const senderAvatar = e?.detail?.senderAvatar;

      if (targetRoomId) {
        setActiveRoomId(targetRoomId);
        activeRoomIdRef.current = targetRoomId;
        markRoomAsRead(targetRoomId);
        onRoomActiveChange?.(true);
      }
      if (senderId && (!targetRoomId || !rooms.some(r => r.roomId === targetRoomId))) {
        const myIdentifier = currentUserRef.current?.email || 'raisa14@gmail.com';
        const myNorm = normalizeUserId(myIdentifier);
        const targetEmail = normalizeUserId(senderId);
        const rId = targetRoomId || buildRoomId(myNorm, targetEmail);
        setActiveRoomId(rId);
        activeRoomIdRef.current = rId;
        setPendingContact({
          id: Date.now(),
          nama: senderName || targetEmail,
          email: targetEmail,
          role: senderRole || 'seller',
          avatar: senderAvatar
        });
        onRoomActiveChange?.(true);
      }
    };

    const handleStorageChange = () => {
      const targetRoomStr = localStorage.getItem('am_target_chat_room');
      if (targetRoomStr) {
        setActiveRoomId(targetRoomStr);
        activeRoomIdRef.current = targetRoomStr;
        markRoomAsRead(targetRoomStr);
        localStorage.removeItem('am_target_chat_room');
        onRoomActiveChange?.(true);
      }
    };

    window.addEventListener('am_open_chat_room', handleOpenRoomEvent);
    window.addEventListener('focus', handleStorageChange);
    return () => {
      window.removeEventListener('am_open_chat_room', handleOpenRoomEvent);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, [rooms, onRoomActiveChange]);

  // 🛡️ Deduplikasi Ketat Pesan yang Ditampilkan di Bubble Chat (100% Anti-Doubling)
  const displayedMessages = useMemo(() => {
    const seen = new Set<string>();
    const result: BackendChatMessage[] = [];

    (activeRoom?.messages || []).forEach((m: any) => {
      if (!m) return;
      const textClean = (m.text || m.content || '').trim();
      const rawTime = m.time || m.createdAt || m.created_at || '';
      const normTime = format24HourTime(rawTime);
      const timeKey = normTime ? normTime.substring(0, 5) : (m.time || '').substring(0, 5);
      const rawSender = String(m.senderId || m.sender_id || (m as any).fromId || '');
      const senderKey = normalizeUserId(rawSender) || rawSender;

      // Fingerprint gabungan: ID unik ATAU (Pengirim + Teks + Menit)
      const uniqueKey = m.id ? String(m.id) : `${senderKey}_${textClean}_${timeKey}`;
      const contentKey = `${senderKey}_${textClean}_${timeKey}`;

      if (!seen.has(uniqueKey) && !seen.has(contentKey)) {
        seen.add(uniqueKey);
        if (textClean) seen.add(contentKey);
        result.push(m);
      }
    });

    return result;
  }, [activeRoom?.messages]);

  // 👀 Watcher: Otomatis tandai pesan sebagai sudah dibaca saat ruang obrolan dibuka/aktif dan pesan baru tampil di layar
  useEffect(() => {
    if (!activeRoom?.roomId || !currentUser) return;
    const myNorm = normalizeUserId(currentUser.email);
    const hasUnreadPartner = displayedMessages.some(m => {
      const senderNorm = normalizeUserId(m.senderId);
      return senderNorm !== myNorm && (m.isRead !== true || m.status !== 'read');
    });
    if (hasUnreadPartner) {
      markRoomAsRead(activeRoom.roomId);
    }
  }, [activeRoom?.roomId, displayedMessages, currentUser]);

  useEffect(() => {
    scrollToBottom('auto');
  }, [displayedMessages.length, activeRoomId, isOtherTyping, selectedImagePreview]);

  const isCurrentRoomHandedOver = useMemo(() => {
    return activeRoom ? Boolean(handovers[activeRoom.roomId]) : false;
  }, [activeRoom, handovers]);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setInAppToast({
        title: '⚠️ Ukuran File Terlalu Besar',
        desc: 'Maksimal ukuran gambar yang dapat dikirim adalah 5MB.'
      });
      setTimeout(() => setInAppToast(null), 3000);
      e.target.value = '';
      return;
    }

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
    if (!currentUser) return;

    const myNorm = normalizeUserId(currentUser.email || 'raisa14@gmail.com');
    const otherNorm = normalizeUserId(activeRoom?.otherId || 'udin14@gmail.com');
    const targetRoomId = activeRoom?.roomId || buildRoomId(myNorm, otherNorm);
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgId = Date.now();

    const storedAvatar = typeof window !== 'undefined' ? localStorage.getItem('am_user_avatar') : null;
    const myAvatar = getUserAvatar(myNorm, currentUser.nama || currentUser.name, currentUser.role, storedAvatar || currentUser.avatar);
    const partnerName = activeRoom?.otherName || 'Udin (Penjual)';
    const partnerRole = activeRoom?.otherRole || 'seller';
    const partnerAvatar = getUserAvatar(otherNorm, partnerName, partnerRole, activeRoom?.otherAvatar);

    const newLocalMsg: BackendChatMessage & any = {
      id: msgId,
      temp_id: msgId,
      roomId: targetRoomId,
      room_id: targetRoomId,
      senderId: myNorm,
      sender_id: myNorm,
      senderName: currentUser.nama || currentUser.name || (myNorm === 'raisa14@gmail.com' ? 'Raisa' : myNorm === 'udin14@gmail.com' ? 'Udin' : 'Pengguna'),
      sender_name: currentUser.nama || currentUser.name || (myNorm === 'raisa14@gmail.com' ? 'Raisa' : myNorm === 'udin14@gmail.com' ? 'Udin' : 'Pengguna'),
      senderRole: currentUser.role || (myNorm === 'udin14@gmail.com' ? 'seller' : 'buyer'),
      sender_role: currentUser.role || (myNorm === 'udin14@gmail.com' ? 'seller' : 'buyer'),
      senderAvatar: myAvatar,
      receiverId: otherNorm,
      receiver_id: otherNorm,
      receiverName: partnerName,
      receiver_name: partnerName,
      receiverRole: partnerRole,
      receiver_role: partnerRole,
      receiverAvatar: partnerAvatar,
      text: msgPayload.text,
      content: msgPayload.text,
      is_self: true, // Flag pasti untuk bubble kanan (Outgoing)
      isSelf: true,
      time: timeNow,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      mediaType: msgPayload.mediaType || 'text',
      mediaUrl: msgPayload.mediaUrl,
      audioDuration: msgPayload.audioDuration,
      status: 'sent'
    };

    // Hentikan typing timer saat pesan dikirim
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isCurrentlyTypingRef.current) {
      isCurrentlyTypingRef.current = false;
      const myName = currentUser.nama || currentUser.name || 'Pengguna';
      sendTypingStop(targetRoomId, myNorm, myName);
    }
    emitTypingToSocket(false);

    saveScopedLocalChat(myNorm, newLocalMsg);
    saveScopedLocalChat(otherNorm, { ...newLocalMsg, isRead: false });

    setChats(prev => {
      const exists = prev.some(c => c.id === msgId);
      if (exists) return prev;
      return [...prev, newLocalMsg];
    });

    playNotificationSound('send');

    // ⚡ Siarkan pesan baru ke Soketi Room Channel Real-Time
    try {
      broadcastSoketiAction(myNorm, otherNorm, 'NewMessage', newLocalMsg);
      if (activeSoketiChannelRef.current && typeof activeSoketiChannelRef.current.trigger === 'function') {
        activeSoketiChannelRef.current.trigger('client-NewMessage', newLocalMsg);
      }
    } catch (_e) {}

    // ⚡ Kirim pesan secara instan via WebSocket
    sendSocketMessage({
      roomId: targetRoomId,
      senderId: myNorm,
      senderName: currentUser.nama || currentUser.name || 'Pengguna',
      senderRole: currentUser.role || 'buyer',
      receiverId: otherNorm,
      receiverName: activeRoom.otherName,
      receiverRole: activeRoom.otherRole,
      text: msgPayload.text,
      time: timeNow,
      createdAt: newLocalMsg.createdAt
    });

    try {
      await sendChatApi({
        id: msgId,
        fromId: myNorm,
        fromName: currentUser.nama || currentUser.name || 'Pengguna',
        fromRole: currentUser.role || 'buyer',
        fromAvatar: myAvatar,
        toId: otherNorm,
        toName: activeRoom.otherName,
        toRole: activeRoom.otherRole,
        toAvatar: partnerAvatar,
        text: msgPayload.text,
        mediaType: msgPayload.mediaType,
        mediaUrl: msgPayload.mediaUrl,
        audioDuration: msgPayload.audioDuration
      });
    } catch (_err) {
      console.warn('Chat disimpan lokal & siap disinkronkan.');
    }

    if (pendingContact) setPendingContact(null);
    setActiveRoomId(targetRoomId);

    const otherId = otherNorm;
    const otherName = activeRoom.otherName;
    const otherRole = activeRoom.otherRole;

    // 🛡️ ATURAN KETAT ASISTEN AI (Penjual Sah, Pembeli Murni Manusia):
    // 1. Asisten AI HANYA diizinkan untuk akun PENJUAL (Toko/Merchant) atau ADMIN Toko Resmi.
    // 2. PEMBELI adalah 100% manusia asli dan TIDAK PERNAH memiliki / membalas dengan agen AI!
    // 3. Jika Pengirim adalah Penjual (menjawab pembeli) -> AI TIDAK BOLEH membalas pembeli secara otomatis.
    // 4. Jika Penerima adalah Pembeli -> AI TIDAK BOLEH membalas atas nama pembeli!
    // 5. Jika AI sedang dinonaktifkan / Handover Live Admin aktif -> AI tidak membalas.

    const isSenderSellerOrAdmin = isRoleSeller(currentUser?.role, currentUser?.nama, currentUser?.email) || currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'driver';
    const isReceiverSellerOrAdmin = isRoleSeller(otherRole, otherName, otherId) || otherRole === 'admin' || otherRole === 'super_admin';
    const isReceiverBuyer = isRoleBuyer(otherRole, otherName, otherId);

    // Jika mode engine adalah Vue FrankenPHP, jangan jalankan simulasi balasan AI di React (Vue mengelolanya sendiri)
    if (chatEngine === 'vue_franken') return;

    const shouldRunSellerAI = !isSenderSellerOrAdmin && isReceiverSellerOrAdmin && !isReceiverBuyer && !handovers[targetRoomId];

    if (!shouldRunSellerAI) {
      // Selesai. Pengirim atau penerima adalah manusia asli (penjual ke pembeli, pembeli ke pembeli, kurir, dsb). Tidak ada AI untuk pembeli!
      return;
    }

    const buyerName = currentUser.nama || currentUser.name || 'Kakak';
    const lowerText = msgPayload.text.toLowerCase();

    // 🛡️ KUNCI PEMICU AI (DEBOUNCE & LOCKING):
    // Cegah pemanggilan paralel atau pemicu ganda dari klien & auto-pilot
    const userMsgKey = `${targetRoomId}__${myNorm}__${msgPayload.text.trim()}`;
    if (isAiReplyingRef.current || lastAiRepliedUserMsgKeyRef.current === userMsgKey) {
      console.warn('🛡️ [ChatPage] AI auto-reply dicegah: sedang membalas atau pesan sudah dijawab.');
      return;
    }

    if (aiReplyTimerRef.current) {
      clearTimeout(aiReplyTimerRef.current);
      aiReplyTimerRef.current = null;
    }

    isAiReplyingRef.current = true;
    lastAiRepliedUserMsgKeyRef.current = userMsgKey;
    lastAutoRepliedMsgIdRef.current = userMsgKey;

    const isHandoverIntent = HANDOVER_KEYWORDS.some(kw => lowerText.includes(kw));
    const isClosing = CLOSING_KEYWORDS.some(kw => lowerText.includes(kw));

    setIsOtherTyping(true);

    aiReplyTimerRef.current = setTimeout(async () => {
      let aiReplyText = '';
      let msgType: 'text' | 'system' | 'handover_card' = 'text';

      try {
        if (isHandoverIntent) {
          aiReplyText = `Halo Kak ${buyerName}! Apakah Kakak ingin saya bantu jawab otomatis, atau ingin langsung berbicara dengan Admin Toko (Manusia Asli)?`;
          msgType = 'handover_card';
        } else if (isClosing) {
          aiReplyText = `Wah, siap Kak ${buyerName}! 🌸 Percakapan ini sekarang sudah otomatis kami alihkan ke Admin Penjual ${otherName} untuk proses konfirmasi order & transaksi lebih lanjut yaa. Admin kami akan segera membalas di sini. Terima kasih banyak dan happy shopping! 🥰✨`;
          setRoomHandover(targetRoomId, true);
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

        if (aiReplyText) {
          const aiMsgTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const aiMsgId = Date.now() + 1;
          const aiMsg: BackendChatMessage = {
            id: aiMsgId,
            roomId: targetRoomId,
            senderId: otherId,
            senderName: msgType === 'handover_card' ? `${otherName} (Asisten AI)` : otherName,
            senderRole: isCurrentRoomHandedOver ? (otherRole || 'seller') : 'ai',
            receiverId: myNorm,
            receiverName: currentUser.nama || currentUser.name || 'Pengguna',
            receiverRole: currentUser.role || 'buyer',
            text: aiReplyText,
            time: aiMsgTime,
            createdAt: new Date().toISOString(),
            status: 'sent',
            isRead: false,
            type: msgType,
            handover_options: msgType === 'handover_card'
          };

          // 1. Simpan ke local storage kedua akun (Pembeli & Penjual)
          saveScopedLocalChat(myNorm, aiMsg);
          saveScopedLocalChat(otherId, aiMsg);
          setChats(prev => {
            // 🛡️ DEDUPING RESIDUAL: cegah 2 pesan AI masuk dalam selisih waktu < 3.5 detik
            const lastInRoom = [...prev].reverse().find(c => {
              const cRoom = (c.roomId || buildRoomId(c.senderId, c.receiverId)).toLowerCase().trim();
              return cRoom === targetRoomId;
            });
            if (lastInRoom) {
              const isLastAi = lastInRoom.senderRole === 'ai' || (lastInRoom as any).sender_role === 'ai' || lastInRoom.senderId === 'myammiy_ai' || (lastInRoom.senderName && lastInRoom.senderName.toLowerCase().includes('asisten'));
              const lastTime = lastInRoom.createdAt ? new Date(lastInRoom.createdAt).getTime() : 0;
              const thisTime = new Date(aiMsg.createdAt || Date.now()).getTime();
              if (isLastAi && (Math.abs(thisTime - lastTime) < 3500 || (lastInRoom.text && aiReplyText && lastInRoom.text.trim() === aiReplyText.trim()))) {
                console.warn('🛡️ [ChatPage] Blocked duplicate AI burst reply in setChats');
                return prev;
              }
            }

            const timeKey = format24HourTime(aiMsgTime).substring(0, 5);
            const contentKey = `${otherId}__${aiReplyText.trim()}__${timeKey}`;
            const exists = prev.some(c => {
              if (c.id === aiMsgId) return true;
              const cTimeKey = format24HourTime(c.time || c.createdAt).substring(0, 5);
              const cSender = normalizeUserId(c.senderId);
              const cText = (c.text || '').trim();
              return `${cSender}__${cText}__${cTimeKey}` === contentKey;
            });
            if (exists) return prev;
            return [...prev, aiMsg];
          });
          playNotificationSound('receive');

          // 2. Kirim via WebSocket agar Penjual menerima secara realtime
          sendSocketMessage({
            roomId: targetRoomId,
            senderId: otherId,
            senderName: otherName,
            senderRole: isCurrentRoomHandedOver ? (otherRole || 'seller') : 'ai',
            receiverId: myNorm,
            receiverName: currentUser.nama || currentUser.name || 'Pengguna',
            receiverRole: currentUser.role || 'buyer',
            text: aiReplyText,
            time: aiMsgTime,
            createdAt: aiMsg.createdAt
          });

          // 3. Notifikasi pop-up (hanya jika user tidak sedang fokus di room ini)
          const isViewingAiRoom = activeRoomIdRef.current && (activeRoomIdRef.current.toLowerCase().trim() === targetRoomId.toLowerCase().trim());
          const aiMsgIdStr = String(aiMsg.id || Date.now());
          if (!isViewingAiRoom && !notifiedMsgIdsRef.current.has(aiMsgIdStr)) {
            notifiedMsgIdsRef.current.add(aiMsgIdStr);
            window.dispatchEvent(new CustomEvent('am_trigger_notification', {
              detail: {
                id: aiMsgIdStr,
                senderId: otherId,
                senderName: otherName,
                senderRole: 'ai',
                senderAvatar: getUserAvatar(otherId, otherName, 'seller', activeRoom.otherAvatar),
                roomId: targetRoomId,
                text: `💬 ${otherName}: ${aiReplyText}`,
                time: aiMsgTime,
                isAi: !isCurrentRoomHandedOver
              }
            }));
          }

          // 4. Simpan ke Backend database & Cloud Sync
          try {
            await sendChatApi({
              id: aiMsgId,
              fromId: otherId,
              fromName: otherName,
              fromRole: isCurrentRoomHandedOver ? (otherRole || 'seller') : 'ai',
              toId: myNorm,
              toName: currentUser.nama || currentUser.name || 'Pengguna',
              toRole: currentUser.role || 'buyer',
              text: aiReplyText
            });
          } catch (_err) {}
        }
      } catch (err) {
        console.error('❌ AI Reply Error:', err);
      } finally {
        setIsOtherTyping(false);
        // Reset flag locking setelah jeda aman 2.5 detik
        setTimeout(() => {
          isAiReplyingRef.current = false;
        }, 2500);
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

  const handleGenerateSellerAiReply = async (customPrompt?: string) => {
    if (isGeneratingAiReply || !activeRoom || !currentUser) return;
    setIsGeneratingAiReply(true);
    try {
      const myNorm = normalizeUserId(currentUser.email);
      const lastOtherMsg = [...displayedMessages].reverse().find(m => normalizeUserId(m.senderId) !== myNorm);
      const query = customPrompt || (lastOtherMsg ? lastOtherMsg.text : 'Halo kak, apakah stok produk masih ready?');

      const res = await askSellerAIApi({
        sellerId: myNorm,
        sellerName: currentUser.nama || currentUser.name || 'Penjual Antasari',
        sellerRole: currentUser.role || 'seller',
        buyerName: activeRoom.otherName || 'Kakak',
        message: query,
        history: displayedMessages
      });

      if (res && res.success && res.reply && res.reply.trim()) {
        setMessageInput(res.reply.trim());
      } else {
        setMessageInput(`Halo Kak ${activeRoom.otherName}! Stok produk kerajinan kami ready dan siap dipesan atau diambil di Vending Machine yaa! 🌸✨`);
      }
    } catch (_e) {
      setMessageInput(`Halo Kak ${activeRoom.otherName}! Stok kami ready dan bisa langsung COD di kampus yaa! 🌸✨`);
    } finally {
      setIsGeneratingAiReply(false);
    }
  };

  // 🤖 Auto-Pilot AI Penjual: Otomatis Menjawab Pesan Pembeli jika Diaktifkan
  useEffect(() => {
    if (!isAutoPilotEnabled || !currentUser || !activeRoom) return;
    if (isGeneratingAiReply || isOtherTyping || isAiReplyingRef.current) return;
    if (isCurrentRoomHandedOver) return;

    // 🛡️ Mencegah Bot Auto-Reply Terpanggil Ganda:
    // Nonaktifkan pemicu AI bot otomatis jika room chat dibuka antar akun pengguna nyata (Raisa <-> Udin).
    // Bot hanya boleh merespons jika lawan bicara adalah akun official bot AI (`udin-ai` atau role `ai`).
    const otherIdNorm = normalizeUserId(activeRoom.otherId || '');
    const isAiPartner = otherIdNorm.includes('udin-ai') || otherIdNorm === 'ai' || activeRoom.otherRole === 'ai';
    if (!isAiPartner) return;

    const isSeller = isRoleSeller(currentUser.role, currentUser.nama || currentUser.name, currentUser.email);
    if (!isSeller) return;

    const myNorm = normalizeUserId(currentUser.email);
    const lastMsg = displayedMessages[displayedMessages.length - 1];
    if (!lastMsg) return;

    // Filter ketat: Hanya jawab pesan pembeli murni, jangan jawab pesan sendiri, sesama penjual, atau pesan AI
    if (lastMsg.senderRole === 'ai') return;
    const isFromMe = normalizeUserId(lastMsg.senderId) === myNorm;
    if (isFromMe) return;

    const isLastSenderSeller = isRoleSeller(lastMsg.senderRole, lastMsg.senderName, lastMsg.senderId);
    if (isLastSenderSeller) return;

    const fpKey = createChatFingerprint(lastMsg);
    const msgKey = lastMsg.id ? String(lastMsg.id) : fpKey;
    if (
      lastAutoRepliedMsgIdRef.current === msgKey ||
      lastAutoRepliedMsgIdRef.current === fpKey ||
      lastAiRepliedUserMsgKeyRef.current === msgKey ||
      lastAiRepliedUserMsgKeyRef.current === fpKey
    ) return;

    const autoTimer = setTimeout(async () => {
      if (!isAutoPilotEnabled || lastAutoRepliedMsgIdRef.current === msgKey || lastAutoRepliedMsgIdRef.current === fpKey || isAiReplyingRef.current) return;
      lastAutoRepliedMsgIdRef.current = fpKey;
      lastAiRepliedUserMsgKeyRef.current = fpKey;
      setIsGeneratingAiReply(true);

      try {
        const res = await askSellerAIApi({
          sellerId: myNorm,
          sellerName: currentUser.nama || currentUser.name || 'Penjual Antasari',
          sellerRole: currentUser.role || 'seller',
          buyerName: activeRoom.otherName || 'Kakak',
          message: lastMsg.text,
          history: displayedMessages
        });

        if (res && res.success && res.reply && res.reply.trim()) {
          dispatchOutgoingMessage({ text: res.reply.trim() });
        }
      } catch (_err) {
        console.warn('Gagal merespons via Auto-Pilot AI:', _err);
      } finally {
        setIsGeneratingAiReply(false);
      }
    }, 1800);

    return () => {
      clearTimeout(autoTimer);
    };
  }, [
    displayedMessages.length,
    isAutoPilotEnabled,
    activeRoom?.roomId,
    isGeneratingAiReply,
    isOtherTyping,
    isCurrentRoomHandedOver
  ]);

  const handleQuickSwitchAccount = (email: string, name: string, role: string) => {
    const cleanEmail = normalizeUserId(email);
    const newUser = {
      id: cleanEmail === 'udin14@gmail.com' ? 102 : cleanEmail === 'raisa14@gmail.com' ? 101 : Date.now(),
      nama: name,
      name: name,
      email: cleanEmail,
      role: role,
      roles: [role],
      avatar: getUserAvatar(cleanEmail, name, role)
    };

    localStorage.setItem('am_user_session', JSON.stringify(newUser));
    localStorage.setItem('am_current_user', JSON.stringify(newUser));
    localStorage.setItem('am_user_name', name);
    localStorage.setItem('am_user_avatar', newUser.avatar);

    setCurrentUser(newUser);
    currentUserRef.current = newUser;

    fetchContacts(cleanEmail);
    fetchChats(cleanEmail);

    // Buka room otomatis jika ada percakapan relevan
    const partnerEmail = cleanEmail === 'udin14@gmail.com' ? 'raisa14@gmail.com' : 'udin14@gmail.com';
    const targetRoom = buildRoomId(cleanEmail, partnerEmail);
    setActiveRoomId(targetRoom);
    activeRoomIdRef.current = targetRoom;

    window.dispatchEvent(new CustomEvent('am_user_changed', { detail: newUser }));
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
      scrollToBottom('smooth');
    }, 150);
  };

  // Filter Contacts
  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.nama.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.role.toLowerCase().includes(contactSearch.toLowerCase());
    
    if (activeCategoryFilter === 'all') return matchesSearch;
    if (activeCategoryFilter === 'buyer') return matchesSearch && isRoleBuyer(c.role, c.nama, c.email);
    if (activeCategoryFilter === 'seller') return matchesSearch && isRoleSeller(c.role, c.nama, c.email);
    if (activeCategoryFilter === 'driver') return matchesSearch && (c.role === 'driver' || c.role === 'kurir' || c.email.includes('driver'));
    if (activeCategoryFilter === 'admin') return matchesSearch && (c.role === 'admin' || c.role === 'super_admin' || c.email.includes('admin'));
    return matchesSearch;
  });

  // Filter Rooms
  const filteredRooms = rooms.filter(r => {
    const matchesSearch = r.otherName.toLowerCase().includes(contactSearch.toLowerCase()) ||
      r.otherId.toLowerCase().includes(contactSearch.toLowerCase()) ||
      r.messages.some(m => m.text?.toLowerCase().includes(contactSearch.toLowerCase()));
    
    if (activeCategoryFilter === 'all') return matchesSearch;
    if (activeCategoryFilter === 'buyer') return matchesSearch && isRoleBuyer(r.otherRole, r.otherName, r.otherId);
    if (activeCategoryFilter === 'seller') return matchesSearch && isRoleSeller(r.otherRole, r.otherName, r.otherId);
    if (activeCategoryFilter === 'driver') return matchesSearch && (r.otherRole === 'driver' || r.otherRole === 'kurir' || r.otherId.includes('driver'));
    if (activeCategoryFilter === 'admin') return matchesSearch && (r.otherRole === 'admin' || r.otherRole === 'super_admin' || r.otherId.includes('admin'));
    return matchesSearch;
  });

  return (
    <div ref={pageRootRef} className="am-chat-page-root">
      <style>{`
        .am-chat-page-root {
          display: flex;
          height: 100vh;
          height: 100dvh;
          max-height: 100dvh;
          width: 100%;
          margin: 0;
          background: var(--am-surface, #ffffff);
          overflow: hidden;
          position: relative;
          font-family: var(--am-font-body);
          box-sizing: border-box;
          border: none;
        }

        .am-chat-sidebar-pane {
          width: 290px;
          min-width: 280px;
          max-width: 380px;
          height: 100%;
          flex-shrink: 0;
          border-right: 1px solid var(--am-border, #e8e1d5);
          background: var(--am-bg, #faf7f2);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-sizing: border-box;
        }

        @media (min-width: 1024px) {
          .am-chat-sidebar-pane {
            width: 350px;
          }
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
          box-sizing: border-box;
        }

        .am-filter-pill {
          background: var(--am-surface, #ffffff);
          color: var(--am-text-muted, #64748B);
          border: 1px solid var(--am-border, #e8e1d5);
          transition: all 0.15s ease;
          white-space: nowrap;
          user-select: none;
        }

        .am-filter-pill.active {
          background: var(--am-primary, #10B981) !important;
          color: #ffffff !important;
          border-color: var(--am-primary, #10B981) !important;
          box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
        }

        @media (max-width: 768px) {
          .am-chat-page-root {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: ${activeRoom ? '0 !important' : 'calc(60px + env(safe-area-inset-bottom, 0px)) !important'};
            width: 100vw !important;
            height: ${activeRoom ? '100% !important; height: 100dvh !important' : 'calc(100dvh - 60px - env(safe-area-inset-bottom, 0px)) !important'};
            max-height: none !important;
            border-radius: 0 !important;
            border: none !important;
            z-index: 100 !important;
            background: var(--am-bg, #faf7f2) !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
            margin: 0 !important;
          }
          .am-chat-sidebar-pane {
            width: 100% !important;
            max-width: 100% !important;
            height: 100% !important;
            flex: 1;
            display: ${activeRoom ? 'none' : 'flex'} !important;
            flex-direction: column !important;
            padding-bottom: 0px !important;
            box-sizing: border-box;
            overflow: hidden !important;
            background: var(--am-bg, #faf7f2) !important;
          }
          .am-chat-content-pane {
            width: 100% !important;
            height: 100% !important;
            height: 100dvh !important;
            flex: 1;
            display: ${activeRoom ? 'flex' : 'none'} !important;
            flex-direction: column !important;
            overflow: hidden !important;
            position: relative;
            background: var(--am-surface, #ffffff) !important;
          }
        }

        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
        }
        .no-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
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

        .am-chat-bubble-user .am-chat-check-read {
          color: #34B7F1 !important;
          font-weight: 800 !important;
          font-size: 12px !important;
          letter-spacing: -1.5px !important;
          display: inline-block !important;
          filter: drop-shadow(0 0 1px rgba(0,0,0,0.2)) !important;
        }

        .am-chat-bubble-user .am-chat-check-delivered {
          color: rgba(255, 255, 255, 0.75) !important;
          font-weight: 700 !important;
          font-size: 12px !important;
          letter-spacing: -1.5px !important;
          display: inline-block !important;
        }

        .am-chat-bubble-user .am-chat-check-sent {
          color: rgba(255, 255, 255, 0.75) !important;
          font-weight: 700 !important;
          font-size: 12px !important;
          display: inline-block !important;
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

        @keyframes amTypingPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
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

      {/* 📋 CHAT ENGINE SWITCH: JIKA MODE VUE (FRANKEN), RENDER STANDALONE VUE DENGAN 1 SIDEBAR & 1 CHAT PANE */}
      {chatEngine === 'vue_franken' ? (
        <VueChatWrapper
          roomId={activeRoom?.roomId || getDeterministicRoomId(currentUser?.email || 'raisa14@gmail.com', 'udin14@gmail.com')}
          currentUserId={normalizeUserId(currentUser?.email || 'raisa14@gmail.com')}
          currentUserName={currentUser?.nama || currentUser?.name || 'Raisa'}
          activeRoomName={activeRoom?.otherName}
          activeRoomAvatar={activeRoom ? getUserAvatar(activeRoom.otherId, activeRoom.otherName, activeRoom.otherRole, activeRoom.otherAvatar) : undefined}
          activeRoomRole={activeRoom?.otherRole}
          messages={displayedMessages}
          isPeerTyping={isOtherTyping}
          peerTypingText={isOtherTyping ? 'sedang mengetik...' : undefined}
          onSendMessage={(_text) => {
            // Vue FrankenChat Engine mengelola pengiriman pesan secara internal & mandiri via Upstash/Socket.
            // Tidak memanggil dispatchOutgoingMessage lagi di sini agar tidak terjadi pengiriman duplikat di React host.
          }}
          onBack={onBack}
          onSwitchEngine={() => setChatEngine('default')}
        />
      ) : (
        <>
          {/* 📋 PANE KIRI: DAFTAR OBROLAN & KONTAK (MODE REACT) */}
          <div className="am-chat-sidebar-pane">
        {/* 1. SINGLE CLEAN HEADER (56px) */}
        <div style={{
          height: 56,
          padding: '0 16px',
          background: 'var(--am-surface, #ffffff)',
          borderBottom: '1px solid var(--am-border, #e8e1d5)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
          boxSizing: 'border-box',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {onBack && (
              <button
                onClick={onBack}
                aria-label="Kembali ke Beranda"
                style={{
                  background: 'var(--am-bg2, #f3ece2)',
                  border: '1px solid var(--am-border, #e8e1d5)',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  color: 'var(--am-text)',
                  cursor: 'pointer',
                  fontWeight: 800,
                  flexShrink: 0,
                  transition: 'all 0.15s'
                }}
                title="Kembali ke Beranda"
              >
                ←
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>💬</span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--am-text)', letterSpacing: '-0.2px' }}>
                Obrolan Kampus
              </h3>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Tombol Sinkronisasi */}
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncingCloud}
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                border: '1px solid var(--am-border, #e8e1d5)',
                background: isSyncingCloud ? 'var(--am-primary, #10B981)' : 'var(--am-bg2, #f3ece2)',
                color: isSyncingCloud ? '#FFFFFF' : 'var(--am-text)',
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s'
              }}
              title="Sinkronkan Obrolan"
            >
              <span style={{ display: 'inline-block', transform: isSyncingCloud ? 'rotate(360deg)' : 'none', transition: 'transform 0.5s linear' }}>🔄</span>
            </button>

            {/* Tombol Obrolan Baru Icon [+] */}
            <button
              onClick={() => setShowContactPicker(p => !p)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                border: 'none',
                background: showContactPicker ? '#687D70' : 'var(--am-primary, #10B981)',
                color: 'white',
                fontWeight: 800,
                fontSize: 20,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
                flexShrink: 0,
                transition: 'all 0.15s'
              }}
              title={showContactPicker ? 'Tutup Daftar Kontak' : 'Mulai Obrolan Baru'}
            >
              {showContactPicker ? '✕' : '+'}
            </button>
          </div>
        </div>

        {/* 2. PENCARIAN & FILTER (Simetris mx-4 my-2.5) */}
        <div style={{ padding: '10px 16px 6px 16px', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder={showContactPicker ? '🔍 Cari nama kontak...' : '🔍 Cari nama / pesan...'}
              value={contactSearch}
              onChange={e => setContactSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: 12,
                border: '1px solid var(--am-border, #e8e1d5)',
                fontSize: 13,
                boxSizing: 'border-box',
                background: 'var(--am-surface, #ffffff)',
                color: 'var(--am-text)',
                outline: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
            />
          </div>
        </div>

        {/* Filter Role Chips (Rata, tidak terpotong canggung) */}
        <div
          className="no-scrollbar"
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            whiteSpace: 'nowrap',
            padding: '0 16px 10px 16px',
            flexShrink: 0
          }}
        >
          <button
            className={`am-filter-pill ${activeCategoryFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategoryFilter('all')}
            style={{ padding: '6px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
          >
            Semua ({rooms.length})
          </button>
          <button
            className={`am-filter-pill ${activeCategoryFilter === 'buyer' ? 'active' : ''}`}
            onClick={() => setActiveCategoryFilter('buyer')}
            style={{ padding: '6px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
          >
            🛍️ Pembeli
          </button>
          <button
            className={`am-filter-pill ${activeCategoryFilter === 'seller' ? 'active' : ''}`}
            onClick={() => setActiveCategoryFilter('seller')}
            style={{ padding: '6px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
          >
            🏪 Penjual
          </button>
          <button
            className={`am-filter-pill ${activeCategoryFilter === 'driver' ? 'active' : ''}`}
            onClick={() => setActiveCategoryFilter('driver')}
            style={{ padding: '6px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
          >
            🛵 Kurir
          </button>
          <button
            className={`am-filter-pill ${activeCategoryFilter === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveCategoryFilter('admin')}
            style={{ padding: '6px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
          >
            🛡️ Admin
          </button>

          {/* ⚡ Tab Khusus Dual-Engine: Mode Vue (Franken) */}
          <button
            type="button"
            onClick={() => setChatEngine(prev => prev === 'default' ? 'vue_franken' : 'default')}
            style={{
              padding: '6px 12px',
              borderRadius: 12,
              fontSize: 11.5,
              fontWeight: 800,
              cursor: 'pointer',
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              border: chatEngine === 'vue_franken' ? '1.5px solid #42b883' : '1px solid rgba(66, 184, 131, 0.4)',
              background: chatEngine === 'vue_franken' ? 'linear-gradient(135deg, rgba(66, 184, 131, 0.25), rgba(66, 184, 131, 0.12))' : 'rgba(66, 184, 131, 0.08)',
              color: chatEngine === 'vue_franken' ? '#2c9664' : '#42b883',
              boxShadow: chatEngine === 'vue_franken' ? '0 0 10px rgba(66, 184, 131, 0.35)' : 'none',
              transition: 'all 0.2s ease'
            }}
            title="Aktifkan Mesin Chat Vue 3 & FrankenPHP Worker"
          >
            <span>⚡ Mode Vue (Franken)</span>
            {chatEngine === 'vue_franken' && (
              <span style={{ fontSize: 9, background: '#42b883', color: '#fff', padding: '1px 5px', borderRadius: 6, fontWeight: 900 }}>
                AKTIF
              </span>
            )}
          </button>
        </div>

        {/* 3. KONTAINER DAFTAR CHAT (Full Height Flexbox) */}
        <div style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '0 12px 12px 12px',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          <div style={{
            background: 'var(--am-surface, #ffffff)',
            borderRadius: 16,
            border: '1px solid var(--am-border, #E1ECE4)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
            flex: 1,
            minHeight: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {showContactPicker ? (
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--am-text-muted)', padding: '6px 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
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
                      marginBottom: 6,
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
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 20px', color: 'var(--am-text-muted)', margin: 'auto' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--am-text)', marginBottom: 4 }}>Belum ada obrolan</div>
                <p style={{ fontSize: 12, margin: '0 0 16px', color: 'var(--am-text-muted)' }}>Mulai pesan dengan Penjual, Driver, atau Admin!</p>
                <button
                  onClick={() => setShowContactPicker(true)}
                  style={{
                    padding: '9px 20px',
                    borderRadius: 12,
                    border: 'none',
                    background: 'var(--am-primary, #10B981)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)'
                  }}
                >
                  + Mulai Obrolan Baru
                </button>
              </div>
            ) : (
              <>
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  {filteredRooms.map(r => {
                    const isActive = activeRoom?.roomId === r.roomId;
                    const isRoomHanded = Boolean(handovers[r.roomId]);
                    const lastMsg = r.messages[r.messages.length - 1];
                    const myNormForRoom = normalizeUserId(currentUser?.email);
                    const isLastMine = lastMsg ? (
                      (lastMsg as any).is_self === true ||
                      (lastMsg as any).isSelf === true ||
                      normalizeUserId(lastMsg.senderId || (lastMsg as any).fromId) === myNormForRoom ||
                      (lastMsg.senderId === currentUser?.id && lastMsg.senderRole !== 'ai') ||
                      (normalizeUserId(lastMsg.senderId || (lastMsg as any).fromId).includes('raisa') && !normalizeUserId(lastMsg.senderId || (lastMsg as any).fromId).includes('udin'))
                    ) : false;

                    const rawLastText = lastMsg?.mediaType === 'image' 
                      ? '📷 [Foto / Struk]' 
                      : (lastMsg?.mediaType === 'audio' ? '🎙️ [Pesan Suara]' : (lastMsg?.text || 'Mulai percakapan...'));

                    const lastText = lastMsg && isLastMine && rawLastText !== 'Mulai percakapan...' ? `Anda: ${rawLastText}` : rawLastText;
                    const roomUnread = isActive ? 0 : r.messages.filter(m => 
                      String(m.receiverId || '').toLowerCase().trim() === String(currentUser?.email || '').toLowerCase().trim() && 
                      m.isRead === false
                    ).length;

                    const isOtherBuyer = isRoleBuyer(r.otherRole, r.otherName, r.otherId);
                    const isOtherDriver = r.otherRole === 'driver' || r.otherRole === 'kurir';
                    const isOtherAdmin = r.otherRole === 'admin' || r.otherRole === 'super_admin';

                    let badgeText = '🌸 AI Active';
                    let badgeBg = 'rgba(244, 63, 94, 0.12)';
                    let badgeCol = '#E11D48';

                    if (isOtherBuyer) {
                      badgeText = '🛍️ Pembeli';
                      badgeBg = 'rgba(5, 150, 105, 0.1)';
                      badgeCol = '#059669';
                    } else if (isOtherDriver) {
                      badgeText = '🛵 Kurir';
                      badgeBg = 'rgba(245, 158, 11, 0.12)';
                      badgeCol = '#D97706';
                    } else if (isOtherAdmin) {
                      badgeText = '🛡️ Admin';
                      badgeBg = 'rgba(59, 130, 246, 0.12)';
                      badgeCol = '#2563EB';
                    } else if (isRoomHanded) {
                      badgeText = 'Penjual Live';
                      badgeBg = 'rgba(16, 185, 129, 0.12)';
                      badgeCol = '#10B981';
                    }

                    return (
                      <div
                        key={r.roomId}
                        onClick={() => {
                          setActiveRoomId(r.roomId);
                          setPendingContact(null);
                          markRoomAsRead(r.roomId);
                        }}
                        className={`am-chat-room-card ${isActive ? 'is-active' : ''}`}
                        style={{
                          padding: '12px 14px',
                          borderBottom: '1px solid var(--am-border, #E1ECE4)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          cursor: 'pointer'
                        }}
                      >
                        <div className="am-chat-avatar-circle" style={{ width: 40, height: 40 }}>
                          <img
                            src={getUserAvatar(r.otherId, r.otherName, r.otherRole, r.otherAvatar)}
                            alt={r.otherName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <span className="am-chat-online-dot"></span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2, gap: 6 }}>
                            <span style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--am-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
                              {r.otherName}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--am-text-muted)', flexShrink: 0 }}>
                              {lastMsg?.time || ''}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11.5, color: 'var(--am-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0, lineHeight: 1.3 }}>
                              {lastText}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                              {roomUnread > 0 && (
                                <span style={{
                                  fontSize: 9.5,
                                  minWidth: 17,
                                  height: 17,
                                  borderRadius: 9,
                                  background: '#EF4444',
                                  color: '#FFFFFF',
                                  fontWeight: 800,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: '0 4px',
                                  boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)'
                                }}>
                                  {roomUnread > 9 ? '9+' : roomUnread}
                                </span>
                              )}
                              <span style={{
                                fontSize: 9.5,
                                padding: '1px 6px',
                                borderRadius: 8,
                                background: badgeBg,
                                color: badgeCol,
                                fontWeight: 800
                              }}>
                                {badgeText}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Teks Halus Keamanan & Privasi di Bagian Bawah Card */}
                <div style={{
                  flexShrink: 0,
                  marginTop: 'auto',
                  padding: '12px 14px',
                  textAlign: 'center',
                  color: 'var(--am-text-muted)',
                  fontSize: 11,
                  borderTop: '1px solid var(--am-border, #E1ECE4)',
                  background: 'var(--am-surface, #ffffff)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13 }}>🛡️</span>
                    <span style={{ fontWeight: 700, color: 'var(--am-text)', fontSize: 11.5 }}>Obrolan Kampus Terenkripsi</span>
                  </div>
                  <span style={{ fontSize: 10.5, color: 'var(--am-text-muted)', lineHeight: 1.2 }}>Pesan otomatis terhapus setelah 24 jam untuk keamanan privasi kampus.</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 💬 PANE KANAN: RUANG CHAT AKTIF */}
      <div className="am-chat-content-pane">
        {activeRoom ? (
          <>
            {/* Header Ruang Chat Minimalis & Responsif */}
            {(() => {
              const otherRole = activeRoom?.otherRole || 'seller';
              const otherName = activeRoom?.otherName || 'Pengguna';
              const otherId = activeRoom?.otherId || '';
              const isPartnerBuyer = isRoleBuyer(otherRole, otherName, otherId);
              const isPartnerSeller = isRoleSeller(otherRole, otherName, otherId);
              const isPartnerDriver = otherRole === 'driver' || otherRole === 'kurir';
              const isPartnerAdmin = otherRole === 'admin' || otherRole === 'super_admin';

              return (
                <div style={{
                  height: 56,
                  padding: '0 16px',
                  background: 'var(--am-surface, #ffffff)',
                  borderBottom: '1px solid var(--am-border, #e8e1d5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  zIndex: 30,
                  flexShrink: 0,
                  boxSizing: 'border-box',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                }}>
                  {/* KIRI: Tombol Kembali [←], Avatar, Nama & Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                    <button
                      onClick={() => {
                        setActiveRoomId(null);
                        activeRoomIdRef.current = null;
                        setPendingContact(null);
                      }}
                      style={{
                        background: 'var(--am-bg2, #f3ece2)',
                        border: '1px solid var(--am-border, #e8e1d5)',
                        borderRadius: 12,
                        width: 36,
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                        color: 'var(--am-text)',
                        cursor: 'pointer',
                        fontWeight: 800,
                        flexShrink: 0,
                        transition: 'all 0.15s'
                      }}
                      title="Kembali ke Daftar Obrolan"
                    >
                      ←
                    </button>

                    <div className="am-chat-avatar-circle" style={{ width: 38, height: 38, flexShrink: 0, position: 'relative' }}>
                      <img
                        src={getUserAvatar(otherId, otherName, otherRole, activeRoom?.otherAvatar)}
                        alt={otherName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                      />
                      <span className="am-chat-online-dot"></span>
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <h4 style={{
                          margin: 0,
                          fontSize: 13.5,
                          fontWeight: 800,
                          color: 'var(--am-text)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {otherName}
                        </h4>
                        <span style={{
                          fontSize: 9.5,
                          padding: '1px 6px',
                          borderRadius: 8,
                          background: isPartnerBuyer ? 'rgba(5, 150, 105, 0.12)' : (isPartnerDriver ? 'rgba(245, 158, 11, 0.15)' : (isPartnerAdmin ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.12)')),
                          color: isPartnerBuyer ? '#059669' : (isPartnerDriver ? '#D97706' : (isPartnerAdmin ? '#2563EB' : '#10B981')),
                          fontWeight: 800,
                          flexShrink: 0
                        }}>
                          {isPartnerBuyer ? 'Pembeli' : (isPartnerDriver ? 'Kurir' : (isPartnerAdmin ? 'Admin' : 'Penjual'))}
                        </span>
                      </div>

                      {isPartnerTyping || isOtherTyping ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-xs animate-pulse" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10B981', fontSize: 11, fontWeight: 700, marginTop: 1 }}>
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                          <span style={{ fontStyle: 'italic' }}>{typingPartnerName || activeRoom?.otherName || 'Lawan bicara'} sedang mengetik...</span>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: '#16a34a', fontWeight: 600, marginTop: 1 }}>
                          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }}></span>
                          <span className="text-emerald-500" style={{ color: '#16a34a' }}>Online</span>
                          <span style={{ color: 'var(--am-border)' }}>•</span>
                          <span style={{ color: 'var(--am-text-muted)', fontSize: 10.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ROLE_LABEL[activeRoom?.otherRole || ''] || (isPartnerBuyer ? 'Pelanggan Kampus' : (isPartnerDriver ? 'Kurir Antasari Express' : (isPartnerAdmin ? 'Pusat Bantuan' : (isCurrentRoomHandedOver ? 'Admin Toko (Live)' : 'Pengguna'))))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* KANAN: Tombol Mode Vue & Menu Opsi Titik Tiga (⋮) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => setChatEngine(prev => prev === 'default' ? 'vue_franken' : 'default')}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        border: chatEngine === 'vue_franken' ? '1.5px solid #42b883' : '1px solid var(--am-border, #e8e1d5)',
                        background: chatEngine === 'vue_franken' ? 'rgba(66, 184, 131, 0.15)' : 'var(--am-bg2, #f3ece2)',
                        color: chatEngine === 'vue_franken' ? '#2c9664' : 'var(--am-text)',
                        transition: 'all 0.15s ease'
                      }}
                      title="Ganti ke Mesin Chat Vue 3 & FrankenPHP Worker"
                    >
                      <span>⚡ Vue 3</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowRoomMenu(prev => !prev)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        border: '1px solid var(--am-border, #e8e1d5)',
                        background: showRoomMenu ? 'var(--am-primary)' : 'var(--am-bg2, #f3ece2)',
                        color: showRoomMenu ? '#FFFFFF' : 'var(--am-text)',
                        fontSize: 18,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s'
                      }}
                      title="Menu Opsi Obrolan"
                    >
                      ⋮
                    </button>

                    {showRoomMenu && (
                      <>
                        <div
                          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }}
                          onClick={() => setShowRoomMenu(false)}
                        />

                        <div style={{
                          position: 'absolute',
                          top: 42,
                          right: 0,
                          width: 220,
                          background: 'var(--am-surface, #FFFFFF)',
                          border: '1px solid var(--am-border, #e8e1d5)',
                          borderRadius: 16,
                          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                          padding: '6px',
                          zIndex: 100
                        }}>
                          {/* Toggle Mode Vue 3 / React */}
                          <button
                            type="button"
                            onClick={() => {
                              setChatEngine(prev => prev === 'default' ? 'vue_franken' : 'default');
                              setShowRoomMenu(false);
                            }}
                            style={{
                              width: '100%',
                              padding: '9px 12px',
                              borderRadius: 10,
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--am-text)',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              textAlign: 'left'
                            }}
                          >
                            <span>⚡</span>
                            <span>{chatEngine === 'vue_franken' ? 'Ganti ke Mode React' : 'Ganti ke Mode Vue 3'}</span>
                          </button>

                          {/* Sinkronkan Pesan */}
                          <button
                            type="button"
                            onClick={() => {
                              handleManualSync();
                              setShowRoomMenu(false);
                            }}
                            disabled={isSyncingCloud}
                            style={{
                              width: '100%',
                              padding: '9px 12px',
                              borderRadius: 10,
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--am-text)',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              textAlign: 'left'
                            }}
                          >
                            <span>🔄</span>
                            <span>{isSyncingCloud ? 'Menyinkronkan...' : 'Sinkronkan Pesan'}</span>
                          </button>

                          {/* Alihkan Handover AI / Admin Toko */}
                          {!isPartnerBuyer && !isPartnerDriver && !isPartnerAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                if (activeRoom?.roomId) {
                                  const nextStatus = !isCurrentRoomHandedOver;
                                  setRoomHandover(activeRoom.roomId, nextStatus);
                                  setInAppToast({
                                    title: nextStatus ? 'Dialihkan ke Admin Penjual' : 'Asisten AI Aktif',
                                    desc: nextStatus ? `Percakapan sekarang diteruskan langsung ke Admin ${otherName}.` : 'Asisten AI Toko kembali aktif membalas pembeli.'
                                  });
                                }
                                setShowRoomMenu(false);
                              }}
                              style={{
                                width: '100%',
                                padding: '9px 12px',
                                borderRadius: 10,
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--am-text)',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                textAlign: 'left'
                              }}
                            >
                              <span>{isCurrentRoomHandedOver ? '🌸' : '👤'}</span>
                              <span>{isCurrentRoomHandedOver ? 'Aktifkan AI Toko' : 'Hubungi Admin Langsung'}</span>
                            </button>
                          )}

                          <div style={{ height: 1, background: 'var(--am-border, #E1ECE4)', margin: '4px 6px' }}></div>

                          {/* Dev Switcher Submenu */}
                          <div style={{ padding: '6px 8px 4px' }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--am-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                              🛠️ Ganti Akun Penguji
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                              <button
                                type="button"
                                onClick={() => {
                                  handleQuickSwitchAccount('raisa14@gmail.com', 'Raisa', 'buyer');
                                  setShowRoomMenu(false);
                                }}
                                style={{
                                  padding: '6px 8px',
                                  borderRadius: 8,
                                  border: '1px solid var(--am-border)',
                                  background: normalizeUserId(currentUser?.email) === 'raisa14@gmail.com' ? '#10B981' : 'var(--am-bg2)',
                                  color: normalizeUserId(currentUser?.email) === 'raisa14@gmail.com' ? '#FFFFFF' : 'var(--am-text)',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                🌸 Raisa
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleQuickSwitchAccount('udin14@gmail.com', 'Udin', 'seller');
                                  setShowRoomMenu(false);
                                }}
                                style={{
                                  padding: '6px 8px',
                                  borderRadius: 8,
                                  border: '1px solid var(--am-border)',
                                  background: normalizeUserId(currentUser?.email) === 'udin14@gmail.com' ? '#10B981' : 'var(--am-bg2)',
                                  color: normalizeUserId(currentUser?.email) === 'udin14@gmail.com' ? '#FFFFFF' : 'var(--am-text)',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                🏪 Udin
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

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
              {displayedMessages.length === 0 ? (
                <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--am-text-muted)', padding: '20px' }}>
                  <div style={{ fontSize: 38, marginBottom: 6 }}>👋</div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--am-text)' }}>Mulai Percakapan</div>
                  <p style={{ fontSize: 12, margin: '4px 0 0', color: 'var(--am-text-muted)' }}>
                    Tanyakan stok produk, COD, atau konfirmasi pesanan ke <strong>{activeRoom?.otherName || 'Penjual'}</strong>!
                  </p>
                </div>
              ) : (
                displayedMessages.map((m, idx) => {
                  const sNorm = normalizeUserId(m.senderId || (m as any).fromId || (m as any).sender_id);
                  const myNorm = normalizeUserId(currentUser?.email);

                  // 🎯 WhatsApp Style: Pesan Saya (Outgoing -> KANAN / HIJAU), Pesan Lawan Bicara (Incoming -> KIRI / PUTIH)
                  const isSenderMsg = (msg: any): boolean => {
                    if (!msg) return false;

                    // 1. Jika flag is_self aktif
                    if (msg.is_self === true || msg.isSelf === true) return true;

                    const msgRole = String(msg.senderRole || msg.sender_role || msg.role || '').toLowerCase().trim();
                    const msgId = String(msg.senderId || msg.fromId || msg.sender_id || '').toLowerCase().trim();
                    const msgName = String(msg.senderName || msg.fromName || msg.sender_name || msg.sender || '').toLowerCase().trim();

                    const partnerName = String(activeRoom?.otherName || '').toLowerCase().trim();
                    const partnerRole = String(activeRoom?.otherRole || '').toLowerCase().trim();
                    const partnerId = String(activeRoom?.otherId || '').toLowerCase().trim();

                    // A. JIKA LAWAN BICARA ADALAH RAISA / PEMBELI LAIN (HP Penjual / Udin):
                    if (
                      partnerName.includes('raisa') ||
                      partnerRole === 'buyer' ||
                      partnerRole === 'pembeli' ||
                      partnerId.includes('raisa') ||
                      partnerId.includes('buyer')
                    ) {
                      if (
                        msgName.includes('raisa') ||
                        msgRole === 'buyer' ||
                        msgRole === 'pembeli' ||
                        msgId.includes('raisa') ||
                        msgId.includes('buyer') ||
                        msgId === '101'
                      ) {
                        return false;
                      }
                      return true; // Pesan KITA (Penjual manual maupun Bot AI Asisten Toko) -> KANAN / HIJAU
                    }

                    // B. JIKA LAWAN BICARA ADALAH UDIN / PENJUAL / MYAMMIY CRAFT (Laptop Pembeli / Raisa):
                    if (
                      partnerName.includes('udin') ||
                      partnerName.includes('myammiy') ||
                      partnerName.includes('craft') ||
                      partnerName.includes('penjual') ||
                      partnerRole === 'seller' ||
                      partnerRole === 'penjual' ||
                      partnerId.includes('udin') ||
                      partnerId.includes('seller')
                    ) {
                      if (
                        msgName.includes('udin') ||
                        msgRole === 'seller' ||
                        msgRole === 'penjual' ||
                        msgRole === 'ai' ||
                        msgId.includes('udin') ||
                        msgId.includes('seller') ||
                        msgId === 'myammiy_ai' ||
                        msgId.includes('ai') ||
                        msgName.includes('myammiy') ||
                        msgName.includes('asisten')
                      ) {
                        return false;
                      }
                      return true; // Pesan KITA (Raisa/Pembeli) -> KANAN / HIJAU
                    }

                    return msgRole === 'buyer';
                  };

                  const isMine = isSenderMsg(m);

                  const prevMsg = idx > 0 ? displayedMessages[idx - 1] : null;
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
                              {(() => {
                                const st = m.status;
                                const isRd = m.isRead === true || st === 'read';
                                if (isRd) {
                                  return (
                                    <span className="am-chat-check-read" style={{ fontSize: 12, color: '#34B7F1', fontWeight: 800, marginLeft: 3, letterSpacing: -1.5 }} title="Dibaca (Read)">
                                      ✓✓
                                    </span>
                                  );
                                }
                                if (st === 'delivered') {
                                  return (
                                    <span className="am-chat-check-delivered" style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 700, marginLeft: 3, letterSpacing: -1.5 }} title="Terkirim ke Penerima (Delivered)">
                                      ✓✓
                                    </span>
                                  );
                                }
                                return (
                                  <span className="am-chat-check-sent" style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 700, marginLeft: 3 }} title="Terkirim ke Server (Sent)">
                                    ✓
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="am-chat-msg-row-partner">
                          <div className="am-chat-avatar-circle" style={{ width: 34, height: 34, fontSize: 16, flexShrink: 0, overflow: 'hidden' }}>
                            <img
                              src={getUserAvatar(m.senderId, m.senderName, m.senderRole, m.senderAvatar || activeRoom?.otherAvatar)}
                              alt={m.senderName || 'Avatar'}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                          <div className="am-chat-bubble-partner">
                            {(() => {
                              const isSenderBuyer = isRoleBuyer(m.senderRole, m.senderName, m.senderId);
                              const isSenderDriver = m.senderRole === 'driver' || m.senderRole === 'kurir';
                              const isSenderAdmin = m.senderRole === 'admin' || m.senderRole === 'super_admin';
                              const isSenderAi = !isSenderBuyer && m.senderRole === 'ai';

                              let badgeText = '🛍️ Pembeli';
                              let badgeBg = 'rgba(5, 150, 105, 0.12)';
                              let badgeColor = '#059669';

                              if (isSenderAi) {
                                badgeText = '🌸 Asisten AI';
                                badgeBg = 'rgba(244, 63, 94, 0.12)';
                                badgeColor = '#F43F5E';
                              } else if (isSenderDriver) {
                                badgeText = '🛵 Kurir';
                                badgeBg = 'rgba(245, 158, 11, 0.15)';
                                badgeColor = '#D97706';
                              } else if (isSenderAdmin) {
                                badgeText = '🛡️ Admin';
                                badgeBg = 'rgba(59, 130, 246, 0.15)';
                                badgeColor = '#2563EB';
                              } else if (!isSenderBuyer) {
                                badgeText = '🏪 Penjual';
                                badgeBg = 'rgba(16, 185, 129, 0.12)';
                                badgeColor = '#10B981';
                              }

                              return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                  <span style={{ fontSize: 11.5, fontWeight: 900, color: 'var(--am-primary, #10B981)' }}>
                                    {m.senderName || activeRoom?.otherName || 'Pengguna'}
                                  </span>
                                  <span style={{
                                    fontSize: 9.5,
                                    fontWeight: 800,
                                    padding: '1px 6px',
                                    borderRadius: 6,
                                    background: badgeBg,
                                    color: badgeColor
                                  }}>
                                    {badgeText}
                                  </span>
                                </div>
                              );
                            })()}

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
                  <span>{activeRoom?.otherName || 'Lawan bicara'} sedang mengetik</span>
                  <div className="am-typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
            </div>

            {/* 🤖 AI TOOLS & QUICK REPLIES BAR (Kompresi Ringkas & Lega) */}
            {(() => {
              const isCurrentUserSeller = isRoleSeller(currentUser?.role, currentUser?.nama || currentUser?.name, currentUser?.email);
              const isPartnerBuyer = isRoleBuyer(activeRoom?.otherRole, activeRoom?.otherName, activeRoom?.otherId);
              const isSellerContext = isCurrentUserSeller || isPartnerBuyer;

              const chipList = isSellerContext ? [
                '✅ Stok Ready Kak, Silakan Dipesan!',
                '🛵 Bisa COD di Kampus 1 & Kampus 2',
                '🎁 100% Handmade Pipe Cleaner Premium',
                '🎟️ Produk Tersedia di Vending Machine',
                '💳 Selesaikan Pembayaran di Keranjang',
                '🙏 Terima Kasih Banyak Sudah Berbelanja!'
              ] : (activeRoom?.otherRole === 'driver' || activeRoom?.otherRole === 'kurir') ? [
                '📍 Posisi saya di Lobi Fakultas',
                '🛵 Sudah dekat lokasi pengantaran?',
                '📦 Paket bisa dititipkan ke Pos Satpam yaa',
                '👍 Siap kak, terima kasih banyak!'
              ] : (activeRoom?.otherRole === 'admin' || activeRoom?.otherRole === 'super_admin') ? [
                '🛡️ Mau lapor kendala transaksi',
                '🏪 Bantuan verifikasi toko / produk',
                '🤖 Pertanyaan seputar Vending Machine',
                '💳 Bantuan status pembayaran Midtrans'
              ] : [
                '🌸 Stok produk masih ready kak?',
                '🎁 Bahan kawat bulu (pipe cleaner) / rajut?',
                '🛵 Bisa COD di kampus hari ini?',
                '📍 Di mana posisi Vending Machine?',
                '💳 Mau konfirmasi order & transfer',
                '🧾 Boleh minta rincian nota struk?'
              ];

              return (
                <div style={{
                  background: 'var(--am-surface, #ffffff)',
                  borderTop: '1px solid var(--am-border, #E1ECE4)',
                  flexShrink: 0,
                  position: 'relative',
                  zIndex: 35,
                  pointerEvents: 'auto'
                }}>
                  {/* Drawer / Popover AI Tools jika dibuka */}
                  {showAiToolsDrawer && isSellerContext && (
                    <div style={{
                      padding: '10px 14px',
                      background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 50%, #F5F3FF 100%)',
                      borderBottom: '1px solid rgba(16, 185, 129, 0.25)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      animation: 'fadeInScale 0.15s ease-out'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: '#065F46' }}>
                          <span>✨ Asisten Penjual AI Pintar</span>
                          <span style={{ fontSize: 9.5, padding: '1px 6px', borderRadius: 6, background: '#10B981', color: 'white' }}>Live Copilot</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAiToolsDrawer(false)}
                          style={{ background: 'none', border: 'none', fontSize: 14, color: '#065F46', cursor: 'pointer', padding: '0 4px', fontWeight: 800 }}
                        >
                          ✕
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => {
                            handleGenerateSellerAiReply();
                            setShowAiToolsDrawer(false);
                          }}
                          disabled={isGeneratingAiReply}
                          style={{
                            flex: 1,
                            minWidth: 160,
                            padding: '7px 12px',
                            borderRadius: 12,
                            border: 'none',
                            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                            color: 'white',
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: isGeneratingAiReply ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                          }}
                        >
                          <span>{isGeneratingAiReply ? '⏳ Meracik Balasan Cerdas...' : '🪄 Rekomendasikan Jawaban AI'}</span>
                        </button>

                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11.5, fontWeight: 700, color: '#065F46', background: 'rgba(255,255,255,0.7)', padding: '6px 10px', borderRadius: 10, border: '1px solid rgba(16,185,129,0.3)' }}>
                          <input
                            type="checkbox"
                            checked={isAutoPilotEnabled}
                            onChange={(e) => {
                              setIsAutoPilotEnabled(e.target.checked);
                              try {
                                localStorage.setItem('am_seller_autopilot', String(e.target.checked));
                              } catch {}
                            }}
                            style={{ cursor: 'pointer', accentColor: '#10B981' }}
                          />
                          <span>🤖 Auto-Jawab AI</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Baris Ringkas: Tombol AI Tools & Horizontal Chips */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    height: 34,
                    boxSizing: 'border-box'
                  }}>
                    {isSellerContext && (
                      <button
                        type="button"
                        onClick={() => setShowAiToolsDrawer(prev => !prev)}
                        style={{
                          height: 26,
                          padding: '0 8px',
                          borderRadius: 13,
                          border: 'none',
                          background: showAiToolsDrawer ? '#047857' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                          color: 'white',
                          fontSize: 10.5,
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          flexShrink: 0,
                          boxShadow: '0 1px 4px rgba(16, 185, 129, 0.25)'
                        }}
                        title="Buka Alat Bantu AI Penjual"
                      >
                        <span>✨ AI Tools</span>
                        <span style={{ fontSize: 9 }}>{showAiToolsDrawer ? '▲' : '▼'}</span>
                      </button>
                    )}

                    {/* Quick Suggestion Chips */}
                    <div
                      className="no-scrollbar"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        overflowX: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        flex: 1,
                        minWidth: 0
                      }}
                    >
                      {chipList.map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setMessageInput(chip)}
                          style={{
                            height: 26,
                            padding: '0 10px',
                            borderRadius: 13,
                            border: '1px solid var(--am-border, #E1ECE4)',
                            background: 'var(--am-bg2, #F0F7F2)',
                            color: 'var(--am-text, #243329)',
                            fontSize: 10.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            transition: 'all 0.15s',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

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
                padding: '8px 10px',
                paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 8px)',
                background: 'var(--am-surface, #FFFFFF)',
                borderTop: '1px solid var(--am-border, #e8e1d5)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 -2px 10px rgba(0,0,0,0.03)',
                boxSizing: 'border-box',
                position: 'relative',
                zIndex: 999,
                pointerEvents: 'auto'
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
                  color: showEmojiPicker ? 'var(--am-primary)' : 'var(--am-text-muted)',
                  pointerEvents: 'auto'
                }}
                title="Pilih Emoji"
              >
                😊
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 20,
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--am-text-muted)',
                  pointerEvents: 'auto'
                }}
                title="Kirim Foto Produk / Lampiran"
              >
                📎
              </button>

              <input
                type="text"
                inputMode="text"
                enterKeyHint="send"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="sentences"
                spellCheck={false}
                placeholder={
                  selectedImagePreview 
                    ? 'Tambahkan keterangan foto...' 
                    : (isCurrentRoomHandedOver ? `Tulis pesan untuk Admin ${activeRoom?.otherName || 'Penjual'}...` : `Tulis pesan untuk ${activeRoom?.otherName || 'Pengguna'}...`)
                }
                value={messageInput}
                onChange={(e) => {
                  setMessageInput(e.target.value);
                  handleUserTypingInput();
                }}
                onInput={() => {
                  handleUserTypingInput();
                }}
                onFocus={handleInputFocus}
                onClick={handleInputFocus}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: 24,
                  border: '1px solid var(--am-border, #e8e1d5)',
                  fontSize: 16,
                  outline: 'none',
                  background: 'var(--am-bg2, #f3ece2)',
                  color: 'var(--am-text)',
                  boxSizing: 'border-box',
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                  touchAction: 'manipulation',
                  pointerEvents: 'auto',
                  cursor: 'text'
                }}
              />

              {/* Tombol Kirim Permanen Berwarna Hijau */}
              <button
                type="submit"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'var(--am-primary, #10B981)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: 16,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
                  flexShrink: 0,
                  pointerEvents: 'auto',
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
          </>
        ) : (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--am-text-muted)', padding: '30px' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>💬</div>
            <h3 style={{ margin: '0 0 6px', fontSize: 18, color: 'var(--am-text)' }}>Pesan Kampus UIN Antasari</h3>
            <p style={{ fontSize: 13, margin: '0 0 20px', color: 'var(--am-text-muted)', maxWidth: 360 }}>
              Pilih salah satu obrolan dari daftar di sebelah kiri untuk mulai mengirim pesan, foto produk, atau voice note!
            </p>
            {onBack && (
              <button
                onClick={onBack}
                style={{
                  padding: '9px 20px',
                  borderRadius: 14,
                  border: '1.5px solid var(--am-border, #e8e1d5)',
                  background: 'var(--am-surface, #ffffff)',
                  color: 'var(--am-text)',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                }}
              >
                <span>← Kembali ke Beranda</span>
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )}
</div>
  );
}
