import React, { useState, useEffect } from 'react';
import type { ThemeMode } from '../types';
import { sendChatApi, askMyammiyAIApi, askSellerAIApi } from '../lib/api';

export interface InAppNotificationData {
  id: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  senderAvatar?: string;
  roomId?: string;
  text: string;
  time?: string;
  isAi?: boolean;
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

// 🔔 Melodic Chime Sound
function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // 2-tone gentle chime
    const tones = [
      { freq: 659.25, time: 0, dur: 0.12 },
      { freq: 880.00, time: 0.12, dur: 0.28 }
    ];

    tones.forEach(t => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(t.freq, ctx.currentTime + t.time);
      gain.gain.setValueAtTime(0.18, ctx.currentTime + t.time);
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
  const [isHoveredOrFocused, setIsHoveredOrFocused] = useState(false);

  useEffect(() => {
    if (notification) {
      playNotificationChime();
      setReplyText('');
      setSentSuccess(false);

      // Auto dismiss after 6.5s if not typing or hovering
      const timer = setTimeout(() => {
        if (!replyText.trim() && !isHoveredOrFocused) {
          onDismiss();
        }
      }, 6500);

      return () => clearTimeout(timer);
    }
  }, [notification, replyText, isHoveredOrFocused]);

  if (!notification) return null;

  const isAiSender = notification.isAi ||
    notification.senderRole === 'ai' ||
    notification.senderId === 'myammiy_ai' ||
    notification.senderId.toLowerCase().includes('ai') ||
    notification.senderName.toLowerCase().includes('myammiy') ||
    notification.senderName.toLowerCase().includes('asisten');

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || isSending) return;

    setIsSending(true);
    const textToSend = replyText.trim();

