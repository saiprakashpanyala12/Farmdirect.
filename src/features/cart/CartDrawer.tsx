import { X, ShoppingCart, Trash2, Plus, Minus, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart } from './CartContext'
import { formatPrice, productUnitPrice } from '@/lib/utils'

export default function CartDrawer() {
  const { isOpen, closeCart, items, removeItem, updateQuantity, itemCount, subtotal, farmerGroups } = useCart()

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/40 z-40" onClick={closeCart} />}
      <div className={`fixed right-0 top-0 h-full w-full sm:w-96 bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary-600" />
            <h2 className="font-bold text-gray-900">Your Cart</h2>
            {itemCount > 0 && <span className="badge-green text-xs">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>}
          </div>
          <button onClick={closeCart} className="btn-icon"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <ShoppingCart className="w-16 h-16 text-gray-200 mb-4" />
              <h3 className="font-semibold text-gray-700 mb-1">Your cart is empty</h3>
              <p className="text-sm text-gray-400 mb-6">Explore fresh produce from local farmers</p>
              <Link to="/products" onClick={closeCart} className="btn-primary">Browse Products</Link>
            </div>
          ) : (
            <div className="space-y-4 px-4">
              {farmerGroups.map(group => (
                <div key={group.farmerId}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{group.farmerName}</p>
                  <div className="space-y-3">
                    {group.items.map(({ product, quantity }) => {
                      const unitPrice = productUnitPrice(product, quantity)
                      const isBulk   = unitPrice < product.price_per_unit
                      return (
                        <div key={product.id} className="flex gap-3 bg-gray-50 rounded-xl p-3">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                            {product.images?.[0] && <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                            <p className="text-xs text-gray-500 mb-2">
                              {formatPrice(unitPrice)}/{product.unit}
                              {isBulk && <span className="ml-1 text-primary-600 font-medium">Bulk</span>}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-0.5">
                                <button onClick={() => updateQuantity(product.id, quantity - 1)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100"><Minus className="w-3.5 h-3.5" /></button>
                                <span className="text-sm font-semibold w-6 text-center">{quantity}</span>
                                <button onClick={() => updateQuantity(product.id, quantity + 1)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100"><Plus className="w-3.5 h-3.5" /></button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-900">{formatPrice(unitPrice * quantity)}</span>
                                <button onClick={() => removeItem(product.id)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 hover:text-red-500 text-gray-400">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-gray-100 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal ({itemCount} items)</span>
              <span className="font-bold text-gray-900">{formatPrice(subtotal)}</span>
            </div>
            <p className="text-xs text-gray-400 text-center">Delivery charges calculated at checkout</p>
            <Link to="/checkout" onClick={closeCart} className="btn-primary w-full justify-center btn-lg">
              Checkout <ArrowRight className="w-5 h-5" />
            </Link>
            <button onClick={closeCart} className="btn-ghost w-full justify-center text-sm">Continue Shopping</button>
          </div>
        )}
      </div>
    </>
  )
}
