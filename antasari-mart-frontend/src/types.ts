export type Campus = 'banjarmasin' | 'banjarbaru'
export type UserRole = 'buyer' | 'seller' | 'driver' | 'admin' | 'admin_reguler' | 'admin_pro' | 'super_admin'
export type ThemeMode = 'aesthetic' | 'modern'
export type AppTab = 'home' | 'cart' | 'checkout' | 'tracker' | 'seller' | 'admin' | 'chat' | 'driver' | 'super_admin' | 'login_page' | 'vending_simulator'

export interface SessionUser {
  id?: string
  nama?: string
  name?: string
  email: string
  role: UserRole
  roles?: UserRole[]
  avatar?: string
  isPro?: boolean
  [key: string]: unknown
}
export type PaymentMethod = 'qris' | 'dana' | 'gopay' | 'cod'
export type DeliveryMethod = 'courier' | 'pickup'
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'searching_driver' | 'driver_found' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled'
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

export interface Product {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  stock: number
  category: ProductCategory
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
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface Order {
  id: string
  buyerId: string
  buyerName: string
  buyerLocation: string
  items: CartItem[]
  total: number
  deliveryFee: number
  deliveryMethod: DeliveryMethod
  paymentMethod: PaymentMethod
  status: OrderStatus
  driverId?: string
  driverName?: string
  driverPhone?: string
  driverAvatar?: string
  createdAt: string
  campus: Campus
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