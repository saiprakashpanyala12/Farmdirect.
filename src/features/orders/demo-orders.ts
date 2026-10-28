import type { CartLineItem, FarmerCartGroup } from '@/features/cart/CartContext'

export interface DemoOrder {
  id: string
  orderNumber: string
  status: 'pending'
  paymentStatus: 'pending'
  createdAt: string
  items: CartLineItem[]
  farmerGroups: FarmerCartGroup[]
  subtotal: number
  deliveryCharge: number
  total: number
  deliveryAddress: {
    fullName: string
    phone: string
    address: string
    city: string
    state: string
    pincode: string
  }
  deliverySlot: string
  customerEmail: string
}

const DEMO_ORDERS_KEY = 'fd_demo_orders'

export function readDemoOrders(): DemoOrder[] {
  const stored = localStorage.getItem(DEMO_ORDERS_KEY)
  if (!stored) return []
  const parsed: unknown = JSON.parse(stored)
  if (!Array.isArray(parsed)) throw new Error('Saved demo orders are invalid.')
  return parsed as DemoOrder[]
}

export function saveDemoOrder(order: DemoOrder): void {
  const orders = readDemoOrders()
  localStorage.setItem(DEMO_ORDERS_KEY, JSON.stringify([order, ...orders]))
}

export function findDemoOrder(id: string): DemoOrder | undefined {
  return readDemoOrders().find(order => order.id === id)
}
