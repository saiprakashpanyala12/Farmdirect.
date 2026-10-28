import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, PackageOpen } from 'lucide-react'
import { useProducts } from '@/features/products/useProducts'
import { useCart } from '@/features/cart/CartContext'
import { useAuth } from '@/features/auth/AuthContext'
import { requestQuotation } from '@/lib/marketplace'
import { availableStock, formatPrice, productUnitPrice } from '@/lib/utils'

export default function BulkOrderingPage() {
  const { products, isLoading, error } = useProducts()
  const { addItem } = useCart()
  const { profile } = useAuth()
  const [selectedId, setSelectedId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [message, setMessage] = useState('')
  const [quoteError, setQuoteError] = useState('')
  const [quoteNotice, setQuoteNotice] = useState('')
  const [quoteNoticeId, setQuoteNoticeId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const bulkProducts = products.filter(product =>
    product.quantity_available > 0 &&
    ((product.bulk_price_tiers?.length ?? 0) > 0 || product.min_order_qty > 1 || (product.bulk_discount_percent ?? 0) > 0)
  )

  return (
    <div className="container-main py-8">
      <header className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Direct from farms</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Bulk ordering</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">Browse live listings with a minimum order above one unit or published bulk pricing. Product availability and final stock are revalidated when a test order is placed.</p>
      </header>
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
        : isLoading ? <p role="status" className="text-sm text-gray-600">Loading current listings…</p>
        : bulkProducts.length === 0 ? <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center"><PackageOpen className="mx-auto h-10 w-10 text-gray-400" /><h2 className="mt-3 text-lg font-semibold">No bulk listings available</h2><p className="mt-1 text-sm text-gray-600">There are no live products with bulk quantities or tier pricing right now.</p><Link className="mt-4 inline-block text-sm font-medium text-primary-700 underline" to="/products">Browse all available products</Link></div>
        : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bulkProducts.map(product => {
            const minQty = product.min_order_qty
            const stock = availableStock(product)
            const canOrderMinimum = stock >= minQty
            const unitPrice = productUnitPrice(product, minQty)
            const isSelected = selectedId === product.id
            return <article key={product.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <Link to={`/products/${product.id}`} className="block h-44 bg-gray-100">
                {product.images[0] ? <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-gray-500">No product image</div>}
              </Link>
              <div className="p-5">
                <h2 className="font-semibold text-gray-900"><Link to={`/products/${product.id}`}>{product.name}</Link></h2>
                <p className="mt-1 text-sm text-gray-500">{product.farm?.name ?? 'Farm'} · {product.category?.name ?? 'Produce'}</p>
                <p className="mt-3 text-sm text-gray-700">Minimum: {minQty} {product.unit} · In stock: {stock} {product.unit}</p>
                <p className="mt-1 font-semibold text-primary-800">{formatPrice(unitPrice)} / {product.unit} <span className="text-xs font-normal text-gray-500">at minimum quantity</span></p>
                {(product.bulk_price_tiers?.length ?? 0) > 0 && <p className="mt-2 text-xs text-green-700">Bulk price tiers available</p>}
                <button disabled={!canOrderMinimum} onClick={() => addItem(product, minQty)} className="btn-primary mt-4 w-full justify-center disabled:cursor-not-allowed disabled:opacity-50">
                  <ShoppingCart className="h-4 w-4" /> {canOrderMinimum ? `Add ${minQty} ${product.unit} to cart` : 'Below minimum stock'}
                </button>
                {profile?.role === 'customer' || profile?.role === 'business' ? (
                  isSelected ? <form className="mt-4 space-y-3 border-t border-gray-100 pt-4" onSubmit={async event => {
                    event.preventDefault()
                    const requested = Number(quantity)
                    if (!Number.isFinite(requested) || requested < minQty || requested > 100000) {
                      setQuoteError(`Enter a quantity from ${minQty} to 100,000 ${product.unit}.`)
                      return
                    }
                    setSubmitting(true)
                    setQuoteError('')
                    setQuoteNotice('')
                    try {
                      await requestQuotation({
                        buyer_id: profile.id,
                        farmer_id: product.farmer_id,
                        product_id: product.id,
                        requested_quantity: requested,
                        message: message.trim(),
                      })
                      setQuoteNotice('Your request has been sent to the farmer. It does not reserve stock or place an order.')
                      setQuoteNoticeId(product.id)
                      setSelectedId('')
                      setQuantity('')
                      setMessage('')
                    } catch (caught) {
                      setQuoteError(caught instanceof Error ? caught.message : 'Unable to send quotation request.')
                    } finally {
                      setSubmitting(false)
                    }
                  }}>
                    <label className="block text-sm font-medium">Requested quantity<input className="input mt-1" type="number" min={minQty} max="100000" step="0.001" required value={quantity} onChange={event => setQuantity(event.target.value)} /></label>
                    <label className="block text-sm font-medium">Message (optional)<textarea className="input mt-1 min-h-20" maxLength={2000} value={message} onChange={event => setMessage(event.target.value)} /></label>
                    {quoteError && <p role="alert" className="text-sm text-red-700">{quoteError}</p>}
                    <div className="flex gap-2"><button disabled={submitting} className="btn-primary flex-1 justify-center disabled:opacity-50">{submitting ? 'Sending…' : 'Send request'}</button><button type="button" className="btn-secondary" onClick={() => { setSelectedId(''); setQuoteError('') }}>Cancel</button></div>
                  </form> : <button className="btn-secondary mt-2 w-full justify-center" onClick={() => { setSelectedId(product.id); setQuantity(String(minQty)); setQuoteError(''); setQuoteNotice('') }}>Request a quote</button>
                ) : <Link className="btn-secondary mt-2 w-full justify-center" to="/login">Sign in as a buyer to request a quote</Link>}
                {quoteNotice && quoteNoticeId === product.id && <p role="status" className="mt-3 text-xs text-green-700">{quoteNotice}</p>}
              </div>
            </article>
          })}
        </div>}
    </div>
  )
}
