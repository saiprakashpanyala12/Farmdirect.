import { useCallback, useEffect, useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/features/auth/AuthContext'
import {
  deleteHarvestEntry, listFarmerProducts, listHarvestEntries, saveHarvestEntry,
} from '@/lib/marketplace'
import type { HarvestEntry, HarvestStatus, Product } from '@/types/database'
import { formatDate } from '@/lib/utils'

const blank = () => ({
  cropName: '', productId: '', plantingDate: '', expectedDate: '', expectedQuantity: '',
  actualDate: '', actualQuantity: '', unit: 'kg' as Product['unit'], status: 'planned' as HarvestStatus, notes: '',
})

export default function FarmerHarvest() {
  const { profile } = useAuth()
  const [entries, setEntries] = useState<HarvestEntry[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState(blank)
  const [editingId, setEditingId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!profile) return
    try {
      const [harvestRows, productRows] = await Promise.all([
        listHarvestEntries(profile.id),
        listFarmerProducts(profile.id),
      ])
      setEntries(harvestRows)
      setProducts(productRows)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load harvest records.')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { void load() }, [load])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!profile) return setError('Sign in to manage harvest entries.')
    const expected = form.expectedQuantity === '' ? null : Number(form.expectedQuantity)
    const actual = form.actualQuantity === '' ? null : Number(form.actualQuantity)
    if (!form.cropName.trim() || (expected !== null && (!Number.isFinite(expected) || expected < 0)) ||
        (actual !== null && (!Number.isFinite(actual) || actual < 0))) {
      return setError('Enter a crop name and valid non-negative harvest quantities.')
    }
    if (form.status === 'harvested' && (!form.actualDate || actual === null)) {
      return setError('For a harvested entry, enter the actual harvest date and quantity.')
    }
    setSaving(true)
    setError('')
    try {
      await saveHarvestEntry(profile.id, {
        product_id: form.productId || null,
        crop_name: form.cropName.trim(),
        planting_date: form.plantingDate || null,
        expected_harvest_date: form.expectedDate || null,
        expected_quantity: expected,
        actual_harvest_date: form.actualDate || null,
        actual_quantity: actual,
        unit: form.unit,
        status: form.status,
        notes: form.notes.trim(),
      }, editingId || undefined)
      toast.success(editingId ? 'Harvest entry updated.' : 'Harvest entry saved.')
      setEditingId('')
      setForm(blank())
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save harvest entry.')
    } finally {
      setSaving(false)
    }
  }

  const edit = (entry: HarvestEntry) => {
    setEditingId(entry.id)
    setForm({
      cropName: entry.crop_name,
      productId: entry.product_id ?? '',
      plantingDate: entry.planting_date ?? '',
      expectedDate: entry.expected_harvest_date ?? '',
      expectedQuantity: entry.expected_quantity == null ? '' : String(entry.expected_quantity),
      actualDate: entry.actual_harvest_date ?? '',
      actualQuantity: entry.actual_quantity == null ? '' : String(entry.actual_quantity),
      unit: entry.unit,
      status: entry.status,
      notes: entry.notes,
    })
  }

  const remove = async (entry: HarvestEntry) => {
    if (!profile || !window.confirm(`Delete harvest entry for ${entry.crop_name}?`)) return
    try {
      await deleteHarvestEntry(profile.id, entry.id)
      toast.success('Harvest entry deleted.')
      if (editingId === entry.id) {
        setEditingId('')
        setForm(blank())
      }
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to delete harvest entry.')
    }
  }

  const set = <K extends keyof ReturnType<typeof blank>>(key: K, value: ReturnType<typeof blank>[K]) =>
    setForm(current => ({ ...current, [key]: value }))

  return <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
    <header><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Farmer dashboard</p><h1 className="text-3xl font-bold text-gray-900">Harvest calendar</h1><p className="mt-2 text-sm text-gray-600">Maintain your own crop schedule and actual harvest records. Entries are estimates until marked harvested.</p></header>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loading ? <p role="status" className="mt-6 text-sm text-gray-600">Loading harvest calendar…</p> : <>
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold">{editingId ? 'Edit harvest entry' : 'Add harvest entry'}</h2>
        <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-medium">Crop or product name<input className="input mt-1" required maxLength={120} value={form.cropName} onChange={event => set('cropName', event.target.value)} /></label>
          <label className="text-sm font-medium">Link to product (optional)<select className="select mt-1" value={form.productId} onChange={event => { const product = products.find(item => item.id === event.target.value); setForm(current => ({ ...current, productId: event.target.value, ...(product ? { cropName: product.name, unit: product.unit } : {}) })) }}><option value="">Not linked</option>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
          <label className="text-sm font-medium">Status<select className="select mt-1" value={form.status} onChange={event => set('status', event.target.value as HarvestStatus)}>{(['planned', 'growing', 'harvested', 'cancelled'] as const).map(status => <option key={status} value={status}>{status}</option>)}</select></label>
          <label className="text-sm font-medium">Planting date<input className="input mt-1" type="date" value={form.plantingDate} onChange={event => set('plantingDate', event.target.value)} /></label>
          <label className="text-sm font-medium">Expected harvest date<input className="input mt-1" type="date" value={form.expectedDate} onChange={event => set('expectedDate', event.target.value)} /></label>
          <label className="text-sm font-medium">Expected quantity<input className="input mt-1" type="number" min="0" step="0.001" value={form.expectedQuantity} onChange={event => set('expectedQuantity', event.target.value)} /></label>
          <label className="text-sm font-medium">Actual harvest date<input className="input mt-1" type="date" value={form.actualDate} onChange={event => set('actualDate', event.target.value)} /></label>
          <label className="text-sm font-medium">Actual quantity<input className="input mt-1" type="number" min="0" step="0.001" value={form.actualQuantity} onChange={event => set('actualQuantity', event.target.value)} /></label>
          <label className="text-sm font-medium">Quantity unit<select className="select mt-1" value={form.unit} onChange={event => set('unit', event.target.value as Product['unit'])}>{['kg', 'g', 'piece', 'litre', 'ml', 'bundle', 'dozen', 'quintal'].map(unit => <option key={unit}>{unit}</option>)}</select></label>
          <label className="text-sm font-medium sm:col-span-2 lg:col-span-3">Notes (optional)<textarea className="input mt-1 min-h-20" maxLength={2000} value={form.notes} onChange={event => set('notes', event.target.value)} /></label>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3"><button disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add harvest entry'}</button>{editingId && <button type="button" className="btn-secondary" onClick={() => { setEditingId(''); setForm(blank()) }}>Cancel edit</button>}</div>
        </form>
      </section>
      <section className="mt-7"><h2 className="mb-3 text-xl font-semibold">Your crop schedule</h2>{entries.length === 0 ? <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-7 text-center text-sm text-gray-600">No harvest entries yet. Add your first crop schedule above.</p> : <div className="space-y-3">{entries.map(entry => <article key={entry.id} className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><h3 className="font-semibold">{entry.crop_name}</h3><p className="mt-1 text-sm text-gray-600">Status: <span className="capitalize">{entry.status}</span>{entry.product?.name ? ` · Linked to ${entry.product.name}` : ''}</p><p className="mt-1 text-sm text-gray-600">Planted: {entry.planting_date ? formatDate(entry.planting_date) : 'Not recorded'} · Expected: {entry.expected_harvest_date ? formatDate(entry.expected_harvest_date) : 'Not set'}</p><p className="mt-1 text-sm text-gray-600">Expected: {entry.expected_quantity ?? '—'} {entry.unit} · Actual: {entry.actual_quantity ?? '—'} {entry.unit}{entry.actual_harvest_date ? ` on ${formatDate(entry.actual_harvest_date)}` : ''}</p>{entry.notes && <p className="mt-2 text-sm text-gray-700">{entry.notes}</p>}</div><div className="flex gap-3"><button className="text-sm text-primary-700 underline" onClick={() => edit(entry)}>Edit</button><button className="text-sm text-red-700 underline" onClick={() => void remove(entry)}>Delete</button></div></div>
      </article>)}</div>}</section>
    </>}
  </div>
}
