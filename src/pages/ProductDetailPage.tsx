import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Clock3, Leaf, MapPin, PackageCheck, ShieldCheck, ShoppingCart, Sprout, Truck } from 'lucide-react'
import ProductCard from '@/features/products/ProductCard'
import { useCart } from '@/features/cart/CartContext'
import { useProducts } from '@/features/products/useProducts'
import OrganicBadge from '@/components/ui/OrganicBadge'
import StarRating from '@/components/ui/StarRating'
import { IS_DEMO_MODE } from '@/lib/constants'
import { availableStock, formatDate, formatPrice, productUnitPrice, hasActiveSurplusOffer } from '@/lib/utils'

export default function ProductDetailPage() {
  const { id } = useParams()
  const { addItem } = useCart()
  const { products, isLoading, error } = useProducts()
  const product = products.find(item => item.id === id)
  const [quantity, setQuantity] = useState(product?.min_order_qty ?? 1)

  const relatedProducts = useMemo(
    () => products.filter(item => item.id !== id && item.category_id === product?.category_id).slice(0, 4),
    [id, product?.category_id, products]
  )

  if (isLoading) return <div className="container-main py-16 text-center text-gray-600">Loading product…</div>
  if (error) return <div role="alert" className="container-main py-16 text-center text-red-700">{error}</div>
  if (!product) {
    return (
      <div className="container-main py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Product not found</h1>
        <p className="mt-2 text-gray-600">This listing may have been removed or is no longer available.</p>
        <Link to="/products" className="btn-primary mt-6 inline-flex">Browse products</Link>
      </div>
    )
  }

  const stock = availableStock(product)
  const minQuantity = product.min_order_qty
  const maxQuantity = Math.min(stock, product.max_order_qty ?? stock)
  const quantityIsValid = quantity >= minQuantity && quantity <= maxQuantity
  const farmerName = product.farmer?.full_name ?? 'Local farmer'
  const farmLocation = [product.farm?.district, product.farm?.state].filter(Boolean).join(', ')

  const handleAddToCart = () => {
    if (quantityIsValid) addItem(product, quantity)
  }

  return (
    <div className="container-main py-8">
      <Link to="/products" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-700">
        <ArrowLeft className="h-4 w-4" /> Back to products
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl bg-gray-100">
          {product.images[0] ? (
            <img src={product.images[0]} alt={product.name} className="h-full min-h-[320px] w-full object-cover lg:min-h-[520px]" />
          ) : (
            <div className="flex min-h-[320px] items-center justify-center text-primary-400 lg:min-h-[520px]">
              <Leaf className="h-20 w-20" />
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="badge-green">{product.category?.name}</span>
            {hasActiveSurplusOffer(product) && <span className="badge-orange">Surplus offer</span>}
            {product.is_seasonal && <span className="badge-accent">Seasonal</span>}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
            {product.review_count > 0 ? (
              <StarRating rating={product.avg_rating ?? 0} showNumber count={product.review_count} />
            ) : <span>No reviews yet</span>}
            <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{farmLocation || 'India'}</span>
          </div>

          <p className="mt-5 leading-7 text-gray-600">{product.description}</p>

          <div className="mt-6 rounded-2xl border border-primary-100 bg-primary-50/60 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatPrice(productUnitPrice(product, Math.max(quantity, product.min_order_qty)))}{productUnitPrice(product, Math.max(quantity, product.min_order_qty)) < product.price_per_unit && <span className="ml-2 text-base font-normal text-gray-500 line-through">{formatPrice(product.price_per_unit)}</span>}<span className="ml-1 text-sm font-normal text-gray-500">/ {product.unit}</span></p>
                <p className={`mt-1 text-sm ${stock > 0 ? 'text-primary-700' : 'text-red-600'}`}>
                  {stock > 0 ? `${stock} ${product.unit} available` : 'Currently out of stock'}
                </p>
              </div>
              {product.bulk_price_tiers?.length ? (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary-700">Bulk rates</span>
              ) : null}
            </div>

            {product.bulk_price_tiers?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {[...product.bulk_price_tiers].sort((a, b) => a.min_qty - b.min_qty).map(tier => (
                  <span key={`${tier.min_qty}-${tier.price_per_unit}`} className="rounded-lg border border-primary-100 bg-white px-3 py-2 text-xs text-gray-600">
                    {tier.min_qty}+ {product.unit}: <strong className="text-gray-900">{formatPrice(tier.price_per_unit)}/{product.unit}</strong>
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <label htmlFor="product-quantity" className="sr-only">Quantity in {product.unit}</label>
              <input
                id="product-quantity"
                type="number"
                min={minQuantity}
                max={maxQuantity}
                step={minQuantity < 1 ? minQuantity : 1}
                value={quantity}
                onChange={event => setQuantity(Number(event.target.value))}
                className="input w-28"
                disabled={stock <= 0}
              />
              <button onClick={handleAddToCart} disabled={!quantityIsValid || stock <= 0} className="btn-primary flex-1 justify-center">
                <ShoppingCart className="h-4 w-4" /> Add to cart
              </button>
            </div>
            {!quantityIsValid && stock > 0 && (
              <p className="mt-2 text-xs text-red-600">Enter a quantity between {minQuantity} and {maxQuantity} {product.unit}.</p>
            )}
          </div>

          <Link to={`/farmer/${product.farmer_id}`} className="mt-6 flex items-center gap-4 rounded-2xl border border-gray-200 p-4 transition hover:border-primary-300">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700"><Sprout className="h-6 w-6" /></div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900">{farmerName}</p>
              <p className="truncate text-sm text-gray-500">{product.farm?.name ?? farmLocation}</p>
            </div>
            {product.farm?.trust_score != null && (
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">{product.farm.trust_score}/100 trust</span>
            )}
          </Link>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800"><ShieldCheck className="h-4 w-4 text-primary-600" /> Growing information</div>
              <div className="mt-3"><OrganicBadge status={product.organic_status} /></div>
              <p className="mt-2 text-xs text-gray-500">
                {product.organic_status === 'certified_organic'
                  ? 'Certification is listed for this product, but documentation has not been independently verified by the app.'
                  : 'Farmer-provided information; not independently verified.'}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Pesticide disclosure: {product.pesticide_status.replace(/_/g, ' ')}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800"><PackageCheck className="h-4 w-4 text-primary-600" /> Harvest & delivery</div>
              <p className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                <Clock3 className="h-4 w-4 text-gray-400" />
                {product.harvest_date ? `Harvested ${formatDate(product.harvest_date)}` : 'Harvest date not provided'}
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <Truck className="h-4 w-4 text-gray-400" /> Delivery availability depends on your location
              </p>
              {IS_DEMO_MODE && product.organic_status === 'certified_organic' && (
                <p className="mt-2 flex items-center gap-2 text-xs text-green-700"><CheckCircle className="h-4 w-4" /> Certification label is sample data</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="mt-14">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">More from this category</p>
              <h2 className="mt-1 text-2xl font-bold text-gray-900">You may also like</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {relatedProducts.map(related => <ProductCard key={related.id} product={related} compact />)}
          </div>
        </section>
      )}
    </div>
  )
}
