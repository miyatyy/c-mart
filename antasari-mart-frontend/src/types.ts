export type Campus = 'banjarmasin' | 'banjarbaru'
export type UserRole = 'buyer' | 'seller' | 'driver' | 'admin' | 'admin_reguler' | 'admin_pro' | 'super_admin'
export type ThemeMode = 'aesthetic' | 'modern'
export type AppTab = 'home' | 'cart' | 'checkout' | 'tracker' | 'seller' | 'admin' | 'chat' | 'driver' | 'super_admin' | 'login_page' | 'vending_simulator'

export type DegreeLevel = 'S1' | 'S2' | 'S3';
export type VerificationStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';

export interface SellerVerificationData {
  nim?: string;
  fullNim?: string;
  fullName?: string;
  degreeLevel?: DegreeLevel;
  entryYear?: number;
  currentSemester?: number;
  ktmPhotoUrl?: string;
  hasKtmPhoto?: boolean;
  verificationStatus: VerificationStatus;
  isActiveStudent: boolean;
  rejectionReason?: string | null;
  submittedAt?: string;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
}

export interface SessionUser {
  id?: string
  nama?: string
  name?: string
  email: string
  role: UserRole
  roles?: UserRole[]
  avatar?: string
  isPro?: boolean
  nim?: string
  degreeLevel?: DegreeLevel
  entryYear?: number
  currentSemester?: number
  verificationStatus?: VerificationStatus
  isActiveStudent?: boolean
  rejectionReason?: string
  [key: string]: unknown
}
export * from './types/auth';

export type PaymentMethod = 'qris' | 'dana' | 'gopay' | 'cod' | 'seabank' | 'campus_wallet' | 'qris_sim' | 'cash' | 'midtrans'
export type DeliveryMethod = 'courier' | 'pickup' | 'delivery'
export type DeliveryType = 'pickup' | 'delivery'
export type PickupStatus = 'pending' | 'confirmed' | 'processing' | 'ready_for_pickup' | 'completed'
export type DeliveryStatus = 'pending' | 'confirmed' | 'processing' | 'searching_driver' | 'driver_assigned' | 'picked_up' | 'delivering' | 'completed'
export type TransactionPaymentStatus = 'unpaid' | 'paid'

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'ready_for_pickup'
  | 'searching_driver'
  | 'driver_assigned'
  | 'picked_up'
  | 'delivering'
  | 'delivered'
  | 'completed'
  | 'preparing'
  | 'driver_found'
  | 'on_the_way'
  | 'cancelled'
export type ProductCategory = 'makanan' | 'minuman' | 'pakaian' | 'atk' | 'kerajinan' | 'jasa' | 'buku' | 'aksesoris'

export interface User {
  id: string
  name: string
  email: string
  whatsapp: string
  role: UserRole
  gender: 'male' | 'female'
  campus: Campus
  avatar: string
  theme: ThemeMode
  isPro?: boolean
  proExpireDate?: string
}

export interface AiProductPolicyCheck {
  safety: 'PASS' | 'FLAGGED' | 'FAIL'
  campusEthics: 'PASS' | 'FLAGGED' | 'FAIL'
  fairPricing: 'PASS' | 'FLAGGED' | 'FAIL'
  mediaQuality: 'PASS' | 'FLAGGED' | 'FAIL'
}

export interface AiProductAnalysis {
  score: number // 0 - 100
  isEligible: boolean
  recommendation: 'approve' | 'flagged' | 'reject'
  verdict: string
  reasons: string[]
  flags: string[]
  checks: AiProductPolicyCheck
  analyzedAt: string
  model?: string
}

export type ProductModerationStatus = 'pending' | 'approved' | 'rejected' | 'active'

export interface Product {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  stock: number
  category: ProductCategory
  material?: string // Spesifikasi bahan produk (misal: Pipe Cleaner, Kain Drill, dll)
  campus: Campus
  sellerId: string
  sellerName: string
  image: string
  images?: string[] // Daftar multi-foto galeri (<= 200 KB per foto)
  videoUrl?: string // Video demo produk (<= 5 MB)
  isKoperasi: boolean
  slotNumber?: number
  rating: number
  sold: number
  status?: ProductModerationStatus
  moderationReason?: string
  moderatedAt?: string
  aiAnalysis?: AiProductAnalysis
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface Order {
  id: string
  orderId?: string
  sellerId?: string
  sellerName?: string
  buyerId?: string
  buyerName: string
  buyerEmail?: string
  buyerLocation: string
  items: CartItem[]
  total: number
  deliveryFee: number
  deliveryMethod?: DeliveryMethod | string
  deliveryType?: DeliveryType
  paymentMethod?: PaymentMethod | string
  paymentStatus?: TransactionPaymentStatus
  pickupStatus?: PickupStatus
  deliveryStatus?: DeliveryStatus
  status: OrderStatus | PickupStatus | DeliveryStatus | string
  driverId?: string | null
  driverName?: string | null
  driverPhone?: string
  driverAvatar?: string
  driverCoords?: { lat: number; lng: number } | null
  createdAt: string
  campus?: Campus
}

export interface Driver {
  id: string
  name: string
  whatsapp: string
  avatar: string
  campus: Campus
  rating: number
  totalDeliveries: number
  isOnline: boolean
  currentLat: number
  currentLng: number
}

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  content: string
  timestamp: string
  status: 'sent' | 'delivered' | 'read'
}

export interface ChatRoom {
  id: string
  participants: { id: string; name: string; avatar: string }[]
  messages: ChatMessage[]
  productName?: string
  lastMessage: string
  lastTime: string
  unread: number
}

export interface Tenant {
  id: string
  name: string
  ownerName: string
  campus: Campus
  category: ProductCategory
  isActive: boolean
  joinedAt: string
  totalProducts: number
  totalRevenue: number
}

export type CouponDiscountType = 'percentage' | 'fixed' | 'shipping'

export interface SellerCoupon {
  id: string
  sellerId: string
  sellerName: string
  code: string
  name: string
  discountType: CouponDiscountType
  value: number
  minSpend: number
  maxDiscount?: number
  quota: number
  usedCount: number
  startDate: string // ISO / YYYY-MM-DDTHH:mm
  endDate: string   // ISO / YYYY-MM-DDTHH:mm
  applicableProductIds?: string[]
  badge: string
  description: string
  isActive: boolean
  createdAt: string
}