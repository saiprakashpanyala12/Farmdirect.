import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Package, PackagePlus, Wheat } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { listFarmerOrders, listFarmerProducts, type FarmerOrderItem } from '@/lib/marketplace'
import type { Product } from '@/types/database'
import { formatDate, formatPrice } from '@/lib/utils'

export default function FarmerDashboard() {
  const { profile } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<FarmerOrderItem[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!profile) return
      try {
        const [productRows, orderRows] = await Promise.all([
          listFarmerProducts(profile.id),
          listFarmerOrders(profile.id),
        ])
        if (active) {
          setProducts(productRows)
          setOrders(orderRows)
        }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load farmer dashboard.')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [profile])

  const activeProducts = products.filter(product => product.is_active && !product.is_archived).length
  const availableStock = products.reduce(
    (total, product) => total + Math.max(0, product.quantity_available - (product.quantity_reserved ?? 0)),
    0
  )
  const pendingOrders = orders.filter(item => item.order?.status === 'pending').length
  const recentOrders = orders.slice(0, 5)
  const paidSales = orders.reduce((total, item) => {
    const status = item.order?.status
    const isCountedSale = item.order?.payment_status === 'paid' &&
      status !== 'cancelled' && status !== 'refunded' && status !== 'refund_requested'
    return total + (isCountedSale ? Number(item.total_price) : 0)
  }, 0)
  const lowStock = products.filter(product =>
    product.is_active && !product.is_archived &&
    product.quantity_available - (product.quantity_reserved ?? 0) <= 10
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Farmer dashboard</p>
          <h1 className="text-3xl font-bold text-gray-900">Welcome, {profile?.full_name?.split(' ')[0] ?? 'farmer'}</h1>
          <p className="mt-2 text-sm text-gray-600">Manage live product listings, inventory, and pending test orders.</p>
        </div>
        <Link to="/farm/products/new" className="btn-primary"><PackagePlus className="h-4 w-4" /> Add product</Link>
      </div>

      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {isLoading ? <p className="mt-6 text-sm text-gray-500">Loading dashboard…</p> : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat icon={Package} label="Active listings" value={String(activeProducts)} />
            <Stat icon={Wheat} label="Available stock (product units)" value={String(availableStock)} />
            <Stat icon={ClipboardList} label="Pending order items" value={String(pendingOrders)} />
            <Stat icon={ClipboardList} label="Paid sales" value={formatPrice(paidSales)} />
          </div>

          {lowStock.length > 0 && <section className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-semibold text-amber-950">Low stock (10 units or fewer)</h2>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-amber-900">{lowStock.map(product => <li key={product.id}>{product.name}: {Math.max(0, product.quantity_available - (product.quantity_reserved ?? 0))} {product.unit}</li>)}</ul>
          </section>}

          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Recent orders</h2>
              <Link to="/farm/orders" className="text-sm font-semibold text-primary-700">View all</Link>
            </div>
            {recentOrders.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
                Orders for your products will appear here. Customer test orders remain pending and unpaid.
              </p>
            ) : (
              <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                {recentOrders.map(item => (
                  <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <div>
                      <p className="font-semibold text-gray-900">{item.product_name} · {item.quantity} {item.unit}</p>
                      <p className="mt-1 text-sm text-gray-500">{item.order?.order_number ?? 'Order'} · {item.order?.created_at ? formatDate(item.order.created_at, { dateStyle: 'medium' }) : 'Date unavailable'}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{formatPrice(item.total_price)} · {item.order?.payment_status ?? 'payment status unavailable'}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
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
