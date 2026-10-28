import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { useProducts } from '@/features/products/useProducts'
import { availableStock, formatDate } from '@/lib/utils'

export default function HarvestCalendarPage() {
  const { products, isLoading, error } = useProducts()
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = products
    .filter(product => product.harvest_date && product.harvest_date >= today)
    .sort((a, b) => (a.harvest_date ?? '').localeCompare(b.harvest_date ?? ''))

  return (
    <div className="container-main py-8">
      <header className="mb-7"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Seasonal availability</p><h1 className="mt-2 text-3xl font-bold text-gray-900">Harvest calendar</h1><p className="mt-2 max-w-2xl text-sm text-gray-600">Upcoming dates shown here come from active farmer product listings. These are estimates, not guaranteed availability or pre-orders.</p></header>
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
        : isLoading ? <p role="status" className="text-sm text-gray-600">Loading harvest dates…</p>
        : upcoming.length === 0 ? <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center"><CalendarDays className="mx-auto h-10 w-10 text-gray-400" /><h2 className="mt-3 text-lg font-semibold">No upcoming harvest dates</h2><p className="mt-1 text-sm text-gray-600">Farmers have not published upcoming harvest dates for current listings.</p><Link className="mt-4 inline-block text-sm font-medium text-primary-700 underline" to="/products">Browse current products</Link></div>
        : <div className="space-y-3">{upcoming.map(product => <article key={product.id} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-semibold text-gray-900"><Link className="hover:text-primary-700" to={`/products/${product.id}`}>{product.name}</Link></h2><p className="mt-1 text-sm text-gray-600">{product.farm?.name ?? 'Farm'}{product.farm?.district ? ` · ${product.farm.district}` : ''}{product.farm?.state ? `, ${product.farm.state}` : ''}</p></div>
          <div className="text-sm sm:text-right"><p className="font-medium text-primary-800">Expected harvest: {formatDate(product.harvest_date!)}</p><p className="text-gray-500">{availableStock(product)} {product.unit} currently available</p></div>
        </article>)}</div>}
    </div>
  )
}
