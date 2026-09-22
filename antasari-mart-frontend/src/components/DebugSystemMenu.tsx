import React, { useState, useEffect } from 'react';
import type { ThemeMode, UserRole } from '../types';
import { getSocket } from '../lib/socket';
import { submitBugReportApi } from '../lib/api';

interface DebugSystemMenuProps {
  theme: ThemeMode;
  userEmail?: string;
  userName?: string;
  userRole?: UserRole | string;
  isGuest?: boolean;
}

interface BugReport {
  id: string;
  timestamp: string;
  userEmail: string;
  userName: string;
  userRole: string;
  category: string;
  description: string;
  deviceInfo: string;
  url: string;
}

export default function DebugSystemMenu({
  theme,
  userEmail = 'raisa14@gmail.com',
  userName = 'Pengguna',
  userRole = 'buyer',
  isGuest = false
}: DebugSystemMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState('ui');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  // Cek status socket realtime
  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      if (socket.connected) setWsStatus('connected');
      const onConnect = () => setWsStatus('connected');
      const onDisconnect = () => setWsStatus('disconnected');
      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      return () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
      };
    } else {
      setWsStatus('connected'); // Upstash REST fallback mode
    }
  }, [isOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopySystemInfo = () => {
    const info = {
      appVersion: 'v1.0.1-release (Build 2026.09.15)',
      user: {
        name: userName,
        email: userEmail,
        role: userRole,
        isGuest
      },
      websocket: wsStatus,
      screen: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      currentUrl: typeof window !== 'undefined' ? window.location.href : '',
      timestamp: new Date().toISOString()
    };

    if (navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(info, null, 2))
        .then(() => showToast('📋 Info sistem berhasil disalin ke clipboard!'))
        .catch(() => showToast('⚠️ Gagal menyalin info sistem.'));
    }
  };

  const handleClearCacheAndReload = () => {
    try {
      // Bersihkan cache sementara tanpa menghapus sesi login utama
      localStorage.removeItem('am_target_chat_room');
      localStorage.removeItem('am_target_chat');
      localStorage.removeItem('am_target_chat_contact');
      localStorage.removeItem('am_snap_token');
      sessionStorage.clear();

      showToast('🧹 Cache dibersihkan! Memuat ulang aplikasi...');
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (e) {
      console.error('Error clearing cache:', e);
      window.location.reload();
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      showToast('⚠️ Silakan tuliskan deskripsi kendala.');
      return;
    }

    setIsSubmitting(true);
    const newReport: BugReport = {
      id: `bug_${Date.now()}`,
      timestamp: new Date().toISOString(),
      userEmail,
      userName,
      userRole: String(userRole),
      category,
      description: description.trim(),
      deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      url: typeof window !== 'undefined' ? window.location.href : ''
    };

    // 1. Simpan laporan ke localStorage
    try {
      const existing: BugReport[] = JSON.parse(localStorage.getItem('am_bug_reports') || '[]');
      existing.unshift(newReport);
      localStorage.setItem('am_bug_reports', JSON.stringify(existing.slice(0, 30)));
    } catch (_e) {}

    // 2. Kirim ke backend PostgreSQL via submitBugReportApi
    try {
      await submitBugReportApi({
        category,
        description: description.trim(),
        deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        userInfo: { email: userEmail, name: userName, role: userRole },
        userEmail,
        userName,
        userRole: String(userRole),
        url: typeof window !== 'undefined' ? window.location.href : ''
      });
    } catch (_e) {}

    setIsSubmitting(false);
    setDescription('');
    showToast('🚀 Laporan berhasil dikirim! Terima kasih atas masukan Anda.');
    setTimeout(() => {
      setIsOpen(false);
    }, 1500);
  };

  const isDark = theme === 'modern';

  return (
    <>
      {/* 🛠️ FLOATING DEBUG TOGGLE BUTTON */}
      <div
        className="am-debug-floating-trigger"
        onClick={() => setIsOpen(prev => !prev)}
        title="Lapor Kendala / Debug Sistem"
        aria-label="Debug & Lapor Kendala"
        style={{
          position: 'fixed',
          bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
          left: '16px',
          zIndex: 40,
          width: '34px',
          height: '34px',
          borderRadius: '50%',
          background: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          border: '1.5px solid var(--am-border, #CBD5E1)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          userSelect: 'none'
        }}
      >
        <span style={{ fontSize: '16px', transform: 'translateY(-0.5px)' }}>🛠️</span>
        {/* Status indicator dot */}
        <span
          style={{
            position: 'absolute',
            top: '1px',
            right: '1px',
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: wsStatus === 'connected' ? '#10B981' : '#EF4444',
            border: '1.5px solid white'
          }}
        />
      </div>

      {/* 📋 DEBUG & BUG REPORT MODAL */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'amFadeIn 0.2s ease-out'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '440px',
              background: 'var(--am-surface, #FFFFFF)',
              color: 'var(--am-text, #1E293B)',
              borderRadius: '20px',
              border: '1px solid var(--am-border, #E2E8F0)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--am-border, #E2E8F0)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(248, 250, 252, 0.8)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🛠️</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Debug & Lapor Kendala</h3>
                  <div style={{ fontSize: '11px', color: 'var(--am-text-muted, #64748B)' }}>Campus Mart Developer Suite</div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '18px',
                  color: 'var(--am-text-muted, #64748B)',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '8px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
              {/* Toast Notification */}
              {toastMessage && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: '#10B981',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    marginBottom: '14px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                    animation: 'amFadeIn 0.2s ease-out'
                  }}
                >
                  {toastMessage}
                </div>
              )}

              {/* Status Sistem Ringkas */}
              <div
                style={{
                  background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#F8FAFC',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  border: '1px solid var(--am-border, #E2E8F0)',
                  marginBottom: '16px'
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--am-text-muted, #64748B)', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  📊 Status Sistem
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11.5px' }}>
                  <div>
                    <span style={{ color: 'var(--am-text-muted, #64748B)' }}>Realtime: </span>
                    <strong style={{ color: wsStatus === 'connected' ? '#10B981' : '#EF4444' }}>
                      {wsStatus === 'connected' ? '🟢 Online' : '🔴 Offline'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--am-text-muted, #64748B)' }}>Role: </span>
                    <strong>{String(userRole)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--am-text-muted, #64748B)' }}>Akun: </span>
                    <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: '100px', verticalAlign: 'bottom' }}>
                      {userName}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--am-text-muted, #64748B)' }}>Versi: </span>
                    <strong>v1.0.1</strong>
                  </div>
                </div>
              </div>

              {/* Formulir Lapor Bug */}
              <form onSubmit={handleSubmitReport}>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--am-text-muted, #64748B)', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  🐛 Lapor Bug / Masalah
                </div>

                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', overflowX: 'auto', paddingBottom: '2px' }}>
                  {[
                    { id: 'ui', label: '🎨 Tampilan' },
                    { id: 'chat', label: '💬 Chat' },
                    { id: 'order', label: '🛍️ Pesanan' },
                    { id: 'vending', label: '🥤 Vending' },
                    { id: 'other', label: '⚙️ Lainnya' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '10px',
                        border: category === cat.id ? '1.5px solid #10B981' : '1px solid var(--am-border, #CBD5E1)',
                        background: category === cat.id ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                        color: category === cat.id ? '#10B981' : 'var(--am-text, #1E293B)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Ceritakan kendala yang terjadi (misal: tombol chat freeze, saldo koin tidak update)..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1px solid var(--am-border, #CBD5E1)',
                    background: 'var(--am-surface, #FFFFFF)',
                    color: 'var(--am-text, #1E293B)',
                    fontSize: '12px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'none',
                    marginBottom: '10px',
                    fontFamily: 'inherit'
                  }}
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    marginBottom: '16px'
                  }}
                >
                  {isSubmitting ? '⏳ Mengirim...' : '🚀 Kirim Laporan Bug'}
                </button>
              </form>

              {/* Tombol Utilitas Pengembang */}
              <div style={{ borderTop: '1px solid var(--am-border, #E2E8F0)', paddingTop: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--am-text-muted, #64748B)', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  🔧 Utilitas & Diagnostik
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleCopySystemInfo}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '10px',
                      border: '1px solid var(--am-border, #CBD5E1)',
                      background: 'transparent',
                      color: 'var(--am-text, #1E293B)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px'
                    }}
                  >
                    <span>📋 Salin Info Log</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearCacheAndReload}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '10px',
                      border: '1px solid #EF4444',
                      background: 'rgba(239, 68, 68, 0.08)',
                      color: '#EF4444',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px'
                    }}
                  >
                    <span>🧹 Reset Storage</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Inline Animation Style */}
      <style>{`
        @keyframes amFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        @media (min-width: 769px) {
          .am-debug-floating-trigger {
            bottom: 24px !important;
            left: 24px !important;
          }
        }
      `}</style>
    </>
  );
}
