import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Campus } from '../types'

export interface PresetAvatar {
  id: number
  name: string
  type: string
  url: string
}

interface ModalProps {
  icon: ReactNode
  title: ReactNode
  desc: ReactNode
  buttons?: ReactNode
  zIndex?: number
  cardClassName?: string
  maxWidth?: number
  children?: ReactNode
}

export function Modal({ icon, title, desc, buttons, zIndex = 99999, cardClassName = 'modal-appear', maxWidth = 420, children }: ModalProps) {
  useEffect(() => {
    const originalOverflow = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const modalJSX = (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)'
    }}>
      <div className={`${cardClassName} am-card w-[90vw] max-w-sm sm:max-w-md p-5 sm:p-7 rounded-2xl shadow-2xl text-center`} style={{
        maxWidth,
        background: 'var(--am-surface)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
      }}>
        {children}
        <div className="cute-bounce-icon" style={{ fontSize: 48, marginBottom: 10 }}>
          {icon}
        </div>
        <h3 className="am-heading" style={{ margin: '0 0 8px', fontSize: 19, fontWeight: 700, color: 'var(--am-text)' }}>
          {title}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--am-text-muted)', lineHeight: 1.5, marginBottom: 20 }}>
          {desc}
        </p>
        {buttons}
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalJSX, document.body)
    : modalJSX;
}

const primaryButtonStyle = {
  width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
  background: 'var(--am-primary)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer'
} as const

export function SuccessPopup({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <Modal
      cardClassName="success-modal-appear"
      maxWidth={360}
      icon={<div className="check-icon-anim" style={{
        width: 64, height: 64, margin: '0 auto 14px', background: 'rgba(74, 197, 108, 0.15)',
        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32, color: '#4AC56C'
      }}>✅</div>}
      title="Berhasil Disimpan! 🎉"
      desc={message}
      buttons={
        <button className="am-btn-primary" onClick={onClose} style={primaryButtonStyle}>
          Oke, Mengerti 👍
        </button>
      }
    />
  )
}

interface InfoModalData {
  title: string
  desc: string
  icon: string
}

export function InfoModal({ data, onClose }: { data: InfoModalData; onClose: () => void }) {
  return (
    <Modal
      icon={data.icon}
      title={data.title}
      desc={data.desc}
      buttons={
        <button className="am-btn-primary" onClick={onClose} style={primaryButtonStyle}>
          Baik, Mengerti 👍
        </button>
      }
    />
  )
}

export function LoginPromptModal({ onDismiss, onGoToLogin }: { onDismiss: () => void; onGoToLogin: () => void }) {
  return (
    <Modal
      icon="🧸✨"
      title="Ups, Mau Masuk Menu Ini? 🛍️"
      desc={<>Kamu harus <strong>Login</strong> atau <strong>Daftar</strong> terlebih dahulu untuk mengakses Keranjang, Pesan, dan fitur belanja lainnya di Campus Mart.</>}
      buttons={
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onDismiss}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 12, border: '1.5px solid var(--am-border)',
              background: 'var(--am-bg2)', color: 'var(--am-text)', fontWeight: 600, fontSize: 13, cursor: 'pointer'
            }}
          >
            Nanti Saja
          </button>
          <button className="am-btn-primary" onClick={onGoToLogin} style={{
            flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
            background: 'var(--am-primary)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer'
          }}>
            Masuk / Daftar 🚀
          </button>
        </div>
      }
    />
  )
}

interface ProfileModalProps {
  email: string
  currentName: string
  setCurrentName: (v: string) => void
  currentAvatar: string
  setCurrentAvatar: (v: string) => void
  selectedCampus: Campus
  setSelectedCampus: (v: Campus) => void
  onClose: () => void
  onSave: () => void
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  presetAvatars: PresetAvatar[]
  onLogout?: () => void
  isGuest?: boolean
  onNavigateTab?: (tab: any) => void
  userRoles?: string[]
}

