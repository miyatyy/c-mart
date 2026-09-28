// =========================================================================
// ☁️ ANTASARI MART REAL-TIME CLOUD CHAT & CROSS-DEVICE ENGINE (REDIS POWERED)
// 100% Bebas Socket Leaks, Zero ERR_INSUFFICIENT_RESOURCES, Android APK 100% Mulus
// =========================================================================

import type { BackendChatMessage } from './api';
import { getUserAvatar, saveUserAvatarToGlobalMap, MYAMMIY_STORE_AVATAR, KOPERASI_ADMIN_AVATAR } from './userAvatars';
import { redis, getRedisConfig } from './redisClient';
import { broadcastSoketiAction, broadcastChatHttp } from './echo';

const BROADCAST_CHANNEL_NAME = 'am_campus_chat_channel_v4';
export const CLIENT_INSTANCE_ID = 'cli_' + Math.random().toString(36).substring(2, 9);

class SafeChatSyncHub {
  private broadcastChannel: BroadcastChannel | null = null;
  private subscribers = new Set<(msg: BackendChatMessage) => void>();
  private isSyncing = false;
  private lastSyncTime = 0;

  constructor() {
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.broadcastChannel.onmessage = (event) => {
          if (!event.data) return;
          if (event.data.clientId === CLIENT_INSTANCE_ID) return;

          if (event.data.type === 'chat' && event.data.data) {
            const msg = event.data.data as BackendChatMessage;
            this.subscribers.forEach(cb => {
              try { cb(msg); } catch (_e) {}
            });
          } else if (event.data.type === 'read' && event.data.data) {
            window.dispatchEvent(new CustomEvent('am_messages_read', { detail: event.data.data }));
          } else if (event.data.type === 'typing' && event.data.data) {
            const isTyping = Boolean(event.data.data.isTyping);
            window.dispatchEvent(new CustomEvent(isTyping ? 'am_user_typing' : 'am_user_stop_typing', {
              detail: event.data.data
            }));
          } else if (event.data.type === 'message_updated' && event.data.data) {
            window.dispatchEvent(new CustomEvent('am_message_updated', { detail: event.data.data }));
          } else if (event.data.type === 'message_deleted' && event.data.data) {
            window.dispatchEvent(new CustomEvent('am_message_deleted', { detail: event.data.data }));
          } else if (event.data.type === 'reaction' && event.data.data) {
            window.dispatchEvent(new CustomEvent('am_chat_reaction', { detail: event.data.data }));
          }
        };
      } catch (_err) {}
    }
  }

  public publishLocal(msg: BackendChatMessage) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'chat',
          clientId: CLIENT_INSTANCE_ID,
          data: msg
        });
      } catch (_e) {}
    }
  }

  public publishRead(readData: { roomId: string; readerId: string; readAt: number }) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'read',
          clientId: CLIENT_INSTANCE_ID,
          data: readData
        });
      } catch (_e) {}
    }
  }

  public publishTyping(typingData: { roomId: string; userId: string; userName?: string; isTyping: boolean }) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'typing',
          clientId: CLIENT_INSTANCE_ID,
          data: typingData
        });
      } catch (_e) {}
    }
  }

  public publishMessageUpdated(data: { id: string | number; text: string; updatedAt?: string; [key: string]: any }) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'message_updated',
          clientId: CLIENT_INSTANCE_ID,
          data
        });
      } catch (_e) {}
    }
  }

  public publishMessageDeleted(data: { id: string | number; [key: string]: any }) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'message_deleted',
          clientId: CLIENT_INSTANCE_ID,
          data
        });
      } catch (_e) {}
    }
  }

  public subscribe(cb: (msg: BackendChatMessage) => void): () => void {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private syncTimer: any = null;
  private currentIdentifier = '';
  private knownMsgFingerprints = new Set<string>();
  private isInitialRedisSync = true;

  public recordKnownMessage(msg: Partial<BackendChatMessage>) {
    if (msg.id) this.knownMsgFingerprints.add(String(msg.id));
    this.knownMsgFingerprints.add(createChatFingerprint(msg));
  }

  public startPeriodicSync(identifier: string) {
    this.currentIdentifier = identifier;
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncWithRedis(identifier, true).catch(() => {});
    this.syncTimer = setInterval(() => {
      if (this.currentIdentifier) {
        this.syncWithRedis(this.currentIdentifier).catch(() => {});
      }
    }, 2500);
  }

  public stopPeriodicSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  public async syncWithRedis(identifier: string, force = false) {
    const now = Date.now();
    if (!force && now - this.lastSyncTime < 2000) return; // Batasi maksimal 1 sync per 2 detik
    if (this.isSyncing) return;
    const config = getRedisConfig();
    if (!config.enabled) return;

    this.lastSyncTime = now;
    this.isSyncing = true;
    try {
      const myNorm = normalizeUserId(identifier);
      const defaultPartners = ['admin_nurmiyaty', 'coop_koperasi'];
      let dynamicPartners: string[] = [];
      try {
        const raw = localStorage.getItem('am_registered_users');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            dynamicPartners = parsed.map((u: any) => normalizeUserId(u.email)).filter(Boolean);
          }
        }
      } catch (_e) {}

      const allPartners = Array.from(new Set([...defaultPartners, ...dynamicPartners])).filter(p => p !== myNorm);

      let anyReadUpdated = false;

      await Promise.all(
        allPartners.map(async (partner) => {
          try {
            const roomId = getDeterministicRoomId(myNorm, partner);
            const legacyRoomId = [myNorm, partner].sort().join('__');
            const [remoteTriple, remoteDouble, partnerReadTimeRaw] = await Promise.all([
              redis.lrange<BackendChatMessage>(`am_chat_room_${roomId}`, -50, -1),
              redis.lrange<BackendChatMessage>(`am_chat_room_${legacyRoomId}`, -50, -1),
              redis.get<string>(`am_read_${roomId}_${partner}`)
            ]);

            const partnerReadTime = partnerReadTimeRaw ? Number(partnerReadTimeRaw) : 0;
            const rawCombined = [
              ...(Array.isArray(remoteTriple) ? remoteTriple : []),
              ...(Array.isArray(remoteDouble) ? remoteDouble : [])
            ];

            const seenFp = new Set<string>();
            const remoteMessages: BackendChatMessage[] = [];
            rawCombined.forEach(m => {
              if (!m || !m.text) return;
              const fp = createChatFingerprint(m);
              if (!seenFp.has(fp)) {
                seenFp.add(fp);
                remoteMessages.push(m);
              }
            });

            if (remoteMessages.length > 0) {
              const msgsForSender: Record<string, BackendChatMessage[]> = {};
              const msgsForReceiver: Record<string, BackendChatMessage[]> = {};

              // Jika sync pertama kali saat startup, catat semua riwayat lama agar tidak dibunyikan
              if (this.isInitialRedisSync) {
                remoteMessages.forEach(msg => {
                  if (msg?.id) this.knownMsgFingerprints.add(String(msg.id));
                  this.knownMsgFingerprints.add(createChatFingerprint(msg));
                });
              }

              remoteMessages.forEach(msg => {
                if (msg && msg.text) {
                  const sNorm = normalizeUserId(msg.senderId);
                  const rNorm = normalizeUserId(msg.receiverId);
                  const msgTime = new Date(msg.createdAt || 0).getTime();
                  
                  let calculatedStatus = msg.status || 'sent';
                  let calculatedIsRead = msg.isRead || false;

                  // Jika partner sudah membaca sebelum/pada saat ini
                  if (sNorm === myNorm && rNorm === partner) {
                    if (partnerReadTime > 0 && (msgTime <= partnerReadTime || partnerReadTime >= Date.now() - 86400000)) {
                      calculatedStatus = 'read';
                      calculatedIsRead = true;
                      anyReadUpdated = true;
                    } else if (calculatedStatus === 'sent') {
                      calculatedStatus = 'delivered';
                    }
                  }

                  const normMsg: BackendChatMessage = {
                    ...msg,
                    senderId: sNorm,
                    receiverId: rNorm,
                    roomId: getDeterministicRoomId(sNorm, rNorm),
                    status: calculatedStatus,
                    isRead: calculatedIsRead
                  };

                  if (!msgsForSender[sNorm]) msgsForSender[sNorm] = [];
                  msgsForSender[sNorm].push(normMsg);

                  if (!msgsForReceiver[rNorm]) msgsForReceiver[rNorm] = [];
                  msgsForReceiver[rNorm].push(normMsg);

                  // 🔔 KUNCI SYNC LINTAS PERANGKAT: Siarkan HANYA pesan baru (belum pernah dilihat)
                  const msgIdStr = String(msg.id || '');
                  const fp = createChatFingerprint(msg);
                  const isNewMsg = !this.isInitialRedisSync && (!this.knownMsgFingerprints.has(msgIdStr) && !this.knownMsgFingerprints.has(fp));

                  if (isNewMsg) {
                    if (msgIdStr) this.knownMsgFingerprints.add(msgIdStr);
                    this.knownMsgFingerprints.add(fp);
                    this.subscribers.forEach(cb => {
                      try { cb(normMsg); } catch (_e) {}
                    });
                  }
                }
              });

              Object.entries(msgsForSender).forEach(([email, msgs]) => {
                saveBatchMessagesToLocalStorage(email, msgs);
              });
              Object.entries(msgsForReceiver).forEach(([email, msgs]) => {
                saveBatchMessagesToLocalStorage(email, msgs);
              });
            }
          } catch (_err) {}
        })
      );

      this.isInitialRedisSync = false;

      if (anyReadUpdated && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('am_messages_read', { detail: { identifier: myNorm } }));
      }
    } catch (_err) {
    } finally {
      this.isSyncing = false;
    }
  }
}

