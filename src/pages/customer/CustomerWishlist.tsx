import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Trash2 } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useCart } from '@/features/cart/CartContext'
import { useWishlist } from '@/features/wishlist/WishlistContext'
import { listWishlistProducts } from '@/lib/marketplace'
import { supabase } from '@/lib/supabase'
import type { Product } from '@/types/database'
import { availableStock, formatPrice, productUnitPrice } from '@/lib/utils'
import StarRating from '@/components/ui/StarRating'

interface WishlistProduct {
  product_id: string
  created_at: string
  product: Product | null
}

export default function CustomerWishlist() {
  const { profile } = useAuth()
  const { addItem } = useCart()
  const { toggleWishlist, refreshWishlist } = useWishlist()
  const [entries, setEntries] = useState<WishlistProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!profile || !supabase) {
      setEntries([])
      setError('Wishlist data requires a connected Supabase account.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      setEntries(await listWishlistProducts(profile.id))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load your wishlist.')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { void load() }, [load])

  const remove = async (productId: string) => {
    if (await toggleWishlist(productId)) {
      setEntries(current => current.filter(entry => entry.product_id !== productId))
      await refreshWishlist()
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">FarmDirect</p>
          <h1 className="text-3xl font-bold text-gray-900">Wishlist</h1>
          <p className="mt-2 text-sm text-gray-600">Products saved to your account.</p>
        </div>
        <span className="badge-gray">{entries.length} saved</span>
      </header>

      {error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {loading ? <p role="status" className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">Loading your wishlist…</p>
        : entries.length === 0 && !error ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <Heart className="mx-auto h-8 w-8 text-primary-500" />
            <h2 className="mt-3 text-lg font-semibold text-gray-900">Your wishlist is empty</h2>
            <p className="mt-1 text-sm text-gray-600">Save marketplace products with the heart button to find them here.</p>
            <Link to="/products" className="btn-primary mt-5 inline-flex">Browse products</Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map(entry => {
              const product = entry.product
              if (!product) {
                return (
                  <article key={entry.product_id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-sm text-gray-600">This saved listing is no longer available.</p>
                    <button onClick={() => void remove(entry.product_id)} className="btn-secondary inline-flex items-center gap-2">
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  </article>
                )
              }
              const stock = availableStock(product)
              const canOrder = stock >= product.min_order_qty
              return (
                <article key={product.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <Link to={`/products/${product.id}`} className="block">
                    {product.images?.[0]
                      ? <img src={product.images[0]} alt={product.name} className="h-48 w-full object-cover" loading="lazy" />
                      : <div className="flex h-48 items-center justify-center bg-gray-50 text-sm text-gray-500">No product image</div>}
                  </Link>
                  <div className="p-4">
                    <p className="text-xs text-primary-700">{product.farm?.name ?? 'FarmDirect farm'}</p>
                    <Link to={`/products/${product.id}`} className="mt-1 block font-semibold text-gray-900 hover:text-primary-700">{product.name}</Link>
                    <p className="mt-1 text-xs text-gray-500">{[product.farm?.district, product.farm?.state].filter(Boolean).join(', ')}</p>
                    <div className="mt-2">
                      {product.review_count > 0
                        ? <StarRating rating={product.avg_rating ?? 0} showNumber count={product.review_count} />
                        : <span className="text-xs text-gray-500">No reviews yet</span>}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="font-bold text-gray-900">{formatPrice(productUnitPrice(product, product.min_order_qty))}/{product.unit}</span>
                      <span className={canOrder ? 'text-green-700' : 'text-red-600'}>
                        {stock <= 0 ? 'Unavailable' : canOrder ? `${stock} available` : `Below ${product.min_order_qty} ${product.unit} minimum`}
                      </span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        disabled={!canOrder}
                        onClick={() => addItem(product)}
                        className="btn-primary flex flex-1 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ShoppingCart className="h-4 w-4" /> {canOrder ? 'Add to cart' : 'Unavailable'}
                      </button>
                      <button aria-label={`Remove ${product.name} from wishlist`} onClick={() => void remove(product.id)} className="btn-secondary">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
    </div>
  )
}
