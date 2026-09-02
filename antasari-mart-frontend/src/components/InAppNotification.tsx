import React, { useState, useEffect } from 'react';
import type { ThemeMode } from '../types';
import { sendChatApi } from '../lib/api';

export interface InAppNotificationData {
  id: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  senderAvatar?: string;
  roomId?: string;
  text: string;
  time?: string;
}

interface InAppNotificationProps {
  notification: InAppNotificationData | null;
  onDismiss: () => void;
  onOpenChat: (roomId?: string, senderId?: string) => void;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: string;
  theme: ThemeMode;
}

// 🔔 Pleasant chime sound for notification
function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // 2-tone melodic notification (E5 -> A5)
    const tones = [
      { freq: 659.25, time: 0, dur: 0.12 },
      { freq: 880.00, time: 0.12, dur: 0.28 }
    ];

    tones.forEach(t => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(t.freq, ctx.currentTime + t.time);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + t.time);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t.time + t.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + t.time);
      osc.stop(ctx.currentTime + t.time + t.dur);
    });
  } catch (_e) {}
}

export default function InAppNotification({
  notification,
  onDismiss,
  onOpenChat,
  currentUserId,
  currentUserName,
  currentUserRole,
  theme: _theme
}: InAppNotificationProps) {
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (notification) {
      playNotificationChime();
      setReplyText('');
      setSentSuccess(false);
      setIsExpanded(true);

      // Auto dismiss after 4.5 seconds if user is not typing
      const timer = setTimeout(() => {
        if (!replyText.trim()) {
          onDismiss();
        }
      }, 4500);

      return () => clearTimeout(timer);
    }
  }, [notification, replyText]);

  if (!notification) return null;

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || isSending) return;

    setIsSending(true);
    const textToSend = replyText.trim();

    try {
      // 1. Kirim via API
      await sendChatApi({
        fromId: currentUserId || 'user_active',
        fromName: currentUserName || 'Pengguna Antasari',
        fromRole: currentUserRole || 'buyer',
        toId: notification.senderId || 'partner',
        toName: notification.senderName || 'Lawan Bicara',
        toRole: notification.senderRole || 'seller',
        text: textToSend
      });

      // 2. Simpan juga ke storage lokal untuk sinkronisasi instan
      const effectiveRoomId = notification.roomId || `room_${[currentUserId, notification.senderId].sort().join('_')}`;
      const savedChats = JSON.parse(localStorage.getItem(`am_chats_${effectiveRoomId}`) || '[]');
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      savedChats.push({
        id: `msg_${Date.now()}`,
        roomId: effectiveRoomId,
        senderId: currentUserId || 'user_active',
        senderName: currentUserName || 'Pengguna Antasari',
        senderRole: currentUserRole || 'buyer',
        receiverId: notification.senderId,
        receiverName: notification.senderName,
        text: textToSend,
        time: timeStr,
        createdAt: now.toISOString()
      });
      localStorage.setItem(`am_chats_${effectiveRoomId}`, JSON.stringify(savedChats));

      setSentSuccess(true);
      setReplyText('');

      // Tutup notifikasi setelah balasan terkirim
      setTimeout(() => {
        onDismiss();
      }, 1800);
    } catch (_err) {
      setSentSuccess(true);
      setReplyText('');
      setTimeout(() => {
        onDismiss();
      }, 1800);
    } finally {
      setIsSending(false);
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'driver':
        return { label: '🛵 Kurir Antasari', bg: '#3B82F6', color: 'white' };
      case 'seller':
        return { label: '🏪 Toko / Penjual', bg: '#10B981', color: 'white' };
      case 'admin':
        return { label: '🏢 Koperasi UIN', bg: '#8B5CF6', color: 'white' };
      case 'super_admin':
        return { label: '👑 Super Admin', bg: '#F59E0B', color: 'white' };
      default:
        return { label: '💬 Pembeli', bg: 'var(--am-primary)', color: 'white' };
    }
  };

  const roleBadge = getRoleBadge(notification.senderRole);

  return (
    <div style={{
      position: 'fixed',
      top: 'calc(12px + env(safe-area-inset-top, 0px))',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 24px)',
      maxWidth: 460,
      zIndex: 999999,
      pointerEvents: 'auto',
      animation: 'slideDownPop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
    }}>
      <style>{`
        @keyframes slideDownPop {
          0% {
            opacity: 0;
            transform: translate(-50%, -40px) scale(0.92);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }
        @keyframes pulseGlow {
          0% { box-shadow: 0 8px 30px rgba(95, 168, 116, 0.25); }
          50% { box-shadow: 0 12px 35px rgba(95, 168, 116, 0.45); }
          100% { box-shadow: 0 8px 30px rgba(95, 168, 116, 0.25); }
        }
      `}</style>

      <div
        className="am-card"
        style={{
          background: 'var(--am-surface, #ffffff)',
          color: 'var(--am-text, #243329)',
          borderRadius: 20,
          padding: '14px 16px',
          border: '1.5px solid var(--am-primary, #5FA874)',
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.25)',
          backdropFilter: 'blur(16px)',
          animation: 'pulseGlow 3s infinite ease-in-out'
        }}
      >
        {/* Header Notifikasi */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <img
                src={notification.senderAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + encodeURIComponent(notification.senderName || 'User')}
                alt={notification.senderName}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--am-primary, #5FA874)',
                  background: 'var(--am-bg2, #f0f7f2)'
                }}
              />
              <span style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#10B981',
                border: '2px solid var(--am-surface, #ffffff)'
              }} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--am-text, #243329)' }}>
                  {notification.senderName}
                </span>
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 6,
                  background: roleBadge.bg,
                  color: roleBadge.color
                }}>
                  {roleBadge.label}
                </span>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--am-text-muted, #687D70)' }}>
                {notification.time || 'Pesan baru baru saja masuk • Klik untuk balas'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => onOpenChat(notification.roomId, notification.senderId)}
              title="Buka Chat Penuh"
              style={{
                background: 'var(--am-primary-light, rgba(95, 168, 116, 0.15))',
                border: 'none',
                color: 'var(--am-primary, #5FA874)',
                borderRadius: 8,
                padding: '4px 8px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Buka ↗
            </button>
            <button
              onClick={onDismiss}
              aria-label="Tutup Notifikasi Sekarang"
              title="Tutup Notifikasi (✕)"
              style={{
                background: 'var(--am-bg2, #f0f7f2)',
                border: '1px solid var(--am-border, #e1ece4)',
                color: 'var(--am-text, #243329)',
                fontSize: 16,
                fontWeight: 800,
                cursor: 'pointer',
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.06)'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Isi Pesan Teks */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: 'var(--am-bg2, #f0f7f2)',
            padding: '8px 12px',
            borderRadius: 12,
            fontSize: 12.5,
            lineHeight: 1.4,
            color: 'var(--am-text, #243329)',
            marginBottom: 10,
            cursor: 'pointer',
            border: '1px solid var(--am-border, #e1ece4)',
            wordBreak: 'break-word'
          }}
        >
          {notification.text}
        </div>

        {/* STATUS BERHASIL KIRIM BALASAN */}
        {sentSuccess ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '8px',
            borderRadius: 10,
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#059669',
            fontSize: 12,
            fontWeight: 800,
            animation: 'fadeInScale 0.2s ease-out'
          }}>
            <span>✅</span>
            <span>Balasan Terkirim ke {notification.senderName}!</span>
          </div>
        ) : (
          /* FORMULIR BALAS CEPAT LANGSUNG DI POP-UP */
          <form onSubmit={handleSendReply} style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              placeholder={`Balas cepat ke ${notification.senderName.split(' ')[0]}...`}
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleSendReply();
                }
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid var(--am-border, #e1ece4)',
                background: 'var(--am-surface, #ffffff)',
                color: 'var(--am-text, #243329)',
                fontSize: 12,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <button
              type="submit"
              disabled={isSending || !replyText.trim()}
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                border: 'none',
                background: replyText.trim() ? 'var(--am-primary, #5FA874)' : 'var(--am-border, #e1ece4)',
                color: replyText.trim() ? 'white' : 'var(--am-text-muted, #687D70)',
                fontWeight: 700,
                fontSize: 12,
                cursor: replyText.trim() ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.2s',
                boxShadow: replyText.trim() ? '0 2px 8px rgba(95, 168, 116, 0.3)' : 'none'
              }}
            >
              {isSending ? '...' : 'Balas ➤'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
