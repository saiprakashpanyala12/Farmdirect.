import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { listFarmerOrders, type FarmerOrderItem } from '@/lib/marketplace'
import { formatDate, formatPrice } from '@/lib/utils'

export default function FarmerOrders() {
  const { profile } = useAuth()
  const [items, setItems] = useState<FarmerOrderItem[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!profile) return
      try {
        const result = await listFarmerOrders(profile.id)
        if (active) setItems(result)
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load orders.')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [profile])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Farmer dashboard</p>
      <h1 className="text-3xl font-bold text-gray-900">Orders for your products</h1>
      <p className="mt-2 text-sm text-gray-600">Orders remain pending and unpaid until payment and fulfillment are configured.</p>
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {isLoading ? <p className="mt-6 text-sm text-gray-500">Loading orders…</p> : !error && items.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">There are no orders for your products yet.</p>
      ) : !error ? (
        <div className="mt-6 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {items.map(item => (
            <article key={item.id} className="flex flex-wrap items-center gap-4 p-5">
              {item.product_image && <img src={item.product_image} alt="" className="h-14 w-14 rounded-lg object-cover" />}
              <div className="min-w-[200px] flex-1">
                <p className="font-semibold text-gray-900">{item.product_name}</p>
                <p className="mt-1 text-sm text-gray-500">{item.order?.order_number ?? 'Order'} · {item.quantity} {item.unit}</p>
                {item.order?.created_at && <p className="mt-1 text-xs text-gray-500">{formatDate(item.order.created_at, { dateStyle: 'medium' })}</p>}
              </div>
              <span className="text-sm font-semibold text-gray-900">{formatPrice(item.total_price)}</span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold capitalize text-amber-800">{item.order?.status ?? item.status} · unpaid</span>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  )
}
