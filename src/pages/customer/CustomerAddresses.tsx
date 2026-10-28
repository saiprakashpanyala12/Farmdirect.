import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import {
  deleteCustomerAddress, listCustomerAddresses, saveCustomerAddress, setDefaultCustomerAddress,
  type CustomerAddressInput,
} from '@/lib/marketplace'
import { supabase } from '@/lib/supabase'
import type { CustomerAddress } from '@/types/database'

const EMPTY_ADDRESS: CustomerAddressInput = {
  label: 'Home',
  recipient_name: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  locality: '',
  city: '',
  state: '',
  pincode: '',
  delivery_note: '',
}

export default function CustomerAddresses() {
  const { profile } = useAuth()
  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [draft, setDraft] = useState<CustomerAddressInput>(EMPTY_ADDRESS)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [makeDefault, setMakeDefault] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    if (!profile || !supabase) {
      setAddresses([])
      setError('Address management requires a connected Supabase account.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      setAddresses(await listCustomerAddresses(profile.id))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load your addresses.')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { void load() }, [load])

  const beginAdd = () => {
    setDraft({ ...EMPTY_ADDRESS, recipient_name: profile?.full_name ?? '', phone: profile?.phone ?? '' })
    setEditingId(null)
    setMakeDefault(addresses.length === 0)
    setShowForm(true)
    setError('')
    setSuccess('')
  }

  const beginEdit = (address: CustomerAddress) => {
    const { label, recipient_name, phone, address_line1, address_line2, locality, city, state, pincode, delivery_note } = address
    setDraft({ label, recipient_name, phone, address_line1, address_line2, locality, city, state, pincode, delivery_note })
    setEditingId(address.id)
    setMakeDefault(address.is_default)
    setShowForm(true)
    setError('')
    setSuccess('')
  }

  const setField = (field: keyof CustomerAddressInput, value: string) => {
    setDraft(current => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!profile) return
    if (!/^[0-9+() -]{8,20}$/.test(draft.phone.trim())) {
      setError('Enter a valid phone number.')
      return
    }
    if (!/^[0-9]{6}$/.test(draft.pincode.trim())) {
      setError('Enter a valid 6-digit PIN code.')
      return
    }
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const saved = await saveCustomerAddress(profile.id, {
        ...draft,
        label: draft.label.trim(),
        recipient_name: draft.recipient_name.trim(),
        phone: draft.phone.trim(),
        address_line1: draft.address_line1.trim(),
        address_line2: draft.address_line2.trim(),
        locality: draft.locality.trim(),
        city: draft.city.trim(),
        state: draft.state.trim(),
        pincode: draft.pincode.trim(),
        delivery_note: draft.delivery_note.trim(),
      }, editingId ?? undefined)
      if (makeDefault) await setDefaultCustomerAddress(saved.id)
      await load()
      setShowForm(false)
      setSuccess('Address saved.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save this address.')
    } finally {
      setBusy(false)
    }
  }

  const chooseDefault = async (id: string) => {
    setBusy(true)
    setError('')
    try {
      await setDefaultCustomerAddress(id)
      await load()
      setSuccess('Default address updated.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update the default address.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (address: CustomerAddress) => {
    if (!profile || !window.confirm(`Delete the ${address.label} address?`)) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await deleteCustomerAddress(profile.id, address.id)
      await load()
      setSuccess('Address deleted.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to delete this address.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">FarmDirect</p>
          <h1 className="text-3xl font-bold text-gray-900">Delivery addresses</h1>
          <p className="mt-2 text-sm text-gray-600">Manage saved delivery locations for checkout.</p>
        </div>
        <button onClick={beginAdd} className="btn-primary inline-flex items-center gap-2"><Plus className="h-4 w-4" /> Add address</button>
      </header>

      {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">{success}</p>}

      {showForm && (
        <form onSubmit={event => void handleSubmit(event)} className="mb-6 rounded-2xl border border-primary-100 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">{editingId ? 'Edit address' : 'Add address'}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Address label" value={draft.label} onChange={value => setField('label', value)} required maxLength={80} />
            <Input label="Recipient name" value={draft.recipient_name} onChange={value => setField('recipient_name', value)} required maxLength={120} />
            <Input label="Phone number" type="tel" value={draft.phone} onChange={value => setField('phone', value)} required maxLength={20} />
            <Input label="Address line 1" value={draft.address_line1} onChange={value => setField('address_line1', value)} required maxLength={240} />
            <Input label="Address line 2 (optional)" value={draft.address_line2} onChange={value => setField('address_line2', value)} maxLength={240} />
            <Input label="Locality (optional)" value={draft.locality} onChange={value => setField('locality', value)} maxLength={120} />
            <Input label="City" value={draft.city} onChange={value => setField('city', value)} required maxLength={120} />
            <Input label="State" value={draft.state} onChange={value => setField('state', value)} required maxLength={120} />
            <Input label="6-digit PIN code" value={draft.pincode} onChange={value => setField('pincode', value)} required maxLength={6} pattern="[0-9]{6}" inputMode="numeric" />
            <label className="block sm:col-span-2">
              <span className="label">Delivery note (optional)</span>
              <textarea className="input min-h-20" maxLength={1000} value={draft.delivery_note} onChange={event => setField('delivery_note', event.target.value)} />
            </label>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={makeDefault} onChange={event => setMakeDefault(event.target.checked)} className="accent-primary-600" />
            Set as default delivery address
          </label>
          <div className="mt-5 flex gap-3">
            <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">{busy ? 'Saving…' : 'Save address'}</button>
            <button type="button" onClick={() => setShowForm(false)} disabled={busy} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {loading ? <p role="status" className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">Loading addresses…</p>
        : addresses.length === 0 && !error ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <MapPin className="mx-auto h-8 w-8 text-primary-500" />
            <h2 className="mt-3 text-lg font-semibold text-gray-900">No saved addresses</h2>
            <p className="mt-1 text-sm text-gray-600">Add a delivery address to make checkout easier.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {addresses.map(address => (
              <article key={address.id} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-gray-900">{address.label}</h2>
                      {address.is_default && <span className="badge-green">Default</span>}
                    </div>
                    <p className="mt-2 text-sm font-medium text-gray-800">{address.recipient_name} · {address.phone}</p>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      {[address.address_line1, address.address_line2, address.locality, address.city, address.state, address.pincode].filter(Boolean).join(', ')}
                    </p>
                    {address.delivery_note && <p className="mt-2 text-xs text-gray-500">Note: {address.delivery_note}</p>}
                  </div>
                  <MapPin className="h-5 w-5 flex-shrink-0 text-primary-600" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                  {!address.is_default && <button onClick={() => void chooseDefault(address.id)} disabled={busy} className="btn-secondary inline-flex items-center gap-2 text-sm"><Star className="h-4 w-4" /> Set default</button>}
                  <button onClick={() => beginEdit(address)} disabled={busy} className="btn-secondary inline-flex items-center gap-2 text-sm"><Pencil className="h-4 w-4" /> Edit</button>
                  <button onClick={() => void remove(address)} disabled={busy} className="btn-secondary inline-flex items-center gap-2 text-sm text-red-700"><Trash2 className="h-4 w-4" /> Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
    </div>
  )
}

function Input({
  label, value, onChange, required = false, type = 'text', maxLength, pattern, inputMode,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  type?: string
  maxLength?: number
  pattern?: string
  inputMode?: 'numeric' | 'text' | 'tel'
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input" type={type} value={value} onChange={event => onChange(event.target.value)} required={required} maxLength={maxLength} pattern={pattern} inputMode={inputMode} />
    </label>
  )
}
