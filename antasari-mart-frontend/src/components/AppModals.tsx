import type { ReactNode } from 'react'
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

export function Modal({ icon, title, desc, buttons, zIndex = 99999, cardClassName = 'modal-appear', maxWidth = 380, children }: ModalProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      backdropFilter: 'blur(5px)'
    }}>
      <div className={`${cardClassName} am-card`} style={{
        width: '100%', maxWidth, padding: 30, borderRadius: 24,
        background: 'var(--am-surface)', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
      }}>
        {children}
        <div className="cute-bounce-icon" style={{ fontSize: 52, marginBottom: 12 }}>
          {icon}
        </div>
        <h3 className="am-heading" style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: 'var(--am-text)' }}>
          {title}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--am-text-muted)', lineHeight: 1.5, marginBottom: 24 }}>
          {desc}
        </p>
        {buttons}
      </div>
    </div>
  )
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
      desc={<>Kamu harus <strong>Login</strong> atau <strong>Daftar</strong> terlebih dahulu untuk mengakses Keranjang, Pesan, dan fitur belanja lainnya di Antasari Mart.</>}
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
}

export function ProfileModal({
  email, currentName, setCurrentName, currentAvatar, setCurrentAvatar,
  selectedCampus, setSelectedCampus, onClose, onSave, onImageChange, presetAvatars
}: ProfileModalProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div className="am-card modal-appear" style={{ width: '100%', maxWidth: 440, padding: 24, borderRadius: 20, background: 'var(--am-surface)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 className="am-heading" style={{ margin: 0, fontSize: 18, color: 'var(--am-text)' }}>⚙️ Pengaturan Profil</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--am-text-muted)' }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 14, border: '1px solid var(--am-border)', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 'bold', color: '#334155' }}>Ganti Avatar Kartun / Foto:</span>
              <label style={{ fontSize: 10, color: '#5FA874', cursor: 'pointer', fontWeight: 700, background: '#E0F2FE', padding: '3px 8px', borderRadius: 6 }}>
                📁 Upload Galeri
                <input type="file" accept="image/*" onChange={onImageChange} style={{ display: 'none' }} />
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <img src={currentAvatar} alt="Pratinjau Foto" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', background: '#e2e8f0', border: '3px solid var(--am-primary)' }} />
            </div>

            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', marginBottom: 6, textAlign: 'left' }}>Atau Pilih dari 10 Karakter Kartun Senyum Manis:</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, maxHeight: 100, overflowY: 'auto', padding: 2, background: '#ffffff', borderRadius: 10, border: '1px solid #CBD5E1' }}>
              {presetAvatars.map(avatar => (
                <div
                  key={avatar.id}
                  onClick={() => setCurrentAvatar(avatar.url)}
                  title={avatar.name}
                  style={{
                    position: 'relative', cursor: 'pointer', borderRadius: '50%', overflow: 'hidden',
                    background: '#f8fafc', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: currentAvatar === avatar.url ? '3px solid #5FA874' : '2px solid #CBD5E1',
                    boxShadow: currentAvatar === avatar.url ? '0 0 8px rgba(244, 174, 194, 0.35)' : 'none',
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
              <option value="banjarmasin">📍 Banjarmasin (BJM)</option>
              <option value="banjarbaru">📍 Banjarbaru (BJB)</option>
            </select>
          </div>

          <button
            className="am-btn-primary"
            style={{ width: '100%', padding: '12px 0', marginTop: 6, fontSize: 14, fontWeight: 'bold', borderRadius: 10 }}
            onClick={onSave}
          >
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  )
}
