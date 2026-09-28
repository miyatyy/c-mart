// =========================================================
// 🌟 ANTASARI MART GLOBAL UNIFIED AVATAR SYNC SYSTEM
// =========================================================

export interface PresetAvatar {
  id: number;
  name: string;
  type: 'reguler' | 'pro';
  url: string;
  seed: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: 1, name: 'Maya (Ceria)', type: 'reguler', seed: 'MayaSmile', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MayaSmile&backgroundColor=b6e3f4' },
  { id: 2, name: 'Ahmad (Ramah)', type: 'reguler', seed: 'AhmadHappy', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AhmadHappy&backgroundColor=c0aede' },
  { id: 3, name: 'Siti (Manis Senyum)', type: 'reguler', seed: 'SitiJoy', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=SitiJoy&backgroundColor=ffd5dc' },
  { id: 4, name: 'Rizky (Ceria)', type: 'reguler', seed: 'RizkyFun', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=RizkyFun&backgroundColor=d1d4f9' },
  { id: 5, name: 'Dewi (Friendly)', type: 'reguler', seed: 'DewiBright', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=DewiBright&backgroundColor=ffdfbf' },
  { id: 6, name: 'Fajar (Semangat)', type: 'reguler', seed: 'FajarSmile', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=FajarSmile&backgroundColor=c1f4c5' },
  { id: 7, name: 'Alya (Kreatif Ceria)', type: 'reguler', seed: 'AlyaCheer', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AlyaCheer&backgroundColor=ffcdec' },
  { id: 8, name: 'Zain (Pro Senyum)', type: 'pro', seed: 'ZainPro', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ZainPro&backgroundColor=00b4d8' },
  { id: 9, name: 'Zara (Pro Elegan)', type: 'pro', seed: 'ZaraPro', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ZaraPro&backgroundColor=7209b7' },
  { id: 10, name: 'Ken (Pro Stylish)', type: 'pro', seed: 'KenPro', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=KenPro&backgroundColor=f72585' }
];

export const SYSTEM_DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/adventurer/svg?seed=MayaSmile&backgroundColor=b6e3f4';
export const AI_BOT_AVATAR = 'https://api.dicebear.com/7.x/bottts/svg?seed=MyammiyAI';
export const SUPER_ADMIN_AVATAR = 'https://api.dicebear.com/7.x/adventurer/svg?seed=SuperAdmin&backgroundColor=b6e3f4';
export const KOPERASI_ADMIN_AVATAR = 'https://api.dicebear.com/7.x/adventurer/svg?seed=KoperasiAdmin&backgroundColor=c1f4c5';
export const DRIVER_DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/adventurer/svg?seed=FajarSmile&backgroundColor=c1f4c5';
export const MYAMMIY_STORE_AVATAR = 'https://api.dicebear.com/7.x/adventurer/svg?seed=Myammiy&backgroundColor=ffdfbf';

// 🎯 Mapping Profil Default & Akun Utama Antasari Mart
export const KNOWN_USER_AVATARS: Record<string, string> = {
  // Super Admin & Admin Koperasi (Fixed Support System)
  'admin_nurmiyaty': SUPER_ADMIN_AVATAR,
  'coop_koperasi': KOPERASI_ADMIN_AVATAR,
  's1': KOPERASI_ADMIN_AVATAR,

  // Super Admin
  'miyya@gmail.com': SUPER_ADMIN_AVATAR,
  'mnurmiyaty2@gmail.com': SUPER_ADMIN_AVATAR,
  'nurmiyaty': SUPER_ADMIN_AVATAR,
  'super_admin': SUPER_ADMIN_AVATAR,
  'admin': KOPERASI_ADMIN_AVATAR,

  // Toko Resmi
  'seller_1': MYAMMIY_STORE_AVATAR,
  'myammiy': MYAMMIY_STORE_AVATAR,
  'myammiy craft': MYAMMIY_STORE_AVATAR,
  'myammiy craft (katalog resmi)': MYAMMIY_STORE_AVATAR,
  's1': KOPERASI_ADMIN_AVATAR,
  'koperasi uin antasari': KOPERASI_ADMIN_AVATAR,
  's2': 'https://api.dicebear.com/7.x/adventurer/svg?seed=SitiJoy&backgroundColor=ffd5dc',
  'toko siti — hijab & aksesoris': 'https://api.dicebear.com/7.x/adventurer/svg?seed=SitiJoy&backgroundColor=ffd5dc',
  's3': 'https://api.dicebear.com/7.x/adventurer/svg?seed=RizkyFun&backgroundColor=d1d4f9',
  'habibi snack corner': 'https://api.dicebear.com/7.x/adventurer/svg?seed=RizkyFun&backgroundColor=d1d4f9'
};

/**
 * 🔍 Helper Utama untuk Mendapatkan Avatar Pengguna yang 100% Konsisten dan Tersinkronisasi
 */
export function getUserAvatar(
  identifier?: string,
  name?: string,
  role?: string,
  explicitAvatar?: string
): string {
  // Jika avatar eksplisit valid (bukan template seed=udin generik yang salah)
  if (explicitAvatar && typeof explicitAvatar === 'string' && explicitAvatar.trim().length > 10) {
    const isGenericSeed = explicitAvatar.includes('seed=udin') || explicitAvatar.includes('seed=raisa') || explicitAvatar.includes('seed=Default');
    if (!isGenericSeed) {
      return explicitAvatar;
    }
  }

  const cleanId = String(identifier || '').toLowerCase().trim();
  const cleanName = String(name || '').toLowerCase().trim();
  const cleanRole = String(role || '').toLowerCase().trim();

  // 1. Asisten AI Bot (Strict check: jangan pernah cocokkan nama manusia seperti 'raisa' atau 'zain')
  if (cleanRole === 'ai' || cleanRole === 'asisten_ai' || cleanId === 'ai' || cleanId === 'bot' || cleanId === 'asisten_ai' || cleanName === 'asisten ai' || cleanName === 'ai bot' || cleanName === 'myammiy ai') {
    return AI_BOT_AVATAR;
  }

  // 2. Cek apakah ini akun pengguna yang sedang login saat ini di perangkat ini
  if (typeof window !== 'undefined') {
    try {
      const currentSession = JSON.parse(localStorage.getItem('am_user_session') || localStorage.getItem('am_current_user') || '{}');
      if (currentSession && currentSession.email) {
        const sessEmail = String(currentSession.email).toLowerCase().trim();
        const sessName = String(currentSession.nama || currentSession.name || '').toLowerCase().trim();
        if ((cleanId && (cleanId === sessEmail || cleanId === sessName)) || (cleanName && cleanName === sessName)) {
          if (currentSession.avatar && !currentSession.avatar.includes('seed=Default')) {
            return currentSession.avatar;
          }
          const storedAvatar = localStorage.getItem('am_user_avatar');
          if (storedAvatar && !storedAvatar.includes('seed=Default')) {
            return storedAvatar;
          }
        }
      }
    } catch (_e) {}
  }

  // 3. Cek Global Avatar Map di LocalStorage ('am_user_avatars_map')
  if (typeof window !== 'undefined') {
    try {
      const avatarMap = JSON.parse(localStorage.getItem('am_user_avatars_map') || '{}');
      if (cleanId && avatarMap[cleanId]) return avatarMap[cleanId];
      if (cleanName && avatarMap[cleanName]) return avatarMap[cleanName];
      if (cleanId.includes('@')) {
        const username = cleanId.split('@')[0];
        if (avatarMap[username]) return avatarMap[username];
      }
    } catch (_e) {}
  }

  // 4. Cek Akun Terdaftar di LocalStorage ('am_registered_users')
  if (typeof window !== 'undefined') {
    try {
      const regUsers: any[] = JSON.parse(localStorage.getItem('am_registered_users') || '[]');
      const matched = regUsers.find(u => {
        const uEmail = String(u.email || '').toLowerCase().trim();
        const uName = String(u.nama || u.name || '').toLowerCase().trim();
        return (cleanId && (cleanId === uEmail || cleanId === uName)) ||
               (cleanName && (cleanName === uName || cleanName === uEmail));
      });
      if (matched && matched.avatar && !matched.avatar.includes('seed=Default')) {
        return matched.avatar;
      }
    } catch (_e) {}
  }

  // 5. Cek Custom Products di LocalStorage (jika ini penjual produk)
  if (typeof window !== 'undefined') {
    try {
      const customProds: any[] = JSON.parse(localStorage.getItem('am_custom_products') || '[]');
      const matchedProd = customProds.find(p => {
        const pId = String(p.sellerId || '').toLowerCase().trim();
        const pName = String(p.sellerName || '').toLowerCase().trim();
        return (cleanId && (cleanId === pId || cleanId === pName)) ||
               (cleanName && (cleanName === pName || cleanName === pId));
      });
      if (matchedProd && matchedProd.sellerAvatar) return matchedProd.sellerAvatar;
    } catch (_e) {}
  }

  // 6. Cek Kamus Akun Terkenal (KNOWN_USER_AVATARS)
  if (KNOWN_USER_AVATARS[cleanId]) return KNOWN_USER_AVATARS[cleanId];
  if (KNOWN_USER_AVATARS[cleanName]) return KNOWN_USER_AVATARS[cleanName];
  if (cleanId.includes('@')) {
    const uname = cleanId.split('@')[0];
    if (KNOWN_USER_AVATARS[uname]) return KNOWN_USER_AVATARS[uname];
  }

  // Cek kata kunci nama/id toko resmi
  if (cleanId === 'seller_1' || cleanId.includes('myammiy') || cleanName.includes('myammiy')) {
    return MYAMMIY_STORE_AVATAR;
  }
  if (cleanId === 's1' || cleanName.includes('koperasi')) {
    return KOPERASI_ADMIN_AVATAR;
  }
  if (cleanId === 's2' || cleanName.includes('siti')) {
    return 'https://api.dicebear.com/7.x/adventurer/svg?seed=SitiJoy&backgroundColor=ffd5dc';
  }
  if (cleanId === 's3' || cleanName.includes('habibi')) {
    return 'https://api.dicebear.com/7.x/adventurer/svg?seed=RizkyFun&backgroundColor=d1d4f9';
  }
  if (cleanId.includes('admin') || cleanRole.includes('admin') || cleanName.includes('super admin')) {
    return SUPER_ADMIN_AVATAR;
  }
  if (cleanRole.includes('driver') || cleanRole.includes('kurir') || cleanId.includes('driver')) {
    return DRIVER_DEFAULT_AVATAR;
  }

  // 7. Deterministic Preset Fallback berdasarkan Hash String (tidak pernah acak / terubah-ubah)
  const targetStr = cleanName || cleanId || 'user';
  let hash = 0;
  for (let i = 0; i < targetStr.length; i++) {
    hash = (hash << 5) - hash + targetStr.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PRESET_AVATARS.length;
  return PRESET_AVATARS[index].url;
}

import { broadcastMqttAvatar } from './cloudChatSync';

/**
 * 📡 Broadcast Perubahan Avatar ke Seluruh Perangkat via Cloud Sync Channel
 */
export async function broadcastCloudAvatar(identifier: string, name: string, avatarUrl: string) {
  if (!avatarUrl || typeof window === 'undefined') return;
  const cleanId = String(identifier || '').toLowerCase().trim();
  const cleanName = String(name || '').toLowerCase().trim();

  try {
    broadcastMqttAvatar(cleanId, cleanName, avatarUrl);
  } catch (_e) {}
}

/**
 * 💾 Simpan dan Terapkan Avatar Pengguna ke Seluruh Sistem
 */
export function saveUserAvatarToGlobalMap(
  identifier: string,
  name: string,
  avatarUrl: string,
  broadcast: boolean = true
) {
  if (!avatarUrl || typeof window === 'undefined') return;

  const cleanId = String(identifier || '').toLowerCase().trim();
  const cleanName = String(name || '').toLowerCase().trim();

  try {
    // 1. Simpan ke Global Avatar Map
    const avatarMap = JSON.parse(localStorage.getItem('am_user_avatars_map') || '{}');
    if (cleanId) avatarMap[cleanId] = avatarUrl;
    if (cleanName) avatarMap[cleanName] = avatarUrl;
    if (cleanId.includes('@')) {
      avatarMap[cleanId.split('@')[0]] = avatarUrl;
    }
    localStorage.setItem('am_user_avatars_map', JSON.stringify(avatarMap));

    // 2. Update akun di am_registered_users jika cocok
    const regUsers: any[] = JSON.parse(localStorage.getItem('am_registered_users') || '[]');
    let updatedReg = false;
    const newRegUsers = regUsers.map(u => {
      const uEmail = String(u.email || '').toLowerCase().trim();
      const uName = String(u.nama || u.name || '').toLowerCase().trim();
      if ((cleanId && (cleanId === uEmail || cleanId === uName)) || (cleanName && cleanName === uName)) {
        updatedReg = true;
        return { ...u, avatar: avatarUrl };
      }
      return u;
    });

    if (updatedReg) {
      localStorage.setItem('am_registered_users', JSON.stringify(newRegUsers));
    }

    // 3. Update sesi aktif jika cocok
    const currentSession = JSON.parse(localStorage.getItem('am_user_session') || localStorage.getItem('am_current_user') || '{}');
    if (currentSession && currentSession.email) {
      const sessEmail = String(currentSession.email).toLowerCase().trim();
      const sessName = String(currentSession.nama || currentSession.name || '').toLowerCase().trim();
      if ((cleanId && (cleanId === sessEmail || cleanId === sessName)) || (cleanName && cleanName === sessName)) {
        currentSession.avatar = avatarUrl;
        localStorage.setItem('am_user_avatar', avatarUrl);
        localStorage.setItem('am_user_session', JSON.stringify(currentSession));
        localStorage.setItem('am_current_user', JSON.stringify(currentSession));
      }
    }

    // 4. Pancarkan event kustom & broadcast hanya jika broadcast diminta (misal: user mengubah avatar profil secara eksplisit)
    if (broadcast) {
      window.dispatchEvent(new CustomEvent('am_avatar_updated', {
        detail: { identifier: cleanId, name: cleanName, avatar: avatarUrl }
      }));
      broadcastCloudAvatar(cleanId, cleanName, avatarUrl);
    }
  } catch (e) {
    console.error('Gagal menyimpan avatar ke global map:', e);
  }
}