export function ProfileModal({
  email, currentName, setCurrentName, currentAvatar, setCurrentAvatar,
  selectedCampus, setSelectedCampus, onClose, onSave, onImageChange, presetAvatars,
  onLogout, isGuest, onNavigateTab, userRoles = ['buyer']
}: ProfileModalProps) {
  const isSuperAdmin = email === 'miyya@gmail.com' || email === 'mnurmiyaty2@gmail.com' || userRoles.includes('super_admin');
  const effectiveRoles = userRoles;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100002,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      backdropFilter: 'blur(4px)'
    }}>
      <div className="am-card modal-appear" style={{ width: '100%', maxWidth: 440, padding: 24, borderRadius: 20, background: 'var(--am-surface)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 className="am-heading" style={{ margin: 0, fontSize: 18, color: 'var(--am-text)' }}>⚙️ Pengaturan Profil</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--am-text-muted)' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'var(--am-bg2)', padding: 12, borderRadius: 14, border: '1px solid var(--am-border)', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--am-text)' }}>Ganti Avatar Kartun / Foto:</span>
              <label style={{ fontSize: 10, color: 'var(--am-primary)', cursor: 'pointer', fontWeight: 700, background: 'var(--am-primary-light, rgba(95, 168, 116, 0.15))', padding: '3px 8px', borderRadius: 6 }}>
                📁 Upload Galeri
                <input type="file" accept="image/*" onChange={onImageChange} style={{ display: 'none' }} />
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <img src={currentAvatar} alt="Pratinjau Foto" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', background: 'var(--am-bg2)', border: '3px solid var(--am-primary)' }} />
            </div>

            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--am-text-muted)', marginBottom: 6, textAlign: 'left' }}>Atau Pilih dari 10 Karakter Kartun Senyum Manis:</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, maxHeight: 100, overflowY: 'auto', padding: 4, background: 'var(--am-surface)', borderRadius: 10, border: '1px solid var(--am-border)' }}>
              {presetAvatars.map(avatar => (
                <div
                  key={avatar.id}
                  onClick={() => setCurrentAvatar(avatar.url)}
                  title={avatar.name}
                  style={{
                    position: 'relative', cursor: 'pointer', borderRadius: '50%', overflow: 'hidden',
                    background: 'var(--am-bg2)', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: currentAvatar === avatar.url ? '3px solid var(--am-primary)' : '2px solid var(--am-border)',
                    boxShadow: currentAvatar === avatar.url ? '0 0 8px rgba(95, 168, 116, 0.35)' : 'none',
                    transition: 'all 0.2s', transform: currentAvatar === avatar.url ? 'scale(1.08)' : 'scale(1)'
                  }}
                >
                  <img src={avatar.url} alt={avatar.name} style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
                  {avatar.type === 'pro' && (
                    <span style={{ position: 'absolute', bottom: 0, width: '100%', background: '#F59E0B', color: 'white', fontSize: 5, fontWeight: 800, textAlign: 'center' }}>PRO</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--am-text-muted)', display: 'block', marginBottom: 4 }}>Nama Lengkap</label>
            <input
              className="am-input"
              value={currentName}
              onChange={(e) => setCurrentName(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', fontSize: 13, borderRadius: 8, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--am-text-muted)', display: 'block', marginBottom: 4 }}>Email Akun</label>
            <input
              className="am-input"
              value={email}
              disabled
              style={{ width: '100%', padding: '10px 12px', fontSize: 13, borderRadius: 8, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text-muted)', cursor: 'not-allowed' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--am-text-muted)', display: 'block', marginBottom: 4 }}>
              Kampus Aktif (Lokasi Belanja)
            </label>
            <select
              className="am-input"
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value as Campus)}
              style={{ width: '100%', padding: '10px 12px', fontSize: 13, borderRadius: 8, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)', cursor: 'pointer' }}
            >
              <option value="banjarmasin">📍 Kampus 1 Banjarmasin</option>
              <option value="banjarbaru">📍 Kampus 2 Banjarbaru</option>
            </select>
          </div>

          {/* 🛍️ Menu Cepat Pembelian & Pengelolaan Akun */}
          {!isGuest && (
            <div style={{ background: 'var(--am-bg2)', padding: 12, borderRadius: 14, border: '1px solid var(--am-border)' }}>
              <div style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--am-text-muted)', marginBottom: 8 }}>
                Akses Transaksi & Fitur Akun:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onNavigateTab) onNavigateTab('tracker');
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1px solid var(--am-border)',
                    background: 'var(--am-surface)',
                    color: 'var(--am-text)',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontSize: 18 }}>📦</span>
                  <div>
                    <div>Pesanan Saya</div>
                    <div style={{ fontSize: 9.5, color: 'var(--am-text-muted)' }}>Lacak & Riwayat</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onNavigateTab) onNavigateTab('cart');
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1px solid var(--am-border)',
                    background: 'var(--am-surface)',
                    color: 'var(--am-text)',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontSize: 18 }}>🛒</span>
                  <div>
                    <div>Keranjang</div>
                    <div style={{ fontSize: 9.5, color: 'var(--am-text-muted)' }}>Lihat Belanjaan</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onNavigateTab) onNavigateTab('chat');
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: '1px solid var(--am-border)',
                    background: 'var(--am-surface)',
                    color: 'var(--am-text)',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontSize: 18 }}>💬</span>
                  <div>
                    <div>Obrolan</div>
                    <div style={{ fontSize: 9.5, color: 'var(--am-text-muted)' }}>Pesan Masuk</div>
                  </div>
                </button>

                {(effectiveRoles.includes('seller') || isSuperAdmin) && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onNavigateTab) onNavigateTab('seller');
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid #10B981',
                      background: 'rgba(16, 185, 129, 0.1)',
                      color: '#059669',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ fontSize: 18 }}>🏪</span>
                    <div>
                      <div>Lapak Penjual</div>
                      <div style={{ fontSize: 9.5, opacity: 0.85 }}>Kelola Toko</div>
                    </div>
                  </button>
                )}

                {(effectiveRoles.includes('driver') || isSuperAdmin) && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onNavigateTab) onNavigateTab('driver');
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid #F59E0B',
                      background: 'rgba(245, 158, 11, 0.1)',
                      color: '#D97706',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ fontSize: 18 }}>🛵</span>
                    <div>
                      <div>Tugas Kurir</div>
                      <div style={{ fontSize: 9.5, opacity: 0.85 }}>Dashboard Driver</div>
                    </div>
                  </button>
                )}

                {(effectiveRoles.includes('admin') || effectiveRoles.includes('admin_reguler') || effectiveRoles.includes('admin_pro') || isSuperAdmin) && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onNavigateTab) onNavigateTab('admin');
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid #3B82F6',
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: '#2563EB',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ fontSize: 18 }}>🏛️</span>
                    <div>
                      <div>Panel Koperasi</div>
                      <div style={{ fontSize: 9.5, opacity: 0.85 }}>Manajemen</div>
                    </div>
                  </button>
                )}

                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onNavigateTab) onNavigateTab('super_admin');
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid #8B5CF6',
                      background: 'rgba(139, 92, 246, 0.1)',
                      color: '#7C3AED',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ fontSize: 18 }}>👑</span>
                    <div>
                      <div>Super Admin</div>
                      <div style={{ fontSize: 9.5, opacity: 0.85 }}>Pusat Kontrol</div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}

          <button
            className="am-btn-primary"
            style={{ width: '100%', padding: '12px 0', marginTop: 6, fontSize: 14, fontWeight: 'bold', borderRadius: 10 }}
            onClick={onSave}
          >
            Simpan Perubahan
          </button>

          {onLogout && (
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
                background: isGuest ? 'var(--am-bg2)' : 'rgba(239, 68, 68, 0.1)',
                color: isGuest ? 'var(--am-text)' : '#EF4444',
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginTop: 2
              }}
            >
              <span>{isGuest ? '🔑' : '🚪'}</span>
              <span>{isGuest ? 'Masuk / Daftar Akun' : 'Keluar (Logout)'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