let hubInstance: SafeChatSyncHub | null = null;
function getHubInstance(): SafeChatSyncHub {
  if (!hubInstance) {
    hubInstance = new SafeChatSyncHub();
  }
  return hubInstance;
}

/**
 * 🎯 Normalisasi ID/Email Pengguna: 'superadmin' dan 'udin' selalu konsisten
 */
export function normalizeUserId(rawId?: string): string {
  const clean = String(rawId || '').toLowerCase().trim();
  if (!clean) return '';

  // 1. Admin Koperasi (Fixed System Admin)
  if (
    clean === 'coop_koperasi' ||
    clean === 'coop_admin' ||
    clean === 'koperasi' ||
    clean.includes('koperasi') ||
    clean === 's1' ||
    clean === 'usr_koperasi_admin'
  ) return 'coop_koperasi';

  // 2. Super Admin Nurmiyaty (Fixed System Admin)
  if (
    clean === 'admin_nurmiyaty' ||
    clean === 'superadmin' ||
    clean === 'super_admin' ||
    clean === 'nurmiyaty' ||
    clean === 'miyya@gmail.com' ||
    clean === 'mnurmiyaty2@gmail.com' ||
    clean.includes('nurmiyaty') ||
    clean === 'usr_nurmiyaty_superadmin' ||
    (clean.includes('admin') && !clean.includes('koperasi'))
  ) return 'admin_nurmiyaty';

  // 3. Pengguna dinamis lainnya: kembalikan ID asli murni
  return clean;
}

