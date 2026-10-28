import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { listFarmerProducts } from '@/lib/marketplace'
import { formatDate, formatPrice } from '@/lib/utils'
import type { Product } from '@/types/database'

export default function FarmerSurplus() {
  const { profile } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!profile) return
    try {
      setProducts(await listFarmerProducts(profile.id))
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load surplus listings.')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { void load() }, [load])

  const offers = products.filter(product => product.is_surplus)
  const now = Date.now()

  return <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Farmer dashboard</p><h1 className="text-3xl font-bold text-gray-900">Surplus offers</h1><p className="mt-2 max-w-2xl text-sm text-gray-600">Set a time-limited discount for available stock. The checkout database function rechecks expiry, stock, and the final price before reserving an order.</p></div><Link to="/farm/products/new" className="btn-primary">Add surplus listing</Link></header>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loading ? <p role="status" className="mt-6 text-sm text-gray-600">Loading your surplus listings…</p> : offers.length === 0 ? <p className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">No surplus offers configured. Edit a product to enable a surplus offer, choose a price below its regular price, and set an expiry.</p> : <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {offers.map(product => {
        const endsAt = product.surplus_available_until ? Date.parse(product.surplus_available_until) : Number.NaN
        const salePrice = product.surplus_price_per_unit
        const configured = salePrice != null && Number.isFinite(endsAt)
        const live = configured && product.is_active && !product.is_archived && endsAt > now && product.quantity_available > (product.quantity_reserved ?? 0)
        return <article key={product.id} className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3"><h2 className="font-semibold text-gray-900">{product.name}</h2><span className={`rounded-full px-3 py-1 text-xs font-semibold ${live ? 'bg-green-50 text-green-800' : 'bg-gray-100 text-gray-700'}`}>{live ? 'Live offer' : endsAt <= now ? 'Expired' : 'Not available'}</span></div>
          <p className="mt-2 text-sm text-gray-600">{product.quantity_available - (product.quantity_reserved ?? 0)} {product.unit} available</p>
          <p className="mt-3 text-lg font-bold text-gray-900">{salePrice != null ? formatPrice(salePrice) : 'Price not set'}<span className="ml-1 text-sm font-normal text-gray-500">/ {product.unit}</span></p>
          {configured && <p className="text-sm text-gray-500">Regular price: <span className="line-through">{formatPrice(product.price_per_unit)}</span> · Ends {formatDate(new Date(endsAt), { dateStyle: 'medium', timeStyle: 'short' })}</p>}
          <Link className="mt-4 inline-block text-sm font-semibold text-primary-700 underline" to={`/farm/products/${product.id}/edit`}>Edit offer and listing</Link>
        </article>
      })}
    </div>}
  </div>
}
