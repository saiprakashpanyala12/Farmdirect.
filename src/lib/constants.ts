// ─── Environment ────────────────────────────────────────────────────────────
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
export const SUPABASE_PUBLISHABLE_KEY = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  ''
).trim()

export const SUPABASE_CONFIGURED =
  /^https:\/\/[^/]+\.supabase\.co$/.test(SUPABASE_URL) &&
  SUPABASE_PUBLISHABLE_KEY.length > 0 &&
  SUPABASE_URL !== 'https://your-project.supabase.co'
export const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'
export const IS_SUPABASE_DEV_AUTH =
  import.meta.env.DEV && import.meta.env.VITE_SUPABASE_DEV_AUTH === 'true'

// ─── Feature Flags ──────────────────────────────────────────────────────────
export const FEATURE_RAZORPAY = !!import.meta.env.VITE_RAZORPAY_KEY_ID
export const FEATURE_GOOGLE_AUTH = !!import.meta.env.VITE_GOOGLE_CLIENT_ID
export const FEATURE_AI = !!import.meta.env.VITE_AI_ENABLED
export const FEATURE_MAPS = !!import.meta.env.VITE_MAPS_ENABLED

// ─── App Constants ───────────────────────────────────────────────────────────
export const APP_NAME = 'FarmDirect'
export const APP_TAGLINE = 'Fresh From Farm to Your Table'
export const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'retailer', label: 'Retailer' },
  { value: 'grocery_store', label: 'Grocery store' },
  { value: 'wholesaler', label: 'Wholesaler' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'food_processor', label: 'Food processor' },
  { value: 'other', label: 'Other business' },
] as const
export const PLATFORM_FEE_PERCENT = 5  // 5% platform fee
export const MIN_ORDER_VALUE = 100      // INR
export const DELIVERY_BASE_FEE = 30    // INR
export const FREE_DELIVERY_THRESHOLD = 500  // INR

// ─── Pagination ──────────────────────────────────────────────────────────────
export const PRODUCTS_PER_PAGE = 24
export const ORDERS_PER_PAGE = 20
export const REVIEWS_PER_PAGE = 10

// ─── File Upload ─────────────────────────────────────────────────────────────
export const MAX_IMAGE_SIZE_MB = 5
export const MAX_PRODUCT_IMAGES = 6
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// ─── Trust Score Weights ─────────────────────────────────────────────────────
export const TRUST_WEIGHTS = {
  product_quality:        0.35,
  fulfillment_reliability: 0.25,
  customer_feedback:       0.20,
  transparency:            0.10,
  complaint_resolution:    0.10,
} as const

// ─── Order Status Flow ───────────────────────────────────────────────────────
export const ORDER_STATUS_FLOW = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'shipped',
  'delivered',
] as const

export type OrderStatus =
  | 'pending' | 'confirmed' | 'preparing' | 'ready'
  | 'shipped' | 'delivered' | 'cancelled' | 'refund_requested' | 'refunded'