/**
 * 🔗 Standarisasi Identitas Room Deterministik
 * Formula: orderId ? `order_${orderId}_${sorted[0]}_${sorted[1]}` : `chat_${sorted[0]}_${sorted[1]}`
 */
export const getRoomId = (userA: string, userB: string, orderId?: string): string => {
  const normA = normalizeUserId(userA);
  const normB = normalizeUserId(userB);
  const sorted = [String(normA || userA).toLowerCase().trim(), String(normB || userB).toLowerCase().trim()].sort();
  return orderId ? `order_${orderId}_${sorted[0]}_${sorted[1]}` : `chat_${sorted[0]}_${sorted[1]}`;
};

export const getDeterministicRoomId = (userA: string, userB: string, orderId?: string): string => {
  return getRoomId(userA, userB, orderId);
};

export function buildRoomId(emailA: string, emailB: string, orderId?: string): string {
  return getRoomId(emailA, emailB, orderId);
}

/**
 * 🕒 Helper Normalisasi Kunci Menit (HH:mm) dari berbagai format waktu (dot, colon, AM/PM, ISO)
 */
export function extractCleanMinuteKey(timeStr?: string): string {
  if (!timeStr) return '';
  const clean = String(timeStr).trim().replace('.', ':');
  if (clean.includes('T') || (clean.includes('-') && !clean.includes(':'))) {
    try {
      const d = new Date(clean);
      if (!isNaN(d.getTime())) {
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
    } catch {}
  }
  const match = clean.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    let hour = parseInt(match[1], 10);
    const minute = match[2];
    if (clean.toLowerCase().includes('pm') && hour < 12) hour += 12;
    if (clean.toLowerCase().includes('am') && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${minute}`;
  }
  return clean.substring(0, 5);
}

/**
 * 🔑 Buat Kunci Unik Pesan untuk Mencegah Pesan Ganda / Duplikasi
 */
export function createChatFingerprint(m: Partial<BackendChatMessage>): string {
  const sNorm = normalizeUserId(m.senderId || (m as any).fromId || (m as any).sender_id);
  const rNorm = normalizeUserId(m.receiverId || (m as any).toId || (m as any).receiver_id);
  const cleanText = (m.text || (m as any).content || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const rawTime = m.time || m.createdAt || (m as any).created_at || '';
  const minuteKey = extractCleanMinuteKey(rawTime);
  return `${sNorm}__${rNorm}__${cleanText}${minuteKey ? `__${minuteKey}` : ''}`;
}

/**
 * 💾 Helper Simpan Batch Pesan ke LocalStorage Tanpa Duplikat & Tanpa Blocking
 */
function saveBatchMessagesToLocalStorage(userEmail: string, newMsgs: BackendChatMessage[]) {
  if (!userEmail || typeof window === 'undefined' || !newMsgs || newMsgs.length === 0) return;
  try {
    const key = `am_local_chats_${userEmail}`;
    const raw = localStorage.getItem(key);
    const list: BackendChatMessage[] = raw ? JSON.parse(raw) : [];
    
    // Simpan baik idKey maupun contentKey agar tidak ada duplikasi ID maupun duplikasi teks+pengirim+menit
    const seenKeys = new Set<string>();
    list.forEach(m => {
      if (m.id != null) seenKeys.add(String(m.id));
      const textClean = (m.text || (m as any).content || '').trim();
      const timeKey = extractCleanMinuteKey(m.time || m.createdAt || (m as any).created_at);
      const senderKey = normalizeUserId(m.senderId || (m as any).fromId || (m as any).sender_id);
      if (textClean) seenKeys.add(`${senderKey}_${textClean}_${timeKey}`);
    });

    let hasNew = false;
    for (const msg of newMsgs) {
      const textClean = (msg.text || (msg as any).content || '').trim();
      const timeKey = extractCleanMinuteKey(msg.time || msg.createdAt || (msg as any).created_at);
      const senderKey = normalizeUserId(msg.senderId || (msg as any).fromId || (msg as any).sender_id);
      const idKey = msg.id != null ? String(msg.id) : '';
      const clientKey = (msg as any).client_id != null ? String((msg as any).client_id) : '';
      const contentKey = textClean ? `${senderKey}_${textClean}_${timeKey}` : '';

      // Cek apakah pesan sudah ada di list untuk diperbarui jika diedit
      const existingIdx = list.findIndex(m => 
        (idKey && m.id != null && String(m.id) === idKey) ||
        (clientKey && (m as any).client_id != null && String((m as any).client_id) === clientKey) ||
        (idKey && (m as any).client_id != null && String((m as any).client_id) === idKey)
      );

      if (existingIdx !== -1) {
        const existing = list[existingIdx];
        const isMsgEdited = Boolean(msg.isEdited || (msg as any).is_edited);
        const isExEdited = Boolean(existing.isEdited || (existing as any).is_edited);
        const isTextDiff = (msg.text || (msg as any).content) !== (existing.text || (existing as any).content);
        
        if (isMsgEdited || (isTextDiff && (msg.updatedAt || (msg as any).updated_at || (msg as any).edited_at))) {
          list[existingIdx] = {
            ...existing,
            ...msg,
            text: msg.text || (msg as any).content,
            content: msg.text || (msg as any).content,
            isEdited: true,
            is_edited: true,
            updatedAt: msg.updatedAt || (msg as any).updated_at || (msg as any).edited_at || new Date().toISOString()
          };
          hasNew = true;
        }
      } else {
        const isDuplicate = (idKey && seenKeys.has(idKey)) || (contentKey && seenKeys.has(contentKey));
        if (!isDuplicate) {
          if (idKey) seenKeys.add(idKey);
          if (contentKey) seenKeys.add(contentKey);
          list.push(msg);
          hasNew = true;
        }
      }
    }

    if (hasNew) {
      const trimmed = list.length > 150 ? list.slice(list.length - 150) : list;
      localStorage.setItem(key, JSON.stringify(trimmed));
    }
  } catch (_e) {}
}

function saveMessageToLocalStorage(userEmail: string, msg: BackendChatMessage) {
  saveBatchMessagesToLocalStorage(userEmail, [msg]);
}

/**
 * 📥 Ambil Pesan Chat dari Cache Lokal & Redis Cloud
 */
export async function fetchCloudChats(identifier: string): Promise<{ success: boolean; chats: BackendChatMessage[] }> {
  if (!identifier || typeof window === 'undefined') return { success: true, chats: [] };
  const cleanId = String(identifier).toLowerCase().trim();
  const myNorm = normalizeUserId(cleanId);
  const myUname = cleanId.split('@')[0];

  // Sinkronkan data dari Redis di latar belakang secara aman
  await getHubInstance().syncWithRedis(identifier);

  let localList: BackendChatMessage[] = [];
  try {
    const raw = localStorage.getItem(`am_local_chats_${myNorm}`) || localStorage.getItem(`am_local_chats_${cleanId}`);
    localList = raw ? JSON.parse(raw) : [];
  } catch (_e) {
    localList = [];
  }

  const messageMap = new Map<string, BackendChatMessage>();

  localList.forEach(m => {
    if (!m || !m.text) return;
    const sNorm = normalizeUserId(m.senderId);
    const rNorm = normalizeUserId(m.receiverId);

    const isForMe = Boolean(
      sNorm === myNorm ||
      rNorm === myNorm ||
      !rNorm ||
      (myNorm === 'admin_nurmiyaty' && (sNorm.includes('admin') || rNorm.includes('admin')))
    );

    if (!isForMe) return;

    if (m.senderAvatar && sNorm) {
      saveUserAvatarToGlobalMap(sNorm, m.senderName, m.senderAvatar, false);
    }

    const normalizedMsg: BackendChatMessage = {
      ...m,
      senderId: sNorm,
      receiverId: rNorm,
      roomId: buildRoomId(sNorm, rNorm)
    };

    const fp = createChatFingerprint(normalizedMsg);
    if (!messageMap.has(fp)) {
      messageMap.set(fp, normalizedMsg);
    }
  });

  const combined = Array.from(messageMap.values()).sort((a, b) => {
    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
  });

  return { success: true, chats: combined };
}

/**
 * 📤 Kirim Pesan Chat Baru (Simpan ke LocalStorage + Redis Cloud + Broadcast)
 */
export async function sendCloudChat(payload: {
  id?: number | string;
  fromId?: string;
  sender_id?: string;
  senderId?: string;
  fromName?: string;
  sender_name?: string;
  senderName?: string;
  fromRole?: string;
  sender_role?: string;
  senderRole?: string;
  fromAvatar?: string;
  senderAvatar?: string;
  toId?: string;
  receiver_id?: string;
  receiverId?: string;
  toName?: string;
  receiver_name?: string;
  receiverName?: string;
  toRole?: string;
  receiver_role?: string;
  receiverRole?: string;
  toAvatar?: string;
  receiverAvatar?: string;
  text?: string;
  content?: string;
  roomId?: string;
  room_id?: string;
  time?: string;
  createdAt?: string;
  created_at?: string;
  mediaType?: 'text' | 'image' | 'audio' | 'location';
  mediaUrl?: string;
  audioDuration?: number;
}): Promise<{ success: boolean; message: string; chat: BackendChatMessage }> {
  const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const rawFrom = payload.fromId || payload.senderId || payload.sender_id || '';
  const rawTo = payload.toId || payload.receiverId || payload.receiver_id || '';
  const rawFromName = payload.fromName || payload.senderName || payload.sender_name || '';
  const rawToName = payload.toName || payload.receiverName || payload.receiver_name || '';
  const rawFromRole = payload.fromRole || payload.senderRole || payload.sender_role || '';
  const rawToRole = payload.toRole || payload.receiverRole || payload.receiver_role || '';
  const rawText = payload.text || payload.content || '';

  let sNorm = normalizeUserId(rawFrom);
  let rNorm = normalizeUserId(rawTo);

  // Auto-fill fallback jika salah satu pihak tidak terisi
  if (!rNorm && sNorm) {
    rNorm = 'admin_nurmiyaty';
  }
  if (!sNorm && rNorm) {
    sNorm = 'admin_nurmiyaty';
  }

  const roomId = payload.roomId || payload.room_id || getDeterministicRoomId(sNorm, rNorm);

  const resolvedSenderAvatar = payload.fromAvatar || payload.senderAvatar || getUserAvatar(sNorm, rawFromName, rawFromRole);
  const resolvedReceiverAvatar = payload.toAvatar || payload.receiverAvatar || getUserAvatar(rNorm, rawToName, rawToRole);

  const newMsg: BackendChatMessage = {
    id: payload.id != null ? (payload.id as any) : Date.now(),
    roomId,
    senderId: sNorm,
    senderName: rawFromName || (sNorm === 'admin_nurmiyaty' ? 'Nurmiyaty (Super Admin)' : sNorm === 'coop_koperasi' ? 'Admin Koperasi' : 'Pengguna Kampus'),
    senderRole: rawFromRole || (sNorm === 'admin_nurmiyaty' ? 'superadmin' : sNorm === 'coop_koperasi' ? 'coop_admin' : 'buyer'),
    senderAvatar: resolvedSenderAvatar,
    receiverId: rNorm,
    receiverName: rawToName || (rNorm === 'admin_nurmiyaty' ? 'Nurmiyaty (Super Admin)' : rNorm === 'coop_koperasi' ? 'Admin Koperasi' : 'Pengguna Kampus'),
    receiverRole: rawToRole || (rNorm === 'admin_nurmiyaty' ? 'superadmin' : rNorm === 'coop_koperasi' ? 'coop_admin' : 'buyer'),
    receiverAvatar: resolvedReceiverAvatar,
    text: rawText,
    time: payload.time || timeNow,
    createdAt: payload.createdAt || payload.created_at || new Date().toISOString(),
    mediaType: payload.mediaType || 'text',
    mediaUrl: payload.mediaUrl,
    audioDuration: payload.audioDuration,
    status: 'sent',
    isRead: false
  };

  if (resolvedSenderAvatar) {
    saveUserAvatarToGlobalMap(sNorm, rawFromName, resolvedSenderAvatar, false);
  }

  // 1. Simpan ke Cache Lokal Perangkat Ini
  saveMessageToLocalStorage(sNorm, newMsg);
  saveMessageToLocalStorage(rNorm, { ...newMsg, isRead: false });

  // 2. Simpan ke Redis Cloud dengan TTL 24 Jam (Untuk Perangkat Lain / HP)
  try {
    await redis.rpush(`am_chat_room_${roomId}`, newMsg, 86400);
    const legacyRoom = [sNorm, rNorm].sort().join('__');
    if (legacyRoom && legacyRoom !== roomId) {
      await redis.rpush(`am_chat_room_${legacyRoom}`, newMsg, 86400);
    }
  } catch (_err) {}

  // 3. Broadcast ke Tab Lokal di Perangkat yang Sama
  getHubInstance().publishLocal(newMsg);

  // 4. Pancarkan event kustom di window lokal
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('am_new_cloud_chat', { detail: newMsg }));
  }

  // 5. Pancarkan ke Soketi / Pusher Room Channel (Real-Time WebSocket)
  try {
    broadcastSoketiAction(sNorm, rNorm, 'new-message', newMsg);
    broadcastSoketiAction(sNorm, rNorm, 'client-message-sent', newMsg);
    broadcastSoketiAction(sNorm, rNorm, 'NewMessage', newMsg);
    broadcastChatHttp(newMsg, [`chat.${roomId}`, `chat-room-${sNorm}-${rNorm}`, 'campusmart-chat', 'campusmart-chat-global']);
  } catch (_e) {}

  // 6. Simpan fallback sync antar-tab di localStorage
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('am_last_sync_msg', JSON.stringify({
        ...newMsg,
        _t: Date.now()
      }));
    }
  } catch (_) {}

  return { success: true, message: 'Pesan berhasil dikirim!', chat: newMsg };
}

export const pushCloudChatMessage = sendCloudChat;

/**
 * 📡 Broadcast Perubahan Avatar
 */
export function broadcastMqttAvatar(identifier: string, name: string, avatarUrl: string) {
  if (!avatarUrl || typeof window === 'undefined') return;
  const cleanId = String(identifier || '').toLowerCase().trim();
  const cleanName = String(name || '').toLowerCase().trim();

  saveUserAvatarToGlobalMap(cleanId, cleanName, avatarUrl, false);
  try {
    redis.set(`am_avatar_${cleanId}`, avatarUrl);
  } catch (_e) {}
}

/**
 * ⚡ Berlangganan Stream Pesan Masuk secara Real-Time
 */
export function subscribeToCloudChatStream(
  currentEmailOrGetter: string | (() => string),
  onMessage: (msg: BackendChatMessage) => void
): () => void {
  const hub = getHubInstance();
  const getEmail = () => typeof currentEmailOrGetter === 'function' ? currentEmailOrGetter() : currentEmailOrGetter;
  const initialEmail = getEmail();
  if (initialEmail) {
    hub.startPeriodicSync(initialEmail);
  }

  // Dengarkan juga event lokal am_new_cloud_chat
  let windowHandler: ((e: Event) => void) | null = null;
  if (typeof window !== 'undefined') {
    windowHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail as BackendChatMessage;
      if (detail && (detail.text || (detail as any).content)) {
        onMessage(detail);
      }
    };
    window.addEventListener('am_new_cloud_chat', windowHandler);
  }

  const unsub = hub.subscribe((incomingMsg) => {
    if (!incomingMsg || (!incomingMsg.text && !(incomingMsg as any).content)) return;
    const currentEmail = getEmail();
    if (!currentEmail) return;

    const myNorm = normalizeUserId(currentEmail);
    const sNorm = normalizeUserId(incomingMsg.senderId || (incomingMsg as any).sender_id || (incomingMsg as any).fromId);
    const rNorm = normalizeUserId(incomingMsg.receiverId || (incomingMsg as any).receiver_id || (incomingMsg as any).toId);

    const isForMe = Boolean(
      sNorm === myNorm ||
      rNorm === myNorm ||
      !rNorm ||
      (myNorm === 'admin_nurmiyaty' && (sNorm.includes('admin') || rNorm.includes('admin')))
    );

    if (isForMe) {
      // Pastikan struktur ternormalisasi dengan baik agar langsung cocok di room obrolan
      const effectiveRoomId = incomingMsg.roomId || (incomingMsg as any).room_id || getDeterministicRoomId(sNorm, rNorm || myNorm);
      onMessage({
        ...incomingMsg,
        text: incomingMsg.text || (incomingMsg as any).content || '',
        senderId: sNorm,
        receiverId: rNorm || myNorm,
        roomId: effectiveRoomId
      });
    }
  });

  return () => {
    unsub();
    if (windowHandler && typeof window !== 'undefined') {
      window.removeEventListener('am_new_cloud_chat', windowHandler);
    }
  };
}

/**
 * 👀 Tandai Pesan sebagai Sudah Dibaca di Lokal & Cloud (Redis Read Sync)
 */
export async function markCloudChatAsRead(identifier: string, roomId?: string) {
  if (!identifier || typeof window === 'undefined') return;
  const myNorm = normalizeUserId(identifier);

  try {
    const localKey = `am_local_chats_${myNorm}`;
    const raw = localStorage.getItem(localKey);
    const localList: BackendChatMessage[] = raw ? JSON.parse(raw) : [];
    let changed = false;
    const updated = localList.map(m => {
      const rNorm = normalizeUserId(m.receiverId);
      const isForMe = rNorm === myNorm;
      const isTargetRoom = !roomId || m.roomId === roomId;
      if (isForMe && isTargetRoom && (m.isRead !== true || m.status !== 'read')) {
        changed = true;
        return { ...m, isRead: true, status: 'read' as const };
      }
      return m;
    });
    if (changed) {
      localStorage.setItem(localKey, JSON.stringify(updated));
    }

    // 1. Simpan Timestamp Baca ke Redis Cloud agar pengirim di HP/Laptop lain tahu pesan sudah dibaca
    if (roomId) {
      const readKey = `am_read_${roomId}_${myNorm}`;
      const nowStr = Date.now().toString();
      redis.set(readKey, nowStr, 86400).catch(() => {});
    }

    // 2. Broadcast ke Tab / Window Lokal via BroadcastChannel
    getHubInstance().publishRead({
      roomId: roomId || '',
      readerId: myNorm,
      readAt: Date.now()
    });

    // 3. Pancarkan Custom Event Window Lokal
    window.dispatchEvent(new CustomEvent('am_messages_read', {
      detail: { roomId, readerId: myNorm }
    }));
  } catch (_e) {}
}

/**
 * ❤️ Sinkronkan Reaksi Pesan Chat ke Redis Cloud & Broadcast Antar Tab/Perangkat
 */
export async function syncCloudReaction(
  msgId: string | number,
  emoji: string,
  roomId?: string,
  userId?: string,
  action: 'add' | 'remove' | 'toggle' = 'add'
) {
  if (!msgId || !emoji || typeof window === 'undefined') return;
  const cleanRoomId = roomId ? String(roomId).toLowerCase().trim() : 'global';
  const uId = String(userId || 'me').toLowerCase().trim();

  // 1. Simpan reaksi ke LocalStorage berbasis array user ID untuk mencegah duplikasi
  try {
    const raw = localStorage.getItem('am_chat_reactions') || '{}';
    const reactionStore = JSON.parse(raw);
    const key = `${cleanRoomId}_${msgId}`;
    if (!reactionStore[key]) reactionStore[key] = {};

    let userList: string[] = [];
    if (Array.isArray(reactionStore[key][emoji])) {
      userList = [...reactionStore[key][emoji]];
    } else if (typeof reactionStore[key][emoji] === 'number') {
      userList = reactionStore[key][emoji] > 0 ? ['legacy_user'] : [];
    }

    const idx = userList.findIndex(u => u.toLowerCase().trim() === uId);
    if (action === 'remove') {
      if (idx >= 0) userList.splice(idx, 1);
    } else if (action === 'toggle') {
      if (idx >= 0) userList.splice(idx, 1);
      else userList.push(uId);
    } else {
      if (idx === -1) userList.push(uId);
    }

    reactionStore[key][emoji] = userList;
    localStorage.setItem('am_chat_reactions', JSON.stringify(reactionStore));
  } catch (_e) {}

  // 2. Simpan reaksi ke Upstash Redis Cloud
  try {
    const redisKey = `am_reactions_${cleanRoomId}_${msgId}`;
    if (typeof (redis as any).hincrby === 'function') {
      await (redis as any).hincrby(redisKey, emoji, action === 'remove' ? -1 : 1);
    }
  } catch (_e) {}

  // 3. Broadcast ke Tab / Window Lokal via BroadcastChannel
  try {
    const bc = new BroadcastChannel('am_campus_chat_channel_v4');
    bc.postMessage({
      type: 'reaction',
      data: { msgId: String(msgId), emoji, roomId: cleanRoomId, userId: uId, action }
    });
    bc.close();
  } catch (_e) {}

  // 4. Pancarkan Custom Event Window Lokal
  window.dispatchEvent(new CustomEvent('am_chat_reaction', {
    detail: { msgId: String(msgId), emoji, roomId: cleanRoomId, userId: uId, action }
  }));

  // 5. Siarkan ke Soketi / Pusher Room Channel Real-Time
  try {
    const parts = cleanRoomId.includes('___') ? cleanRoomId.split('___') : (cleanRoomId.includes('_') ? cleanRoomId.replace(/^(chat_|order_[^_]+_)/, '').split('_') : []);
    const userA = parts[0] || uId;
    const userB = parts[1] || 'admin_nurmiyaty';
    broadcastSoketiAction(userA, userB, 'ReactionAdded', {
      id: String(msgId),
      msgId: String(msgId),
      emoji,
      roomId: cleanRoomId,
      userId: uId,
      action
    });
  } catch (_e) {}
}

/**
 * 👥 Sinkronkan Daftar Kontak Pengguna secara Global
 */
export async function getCloudContacts(userEmail: string) {
  const myNorm = normalizeUserId(userEmail);
  const contactMap = new Map<string, any>();

  // 1. Kontak Standar Resmi (Fixed Admin Support System)
  contactMap.set('admin_nurmiyaty', {
    id: 'admin_nurmiyaty',
    nama: 'Nurmiyaty (Super Admin)',
    email: 'miyya@gmail.com',
    role: 'superadmin',
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Nurmiyaty'
  });

  contactMap.set('s1', {
    id: 'coop_koperasi',
    nama: 'Admin Koperasi UIN Antasari',
    email: 's1',
    role: 'coop_admin',
    avatar: KOPERASI_ADMIN_AVATAR
  });

  // 2. Ambil dari akun lokal terdaftar secara dinamis murni
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('am_registered_users');
      const regUsers: any[] = raw ? JSON.parse(raw) : [];
      regUsers.forEach(u => {
        const uId = String(u.id || u.email || '').toLowerCase().trim();
        const uNorm = normalizeUserId(uId);
        if (uNorm && uNorm !== myNorm) {
          contactMap.set(uNorm, {
            id: u.id || uNorm,
            nama: u.nama || u.name || 'Pengguna Kampus',
            email: u.email || uNorm,
            role: u.role || (u.roles && u.roles[0]) || 'buyer',
            avatar: getUserAvatar(u.email || u.id, u.nama || u.name, u.role, u.avatar)
          });
        }
      });
    } catch (_e) {}
  }

  // 3. Tambahkan pengguna kampus standar (Pembeli/Raisa, Penjual, Driver) jika belum ada
  if (!contactMap.has('raisa14@gmail.com') && myNorm !== 'raisa14@gmail.com' && !myNorm.includes('raisa')) {
    contactMap.set('raisa14@gmail.com', {
      id: 'raisa14@gmail.com',
      nama: 'Raisa (Pembeli)',
      email: 'raisa14@gmail.com',
      role: 'buyer',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Raisa'
    });
  }
  if (!contactMap.has('seller_1') && myNorm !== 'seller_1') {
    contactMap.set('seller_1', {
      id: 'seller_1',
      nama: 'Myammiy Craft (Katalog Resmi)',
      email: 'seller_1@campusmart.ac.id',
      role: 'seller',
      avatar: MYAMMIY_STORE_AVATAR
    });
  }
  if (!contactMap.has('driver_kampus') && myNorm !== 'driver_kampus' && !myNorm.includes('driver')) {
    contactMap.set('driver_kampus', {
      id: 'driver_kampus',
      nama: 'Driver Kampus',
      email: 'driver@campusmart.ac.id',
      role: 'driver',
      avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=driver'
    });
  }

  // Hapus akun diri sendiri secara ketat dari daftar kontak
  contactMap.delete(myNorm);
  const isMeSuperAdmin = myNorm === 'admin_nurmiyaty' || myNorm.includes('admin') || myNorm.includes('nurmiyaty') || myNorm.includes('miyya');
  const isMeCoopAdmin = myNorm === 'coop_koperasi' || myNorm === 's1' || myNorm.includes('coop') || myNorm.includes('koperasi');

  if (isMeSuperAdmin) {
    contactMap.delete('admin_nurmiyaty');
  }
  if (isMeCoopAdmin) {
    contactMap.delete('s1');
    contactMap.delete('coop_koperasi');
  }

  return { success: true, contacts: Array.from(contactMap.values()) };
}

/**
 * ✏️ Edit Teks Pesan di Cache Lokal, Redis Cloud & Soketi Real-Time
 */
export async function syncCloudMessageUpdate(
  msgId: string | number,
  newText: string,
  currentUserId: string,
  partnerId: string,
  options?: {
    oldText?: string;
    clientId?: string | number;
    roomId?: string;
  }
) {
  if (!msgId || !newText || typeof window === 'undefined') return;
  const sNorm = normalizeUserId(currentUserId);
  const rNorm = normalizeUserId(partnerId);
  const sMsgId = String(msgId);
  const targetClientIdStr = options?.clientId ? String(options.clientId) : '';
  const updatedAt = new Date().toISOString();
  const oldCleanText = options?.oldText ? options.oldText.trim() : '';

  // 1. Perbarui di LocalStorage secara menyeluruh (semua am_local_chats_* dan am_chat_history_*)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('am_local_chats_') || key.startsWith('am_chat_history_'))) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            let changed = false;
            const updated = list.map((m: any) => {
              const idMatch = (m.id != null && String(m.id) === sMsgId) ||
                              (m.client_id && String(m.client_id) === sMsgId) ||
                              (targetClientIdStr && m.id != null && String(m.id) === targetClientIdStr) ||
                              (targetClientIdStr && (m as any).client_id && String((m as any).client_id) === targetClientIdStr) ||
                              (m._id && String(m._id) === sMsgId);
              const textMatch = !idMatch && oldCleanText && ((m.text || m.content || '').trim() === oldCleanText);
              if (idMatch || textMatch) {
                changed = true;
                return {
                  ...m,
                  text: newText,
                  content: newText,
                  isEdited: true,
                  is_edited: true,
                  updatedAt,
                  edited_at: updatedAt
                };
              }
              return m;
            });
            if (changed) {
              localStorage.setItem(key, JSON.stringify(updated));
            }
          }
        } catch (_err) {}
      }
    }
  } catch (_e) {}

  // 2. Broadcast via Local Hub BroadcastChannel
  getHubInstance().publishMessageUpdated({
    id: sMsgId,
    client_id: targetClientIdStr,
    text: newText,
    old_text: options?.oldText,
    sender_id: sNorm,
    updatedAt,
    edited_at: updatedAt
  });

  // 3. Dispatch Local Window Event
  window.dispatchEvent(new CustomEvent('am_message_updated', {
    detail: {
      id: sMsgId,
      client_id: targetClientIdStr,
      text: newText,
      old_text: options?.oldText,
      sender_id: sNorm,
      updatedAt,
      edited_at: updatedAt
    }
  }));

  // 4. Siarkan ke Soketi / Pusher Channel Real-Time
  try {
    broadcastSoketiAction(sNorm, rNorm, 'MessageUpdated', {
      id: sMsgId,
      client_id: targetClientIdStr,
      text: newText,
      old_text: options?.oldText,
      sender_id: sNorm,
      updated_at: updatedAt,
      edited_at: updatedAt
    });
  } catch (_e) {}

  // 5. Perbarui di Upstash Redis Cloud
  try {
    const roomId = options?.roomId || getDeterministicRoomId(sNorm, rNorm);
    const legacyRoom = [sNorm, rNorm].sort().join('__');
    redis.set(`am_msg_update_${sMsgId}`, {
      id: sMsgId,
      text: newText,
      is_edited: true,
      updatedAt
    }, 86400).catch(() => {});

    [roomId, legacyRoom].forEach(async (rId) => {
      try {
        const list = await redis.lrange<BackendChatMessage>(`am_chat_room_${rId}`, 0, -1);
        if (Array.isArray(list) && list.length > 0) {
          let changed = false;
          const updated = list.map(m => {
            const idMatch = (m.id != null && String(m.id) === sMsgId) ||
                            ((m as any).client_id && String((m as any).client_id) === sMsgId) ||
                            (targetClientIdStr && String(m.id) === targetClientIdStr);
            const textMatch = !idMatch && oldCleanText && ((m.text || (m as any).content || '').trim() === oldCleanText);
            if (idMatch || textMatch) {
              changed = true;
              return {
                ...m,
                text: newText,
                content: newText,
                isEdited: true,
                is_edited: true,
                updatedAt
              };
            }
            return m;
          });
          if (changed) {
            await redis.del(`am_chat_room_${rId}`);
            for (const item of updated) {
              await redis.rpush(`am_chat_room_${rId}`, item, 86400);
            }
          }
        }
      } catch (_err) {}
    });
  } catch (_e) {}
}

/**
 * 🗑️ Hapus Pesan ("Pesan ini telah dihapus untuk semua orang") di LocalStorage, Redis & Soketi
 */
export async function syncCloudMessageDelete(
  msgId: string | number,
  currentUserId: string,
  partnerId: string,
  options?: {
    clientId?: string | number;
    roomId?: string;
  }
) {
  if (!msgId || typeof window === 'undefined') return;
  const sNorm = normalizeUserId(currentUserId);
  const rNorm = normalizeUserId(partnerId);
  const sMsgId = String(msgId);
  const targetClientIdStr = options?.clientId ? String(options.clientId) : '';
  const deletedText = 'Pesan ini telah dihapus untuk semua orang';

  // 1. Tandai dihapus di LocalStorage untuk seluruh cache obrolan
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('am_local_chats_') || key.startsWith('am_chat_history_'))) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            let changed = false;
            const updated = list.map((m: any) => {
              const match = (m.id != null && String(m.id) === sMsgId) ||
                            (m.client_id && String(m.client_id) === sMsgId) ||
                            (targetClientIdStr && m.id != null && String(m.id) === targetClientIdStr);
              if (match) {
                changed = true;
                return {
                  ...m,
                  text: deletedText,
                  content: deletedText,
                  isDeleted: true,
                  is_deleted: true
                };
              }
              return m;
            });
            if (changed) {
              localStorage.setItem(key, JSON.stringify(updated));
            }
          }
        } catch (_err) {}
      }
    }
  } catch (_e) {}

  // 2. Broadcast via Local Hub BroadcastChannel
  getHubInstance().publishMessageDeleted({ id: sMsgId, client_id: targetClientIdStr });

  // 3. Dispatch Local Window Event
  window.dispatchEvent(new CustomEvent('am_message_deleted', {
    detail: { id: sMsgId, client_id: targetClientIdStr, text: deletedText }
  }));

  // 4. Siarkan ke Soketi / Pusher Channel Real-Time
  try {
    broadcastSoketiAction(sNorm, rNorm, 'MessageDeleted', {
      id: sMsgId,
      client_id: targetClientIdStr
    });
  } catch (_e) {}
}

// 🔌 Re-export Echo / Soketi Tools untuk kemudahan akses
export {
  getEcho,
  getSoketiConfig,
  subscribeToSoketiRoom,
  broadcastSoketiAction,
  getSoketiRoomChannel,
  isSoketiActive,
  getSoketiState,
  broadcastChatHttp,
  broadcastMessageToSoketi,
  type SoketiRoomEventHandlers
} from './echo';

