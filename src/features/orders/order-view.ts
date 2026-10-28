import type { DemoOrder } from './demo-orders'
import type { MarketplaceOrder } from '@/lib/marketplace'
import { effectiveUnitPrice } from '@/lib/utils'

export interface OrderViewItem {
  id: string
  name: string
  image?: string
  quantity: number
  unit: string
  total: number
}

export interface OrderView {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  createdAt: string
  items: OrderViewItem[]
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
  deliverySlot?: string
}

export function demoOrderView(order: DemoOrder): OrderView {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    items: order.items.map(({ product, quantity }) => ({
      id: product.id,
      name: product.name,
      image: product.images[0],
      quantity,
      unit: product.unit,
      total: effectiveUnitPrice(product.price_per_unit, quantity, product.bulk_price_tiers) * quantity,
    })),
    subtotal: order.subtotal,
    deliveryCharge: order.deliveryCharge,
    total: order.total,
    deliveryAddress: order.deliveryAddress,
    deliverySlot: order.deliverySlot,
  }
}

export function marketplaceOrderView(order: MarketplaceOrder): OrderView {
  const deliveryAddress = order.delivery_address
  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    paymentStatus: order.payment_status,
    createdAt: order.created_at,
    items: (order.items ?? []).map(item => ({
      id: item.id,
      name: item.product_name,
      image: item.product_image,
      quantity: item.quantity,
      unit: item.unit,
      total: item.total_price,
    })),
    subtotal: order.total_amount - order.delivery_charge,
    deliveryCharge: order.delivery_charge,
    total: order.total_amount,
    deliveryAddress,
    deliverySlot: order.delivery_slot,
  }
}
