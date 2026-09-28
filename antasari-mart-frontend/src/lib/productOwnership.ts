import type { Product, SessionUser } from '../types';
import { normalizeUserId } from './cloudChatSync';

/**
 * 🛡️ Helper Validasi Kepemilikan Produk:
 * Memeriksa apakah produk yang dilihat/dipesan merupakan milik toko pengguna yang sedang aktif.
 * Mengembalikan `true` jika produk adalah milik pengguna sendiri (sehingga tidak boleh dibeli sendiri).
 */
export function isUserProductOwner(
  product: Product | null | undefined,
  currentUser: SessionUser | any | null | undefined
): boolean {
  if (!product || !currentUser) return false;

  // Mode Pengunjung Tamu (Guest) bukan pemilik produk
  if (
    currentUser.id === 'guest' ||
    !currentUser.email ||
    currentUser.email === 'tamu@antasari.mart'
  ) {
    return false;
  }

  const myId = String(currentUser.id || '').toLowerCase().trim();
  const myEmail = String(currentUser.email || '').toLowerCase().trim();
  const myName = String(currentUser.nama || currentUser.name || '').toLowerCase().trim();
  const myRole = String(currentUser.role || '').toLowerCase().trim();
  const myRoles: string[] = Array.isArray(currentUser.roles)
    ? currentUser.roles.map((r: any) => String(r).toLowerCase().trim())
    : [myRole];

  const pSellerId = String(product.sellerId || '').toLowerCase().trim();
  const pSellerName = String(product.sellerName || '').toLowerCase().trim();
  const pSellerRole = String((product as any).sellerRole || '').toLowerCase().trim();

  // 1. Pencocokan langsung berdasarkan ID, Email, atau Normalized ID
  if (pSellerId) {
    if (myId && (myId === pSellerId || myId === `seller_${pSellerId}` || pSellerId === `seller_${myId}`)) {
      return true;
    }
    if (myEmail && (myEmail === pSellerId || normalizeUserId(myEmail) === normalizeUserId(pSellerId))) {
      return true;
    }
  }

  // 2. Pencocokan berdasarkan kesamaan role jika produk memiliki sellerRole spesifik toko
  if (pSellerRole && (pSellerRole === myRole || myRoles.includes(pSellerRole))) {
    if (
      pSellerId === myId ||
      pSellerId === myEmail ||
      normalizeUserId(pSellerId) === normalizeUserId(myEmail)
    ) {
      return true;
    }
  }

  // 3. Deteksi Khusus Toko Myammiy Craft (seller_1)
  const isMyammiyProduct =
    pSellerId === 'seller_1' ||
    pSellerName.includes('myammiy');

  const isMyammiyUser =
    myEmail.includes('myammiy') ||
    myId === 'seller_1' ||
    myName.includes('myammiy');

  if (isMyammiyProduct && isMyammiyUser) {
    return true;
  }

  // 4. Deteksi Khusus Koperasi Kampus UIN Antasari (s1 / a1 / isKoperasi)
  const isKoperasiProduct =
    product.isKoperasi === true ||
    pSellerId === 's1' ||
    pSellerId === 'a1' ||
    pSellerName.includes('koperasi');

  const isKoperasiAdminUser =
    (myRoles.includes('admin') ||
      myRoles.includes('admin_reguler') ||
      myRoles.includes('admin_pro') ||
      myRole === 'admin') &&
    (myEmail.includes('koperasi') ||
      myEmail.includes('admin@koperasi') ||
      myId === 's1' ||
      myId === 'a1' ||
      myName.includes('koperasi'));

  if (isKoperasiProduct && isKoperasiAdminUser) {
    return true;
  }

  return false;
}
