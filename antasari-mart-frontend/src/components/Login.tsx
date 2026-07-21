import { useState } from 'react';
import type { Campus, UserRole } from '../types';

export default function Login({ onLogin }: { onLogin: (role: UserRole, gender: 'male' | 'female', campus: Campus, userData: any) => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nama, setNama] = useState('');
  const [nim, setNim] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('buyer'); 
  const [loading, setLoading] = useState(false);

  // Style animasi CSS keyframes untuk kartun/ikon bergerak & latar belakang hidup
  const animationStyles = `
    @keyframes floatAnimation {
      0% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-12px) rotate(4deg); }
      100% { transform: translateY(0px) rotate(0deg); }
    }
    @keyframes pulseGlow {
      0% { opacity: 0.5; transform: scale(1); }
      50% { opacity: 0.9; transform: scale(1.08); }
      100% { opacity: 0.5; transform: scale(1); }
    }
    .cartoon-icon {
      animation: floatAnimation 3s ease-in-out infinite;
    }
    .pulse-bg {
      animation: pulseGlow 5s ease-in-out infinite;
    }
  `;
// Menggunakan dynamic host atau sesuaikan dengan IP backend kamu yang aktif
  const backendHost = 'http://localhost:3000'; // Ubah ke IP backend jika diakses via HP/perangkat lain (contoh: http://192.168.18.18:3000)
  
  const url = isRegister 
    ? `${backendHost}/api/register` 
    : `${backendHost}/api/login`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          nama, 
          nim, 
          role: selectedRole 
        })
      });

      const data = await response.json();

      if (data.success) {
        if (isRegister) {
          alert("Pendaftaran berhasil! Silakan login.");
          setIsRegister(false); 
        } else {
          onLogin(data.user.role, 'female', 'banjarmasin', data.user);
        }
      } else {
        alert(data.message || "Gagal masuk!");
      }

    } catch (error) {
      console.error("Error Fetch:", error);
      alert("Terjadi kesalahan pada server atau jaringan.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: '100%', padding: '12px', margin: '8px 0', borderRadius: '8px', border: '1px solid #CBD5E1', color: '#333', background: '#F8FAFC' };

  return (
    <div style={{ 
      minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', padding: 20,
      position: 'relative', overflow: 'hidden', fontFamily: 'var(--am-font-body)'
    }}>
      <style>{animationStyles}</style>

      {/* Elemen Dekorasi Animasi Latar Belakang */}
      <div className="pulse-bg" style={{ 
        position: 'absolute', width: 450, height: 450, background: 'rgba(0, 180, 216, 0.18)', 
        borderRadius: '50%', top: '-15%', left: '-10%', zIndex: 0, pointerEvents: 'none' 
      }} />

      <div className="am-card" style={{ 
        background: 'rgba(255, 255, 255, 0.92)', backdropFilter: 'blur(12px)', 
        padding: 32, borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.1)', 
        width: '100%', maxWidth: 420, zIndex: 1, textAlign: 'center' 
      }}>
        
        {/* 👉 ANIMASI KARTUN / IKON BERGERAK */}
        <div className="cartoon-icon" style={{ fontSize: 52, marginBottom: 8 }}>
          {isRegister ? '🚀✨' : '🛍️🛒'}
        </div>

        <h2 style={{ color: '#00B4D8', textAlign: 'center', margin: '0 0 6px', fontSize: 22, fontWeight: 700 }}>
          {isRegister ? "Buat Akun Baru" : "Login Antasari Mart"}
        </h2>
        <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>
          {isRegister ? "Daftar untuk mulai berjualan dan berbelanja" : "Selamat datang kembali, silakan masuk"}
        </p>
        
        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          
          {isRegister && (
            <>
              <div>
                <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748B' }}>Nama Lengkap</label>
                <input placeholder="Nama kamu" value={nama} onChange={(e) => setNama(e.target.value)} style={inputStyle} required />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748B' }}>NIM / ID Pengguna</label>
                <input placeholder="NIM atau ID" value={nim} onChange={(e) => setNim(e.target.value)} style={inputStyle} required />
              </div>
            </>
          )}

          <div>
            <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748B' }}>Email</label>
            <input placeholder="email@uin-antasari.ac.id" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required />
          </div>
          
          {/* Kolom Password dengan Tombol Ikon Mata */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748B' }}>Password</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                style={{ ...inputStyle, paddingRight: 40, margin: '8px 0 0 0' }} 
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#666'
                }}
                title={showPassword ? "Sembunyikan password" : "Lihat password"}
              >
                {showPassword ? "👁️‍🗨️" : "👁️"}
              </button>
            </div>
          </div>
          
          {isRegister && (
            <div style={{ marginTop: 8 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 11, fontWeight: 'bold', color: '#64748B' }}>
                Daftar Sebagai:
              </label>
              <select 
                value={selectedRole} 
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                style={inputStyle}
              >
                <option value="buyer">🛍 Pembeli</option>
                <option value="seller">🏪 Penjual</option>
                <option value="driver">🛵 Driver</option>
                <option value="admin">🏢 Admin Koperasi</option>
              </select>
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', padding: '13px 0', marginTop: 18, 
              background: loading ? '#CBD5E1' : '#00B4D8', color: 'white', 
              border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700,
              fontSize: 15, transition: 'background 0.2s' 
            }}
          >
            {loading ? "Memproses..." : (isRegister ? "Daftar Sekarang" : "Masuk")}
          </button>
        </form>

        <button 
          onClick={() => setIsRegister(!isRegister)} 
          style={{ 
            width: '100%', marginTop: 14, background: 'none', border: 'none', 
            color: '#0077b6', cursor: 'pointer', fontWeight: 600, fontSize: 13 
          }}
        >
          {isRegister ? "Sudah punya akun? Login di sini" : "Belum punya akun? Daftar di sini"}
        </button>
      </div>
    </div>
  );
}