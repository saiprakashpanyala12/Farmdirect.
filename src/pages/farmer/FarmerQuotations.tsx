import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { listQuotations, respondToQuotation } from '@/lib/marketplace'
import type { QuotationRequest } from '@/types/database'
import { formatDate, formatPrice } from '@/lib/utils'

export default function FarmerQuotations() {
  const { profile } = useAuth()
  const [requests, setRequests] = useState<QuotationRequest[]>([])
  const [answers, setAnswers] = useState<Record<string, { price: string; message: string }>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')

  const reload = useCallback(async () => {
    if (!profile) return
    try {
      setRequests(await listQuotations('farmer_id', profile.id))
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load quotation requests.')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { void reload() }, [reload])

  const respond = async (request: QuotationRequest, status: 'quoted' | 'declined') => {
    const answer = answers[request.id] ?? { price: '', message: '' }
    const price = Number(answer.price)
    if (status === 'quoted' && (!Number.isFinite(price) || price <= 0)) {
      setError('Enter a valid unit price before sending an offer.')
      return
    }
    setSavingId(request.id)
    setError('')
    try {
      await respondToQuotation(request.id, {
        status,
        quoted_unit_price: status === 'quoted' ? price : null,
        farmer_response: answer.message.trim(),
      })
      await reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to respond to request.')
    } finally {
      setSavingId('')
    }
  }

  return <div className="mx-auto max-w-7xl px-4 py-8 md:px-6"><div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Farmer dashboard</p><h1 className="text-3xl font-bold text-gray-900">Quotation requests</h1>
    <p className="mt-2 text-sm text-gray-600">An offer is not an order. Confirm availability and arrange fulfillment separately.</p>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loading ? <p role="status" className="mt-5 text-sm text-gray-600">Loading requests…</p>
      : requests.length === 0 ? <p className="mt-5 text-sm text-gray-600">There are no quotation requests for your products.</p>
      : <div className="mt-6 space-y-4">{requests.map(item => <article key={item.id} className="rounded-xl border border-gray-200 p-4">
        <div className="flex justify-between gap-3"><div><h2 className="font-semibold">{item.product?.name ?? 'Your product'}</h2><p className="text-sm text-gray-600">{item.requested_quantity} {item.product?.unit ?? 'units'} · {formatDate(item.created_at)}</p></div><span className="self-start rounded-full bg-gray-100 px-3 py-1 text-xs capitalize">{item.status}</span></div>
        {item.message && <p className="mt-3 text-sm text-gray-700">Buyer request: {item.message}</p>}
        {item.status === 'quoted' && <p className="mt-3 text-sm text-gray-700">Your offer: {item.quoted_unit_price == null ? '—' : `${formatPrice(item.quoted_unit_price)} / ${item.product?.unit ?? 'unit'}`}{item.farmer_response ? ` · ${item.farmer_response}` : ''}</p>}
        {item.status === 'requested' && <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">Offer price per unit<input className="input mt-1" type="number" min="0.01" step="0.01" value={answers[item.id]?.price ?? ''} onChange={event => setAnswers(current => ({ ...current, [item.id]: { price: event.target.value, message: current[item.id]?.message ?? '' } }))} /></label>
          <label className="text-sm font-medium">Note to buyer<input className="input mt-1" maxLength={2000} value={answers[item.id]?.message ?? ''} onChange={event => setAnswers(current => ({ ...current, [item.id]: { price: current[item.id]?.price ?? '', message: event.target.value } }))} /></label>
          <div className="flex gap-2 sm:col-span-2"><button disabled={savingId === item.id} onClick={() => void respond(item, 'quoted')} className="btn-primary justify-center disabled:opacity-50">Send offer</button><button disabled={savingId === item.id} onClick={() => void respond(item, 'declined')} className="btn-secondary justify-center disabled:opacity-50">Decline</button></div>
        </div>}
      </article>)}</div>}
  </div></div>
}
