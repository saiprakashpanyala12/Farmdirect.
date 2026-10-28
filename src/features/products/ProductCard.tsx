import { Link } from 'react-router-dom'
import { ShoppingCart, Heart, MapPin, Leaf, Zap, Tag } from 'lucide-react'
import type { Product } from '@/types/database'
import { useCart } from '@/features/cart/CartContext'
import { useWishlist } from '@/features/wishlist/WishlistContext'
import { formatPrice, availableStock, ORGANIC_LABELS, GRADE_COLORS, cn, productUnitPrice, hasActiveSurplusOffer } from '@/lib/utils'
import StarRating from '@/components/ui/StarRating'
import OrganicBadge from '@/components/ui/OrganicBadge'

interface Props {
  product: Product
  compact?: boolean
}

export default function ProductCard({ product, compact = false }: Props) {
  const { addItem } = useCart()
  const { productIds, isLoading: wishlistLoading, toggleWishlist } = useWishlist()
  const isWishlisted = productIds.has(product.id)
  const available = availableStock(product)
  const isOutOfStock = available <= 0
  const cannotOrder = available < product.min_order_qty
  const isLowStock   = available > 0 && available <= 10
  const hasBulk      = (product.bulk_price_tiers?.length ?? 0) > 0
  const image        = product.images?.[0]
  const displayPrice = productUnitPrice(product, product.min_order_qty)
  const hasDiscount = displayPrice < product.price_per_unit
  const hasSurplusOffer = hasActiveSurplusOffer(product)

  return (
    <div className="card-hover group flex flex-col overflow-hidden">
      {/* Image */}
      <div className="relative overflow-hidden aspect-[4/3] bg-gray-100 flex-shrink-0">
        {image ? (
          <img src={image} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-50 to-accent-50">
            <Leaf className="w-12 h-12 text-primary-300" />
          </div>
        )}

        {/* Top-left badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {hasActiveSurplusOffer(product) && <span className="badge bg-orange-500 text-white text-[10px] font-bold"><Tag className="w-3 h-3" />SURPLUS</span>}
          {product.is_seasonal && <span className="badge bg-accent-500 text-white text-[10px]"><Zap className="w-3 h-3" />SEASONAL</span>}
          {isLowStock          && <span className="badge bg-amber-500 text-white text-[10px]">Low Stock</span>}
          {isOutOfStock        && <span className="badge bg-red-500 text-white text-[10px]">Out of Stock</span>}
        </div>

        {/* Grade top-right */}
        {product.grade && (
          <div className="absolute top-2 right-2">
            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border', GRADE_COLORS[product.grade] ?? GRADE_COLORS['a'])}>
              Grade {product.grade.toUpperCase()}
            </span>
          </div>
        )}

        {/* Wishlist */}
        <button
          type="button"
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={isWishlisted}
          disabled={wishlistLoading}
          onClick={() => void toggleWishlist(product.id)}
          className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3">
        <p className="text-[10px] text-primary-600 font-medium mb-0.5 uppercase tracking-wide">{product.category?.name}</p>
        <Link to={`/products/${product.id}`} className="hover:text-primary-700 transition-colors">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 mb-1">{product.name}</h3>
        </Link>
        <Link to={`/farmer/${product.farmer_id}`} className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 transition-colors mb-2">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{product.farm?.name ?? 'Local farm'} · {product.farm?.district}</span>
        </Link>

        <div className="flex flex-wrap gap-1 mb-2">
          <OrganicBadge status={product.organic_status} compact />
          {product.pesticide_status === 'none_used' && (
            <span className="badge-green text-[10px]"><Leaf className="w-3 h-3" />No Pesticides</span>
          )}
        </div>

        {product.review_count > 0 ? (
          <div className="mb-2"><StarRating rating={product.avg_rating ?? 0} showNumber count={product.review_count} /></div>
        ) : (
          <p className="text-[10px] text-gray-400 mb-2">No reviews yet</p>
        )}

        {!compact && product.harvest_date && (
          <p className="text-[10px] text-gray-400 mb-1">
            Harvested: {new Date(product.harvest_date).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
          </p>
        )}

        <div className="flex-1" />

        {hasSurplusOffer && <p className="text-[10px] text-orange-700 font-medium mb-1"><Tag className="w-3 h-3 inline mr-0.5" />Surplus price available</p>}
        {hasBulk && <p className="text-[10px] text-primary-600 font-medium mb-1"><Zap className="w-3 h-3 inline mr-0.5" />Bulk discounts available</p>}
        {product.min_order_qty > 1 && <p className="text-[10px] text-gray-400 mb-1">Min: {product.min_order_qty} {product.unit}</p>}

        <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-gray-50">
          <div>
            <span className="text-base font-bold text-gray-900">{formatPrice(displayPrice)}</span>
            {hasDiscount && <span className="ml-1 text-xs text-gray-500 line-through">{formatPrice(product.price_per_unit)}</span>}
            <span className="text-[10px] text-gray-500 ml-0.5">/{product.unit}</span>
          </div>
          <button
            onClick={() => !cannotOrder && addItem(product)}
            disabled={cannotOrder}
            className={cn('btn-sm flex items-center gap-1', cannotOrder ? 'btn-secondary opacity-50 cursor-not-allowed' : 'btn-primary')}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            {isOutOfStock ? 'Sold Out' : cannotOrder ? 'Below minimum' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}
