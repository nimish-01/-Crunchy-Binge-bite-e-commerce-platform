import type {
  User,
  Product,
  ProductVariant,
  Category,
  Order,
  OrderItem,
  CartItem,
  Coupon,
  Notification,
  Review,
  Address,
  InventoryLog,
} from "@prisma/client"

export type { User, Product, ProductVariant, Category, Order, OrderItem, CartItem, Coupon, Notification, Review, Address, InventoryLog }

// Extended types with relations
export type ProductWithVariants = Product & {
  variants: ProductVariant[]
  category: Category
  _count?: { reviews: number; wishlists: number }
}

export type ProductWithDetails = Product & {
  variants: ProductVariant[]
  category: Category
  reviews: ReviewWithUser[]
  _count: { reviews: number }
}

export type CartWithItems = {
  id: string
  items: CartItemWithDetails[]
}

export type CartItemWithDetails = CartItem & {
  product: Product
  variant: ProductVariant
}

export type OrderWithDetails = Order & {
  items: (OrderItem & { product: Product; variant: ProductVariant })[]
  address: Address | null
  coupon: Coupon | null
}

export type ReviewWithUser = Review & {
  user: Pick<User, "id" | "name" | "image">
}

// Cart state (client-side)
export interface CartState {
  items: CartItemWithDetails[]
  subtotal: number
  total: number
  discountAmount: number
  deliveryCharge: number
  coupon: Coupon | null
  itemCount: number
}

// Notification service interface — swappable for email/SMS/WhatsApp later
export interface NotificationPayload {
  userId: string
  type: string
  title: string
  body: string
  referenceType?: string
  referenceId?: string
}

// Payment service interface — swappable for Razorpay/Cashfree later
export interface PaymentIntent {
  id: string
  amount: number
  currency: string
  status: "pending" | "success" | "failed"
  metadata?: Record<string, string>
}

export interface PaymentResult {
  success: boolean
  transactionId?: string
  error?: string
}

// Shipping service interface — swappable for Shiprocket/Delhivery later
export interface ShippingEstimate {
  minDays: number
  maxDays: number
  charge: number
  freeAbove: number
  codAvailable: boolean
}

// Storage service interface — swappable for Cloudinary/S3 later
export interface UploadResult {
  url: string
  publicId: string
}

// API response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Admin dashboard stats
export interface DashboardStats {
  revenue: { today: number; week: number; month: number }
  orders: { total: number; pending: number; dispatched: number; delivered: number }
  customers: { total: number; new: number }
  products: { total: number; lowStock: number; outOfStock: number }
}

// Coupon validation result
export interface CouponValidation {
  valid: boolean
  coupon?: Coupon
  discountAmount?: number
  error?: string
}
