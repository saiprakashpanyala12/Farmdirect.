import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Clock3 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/features/auth/AuthContext'
import { findDemoOrder } from '@/features/orders/demo-orders'
import { demoOrderView, marketplaceOrderView, type OrderView } from '@/features/orders/order-view'
import { IS_DEMO_MODE } from '@/lib/constants'
import { cancelPendingOrder, getCustomerOrder } from '@/lib/marketplace'
import { formatDate, formatPrice } from '@/lib/utils'

export default function CustomerOrderDetail() {
  const { id } = useParams()
  const { profile } = useAuth()
  const [order, setOrder] = useState<OrderView | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isCancelling, setIsCancelling] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        if (!profile || !id) return
        const orderId = decodeURIComponent(id)
        if (IS_DEMO_MODE) {
          const demoOrder = findDemoOrder(orderId)
          if (demoOrder?.customerEmail === profile.email && active) setOrder(demoOrderView(demoOrder))
        } else {
          const result = await getCustomerOrder(orderId, profile.id)
          if (result && active) setOrder(marketplaceOrderView(result))
        }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load order.')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [id, profile])

  const cancelOrder = async () => {
    if (!order || IS_DEMO_MODE || !window.confirm('Cancel this pending order and release its reserved stock?')) return
    setError('')
    setIsCancelling(true)
    try {
      await cancelPendingOrder(order.id)
      setOrder(current => current ? { ...current, status: 'cancelled' } : current)
      toast.success('Order cancelled and reserved stock released.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to cancel order.')
    } finally {
      setIsCancelling(false)
    }
  }

  if (isLoading) return <p className="text-sm text-gray-600">Loading order…</p>
  if (error || !order) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Order unavailable</h1>
        <p role={error ? 'alert' : undefined} className="mt-2 text-sm text-gray-600">{error || 'This order does not belong to your account or is unavailable.'}</p>
        <Link to="/account/orders" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary-700"><ArrowLeft className="h-4 w-4" /> Back to orders</Link>
      </div>
    )
  }

  return (
    <div>
      <Link to="/account/orders" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-700">
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Order details</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">{order.orderNumber}</h1>
          <p className="mt-2 text-sm text-gray-500">Placed {formatDate(order.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-sm font-semibold capitalize text-amber-800">
          <Clock3 className="h-4 w-4" /> {order.status} · payment {order.paymentStatus}
        </span>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {!IS_DEMO_MODE && order.status === 'pending' && order.paymentStatus === 'pending' && (
        <button type="button" disabled={isCancelling} onClick={() => void cancelOrder()} className="btn-secondary mt-4 text-red-700">
          {isCancelling ? 'Cancelling…' : 'Cancel pending order'}
        </button>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900">Items</h2>
          <div className="mt-3 divide-y divide-gray-100">
            {order.items.map(item => (
              <div key={item.id} className="flex items-center gap-3 py-4">
                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {item.image && <img src={item.image} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="mt-1 text-xs text-gray-500">{item.quantity} {item.unit}</p>
                </div>
                <p className="text-sm font-semibold text-gray-900">{formatPrice(item.total)}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-2 border-t border-gray-100 pt-4 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
            <div className="flex justify-between text-gray-600"><span>Delivery</span><span>{order.deliveryCharge ? formatPrice(order.deliveryCharge) : 'Free'}</span></div>
            <div className="flex justify-between font-bold text-gray-900"><span>Total (unpaid)</span><span>{formatPrice(order.total)}</span></div>
          </div>
        </section>

        <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900">Delivery details</h2>
          <p className="mt-3 text-sm font-medium text-gray-800">{order.deliveryAddress.fullName}</p>
          <p className="mt-1 text-sm leading-6 text-gray-600">{order.deliveryAddress.address}, {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.pincode}</p>
          <p className="mt-1 text-sm text-gray-600">{order.deliveryAddress.phone}</p>
          {order.deliverySlot && <p className="mt-4 border-t border-gray-100 pt-4 text-sm text-gray-600">Requested slot: {order.deliverySlot}</p>}
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">No payment has been processed and delivery has not been booked.</p>
        </aside>
      </div>
    </div>
  )
}
