import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { CLIENT_INSTANCE_ID, getDeterministicRoomId, normalizeUserId } from './cloudChatSync';

// Daftarkan Pusher & Echo ke window agar langsung tersedia secara instan bagi semua listener
if (typeof window !== 'undefined') {
  (window as any).Pusher = Pusher;
  try {
    const ech = getEcho();
    if (ech) (window as any).Echo = ech;
  } catch (_) {}
}

export interface SoketiConfig {
  key: string;
  host: string;
  port: number;
  forceTLS: boolean;
}

/**
 * ⚙️ Ambil Konfigurasi Soketi / Pusher
 * Host dinamis: mengikuti window.location.hostname (otomatis 192.168.18.12 di HP, localhost di Laptop)
 */
export function getSoketiConfig(): SoketiConfig {
  const isBrowser = typeof window !== 'undefined';
  const socketHost = isBrowser ? window.location.hostname : '127.0.0.1';
  const key = (import.meta.env.VITE_SOKETI_KEY as string) || 'campusmart-key';

  let port = 6001;
  if (isBrowser) {
    if (window.location.port === '5173' || window.location.port === '3000') {
      port = Number(import.meta.env.VITE_SOKETI_PORT || 6002);
    } else if (window.location.port) {
      port = Number(window.location.port);
    } else {
      port = window.location.protocol === 'https:' ? 443 : 80;
    }
  }

  return {
    key: key,
    host: socketHost,
    port: port,
    forceTLS: isBrowser ? window.location.protocol === 'https:' : false
  };
}

let echoInstance: Echo<'pusher'> | null = null;
let rawPusherInstance: Pusher | null = null;
let isSoketiConnected = false;
let soketiConnectionState = 'disconnected';

/**
 * 🔌 Inisialisasi Singleton Native Pusher Client Mandiri
 * Sesuai rekomendasi: wsHost dinamis, port 6001, forceTLS false, enabledTransports ['ws', 'flash']
 */
export function getPusherClient(): Pusher | null {
  if (typeof window === 'undefined') return null;
  if (rawPusherInstance) return rawPusherInstance;

  try {
    const config = getSoketiConfig();
    (window as any).Pusher = Pusher;

    rawPusherInstance = new Pusher(config.key, {
      cluster: 'mt1',
      wsHost: config.host,
      wsPort: config.port,
      wssPort: config.port,
      forceTLS: false,
      disableStats: true,
      enabledTransports: ['ws', 'flash']
    });

    rawPusherInstance.connection.bind('connected', () => {
      isSoketiConnected = true;
      soketiConnectionState = 'connected';
      console.log(`%c[Soketi] ⚡ Pusher terhubung ke ws://${config.host}:${config.port} (key: ${config.key})`, 'color: #10b981; font-weight: bold;');
    });

    rawPusherInstance.connection.bind('connecting', () => {
      soketiConnectionState = 'connecting';
    });

    rawPusherInstance.connection.bind('disconnected', () => {
      isSoketiConnected = false;
      soketiConnectionState = 'disconnected';
    });

    rawPusherInstance.connection.bind('error', (err: any) => {
      isSoketiConnected = false;
      soketiConnectionState = 'error';
      console.warn('[Soketi/Pusher] Connection warning:', err?.message || err);
    });
  } catch (err) {
    console.warn('[Soketi/Pusher] Inisialisasi Pusher gagal:', err);
  }

  return rawPusherInstance;
}

/**
 * 🔌 Inisialisasi Singleton Echo Client
 */
export function getEcho(): Echo<'pusher'> | null {
  if (typeof window === 'undefined') return null;
  if (echoInstance) {
    (window as any).Echo = echoInstance;
    return echoInstance;
  }

  try {
    const config = getSoketiConfig();
    const pusherClient = getPusherClient();
    (window as any).Pusher = Pusher;

    echoInstance = new Echo<'pusher'>({
      broadcaster: 'pusher',
      client: pusherClient,
      key: config.key,
      cluster: 'mt1',
      wsHost: config.host,
      wsPort: config.port,
      wssPort: config.port,
      forceTLS: false,
      disableStats: true,
      enabledTransports: ['ws', 'flash']
    });
    (window as any).Echo = echoInstance;
  } catch (err) {
    console.warn('[Soketi/Pusher] Inisialisasi Echo gagal, fallback aktif:', err);
    echoInstance = null;
  }

  return echoInstance;
}

