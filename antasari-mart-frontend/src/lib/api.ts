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
  const query = sellerId ? `?sellerId=${encodeURIComponent(sellerId)}` : '';
  const data = await request<{ success: boolean; products: any[] }>(`/api/products${query}`, {
    method: 'GET'
  });

  if (data.success && Array.isArray(data.products)) {
    return {
      success: true,
      products: data.products.map(mapBackendProductToFrontend)
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
  return request<{ success: boolean; message: string; product: any }>('/api/products', {
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
}

export async function updateProductApi(id: string | number, payload: any) {
  return request<{ success: boolean; message: string; product: any }>(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function deleteProductApi(id: string | number) {
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
// ☁️ UPLOAD IMAGE API
// ==========================================
export async function uploadImageApi(file: File) {
  const formData = new FormData();
  formData.append('foto', file);

  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    body: formData
  });
  return response.json() as Promise<{ success: boolean; message: string; imageUrl?: string }>;
}
