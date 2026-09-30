/**
 * =========================================================================
 * 💬 CHAT UTILITIES & DETERMINISTIC ROOM ID GENERATOR (CAMPUS MART)
 * File: src/utils/chatUtils.ts
 * =========================================================================
 */

/**
 * 🎯 Standarisasi Kanonikal ID Pengguna / Kontak:
 * Nurmiyaty (Super Admin) -> SELALU '1'
 * Admin Koperasi -> SELALU '4'
 * Penjual Myammiy Craft -> SELALU '3'
 * Driver Kampus -> SELALU '5'
 * Pembeli (Ahmad Fauzi / Raisa) -> SELALU '2'
 */
export function getCanonicalContactId(contactOrId: any): string {
  if (!contactOrId) return '';
  const obj = typeof contactOrId === 'object' ? contactOrId : { id: String(contactOrId) };
  const rawId = String(obj.id || obj.partner_id || obj.userId || obj.user_id || '').toLowerCase().trim();
  const rawName = String(obj.name || obj.nama || obj.senderName || obj.receiverName || '').toLowerCase().trim();
  const rawEmail = String(obj.email || obj.partner_email || obj.partnerEmail || '').toLowerCase().trim();
  const rawRole = String(obj.role || obj.senderRole || obj.receiverRole || '').toLowerCase().trim();

  // 1. Super Admin Nurmiyaty -> SELALU '1'
  if (
    rawId === '1' ||
    rawId === 'admin_nurmiyaty' ||
    rawId.includes('nurmiyaty') ||
    rawName.includes('nurmiyaty') ||
    rawEmail.includes('nurmiyaty') ||
    rawEmail.includes('miyya') ||
    rawName.includes('super admin') ||
    (rawRole.includes('super') && !rawName.includes('koperasi')) ||
    (rawId.startsWith('chat_') && (rawId.includes('_1') || rawId.includes('1_') || rawId.includes('nurmiyaty')))
  ) {
    return '1';
  }

  // 2. Admin Koperasi -> SELALU '4'
  if (
    rawId === '4' ||
    rawId === 'coop_koperasi' ||
    rawId.includes('koperasi') ||
    rawName.includes('koperasi') ||
    rawEmail.includes('koperasi') ||
    rawEmail === 's1'
  ) {
    return '4';
  }

  // 3. Penjual Myammiy Craft -> SELALU '3'
  if (
    rawId === '3' ||
    rawId === 'seller_1' ||
    rawId.includes('myammiy') ||
    rawName.includes('myammiy') ||
    rawEmail.includes('seller')
  ) {
    return '3';
  }

  // 4. Driver Kampus -> SELALU '5'
  if (
    rawId === '5' ||
    rawId === 'driver_kampus' ||
    rawId.includes('driver') ||
    rawName.includes('driver') ||
    rawName.includes('budi') ||
    rawEmail.includes('driver')
  ) {
    return '5';
  }

  // 5. Pembeli (Raisa / Fauzi) -> '2'
  if (
    rawId === '2' ||
    rawId === '101' ||
    rawName.includes('raisa') ||
    rawEmail.includes('raisa') ||
    rawName.includes('fauzi') ||
    rawEmail.includes('pembeli')
  ) {
    return '2';
  }

  return rawId || rawName;
}

/**
 * Formula Standar Deterministic Room ID Generator:
 * - Jika ada orderId: order_${orderId}_${sorted[0]}_${sorted[1]}
 * - Jika obrolan biasa (direct): chat_${sorted[0]}_${sorted[1]}
 */
export const getCanonicalRoomId = (userAId: string, userBId: string, orderId?: string): string => {
  const idA = getCanonicalContactId(userAId);
  const idB = getCanonicalContactId(userBId);

  // Urutkan alfabetis agar urutan ID tidak terbalik di kedua sisi browser
  const sortedPair = [idA, idB].sort();

  if (orderId) {
    return `order_${String(orderId).trim()}_${sortedPair[0]}_${sortedPair[1]}`;
  }
  return `chat_${sortedPair[0]}_${sortedPair[1]}`;
};

export const getRoomId = getCanonicalRoomId;

