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
export async function getProductsApi(sellerId?: string): Promise<{ success: boolean; products: Product[] }> {
  let customProducts: Product[] = [];
  try {
    customProducts = JSON.parse(localStorage.getItem('am_custom_products') || '[]');
  } catch (e) {
    customProducts = [];
  }

  try {
    const query = sellerId ? `?sellerId=${encodeURIComponent(sellerId)}` : '';
    const data = await request<{ success: boolean; products: any[] }>(`/api/products${query}`, {
      method: 'GET'
    });

    if (data.success && Array.isArray(data.products)) {
      const serverProducts = data.products.map(mapBackendProductToFrontend);
      const combined = [...customProducts, ...serverProducts.filter(sp => !customProducts.some(cp => cp.id === sp.id))];
      if (sellerId) {
        const filtered = combined.filter(p => p.sellerId === sellerId || p.sellerName === sellerId);
        return { success: true, products: filtered };
      }
      return {
        success: true,
        products: combined
      };
    }
  } catch (err) {
    console.warn("Backend getProducts offline, using local cache:", err);
  }

  if (customProducts.length > 0) {
    if (sellerId) {
      const filtered = customProducts.filter(p => p.sellerId === sellerId || p.sellerName === sellerId);
      return { success: true, products: filtered };
    }
    return {
      success: true,
      products: customProducts
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
  campus?: string;
  sellerId?: string;
  sellerName?: string;
  slotNumber?: number;
}) {
  const localProduct: Product = {
    id: `prod_${Date.now()}`,
    name: payload.name,
    description: payload.description,
    price: payload.price,
    stock: payload.stock,
    category: payload.category as any,
    image: payload.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&auto=format',
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
        foto: payload.image,
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
// ☁️ UPLOAD IMAGE API (Auto Compression + Cloudinary/Server + Resilient DataURI Fallback)
// ==========================================
function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        } else {
          resolve((e.target?.result as string) || '');
        }
      };
      img.onerror = () => {
        resolve((e.target?.result as string) || '');
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

export async function uploadImageApi(file: File): Promise<{ success: boolean; message: string; imageUrl?: string }> {
  try {
    const compressedDataUrl = await compressImage(file);

    try {
      const formData = new FormData();
      const resBlob = await (await fetch(compressedDataUrl)).blob();
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

    if (compressedDataUrl) {
      return {
        success: true,
        message: 'Foto produk berhasil diproses! 📸',
        imageUrl: compressedDataUrl
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