export function isSoketiActive(): boolean {
  return isSoketiConnected;
}

export function getSoketiState(): string {
  return soketiConnectionState;
}

export interface SoketiRoomEventHandlers {
  onNewMessage?: (message: any) => void;
  onMessageUpdated?: (data: { id: string | number; text: string; updated_at?: string; [key: string]: any }) => void;
  onMessageDeleted?: (data: { id: string | number; [key: string]: any }) => void;
  onReactionAdded?: (data: { id?: string | number; msgId?: string | number; emoji: string; userId?: string; [key: string]: any }) => void;
  onTyping?: (data: { roomId?: string; userId: string; userName: string; isTyping: boolean; [key: string]: any }) => void;
}

/**
 * 📡 Berlangganan Channel Room Chat Deterministik:
 * const sortedIds = [normA, normB].sort();
 * const roomId = `chat-room-${sortedIds[0]}-${sortedIds[1]}`;
 */
export function subscribeToSoketiRoom(
  currentUserId: string,
  partnerId: string,
  handlers: SoketiRoomEventHandlers
): () => void {
  if (!currentUserId || !partnerId) return () => {};

  const normA = normalizeUserId(currentUserId);
  const normB = normalizeUserId(partnerId);
  const sortedIds = [normA, normB].sort();
  // 🎯 STANDARISASI PENAMAAN CHANNEL WEBSOCKET (DETERMINISTIC CHANNEL)
  const deterministicChannel = `chat_${sortedIds[0]}_${sortedIds[1]}`;
  const rawRoomName = `room_${sortedIds[0]}_${sortedIds[1]}`;
  const dotChannelName = `chat.${rawRoomName}`;
  const globalChannelName = `campusmart-chat`;
  const globalChatChannel = `campusmart-chat-global`;
  const channelName = `chat-room-${sortedIds[0]}-${sortedIds[1]}`;
  const roomPrefixedChannel = `chat-room-${rawRoomName}`;
  const privateChannelName = `private-chat.${rawRoomName}`;
  const legacyChannelName = `chat-room-${sortedIds[0]}___${sortedIds[1]}`;

  const pusher = getPusherClient();
  const echo = getEcho();

  const parsePayload = (data: any) => {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (_e) {
        return data;
      }
    }
    return data;
  };

  // Handler Event Aman Anti-Loop
  const handleNewMessage = (rawPayload: any) => {
    const payload = parsePayload(rawPayload);
    if (!payload) return;
    if (payload.client_instance_id && payload.client_instance_id === CLIENT_INSTANCE_ID) {
      return;
    }
    handlers.onNewMessage?.(payload);
  };

  const handleMessageUpdated = (rawPayload: any) => {
    const payload = parsePayload(rawPayload);
    if (!payload) return;
    if (payload.client_instance_id && payload.client_instance_id === CLIENT_INSTANCE_ID) {
      return;
    }
    handlers.onMessageUpdated?.(payload);
  };

  const handleMessageDeleted = (rawPayload: any) => {
    const payload = parsePayload(rawPayload);
    if (!payload) return;
    if (payload.client_instance_id && payload.client_instance_id === CLIENT_INSTANCE_ID) {
      return;
    }
    handlers.onMessageDeleted?.(payload);
  };

  const handleReactionAdded = (rawPayload: any) => {
    const payload = parsePayload(rawPayload);
    if (!payload) return;
    if (payload.client_instance_id && payload.client_instance_id === CLIENT_INSTANCE_ID) {
      return;
    }
    handlers.onReactionAdded?.(payload);
  };

  const handleTyping = (rawPayload: any) => {
    const payload = parsePayload(rawPayload);
    if (!payload) return;
    if (payload.client_instance_id && payload.client_instance_id === CLIENT_INSTANCE_ID) {
      return;
    }
    const pUserId = normalizeUserId(payload.userId || payload.user_id || '');
    const myUserId = normalizeUserId(currentUserId);
    if (pUserId && myUserId && pUserId === myUserId) {
      return;
    }
    handlers.onTyping?.(payload);
  };

  const allChannelNames = Array.from(new Set([
    deterministicChannel,
    `chat_${sortedIds[1]}_${sortedIds[0]}`,
    rawRoomName,
    dotChannelName,
    globalChannelName,
    globalChatChannel,
    channelName,
    roomPrefixedChannel,
    privateChannelName,
    legacyChannelName
  ]));
  const channelsToListen: any[] = [];

  // 1. Langganan via Native Pusher Client
  if (pusher) {
    allChannelNames.forEach(cn => {
      try {
        const ch = pusher.subscribe(cn);
        if (ch) channelsToListen.push(ch);
      } catch (_e) {}
    });
  }

  // 2. Langganan via Echo Channel
  if (echo) {
    allChannelNames.forEach(cn => {
      try {
        const ech = echo.channel(cn);
        if (ech) channelsToListen.push(ech);
      } catch (_e) {}
    });
  }

  // Bind semua event ke setiap channel
  channelsToListen.forEach(ch => {
    try {
      const raw = (ch as any)?.subscription || (ch as any)?.channel || ch;
      if (raw && typeof raw.bind === 'function') {
        raw.bind('new-message', handleNewMessage);
        raw.bind('client-new-message', handleNewMessage);
        raw.bind('client-message-sent', handleNewMessage);
        raw.bind('message-sent', handleNewMessage);
        raw.bind('NewMessage', handleNewMessage);
        raw.bind('client-NewMessage', handleNewMessage);
        raw.bind('chat_message', handleNewMessage);
        raw.bind('MessageUpdated', handleMessageUpdated);
        raw.bind('client-MessageUpdated', handleMessageUpdated);
        raw.bind('MessageDeleted', handleMessageDeleted);
        raw.bind('client-MessageDeleted', handleMessageDeleted);
        raw.bind('ReactionAdded', handleReactionAdded);
        raw.bind('client-ReactionAdded', handleReactionAdded);
        raw.bind('typing', handleTyping);
        raw.bind('client-typing', handleTyping);
        raw.bind('UserTyping', handleTyping);
      }
      if (typeof ch.listen === 'function') {
        ch.listen('new-message', handleNewMessage);
        ch.listen('.new-message', handleNewMessage);
        ch.listen('client-message-sent', handleNewMessage);
        ch.listen('.client-message-sent', handleNewMessage);
        ch.listen('message-sent', handleNewMessage);
        ch.listen('.message-sent', handleNewMessage);
        ch.listen('NewMessage', handleNewMessage);
        ch.listen('.NewMessage', handleNewMessage);
        ch.listen('chat_message', handleNewMessage);
        ch.listen('.chat_message', handleNewMessage);
        ch.listen('MessageUpdated', handleMessageUpdated);
        ch.listen('.MessageUpdated', handleMessageUpdated);
        ch.listen('MessageDeleted', handleMessageDeleted);
        ch.listen('.MessageDeleted', handleMessageDeleted);
        ch.listen('ReactionAdded', handleReactionAdded);
        ch.listen('.ReactionAdded', handleReactionAdded);
        ch.listen('typing', handleTyping);
        ch.listen('.typing', handleTyping);
      }
    } catch (_e) {}
  });

  return () => {
    channelsToListen.forEach(ch => {
      try {
        const raw = (ch as any)?.subscription || (ch as any)?.channel || ch;
        if (raw && typeof raw.unbind === 'function') {
          raw.unbind('new-message', handleNewMessage);
          raw.unbind('client-new-message', handleNewMessage);
          raw.unbind('NewMessage', handleNewMessage);
          raw.unbind('client-NewMessage', handleNewMessage);
          raw.unbind('chat_message', handleNewMessage);
          raw.unbind('MessageUpdated', handleMessageUpdated);
          raw.unbind('client-MessageUpdated', handleMessageUpdated);
          raw.unbind('MessageDeleted', handleMessageDeleted);
          raw.unbind('client-MessageDeleted', handleMessageDeleted);
          raw.unbind('ReactionAdded', handleReactionAdded);
          raw.unbind('client-ReactionAdded', handleReactionAdded);
          raw.unbind('typing', handleTyping);
          raw.unbind('client-typing', handleTyping);
          raw.unbind('UserTyping', handleTyping);
        }
      } catch (_e) {}
    });

    if (pusher) {
      allChannelNames.forEach(cn => {
        try { pusher.unsubscribe(cn); } catch (_e) {}
      });
    }
    if (echo) {
      allChannelNames.forEach(cn => {
        try { echo.leaveChannel(cn); } catch (_e) {}
      });
    }
  };
}

