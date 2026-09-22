import type { Product, ProductCategory, Campus, SessionUser, ProductModerationStatus, AiProductAnalysis } from '../types';
import { PRODUCTS } from '../data';

export const API_BASE_URL = (() => {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
  if (typeof window !== 'undefined') {
    const isHttps = window.location.protocol === 'https:';
    const hn = window.location.hostname;
    // Hindari request insecure HTTP di halaman HTTPS Firebase Hosting
    if (isHttps && (hn === 'antasari-mart.web.app' || hn.endsWith('.web.app') || hn.endsWith('.firebaseapp.com'))) {
      return 'https://antasari-mart-backend.vercel.app';
    }
    if (hn) {
      return `${window.location.protocol}//${hn}:5000`;
    }
  }
  return '';
})();

export const MIDTRANS_CLIENT_KEY = import.meta.env.VITE_MIDTRANS_CLIENT_KEY || 'Mid-client-8jHsm2sYfBK8gz1A';

// Helper Generic Request with strict timeout & non-throwing safe response parsing
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {})
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Strict 2500ms timeout to prevent hanging UI thread
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { success: false, message: `HTTP ${response.status}` } as unknown as T;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return data as T;
    } else {
      const text = await response.text();
      try {
        return JSON.parse(text) as T;
      } catch {
        return { success: false, message: text } as unknown as T;
      }
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    return { success: false, message: err?.message || 'Offline' } as unknown as T;
  }
}

// 🔁 MAPPER: Mengubah field PostgreSQL/Backend ke format frontend Product
export function mapBackendProductToFrontend(raw: any): Product {
  return {
    id: String(raw.id),
    name: raw.nama_produk || raw.name || 'Produk Antasari',
    description: raw.deskripsi || raw.description || '',
    price: typeof raw.harga === 'number' ? raw.harga : (raw.price || 0),
    stock: typeof raw.stok === 'number' ? raw.stok : (raw.stock || 0),
    category: (raw.kategori || raw.category || 'makanan') as ProductCategory,
    material: raw.material || raw.bahan || undefined,
    campus: (raw.kampus || 'banjarmasin').toLowerCase().trim() as Campus,
    sellerId: raw.sellerId || 'seller_1',
    sellerName: raw.sellerName || 'Penjual Antasari',
    image: raw.foto || raw.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&auto=format',
    images: Array.isArray(raw.images) && raw.images.length > 0 ? raw.images : (raw.foto || raw.image ? [raw.foto || raw.image] : []),
    videoUrl: raw.videoUrl,
    isKoperasi: raw.isKoperasi || false,
    rating: raw.rating || 5.0,
    sold: raw.sold || 0,
    status: raw.status || 'approved',
    aiAnalysis: raw.aiAnalysis || undefined,
    moderationReason: raw.moderationReason || undefined,
    moderatedAt: raw.moderatedAt || undefined
  };
}

