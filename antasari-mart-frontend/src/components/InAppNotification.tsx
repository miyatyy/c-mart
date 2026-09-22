import React, { useState, useEffect, useRef } from 'react';
import type { ThemeMode } from '../types';
import { sendChatApi, askSellerAIApi } from '../lib/api';
import { getUserAvatar } from '../lib/userAvatars';
import { sendSocketMessage } from '../lib/socket';

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
  type?: 'chat' | 'order';
  orderData?: any;
}

interface InAppNotificationProps {
  notification: InAppNotificationData | null;
  onDismiss: () => void;
  onOpenChat: (roomId?: string, senderId?: string) => void;
  onOpenSellerDashboard?: () => void;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: string;
  theme: ThemeMode;
}

// 🔔 Melodic Chime Sound for Chat Messages
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

    setTimeout(() => {
      try { ctx.close(); } catch (_e) {}
    }, 500);
  } catch (_e) {}
}

// 🛍️ Festive Cash Register / Order Ringtone Sound for New Orders
function playOrderRingtone() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // 4-note ascending triumphant fanfare (E5 -> G#5 -> B5 -> E6)
    const notes = [
      { freq: 659.25, time: 0, dur: 0.1 },
      { freq: 830.61, time: 0.1, dur: 0.1 },
      { freq: 987.77, time: 0.2, dur: 0.12 },
      { freq: 1318.51, time: 0.32, dur: 0.45 }
    ];

    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.time);
      gain.gain.setValueAtTime(0.28, ctx.currentTime + n.time);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.time + n.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + n.time);
      osc.stop(ctx.currentTime + n.time + n.dur);
    });

    setTimeout(() => {
      try { ctx.close(); } catch (_e) {}
    }, 900);
  } catch (_e) {}
}

