import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertCircle, ArrowRight, Clock3, PackageCheck } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { findDemoOrder } from '@/features/orders/demo-orders'
import { demoOrderView, marketplaceOrderView, type OrderView } from '@/features/orders/order-view'
import { IS_DEMO_MODE } from '@/lib/constants'
import { getCustomerOrder } from '@/lib/marketplace'
import { formatDate, formatPrice } from '@/lib/utils'

export default function OrderConfirmPage() {
  const { orderId } = useParams()
  const { profile } = useAuth()
  const [order, setOrder] = useState<OrderView | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const id = orderId ? decodeURIComponent(orderId) : ''
        if (IS_DEMO_MODE) {
          const demoOrder = findDemoOrder(id)
          if (!demoOrder || demoOrder.customerEmail !== profile?.email) {
            throw new Error('This demo order could not be found in your account.')
          }
          if (active) setOrder(demoOrderView(demoOrder))
          return
        }
        if (!profile) throw new Error('Sign in to view this order.')
        const result = await getCustomerOrder(id, profile.id)
        if (!result) throw new Error('This order is not available in your account.')
        if (active) setOrder(marketplaceOrderView(result))
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load order.')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [orderId, profile])

  if (isLoading) return <div className="container-main py-16 text-center text-gray-600">Loading order…</div>
  if (error || !order) {
    return (
      <div className="container-main py-12">
        <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Order not available</h1>
          <p className="mt-2 text-sm text-gray-600">{error || 'This order could not be found.'}</p>
          <Link to="/products" className="btn-primary mt-5 inline-flex">Continue shopping</Link>
        </div>
      </div>
    )
  }

  const isTestOrder = !IS_DEMO_MODE
  const orderLabel = isTestOrder ? 'Test order saved to Supabase' : 'Demo order saved'

  return (
    <div className="container-main py-12">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <PackageCheck className="h-8 w-8" />
          </div>
          <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-amber-700">{orderLabel}</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Order {order.orderNumber}</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-gray-600">
            {isTestOrder
              ? 'The order is stored in Supabase with pending status. No payment was taken and no delivery was booked.'
              : 'This order is stored only in this browser. No payment was taken and no farmer or delivery provider was notified.'}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm capitalize text-gray-700">
            <Clock3 className="h-4 w-4" /> Status: {order.status} · Payment: {order.paymentStatus}
          </div>
          <p className="mt-3 text-xs text-gray-400">Created {formatDate(order.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</p>
        </div>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Delivery details</h2>
          <p className="mt-3 text-sm font-medium text-gray-800">{order.deliveryAddress.fullName}</p>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            {order.deliveryAddress.address}, {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.pincode}
          </p>
          <p className="mt-1 text-sm text-gray-600">{order.deliveryAddress.phone}</p>
          {order.deliverySlot && <p className="mt-3 text-sm text-gray-600">Requested slot: {order.deliverySlot}</p>}
        </section>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Items and totals</h2>
          <div className="mt-4 divide-y divide-gray-100">
            {order.items.map(item => (
              <div key={item.id} className="flex justify-between gap-4 py-3 text-sm">
                <span className="text-gray-600">{item.name} × {item.quantity} {item.unit}</span>
                <span className="font-medium text-gray-900">{formatPrice(item.total)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-2 border-t border-gray-100 pt-4 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
            <div className="flex justify-between text-gray-600"><span>Delivery</span><span>{order.deliveryCharge ? formatPrice(order.deliveryCharge) : 'Free'}</span></div>
            <div className="flex justify-between font-bold text-gray-900"><span>Total (unpaid)</span><span>{formatPrice(order.total)}</span></div>
          </div>
        </section>

        <Link to="/products" className="btn-primary mt-6 w-full justify-center">
          Continue shopping <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