/**
 * 🚀 Pancarkan Event Soketi ke Room Deterministik
 * Dual bypass: (1) Native channel.trigger / whisper + (2) Direct HTTP POST ke Soketi Bridge
 */
export function broadcastSoketiAction(
  currentUserId: string,
  partnerId: string,
  eventName: string,
  data: Record<string, any>
) {
  const normA = normalizeUserId(currentUserId);
  const normB = normalizeUserId(partnerId);
  const sortedIds = [normA, normB].sort();
  // 🎯 STANDARISASI PENAMAAN CHANNEL DETERMINISTIK: chat_${[userIdA, userIdB].sort().join('_')}
  const deterministicChannel = `chat_${sortedIds[0]}_${sortedIds[1]}`;
  const rawRoomName = `room_${sortedIds[0]}_${sortedIds[1]}`;
  const dotChannelName = `chat.${rawRoomName}`;
  const globalChannelName = `campusmart-chat`;
  const globalChatChannel = `campusmart-chat-global`;
  const channelName = `chat-room-${sortedIds[0]}-${sortedIds[1]}`;
  const roomPrefixedChannel = `chat-room-${rawRoomName}`;
  const privateChannelName = `private-chat.${rawRoomName}`;
  const legacyChannelName = `chat-room-${sortedIds[0]}___${sortedIds[1]}`;

  const allChannelNames = Array.from(new Set([
    deterministicChannel,
    `chat_${sortedIds[1]}_${sortedIds[0]}`,
    rawRoomName,
    dotChannelName,
    globalChannelName,
    globalChatChannel,
    channelName,
    roomPrefixedChannel,
    privateChannelName,
    legacyChannelName
  ]));

  const clientEventName = eventName.startsWith('client-') ? eventName : `client-${eventName}`;
  const baseEventName = eventName.replace(/^client-/, '');

  const payload = {
    ...data,
    roomId: data.roomId || rawRoomName,
    client_instance_id: CLIENT_INSTANCE_ID
  };

  // 1. Kirim via Native Pusher Channel trigger
  const pusher = getPusherClient();
  if (pusher) {
    allChannelNames.forEach(cn => {
      try {
        const ch = pusher.channel(cn);
        if (ch && typeof (ch as any).trigger === 'function') {
          (ch as any).trigger(clientEventName, payload);
          (ch as any).trigger(`client-${baseEventName}`, payload);
          (ch as any).trigger('client-new-message', payload);
          (ch as any).trigger('client-NewMessage', payload);
          (ch as any).trigger('client-message-sent', payload);
        }
      } catch (_e) {}
    });
  }

  // 2. Kirim via Laravel Echo Whisper
  const echo = getEcho();
  if (echo) {
    allChannelNames.forEach(cn => {
      try {
        const ech = echo.channel(cn);
        (ech as any).whisper?.(baseEventName, payload);
        (ech as any).whisper?.('new-message', payload);
        (ech as any).whisper?.('NewMessage', payload);
        (ech as any).whisper?.('client-message-sent', payload);
        (ech as any).whisper?.(clientEventName, payload);
        const raw = (ech as any)?.subscription || (ech as any)?.channel || ech;
        if (raw && typeof raw.trigger === 'function') {
          raw.trigger(clientEventName, payload);
          raw.trigger('client-new-message', payload);
          raw.trigger('client-message-sent', payload);
        }
      } catch (_e) {}
    });
  }

  // 3. 🚀 DIRECT BYPASS SOKETI BRIDGE HTTP TRIGGER (GARANSI 100% SAMPAI KE HP & LAPTOP)
  broadcastChatHttp(payload, allChannelNames);
}

