import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { cancelQuotation, listQuotations } from '@/lib/marketplace'
import type { QuotationRequest } from '@/types/database'
import { formatDate, formatPrice } from '@/lib/utils'

export default function QuotationBuyerPage() {
  const { profile } = useAuth()
  const [requests, setRequests] = useState<QuotationRequest[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!profile) return
    try {
      setRequests(await listQuotations('buyer_id', profile.id))
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load quotations.')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { void reload() }, [reload])

  const cancel = async (id: string) => {
    try {
      await cancelQuotation(id)
      await reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to cancel quotation.')
    }
  }

  return <div className="mx-auto max-w-7xl px-4 py-8 md:px-6"><div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Buyer dashboard</p><h1 className="text-3xl font-bold text-gray-900">Your quotations</h1>
    <p className="mt-2 text-sm text-gray-600">Requests are offers only; accepting a quote does not create an order or process payment.</p>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loading ? <p role="status" className="mt-5 text-sm text-gray-600">Loading quotations…</p>
      : requests.length === 0 ? <p className="mt-5 text-sm text-gray-600">You have no quotation requests. Visit <Link className="text-primary-700 underline" to="/bulk-ordering">bulk ordering</Link> to ask a farmer about a listed product.</p>
      : <div className="mt-6 space-y-3">{requests.map(item => <article key={item.id} className="rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between"><div><h2 className="font-semibold">{item.product?.name ?? 'Produce listing'}</h2><p className="text-sm text-gray-600">{item.requested_quantity} {item.product?.unit ?? 'units'} · {formatDate(item.created_at)}</p></div><span className="self-start rounded-full bg-gray-100 px-3 py-1 text-xs capitalize">{item.status}</span></div>
        {item.message && <p className="mt-3 text-sm text-gray-700">{item.message}</p>}
        {item.status === 'quoted' && <p className="mt-3 text-sm font-medium text-primary-800">Offer: {item.quoted_unit_price == null ? 'Price unavailable' : `${formatPrice(item.quoted_unit_price)} / ${item.product?.unit ?? 'unit'}`}{item.farmer_response ? ` — ${item.farmer_response}` : ''}</p>}
        {item.status === 'declined' && item.farmer_response && <p className="mt-3 text-sm text-gray-700">{item.farmer_response}</p>}
        {item.status === 'requested' && <button onClick={() => void cancel(item.id)} className="mt-3 text-sm font-medium text-red-700 underline">Cancel request</button>}
      </article>)}</div>}
  </div></div>
}
