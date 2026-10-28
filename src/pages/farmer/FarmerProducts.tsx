import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, PackagePlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/features/auth/AuthContext'
import { archiveProduct, listFarmerProducts } from '@/lib/marketplace'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types/database'

export default function FarmerProducts() {
  const { profile } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadProducts = useCallback(async () => {
    if (!profile) return
    try {
      setProducts(await listFarmerProducts(profile.id))
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load your products.')
    } finally {
      setIsLoading(false)
    }
  }, [profile])

  useEffect(() => {
    void loadProducts()
    window.addEventListener('farmdirect:products-changed', loadProducts)
    return () => window.removeEventListener('farmdirect:products-changed', loadProducts)
  }, [loadProducts])

  const handleArchive = async (product: Product) => {
    if (!window.confirm(`Archive ${product.name}?`)) return
    try {
      await archiveProduct(product.id)
      toast.success('Product archived.')
      await loadProducts()
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Unable to archive product.')
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Farmer dashboard</p>
          <h1 className="text-3xl font-bold text-gray-900">Your products</h1>
        </div>
        <Link to="/farm/products/new" className="btn-primary"><PackagePlus className="h-4 w-4" /> Add product</Link>
      </div>
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {isLoading ? <p className="mt-6 text-sm text-gray-500">Loading your products…</p> : products.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">You have no products yet.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="divide-y divide-gray-100">
            {products.map(product => (
              <article key={product.id} className="flex flex-wrap items-center gap-4 p-5">
                <div className="h-16 w-16 overflow-hidden rounded-xl bg-gray-100">
                  {product.images[0] && <img src={product.images[0]} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-[180px] flex-1">
                  <h2 className="font-semibold text-gray-900">{product.name}</h2>
                  <p className="mt-1 text-sm text-gray-500">{formatPrice(product.price_per_unit)} / {product.unit} · {product.quantity_available} available</p>
                  <p className="mt-1 text-xs text-gray-500">{product.is_archived ? 'Archived' : product.is_active ? 'Active' : 'Inactive'}</p>
                  <p className={`mt-1 text-xs ${product.is_active && !product.is_archived ? 'text-green-700' : 'text-gray-500'}`}>
                    {product.is_archived
                      ? 'Archived and not visible to customers.'
                      : product.is_active
                        ? 'Active and visible to customers.'
                        : 'Inactive and not visible to customers.'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/farm/products/${product.id}/edit`} className="btn-secondary">Edit</Link>
                  {!product.is_archived && (
                    <button type="button" onClick={() => void handleArchive(product)} className="btn-secondary text-red-700">
                      <Archive className="h-4 w-4" /> Archive
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