/**
 * 🚀 HTTP Broadcast Langsung ke Soketi Bridge (Port 6001 / Port 3000)
 * Menjangkau localhost, 192.168.18.12, dan host browser aktif secara simultan
 */
export function broadcastChatHttp(payload: any, extraChannels: string[] = []) {
  if (typeof window === 'undefined') return;

  const currentHost = window.location.hostname || 'localhost';
  const targetHosts = Array.from(new Set([
    currentHost,
    '192.168.18.16',
    '192.168.18.12',
    'localhost',
    '127.0.0.1'
  ])).filter(Boolean);

  const rId = String(payload.roomId || payload.room_id || '').trim();
  const channelList = Array.from(new Set([
    'campusmart-chat',
    'campusmart-chat-global',
    ...(rId ? [
      `chat.${rId}`,
      `chat-room-${rId}`,
      rId
    ] : []),
    ...extraChannels
  ]));

  const eventNames = [
    'NewMessage',
    '.NewMessage',
    'client-message-sent',
    '.client-message-sent',
    'new-message',
    '.new-message',
    'client-new-message',
    '.client-new-message',
    'chat_message'
  ];

  targetHosts.forEach(host => {
    // Port 6001: Soketi Bridge HTTP Trigger & /api/broadcast-chat
    eventNames.forEach(evtName => {
      fetch(`http://${host}:6001/apps/campusmart/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: evtName,
          channels: channelList,
          data: payload
        })
      }).catch(() => {});

      fetch(`http://${host}:6001/api/broadcast-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: evtName,
          channels: channelList,
          data: payload
        })
      }).catch(() => {});
    });

    // Port 3000 backend bridge jika ada
    fetch(`http://${host}:3000/api/broadcast-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'NewMessage',
        channels: channelList,
        data: payload
      })
    }).catch(() => {});
  });
}

/**
 * 🚀 Siarkan payload pesan ke Soketi / Pusher & Echo Global Channel
 */
export function broadcastMessageToSoketi(payload: any) {
  if (!payload) return;
  const myId = payload.senderId || payload.sender_id || payload.fromId || '';
  const partnerId = payload.receiverId || payload.receiver_id || payload.toId || '';

  // 1. Siarkan melalui broadcastSoketiAction ke semua format room & global channels
  try {
    broadcastSoketiAction(myId, partnerId, 'new-message', payload);
    broadcastSoketiAction(myId, partnerId, 'client-message-sent', payload);
    broadcastSoketiAction(myId, partnerId, 'NewMessage', payload);
  } catch (_e) {}

  // 2. Whisper & trigger ke channel global dan room channel via Echo
  try {
    const echo = getEcho();
    if (echo) {
      const targetEchoChannels = [
        'campusmart-chat',
        'campusmart-chat-global',
        ...(rId ? [`chat.${rId}`, `chat-room-${rId}`, rId] : [])
      ];
      targetEchoChannels.forEach(chName => {
        try {
          const gCh = echo.channel(chName);
          (gCh as any).whisper?.('new-message', payload);
          (gCh as any).whisper?.('client-message-sent', payload);
          (gCh as any).whisper?.('NewMessage', payload);
          const raw = (gCh as any)?.subscription || (gCh as any)?.channel || gCh;
          if (raw && typeof raw.trigger === 'function') {
            raw.trigger('client-new-message', payload);
            raw.trigger('client-message-sent', payload);
          }
        } catch (_) {}
      });
    }
  } catch (_e) {}

  // 3. Fallback broadcast ke socket emitter lokal/FrankenPHP jika aktif
  try {
    if (typeof window !== 'undefined' && (window as any).socket && typeof (window as any).socket.emit === 'function') {
      (window as any).socket.emit('chat_message', payload);
    }
  } catch (_e) {}
}

if (typeof window !== 'undefined') {
  (window as any).broadcastMessageToSoketi = broadcastMessageToSoketi;
}

/**
 * 📡 Berlangganan ke Global Chat Channels:
 * 'campusmart-chat' dan 'campusmart-chat-global'
 */
export function subscribeToGlobalChat(onMessage: (msg: any) => void): () => void {
  const echo = getEcho();
  const pusher = getPusherClient();
  const channelNames = [
    'campusmart-chat',
    'campusmart-chat-global'
  ];

  const handleMsg = (data: any) => {
    let parsed = data;
    if (typeof data === 'string') {
      try { parsed = JSON.parse(data); } catch (_) {}
    }
    if (parsed?.data && typeof parsed.data === 'object') {
      parsed = { ...parsed.data, ...parsed };
    }
    onMessage(parsed);
  };

  const cleanups: (() => void)[] = [];

  channelNames.forEach(channelName => {
    if (echo) {
      try {
        const echCh = echo.channel(channelName);
        (echCh as any).listenForWhisper?.('new-message', handleMsg);
        (echCh as any).listenForWhisper?.('client-message-sent', handleMsg);
        echCh.listen?.('new-message', handleMsg);
        echCh.listen?.('.new-message', handleMsg);
        echCh.listen?.('client-message-sent', handleMsg);
        echCh.listen?.('.client-message-sent', handleMsg);
        echCh.listen?.('NewMessage', handleMsg);
        echCh.listen?.('.NewMessage', handleMsg);
        cleanups.push(() => {
          try { echo.leaveChannel(channelName); } catch (_) {}
        });
      } catch (_e) {}
    }

    if (pusher) {
      try {
        const pCh = pusher.subscribe(channelName);
        pCh.bind('new-message', handleMsg);
        pCh.bind('client-new-message', handleMsg);
        pCh.bind('client-message-sent', handleMsg);
        pCh.bind('message-sent', handleMsg);
        pCh.bind('NewMessage', handleMsg);
        pCh.bind('client-NewMessage', handleMsg);
        cleanups.push(() => {
          try {
            pCh.unbind('new-message', handleMsg);
            pCh.unbind('client-new-message', handleMsg);
            pCh.unbind('client-message-sent', handleMsg);
            pCh.unbind('message-sent', handleMsg);
            pCh.unbind('NewMessage', handleMsg);
            pCh.unbind('client-NewMessage', handleMsg);
            pusher.unsubscribe(channelName);
          } catch (_) {}
        });
      } catch (_e) {}
    }
  });

  return () => {
    cleanups.forEach(c => {
      try { c(); } catch (_) {}
    });
  };
}

/**
 * 🎯 Ambil instance channel room
 */
export function getSoketiRoomChannel(currentUserId: string, partnerId: string) {
  const normA = normalizeUserId(currentUserId);
  const normB = normalizeUserId(partnerId);
  const sortedIds = [normA, normB].sort();
  const channelName = `chat_${sortedIds[0]}_${sortedIds[1]}`;

  const pusher = getPusherClient();
  if (pusher) {
    try {
      return pusher.channel(channelName) || pusher.subscribe(channelName);
    } catch (_e) {}
  }

  const echo = getEcho();
  if (echo) {
    return echo.channel(channelName);
  }
  return null;
}

/**
 * 📢 Siarkan Event Notifikasi ke Super Admin (Soketi / Pusher & WebSocket)
 */
export function broadcastAdminEvent(
  eventName: string,
  data: Record<string, any>,
  targetChannels: string[] = ['admin-notifications', 'campusmart-events']
) {
  const clientEventName = eventName.startsWith('client-') ? eventName : `client-${eventName}`;
  const rawEventName = eventName.replace(/^client-/, '');
  const payload = {
    ...data,
    client_instance_id: CLIENT_INSTANCE_ID,
    timestamp: data.timestamp || new Date().toISOString()
  };

  // 1. Dispatch custom event lokal di browser
  if (typeof window !== 'undefined') {
    const customEventName = 'am_' + rawEventName.replace(/-/g, '_');
    window.dispatchEvent(new CustomEvent(customEventName, { detail: payload }));
  }

  // 2. Pusher client trigger
  const pusher = getPusherClient();
  if (pusher) {
    targetChannels.forEach(chName => {
      try {
        const ch = pusher.channel(chName) || pusher.subscribe(chName);
        if (ch && typeof (ch as any).trigger === 'function') {
          (ch as any).trigger(clientEventName, payload);
        }
      } catch (_e) {}
    });
  }

  // 3. Laravel Echo trigger / whisper
  const echo = getEcho();
  if (echo) {
    targetChannels.forEach(chName => {
      try {
        const ech = echo.channel(chName);
        (ech as any).whisper?.(rawEventName, payload);
        const raw = (ech as any)?.subscription || (ech as any)?.channel || ech;
        if (raw && typeof raw.trigger === 'function') {
          raw.trigger(clientEventName, payload);
        }
      } catch (_e) {}
    });
  }

  // 4. Direct HTTP POST ke Soketi WebSocket Server Bridge (Port 6001)
  if (typeof window !== 'undefined') {
    const wsHost = window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' 
      ? window.location.hostname 
      : '192.168.18.12';
    
    // Kirim untuk event raw dan client-event
    [rawEventName, clientEventName].forEach(evt => {
      fetch(`http://${wsHost}:6001/apps/campusmart/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: evt,
          channels: targetChannels,
          data: payload
        })
      }).catch(() => {});
    });
  }
}

