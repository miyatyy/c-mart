/**
 * =========================================================================
 * 🛡️ DEFINISI ENUM ROLE, PERMISSION & OTORISASI PERPESANAN (CAMPUS MART)
 * File: src/types/auth.ts
 * =========================================================================
 */

// 1. Role yang valid sesuai spesifikasi sistem
export enum UserRoleEnum {
  BUYER = 'buyer',
  SELLER = 'seller',
  DRIVER = 'driver',
  SUPER_ADMIN = 'super_admin'
}

export type ValidRole = 'buyer' | 'seller' | 'driver' | 'super_admin';
export type Role = ValidRole;

// 2. Alur urutan Status Pesanan (State Machine Flow)
export const ORDER_STATUS_FLOW = [
  'pending',
  'confirmed',
  'processing',
  'driver_assigned',
  'picked_up',
  'delivered',
  'completed'
] as const;

export type OrderFlowStatus = (typeof ORDER_STATUS_FLOW)[number];

// Status pesanan lengkap termasuk pembatalan
export type ExtendedOrderStatus = OrderFlowStatus | 'cancelled';

/**
 * 🔒 FUNGSI VALIDASI OTORISASI CHAT (canChat)
 * Aturan Otorisasi:
 * - 'super_admin' -> boleh chat ke SEMUA role kapan saja.
 * - 'buyer' <-> 'seller' -> aktif jika orderStatus in ['confirmed', 'processing', 'picked_up'].
 * - 'buyer' <-> 'driver' -> aktif jika orderStatus in ['driver_assigned', 'picked_up'].
 * - 'seller' <-> 'driver' -> aktif jika orderStatus in ['driver_assigned'].
 *
 * @param senderRole Role pengirim pesan ('buyer' | 'seller' | 'driver' | 'super_admin' | 'admin')
 * @param targetRole Role penerima pesan ('buyer' | 'seller' | 'driver' | 'super_admin' | 'admin')
 * @param orderStatus Status pesanan aktif yang mengikat interaksi chat (opsional)
 * @returns boolean apakah perpesanan diizinkan
 */
export const canChat = (
  senderRole?: string | ValidRole | null,
  targetRole?: string | ValidRole | null,
  orderStatus?: string | null
): boolean => {
  const sRole = String(senderRole || '').toLowerCase().trim();
  const tRole = String(targetRole || '').toLowerCase().trim();

  // Helper untuk mengenali Super Admin / Admin / Koordinator Admin
  const isAdminRole = (r: string): boolean => {
    return (
      r === 'super_admin' ||
      r === 'admin' ||
      r === 'superadmin' ||
      r === 'coop_admin' ||
      r.includes('admin') ||
      r.includes('nurmiyaty')
    );
  };

  // 1. Super Admin / Admin selalu boleh chat ke siapa saja, dan siapa saja boleh chat ke Admin kapan pun
  if (isAdminRole(sRole) || isAdminRole(tRole)) {
    return true;
  }

  // Normalisasi sinonim role ke role standar ('buyer', 'seller', 'driver')
  const normalizeRole = (r: string): string => {
    if (r === 'courier' || r === 'kurir') return 'driver';
    if (r === 'penjual' || r === 'merchant' || r === 'store') return 'seller';
    if (r === 'pembeli' || r === 'user' || r === 'customer') return 'buyer';
    return r;
  };

  const normS = normalizeRole(sRole);
  const normT = normalizeRole(tRole);
  const status = String(orderStatus || '').toLowerCase().trim();

  // 2. Buyer <-> Seller (aktif jika ada pesanan aktif confirmed, processing, picked_up atau jika direct inquiry tanpa order)
  if (
    (normS === 'buyer' && normT === 'seller') ||
    (normS === 'seller' && normT === 'buyer')
  ) {
    if (!status || status === 'null' || status === 'undefined') {
      return true; // Izinkan direct inquiry toko jika tanpa orderId / orderStatus
    }
    return ['confirmed', 'processing', 'picked_up'].includes(status);
  }

  // 3. Buyer <-> Driver (aktif saat driver bertugas)
  if (
    (normS === 'buyer' && normT === 'driver') ||
    (normS === 'driver' && normT === 'buyer')
  ) {
    return ['driver_assigned', 'picked_up'].includes(status);
  }

  // 4. Seller <-> Driver (aktif saat persiapan ambil pesanan)
  if (
    (normS === 'seller' && normT === 'driver') ||
    (normS === 'driver' && normT === 'seller')
  ) {
    return ['driver_assigned'].includes(status);
  }

  return false;
};

/**
 * Helper untuk mendapatkan alasan mengapa chat terkunci / belum aktif
 */
export const getChatRestrictionReason = (
  senderRole?: string | ValidRole | null,
  targetRole?: string | ValidRole | null,
  orderStatus?: string | null
): string | null => {
  if (canChat(senderRole, targetRole, orderStatus)) {
    return null;
  }

  const sRole = String(senderRole || '').toLowerCase().trim();
  const tRole = String(targetRole || '').toLowerCase().trim();

  const normalizeRole = (r: string): string => {
    if (r === 'courier' || r === 'kurir') return 'driver';
    if (r === 'penjual' || r === 'merchant' || r === 'store') return 'seller';
    if (r === 'pembeli' || r === 'user' || r === 'customer') return 'buyer';
    return r;
  };

  const normS = normalizeRole(sRole);
  const normT = normalizeRole(tRole);

  const isPair = (roleA: string, roleB: string) =>
    (normS === roleA && normT === roleB) || (normS === roleB && normT === roleA);

  if (isPair('buyer', 'seller')) {
    return 'Chat Penjual & Pembeli hanya aktif saat status pesanan: Dikonfirmasi, Diproses, atau Diambil.';
  }
  if (isPair('buyer', 'driver')) {
    return 'Chat Pembeli & Driver hanya aktif saat Driver ditugaskan atau pesanan telah diambil.';
  }
  if (isPair('seller', 'driver')) {
    return 'Chat Penjual & Driver hanya aktif saat status Driver Ditugaskan.';
  }

  return 'Otorisasi peran tidak mengizinkan obrolan langsung untuk status pesanan ini.';
};