// ==========================================
// 🔑 AUTH & OTP API
// ==========================================
export async function sendOtpApi(email: string) {
  return request<{ success: boolean; message: string; isUin?: boolean }>('/api/otp/send', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export async function verifyOtpApi(email: string, otp: string) {
  return request<{ success: boolean; message: string }>('/api/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ email, otp })
  });
}

export async function loginApi(email: string, password: string) {
  return request<{ success: boolean; message: string; user: SessionUser }>('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

export async function registerApi(payload: {
  email: string;
  password: string;
  nama: string;
  nim?: string;
  roles?: string[];
  role?: string;
  avatar?: string;
}) {
  return request<{ success: boolean; message: string; user: SessionUser }>('/api/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// ==========================================
// 🛡️ AI PRODUCT SAFETY & QUALITY ANALYZER
// ==========================================

export function evaluateProductSuitabilityLocally(payload: {
  name: string;
  description?: string;
  price?: number;
  category?: string;
  campus?: string;
  sellerName?: string;
}): AiProductAnalysis {
  const name = (payload.name || '').toLowerCase();
  const desc = (payload.description || '').toLowerCase();
  const price = Number(payload.price || 0);
  const category = (payload.category || 'makanan').toLowerCase();

  const PROHIBITED_KEYWORDS = [
    'narkoba', 'ganja', 'sabu', 'miras', 'alkohol', 'senjata', 'pistol',
    'peluru', 'judi', 'slot', 'bokep', 'porn', 'seks', 'joki skripsi',
    'joki tugas', 'surat palsu', 'rokok elektrik', 'vape illegal'
  ];
  const CAMPUS_FAVORITES = [
    'kopi', 'teh', 'ganci', 'keychain', 'tas', 'snack', 'roti', 'buku',
    'alat tulis', 'pulpen', 'binder', 'totebag', 'jaket', 'hijab', 'mukena',
    'pipe cleaner', 'blind bag', 'donat', 'brownies'
  ];

  let score = 93;
  const reasons: string[] = [];
  const flags: string[] = [];
  let safety: 'PASS' | 'FLAGGED' | 'FAIL' = 'PASS';
  let campusEthics: 'PASS' | 'FLAGGED' | 'FAIL' = 'PASS';
  let fairPricing: 'PASS' | 'FLAGGED' | 'FAIL' = 'PASS';
  let mediaQuality: 'PASS' | 'FLAGGED' | 'FAIL' = 'PASS';

  // 1. Prohibited items
  const foundProhibited = PROHIBITED_KEYWORDS.find(kw => name.includes(kw) || desc.includes(kw));
  if (foundProhibited) {
    score = 15;
    safety = 'FAIL';
    campusEthics = 'FAIL';
    flags.push(`Terdeteksi indikasi kata terlarang/tidak diizinkan ("${foundProhibited}")`);
  } else {
    reasons.push('Lolos uji keamanan: Bebas dari obat terlarang, senjata, dan konten berbahaya');
  }

  // 2. Campus ethics
  if (name.includes('babi') || desc.includes('non halal') || name.includes('haram')) {
    score = Math.min(score, 25);
    campusEthics = 'FAIL';
    flags.push('Tidak memenuhi standar kehalalan dan norma etika kampus UIN Antasari');
  } else {
    reasons.push('Sesuai dengan etika norma syariah & kesopanan kampus UIN Antasari');
  }

  // 3. Pricing
  if (price > 0 && price < 500) {
    score -= 20;
    fairPricing = 'FLAGGED';
    flags.push('Harga terlampau rendah (< Rp 500), mohon periksa apakah nominal sudah benar');
  } else if (category === 'makanan' && price > 250000) {
    score -= 15;
    fairPricing = 'FLAGGED';
    flags.push('Harga makanan relatif tinggi untuk standar konsumsi harian mahasiswa');
  } else if (price >= 1000 && price <= 200000) {
    reasons.push(`Harga Rp ${price.toLocaleString('id-ID')} sangat wajar & terjangkau untuk mahasiswa`);
  }

  // 4. Clarity & detail
  if (name.length < 4) {
    score -= 15;
    mediaQuality = 'FLAGGED';
    flags.push('Nama produk terlalu singkat');
  }
  if (!desc || desc.length < 10) {
    score -= 10;
    mediaQuality = 'FLAGGED';
    flags.push('Deskripsi produk sebaiknya diperlengkap untuk meyakinkan pembeli');
  } else {
    reasons.push('Deskripsi dan informasi produk cukup detail dan informatif');
  }

  if (CAMPUS_FAVORITES.some(kw => name.includes(kw) || desc.includes(kw))) {
    score = Math.min(99, score + 4);
    reasons.push('Produk sangat relevan dan digemari oleh sivitas akademika UIN Antasari');
  }

  score = Math.max(10, Math.min(99, score));
  const isEligible = score >= 70 && safety === 'PASS' && campusEthics === 'PASS';
  const recommendation: 'approve' | 'flagged' | 'reject' = score >= 85 ? 'approve' : (score >= 60 ? 'flagged' : 'reject');

  let verdict = 'Sangat Layak Dijual & Memenuhi Standar Kampus Antasari';
  if (recommendation === 'reject') {
    verdict = 'Tidak Layak Dijual (Melanggar Aturan / Keamanan)';
  } else if (recommendation === 'flagged') {
    verdict = 'Perlu Tinjauan Khusus oleh Super Admin';
  }

  return {
    score,
    isEligible,
    recommendation,
    verdict,
    reasons,
    flags,
    checks: { safety, campusEthics, fairPricing, mediaQuality },
    analyzedAt: new Date().toISOString(),
    model: 'Antasari-AI-Safety-Engine v2.4'
  };
}

export async function analyzeProductAiApi(payload: {
  name: string;
  description?: string;
  price?: number;
  category?: string;
  campus?: string;
  sellerName?: string;
}): Promise<{ success: boolean; analysis: AiProductAnalysis }> {
  try {
    const res = await request<{ success: boolean; analysis: AiProductAnalysis }>('/api/ai/analyze-product', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res && res.success && res.analysis) {
      return res;
    }
  } catch (err) {
    console.warn("AI Product Analysis backend offline, using local AI engine:", err);
  }

  return {
    success: true,
    analysis: evaluateProductSuitabilityLocally(payload)
  };
}

// ==========================================
// 📦 PRODUCTS API & MODERATION
// ==========================================
export async function deductStockApi(items: any[]) {
  try {
    return await request<{ success: boolean; message: string }>('/api/products/deduct-stock', {
      method: 'POST',
      body: JSON.stringify({ items })
    });
  } catch (e) {
    console.warn("Backend deductStock offline:", e);
    return { success: false, message: 'Offline mode' };
  }
}

export async function getProductsApi(sellerId?: string, status?: string): Promise<{ success: boolean; products: Product[] }> {
  let customProducts: Product[] = [];
  try {
    customProducts = JSON.parse(localStorage.getItem('am_custom_products') || '[]');
  } catch (e) {
    customProducts = [];
  }

  let pendingProducts: Product[] = [];
  try {
    pendingProducts = JSON.parse(localStorage.getItem('am_pending_moderations') || '[]');
  } catch (e) {
    pendingProducts = [];
  }

  const stockOverrides: Record<string, number> = JSON.parse(localStorage.getItem('am_stock_overrides') || '{}');

  try {
    const params = new URLSearchParams();
    if (sellerId) params.append('sellerId', sellerId);
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';

    const data = await request<{ success: boolean; products: any[] }>(`/api/products${query}`, {
      method: 'GET'
    });

    if (data.success && Array.isArray(data.products) && data.products.length > 0) {
      const serverProducts = data.products.map(mapBackendProductToFrontend);
      const allLocal = [...pendingProducts, ...customProducts.filter(cp => !pendingProducts.some(p => p.id === cp.id))];
      const combined = [...allLocal, ...serverProducts.filter(sp => !allLocal.some(cp => cp.id === sp.id))];
      
      const mapped = combined.map(p => ({
        ...p,
        stock: stockOverrides[p.id] !== undefined ? stockOverrides[p.id] : (p.stock !== undefined ? p.stock : 50)
      }));

      if (sellerId) {
        const filtered = mapped.filter(p => p.sellerId === sellerId || p.sellerName === sellerId);
        if (status && status !== 'all') {
          return { success: true, products: filtered.filter(p => (p.status || 'approved') === status) };
        }
        return { success: true, products: filtered };
      }

      if (status && status !== 'all') {
        return { success: true, products: mapped.filter(p => (p.status || 'approved') === status) };
      }

      return {
        success: true,
        products: mapped
      };
    }
  } catch (err) {
    console.warn("Backend getProducts offline, using local cache:", err);
  }

  // Fallback with base PRODUCTS from data.ts
  const baseApproved = PRODUCTS.map(p => ({
    ...p,
    status: (p.status || 'approved') as ProductModerationStatus
  }));

  const allLocal = [...pendingProducts, ...customProducts.filter(cp => !pendingProducts.some(p => p.id === cp.id))];
  const combined = [...allLocal, ...baseApproved.filter(bp => !allLocal.some(al => al.id === bp.id))];
  const mapped = combined.map(p => ({
    ...p,
    stock: stockOverrides[p.id] !== undefined ? stockOverrides[p.id] : (p.stock !== undefined ? p.stock : 50)
  }));

  if (sellerId) {
    const filtered = mapped.filter(p => p.sellerId === sellerId || p.sellerName === sellerId);
    if (status && status !== 'all') {
      return { success: true, products: filtered.filter(p => (p.status || 'approved') === status) };
    }
    return { success: true, products: filtered };
  }

  if (status && status !== 'all') {
    return { success: true, products: mapped.filter(p => (p.status || 'approved') === status) };
  }

  return {
    success: true,
    products: mapped
  };
}

export async function createProductApi(payload: {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image?: string;
  images?: string[];
  videoUrl?: string;
  campus?: string;
  sellerId?: string;
  sellerName?: string;
  slotNumber?: number;
  status?: ProductModerationStatus;
  aiAnalysis?: AiProductAnalysis;
}) {
  const imagesArr = payload.images && payload.images.length > 0
    ? payload.images
    : (payload.image ? [payload.image] : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&auto=format']);

  // Analisis AI Otomatis jika belum ada
  const aiAnalysis = payload.aiAnalysis || evaluateProductSuitabilityLocally({
    name: payload.name,
    description: payload.description,
    price: payload.price,
    category: payload.category,
    campus: payload.campus,
    sellerName: payload.sellerName
  });

  const localProduct: Product = {
    id: `prod_${Date.now()}`,
    name: payload.name,
    description: payload.description,
    price: payload.price,
    stock: payload.stock,
    category: payload.category as any,
    image: payload.image || imagesArr[0],
    images: imagesArr,
    videoUrl: payload.videoUrl,
    campus: (payload.campus || 'banjarmasin') as any,
    sellerId: payload.sellerId || 'seller_1',
    sellerName: payload.sellerName || 'Penjual Antasari',
    isKoperasi: false,
    rating: 5.0,
    sold: 0,
    slotNumber: payload.slotNumber,
    status: payload.status || 'pending', // ⏳ DEFAULT: Tertahan / Menunggu Seleksi
    aiAnalysis: aiAnalysis,
    moderationReason: undefined,
    moderatedAt: undefined
  };

  try {
    const existing: Product[] = JSON.parse(localStorage.getItem('am_custom_products') || '[]');
    existing.unshift(localProduct);
    localStorage.setItem('am_custom_products', JSON.stringify(existing));

    // Sinkronkan ke antrean moderasi Super Admin
    const pendingQueue: Product[] = JSON.parse(localStorage.getItem('am_pending_moderations') || '[]');
    pendingQueue.unshift(localProduct);
    localStorage.setItem('am_pending_moderations', JSON.stringify(pendingQueue));

    // 🔔 Kirim notifikasi instan ke Super Admin & seluruh sistem
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('am_trigger_notification', {
        detail: {
          id: `mod_req_${Date.now()}`,
          senderId: 'system_ai',
          senderName: '🛡️ AI Product Moderation',
          senderRole: 'super_admin',
          senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AntasariAI',
          text: `🛡️ Penjual "${localProduct.sellerName}" mengajukan produk baru "${localProduct.name}" (Skor AI: ${aiAnalysis.score}%). Perlu kurasi Super Admin!`,
          time: 'Baru saja'
        }
      }));
      window.dispatchEvent(new CustomEvent('am_product_submitted', { detail: localProduct }));
    }
  } catch (e) {
    console.error("Local storage error:", e);
  }

  try {
    const data = await request<{ success: boolean; message: string; product: any }>('/api/products', {
      method: 'POST',
      body: JSON.stringify({
        nama_produk: payload.name,
        deskripsi: payload.description,
        harga: payload.price,
        stok: payload.stock,
        kategori: payload.category,
        foto: payload.image || imagesArr[0],
        images: imagesArr,
        videoUrl: payload.videoUrl,
        kampus: payload.campus,
        sellerId: payload.sellerId,
        sellerName: payload.sellerName,
        slotNumber: payload.slotNumber,
        status: localProduct.status,
        aiScore: aiAnalysis.score,
        aiAnalysis: aiAnalysis
      })
    });
    if (data && data.success) return data;
  } catch (err) {
    console.warn("Backend sync offline, product saved locally:", err);
  }

  return {
    success: true,
    message: "Produk berhasil diajukan dan sedang dalam antrean kurasi AI & Super Admin! 🎉",
    product: localProduct
  };
}

export async function moderateProductApi(
  id: string | number,
  status: 'approved' | 'rejected',
  reason?: string,
  moderatorEmail?: string
): Promise<{ success: boolean; message: string; product?: Product }> {
  const nowStr = new Date().toISOString();
  let targetProd: Product | undefined;

  try {
    const existing: Product[] = JSON.parse(localStorage.getItem('am_custom_products') || '[]');
    const updated = existing.map(p => {
      if (p.id === id) {
        targetProd = {
          ...p,
          status,
          moderationReason: reason || (status === 'approved' ? 'Disetujui dan lolos kurasi Super Admin' : 'Tidak memenuhi kriteria produk'),
          moderatedAt: nowStr
        };
        return targetProd;
      }
      return p;
    });
    localStorage.setItem('am_custom_products', JSON.stringify(updated));

    // Update antrean moderasi
    const pendingQueue: Product[] = JSON.parse(localStorage.getItem('am_pending_moderations') || '[]');
    const updatedPending = pendingQueue.map(p => p.id === id ? { ...p, status, moderationReason: reason, moderatedAt: nowStr } : p);
    localStorage.setItem('am_pending_moderations', JSON.stringify(updatedPending));

    // Dispatch global event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('am_product_moderated', { detail: { id, status, reason } }));
      
      if (targetProd) {
        window.dispatchEvent(new CustomEvent('am_trigger_notification', {
          detail: {
            id: `mod_result_${Date.now()}`,
            senderId: 'super_admin',
            senderName: 'Super Admin Campus Mart',
            senderRole: 'super_admin',
            senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=SuperAdmin',
            text: status === 'approved' 
              ? `🎉 Selamat! Produk "${targetProd.name}" telah disetujui Super Admin & kini aktif di etalase publik!`
              : `⚠️ Produk "${targetProd.name}" ditolak oleh Super Admin. Alasan: ${reason || 'Belum memenuhi kriteria'}.`,
            time: 'Baru saja'
          }
        }));
      }
    }
  } catch (e) {
    console.error("Local storage moderation update error:", e);
  }

  try {
    const res = await request<{ success: boolean; message: string; product: any }>(`/api/products/${id}/moderate`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason, moderatorEmail })
    });
    if (res && res.success) return res;
  } catch (err) {
    console.warn("Backend moderateProduct offline, used local state:", err);
  }

  return {
    success: true,
    message: `Produk berhasil ${status === 'approved' ? 'disetujui dan dipublikasikan' : 'ditolak'}!`,
    product: targetProd
  };
}