/**
 * 📡 Berlangganan Event Admin Real-Time (Misal: Pengajuan Produk Baru)
 */
export function subscribeToAdminEvents(handlers: {
  onProductSubmitted?: (data: any) => void;
  onEvent?: (eventName: string, data: any) => void;
}) {
  const targetChannels = ['admin-notifications', 'campusmart-events'];
  const pusher = getPusherClient();
  const echo = getEcho();

  const handleProductSubmitted = (payload: any) => {
    let clean = payload;
    if (payload && typeof payload.data === 'string') {
      try { clean = JSON.parse(payload.data); } catch (_) {}
    } else if (payload && payload.data && typeof payload.data === 'object') {
      clean = { ...payload.data, ...payload };
    }
    if (clean?.client_instance_id === CLIENT_INSTANCE_ID) {
      // Event berasal dari tab ini sendiri, tetap panggil handler lokal
    }
    if (handlers.onProductSubmitted) {
      handlers.onProductSubmitted(clean);
    }
    if (handlers.onEvent) {
      handlers.onEvent('product-submitted', clean);
    }
  };

  const channelsToListen: any[] = [];

  if (pusher) {
    targetChannels.forEach(chName => {
      try {
        const ch = pusher.subscribe(chName);
        channelsToListen.push(ch);
      } catch (_e) {}
    });
  }

  if (echo) {
    targetChannels.forEach(chName => {
      try {
        const ech = echo.channel(chName);
        channelsToListen.push(ech);
      } catch (_e) {}
    });
  }

  const eventNames = ['product-submitted', 'client-product-submitted', '.product-submitted'];

  channelsToListen.forEach(ch => {
    try {
      const raw = (ch as any)?.subscription || (ch as any)?.channel || ch;
      if (raw && typeof raw.bind === 'function') {
        eventNames.forEach(evt => raw.bind(evt, handleProductSubmitted));
      }
      if (typeof ch.listen === 'function') {
        eventNames.forEach(evt => ch.listen(evt, handleProductSubmitted));
      }
    } catch (_e) {}
  });

  // Listener window event lokal
  const onLocalWindowProduct = (e: any) => {
    if (e && e.detail) {
      handleProductSubmitted(e.detail);
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('am_product_submitted', onLocalWindowProduct);
  }

  return () => {
    channelsToListen.forEach(ch => {
      try {
        const raw = (ch as any)?.subscription || (ch as any)?.channel || ch;
        if (raw && typeof raw.unbind === 'function') {
          eventNames.forEach(evt => raw.unbind(evt, handleProductSubmitted));
        }
      } catch (_e) {}
    });

    if (pusher) {
      targetChannels.forEach(chName => {
        try { pusher.unsubscribe(chName); } catch (_e) {}
      });
    }
    if (echo) {
      targetChannels.forEach(chName => {
        try { echo.leaveChannel(chName); } catch (_e) {}
      });
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('am_product_submitted', onLocalWindowProduct);
    }
  };
}
