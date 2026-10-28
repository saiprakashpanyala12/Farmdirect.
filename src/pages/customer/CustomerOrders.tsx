import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ClipboardList } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { readDemoOrders } from '@/features/orders/demo-orders'
import { demoOrderView, marketplaceOrderView, type OrderView } from '@/features/orders/order-view'
import { IS_DEMO_MODE } from '@/lib/constants'
import { listCustomerOrders } from '@/lib/marketplace'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate, formatPrice } from '@/lib/utils'

export default function CustomerOrders() {
  const { profile } = useAuth()
  const [orders, setOrders] = useState<OrderView[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        if (!profile) return
        const result = IS_DEMO_MODE
          ? readDemoOrders().filter(order => order.customerEmail === profile.email).map(demoOrderView)
          : (await listCustomerOrders(profile.id)).map(marketplaceOrderView)
        if (active) setOrders(result)
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load your orders.')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [profile])

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Account</p>
      <h1 className="mt-1 text-3xl font-bold text-gray-900">My orders</h1>
      <p className="mt-2 text-sm text-gray-500">{IS_DEMO_MODE ? 'Demo orders are stored only in this browser.' : 'Orders are loaded from your FarmDirect account.'}</p>

      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {isLoading ? <p className="mt-5 text-sm text-gray-500">Loading orders…</p> : !error && orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No orders yet"
          description="Once you place an order, it will appear here."
          action={<Link to="/products" className="btn-primary">Browse produce</Link>}
          className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-white"
        />
      ) : !error ? (
        <div className="mt-6 space-y-4">
          {orders.map(order => (
            <article key={order.id} className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                  <p className="mt-1 text-sm text-gray-500">{formatDate(order.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold capitalize text-amber-800">{order.status} · {order.paymentStatus}</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                <p className="text-sm text-gray-600">{order.items.length} product{order.items.length !== 1 ? 's' : ''} · <strong className="text-gray-900">{formatPrice(order.total)}</strong></p>
                <Link to={`/account/orders/${encodeURIComponent(order.id)}`} className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-900">
                  View order <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  )
}
