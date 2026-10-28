import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { BulkPriceTier, OrganicStatus, PesticideStatus } from '@/types/database'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Currency ────────────────────────────────────────────────────────────────
export function formatPrice(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(amount)
}

// ── Dates ────────────────────────────────────────────────────────────────────
export function formatDate(date: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-IN', opts ?? { day: 'numeric', month: 'short', year: 'numeric' }).format(
    typeof date === 'string' ? new Date(date) : date
  )
}

export function timeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const m = 60_000, h = 3_600_000, day = 86_400_000
  if (diff < m) return 'just now'
  if (diff < h) return `${Math.floor(diff / m)}m ago`
  if (diff < day) return `${Math.floor(diff / h)}h ago`
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`
  return formatDate(d)
}

// ── Stock ────────────────────────────────────────────────────────────────────
export function availableStock(product: { quantity_available: number; quantity_reserved?: number }): number {
  return Math.max(0, product.quantity_available - (product.quantity_reserved ?? 0))
}

// ── Bulk pricing ─────────────────────────────────────────────────────────────
export function effectiveUnitPrice(
  basePrice: number,
  qty: number,
  tiers?: BulkPriceTier[] | null
): number {
  if (!tiers?.length) return basePrice
  const sorted = [...tiers].sort((a, b) => b.min_qty - a.min_qty)
  const tier = sorted.find(t => qty >= t.min_qty)
  return tier ? tier.price_per_unit : basePrice
}

export function productUnitPrice(
  product: {
    price_per_unit: number
    bulk_price_tiers?: BulkPriceTier[] | null
    is_surplus?: boolean
    surplus_price_per_unit?: number | null
    surplus_available_until?: string | null
  },
  quantity: number,
  now = Date.now()
): number {
  const tierPrice = effectiveUnitPrice(product.price_per_unit, quantity, product.bulk_price_tiers)
  const offerEnd = product.surplus_available_until ? Date.parse(product.surplus_available_until) : Number.NaN
  if (
    product.is_surplus === true &&
    product.surplus_price_per_unit != null &&
    product.surplus_price_per_unit > 0 &&
    product.surplus_price_per_unit < product.price_per_unit &&
    Number.isFinite(offerEnd) &&
    offerEnd > now
  ) return Math.min(tierPrice, product.surplus_price_per_unit)
  return tierPrice
}

export function hasActiveSurplusOffer(
  product: {
    is_surplus: boolean
    price_per_unit: number
    surplus_price_per_unit?: number | null
    surplus_available_until?: string | null
  },
  now = Date.now()
): boolean {
  const end = product.surplus_available_until ? Date.parse(product.surplus_available_until) : Number.NaN
  return product.is_surplus &&
    product.surplus_price_per_unit != null &&
    product.surplus_price_per_unit > 0 &&
    product.surplus_price_per_unit < product.price_per_unit &&
    Number.isFinite(end) &&
    end > now
}

// ── Labels ───────────────────────────────────────────────────────────────────
export const ORGANIC_LABELS: Record<OrganicStatus, { label: string; color: string }> = {
  certified_organic:       { label: 'Certified Organic',         color: 'green'  },
  certification_pending:   { label: 'Certification Pending',     color: 'yellow' },
  farmer_declared_organic: { label: 'Farmer-Declared Organic',   color: 'yellow' },
  conventional:            { label: 'Conventional',              color: 'gray'   },
  not_disclosed:           { label: 'Not Disclosed',             color: 'gray'   },
}

export const PESTICIDE_LABELS: Record<PesticideStatus, { label: string; color: string }> = {
  none_used:       { label: 'No Pesticides',          color: 'green'  },
  natural_only:    { label: 'Natural Only',            color: 'green'  },
  minimal_use:     { label: 'Minimal Use',             color: 'yellow' },
  standard_use:    { label: 'Standard Use',            color: 'gray'   },
  used:            { label: 'Pesticides Used',         color: 'yellow' },
  not_disclosed:   { label: 'Not Disclosed',           color: 'gray'   },
}

export const GRADE_COLORS: Record<string, string> = {
  premium: 'bg-purple-100 text-purple-800 border-purple-200',
  a:       'bg-green-100 text-green-800 border-green-200',
  b:       'bg-blue-100 text-blue-800 border-blue-200',
  c:       'bg-yellow-100 text-yellow-800 border-yellow-200',
}

// ── Misc ─────────────────────────────────────────────────────────────────────
export function truncate(str: string, len: number): string {
  return str.length <= len ? str : str.slice(0, len) + '…'
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function generateOrderId(): string {
  return 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()
}
