import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, MapPin, PackageCheck, ShoppingBag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { readDemoOrders } from '@/features/orders/demo-orders'
import { demoOrderView, marketplaceOrderView, type OrderView } from '@/features/orders/order-view'
import { IS_DEMO_MODE } from '@/lib/constants'
import { listCustomerOrders } from '@/lib/marketplace'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate, formatPrice } from '@/lib/utils'

export default function CustomerDashboard() {
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

  const orderValue = orders.reduce((total, order) => total + order.total, 0)
  const recentOrders = orders.slice(0, 3)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">My account</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">Hello, {profile?.full_name?.split(' ')[0] ?? 'there'}</h1>
          <p className="mt-2 text-sm text-gray-500">Your fresh-from-the-farm orders in one place.</p>
        </div>
        <Link to="/products" className="btn-primary"><ShoppingBag className="h-4 w-4" /> Shop produce</Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat icon={PackageCheck} label="Orders" value={String(orders.length)} />
        <Stat icon={ShoppingBag} label="Order value (unpaid)" value={formatPrice(orderValue)} />
        <Stat icon={MapPin} label="Delivery status" value="Not booked" />
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Recent orders</h2>
          <Link to="/account/orders" className="text-sm font-semibold text-primary-700 hover:text-primary-900">View all</Link>
        </div>
        {error ? (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
        ) : isLoading ? <p className="text-sm text-gray-500">Loading orders…</p> : recentOrders.length === 0 ? (
          <EmptyState
            icon={PackageCheck}
            title="Your orders will show here"
            description="Add products to your cart and place an order to see your order history."
            action={<Link to="/products" className="btn-primary">Explore products</Link>}
            className="rounded-2xl border border-dashed border-gray-300 bg-white"
          />
        ) : (
          <div className="space-y-3">
            {recentOrders.map(order => (
              <Link key={order.id} to={`/account/orders/${encodeURIComponent(order.id)}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-5 hover:border-primary-300">
                <div>
                  <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                  <p className="mt-1 text-sm capitalize text-gray-500">{formatDate(order.createdAt, { dateStyle: 'medium' })} · payment {order.paymentStatus}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900">{formatPrice(order.total)}</span>
                  <ArrowRight className="h-4 w-4 text-primary-600" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700"><Icon className="h-5 w-5" /></div>
      <p className="mt-4 text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
