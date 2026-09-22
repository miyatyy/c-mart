import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import type { Campus, UserRole } from '../types';
import { loginApi, registerApi, sendOtpApi, verifyOtpApi } from '../lib/api';
import { getUserAvatar, saveUserAvatarToGlobalMap, PRESET_AVATARS } from '../lib/userAvatars';
import CampusMartPixelBackground from './CampusMartPixelBackground';

export default function Login({ onLogin }: { onLogin: (role: UserRole, gender: 'male' | 'female', campus: Campus, userData: any) => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nama, setNama] = useState('');
  const [nim, setNim] = useState('');
  
  // Multi-Role State (Default: Pembeli). Maksimal 3 pilihan
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['buyer']); 
  
  // State untuk OTP
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
  const tolerance = 14; 

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

    // Toleransi tinggi atau jika digeser lebih dari 80px, langsung pas!
    if (Math.abs(sliderPos - targetPos) <= 45 || sliderPos > 85) {
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
        Swal.fire({ icon: 'info', title: 'Perhatian', text: 'Minimal harus memilih 1 peran!', confirmButtonColor: '#5FA874' });
      }
    } else {
      if (selectedRoles.length < 3) {
        setSelectedRoles(prev => [...prev, roleKey]);
      } else {
        Swal.fire({ icon: 'warning', title: 'Batas Peran', text: '⚠️ Maksimal hanya boleh memilih 3 peran!', confirmButtonColor: '#5FA874' });
      }
    }
  };

  const [offlineOtp, setOfflineOtp] = useState('');

  // Kirim OTP via Email
  const handleSendOtp = async () => {
    if (!email) {
      Swal.fire({ icon: 'warning', title: 'Email Kosong', text: 'Silakan isi alamat email terlebih dahulu!', confirmButtonColor: '#5FA874' });
      return;
    }

    setSendingOtp(true);
    try {
      const data = await sendOtpApi(email);

      if (data.success) {
        setIsOtpSent(true);
        Swal.fire({
          icon: 'success',
          title: 'Kode OTP Terkirim! 📧',
          text: data.message,
          confirmButtonColor: '#5FA874'
        });
      } else {
        const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
        setOfflineOtp(mockOtp);
        setIsOtpSent(true);
        Swal.fire({
          icon: 'info',
          title: 'Kode Verifikasi OTP',
          html: `<p>Gunakan kode OTP berikut untuk melanjutkan pendaftaran:</p><h2 style="color:#5FA874;letter-spacing:4px;font-size:32px;">${mockOtp}</h2>`,
          confirmButtonColor: '#5FA874'
        });
      }
    } catch (_err) {
      const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setOfflineOtp(mockOtp);
      setIsOtpSent(true);
      Swal.fire({
        icon: 'info',
        title: 'Kode Verifikasi OTP',
        html: `<p>Gunakan kode OTP berikut untuk melanjutkan pendaftaran:</p><h2 style="color:#5FA874;letter-spacing:4px;font-size:32px;">${mockOtp}</h2>`,
        confirmButtonColor: '#5FA874'
      });
    } finally {
      setSendingOtp(false);
    }
  };

  // Verifikasi Kode OTP
  const handleVerifyOtp = async () => {
    if (!otpCode) {
      Swal.fire({ icon: 'warning', title: 'Kode OTP Kosong', text: 'Masukkan kode OTP yang telah dikirim ke email kamu!', confirmButtonColor: '#5FA874' });
      return;
    }

    setVerifyingOtp(true);
    try {
      if (offlineOtp && otpCode === offlineOtp) {
        setIsOtpVerified(true);
        Swal.fire({ icon: 'success', title: 'Verifikasi Berhasil! ✅', text: 'Email Anda berhasil diverifikasi!', confirmButtonColor: '#5FA874' });
        return;
      }

      const data = await verifyOtpApi(email, otpCode);

      if (data.success) {
        setIsOtpVerified(true);
        Swal.fire({ icon: 'success', title: 'Verifikasi Berhasil! ✅', text: data.message, confirmButtonColor: '#5FA874' });
      } else if (offlineOtp && otpCode === offlineOtp) {
        setIsOtpVerified(true);
        Swal.fire({ icon: 'success', title: 'Verifikasi Berhasil! ✅', text: 'Email Anda berhasil diverifikasi!', confirmButtonColor: '#5FA874' });
      } else {
        Swal.fire({ icon: 'error', title: 'Verifikasi Gagal', text: data.message, confirmButtonColor: '#EF4444' });
      }
    } catch (_err) {
      if (offlineOtp && otpCode === offlineOtp) {
        setIsOtpVerified(true);
        Swal.fire({ icon: 'success', title: 'Verifikasi Berhasil! ✅', text: 'Email Anda berhasil diverifikasi!', confirmButtonColor: '#5FA874' });
      } else {
        Swal.fire({ icon: 'error', title: 'Kesalahan Server', text: 'Gagal memverifikasi OTP.', confirmButtonColor: '#EF4444' });
      }
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

    // Otomatis verifikasi puzzle saat tombol Masuk ditekan agar tidak perlu input/klik 2 kali
    if (!isVerified) {
      setIsVerified(true);
      setSliderPos(targetPos);
    }

    if (isRegister && !isOtpVerified) {
      Swal.fire({
        icon: 'warning',
        title: 'Email Belum Diverifikasi 📧',
        text: 'Silakan masukkan dan verifikasi kode OTP yang telah dikirim ke email kamu!',
        confirmButtonColor: '#5FA874'
      });
      return;
    }

    setLoading(true);
    
    try {
      if (isRegister) {
        let registeredUser: any = null;
        try {
          const data = await registerApi({
            email: email.toLowerCase().trim(),
            password,
            nama,
            nim,
            roles: selectedRoles,
            role: selectedRoles[0] || 'buyer',
            avatar: selectedAvatar
          });
          if (data && data.success && data.user) {
            registeredUser = data.user;
          }
        } catch (_apiErr) {
          console.warn("Backend register API offline, saving user locally.");
        }

        const finalAvatar = selectedAvatar || getUserAvatar(email, nama, selectedRoles[0]);
        const newUserObj = registeredUser || {
          id: Date.now(),
          nama: nama || 'Pengguna Antasari',
          name: nama || 'Pengguna Antasari',
          email: email.toLowerCase().trim(),
          roles: selectedRoles.length > 0 ? selectedRoles : ['buyer'],
          role: selectedRoles[0] || 'buyer',
          nim: nim || '',
          avatar: finalAvatar,
          isPro: false
        };

        saveUserAvatarToGlobalMap(newUserObj.email, newUserObj.nama, finalAvatar);

        try {
          const registeredUsers: any[] = JSON.parse(localStorage.getItem('am_registered_users') || '[]');
          registeredUsers.push({ ...newUserObj, password });
          localStorage.setItem('am_registered_users', JSON.stringify(registeredUsers));
        } catch (_e) {}

        localStorage.setItem('am_user_avatar', finalAvatar);
        localStorage.setItem('am_user_session', JSON.stringify(newUserObj));
        localStorage.setItem('am_current_user', JSON.stringify(newUserObj));
        localStorage.setItem('am_user_name', newUserObj.nama);

        const primaryRole = (newUserObj.roles[0] || 'buyer') as UserRole;
        onLogin(primaryRole, 'female', 'banjarmasin', newUserObj);
        return;
      } else {
        // ==========================================
        // 🔑 INSTANT & RESILIENT LOGIN FLOW
        // ==========================================
        const cleanEmail = email.toLowerCase().trim();
        const emailPrefix = cleanEmail.split('@')[0] || '';

        // 1. SUPER ADMIN
        const isSuperAdminEmail = (
          cleanEmail === 'miyya@gmail.com' ||
          cleanEmail === 'mnurmiyaty2@gmail.com' ||
          cleanEmail === 'nurmiyaty' ||
          cleanEmail.includes('miyya')
        );

        if (isSuperAdminEmail) {
          const superAdminUser = {
            id: 1,
            nama: 'Nurmiyaty (Super Admin)',
            name: 'Nurmiyaty (Super Admin)',
            email: cleanEmail.includes('@') ? cleanEmail : 'miyya@gmail.com',
            roles: ['super_admin', 'buyer', 'seller', 'driver', 'admin'],
            role: 'super_admin',
            isPro: true,
            avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MayaSmile&backgroundColor=b6e3f4'
          };
          localStorage.setItem('am_user_avatar', superAdminUser.avatar);
          localStorage.setItem('am_user_session', JSON.stringify(superAdminUser));
          localStorage.setItem('am_current_user', JSON.stringify(superAdminUser));
          localStorage.setItem('am_user_name', superAdminUser.nama);
          saveUserAvatarToGlobalMap(superAdminUser.email, superAdminUser.nama, superAdminUser.avatar);

          loginApi(cleanEmail, password).catch(() => {});
          onLogin('super_admin', 'female', 'banjarmasin', superAdminUser);
          return;
        }

        // 2. CHECK LOCAL REGISTERED ACCOUNTS
        try {
          const registeredUsers: any[] = JSON.parse(localStorage.getItem('am_registered_users') || '[]');
          const matchedUser = registeredUsers.find(u => {
            const uMail = String(u.email || '').toLowerCase().trim();
            return uMail === cleanEmail || uMail === emailPrefix;
          });

          if (matchedUser) {
            const resolvedAvatar = getUserAvatar(matchedUser.email, matchedUser.nama, matchedUser.role, matchedUser.avatar);
            const loggedInUser = {
              id: matchedUser.id || Date.now(),
              nama: matchedUser.nama || matchedUser.name || 'Pengguna Antasari',
              name: matchedUser.nama || matchedUser.name || 'Pengguna Antasari',
              email: matchedUser.email || cleanEmail,
              roles: matchedUser.roles || [matchedUser.role || 'buyer'],
              role: matchedUser.role || (matchedUser.roles && matchedUser.roles[0]) || 'buyer',
              avatar: resolvedAvatar,
              nim: matchedUser.nim,
              isPro: !!matchedUser.isPro
            };
            saveUserAvatarToGlobalMap(loggedInUser.email, loggedInUser.nama, resolvedAvatar);
            if (loggedInUser.avatar) {
              localStorage.setItem('am_user_avatar', loggedInUser.avatar);
            }
            localStorage.setItem('am_user_session', JSON.stringify(loggedInUser));
            localStorage.setItem('am_current_user', JSON.stringify(loggedInUser));
            localStorage.setItem('am_user_name', loggedInUser.nama);

            loginApi(cleanEmail, password).catch(() => {});
            const primaryRole = (loggedInUser.roles[0] || 'buyer') as UserRole;
            onLogin(primaryRole, 'female', 'banjarmasin', loggedInUser);
            return;
          }
        } catch (_e) {}

        // 3. SERVER API LOGIN (If backend is online and responds)
        let serverUser: any = null;
        try {
          const data = await loginApi(email, password);
          if (data && data.success && data.user) {
            serverUser = data.user;
          }
        } catch (_apiErr: any) {
          // If server is offline/error, proceed to instant campus demo / auto session fallback
        }

        if (serverUser) {
          const resolvedAvatar = serverUser.avatar || getUserAvatar(serverUser.email, serverUser.nama || serverUser.name, serverUser.role);
          const loggedInUser = {
            ...serverUser,
            avatar: resolvedAvatar,
            nama: serverUser.nama || serverUser.name || 'Pengguna Antasari',
            name: serverUser.nama || serverUser.name || 'Pengguna Antasari'
          };
          saveUserAvatarToGlobalMap(loggedInUser.email, loggedInUser.nama, resolvedAvatar);
          localStorage.setItem('am_user_avatar', resolvedAvatar);
          localStorage.setItem('am_user_session', JSON.stringify(loggedInUser));
          localStorage.setItem('am_current_user', JSON.stringify(loggedInUser));
          localStorage.setItem('am_user_name', loggedInUser.nama);

          const primaryRole = Array.isArray(loggedInUser.roles) ? (loggedInUser.roles[0] as UserRole) : ((loggedInUser.role || 'buyer') as UserRole);
          onLogin(primaryRole, 'female', 'banjarmasin', loggedInUser);
          return;
        }

        // 4. INSTANT CAMPUS ACCOUNT DEMO & UNIVERSAL SEAMLESS RESOLVER
        // Covers: Raisa, Udin, Seller, Driver, Koperasi, or ANY student/campus email
        let autoName = 'Pengguna Antasari';
        let autoRoles: string[] = ['buyer'];
        let autoRole = 'buyer';

        if (cleanEmail.includes('raisa')) {
          autoName = 'Raisa';
          autoRoles = ['buyer'];
          autoRole = 'buyer';
        } else if (cleanEmail.includes('udin')) {
          autoName = 'Udin';
          autoRoles = ['seller', 'buyer'];
          autoRole = 'seller';
        } else if (cleanEmail.includes('seller') || cleanEmail.includes('myammiy')) {
          autoName = 'Myammiy Craft';
          autoRoles = ['seller', 'buyer'];
          autoRole = 'seller';
        } else if (cleanEmail.includes('driver') || cleanEmail.includes('kurir')) {
          autoName = 'Fajar (Driver Kampus)';
          autoRoles = ['driver'];
          autoRole = 'driver';
        } else if (cleanEmail.includes('koperasi') || cleanEmail.includes('admin')) {
          autoName = 'Pengurus Koperasi';
          autoRoles = ['admin', 'seller', 'buyer'];
          autoRole = 'admin';
        } else {
          // General student email formatting (e.g. raisa14 -> Raisa 14, ahmad.fauzi -> Ahmad Fauzi)
          const namePart = emailPrefix.replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          autoName = namePart || 'Mahasiswa Antasari';
          autoRoles = ['buyer'];
          autoRole = 'buyer';
        }

        const resolvedAvatar = getUserAvatar(cleanEmail, autoName, autoRole);
        const resolvedUser = {
          id: Date.now(),
          nama: autoName,
          name: autoName,
          email: cleanEmail,
          roles: autoRoles,
          role: autoRole,
          avatar: resolvedAvatar,
          isPro: false
        };

        // Cache into local registered users so future logins are instant
        try {
          const registeredUsers: any[] = JSON.parse(localStorage.getItem('am_registered_users') || '[]');
          const existsIdx = registeredUsers.findIndex(u => u.email?.toLowerCase() === cleanEmail);
          if (existsIdx >= 0) {
            registeredUsers[existsIdx] = { ...registeredUsers[existsIdx], ...resolvedUser, password };
          } else {
            registeredUsers.push({ ...resolvedUser, password });
          }
          localStorage.setItem('am_registered_users', JSON.stringify(registeredUsers));
        } catch (_e) {}

        saveUserAvatarToGlobalMap(resolvedUser.email, resolvedUser.nama, resolvedAvatar);
        localStorage.setItem('am_user_avatar', resolvedAvatar);
        localStorage.setItem('am_user_session', JSON.stringify(resolvedUser));
        localStorage.setItem('am_current_user', JSON.stringify(resolvedUser));
        localStorage.setItem('am_user_name', resolvedUser.nama);

        const primaryRole = (resolvedUser.roles[0] || 'buyer') as UserRole;
        onLogin(primaryRole, 'female', 'banjarmasin', resolvedUser);
        return;
      }
    } catch (error: any) {
      console.error("Login submission error:", error);
      // Even if an unexpected JS exception happened, create a resilient fallback session
      const cleanEmail = email.toLowerCase().trim() || 'user@antasari.mart';
      const fallbackUser = {
        id: Date.now(),
        nama: 'Pengguna Antasari',
        name: 'Pengguna Antasari',
        email: cleanEmail,
        roles: ['buyer'],
        role: 'buyer',
        avatar: getUserAvatar(cleanEmail, 'Pengguna Antasari', 'buyer'),
        isPro: false
      };
      localStorage.setItem('am_user_session', JSON.stringify(fallbackUser));
      localStorage.setItem('am_current_user', JSON.stringify(fallbackUser));
      localStorage.setItem('am_user_name', fallbackUser.nama);
      onLogin('buyer', 'female', 'banjarmasin', fallbackUser);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #193325 0%, #2e5944 50%, #468465 100%)',
      padding: '24px 16px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'var(--am-font-body, system-ui, sans-serif)'
    }}>
      <style>{animationStyles}</style>

      {/* 🎨 ANIMASI PIXEL ART CAMPUS MART BACKGROUND */}
      <CampusMartPixelBackground />

      <div style={{
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '26px',
        border: '1.5px solid rgba(255, 255, 255, 0.75)',
        padding: '34px 28px',
        width: '100%',
        maxWidth: '450px',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.38)',
        position: 'relative',
        zIndex: 10,
        margin: 'auto'
      }}>
        {/* Header Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div className="cartoon-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(255, 255, 255, 0.85)'
            }}>
              <svg width="38" height="46" viewBox="0 0 38 46" fill="none">
                {/* Vending Machine Body */}
                <rect x="3" y="2" width="32" height="42" rx="5" fill="#064e3b" stroke="#34d399" strokeWidth="1.8" />
                {/* Header Neon Bar */}
                <rect x="6" y="5" width="26" height="5" rx="2" fill="#0f766e" />
                <rect x="8" y="6" width="10" height="3" rx="1" fill="#6ee7b7" />
                <circle cx="28" cy="7.5" r="1.5" fill="#f59e0b" />
                {/* Glass Window */}
                <rect x="6" y="12" width="26" height="20" rx="3" fill="#022c22" stroke="#10b981" strokeWidth="1.2" />
                {/* Top Shelf Items (Drinks) */}
                <rect x="8" y="14" width="4" height="6" rx="1" fill="#ef4444" />
                <rect x="14" y="14" width="4" height="6" rx="1" fill="#3b82f6" />
                <rect x="20" y="14" width="4" height="6" rx="1" fill="#f59e0b" />
                <rect x="26" y="14" width="4" height="6" rx="1" fill="#a855f7" />
                <line x1="7" y1="21" x2="31" y2="21" stroke="#0f766e" strokeWidth="1" />
                {/* Bottom Shelf Items (Blind Bags) */}
                <rect x="8" y="23" width="5" height="7" rx="1.5" fill="#fbbf24" />
                <rect x="15" y="23" width="5" height="7" rx="1.5" fill="#f472b6" />
                <rect x="22" y="23" width="5" height="7" rx="1.5" fill="#34d399" />
                <line x1="7" y1="31" x2="31" y2="31" stroke="#0f766e" strokeWidth="1" />
                {/* Keypad / Card Reader */}
                <rect x="6" y="34" width="10" height="7" rx="1.5" fill="#042f2e" stroke="#2dd4bf" strokeWidth="0.8" />
                <rect x="8" y="36" width="6" height="3" rx="0.5" fill="#34d399" />
                {/* Dispense Slot */}
                <rect x="19" y="35" width="13" height="5" rx="1.5" fill="#022c22" stroke="#34d399" strokeWidth="0.8" />
                <rect x="23" y="37" width="5" height="1.5" rx="0.5" fill="#6ee7b7" />
              </svg>
            </div>
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: 800, color: '#243329' }}>
            {isRegister ? 'Daftar Akun Baru' : 'Masuk Campus Mart'}
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            {isRegister ? 'Lengkapi profil untuk bergabung dengan Campus Mart' : 'Gunakan akun terdaftar Anda untuk melanjutkan'}
          </p>
        </div>

        {/* Tab Toggle Login / Register */}
        <div style={{
          display: 'flex',
          background: '#f1f5f9',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '14px'
        }}>
          <button
            type="button"
            onClick={() => { setIsRegister(false); resetCaptcha(); }}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              background: !isRegister ? '#ffffff' : 'transparent',
              color: !isRegister ? '#243329' : '#64748b',
              boxShadow: !isRegister ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            🔑 Masuk
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); resetCaptcha(); }}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              background: isRegister ? '#ffffff' : 'transparent',
              color: isRegister ? '#243329' : '#64748b',
              boxShadow: isRegister ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            ✨ Daftar
          </button>
        </div>

        {/* ⚡ Quick 1-Click Instant Login */}
        {!isRegister && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '6px', textAlign: 'center' }}>
              ⚡ Masuk Cepat 1-Klik Langsung ke Beranda:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  const cleanEmail = 'raisa14@gmail.com';
                  const autoUser = {
                    id: 101,
                    nama: 'Raisa',
                    name: 'Raisa',
                    email: cleanEmail,
                    roles: ['buyer'],
                    role: 'buyer',
                    avatar: getUserAvatar(cleanEmail, 'Raisa', 'buyer'),
                    isPro: false
                  };
                  saveUserAvatarToGlobalMap(cleanEmail, 'Raisa', autoUser.avatar);
                  localStorage.setItem('am_user_avatar', autoUser.avatar);
                  localStorage.setItem('am_user_session', JSON.stringify(autoUser));
                  localStorage.setItem('am_current_user', JSON.stringify(autoUser));
                  localStorage.setItem('am_user_name', autoUser.nama);
                  onLogin('buyer', 'female', 'banjarmasin', autoUser);
                }}
                style={{
                  padding: '7px 4px',
                  borderRadius: '10px',
                  border: '1.5px solid #d1fae5',
                  background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
                  cursor: 'pointer',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#065f46',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                }}
              >
                <span>🌸 Raisa</span>
                <span style={{ fontSize: '9.5px', color: '#059669', fontWeight: 600 }}>Pembeli</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const cleanEmail = 'udin14@gmail.com';
                  const autoUser = {
                    id: 102,
                    nama: 'Udin',
                    name: 'Udin',
                    email: cleanEmail,
                    roles: ['seller', 'buyer'],
                    role: 'seller',
                    avatar: getUserAvatar(cleanEmail, 'Udin', 'seller'),
                    isPro: false
                  };
                  saveUserAvatarToGlobalMap(cleanEmail, 'Udin', autoUser.avatar);
                  localStorage.setItem('am_user_avatar', autoUser.avatar);
                  localStorage.setItem('am_user_session', JSON.stringify(autoUser));
                  localStorage.setItem('am_current_user', JSON.stringify(autoUser));
                  localStorage.setItem('am_user_name', autoUser.nama);
                  onLogin('seller', 'female', 'banjarmasin', autoUser);
                }}
                style={{
                  padding: '7px 4px',
                  borderRadius: '10px',
                  border: '1.5px solid #e0e7ff',
                  background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)',
                  cursor: 'pointer',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#3730a3',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                }}
              >
                <span>🛍️ Udin</span>
                <span style={{ fontSize: '9.5px', color: '#4f46e5', fontWeight: 600 }}>Penjual</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const cleanEmail = 'miyya@gmail.com';
                  const autoUser = {
                    id: 1,
                    nama: 'Nurmiyaty (Super Admin)',
                    name: 'Nurmiyaty (Super Admin)',
                    email: cleanEmail,
                    roles: ['super_admin', 'buyer', 'seller', 'driver', 'admin'],
                    role: 'super_admin',
                    isPro: true,
                    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MayaSmile&backgroundColor=b6e3f4'
                  };
                  saveUserAvatarToGlobalMap(cleanEmail, autoUser.nama, autoUser.avatar);
                  localStorage.setItem('am_user_avatar', autoUser.avatar);
                  localStorage.setItem('am_user_session', JSON.stringify(autoUser));
                  localStorage.setItem('am_current_user', JSON.stringify(autoUser));
                  localStorage.setItem('am_user_name', autoUser.nama);
                  onLogin('super_admin', 'female', 'banjarmasin', autoUser);
                }}
                style={{
                  padding: '7px 4px',
                  borderRadius: '10px',
                  border: '1.5px solid #fef3c7',
                  background: 'linear-gradient(135deg, #fffbeb 0%, #fefce8 100%)',
                  cursor: 'pointer',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#92400e',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                }}
              >
                <span>👑 Admin</span>
                <span style={{ fontSize: '9.5px', color: '#d97706', fontWeight: 600 }}>Super Admin</span>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isRegister && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  name="user_fullname_field"
                  autoComplete="off"
                  required
                  placeholder="Masukkan nama lengkap Anda..."
                  value={nama}
                  onChange={e => setNama(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  NIM (Opsional Mahasiswa)
                </label>
                <input
                  type="text"
                  name="user_nim_field"
                  autoComplete="off"
                  placeholder="Contoh: 2101010101"
                  value={nim}
                  onChange={e => setNim(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              Alamat Email
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="email"
                name="user_login_email_field"
                autoComplete="off"
                required
                placeholder="email@uin-antasari.ac.id"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
              {isRegister && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp || isOtpVerified}
                  style={{
                    padding: '0 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isOtpVerified ? '#10B981' : '#5FA874',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '11px',
                    cursor: (sendingOtp || isOtpVerified) ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isOtpVerified ? '✅ Terverifikasi' : sendingOtp ? 'Mengirim...' : 'Kirim OTP'}
                </button>
              )}
            </div>
          </div>

          {isRegister && isOtpSent && !isOtpVerified && (
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#243329', marginBottom: '6px' }}>
                🔑 Masukkan Kode OTP 6 Digit:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  maxLength={6}
                  name="user_otp_verification"
                  autoComplete="off"
                  placeholder="Contoh: 123456"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '16px',
                    letterSpacing: '4px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={verifyingOtp}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#5FA874',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {verifyingOtp ? 'Memeriksa...' : 'Verifikasi'}
                </button>
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="user_login_secret_pass"
                autoComplete="new-password"
                required
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#64748b'
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {isRegister && (
            <>
              {/* Pilihan Multi-Role */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Pilih Peran Akun (Maks 3):
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { key: 'buyer', label: '🛍️ Pembeli' },
                    { key: 'seller', label: '🏪 Penjual' },
                    { key: 'driver', label: '🛵 Driver' }
                  ].map(r => {
                    const isChecked = selectedRoles.includes(r.key);
                    return (
                      <div
                        key={r.key}
                        onClick={() => handleRoleCheckbox(r.key)}
                        style={{
                          padding: '8px 6px',
                          borderRadius: '10px',
                          border: `1.5px solid ${isChecked ? '#5FA874' : '#cbd5e1'}`,
                          background: isChecked ? '#e0f2fe' : '#ffffff',
                          cursor: 'pointer',
                          textAlign: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: isChecked ? '#243329' : '#64748b',
                          transition: 'all 0.15s'
                        }}
                      >
                        {r.label}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Avatar Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Pilih Avatar Profil:
                </label>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
                  {PRESET_AVATARS.map(av => (
                    <img
                      key={av.id}
                      src={av.url}
                      alt={av.name}
                      onClick={() => setSelectedAvatar(av.url)}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        border: selectedAvatar === av.url ? '3px solid #5FA874' : '2px solid transparent',
                        transform: selectedAvatar === av.url ? 'scale(1.1)' : 'scale(1)',
                        transition: 'all 0.2s',
                        background: '#f1f5f9'
                      }}
                    />
                  ))}
                </div>
                <div style={{ marginTop: '4px', fontSize: '11px', color: '#64748b' }}>
                  Atau upload foto sendiri:{' '}
                  <input type="file" accept="image/*" onChange={handleDeviceImageUpload} style={{ fontSize: '11px' }} />
                </div>
              </div>
            </>
          )}

          {/* Slider Puzzle Captcha Buket Bunga */}
          <div style={{ marginTop: '4px', background: '#f8fafc', padding: '12px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>
                🧩 Geser puzzle buket bunga ke tempat yang pas:
              </span>
              {isVerified ? (
                <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 800, background: '#dcfce7', padding: '2px 8px', borderRadius: '6px' }}>
                  ✅ Pas! Terverifikasi
                </span>
              ) : (
                <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                  Geser ke kanan ➔
                </span>
              )}
            </div>

            <div
              ref={trackRef}
              onClick={() => {
                if (!isVerified) {
                  setIsVerified(true);
                  setSliderPos(targetPos);
                }
              }}
              onMouseMove={onDrag}
              onMouseUp={stopDrag}
              onMouseLeave={stopDrag}
              onTouchMove={onDrag}
              onTouchEnd={stopDrag}
              style={{
                position: 'relative',
                height: '115px',
                borderRadius: '12px',
                overflow: 'hidden',
                background: 'url(https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=500&fit=crop&auto=format) center/cover',
                userSelect: 'none',
                cursor: isVerified ? 'default' : 'pointer',
                boxShadow: isVerified ? '0 0 14px rgba(16, 185, 129, 0.4)' : 'inset 0 0 10px rgba(0,0,0,0.2)'
              }}
            >
              {/* Target Outline */}
              <div
                style={{
                  position: 'absolute',
                  left: `${targetPos}px`,
                  top: '25px',
                  width: '45px',
                  height: '45px',
                  borderRadius: '8px',
                  border: isVerified ? '2px solid #10B981' : '2px dashed #ffffff',
                  background: isVerified ? 'rgba(16, 185, 129, 0.25)' : 'rgba(0,0,0,0.35)',
                  boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)'
                }}
              />

              {/* Draggable Piece */}
              <div
                onMouseDown={startDrag}
                onTouchStart={startDrag}
                style={{
                  position: 'absolute',
                  left: `${sliderPos}px`,
                  top: '25px',
                  width: '45px',
                  height: '45px',
                  borderRadius: '8px',
                  border: isVerified ? '2px solid #10B981' : '2.5px solid #ffffff',
                  boxShadow: isVerified ? '0 0 12px #10B981' : '0 4px 12px rgba(0,0,0,0.45)',
                  background: 'url(https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=500&fit=crop&auto=format) center/cover',
                  backgroundPosition: `-${targetPos}px -25px`,
                  cursor: isVerified ? 'default' : isDragging ? 'grabbing' : 'grab',
                  transition: isDragging ? 'none' : 'all 0.2s ease'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '10px',
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #5FA874 0%, #5FA874 100%)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(244, 174, 194, 0.35)',
              transition: 'transform 0.1s'
            }}
          >
            {loading ? 'Memproses...' : isRegister ? 'Daftar Sekarang 🚀' : 'Masuk ke Akun 🚀'}
          </button>
        </form>
      </div>
    </div>
  );
}
