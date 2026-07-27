import { useState } from 'react';
import type { ThemeMode } from '../types';
import { formatRupiah } from '../data';

interface SuperAdminProps {
  theme: ThemeMode;
}

interface UserManageItem {
  id: string;
  name: string;
  email: string;
  role: string;
  isPro: boolean;
  proStartDate?: string;
  proExpireDate?: string;
}

export default function SuperAdminPanel({ theme: _theme }: SuperAdminProps) {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'users' | 'feedback'>('users');
  
  // Data simulasi pengguna dengan status PRO dan tanggal/jam lengkap
  const [users, setUsers] = useState<UserManageItem[]>([
    { id: '1', name: 'Nurmiyaty', email: 'miyya@gmail.com', role: 'Pembeli (Buyer)', isPro: true, proStartDate: '24 Jul 2026, 14:30', proExpireDate: '24 Agu 2026, 14:30' },
    { id: '2', name: 'Koperasi UIN Antasari', email: 'koperasi@uin-antasari.ac.id', role: 'Admin Koperasi', isPro: true, proStartDate: '20 Jul 2026, 09:15', proExpireDate: '20 Agu 2026, 09:15' },
    { id: '3', name: 'Ahmad Fauzi', email: 'fauzi@driver.com', role: 'Driver Kurir', isPro: false },
    { id: '4', name: 'Miyatul Penjual', email: 'miya2@gmail.com', role: 'Tenant Mahasiswa', isPro: true, proStartDate: '22 Jul 2026, 16:00', proExpireDate: '22 Agu 2026, 16:00' },
  ]);

  const [feedbacks] = useState([
    { id: 1, name: 'Ahmad (Mahasiswa)', text: 'Tolong tambahkan metode pembayaran Dana di menu checkout ya kak!', time: '10:45 AM' },
    { id: 2, name: 'Siti (Tenant Koperasi)', text: 'Fitur broadcast promo sangat membantu jualan saya di kampus BJB.', time: 'Kemarin' },
  ]);

  // Fungsi Toggle untuk Mengaktifkan / Menonaktifkan PRO secara manual oleh Super Admin
  const handleTogglePro = (id: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        const nextIsPro = !u.isPro;
        if (nextIsPro) {
          const now = new Date();
          const startStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const expire = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 hari
          const expireStr = expire.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + expire.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return { ...u, isPro: true, proStartDate: startStr, proExpireDate: expireStr };
        } else {
          return { ...u, isPro: false, proStartDate: undefined, proExpireDate: undefined };
        }
      }
      return u;
    }));
  };

  return (
    <div style={{ padding: '24px 16px 80px', maxWidth: 1000, margin: '0 auto', fontFamily: 'var(--am-font-body)' }}>
      {/* Header Banner */}
      <div className="am-card" style={{ padding: 24, borderRadius: 20, background: 'linear-gradient(135deg, #03045E 0%, #0077B6 100%)', color: 'white', marginBottom: 20 }}>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>👑 Super Admin Control Center</div>
        <p style={{ fontSize: 13, opacity: 0.9, margin: 0 }}>
          Kelola status langganan PRO pengguna, pantau transaksi, dan tinjau kritik/saran secara real-time.
        </p>
      </div>

      {/* Sub Tab Navigation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'users', label: '👥 Kelola Pengguna & Toggle PRO', icon: '🛡️' },
          { key: 'overview', label: '📊 Statistik & Diagram', icon: '📈' },
          { key: 'feedback', label: '💬 Kritik & Saran User', icon: '📢' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key as any)}
            style={{
              padding: '10px 16px', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              background: activeSubTab === tab.key ? 'var(--am-primary)' : 'var(--am-surface)',
              color: activeSubTab === tab.key ? 'white' : 'var(--am-text)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)', transition: 'all 0.2s'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Konten Tab 2: Kelola Pengguna & Toggle PRO */}
      {activeSubTab === 'users' && (
        <div className="am-card" style={{ padding: 20, borderRadius: 16, background: 'var(--am-surface)' }}>
          <h3 className="am-heading" style={{ margin: '0 0 6px', fontSize: 16, color: 'var(--am-text)' }}>🛡️ Manajemen Status PRO Pengguna</h3>
          <p style={{ fontSize: 12, color: 'var(--am-text-muted)', marginBottom: 16 }}>
            Aktifkan tombol toggle jika pembeli/seller sudah melakukan transfer pembayaran manual. Tanggal dan jam aktif akan otomatis tercatat!
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {users.map(usr => (
              <div key={usr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--am-bg2)', borderRadius: 12, border: '1px solid var(--am-border)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--am-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {usr.name} {usr.isPro && <span style={{ fontSize: 11, background: '#FEF3C7', color: '#D97706', padding: '1px 6px', borderRadius: 4, fontWeight: 800 }}>PRO 💎</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginTop: 2 }}>{usr.email} · <strong style={{ color: 'var(--am-primary)' }}>{usr.role}</strong></div>
                  
                  {usr.isPro && usr.proStartDate && (
                    <div style={{ fontSize: 10, color: '#16A34A', marginTop: 4, fontWeight: 600 }}>
                      ⏳ Aktif Sejak: {usr.proStartDate} s/d {usr.proExpireDate}
                    </div>
                  )}
                </div>

                {/* 💡 Toggle Switch Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: usr.isPro ? '#16A34A' : 'var(--am-text-muted)' }}>
                    {usr.isPro ? 'PRO AKTIF' : 'REGULER'}
                  </span>
                  <label style={{ position: 'relative', display: 'inline-block', width: 46, height: 24, cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={usr.isPro} 
                      onChange={() => handleTogglePro(usr.id)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute', inset: 0, background: usr.isPro ? '#00B4D8' : '#CBD5E1',
                      borderRadius: 24, transition: '0.3s'
                    }}>
                      <span style={{
                        position: 'absolute', content: '""', height: 18, width: 18, left: usr.isPro ? 24 : 3, bottom: 3,
                        background: 'white', borderRadius: '50%', transition: '0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                    </span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Konten Tab 1: Statistik & Diagram */}
      {activeSubTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div className="am-card" style={{ padding: 16, borderRadius: 16, background: 'var(--am-surface)' }}>
              <div style={{ fontSize: 12, color: 'var(--am-text-muted)' }}>Total Pengguna Aktif</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--am-primary)', marginTop: 4 }}>145 User</div>
            </div>
            <div className="am-card" style={{ padding: 16, borderRadius: 16, background: 'var(--am-surface)' }}>
              <div style={{ fontSize: 12, color: 'var(--am-text-muted)' }}>Pengguna Akun PRO 💎</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#F59E0B', marginTop: 4 }}>
                {users.filter(u => u.isPro).length} Akun
              </div>
            </div>
            <div className="am-card" style={{ padding: 16, borderRadius: 16, background: 'var(--am-surface)' }}>
              <div style={{ fontSize: 12, color: 'var(--am-text-muted)' }}>Total Omset Platform</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#16A34A', marginTop: 4 }}>{formatRupiah(1250000)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Konten Tab 3: Kritik & Saran User */}
      {activeSubTab === 'feedback' && (
        <div className="am-card" style={{ padding: 20, borderRadius: 16, background: 'var(--am-surface)' }}>
          <h3 className="am-heading" style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--am-text)' }}>📢 Kotak Masuk Kritik & Saran Pengguna</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {feedbacks.map(fb => (
              <div key={fb.id} style={{ padding: 14, background: 'var(--am-bg2)', borderRadius: 12, border: '1px solid var(--am-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)' }}>{fb.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--am-text-muted)' }}>{fb.time}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--am-text-muted)', margin: 0 }}>"{fb.text}"</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}