export async function updateProductApi(id: string | number, payload: any) {
  try {
    const existing: Product[] = JSON.parse(localStorage.getItem('am_custom_products') || '[]');
    const updated = existing.map(p => p.id === id ? { ...p, ...payload } : p);
    localStorage.setItem('am_custom_products', JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }

  return request<{ success: boolean; message: string; product: any }>(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function deleteProductApi(id: string | number) {
  try {
    const existing: Product[] = JSON.parse(localStorage.getItem('am_custom_products') || '[]');
    const updated = existing.filter(p => p.id !== id);
    localStorage.setItem('am_custom_products', JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }

  return request<{ success: boolean; message: string }>(`/api/products/${id}`, {
    method: 'DELETE'
  });
}

// ==========================================
// 💬 CHAT & CONTACTS API
// ==========================================
export interface BackendChatMessage {
  id: number;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderAvatar?: string;
  receiverId: string;
  receiverName: string;
  receiverRole: string;
  receiverAvatar?: string;
  text: string;
  time: string;
  createdAt?: string;
  mediaType?: 'text' | 'image' | 'audio' | 'location';
  mediaUrl?: string;
  audioDuration?: number;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  isRead?: boolean;
  reactions?: Record<string, number>;
}

import { fetchCloudChats, sendCloudChat, markCloudChatAsRead, getCloudContacts } from './cloudChatSync';

export async function getChatsApi(identifier: string) {
  try {
    const cloudRes = await fetchCloudChats(identifier);
    if (cloudRes && cloudRes.success) {
      return cloudRes;
    }
  } catch (_e) {}

  try {
    return await request<{ success: boolean; chats: BackendChatMessage[] }>(`/api/chats/${encodeURIComponent(identifier)}`, {
      method: 'GET'
    });
  } catch (_e) {
    return fetchCloudChats(identifier);
  }
}

export async function sendChatApi(payload: {
  id?: number | string;
  fromId: string;
  fromName: string;
  fromRole?: string;
  fromAvatar?: string;
  toId: string;
  toName: string;
  toRole?: string;
  toAvatar?: string;
  text: string;
  mediaType?: 'text' | 'image' | 'audio' | 'location';
  mediaUrl?: string;
  audioDuration?: number;
}) {
  // Kirim ke backend jika online (background)
  request<{ success: boolean; message: string; chat: BackendChatMessage }>('/api/chats', {
    method: 'POST',
    body: JSON.stringify(payload)
  }).catch(() => {});

  // Simpan & pancarkan ke Cloud Sync Engine (Sinkronisasi Instan Laptop & HP Mobile)
  return sendCloudChat(payload);
}

export async function deleteChatApi(id: number | string) {
  return request<{ success: boolean; message: string }>(`/api/chats/${id}`, {
    method: 'DELETE'
  });
}

export async function markChatAsReadApi(identifier: string, roomId?: string) {
  request<{ success: boolean; message: string; modifiedCount?: number }>('/api/chats/read', {
    method: 'PUT',
    body: JSON.stringify({ identifier, roomId })
  }).catch(() => {});

  markCloudChatAsRead(identifier, roomId);
  return { success: true, message: 'Tandai sudah dibaca' };
}

export async function getContactsApi(userEmail: string) {
  try {
    const res = await request<{ success: boolean; contacts: Array<{ id: number; nama: string; email: string; role: string; avatar?: string; isPro?: boolean }> }>(`/api/users/contacts/${encodeURIComponent(userEmail)}`, {
      method: 'GET'
    });
    if (res && res.success && Array.isArray(res.contacts) && res.contacts.length > 0) {
      return res;
    }
  } catch (_e) {}

  return getCloudContacts(userEmail);
}

// ==========================================
// 💳 CHECKOUT, VENDING, & MIDTRANS API
// ==========================================
export interface CheckoutPayload {
  orderId?: string;
  grossAmount: number;
  customerDetails?: {
    name?: string;
    email?: string;
  };
  items?: any[];
  deliveryMethod?: string;
}

export interface CheckoutResponse {
  success: boolean;
  token?: string;
  redirect_url?: string;
  vendingToken?: string;
  slotNumber?: number;
  message?: string;
}

export async function checkoutApi(payload: CheckoutPayload): Promise<CheckoutResponse> {
  return request<CheckoutResponse>('/api/checkout', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function claimVendingApi(token: string) {
  return request<{
    success: boolean;
    message: string;
    dispense?: { orderId: string; slotNumber: number; buyerName: string };
  }>('/api/vending/claim', {
    method: 'POST',
    body: JSON.stringify({ token })
  });
}

// ==========================================
// 📋 ACTIVITY LOGS API
// ==========================================
export async function getActivityLogsApi() {
  return request<{ success: boolean; logs: Array<{ id: number; email: string; name: string; role: string; action: string; ipAddress: string; createdAt: string }> }>('/api/activity-logs', {
    method: 'GET'
  });
}

// ==========================================
// ☁️ SMART MEDIA COMPRESSION & VALIDATION (<= 200KB FOTO & <= 5MB VIDEO)
// ==========================================

export interface ProcessedImageResult {
  dataUrl: string;
  sizeBytes: number;
  sizeKb: number;
  sizeFormatted: string;
  isValid: boolean;
}

/**
 * 🖼️ Kompresor Foto Cerdas Otomatis: Menjamin ukuran berkas <= 200 KB
 * Melakukan penyesuaian dimensi dan kualitas kompresi bertahap (lossless/adaptive JPEG)
 */
export async function compressImageToTargetSize(
  file: File,
  maxSizeBytes: number = 200 * 1024
): Promise<ProcessedImageResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let currentQuality = 0.85;
        let maxDimension = 1200;

        // Hitung rasio awal
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const raw = (e.target?.result as string) || '';
          resolve({
            dataUrl: raw,
            sizeBytes: file.size,
            sizeKb: Math.round(file.size / 1024),
            sizeFormatted: `${Math.round(file.size / 1024)} KB`,
            isValid: file.size <= maxSizeBytes
          });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Loop kompresi adaptif hingga ukuran <= maxSizeBytes (200 KB)
        let dataUrl = canvas.toDataURL('image/jpeg', currentQuality);
        let approxBytes = Math.round((dataUrl.length * 3) / 4);

        while (approxBytes > maxSizeBytes && currentQuality > 0.35) {
          currentQuality -= 0.12;
          dataUrl = canvas.toDataURL('image/jpeg', currentQuality);
          approxBytes = Math.round((dataUrl.length * 3) / 4);
        }

        // Jika masih sedikit lebih besar dari 200 KB, resize canvas ke 800px
        if (approxBytes > maxSizeBytes) {
          maxDimension = 720;
          let w2 = img.width;
          let h2 = img.height;
          if (w2 > h2 && w2 > maxDimension) {
            h2 = Math.round((h2 * maxDimension) / w2);
            w2 = maxDimension;
          } else if (h2 > maxDimension) {
            w2 = Math.round((w2 * maxDimension) / h2);
            h2 = maxDimension;
          }
          canvas.width = w2;
          canvas.height = h2;
          ctx.drawImage(img, 0, 0, w2, h2);
          dataUrl = canvas.toDataURL('image/jpeg', 0.65);
          approxBytes = Math.round((dataUrl.length * 3) / 4);
        }

        const sizeKb = Math.round(approxBytes / 1024);
        resolve({
          dataUrl,
          sizeBytes: approxBytes,
          sizeKb,
          sizeFormatted: `${sizeKb} KB (Maks 200 KB)`,
          isValid: approxBytes <= maxSizeBytes
        });
      };
      img.onerror = () => {
        resolve({
          dataUrl: (e.target?.result as string) || '',
          sizeBytes: file.size,
          sizeKb: Math.round(file.size / 1024),
          sizeFormatted: `${Math.round(file.size / 1024)} KB`,
          isValid: file.size <= maxSizeBytes
        });
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      resolve({
        dataUrl: '',
        sizeBytes: 0,
        sizeKb: 0,
        sizeFormatted: '0 KB',
        isValid: false
      });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * 🎥 Validasi & Pemrosesan Video Produk: Batas Maksimal 5 MB
 */
export interface ProcessedVideoResult {
  valid: boolean;
  videoUrl?: string;
  sizeBytes: number;
  sizeMb: string;
  error?: string;
}

export async function validateAndProcessVideo(
  file: File,
  maxSizeBytes: number = 5 * 1024 * 1024
): Promise<ProcessedVideoResult> {
  const sizeMb = (file.size / (1024 * 1024)).toFixed(2);

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      sizeBytes: file.size,
      sizeMb: `${sizeMb} MB`,
      error: `⚠️ Ukuran video terlalu besar (${sizeMb} MB)! Maksimal ukuran video produk adalah 5.00 MB.`
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        valid: true,
        videoUrl: reader.result as string,
        sizeBytes: file.size,
        sizeMb: `${sizeMb} MB`
      });
    };
    reader.onerror = () => {
      resolve({
        valid: false,
        sizeBytes: file.size,
        sizeMb: `${sizeMb} MB`,
        error: 'Gagal membaca berkas video.'
      });
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadImageApi(file: File): Promise<{ success: boolean; message: string; imageUrl?: string }> {
  try {
    const processed = await compressImageToTargetSize(file, 200 * 1024);

    try {
      const formData = new FormData();
      const resBlob = await (await fetch(processed.dataUrl)).blob();
      formData.append('foto', resBlob, file.name.replace(/\.[^/.]+$/, "") + ".jpg");

      const targetUrl = API_BASE_URL ? `${API_BASE_URL}/api/upload` : '/api/upload';
      const response = await fetch(targetUrl, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.success && data.imageUrl) {
          return data;
        }
      }
    } catch (_serverErr) {
      console.warn("Upload ke server 413/offline, menggunakan hasil kompresi data:", _serverErr);
    }

    if (processed.dataUrl) {
      return {
        success: true,
        message: `Foto produk berhasil dikompresi (${processed.sizeFormatted})! 📸`,
        imageUrl: processed.dataUrl
      };
    }
  } catch (err: any) {
    console.error("Gagal memproses foto:", err);
  }

  return {
    success: false,
    message: 'Gagal memproses file foto produk.'
  };
}

// ==========================================
// 🤖 MYAMMIY VOICE AI (DEEPSEEK AI INTEGRATION)
// ==========================================
export async function askMyammiyAIApi(message: string, history?: any[]): Promise<{ success: boolean; reply: string }> {
  try {
    return await request<{ success: boolean; reply: string }>('/api/ai/myammiy-chat', {
      method: 'POST',
      body: JSON.stringify({ message, history })
    });
  } catch (err: any) {
    console.warn("DeepSeek API request fallback to local knowledge base:", err);
    return { success: false, reply: '' };
  }
}

// 🤖 SMART AI SELLER AGENT (DEEPSEEK / GEMINI AI SELLER COPILOT)
export async function askSellerAIApi(payload: {
  sellerId?: string;
  sellerName?: string;
  sellerRole?: string;
  buyerName?: string;
  message?: string;
  userMessage?: string;
  productName?: string;
  campus?: string;
  history?: any[];
}): Promise<{ success: boolean; reply: string }> {
  const query = (payload.message || payload.userMessage || '').trim().toLowerCase();
  const bName = payload.buyerName || 'Kakak';
  const sName = payload.sellerName || 'Penjual Antasari';

  try {
    const res = await request<{ success: boolean; reply: string }>('/api/ai/seller-chat', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res && res.success && res.reply && res.reply.trim()) {
      return res;
    }
  } catch (_err) {}

  // 🧠 Smart Knowledge Base Generator (Contextual & Instant)
  let fallbackReply = '';
  if (query.includes('bahan') || query.includes('kawat') || query.includes('rajut') || query.includes('pipe cleaner') || query.includes('material')) {
    fallbackReply = `Hai Kak ${bName}! 🌸 Untuk gantungan kunci di ${sName} kami buat 100% HANDMADE DARI PIPE CLEANER (KAWAT BULU CHENILLE) premium yaa, bukan rajut! Bahannya lembut, padat, dan dibentuk sangat rapi! 🥰✨`;
  } else if (query.includes('stok') || query.includes('ready') || query.includes('ada') || query.includes('masih')) {
    fallbackReply = `Stoknya masih ready banget Kak ${bName}! Siap dipesan dan bisa langsung diambil di Vending Machine kampus atau COD yaa! 🌸🥰`;
  } else if (query.includes('harga') || query.includes('diskon') || query.includes('berapa') || query.includes('biaya')) {
    fallbackReply = `Harganya spesial cuma Rp 35.000 (lagi promo dari Rp 40.000 lho!). Sudah dapat blind bag mystery aesthetic dan ganci unik siap pakai! 🎁✨`;
  } else if (query.includes('cod') || query.includes('antar') || query.includes('lokasi') || query.includes('ketemu') || query.includes('kampus')) {
    fallbackReply = `Bisa banget COD di Kampus 1 & Kampus 2 UIN Antasari Banjarmasin kak! Mau ketemuan di fakultas / lobi mana hari ini? 🛵✨`;
  } else if (query.includes('vending') || query.includes('mesin') || query.includes('posisi') || query.includes('ambil')) {
    fallbackReply = `Posisi Vending Machine Campus Mart ada di Lobi Gedung Rektorat & Gedung Perkuliahan Terpadu yaa kak! 🎟️✨`;
  } else if (query.includes('bayar') || query.includes('transfer') || query.includes('qris') || query.includes('rekening') || query.includes('tf')) {
    fallbackReply = `Bisa bayar langsung via QRIS, E-Wallet (GoPay/ShopeePay/Dana/OVO), atau Transfer Bank melalui sistem checkout aman Campus Mart yaa kak! 💳✨`;
  } else if (query.includes('halo') || query.includes('hai') || query.includes('pagi') || query.includes('siang') || query.includes('malam') || query.includes('kak')) {
    fallbackReply = `Halo Kak ${bName}! 🌸 Selamat datang di ${sName}. Produk kami siap dipesan. Ada yang mau ditanyakan seputar stok atau pemesanan hari ini? 😊✨`;
  } else {
    fallbackReply = `Halo Kak ${bName}! Terima kasih sudah menghubungi ${sName}. Pesan Kakak sudah kami terima dan katalog kami siap dipesan yaa! Mau pesan atau tanya detail produk apa? 😊🛍️`;
  }

  return { success: true, reply: fallbackReply };
}

// ✨ AI PRODUCT DESCRIPTION GENERATOR
export async function generateProductDescriptionApi(payload: {
  name: string;
  category?: string;
  price?: number | string;
  sellerName?: string;
}): Promise<{ success: boolean; description: string }> {
  try {
    const res = await request<{ success: boolean; description: string }>('/api/ai/generate-description', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res && res.success && res.description) {
      return res;
    }
  } catch (err: any) {
    console.warn("AI Description API fallback:", err);
  }

  const fallback = `${payload.name} berkualitas premium siap dipesan di Campus Mart! Dibuat dengan bahan terbaik, higienis, dan pas untuk kebutuhan mahasiswa kampus. Tersedia stok ready! 🌸✨`;
  return { success: true, description: fallback };
}

// ==========================================
// 🎟️ VOUCHER & PROMO PENJUAL (SELLER COUPON SYSTEM)
// ==========================================
import type { SellerCoupon } from '../types';

const INITIAL_MOCK_VOUCHERS: SellerCoupon[] = [
  {
    id: 'v_myammiy_10',
    sellerId: 'seller_1',
    sellerName: 'Myammiy Craft',
    code: 'MYAMMIY10',
    name: 'Diskon Spesial Myammiy 10%',
    discountType: 'percentage',
    value: 10,
    minSpend: 20000,
    maxDiscount: 10000,
    quota: 100,
    usedCount: 14,
    startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    badge: '🎀 Myammiy',
    description: 'Diskon 10% untuk seluruh produk kerajinan ganci & suvenir',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'v_myammiy_5k',
    sellerId: 'seller_1',
    sellerName: 'Myammiy Craft',
    code: 'GANCIHEMAT',
    name: 'Potongan Langsung Rp 5.000',
    discountType: 'fixed',
    value: 5000,
    minSpend: 25000,
    quota: 50,
    usedCount: 8,
    startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    badge: '🔥 Hot Promo',
    description: 'Potongan Rp 5.000 untuk pembelian minimal Rp 25.000',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'v_kopma_ongkir',
    sellerId: 's1',
    sellerName: 'Koperasi UIN Antasari',
    code: 'KOPMAFREE',
    name: 'Free Ongkir Koperasi Kampus',
    discountType: 'shipping',
    value: 5000,
    minSpend: 15000,
    quota: 200,
    usedCount: 42,
    startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    badge: '🛵 Free Ongkir',
    description: 'Bebas ongkir kurir kampus untuk produk makanan & ATK Koperasi',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

function getStoredVouchers(): SellerCoupon[] {
  if (typeof window === 'undefined') return INITIAL_MOCK_VOUCHERS;
  const saved = localStorage.getItem('am_seller_vouchers');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  localStorage.setItem('am_seller_vouchers', JSON.stringify(INITIAL_MOCK_VOUCHERS));
  return INITIAL_MOCK_VOUCHERS;
}

function saveStoredVouchers(vouchers: SellerCoupon[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('am_seller_vouchers', JSON.stringify(vouchers));
  }
}

export async function getVouchersApi(sellerId?: string, activeOnly = false): Promise<{ success: boolean; vouchers: SellerCoupon[] }> {
  try {
    const params = new URLSearchParams();
    if (sellerId) params.append('sellerId', sellerId);
    if (activeOnly) params.append('activeOnly', 'true');
    const res = await request<{ success: boolean; vouchers: SellerCoupon[] }>(`/api/vouchers?${params.toString()}`);
    if (res && res.success && Array.isArray(res.vouchers)) {
      saveStoredVouchers(res.vouchers);
      return res;
    }
  } catch (err) {
    console.warn("Voucher API fallback to local storage:", err);
  }

  let list = getStoredVouchers();
  if (sellerId) {
    list = list.filter(v => v.sellerId === sellerId);
  }
  if (activeOnly) {
    list = list.filter(v => v.isActive);
  }
  return { success: true, vouchers: list };
}

export async function createVoucherApi(voucherData: Partial<SellerCoupon>): Promise<{ success: boolean; message: string; voucher?: SellerCoupon }> {
  try {
    const res = await request<{ success: boolean; message: string; voucher: SellerCoupon }>('/api/vouchers', {
      method: 'POST',
      body: JSON.stringify(voucherData)
    });
    if (res && res.success && res.voucher) {
      const list = getStoredVouchers();
      saveStoredVouchers([res.voucher, ...list.filter(v => v.id !== res.voucher.id)]);
      return res;
    }
  } catch (err: any) {
    console.warn("Create Voucher API fallback to local storage:", err);
  }

  const list = getStoredVouchers();
  const cleanCode = (voucherData.code || `PROMO${Math.floor(Math.random() * 900 + 100)}`).trim().toUpperCase();
  
  if (list.some(v => v.code === cleanCode)) {
    return { success: false, message: `Kode voucher "${cleanCode}" sudah pernah dibuat. Gunakan kode lain.` };
  }

  const newVoucher: SellerCoupon = {
    id: `v_${Date.now()}`,
    sellerId: voucherData.sellerId || 'seller_1',
    sellerName: voucherData.sellerName || 'Penjual',
    code: cleanCode,
    name: voucherData.name || 'Promo Toko',
    discountType: voucherData.discountType || 'percentage',
    value: Number(voucherData.value) || 10,
    minSpend: Number(voucherData.minSpend) || 0,
    maxDiscount: Number(voucherData.maxDiscount) || 0,
    quota: Number(voucherData.quota) || 100,
    usedCount: 0,
    startDate: voucherData.startDate || new Date().toISOString().slice(0, 16),
    endDate: voucherData.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    applicableProductIds: voucherData.applicableProductIds || [],
    badge: voucherData.badge || '🎟️ Promo',
    description: voucherData.description || '',
    isActive: voucherData.isActive !== false,
    createdAt: new Date().toISOString()
  };

  saveStoredVouchers([newVoucher, ...list]);
  return { success: true, message: 'Kupon promo toko berhasil dibuat! 🎉', voucher: newVoucher };
}

export async function updateVoucherApi(id: string, voucherData: Partial<SellerCoupon>): Promise<{ success: boolean; message: string; voucher?: SellerCoupon }> {
  try {
    const res = await request<{ success: boolean; message: string; voucher: SellerCoupon }>(`/api/vouchers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(voucherData)
    });
    if (res && res.success && res.voucher) {
      const list = getStoredVouchers();
      saveStoredVouchers(list.map(v => v.id === id ? res.voucher : v));
      return res;
    }
  } catch (err: any) {
    console.warn("Update Voucher API fallback to local storage:", err);
  }

  const list = getStoredVouchers();
  const index = list.findIndex(v => v.id === id);
  if (index === -1) return { success: false, message: 'Kupon tidak ditemukan.' };

  const updated: SellerCoupon = { ...list[index], ...voucherData };
  list[index] = updated;
  saveStoredVouchers(list);
  return { success: true, message: 'Kupon promo berhasil diperbarui!', voucher: updated };
}

export async function deleteVoucherApi(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await request<{ success: boolean; message: string }>(`/api/vouchers/${id}`, {
      method: 'DELETE'
    });
    if (res && res.success) {
      const list = getStoredVouchers();
      saveStoredVouchers(list.filter(v => v.id !== id));
      return res;
    }
  } catch (err: any) {
    console.warn("Delete Voucher API fallback to local storage:", err);
  }

  const list = getStoredVouchers();
  saveStoredVouchers(list.filter(v => v.id !== id));
  return { success: true, message: 'Kupon berhasil dihapus.' };
}

export async function toggleVoucherApi(id: string): Promise<{ success: boolean; message: string; voucher?: SellerCoupon }> {
  try {
    const res = await request<{ success: boolean; message: string; voucher: SellerCoupon }>(`/api/vouchers/${id}/toggle`, {
      method: 'PATCH'
    });
    if (res && res.success && res.voucher) {
      const list = getStoredVouchers();
      saveStoredVouchers(list.map(v => v.id === id ? res.voucher : v));
      return res;
    }
  } catch (err: any) {
    console.warn("Toggle Voucher API fallback to local storage:", err);
  }

  const list = getStoredVouchers();
  const index = list.findIndex(v => v.id === id);
  if (index === -1) return { success: false, message: 'Kupon tidak ditemukan.' };

  list[index].isActive = !list[index].isActive;
  saveStoredVouchers(list);
  return {
    success: true,
    message: `Kupon ${list[index].isActive ? 'diaktifkan' : 'dinonaktifkan'}!`,
    voucher: list[index]
  };
}

export async function validateVoucherApi(
  code: string,
  items: any[],
  subtotal: number,
  deliveryFee = 5000
): Promise<{
  success: boolean;
  message: string;
  voucher?: SellerCoupon;
  discountAmount?: number;
  deliveryDiscount?: number;
  totalSavings?: number;
}> {
  try {
    const res = await request<{
      success: boolean;
      message: string;
      voucher: SellerCoupon;
      discountAmount: number;
      deliveryDiscount: number;
      totalSavings: number;
    }>('/api/vouchers/validate', {
      method: 'POST',
      body: JSON.stringify({ code, items, subtotal, deliveryFee })
    });
    if (res) return res;
  } catch (err) {
    console.warn("Validate Voucher API fallback to local client calculation:", err);
  }

  // Fallback Local Validation
  const cleanCode = String(code).trim().toUpperCase();
  const list = getStoredVouchers();
  const voucher = list.find(v => v.code === cleanCode);

  if (!voucher) {
    return { success: false, message: 'Kode kupon tidak valid atau salah ketik.' };
  }

  if (!voucher.isActive) {
    return { success: false, message: 'Kupon ini sedang tidak aktif.' };
  }

  // Cek Tanggal
  const now = new Date();
  if (voucher.startDate && now < new Date(voucher.startDate)) {
    return {
      success: false,
      message: `Promo ini baru akan dimulai pada ${new Date(voucher.startDate).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}.`
    };
  }
  if (voucher.endDate && now > new Date(voucher.endDate)) {
    return {
      success: false,
      message: `Kupon ini sudah kedaluwarsa pada ${new Date(voucher.endDate).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}.`
    };
  }

  // Cek Kuota
  if (voucher.quota > 0 && voucher.usedCount >= voucher.quota) {
    return { success: false, message: 'Kuota pemakaian kupon ini telah habis.' };
  }

  // Hitung Subtotal Produk Toko
  let eligibleSubtotal = subtotal;
  if (Array.isArray(items) && items.length > 0 && voucher.sellerId) {
    const sellerItems = items.filter(i => {
      const prod = i.product || i;
      return prod.sellerId === voucher.sellerId;
    });

    if (sellerItems.length === 0) {
      return {
        success: false,
        message: `Kupon "${voucher.code}" khusus untuk produk dari toko "${voucher.sellerName}".`
      };
    }

    eligibleSubtotal = sellerItems.reduce((acc, i) => {
      const prod = i.product || i;
      return acc + (Number(prod.price) * (Number(i.quantity) || 1));
    }, 0);
  }

  if (voucher.minSpend > 0 && eligibleSubtotal < voucher.minSpend) {
    return {
      success: false,
      message: `Minimal belanja Rp ${voucher.minSpend.toLocaleString('id-ID')} untuk kupon ini (Subtotal toko saat ini: Rp ${eligibleSubtotal.toLocaleString('id-ID')}).`
    };
  }

  let discountAmount = 0;
  let deliveryDiscount = 0;

  if (voucher.discountType === 'percentage') {
    discountAmount = Math.round((eligibleSubtotal * voucher.value) / 100);
    if (voucher.maxDiscount && voucher.maxDiscount > 0 && discountAmount > voucher.maxDiscount) {
      discountAmount = voucher.maxDiscount;
    }
  } else if (voucher.discountType === 'fixed') {
    discountAmount = Math.min(eligibleSubtotal, voucher.value);
  } else if (voucher.discountType === 'shipping') {
    deliveryDiscount = Math.min(deliveryFee, voucher.value);
  }

  return {
    success: true,
    message: `Kupon "${voucher.name}" berhasil diterapkan! 🎉`,
    voucher,
    discountAmount,
    deliveryDiscount,
    totalSavings: discountAmount + deliveryDiscount
  };
}

// 🐛 LAPOR BUG & DEBUG API
export async function submitBugReportApi(payload: {
  category: string;
  description: string;
  deviceInfo?: any;
  userInfo?: any;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  url?: string;
}) {
  return request<{ success: boolean; message: string; report?: any }>('/api/bugs', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getBugReportsApi() {
  return request<{ success: boolean; reports?: any[]; message?: string }>('/api/bugs');
}

// ==========================================
// 🎓 VERIFIKASI PENJUAL MAHASISWA AKTIF (KTM)
// ==========================================
export async function submitSellerKtmVerificationApi(formData: FormData) {
  return request<{
    success: boolean;
    message: string;
    warning?: string;
    verification?: any;
  }>('/api/seller/verify-ktm', {
    method: 'POST',
    body: formData
  });
}

export async function getSellerVerificationStatusApi(email: string) {
  return request<{
    success: boolean;
    verification?: any;
    message?: string;
  }>(`/api/seller/verification-status/${encodeURIComponent(email)}`);
}

export async function getAdminSellerVerificationsApi(status?: string) {
  const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
  return request<{
    success: boolean;
    verifications?: any[];
    message?: string;
  }>(`/api/admin/seller-verifications${query}`);
}

export async function updateSellerVerificationApi(
  email: string,
  payload: {
    verificationStatus?: string;
    isActiveStudent?: boolean;
    rejectionReason?: string;
    adminEmail?: string;
    adminName?: string;
  }
) {
  return request<{
    success: boolean;
    message: string;
    user?: any;
  }>(`/api/admin/seller-verifications/${encodeURIComponent(email)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function getAdminKtmPhotoUrl(filename: string): string {
  if (!filename) return '';
  return `${API_BASE_URL}/api/admin/ktm/${encodeURIComponent(filename)}`;
}

// ==========================================
// 🛍️ UNIVERSAL ORDERS / PESANAN PRIBADI API
// ==========================================
export async function getUserOrdersApi(email: string) {
  try {
    const res = await request<{ success: boolean; orders?: any[]; message?: string }>(
      `/api/orders/user/${encodeURIComponent(email)}`
    );
    if (res && res.success && res.orders) {
      return res;
    }
  } catch (_e) {}

  // Local storage fallback
  try {
    const saved = localStorage.getItem('am_my_orders');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { success: true, orders: Array.isArray(parsed) ? parsed : [] };
    }
  } catch (_err) {}

  return { success: true, orders: [] };
}