    try {
      const effectiveRoomId = notification.roomId || `room_${[currentUserId, notification.senderId].sort().join('__')}`;
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // 1. Simpan pesan keluar ke storage lokal
      const userClean = (currentUserId || 'user_active').toLowerCase().trim();
      const savedScoped = JSON.parse(localStorage.getItem(`am_local_chats_${userClean}`) || '[]');
      const newOutMsg = {
        id: `msg_${Date.now()}`,
        roomId: effectiveRoomId,
        senderId: currentUserId || 'user_active',
        senderName: currentUserName || 'Pengguna Antasari',
        senderRole: currentUserRole || 'buyer',
        receiverId: notification.senderId,
        receiverName: notification.senderName,
        text: textToSend,
        time: timeStr,
        createdAt: now.toISOString(),
        isRead: true
      };
      savedScoped.push(newOutMsg);
      localStorage.setItem(`am_local_chats_${userClean}`, JSON.stringify(savedScoped));

      // 2. Jika pengirim adalah AI (Myammiy / DeepSeek)
      if (isAiSender) {
        setSentSuccess(true);
        setReplyText('');

        // Panggil AI respons di latar belakang
        setTimeout(async () => {
          try {
            let aiReplyText = '';
            if (notification.senderId === 'myammiy_ai' || notification.senderName.toLowerCase().includes('myammiy')) {
              const res = await askMyammiyAIApi(textToSend, [{ id: '1', sender: 'user', text: textToSend }]);
              aiReplyText = res?.reply || 'Halo! Myammiy siap membantu pesanan dan suvenir kampusmu 🌸';
            } else {
              const res = await askSellerAIApi({
                userMessage: textToSend,
                productName: 'Katalog Produk Kampus',
                sellerName: notification.senderName,
                buyerName: currentUserName,
                campus: 'banjarmasin'
              });
              aiReplyText = res?.reply || 'Baik Kak, ada yang bisa kami bantu lagi mengenai produk ini? ✨';
            }

            // Simpan balasan AI ke chat store
            const aiMsg = {
              id: `ai_${Date.now()}`,
              roomId: effectiveRoomId,
              senderId: notification.senderId,
              senderName: notification.senderName,
              senderRole: 'ai',
              receiverId: currentUserId,
              receiverName: currentUserName,
              text: aiReplyText,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              createdAt: new Date().toISOString(),
              isRead: false
            };
            savedScoped.push(aiMsg);
            localStorage.setItem(`am_local_chats_${userClean}`, JSON.stringify(savedScoped));

            // Trigger notifikasi pop-up baru dari AI
            window.dispatchEvent(new CustomEvent('am_trigger_notification', {
              detail: {
                id: String(Date.now()),
                senderId: notification.senderId,
                senderName: notification.senderName,
                senderRole: 'ai',
                senderAvatar: notification.senderAvatar,
                roomId: effectiveRoomId,
                text: aiReplyText,
                time: 'Baru saja',
                isAi: true
              }
            }));
          } catch (_err) {}
        }, 800);

        setTimeout(() => {
          onDismiss();
        }, 1200);
      } else {
        // 3. Jika pengirim adalah Manusia (Seller, Admin, Driver)
        await sendChatApi({
          fromId: currentUserId || 'user_active',
          fromName: currentUserName || 'Pengguna Antasari',
          fromRole: currentUserRole || 'buyer',
          toId: notification.senderId || 'partner',
          toName: notification.senderName || 'Lawan Bicara',
          toRole: notification.senderRole || 'seller',
          text: textToSend
        });

        setSentSuccess(true);
        setReplyText('');

        setTimeout(() => {
          onDismiss();
        }, 1400);
      }
    } catch (_err) {
      setSentSuccess(true);
      setReplyText('');
      setTimeout(() => {
        onDismiss();
      }, 1400);
    } finally {
      setIsSending(false);
    }
  };

  const getRoleBadge = (role?: string) => {
    if (isAiSender) {
      return { label: '🌸 Asisten AI', bg: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)', color: 'white' };
    }
    switch (role) {
      case 'driver':
        return { label: '🛵 Kurir', bg: '#3B82F6', color: 'white' };
      case 'seller':
        return { label: '🏪 Toko / Penjual', bg: '#10B981', color: 'white' };
      case 'admin':
        return { label: '🏛️ Koperasi UIN', bg: '#5FA874', color: 'white' };
      case 'super_admin':
        return { label: '👑 Super Admin', bg: '#F59E0B', color: 'white' };
      default:
        return { label: '💬 Pembeli', bg: 'var(--am-primary)', color: 'white' };
    }
  };

  const roleBadge = getRoleBadge(notification.senderRole);

  return (
    <div
      onMouseEnter={() => setIsHoveredOrFocused(true)}
      onMouseLeave={() => setIsHoveredOrFocused(false)}
      style={{
        position: 'fixed',
        top: 'calc(10px + env(safe-area-inset-top, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: 380, // Dynamic Island / Compact Pill (TIDAK FULL LEBAR)
        zIndex: 999999,
        pointerEvents: 'auto',
        animation: 'slideDownCompact 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}
    >
      <style>{`
        @keyframes slideDownCompact {
          0% {
            opacity: 0;
            transform: translate(-50%, -24px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }
        @keyframes pulseBorder {
          0% { box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(95, 168, 116, 0.3); }
          50% { box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2), 0 0 0 1.5px rgba(95, 168, 116, 0.6); }
          100% { box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(95, 168, 116, 0.3); }
        }
      `}</style>

      <div
        style={{
          background: 'rgba(255, 255, 255, 0.94)',
          color: '#1E293B',
          borderRadius: 20,
          padding: '10px 14px',
          border: '1px solid rgba(95, 168, 116, 0.35)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          animation: 'pulseBorder 3s infinite ease-in-out',
          boxShadow: '0 8px 28px rgba(0, 0, 0, 0.18)',
          fontFamily: 'var(--am-font-body, system-ui, sans-serif)'
        }}
      >
        {/* Top Header Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img
                src={notification.senderAvatar || (isAiSender
                  ? 'https://api.dicebear.com/7.x/bottts/svg?seed=MyammiyAI'
                  : 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + encodeURIComponent(notification.senderName || 'User'))}
                alt={notification.senderName}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: isAiSender ? '1.5px solid #EC4899' : '1.5px solid #5FA874',
                  background: '#F0F7F2'
                }}
              />
              <span style={{
                position: 'absolute',
                bottom: -1,
                right: -1,
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: isAiSender ? '#EC4899' : '#10B981',
                border: '1.5px solid #ffffff'
              }} />
            </div>

            {/* Name & Badge */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
                <span style={{ fontWeight: 800, fontSize: 12.5, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
                  {notification.senderName}
                </span>
                <span style={{
                  fontSize: 8.5,
                  fontWeight: 800,
                  padding: '1px 5px',
                  borderRadius: 4,
                  background: roleBadge.bg,
                  color: roleBadge.color,
                  flexShrink: 0
                }}>
                  {roleBadge.label}
                </span>
              </div>
              <div style={{ fontSize: 9.5, color: '#64748B' }}>
                {notification.time || 'Baru saja'}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <button
              onClick={() => onOpenChat(notification.roomId, notification.senderId)}
              title="Buka Chat Penuh"
              style={{
                background: 'rgba(95, 168, 116, 0.12)',
                border: 'none',
                color: '#2A543A',
                borderRadius: 6,
                padding: '3px 7px',
                fontSize: 10,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Buka ↗
            </button>
            <button
              onClick={onDismiss}
              aria-label="Tutup Notifikasi"
              style={{
                background: 'rgba(0,0,0,0.05)',
                border: 'none',
                color: '#64748B',
                fontSize: 12,
                fontWeight: 900,
                cursor: 'pointer',
                width: 22,
                height: 22,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Message Text Preview */}
        <div
          onClick={() => onOpenChat(notification.roomId, notification.senderId)}
          style={{
            background: 'rgba(240, 247, 242, 0.7)',
            padding: '6px 10px',
            borderRadius: 8,
            fontSize: 11.5,
            lineHeight: 1.35,
            color: '#1E293B',
            marginBottom: 8,
            cursor: 'pointer',
            border: '1px solid rgba(225, 236, 228, 0.8)',
            wordBreak: 'break-word',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {notification.text}
        </div>

        {/* QUICK REPLY SECTION */}
        {sentSuccess ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '5px',
            borderRadius: 8,
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#059669',
            fontSize: 11,
            fontWeight: 800
          }}>
            <span>✓</span>
            <span>Balasan Terkirim ke {notification.senderName.split(' ')[0]}!</span>
          </div>
        ) : (
          <form onSubmit={handleSendReply} style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              placeholder={isAiSender ? 'Ketik pertanyaan / perintah AI...' : `Balas ke ${notification.senderName.split(' ')[0]}...`}
              value={replyText}
              onFocus={() => setIsHoveredOrFocused(true)}
              onBlur={() => setIsHoveredOrFocused(false)}
              onChange={e => setReplyText(e.target.value)}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#0F172A',
                fontSize: 11.5,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <button
              type="submit"
              disabled={isSending || !replyText.trim()}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: 'none',
                background: replyText.trim()
                  ? (isAiSender ? 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)' : '#5FA874')
                  : '#E2E8F0',
                color: replyText.trim() ? 'white' : '#94A3B8',
                fontWeight: 800,
                fontSize: 11,
                cursor: replyText.trim() ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              {isSending ? '...' : (isAiSender ? 'Tanya AI ✨' : 'Kirim ➤')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
