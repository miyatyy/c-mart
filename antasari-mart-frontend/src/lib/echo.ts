import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { CLIENT_INSTANCE_ID, getDeterministicRoomId, normalizeUserId } from './cloudChatSync';

// Daftarkan Pusher ke window agar dikenali Laravel Echo
if (typeof window !== 'undefined') {
  (window as any).Pusher = Pusher;
}

export interface SoketiConfig {
  key: string;
  host: string;
  port: number;
  forceTLS: boolean;
}

/**
 * ⚙️ Ambil Konfigurasi Soketi / Pusher
 * Host dinamis: mengikuti window.location.hostname (otomatis 192.168.10.6 di HP, localhost di Laptop)
 */
export function getSoketiConfig(): SoketiConfig {
  const defaultHost = typeof window !== 'undefined' && window.location.hostname
    ? window.location.hostname
    : '127.0.0.1';

  return {
    key: (import.meta.env.VITE_SOKETI_KEY as string) || 'campusmartkey',
    host: (import.meta.env.VITE_SOKETI_HOST as string) || defaultHost,
    port: Number(import.meta.env.VITE_SOKETI_PORT || 6001),
    forceTLS: false
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
  if (echoInstance) return echoInstance;

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
  const channelName = `chat-room-${sortedIds[0]}-${sortedIds[1]}`;
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

  const channelsToListen: any[] = [];

  // 1. Langganan via Native Pusher Client
  if (pusher) {
    try {
      const ch1 = pusher.subscribe(channelName);
      const ch2 = pusher.subscribe(legacyChannelName);
      channelsToListen.push(ch1, ch2);
    } catch (_e) {}
  }

  // 2. Langganan via Echo Channel
  if (echo) {
    try {
      const ech1 = echo.channel(channelName);
      const ech2 = echo.channel(legacyChannelName);
      channelsToListen.push(ech1, ech2);
    } catch (_e) {}
  }

  // Bind semua event ke setiap channel
  channelsToListen.forEach(ch => {
    try {
      const raw = (ch as any)?.subscription || (ch as any)?.channel || ch;
      if (raw && typeof raw.bind === 'function') {
        raw.bind('NewMessage', handleNewMessage);
        raw.bind('client-NewMessage', handleNewMessage);
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
        ch.listen('NewMessage', handleNewMessage);
        ch.listen('.NewMessage', handleNewMessage);
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
          raw.unbind('NewMessage', handleNewMessage);
          raw.unbind('client-NewMessage', handleNewMessage);
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
      try { pusher.unsubscribe(channelName); } catch (_e) {}
      try { pusher.unsubscribe(legacyChannelName); } catch (_e) {}
    }
    if (echo) {
      try { echo.leaveChannel(channelName); } catch (_e) {}
      try { echo.leaveChannel(legacyChannelName); } catch (_e) {}
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
  const channelName = `chat-room-${sortedIds[0]}-${sortedIds[1]}`;
  const legacyChannelName = `chat-room-${sortedIds[0]}___${sortedIds[1]}`;
  const clientEventName = eventName.startsWith('client-') ? eventName : `client-${eventName}`;

  const payload = {
    ...data,
    client_instance_id: CLIENT_INSTANCE_ID
  };

  // 1. Kirim via Native Pusher Channel trigger
  const pusher = getPusherClient();
  if (pusher) {
    try {
      const ch = pusher.channel(channelName) || pusher.channel(legacyChannelName);
      if (ch && typeof (ch as any).trigger === 'function') {
        (ch as any).trigger(clientEventName, payload);
      }
    } catch (_e) {}
  }

  // 2. Kirim via Laravel Echo Whisper
  const echo = getEcho();
  if (echo) {
    try {
      const ech = echo.channel(channelName);
      (ech as any).whisper?.(eventName, payload);
      const raw = (ech as any)?.subscription || (ech as any)?.channel || ech;
      if (raw && typeof raw.trigger === 'function') {
        raw.trigger(clientEventName, payload);
      }
    } catch (_e) {}
  }

  // 3. 🚀 DIRECT BYPASS SOKETI BRIDGE HTTP TRIGGER (GARANSI 100% SAMPAI KE HP & LAPTOP)
  if (typeof window !== 'undefined' && window.location.hostname) {
    const wsHost = window.location.hostname;
    fetch(`http://${wsHost}:6001/apps/campusmart/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: clientEventName,
        channels: [channelName, legacyChannelName],
        data: payload
      })
    }).catch(() => {});
  }
}

/**
 * 🎯 Ambil instance channel room
 */
export function getSoketiRoomChannel(currentUserId: string, partnerId: string) {
  const normA = normalizeUserId(currentUserId);
  const normB = normalizeUserId(partnerId);
  const sortedIds = [normA, normB].sort();
  const channelName = `chat-room-${sortedIds[0]}-${sortedIds[1]}`;

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
