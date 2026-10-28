import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '@/features/auth/AuthContext'
import { listFarmerProducts, saveProduct, uploadProductImages, type ProductInput } from '@/lib/marketplace'
import type { Product } from '@/types/database'

const CATEGORY_OPTIONS = [
  ['cat-vegetables', 'Vegetables'],
  ['cat-fruits', 'Fruits'],
  ['cat-grains', 'Grains'],
  ['cat-pulses', 'Pulses'],
  ['cat-spices', 'Spices'],
  ['cat-dairy', 'Dairy'],
  ['cat-herbs', 'Herbs'],
  ['cat-flowers', 'Flowers'],
] as const

const initialForm: ProductInput = {
  farmName: '',
  village: '',
  district: '',
  state: '',
  categoryId: CATEGORY_OPTIONS[0][0],
  name: '',
  description: '',
  pricePerUnit: 1,
  unit: 'kg',
  quantityAvailable: 0,
  minOrderQty: 1,
  maxOrderQty: null,
  harvestDate: null,
  organicStatus: 'not_disclosed',
  pesticideStatus: 'not_disclosed',
  isSeasonal: false,
  isSurplus: false,
  surplusPricePerUnit: null,
  surplusAvailableUntil: null,
  images: [],
}

export default function FarmerProductForm() {
  const { id } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<ProductInput>(initialForm)
  const [files, setFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(!!id)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id || !profile) return
    let active = true
    void listFarmerProducts(profile.id).then(products => {
      const product = products.find(item => item.id === id)
      if (!product) throw new Error('This product was not found in your farmer account.')
      if (active) setForm(productToInput(product))
    }).catch(caught => {
      if (active) setError(caught instanceof Error ? caught.message : 'Unable to load product.')
    }).finally(() => {
      if (active) setIsLoading(false)
    })
    return () => { active = false }
  }, [id, profile])

  const change = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => {
    setForm(current => ({ ...current, [key]: value }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!profile) return setError('Sign in before managing products.')
    if (!form.farmName.trim() || !form.state.trim()) return setError('Enter your farm name and state.')
    if (!form.name.trim() || form.pricePerUnit <= 0 || form.quantityAvailable < 0 || form.minOrderQty <= 0) {
      return setError('Enter valid product details, price, stock, and minimum order quantity.')
    }
    if (form.isSurplus && (
      form.surplusPricePerUnit === null ||
      form.surplusPricePerUnit <= 0 ||
      form.surplusPricePerUnit >= form.pricePerUnit ||
      !form.surplusAvailableUntil ||
      new Date(form.surplusAvailableUntil).getTime() <= Date.now()
    )) {
      return setError('A surplus offer needs a price below the regular price and a future end date.')
    }
    if (files.length + form.images.length > 6) return setError('A product can have up to 6 images.')
    setIsSaving(true)
    let writeStage: 'image upload' | 'database write' = 'image upload'
    try {
      const uploaded = files.length ? await uploadProductImages(profile.id, files) : []
      writeStage = 'database write'
      await saveProduct(profile.id, {
        ...form,
        surplusPricePerUnit: form.isSurplus ? form.surplusPricePerUnit : null,
        surplusAvailableUntil: form.isSurplus && form.surplusAvailableUntil
          ? new Date(form.surplusAvailableUntil).toISOString()
          : null,
        images: [...form.images, ...uploaded],
      }, id)
      toast.success(id ? 'Product updated.' : 'Product created.')
      window.dispatchEvent(new Event('farmdirect:products-changed'))
      navigate('/farm/products')
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to save product.'
      const denied = /row.level security|permission denied|42501/i.test(message)
      if (!denied) {
        setError(message)
      } else if (writeStage === 'database write' && /permission denied for table products/i.test(message)) {
        setError(`Supabase denied a database privilege on public.products, not just an RLS row check. Product inserts no longer send updated_at (the migration grants that column for UPDATE, not INSERT). If the error persists after this code is deployed, inspect authenticated INSERT column privileges and the active Supabase project before changing policies. Details: ${message}`)
      } else if (writeStage === 'image upload') {
        setError(`Supabase Storage rejected the image upload. Images must be uploaded beneath your own farmer ID. You can retry without an image. Details: ${message}`)
      } else {
        setError(`The farm or product write was rejected by database authorization. Confirm that your account is a farmer and the product uses your own farm. Details: ${message}`)
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div className="mx-auto max-w-4xl px-4 py-8 text-sm text-gray-600">Loading product…</div>

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Farmer dashboard</p>
        <h1 className="text-3xl font-bold text-gray-900">{id ? 'Edit product' : 'Add a product'}</h1>
        <p className="mt-2 text-sm text-gray-600">Active products are published to customers immediately. You can update or archive your listings at any time.</p>
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        <form onSubmit={submit} className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Farm name" value={form.farmName} onChange={value => change('farmName', value)} required />
          <Field label="State" value={form.state} onChange={value => change('state', value)} required />
          <Field label="District" value={form.district} onChange={value => change('district', value)} />
          <Field label="Village" value={form.village} onChange={value => change('village', value)} />
          <Field label="Product name" value={form.name} onChange={value => change('name', value)} required />
          <label className="block"><span className="label">Category</span>
            <select className="select" value={form.categoryId} onChange={event => change('categoryId', event.target.value)}>
              {CATEGORY_OPTIONS.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
            </select>
          </label>
          <label className="block"><span className="label">Description</span>
            <textarea className="input min-h-24" value={form.description} onChange={event => change('description', event.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price (INR)" type="number" min="0.01" step="0.01" value={String(form.pricePerUnit)} onChange={value => change('pricePerUnit', Number(value))} required />
            <label className="block"><span className="label">Unit</span>
              <select className="select" value={form.unit} onChange={event => change('unit', event.target.value as ProductInput['unit'])}>
                {['kg', 'g', 'piece', 'litre', 'ml', 'bundle', 'dozen', 'quintal'].map(unit => <option key={unit}>{unit}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stock available" type="number" min="0" step="0.001" value={String(form.quantityAvailable)} onChange={value => change('quantityAvailable', Number(value))} required />
            <Field label="Minimum order" type="number" min="0.001" step="0.001" value={String(form.minOrderQty)} onChange={value => change('minOrderQty', Number(value))} required />
          </div>
          <Field label="Maximum order (optional)" type="number" min={String(form.minOrderQty)} step="0.001" value={form.maxOrderQty === null ? '' : String(form.maxOrderQty)} onChange={value => change('maxOrderQty', value ? Number(value) : null)} />
          <Field label="Harvest date" type="date" value={form.harvestDate ?? ''} onChange={value => change('harvestDate', value || null)} />
          <label className="block"><span className="label">Organic status</span>
            <select className="select" value={form.organicStatus} onChange={event => change('organicStatus', event.target.value as ProductInput['organicStatus'])}>
              {['not_disclosed', 'conventional', 'farmer_declared_organic', 'certification_pending', 'certified_organic'].map(value => <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>)}
            </select>
          </label>
          <label className="block"><span className="label">Pesticide status</span>
            <select className="select" value={form.pesticideStatus} onChange={event => change('pesticideStatus', event.target.value as ProductInput['pesticideStatus'])}>
              {['not_disclosed', 'none_used', 'natural_only', 'minimal_use', 'standard_use', 'used'].map(value => <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.isSeasonal} onChange={event => change('isSeasonal', event.target.checked)} /> Seasonal</label>
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.isSurplus} onChange={event => {
            const enabled = event.target.checked
            change('isSurplus', enabled)
            if (!enabled) {
              change('surplusPricePerUnit', null)
              change('surplusAvailableUntil', null)
            }
          }} /> Surplus offer</label>
          {form.isSurplus && <>
            <Field label="Surplus price (INR per unit)" type="number" min="0.01" step="0.01" value={form.surplusPricePerUnit === null ? '' : String(form.surplusPricePerUnit)} onChange={value => change('surplusPricePerUnit', value ? Number(value) : null)} required />
            <Field label="Offer ends at" type="datetime-local" value={toLocalInput(form.surplusAvailableUntil)} onChange={value => change('surplusAvailableUntil', value || null)} required />
            <p className="text-xs text-gray-500 sm:col-span-2">Discount price is applied by the database during checkout until the offer expires. The final reserved stock and price are validated atomically.</p>
          </>}
          <div className="sm:col-span-2">
            <label className="block"><span className="label">Product images (JPEG, PNG, WebP; up to 5 MB each)</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => setFiles(Array.from(event.target.files ?? []))} className="input" />
            </label>
            {form.images.length > 0 && <p className="mt-2 text-xs text-gray-500">{form.images.length} existing image(s) · selecting new images adds to existing</p>}
          </div>
          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" disabled={isSaving} className="btn-primary">{isSaving ? 'Saving…' : 'Save product'}</button>
            <Link to="/farm/products" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

function productToInput(product: Product): ProductInput {
  return {
    ...initialForm,
    farmName: product.farm?.name ?? '',
    village: product.farm?.village ?? '',
    district: product.farm?.district ?? '',
    state: product.farm?.state ?? '',
    categoryId: product.category_id,
    name: product.name,
    description: product.description,
    pricePerUnit: product.price_per_unit,
    unit: product.unit,
    quantityAvailable: product.quantity_available,
    minOrderQty: product.min_order_qty,
    maxOrderQty: product.max_order_qty ?? null,
    harvestDate: product.harvest_date ?? null,
    organicStatus: product.organic_status,
    pesticideStatus: product.pesticide_status,
    isSeasonal: product.is_seasonal,
    isSurplus: product.is_surplus,
    surplusPricePerUnit: product.surplus_price_per_unit ?? null,
    surplusAvailableUntil: product.surplus_available_until ? toLocalInput(product.surplus_available_until) : null,
    images: product.images ?? [],
  }
}

function toLocalInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  min,
  step,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
  min?: string
  step?: string
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input" type={type} min={min} step={step} value={value} onChange={event => onChange(event.target.value)} required={required} />
    </label>
  )
}
