import { Link } from 'react-router-dom'
import EmptyState from '@/components/ui/EmptyState'
import ProductCard from '@/features/products/ProductCard'
import { useProducts } from '@/features/products/useProducts'
import { hasActiveSurplusOffer } from '@/lib/utils'

export default function SurplusPage() {
  const { products, isLoading, error } = useProducts()
  const surplusProducts = products.filter(product => hasActiveSurplusOffer(product))

  return (
    <div className="container-main py-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">Reduce waste</p>
      <h1 className="mt-1 text-3xl font-bold text-gray-900">Surplus Produce Deals</h1>
      <p className="mt-2 text-sm text-gray-600">Available surplus listings from participating farms.</p>
      {error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
        : isLoading ? <p className="mt-5 text-sm text-gray-500">Loading surplus listings…</p>
          : surplusProducts.length === 0 ? (
            <EmptyState
              title="No surplus products are currently listed"
              description="Browse the full catalog for other fresh produce."
              action={<Link to="/products" className="btn-primary">Browse products</Link>}
              className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white"
            />
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {surplusProducts.map(product => <ProductCard key={product.id} product={product} />)}
            </div>
          )}
    </div>
  )
}
