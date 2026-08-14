import { useState, useRef } from 'react';
import Swal from 'sweetalert2';
import type { Campus, UserRole } from '../types';

const PRESET_AVATARS = [
  { id: 1, name: 'Maya (Ceria)', type: 'reguler', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MayaSmile&backgroundColor=b6e3f4' },
  { id: 2, name: 'Ahmad (Ramah)', type: 'reguler', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AhmadHappy&backgroundColor=c0aede' },
  { id: 3, name: 'Siti (Manis Senyum)', type: 'reguler', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=SitiJoy&backgroundColor=ffd5dc' },
  { id: 4, name: 'Rizky (Ceria)', type: 'reguler', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=RizkyFun&backgroundColor=d1d4f9' },
  { id: 5, name: 'Dewi (Friendly)', type: 'reguler', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DewiBright&backgroundColor=ffdfbf' },
  { id: 6, name: 'Fajar (Semangat)', type: 'reguler', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=FajarSmile&backgroundColor=c1f4c5' },
  { id: 7, name: 'Alya (Kreatif Ceria)', type: 'reguler', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AlyaCheer&backgroundColor=ffcdec' },
  { id: 8, name: 'Zain (Pro Senyum)', type: 'pro', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ZainPro&backgroundColor=00b4d8' },
  { id: 9, name: 'Zara (Pro Elegan)', type: 'pro', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ZaraPro&backgroundColor=7209b7' },
  { id: 10, name: 'Ken (Pro Stylish)', type: 'pro', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=KenPro&backgroundColor=f72585' },
];

export default function Login({ onLogin }: { onLogin: (role: UserRole, gender: 'male' | 'female', campus: Campus, userData: any) => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nama, setNama] = useState('');
  const [nim, setNim] = useState('');
  
  // 🔒 Multi-Role State (Default: Pembeli). Maksimal 3 pilihan
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['buyer']); 
  
  // 🔑 State untuk OTP
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0].url);
  const [loading, setLoading] = useState(false);

  // State untuk Slider Puzzle
  const [sliderPos, setSliderPos] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const targetPos = 215; 
  const tolerance = 8; 

  const startDrag = () => {
    if (!isVerified) setIsDragging(true);
  };

  const onDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    let pos = clientX - rect.left - 20;

    if (pos < 0) pos = 0;
    if (pos > rect.width - 55) pos = rect.width - 55;

    setSliderPos(pos);
  };

  const stopDrag = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (Math.abs(sliderPos - targetPos) <= tolerance) {
      setIsVerified(true);
      setSliderPos(targetPos);
    } else {
      setSliderPos(0);
    }
  };

  const resetCaptcha = () => {
    setIsVerified(false);
    setSliderPos(0);
  };

  // Handler Centang Multi Role (Maksimal 3)
  const handleRoleCheckbox = (roleKey: string) => {
    if (selectedRoles.includes(roleKey)) {
      if (selectedRoles.length > 1) {
        setSelectedRoles(prev => prev.filter(r => r !== roleKey));
      } else {
        Swal.fire({ icon: 'info', title: 'Perhatian', text: 'Minimal harus memilih 1 peran!', confirmButtonColor: '#00B4D8' });
      }
    } else {
      if (selectedRoles.length < 3) {
        setSelectedRoles(prev => [...prev, roleKey]);
      } else {
        Swal.fire({ icon: 'warning', title: 'Batas Peran', text: '⚠️ Maksimal hanya boleh memilih 3 peran!', confirmButtonColor: '#00B4D8' });
      }
    }
  };

  // Kirim OTP via Email
  const handleSendOtp = async () => {
    if (!email) {
      Swal.fire({ icon: 'warning', title: 'Email Kosong', text: 'Silakan isi alamat email terlebih dahulu!', confirmButtonColor: '#00B4D8' });
      return;
    }

    setSendingOtp(true);
    try {
      const backendHost = `http://${window.location.hostname}:5000`;
      const res = await fetch(`${backendHost}/api/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (data.success) {
        setIsOtpSent(true);
        Swal.fire({
          icon: 'success',
          title: 'Kode OTP Terkirim! 📧',
          text: data.message,
          confirmButtonColor: '#00B4D8'
        });
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal Kirim OTP', text: data.message, confirmButtonColor: '#EF4444' });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Koneksi Terganggu', text: 'Gagal terhubung ke server pengirim OTP.', confirmButtonColor: '#EF4444' });
    } finally {
      setSendingOtp(false);
    }
  };

  // Verifikasi Kode OTP
  const handleVerifyOtp = async () => {
    if (!otpCode) {
      Swal.fire({ icon: 'warning', title: 'Kode OTP Kosong', text: 'Masukkan kode OTP yang telah dikirim ke email kamu!', confirmButtonColor: '#00B4D8' });
      return;
    }

    setVerifyingOtp(true);
    try {
      const backendHost = `http://${window.location.hostname}:5000`;
      const res = await fetch(`${backendHost}/api/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpCode })
      });
      const data = await res.json();

      if (data.success) {
        setIsOtpVerified(true);
        Swal.fire({ icon: 'success', title: 'Verifikasi Berhasil! ✅', text: data.message, confirmButtonColor: '#00B4D8' });
      } else {
        Swal.fire({ icon: 'error', title: 'Verifikasi Gagal', text: data.message, confirmButtonColor: '#EF4444' });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Kesalahan Server', text: 'Gagal memverifikasi OTP.', confirmButtonColor: '#EF4444' });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const animationStyles = `
    @keyframes floatAnimation {
      0% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-12px) rotate(4deg); }
      100% { transform: translateY(0px) rotate(0deg); }
    }
    .cartoon-icon {
      animation: floatAnimation 3s ease-in-out infinite;
    }
  `;

  const handleDeviceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isVerified) {
      Swal.fire({
        icon: 'warning',
        title: 'Verifikasi Belum Selesai',
        text: 'Silakan geser potongan puzzle foto buket bunga sampai pas untuk melanjutkan!',
        confirmButtonColor: '#00B4D8'
      });
      return;
    }

    if (isRegister && !isOtpVerified) {
      Swal.fire({
        icon: 'warning',
        title: 'Email Belum Diverifikasi',
        text: 'Silakan masukkan dan verifikasi kode OTP yang telah dikirim ke email kamu!',
        confirmButtonColor: '#00B4D8'
      });
      return;
    }

    setLoading(true);
    const backendHost = `http://${window.location.hostname}:5000`;
    const targetUrl = isRegister ? `${backendHost}/api/register` : `${backendHost}/api/login`;
    
    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          nama, 
          nim, 
          roles: selectedRoles,
          role: selectedRoles[0] || 'buyer',
          avatar: selectedAvatar 
        })
      });

      const data = await response.json();

      if (data.success) {
        if (isRegister) {
          Swal.fire({
            icon: 'success',
            title: 'Pendaftaran Berhasil! 🎉',
            text: 'Akun Anda berhasil dibuat. Silakan login.',
            confirmButtonText: 'Masuk Sekarang',
            confirmButtonColor: '#00B4D8'
          });
          setIsRegister(false); 
          resetCaptcha();
          setIsOtpSent(false);
          setIsOtpVerified(false);
          setOtpCode('');
        } else {
          if (data.user.avatar) {
            localStorage.setItem('am_user_avatar', data.user.avatar);
          }
          const primaryRole = Array.isArray(data.user.roles) ? data.user.roles[0] : (data.user.role || 'buyer');
          onLogin(primaryRole, 'female', 'banjarmasin', data.user);
        }
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Masuk',
          text: data.message || "Terjadi kesalahan pada data yang dimasukkan!",
          confirmButtonColor: '#EF4444'
        });
        resetCaptcha();
      }

    } catch (error) {
      console.error("Error Fetch:", error);
      Swal.fire({
        icon: 'error',
        title: 'Koneksi Terganggu',
        text: 'Terjadi kesalahan pada server atau jaringan.',
        confirmButtonColor: '#EF4444'
      });
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: '100%', padding: '12px', margin: '6px 0', borderRadius: '8px', border: '1px solid #CBD5E1', color: '#333', background: '#F8FAFC' };

  return (
    <div style={{ 
      minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', padding: 20,
      position: 'relative', overflow: 'hidden', fontFamily: 'var(--am-font-body)'
    }}>
      <style>{animationStyles}</style>

      <div className="am-card" style={{ 
        background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(12px)', 
        padding: 28, borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.1)', 
        width: '100%', maxWidth: 460, zIndex: 1, textAlign: 'center', maxHeight: '95vh', overflowY: 'auto' 
      }}>
        
        <div className="cartoon-icon" style={{ fontSize: 44, marginBottom: 2 }}>
          {isRegister ? '💐✨' : '🌷🛒'}
        </div>

        <h2 style={{ color: '#00B4D8', textAlign: 'center', margin: '0 0 2px', fontSize: 20, fontWeight: 700 }}>
          {isRegister ? "Buat Akun Baru" : "Login Antasari Mart"}
        </h2>
        <p style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
          {isRegister ? "Isi data, verifikasi OTP email, & pilih peran akun" : "Selamat datang kembali, silakan masuk"}
        </p>
        
        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          
          {isRegister && (
            <>
              <div style={{ marginBottom: 12, background: '#F1F5F9', padding: 12, borderRadius: 14, border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 'bold', color: '#334155' }}>
                    Pilih Avatar Kartun / Foto:
                  </label>
                  <label style={{ fontSize: 10, color: '#0077B6', cursor: 'pointer', fontWeight: 700, background: '#E0F2FE', padding: '3px 8px', borderRadius: 6 }}>
                    📁 Upload Galeri
                    <input type="file" accept="image/*" onChange={handleDeviceImageUpload} style={{ display: 'none' }} />
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, background: '#ffffff', padding: 8, borderRadius: 10, border: '1px solid #CBD5E1' }}>
                  <img 
                    src={selectedAvatar} 
                    alt="Active Avatar" 
                    style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', background: '#e2e8f0', border: '2px solid #00B4D8' }} 
                  />
                  <div style={{ fontSize: 11, color: '#334155', fontWeight: 600 }}>
                    Avatar Terpilih Siap Digunakan ✨
                  </div>
                </div>

                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>Pilih Karakter Kartun:</div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, maxHeight: 110, overflowY: 'auto', padding: 2 }}>
                  {PRESET_AVATARS.map(avatar => (
                    <div 
                      key={avatar.id}
                      onClick={() => setSelectedAvatar(avatar.url)}
                      title={avatar.name}
                      style={{
                        position: 'relative', cursor: 'pointer', borderRadius: '50%', overflow: 'hidden',
                        background: '#ffffff', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: selectedAvatar === avatar.url ? '3px solid #00B4D8' : '2px solid #CBD5E1',
                        boxShadow: selectedAvatar === avatar.url ? '0 0 10px rgba(0, 180, 216, 0.4)' : 'none',
                        transition: 'all 0.2s', transform: selectedAvatar === avatar.url ? 'scale(1.08)' : 'scale(1)'
                      }}
                    >
                      <img src={avatar.url} alt={avatar.name} style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
                      {avatar.type === 'pro' && (
                        <span style={{ position: 'absolute', bottom: 0, width: '100%', background: '#F59E0B', color: 'white', fontSize: 6, fontWeight: 800, textAlign: 'center' }}>PRO</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

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
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input 
                placeholder="email@uin-antasari.ac.id" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                style={{ ...inputStyle, flex: 1, margin: 0 }} 
                required 
              />
              {isRegister && (
                <button 
                  type="button" 
                  onClick={handleSendOtp} 
                  disabled={sendingOtp || isOtpVerified}
                  style={{
                    padding: '12px 12px', fontSize: 11, fontWeight: 700, borderRadius: 8, border: 'none',
                    background: isOtpVerified ? '#16A34A' : '#00B4D8', color: 'white', cursor: (sendingOtp || isOtpVerified) ? 'default' : 'pointer', whiteSpace: 'nowrap'
                  }}
                >
                  {isOtpVerified ? '✅ Terkirim' : sendingOtp ? 'Sending...' : 'Kirim OTP 📧'}
                </button>
              )}
            </div>
          </div>

          {/* 🔒 KOLOM TERPISAH KHUSUS KODE OTP (Tampil permanen saat registrasi) */}
          {isRegister && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748B' }}>Kode OTP Email</label>
                {isOtpVerified ? (
                  <span style={{ fontSize: 10, color: '#16A34A', fontWeight: 800 }}>✅ Sudah Diverifikasi</span>
                ) : (
                  <span style={{ fontSize: 10, color: '#D97706', fontWeight: 700 }}>⚠️ Belum Diverifikasi</span>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                <input 
                  placeholder="Masukkan 6 Digit OTP" 
                  value={otpCode} 
                  disabled={isOtpVerified}
                  onChange={(e) => setOtpCode(e.target.value)} 
                  style={{ 
                    ...inputStyle, 
                    flex: 1, 
                    margin: 0, 
                    letterSpacing: 2, 
                    fontWeight: 'bold',
                    background: isOtpVerified ? '#F0FDF4' : '#F8FAFC',
                    borderColor: isOtpVerified ? '#86EFAC' : '#CBD5E1'
                  }} 
                />
                <button 
                  type="button" 
                  onClick={handleVerifyOtp}
                  disabled={isOtpVerified || verifyingOtp}
                  style={{ 
                    padding: '12px 14px', 
                    background: isOtpVerified ? '#16A34A' : '#0284c7', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 8, 
                    fontWeight: 700, 
                    cursor: (isOtpVerified || verifyingOtp) ? 'default' : 'pointer', 
                    fontSize: 11,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isOtpVerified ? 'Terverifikasi ✓' : verifyingOtp ? 'Cek...' : 'Verifikasi OTP'}
                </button>
              </div>
              <small style={{ fontSize: 10, color: '#64748B', display: 'block', marginTop: 2 }}>
                * Tekan "Kirim OTP", cek kotak masuk/spam email, lalu masukkan 6 digit kodenya.
              </small>
            </div>
          )}
          
          <div style={{ marginTop: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 'bold', color: '#64748B' }}>Password</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                style={{ ...inputStyle, paddingRight: 40, margin: '4px 0 0 0' }} 
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#666'
                }}
              >
                {showPassword ? "👁️‍🗨️" : "👁️"}
              </button>
            </div>
            {isRegister && (
              <small style={{ display: 'block', fontSize: 10, color: '#64748B', marginTop: 3, lineHeight: '1.3' }}>
                * Min. 8 karakter, ada huruf besar, kecil, angka, & simbol.
              </small>
            )}
          </div>
          
          {/* 🔒 PILIHAN MULTI-ROLE (MAKSIMAL 3 ROLE) */}
          {isRegister && (
            <div style={{ marginTop: 10, background: '#F8FAFC', padding: 10, borderRadius: 12, border: '1px solid #CBD5E1' }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 'bold', color: '#334155' }}>
                Pilih Peran Akun Kamu (Maksimal 3):
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', color: '#1e293b' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedRoles.includes('buyer')} 
                    onChange={() => handleRoleCheckbox('buyer')} 
                  />
                  🛍️ Pembeli (Belanja Produk & Jasa)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', color: '#1e293b' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedRoles.includes('seller')} 
                    onChange={() => handleRoleCheckbox('seller')} 
                  />
                  🏪 Penjual (Buka Lapak Dagangan)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', color: '#1e293b' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedRoles.includes('driver')} 
                    onChange={() => handleRoleCheckbox('driver')} 
                  />
                  🛵 Driver / Kurir Kampus (Antar Pesanan)
                </label>
              </div>
            </div>
          )}

          {/* KOTAK SLIDER PUZZLE */}
          <div style={{ marginTop: 10, background: '#F8FAFC', padding: 12, borderRadius: 14, border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 'bold', color: '#334155' }}>
                Verifikasi Geser Buket Bunga 💐
              </label>
              {isVerified && <span style={{ fontSize: 10, color: '#16A34A', fontWeight: 800 }}>✔ Terverifikasi</span>}
            </div>

            <div style={{ 
              position: 'relative', width: '100%', height: 110, borderRadius: 10, overflow: 'hidden', 
              backgroundImage: 'url("https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=500&auto=format&fit=crop&q=60")', 
              backgroundSize: 'cover', backgroundPosition: 'center', marginBottom: 8,
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)'
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.15)' }} />

              <div style={{ 
                position: 'absolute', bottom: 6, left: 10, background: 'rgba(255,255,255,0.85)', padding: '2px 8px', 
                borderRadius: 4, fontSize: 10, fontWeight: 700, color: '#334155', zIndex: 1 
              }}>
                🌸 Pasangkan Potongan Buket
              </div>
              
              <div style={{
                position: 'absolute', left: targetPos, top: 30, width: 45, height: 50,
                background: 'rgba(0,0,0,0.6)', border: '2px dashed rgba(255,255,255,0.9)', borderRadius: 6, zIndex: 2
              }} />

              <div style={{
                position: 'absolute', left: sliderPos, top: 30, width: 45, height: 50,
                backgroundImage: 'url("https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=500&auto=format&fit=crop&q=60")',
                backgroundSize: '380px 110px', backgroundPosition: `-${targetPos}px -30px`,
                borderRadius: 6, boxShadow: '0 4px 15px rgba(0,0,0,0.4)', zIndex: 3,
                border: isVerified ? '2px solid #16A34A' : '2px solid #ffffff',
                transition: isDragging ? 'none' : 'left 0.2s ease'
              }} />
            </div>

            <div 
              ref={trackRef}
              onMouseMove={onDrag}
              onTouchMove={onDrag}
              onMouseUp={stopDrag}
              onTouchEnd={stopDrag}
              style={{ 
                position: 'relative', height: 40, background: '#E2E8F0', borderRadius: 999, 
                display: 'flex', alignItems: 'center', padding: '0 4px', userSelect: 'none' 
              }}
            >
              <div style={{ position: 'absolute', width: '100%', textAlign: 'center', fontSize: 11, color: '#64748B', fontWeight: 600, pointerEvents: 'none' }}>
                {isVerified ? "Verifikasi Berhasil ✨" : "Geser puzzle ke kanan dengan pas ➔"}
              </div>

              <div 
                onMouseDown={startDrag}
                onTouchStart={startDrag}
                style={{
                  position: 'absolute', left: sliderPos, width: 44, height: 32, background: isVerified ? '#16A34A' : '#00B4D8',
                  borderRadius: 999, cursor: isVerified ? 'default' : 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 800, boxShadow: '0 2px 6px rgba(0,180,216,0.4)', transition: isDragging ? 'none' : 'left 0.2s ease', zIndex: 4
                }}
              >
                {isVerified ? '✓' : '💐'}
              </div>
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading || !isVerified || (isRegister && !isOtpVerified)}
            style={{ 
              width: '100%', padding: '12px 0', marginTop: 14, 
              background: (loading || !isVerified || (isRegister && !isOtpVerified)) ? '#CBD5E1' : '#00B4D8', color: 'white', 
              border: 'none', borderRadius: 10, cursor: (loading || !isVerified || (isRegister && !isOtpVerified)) ? 'not-allowed' : 'pointer', fontWeight: 700,
              fontSize: 14, transition: 'background 0.2s' 
            }}
          >
            {loading ? "Memproses..." : (isRegister ? "Daftar Sekarang" : "Masuk")}
          </button>
        </form>

        <button 
          onClick={() => { setIsRegister(!isRegister); resetCaptcha(); }} 
          style={{ 
            width: '100%', marginTop: 10, background: 'none', border: 'none', 
            color: '#0077b6', cursor: 'pointer', fontWeight: 600, fontSize: 12 
          }}
        >
          {isRegister ? "Sudah punya akun? Login di sini" : "Belum punya akun? Daftar di sini"}
        </button>
      </div>
    </div>
  );
}