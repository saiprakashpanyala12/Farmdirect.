import { Link } from 'react-router-dom'
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useCart } from '@/features/cart/CartContext'
import { formatPrice, productUnitPrice } from '@/lib/utils'
import EmptyState from '@/components/ui/EmptyState'

export default function CartPage() {
  const { items, farmerGroups, itemCount, subtotal, updateQuantity, removeItem } = useCart()

  if (!items.length) {
    return (
      <div className="container-main py-8">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Browse fresh produce from local farms and add a few items to get started."
          action={<Link to="/products" className="btn-primary">Browse products</Link>}
        />
      </div>
    )
  }

  return (
    <div className="container-main py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Your basket</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900">Shopping cart</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {farmerGroups.map(group => (
            <section key={group.farmerId} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-5 py-4">
                <h2 className="font-semibold text-gray-900">From {group.farmerName}</h2>
                <p className="mt-1 text-xs text-gray-500">Items from each farm may arrive separately.</p>
              </div>
              <div className="divide-y divide-gray-100">
                {group.items.map(({ product, quantity }) => {
                  const unitPrice = productUnitPrice(product, quantity)
                  return (
                    <div key={product.id} className="flex flex-wrap items-center gap-4 p-5">
                      <Link to={`/products/${product.id}`} className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                        {product.images[0] && <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />}
                      </Link>
                      <div className="min-w-[140px] flex-1">
                        <Link to={`/products/${product.id}`} className="font-semibold text-gray-900 hover:text-primary-700">{product.name}</Link>
                        <p className="mt-1 text-sm text-gray-500">{formatPrice(unitPrice)} / {product.unit}</p>
                      </div>
                      <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1">
                        <button
                          type="button"
                          aria-label={`Decrease ${product.name} quantity`}
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-100"
                        ><Minus className="h-4 w-4" /></button>
                        <span className="min-w-10 text-center text-sm font-semibold">{quantity} {product.unit}</span>
                        <button
                          type="button"
                          aria-label={`Increase ${product.name} quantity`}
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-100"
                        ><Plus className="h-4 w-4" /></button>
                      </div>
                      <div className="flex min-w-28 items-center justify-end gap-3">
                        <span className="font-semibold text-gray-900">{formatPrice(unitPrice * quantity)}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${product.name}`}
                          onClick={() => removeItem(product.id)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        ><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
          <Link to="/products" className="inline-flex text-sm font-medium text-primary-700 hover:text-primary-900">Continue shopping</Link>
        </div>

        <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">Order summary</h2>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between text-gray-600"><span>Items ({itemCount})</span><span>{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between text-gray-600"><span>Delivery</span><span>Calculated at checkout</span></div>
            <div className="border-t border-gray-100 pt-3">
              <div className="flex justify-between font-semibold text-gray-900"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            </div>
          </div>
          <Link to="/checkout" className="btn-primary mt-5 w-full justify-center">Continue to checkout</Link>
          <p className="mt-3 text-center text-xs text-gray-500">Delivery charges are grouped by farm.</p>
        </aside>
      </div>
    </div>
  )
}
