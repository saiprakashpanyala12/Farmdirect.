import { Link, useParams } from 'react-router-dom'
import EmptyState from '@/components/ui/EmptyState'
import ProductCard from '@/features/products/ProductCard'
import { useProducts } from '@/features/products/useProducts'

const CATEGORY_NAMES: Record<string, string> = {
  vegetables: 'Vegetables',
  fruits: 'Fruits',
  grains: 'Grains',
  pulses: 'Pulses',
  spices: 'Spices',
  dairy: 'Dairy',
  herbs: 'Herbs',
  flowers: 'Flowers',
}

export default function CategoryPage() {
  const { slug = '' } = useParams()
  const { products, isLoading, error } = useProducts()
  const categoryName = CATEGORY_NAMES[slug.toLowerCase()] ?? slug
  const categoryProducts = products.filter(product => product.category?.name.toLowerCase() === categoryName.toLowerCase())

  return (
    <div className="container-main py-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Shop by category</p>
      <h1 className="mt-1 text-3xl font-bold text-gray-900">{categoryName}</h1>
      {error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
        : isLoading ? <p className="mt-5 text-sm text-gray-500">Loading products…</p>
          : categoryProducts.length === 0 ? (
            <EmptyState
              title="No products in this category"
              description="Check back later or browse all available products."
              action={<Link to="/products" className="btn-primary">Browse all products</Link>}
              className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white"
            />
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {categoryProducts.map(product => <ProductCard key={product.id} product={product} />)}
            </div>
          )}
    </div>
  )
}
