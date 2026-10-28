import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '@/features/auth/AuthContext'
import { listFarmerProducts, updateProductStock } from '@/lib/marketplace'
import type { Product } from '@/types/database'

export default function FarmerInventory() {
  const { profile } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadProducts = useCallback(async () => {
    if (!profile) return
    try {
      const result = await listFarmerProducts(profile.id)
      setProducts(result)
      setQuantities(Object.fromEntries(result.map(product => [product.id, String(product.quantity_available)])))
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load inventory.')
    } finally {
      setIsLoading(false)
    }
  }, [profile])

  useEffect(() => {
    void loadProducts()
    window.addEventListener('farmdirect:products-changed', loadProducts)
    return () => window.removeEventListener('farmdirect:products-changed', loadProducts)
  }, [loadProducts])

  const save = async (product: Product) => {
    const quantity = Number(quantities[product.id])
    if (!Number.isFinite(quantity) || quantity < (product.quantity_reserved ?? 0)) {
      setError(`Stock must be a valid number and cannot be less than the quantity already reserved for ${product.name}.`)
      return
    }
    try {
      await updateProductStock(product.id, quantity)
      toast.success('Inventory updated.')
      await loadProducts()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update inventory.')
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Farmer dashboard</p>
        <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
      </div>
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {isLoading ? <p className="mt-6 text-sm text-gray-500">Loading inventory…</p> : products.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
          No products to manage. <Link className="font-semibold text-primary-700" to="/farm/products/new">Add a product</Link>
        </p>
      ) : (
        <div className="mt-6 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {products.map(product => (
            <div key={product.id} className="flex flex-wrap items-center gap-4 p-5">
              <div className="min-w-[180px] flex-1">
                <p className="font-semibold text-gray-900">{product.name}</p>
                <p className="mt-1 text-sm text-gray-500">{product.quantity_reserved ?? 0} reserved · {Math.max(0, product.quantity_available - (product.quantity_reserved ?? 0))} available</p>
              </div>
              <label className="block w-36">
                <span className="label">Total stock</span>
                <input className="input" type="number" min={String(product.quantity_reserved ?? 0)} step="0.001" value={quantities[product.id] ?? ''} onChange={event => setQuantities(current => ({ ...current, [product.id]: event.target.value }))} />
              </label>
              <button type="button" className="btn-primary" onClick={() => void save(product)}>Save stock</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