export default function InAppNotification({
  notification,
  onDismiss,
  onOpenChat,
  onOpenSellerDashboard,
  currentUserId,
  currentUserName,
  currentUserRole,
  theme: _theme
}: InAppNotificationProps) {
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [isHoveredOrFocused, setIsHoveredOrFocused] = useState(false);
  const replyInputRef = useRef<HTMLInputElement>(null);

  const isOrderNotification = notification?.type === 'order';

  useEffect(() => {
    if (notification) {
      if (isOrderNotification) {
        playOrderRingtone();
      } else {
        playNotificationChime();
      }
      setReplyText('');
      setSentSuccess(false);

      // Auto dismiss after 10s (or 12s for orders) if not typing or hovering
      const timeoutSecs = isOrderNotification ? 12000 : 10000;
      const timer = setTimeout(() => {
        if (!replyText.trim() && !isHoveredOrFocused) {
          onDismiss();
        }
      }, timeoutSecs);

      return () => clearTimeout(timer);
    }
  }, [notification, isOrderNotification, replyText, isHoveredOrFocused]);

  if (!notification) return null;

  const isSenderBuyer = (notification.senderRole === 'buyer' || notification.senderRole === 'pembeli') ||
    (!notification.senderRole?.includes('seller') && !notification.senderRole?.includes('admin') && !notification.senderId?.includes('seller') && !notification.senderName?.toLowerCase().includes('myammiy') && !notification.senderName?.toLowerCase().includes('asisten'));

  const isAiSender = !isSenderBuyer && (
    Boolean(notification.isAi) ||
    notification.senderRole === 'ai' ||
    notification.senderId === 'myammiy_ai' ||
    notification.senderName.toLowerCase().includes('myammiy') ||
    notification.senderName.toLowerCase().includes('asisten ai')
  );

  const handleGenerateAiReply = async () => {
    if (isGeneratingAi || !notification) return;
    setIsGeneratingAi(true);
    setIsHoveredOrFocused(true);

    try {
      const res = await askSellerAIApi({
        sellerId: currentUserId,
        sellerName: currentUserName,
        sellerRole: currentUserRole,
        buyerName: notification.senderName,
        message: notification.text
      });

      if (res && res.success && res.reply) {
        setReplyText(res.reply);
      } else {
        setReplyText(`Halo Kak ${notification.senderName}! Terima kasih sudah menghubungi kami. Stok ready dan siap dipesan yaa! 🌸✨`);
      }
    } catch (_err) {
      setReplyText(`Halo Kak ${notification.senderName}! Stok produk kami ready dan bisa langsung diambil di Vending Machine atau COD yaa! 🌸✨`);
    } finally {
      setIsGeneratingAi(false);
      setTimeout(() => replyInputRef.current?.focus(), 50);
    }
  };

  const handleSendReply = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const rawText = (customText !== undefined ? customText : replyText).trim();
    if (!rawText || isSending) return;

    setIsSending(true);
    const textToSend = rawText;

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
        isRead: true,
        status: 'sent'
      };
      savedScoped.push(newOutMsg);
      localStorage.setItem(`am_local_chats_${userClean}`, JSON.stringify(savedScoped));

      // Kirim via Socket.io Real-time
      sendSocketMessage({
        roomId: effectiveRoomId,
        fromId: currentUserId || 'user_active',
        fromName: currentUserName || 'Pengguna Antasari',
        fromRole: currentUserRole || 'buyer',
        toId: notification.senderId,
        toName: notification.senderName,
        toRole: notification.senderRole || 'seller',
        text: textToSend,
        time: timeStr
      });

      // Dispatch local event agar UI chat aktif langsung update
      window.dispatchEvent(new CustomEvent('am_chat_message_sent', { detail: newOutMsg }));

      // 2. Jika pengirim adalah AI Asisten, dapatkan balasan AI otomatis
      if (isAiSender) {
        setSentSuccess(true);
        setReplyText('');

        setTimeout(async () => {
          try {
            let aiReplyText = '';
            if (notification.senderId === 'myammiy_ai' || notification.senderName.toLowerCase().includes('myammiy')) {
              const res = await askMyammiyAIApi({
                userMessage: textToSend,
                userName: currentUserName,
                campus: 'banjarmasin'
              });
              aiReplyText = res?.reply || 'Terima kasih atas pertanyaannya! Ada yang ingin ditanyakan lagi? 🌸';
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
              isRead: false,
              status: 'delivered'
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
        // 3. Jika pengirim adalah Manusia (Seller, Admin, Driver, Buyer)
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
        }, 1200);
      }
    } catch (_err) {
      setSentSuccess(true);
      setReplyText('');
      setTimeout(() => {
        onDismiss();
      }, 1200);
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
        return { label: '🛍️ Pembeli', bg: 'var(--am-primary, #10B981)', color: 'white' };
    }
  };

  const roleBadge = getRoleBadge(notification.senderRole);

  const smartChips = isSenderBuyer ? [
    '✅ Stok Ready Kak, Silakan!',
    '🛵 Bisa COD di Kampus Hari Ini',
    '🎁 100% Handmade Pipe Cleaner Premium'
  ] : [
    '🌸 Stok produk masih ready kak?',
    '🛵 Bisa COD di kampus hari ini?',
    '💳 Mau konfirmasi order & bayar'
  ];

  return (
    <div
      onMouseEnter={() => setIsHoveredOrFocused(true)}
      onMouseLeave={() => setIsHoveredOrFocused(false)}
      style={{
        position: 'fixed',
        top: 'calc(10px + env(safe-area-inset-top, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 24px)',
        maxWidth: 440,
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
        @keyframes pulseOrderGlow {
          0% { box-shadow: 0 8px 24px rgba(16, 185, 129, 0.25), 0 0 0 1px rgba(16, 185, 129, 0.5); }
          50% { box-shadow: 0 14px 32px rgba(16, 185, 129, 0.45), 0 0 0 2px rgba(16, 185, 129, 0.8); }
          100% { box-shadow: 0 8px 24px rgba(16, 185, 129, 0.25), 0 0 0 1px rgba(16, 185, 129, 0.5); }
        }
      `}</style>

      <div
        style={{
          background: isOrderNotification ? 'rgba(255, 255, 255, 0.98)' : 'rgba(255, 255, 255, 0.96)',
          color: '#1E293B',
          borderRadius: 20,
          padding: '14px 16px',
          border: isOrderNotification ? '2px solid #10B981' : '1.5px solid rgba(16, 185, 129, 0.45)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          animation: isOrderNotification ? 'pulseOrderGlow 2s infinite ease-in-out' : 'pulseBorder 3s infinite ease-in-out',
          boxShadow: '0 10px 32px rgba(0, 0, 0, 0.18)',
          fontFamily: 'var(--am-font-body, system-ui, sans-serif)'
        }}
      >
        {/* 🌟 JIKA NOTIFIKASI PESANAN MASUK UNTUK PENJUAL (ORDER NOTIFICATION) */}
        {isOrderNotification ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 24, animation: 'floatCute 2s infinite ease-in-out' }}>🎉</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 900, fontSize: 13, color: '#059669', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Pesanan Baru Masuk!
                    </span>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#64748B' }}>
                    {notification.time || 'Baru saja'} • Notifikasi Real-time Penjual
                  </div>
                </div>
              </div>

              <button
                onClick={onDismiss}
                aria-label="Tutup Notifikasi"
                style={{
                  background: 'rgba(0,0,0,0.06)',
                  border: 'none',
                  color: '#64748B',
                  fontSize: 12,
                  fontWeight: 900,
                  cursor: 'pointer',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              background: 'rgba(240, 253, 244, 0.9)',
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(16, 185, 129, 0.3)',
              marginBottom: 10
            }}>
              <div style={{ fontWeight: 800, fontSize: 12.5, color: '#0F172A', marginBottom: 2 }}>
                {notification.senderName}
              </div>
              <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
                📦 {notification.text}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  if (onOpenSellerDashboard) {
                    onOpenSellerDashboard();
                  }
                  onDismiss();
                }}
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  boxShadow: '0 3px 10px rgba(16, 185, 129, 0.35)'
                }}
              >
                <span>🛍️</span>
                <span>Buka Dashboard Toko</span>
              </button>

              <button
                type="button"
                onClick={onDismiss}
                style={{
                  padding: '9px 12px',
                  borderRadius: 12,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#64748B',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        ) : (
          /* 💬 JIKA NOTIFIKASI CHAT MASUK (CHAT NOTIFICATION) */
          <div>
            {/* Top Header Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={getUserAvatar(notification.senderId, notification.senderName, notification.senderRole, notification.senderAvatar)}
                    alt={notification.senderName}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: isAiSender ? '1.5px solid #EC4899' : '1.5px solid #10B981',
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
                    <span style={{ fontWeight: 800, fontSize: 13, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
                      {notification.senderName}
                    </span>
                    <span style={{
                      fontSize: 9,
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: 6,
                      background: roleBadge.bg,
                      color: roleBadge.color,
                      flexShrink: 0
                    }}>
                      {roleBadge.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 9.5, color: '#64748B' }}>
                    {notification.time || 'Baru saja'} • Pesan Baru
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <button
                  onClick={() => onOpenChat(notification.roomId, notification.senderId)}
                  title="Buka Chat Penuh"
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#059669',
                    borderRadius: 8,
                    padding: '4px 8px',
                    fontSize: 10.5,
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Buka Chat ↗
                </button>
                <button
                  onClick={onDismiss}
                  aria-label="Tutup Notifikasi"
                  style={{
                    background: 'rgba(0,0,0,0.06)',
                    border: 'none',
                    color: '#64748B',
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: 'pointer',
                    width: 24,
                    height: 24,
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
                background: 'rgba(240, 247, 242, 0.75)',
                padding: '8px 12px',
                borderRadius: 10,
                fontSize: 12,
                lineHeight: 1.4,
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
              <span style={{ fontWeight: 700, color: 'var(--am-primary, #10B981)', marginRight: 4 }}>💬</span>
              {notification.text}
            </div>

            {/* AI & Quick Suggestion Chips */}
            <div style={{ display: 'flex', gap: 5, overflowX: 'auto', marginBottom: 8, paddingBottom: 2 }}>
              <button
                type="button"
                onClick={handleGenerateAiReply}
                disabled={isGeneratingAi}
                style={{
                  padding: '3px 8px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
                }}
              >
                <span>{isGeneratingAi ? '⏳ Memikirkan...' : '✨ Buatkan Balasan AI'}</span>
              </button>

              {smartChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setReplyText(chip);
                    setIsHoveredOrFocused(true);
                    setTimeout(() => replyInputRef.current?.focus(), 50);
                  }}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 10,
                    border: '1px solid var(--am-border, #E1ECE4)',
                    background: '#FFFFFF',
                    color: 'var(--am-text, #243329)',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'all 0.15s ease'
                  }}
                  title={`Klik untuk memasukkan "${chip}"`}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* QUICK REPLY FORM */}
            {sentSuccess ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '6px',
                borderRadius: 10,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#059669',
                fontSize: 11.5,
                fontWeight: 800
              }}>
                <span>✓</span>
                <span>Balasan Berhasil Terkirim ke {notification.senderName.split(' ')[0]}!</span>
              </div>
            ) : (
              <form onSubmit={handleSendReply} style={{ display: 'flex', gap: 6 }}>
                <input
                  ref={replyInputRef}
                  type="text"
                  placeholder={isAiSender ? 'Ketik pertanyaan / perintah AI...' : `Balas ke ${notification.senderName.split(' ')[0]}...`}
                  value={replyText}
                  onFocus={() => setIsHoveredOrFocused(true)}
                  onBlur={() => setIsHoveredOrFocused(false)}
                  onChange={e => setReplyText(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '7px 12px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    fontSize: 12,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="submit"
                  disabled={isSending || !replyText.trim()}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 10,
                    border: 'none',
                    background: replyText.trim()
                      ? (isAiSender ? 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)')
                      : '#E2E8F0',
                    color: replyText.trim() ? 'white' : '#94A3B8',
                    fontWeight: 800,
                    fontSize: 11.5,
                    cursor: replyText.trim() ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isSending ? '...' : (isAiSender ? 'Tanya AI ✨' : 'Balas ➤')}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
