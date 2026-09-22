import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';

let socket: Socket | null = null;

export const SOCKET_URL = '';

// 🛡️ Socket.io Legacy (Port 5000) dinonaktifkan sepenuhnya.
// Real-time chat & notifikasi kini 100% menggunakan Soketi / Pusher Protocol v7 di Port 6001.
export function getSocket(): Socket | null {
  // Dinonaktifkan untuk mencegah error net::ERR_CONNECTION_REFUSED ke port 5000
  return null;
}

// 👤 Daftarkan User Aktif ke WebSocket Server
export function registerSocketUser(userId: string) {
  if (!userId) return;
  const s = getSocket();
  if (s) {
    if (s.connected) {
      s.emit('register_user', userId);
    } else {
      s.once('connect', () => {
        s.emit('register_user', userId);
      });
      if (!s.active) {
        try { s.connect(); } catch (_e) {}
      }
    }
  }
}

// 📡 Bergabung ke Room Chat Pribadi
export function joinChatRoom(roomId: string, userId?: string) {
  if (!roomId) return;
  const s = getSocket();
  if (s) {
    if (s.connected) {
      s.emit('join_room', roomId, userId);
    } else {
      s.once('connect', () => {
        s.emit('join_room', roomId, userId);
      });
      if (!s.active) {
        try { s.connect(); } catch (_e) {}
      }
    }
  }
}

// 💬 Mengirim Pesan Realtime via WebSocket
export function sendSocketMessage(payload: {
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  receiverId: string;
  receiverName: string;
  receiverRole?: string;
  text: string;
  time?: string;
  createdAt?: string;
}) {
  const s = getSocket();
  if (s) {
    if (s.connected) {
      s.emit('send_message', payload);
    } else {
      s.once('connect', () => {
        s.emit('send_message', payload);
      });
      if (!s.active) {
        try { s.connect(); } catch (_e) {}
      }
    }
  }
}

// ⌨️ Mengirim Status Mulai Mengetik (Typing Start)
export function sendTypingStart(roomId: string, userId: string, userName?: string) {
  const s = getSocket();
  if (s && roomId && s.connected) {
    s.emit('typing_start', { roomId, userId, userName: userName || userId });
  }
}

// ⌨️ Mengirim Status Berhenti Mengetik (Typing Stop)
export function sendTypingStop(roomId: string, userId: string, userName?: string) {
  const s = getSocket();
  if (s && roomId && s.connected) {
    s.emit('typing_stop', { roomId, userId, userName: userName || userId });
  }
}

// ⌨️ Mengirim Status Mengetik (Generic Typing)
export function sendTypingStatus(roomId: string, userName: string, isTyping: boolean, userId?: string) {
  const s = getSocket();
  if (s && roomId && s.connected) {
    if (isTyping) {
      s.emit('typing_start', { roomId, userId: userId || userName, userName });
    } else {
      s.emit('typing_stop', { roomId, userId: userId || userName, userName });
    }
    s.emit('typing', { roomId, userName, userId, isTyping });
  }
}

// 👀 Mengirim Event Pesan Telah Dibaca (Mark as Read)
export function sendMarkAsRead(roomId: string, readerId: string) {
  const s = getSocket();
  if (s && roomId && readerId && s.connected) {
    s.emit('mark_as_read', { roomId, readerId });
  }
}

// 🔌 Cek Status Koneksi WebSocket
export function isSocketConnected(): boolean {
  return Boolean(socket && socket.connected);
}
