import { useState, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { RefreshCw, Search } from 'lucide-react'
import ProductCard from '@/features/products/ProductCard'
import SkeletonCard from '@/components/ui/SkeletonCard'
import EmptyState from '@/components/ui/EmptyState'
import { useProducts } from '@/features/products/useProducts'
import { hasActiveSurplusOffer, productUnitPrice } from '@/lib/utils'

const CATEGORIES = ['All','Vegetables','Fruits','Grains','Pulses','Spices','Dairy','Herbs','Flowers']
const SORT_OPTIONS = [
  { value: 'popular',  label: 'Most Popular' },
  { value: 'newest',   label: 'Newest First' },
  { value: 'price_asc',label: 'Price: Low to High' },
  { value: 'price_desc',label: 'Price: High to Low' },
  { value: 'rating',   label: 'Top Rated' },
]

export default function ProductsPage() {
  const [params] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [category, setCategory] = useState(params.get('cat') ?? 'All')
  const [sort, setSort] = useState('popular')
  const [onlyOrganic, setOnlyOrganic] = useState(false)
  const [onlySurplus, setOnlySurplus] = useState(false)

  const { products, isLoading, error, refreshProducts } = useProducts()

  const filtered = useMemo(() => {
    let list = [...products]
    if (query) {
      const search = query.trim().toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(search)
        || p.description?.toLowerCase().includes(search)
        || p.category?.name?.toLowerCase().includes(search)
        || p.farm?.name?.toLowerCase().includes(search)
      )
    }
    if (category !== 'All') list = list.filter(p => p.category?.name?.toLowerCase() === category.toLowerCase())
    if (onlyOrganic) list = list.filter(p => p.organic_status === 'certified_organic' || p.organic_status === 'farmer_declared_organic')
    if (onlySurplus) list = list.filter(p => hasActiveSurplusOffer(p))
    if (sort === 'popular')    list.sort((a,b) => (b.sold_count ?? 0) - (a.sold_count ?? 0))
    if (sort === 'price_asc')  list.sort((a,b) => productUnitPrice(a, a.min_order_qty) - productUnitPrice(b, b.min_order_qty))
    if (sort === 'price_desc') list.sort((a,b) => productUnitPrice(b, b.min_order_qty) - productUnitPrice(a, a.min_order_qty))
    if (sort === 'rating')     list.sort((a,b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0))
    if (sort === 'newest')     list.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return list
  }, [products, query, category, sort, onlyOrganic, onlySurplus])

  return (
    <div className="container-main py-8">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <span className="badge-gray">{filtered.length} items</span>
        <button
          type="button"
          onClick={() => void refreshProducts()}
          disabled={isLoading}
          aria-label="Refresh product listings"
          className="btn-secondary ml-auto inline-flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isLoading ? 'Refreshing…' : 'Refresh'}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search products…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select className="select w-auto" value={sort} onChange={e => setSort(e.target.value)}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 text-sm">
          <input type="checkbox" checked={onlyOrganic} onChange={e => setOnlyOrganic(e.target.checked)} className="accent-primary-600" />
          Organic only
        </label>
        <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 text-sm">
          <input type="checkbox" checked={onlySurplus} onChange={e => setOnlySurplus(e.target.checked)} className="accent-orange-500" />
          Surplus deals
        </label>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6 pb-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              category === cat ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:border-primary-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({length:8}).map((_,i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title={products.length === 0 ? 'No products are available' : 'No products found'}
          description={products.length === 0
            ? 'Active listings from FarmDirect farmers will appear here when available.'
            : 'Try a different search term or remove some filters'}
          action={<button onClick={() => { setQuery(''); setCategory('All'); setOnlyOrganic(false); setOnlySurplus(false) }} className="btn-secondary">Clear Filters</button>}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  )
}
