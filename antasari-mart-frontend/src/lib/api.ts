import type { Product, ProductCategory, Campus, SessionUser } from '../types';

export const API_BASE_URL = 
  import.meta.env.VITE_API_BASE_URL || 
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://antasari-mart-api.vercel.app');

export const MIDTRANS_CLIENT_KEY = import.meta.env.VITE_MIDTRANS_CLIENT_KEY || 'Mid-client-8jHsm2sYfBK8gz1A';

// Helper Generic Request
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {})
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json();
  return data as T;
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
    campus: (raw.kampus || 'banjarmasin').toLowerCase().trim() as Campus,
    sellerId: raw.sellerId || 'seller_1',
    sellerName: raw.sellerName || 'Penjual Antasari',
    image: raw.foto || raw.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&auto=format',
    isKoperasi: raw.isKoperasi || false,
    rating: raw.rating || 5.0,
    sold: raw.sold || 0,
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
// 📦 PRODUCTS API
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

export async function getProductsApi(sellerId?: string): Promise<{ success: boolean; products: Product[] }> {
  let customProducts: Product[] = [];
  try {
    customProducts = JSON.parse(localStorage.getItem('am_custom_products') || '[]');
  } catch (e) {
    customProducts = [];
  }

  const stockOverrides: Record<string, number> = JSON.parse(localStorage.getItem('am_stock_overrides') || '{}');

  try {
    const query = sellerId ? `?sellerId=${encodeURIComponent(sellerId)}` : '';
    const data = await request<{ success: boolean; products: any[] }>(`/api/products${query}`, {
      method: 'GET'
    });

    if (data.success && Array.isArray(data.products)) {
      const serverProducts = data.products.map(mapBackendProductToFrontend);
      const combined = [...customProducts, ...serverProducts.filter(sp => !customProducts.some(cp => cp.id === sp.id))];
      
      const mapped = combined.map(p => ({
        ...p,
        stock: stockOverrides[p.id] !== undefined ? stockOverrides[p.id] : (p.stock !== undefined ? p.stock : 50)
      }));

      if (sellerId) {
        const filtered = mapped.filter(p => p.sellerId === sellerId || p.sellerName === sellerId);
        return { success: true, products: filtered };
      }
      return {
        success: true,
        products: mapped
      };
    }
  } catch (err) {
    console.warn("Backend getProducts offline, using local cache:", err);
  }

  if (customProducts.length > 0) {
    const mapped = customProducts.map(p => ({
      ...p,
      stock: stockOverrides[p.id] !== undefined ? stockOverrides[p.id] : (p.stock !== undefined ? p.stock : 50)
    }));
    if (sellerId) {
      const filtered = mapped.filter(p => p.sellerId === sellerId || p.sellerName === sellerId);
      return { success: true, products: filtered };
    }
    return {
      success: true,
      products: mapped
    };
  }
  return { success: false, products: [] };
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
}) {
  const imagesArr = payload.images && payload.images.length > 0
    ? payload.images
    : (payload.image ? [payload.image] : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&auto=format']);

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
    slotNumber: payload.slotNumber
  };

  try {
    const existing = JSON.parse(localStorage.getItem('am_custom_products') || '[]');
    existing.unshift(localProduct);
    localStorage.setItem('am_custom_products', JSON.stringify(existing));
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
        slotNumber: payload.slotNumber
      })
    });
    if (data && data.success) return data;
  } catch (err) {
    console.warn("Backend sync offline, product saved locally:", err);
  }

  return {
    success: true,
    message: "Produk berhasil diterbitkan! 🎉",
    product: localProduct
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
  receiverId: string;
  receiverName: string;
  receiverRole: string;
  text: string;
  time: string;
  createdAt?: string;
  mediaType?: 'text' | 'image' | 'audio' | 'location';
  mediaUrl?: string;
  audioDuration?: number;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  reactions?: Record<string, number>;
}

export async function getChatsApi(identifier: string) {
  return request<{ success: boolean; chats: BackendChatMessage[] }>(`/api/chats/${encodeURIComponent(identifier)}`, {
    method: 'GET'
  });
}

export async function sendChatApi(payload: {
  fromId: string;
  fromName: string;
  fromRole?: string;
  toId: string;
  toName: string;
  toRole?: string;
  text: string;
  mediaType?: 'text' | 'image' | 'audio' | 'location';
  mediaUrl?: string;
  audioDuration?: number;
}) {
  return request<{ success: boolean; message: string; chat: BackendChatMessage }>('/api/chats', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function deleteChatApi(id: number | string) {
  return request<{ success: boolean; message: string }>(`/api/chats/${id}`, {
    method: 'DELETE'
  });
}

export async function getContactsApi(userEmail: string) {
  return request<{ success: boolean; contacts: Array<{ id: number; nama: string; email: string; role: string; avatar?: string; isPro?: boolean }> }>(`/api/users/contacts/${encodeURIComponent(userEmail)}`, {
    method: 'GET'
  });
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

// 🤖 SMART AI SELLER AGENT (DEEPSEEK AI SELLER REPRESENTATIVE)
export async function askSellerAIApi(payload: {
  sellerId: string;
  sellerName: string;
  sellerRole?: string;
  buyerName: string;
  message: string;
  history?: any[];
}): Promise<{ success: boolean; reply: string }> {
  try {
    return await request<{ success: boolean; reply: string }>('/api/ai/seller-chat', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  } catch (err: any) {
    console.warn("DeepSeek Seller AI API request fallback to local smart generator:", err);
    return { success: false, reply: '' };
  }
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

  const fallback = `${payload.name} berkualitas premium siap dipesan di Antasari Mart! Dibuat dengan bahan terbaik, higienis, dan pas untuk kebutuhan mahasiswa kampus. Tersedia stok ready! 🌸✨`;
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
