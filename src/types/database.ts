// ─── Database Types (auto-generated stub; replace with `supabase gen types`) ─
// These types mirror the schema in supabase/migrations/001_schema.sql

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile>
        Update: Partial<Profile>
      }
      farms: {
        Row: Farm
        Insert: Partial<Farm>
        Update: Partial<Farm>
      }
      products: {
        Row: Product
        Insert: Partial<Product>
        Update: Partial<Product>
      }
      orders: {
        Row: Order
        Insert: Partial<Order>
        Update: Partial<Order>
      }
      order_items: {
        Row: OrderItem
        Insert: Partial<OrderItem>
        Update: Partial<OrderItem>
      }
      categories: {
        Row: Category
        Insert: Partial<Category>
        Update: Partial<Category>
      }
      reviews: {
        Row: Review
        Insert: Partial<Review>
        Update: Partial<Review>
      }
      cart_items: {
        Row: CartItem
        Insert: Partial<CartItem>
        Update: Partial<CartItem>
      }
      quotation_requests: {
        Row: QuotationRequest
        Insert: Partial<QuotationRequest>
        Update: Partial<QuotationRequest>
      }
      farmer_expenses: {
        Row: FarmerExpense
        Insert: Partial<FarmerExpense>
        Update: Partial<FarmerExpense>
      }
      harvest_entries: {
        Row: HarvestEntry
        Insert: Partial<HarvestEntry>
        Update: Partial<HarvestEntry>
      }
      wishlist_items: {
        Row: WishlistItem
        Insert: Pick<WishlistItem, 'user_id' | 'product_id'> & Partial<Pick<WishlistItem, 'created_at'>>
        Update: never
      }
      customer_addresses: {
        Row: CustomerAddress
        Insert: Omit<CustomerAddress, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<CustomerAddress, 'id' | 'created_at' | 'updated_at'>>
        Update: Partial<Omit<CustomerAddress, 'id' | 'user_id' | 'created_at'>>
      }
      notifications: {
        Row: CustomerNotification
        Insert: never
        Update: Pick<CustomerNotification, 'is_read'>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// ─── Core Domain Types ────────────────────────────────────────────────────────

export type UserRole = 'customer' | 'farmer' | 'business' | 'admin'
export type BusinessType =
  | 'restaurant' | 'hotel' | 'retailer' | 'grocery_store'
  | 'wholesaler' | 'distributor' | 'food_processor' | 'other'

export interface Profile {
  id: string
  email: string
  full_name: string
  phone?: string
  avatar_url?: string
  role: UserRole
  business_type?: BusinessType
  business_name?: string
  is_verified: boolean
  created_at: string
  updated_at?: string
}

export interface Address {
  id: string
  user_id: string
  label: string
  full_name: string
  phone: string
  address_line1: string
  address_line2?: string
  city: string
  state: string
  pincode: string
  is_default: boolean
  lat?: number
  lng?: number
  created_at: string
}

export interface CustomerAddress {
  id: string
  user_id: string
  label: string
  recipient_name: string
  phone: string
  address_line1: string
  address_line2: string
  locality: string
  city: string
  state: string
  pincode: string
  delivery_note: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface WishlistItem {
  user_id: string
  product_id: string
  created_at: string
}

export interface CustomerNotification {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  data: Json
  is_read: boolean
  created_at: string
}

export interface Farm {
  id: string
  farmer_id: string
  name: string
  description?: string | null
  farm_size_acres?: number
  primary_products?: string[]
  village?: string | null
  district?: string | null
  state: string
  pincode?: string | null
  lat?: number
  lng?: number
  verification_status: 'not_submitted' | 'pending' | 'approved' | 'rejected' | 'expired' | 'resubmit'
  trust_score?: number
  total_orders?: number
  avg_rating?: number
  established_year?: number
  profile_image_url?: string
  cover_image_url?: string
  created_at: string
  updated_at?: string
  area_acres?: number | null
  crops_grown?: string[] | null
  certifications?: string[] | null
  farming_methods?: string
  inputs_disclosure?: string
  certification_notes?: string
  // joined
  farmer?: Profile
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  image_url?: string
  parent_id?: string
  sort_order?: number
  is_active?: boolean
}

export type OrganicStatus =
  | 'certified_organic'
  | 'certification_pending'
  | 'farmer_declared_organic'
  | 'conventional'
  | 'not_disclosed'

export type PesticideStatus =
  | 'none_used'
  | 'natural_only'
  | 'minimal_use'
  | 'standard_use'
  | 'used'
  | 'not_disclosed'

export interface Product {
  id: string
  farmer_id: string
  farm_id: string
  category_id: string
  name: string
  description: string
  price_per_unit: number    // DECIMAL
  unit: 'kg' | 'g' | 'piece' | 'litre' | 'ml' | 'bundle' | 'dozen' | 'quintal'
  quantity_available: number
  quantity_reserved?: number
  min_order_qty: number
  max_order_qty?: number
  bulk_discount_percent?: number
  grade?: 'a' | 'b' | 'c' | 'A' | 'B' | 'C' | 'premium'
  harvest_date?: string
  available_from?: string
  is_seasonal: boolean
  is_surplus: boolean
  surplus_price_per_unit?: number | null
  surplus_available_until?: string | null
  organic_status: OrganicStatus
  pesticide_status: PesticideStatus
  farming_method?: string
  images: string[]          // storage URLs
  is_active: boolean
  is_archived?: boolean
  avg_rating?: number
  review_count: number
  sold_count?: number
  created_at: string
  updated_at?: string
  // joined
  farm?: Farm
  farmer?: Profile
  category?: Pick<Category, 'id' | 'name' | 'slug'>
  bulk_price_tiers?: BulkPriceTier[]
}

export interface BulkPriceTier {
  id?: string
  product_id?: string
  min_qty: number
  max_qty?: number
  price_per_unit: number
  label?: string
}

export interface CartItem {
  id: string
  user_id: string
  product_id: string
  quantity: number
  created_at: string
  // joined
  product?: Product
}

export type OrderStatus =
  | 'pending' | 'confirmed' | 'preparing' | 'ready'
  | 'shipped' | 'delivered' | 'cancelled' | 'refund_requested' | 'refunded'

export interface Order {
  id: string
  order_number: string
  customer_id: string
  total_amount: number
  delivery_charge: number
  platform_fee: number
  discount_amount: number
  status: OrderStatus
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  payment_method?: string
  payment_reference?: string
  delivery_address: Address
  delivery_slot?: string
  notes?: string
  created_at: string
  updated_at: string
  // joined
  items?: OrderItem[]
  customer?: Profile
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  farmer_id: string
  product_name: string        // snapshot
  product_image?: string      // snapshot
  unit: string                // snapshot
  quantity: number
  unit_price: number          // snapshot
  total_price: number         // snapshot
  status: OrderStatus
  created_at: string
  // joined
  product?: Product
  farmer?: Profile
}

export interface Review {
  id: string
  product_id: string
  farmer_id: string
  customer_id: string
  order_item_id: string
  rating: number              // 1–5
  farmer_rating?: number      // 1–5
  title?: string
  body?: string
  images?: string[]
  is_verified_purchase: boolean
  is_approved: boolean
  farmer_reply?: string
  helpful_count: number
  created_at: string
  // joined
  customer?: Profile
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  data?: Json
  is_read: boolean
  created_at: string
}

export interface HarvestAnnouncement {
  id: string
  farmer_id: string
  farm_id?: string
  product_name: string
  category_id?: string
  expected_harvest_date: string
  estimated_quantity: number
  unit: string
  expected_price_min?: number
  expected_price_max?: number
  reservation_deadline?: string
  description?: string
  is_active?: boolean
  is_pre_order_open?: boolean
  status?: string
  created_at: string
  // joined
  farmer?: Profile
  farm?: Farm
}

export interface Testimonial {
  id: string
  name: string
  role: string
  avatar: string
  body: string
  rating: number
}

export interface HarvestReservation {
  id: string
  announcement_id: string
  customer_id: string
  quantity: number
  status: 'active' | 'confirmed' | 'cancelled' | 'fulfilled'
  created_at: string
}

export interface QuotationRequest {
  id: string
  buyer_id: string
  farmer_id: string
  product_id: string
  requested_quantity: number
  message: string
  status: 'requested' | 'quoted' | 'declined' | 'cancelled'
  quoted_unit_price?: number | null
  farmer_response?: string | null
  created_at: string
  updated_at: string
  product?: Pick<Product, 'id' | 'name' | 'unit'>
}

export type ExpenseCategory =
  | 'seeds' | 'fertilizers' | 'pesticides' | 'labour' | 'irrigation'
  | 'packaging' | 'transportation' | 'equipment' | 'maintenance' | 'other'

export interface FarmerExpense {
  id: string
  farmer_id: string
  product_id: string | null
  expense_date: string
  category: ExpenseCategory
  amount: number
  notes: string
  created_at: string
  updated_at: string
  product?: Pick<Product, 'id' | 'name'>
}

export type HarvestStatus = 'planned' | 'growing' | 'harvested' | 'cancelled'

export interface HarvestEntry {
  id: string
  farmer_id: string
  product_id: string | null
  crop_name: string
  planting_date: string | null
  expected_harvest_date: string | null
  expected_quantity: number | null
  actual_harvest_date: string | null
  actual_quantity: number | null
  unit: Product['unit']
  status: HarvestStatus
  notes: string
  created_at: string
  updated_at: string
  product?: Pick<Product, 'id' | 'name'>
}

export interface Quotation {
  id: string
  buyer_id: string
  farmer_id?: string
  product_description: string
  quantity: number
  unit: string
  required_by_date?: string
  delivery_location?: string
  special_requirements?: string
  status: 'open' | 'responded' | 'accepted' | 'rejected' | 'expired' | 'converted'
  created_at: string
  expires_at?: string
  // joined
  buyer?: Profile
  items?: QuotationItem[]
  responses?: QuotationResponse[]
}

export interface QuotationItem {
  id: string
  quotation_id: string
  product_name: string
  quantity: number
  unit: string
  notes?: string
}

export interface QuotationResponse {
  id: string
  quotation_id: string
  farmer_id: string
  price_per_unit: number
  available_quantity: number
  delivery_terms?: string
  valid_until: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  created_at: string
  // joined
  farmer?: Profile
}

export interface SurplusListing {
  id: string
  farmer_id: string
  product_id?: string
  product_name: string
  quantity: number
  unit: string
  original_price: number
  surplus_price: number
  grade?: string
  condition_notes?: string
  harvest_date?: string
  available_until: string
  delivery_or_pickup: 'delivery' | 'pickup' | 'both'
  is_active: boolean
  created_at: string
  // joined
  farmer?: Profile
}

export interface FarmerScoreSnapshot {
  id: string
  farmer_id: string
  trust_score: number
  product_quality_score: number
  fulfillment_score: number
  feedback_score: number
  transparency_score: number
  complaint_score: number
  calculation_version: string
  snapshot_date: string
  note?: string
}

export interface SupportTicket {
  id: string
  user_id: string
  order_id?: string
  subject: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_at: string
  updated_at: string
  // joined
  messages?: SupportMessage[]
}

export interface SupportMessage {
  id: string
  ticket_id: string
  sender_id: string
  body: string
  is_staff: boolean
  created_at: string
}
