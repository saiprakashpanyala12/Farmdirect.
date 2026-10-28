import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { listFarmerOrders, type FarmerOrderItem } from '@/lib/marketplace'
import { formatPrice } from '@/lib/utils'
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

type RangeDays = 30 | 90 | 365

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function asDateKey(value?: string) {
  return value ? value.slice(0, 10) : ''
}

function isRevenueOrder(item: FarmerOrderItem) {
  return item.order?.payment_status === 'paid' &&
    item.order.status !== 'cancelled' &&
    item.order.status !== 'refunded' &&
    item.order.status !== 'refund_requested'
}

export default function FarmerAnalytics() {
  const { profile } = useAuth()
  const [items, setItems] = useState<FarmerOrderItem[]>([])
  const [range, setRange] = useState<RangeDays>(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!profile) return
    try {
      setItems(await listFarmerOrders(profile.id))
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load sales analytics.')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { void load() }, [load])

  const analytics = useMemo(() => {
    const now = new Date()
    const start = new Date(now)
    start.setDate(start.getDate() - (range - 1))
    start.setHours(0, 0, 0, 0)
    const previousStart = new Date(start)
    previousStart.setDate(previousStart.getDate() - range)
    const chart = new Map<string, { date: string; revenue: number; units: number }>()
    for (let offset = 0; offset < range; offset += 1) {
      const date = new Date(start)
      date.setDate(start.getDate() + offset)
      const key = dayKey(date)
      chart.set(key, { date: key, revenue: 0, units: 0 })
    }

    let revenue = 0
    let units = 0
    let previousRevenue = 0
    let previousUnits = 0
    let pendingTestValue = 0
    const orders = new Map<string, FarmerOrderItem['order']>()
    const productTotals = new Map<string, { name: string; revenue: number; units: number }>()
    let paidItemCount = 0
    for (const item of items) {
      const order = item.order
      if (!order) continue
      orders.set(order.id, order)
      const created = new Date(order.created_at)
      const time = created.getTime()
      const lineValue = Number(item.total_price)
      const qty = Number(item.quantity)
      if (!Number.isFinite(lineValue) || !Number.isFinite(qty)) continue
      if (order.payment_status === 'pending' && order.status === 'pending') pendingTestValue += lineValue
      if (!isRevenueOrder(item)) continue
      if (time >= previousStart.getTime() && time < start.getTime()) {
        previousRevenue += lineValue
        previousUnits += qty
      }
      if (time < start.getTime() || time > now.getTime()) continue
      revenue += lineValue
      units += qty
      paidItemCount += 1
      const key = asDateKey(order.created_at)
      const entry = chart.get(key)
      if (entry) {
        entry.revenue += lineValue
        entry.units += qty
      }
      const existing = productTotals.get(item.product_id) ?? { name: item.product_name, revenue: 0, units: 0 }
      existing.revenue += lineValue
      existing.units += qty
      productTotals.set(item.product_id, existing)
    }

    const statuses = new Map<string, number>()
    for (const order of orders.values()) {
      if (order) statuses.set(order.status, (statuses.get(order.status) ?? 0) + 1)
    }
    return {
      revenue,
      units,
      previousRevenue,
      previousUnits,
      pendingTestValue,
      chart: Array.from(chart.values()),
      topProducts: Array.from(productTotals.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      statuses: Array.from(statuses.entries()).sort((a, b) => b[1] - a[1]),
      averagePrice: units ? revenue / units : 0,
      hasPaidRecords: paidItemCount > 0,
    }
  }, [items, range])

  const percentage = analytics.previousRevenue > 0
    ? ((analytics.revenue - analytics.previousRevenue) / analytics.previousRevenue) * 100
    : null

  return <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Farmer dashboard</p><h1 className="text-3xl font-bold text-gray-900">Sales analytics</h1><p className="mt-2 text-sm text-gray-600">Revenue below counts only paid orders and excludes cancelled, refunded, and refund-requested items.</p></div><label className="text-sm font-medium">Date range<select className="select mt-1 min-w-40" value={range} onChange={event => setRange(Number(event.target.value) as RangeDays)}><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={365}>Last 12 months</option></select></label></header>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loading ? <p role="status" className="mt-6 text-sm text-gray-600">Loading your sales…</p> : items.length === 0 ? <p className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">No order items have been received for your products yet.</p> : <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Paid sales" value={formatPrice(analytics.revenue)} detail="Farmer's own line items" />
        <Metric label="Paid units sold" value={analytics.units.toLocaleString()} detail={`Average ${formatPrice(analytics.averagePrice)} per unit`} />
        <Metric label="Pending unpaid test items" value={formatPrice(analytics.pendingTestValue)} detail="Not counted as revenue" />
        <Metric label="Previous-period comparison" value={percentage === null ? '—' : `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`} detail={percentage === null ? 'No prior paid sales to compare' : `Prior period sales: ${formatPrice(analytics.previousRevenue)}`} />
      </div>
      {!analytics.hasPaidRecords && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">There are no paid orders in this range. Test checkout orders remain pending and unpaid, so they are excluded from sales revenue and units sold.</p>}
      <section className="mt-7 rounded-2xl border border-gray-200 bg-white p-5"><h2 className="font-semibold">Paid sales by day</h2><p className="mt-1 text-xs text-gray-500">Each value sums only your own order-item line totals; multi-farmer order totals are not counted.</p><div className="mt-4 h-72 w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><AreaChart data={analytics.chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={value => String(value).slice(5)} minTickGap={24} /><YAxis tickFormatter={value => `₹${value}`} width={72} /><Tooltip formatter={(value, name) => [name === 'revenue' ? formatPrice(Number(value)) : Number(value), name === 'revenue' ? 'Paid revenue' : 'Units']} /><Area type="monotone" dataKey="revenue" stroke="#15803d" fill="#bbf7d0" /></AreaChart></ResponsiveContainer></div></section>
      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5"><h2 className="font-semibold">Best-selling products</h2>{analytics.topProducts.length === 0 ? <p className="mt-3 text-sm text-gray-600">No paid product sales in this date range.</p> : <ol className="mt-3 divide-y divide-gray-100">{analytics.topProducts.map(product => <li key={product.name} className="flex justify-between gap-3 py-3 text-sm"><span>{product.name}<span className="ml-2 text-gray-500">{product.units} units</span></span><strong>{formatPrice(product.revenue)}</strong></li>)}</ol>}</section>
        <section className="rounded-2xl border border-gray-200 bg-white p-5"><h2 className="font-semibold">Order status distribution</h2>{analytics.statuses.length === 0 ? <p className="mt-3 text-sm text-gray-600">No order statuses to report.</p> : <ul className="mt-3 divide-y divide-gray-100">{analytics.statuses.map(([status, count]) => <li key={status} className="flex justify-between py-3 text-sm"><span className="capitalize">{status}</span><strong>{count} {count === 1 ? 'order' : 'orders'}</strong></li>)}</ul>}</section>
      </div>
      <p className="mt-5 text-xs text-gray-500">Customer identity and repeat-customer metrics are not included because this farmer view intentionally does not retrieve buyer identifiers. Inventory turnover and expense-adjusted earnings require reliable inventory snapshots and allocated costs, which are not yet available.</p>
    </>}
  </div>
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="rounded-2xl border border-gray-200 bg-white p-5"><p className="text-sm text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold text-gray-900">{value}</p><p className="mt-1 text-xs text-gray-500">{detail}</p></article>
}