/**
 * Validasi kepemilikan pesan secara murni (Pure Bubble Position Check)
 * Menjamin konsistensi posisi bubble Kanan (Hijau) vs Kiri (Putih)
 *
 * @param msg Objek pesan
 * @param currentUserId ID akun yang sedang aktif/login
 */
export const isMine = (msg: any, currentUserId?: string): boolean => {
  if (!msg) return false;
  const sender = String(msg.sender_id || msg.senderId || msg.sender || msg.fromId || '').toLowerCase().trim();
  const target = String(currentUserId || '').toLowerCase().trim();
  return Boolean(sender && target && sender === target);
};

/**
 * Parsing informasi dari Deterministic Room ID
 */
export const parseRoomId = (roomId: string): { type: 'order' | 'chat'; orderId?: string; participants: string[] } => {
  const clean = String(roomId || '').trim();
  if (clean.startsWith('order_')) {
    const parts = clean.split('_');
    // Format: order_{orderId}_{user0}_{user1}
    if (parts.length >= 4) {
      const orderId = parts[1];
      const participants = parts.slice(2);
      return { type: 'order', orderId, participants };
    }
  }
  if (clean.startsWith('chat_')) {
    const parts = clean.split('_');
    return { type: 'chat', participants: parts.slice(1) };
  }
  return { type: 'chat', participants: clean.replace(/^(chat_|room_)/, '').split('_') };
};

/**
 * 🛡️ Validasi isolasi akun diri sendiri secara ketat
 * Memastikan akun yang sedang aktif/login TIDAK PERNAH muncul di daftar kontak sendiri
 */
export const isSelfUser = (
  contact: any,
  currentUserId?: string,
  currentUserEmail?: string,
  currentUserName?: string,
  currentUserRole?: string
): boolean => {
  if (!contact) return false;

  const myCanonical = getCanonicalContactId({
    id: currentUserId,
    email: currentUserEmail,
    name: currentUserName,
    role: currentUserRole
  });
  const contactCanonical = getCanonicalContactId(contact);
  if (myCanonical && contactCanonical && myCanonical === contactCanonical) {
    return true;
  }

  const myId = String(currentUserId || '').toLowerCase().trim();
  const myEmail = String(currentUserEmail || '').toLowerCase().trim();
  const myName = String(currentUserName || '').toLowerCase().trim();
  const myRole = String(currentUserRole || '').toLowerCase().trim();

  const cId = String(contact.id || contact.partner_id || contact.user_id || '').toLowerCase().trim();
  const cEmail = String(contact.email || contact.partner_email || '').toLowerCase().trim();
  const cName = String(contact.name || contact.nama || contact.username || '').toLowerCase().trim();
  const cRole = String(contact.role || '').toLowerCase().trim();

  // 1. Pencocokan ID / Email langsung
  if (cId && myId && (cId === myId || cId === myEmail)) return true;
  if (cEmail && myEmail && (cEmail === myEmail || cEmail === myId)) return true;
  if (cId && myEmail && cId === myEmail) return true;
  if (cEmail && myId && cEmail === myId) return true;

  // 2. Isolasi Admin Nurmiyaty (Super Admin)
  const isMeSuperAdmin = myRole.includes('super') || myId.includes('admin') || myId.includes('nurmiyaty') || myEmail.includes('miyya') || myName.includes('nurmiyaty') || myId === '1';
  const isContactSuperAdmin = cId.includes('admin_nurmiyaty') || cId.includes('nurmiyaty') || cEmail.includes('miyya') || cName.includes('nurmiyaty') || cId === '1' || (cName.includes('super admin') && (cId.includes('admin') || cRole.includes('admin')));
  if (isMeSuperAdmin && isContactSuperAdmin) return true;

  // 3. Isolasi Admin Koperasi
  const isMeCoopAdmin = myRole.includes('coop') || myRole.includes('koperasi') || myRole.includes('coop_admin') || myId.includes('coop') || myId.includes('koperasi') || myEmail === 's1' || myId === '4';
  const isContactCoopAdmin = cId.includes('coop') || cId.includes('koperasi') || cId === 's1' || cEmail === 's1' || cName.includes('koperasi') || cId === '4';
  if (isMeCoopAdmin && isContactCoopAdmin) return true;

  return false;
};

