import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { getFarmerFarm, listFarmerOrders } from '@/lib/marketplace'
import type { Farm } from '@/types/database'

export default function FarmerTrustScore() {
  const { profile } = useAuth()
  const [farm, setFarm] = useState<Farm | null>(null)
  const [paidDelivered, setPaidDelivered] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!profile) return
    try {
      const [farmRow, orderItems] = await Promise.all([
        getFarmerFarm(profile.id),
        listFarmerOrders(profile.id),
      ])
      setFarm(farmRow)
      const completed = new Set(orderItems
        .filter(item => item.order?.payment_status === 'paid' && item.order.status === 'delivered')
        .map(item => item.order?.id)
        .filter((id): id is string => Boolean(id)))
      setPaidDelivered(completed.size)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load your account standing.')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { void load() }, [load])

  return <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
    <header><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Farmer dashboard</p><h1 className="text-3xl font-bold text-gray-900">Seller insights</h1><p className="mt-2 text-sm text-gray-600">Review your farm presence and completed paid orders.</p></header>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loading ? <p role="status" className="mt-6 text-sm text-gray-600">Loading seller insights…</p> : <div className="mt-6 space-y-4">
      <Signal label="Farm profile" value={farm ? `${farm.name} · ${farm.state}` : 'Profile unavailable'} />
      <Signal label="Paid and delivered orders" value={paidDelivered === null ? 'Unavailable' : String(paidDelivered)} />
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Review-based ratings are not available in the current database schema. Product rating summary fields alone are not sufficient evidence to calculate or display a seller score.
      </div>
    </div>}
  </div>
}

function Signal({ label, value }: { label: string; value: string }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-5"><span className="text-sm text-gray-600">{label}</span><strong className="capitalize text-gray-900">{value}</strong></div>
}
