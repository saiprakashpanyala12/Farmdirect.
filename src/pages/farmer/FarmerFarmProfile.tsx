import { useCallback, useEffect, useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/features/auth/AuthContext'
import { getFarmerFarm, updateFarmerFarm } from '@/lib/marketplace'
import type { Farm } from '@/types/database'

interface FarmForm {
  name: string
  description: string
  village: string
  district: string
  state: string
  pincode: string
  areaAcres: string
  crops: string
  methods: string
  inputs: string
  certifications: string
  certificationNotes: string
}

const emptyForm: FarmForm = {
  name: '', description: '', village: '', district: '', state: '', pincode: '',
  areaAcres: '', crops: '', methods: '', inputs: '', certifications: '', certificationNotes: '',
}

function toFarmForm(farm: Farm): FarmForm {
  return {
    name: farm.name ?? '',
    description: farm.description ?? '',
    village: farm.village ?? '',
    district: farm.district ?? '',
    state: farm.state ?? '',
    pincode: farm.pincode ?? '',
    areaAcres: farm.area_acres == null ? '' : String(farm.area_acres),
    crops: (farm.crops_grown ?? []).join(', '),
    methods: farm.farming_methods ?? '',
    inputs: farm.inputs_disclosure ?? '',
    certifications: (farm.certifications ?? []).join(', '),
    certificationNotes: farm.certification_notes ?? '',
  }
}

export default function FarmerFarmProfile() {
  const { profile } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!profile) return
    try {
      const farm = await getFarmerFarm(profile.id)
      if (!farm) throw new Error('Your farm profile is not available. Try signing out and back in, then contact support if the issue continues.')
      setForm(toFarmForm(farm))
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load your farm profile.')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { void load() }, [load])

  const update = (key: keyof FarmForm, value: string) => setForm(current => ({ ...current, [key]: value }))
  const asArray = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!profile) return setError('Sign in to update your farm profile.')
    const area = form.areaAcres.trim() ? Number(form.areaAcres) : null
    if (!form.name.trim() || !form.state.trim() ||
        (area !== null && (!Number.isFinite(area) || area < 0)) ||
        (form.pincode && !/^\d{6}$/.test(form.pincode))) {
      return setError('Enter a farm name and state, a non-negative area, and a valid six-digit PIN code if provided.')
    }
    setSaving(true)
    setError('')
    try {
      await updateFarmerFarm(profile.id, {
        name: form.name.trim(),
        description: form.description.trim(),
        village: form.village.trim() || null,
        district: form.district.trim() || null,
        state: form.state.trim(),
        pincode: form.pincode.trim() || null,
        area_acres: area,
        crops_grown: asArray(form.crops),
        farming_methods: form.methods.trim(),
        inputs_disclosure: form.inputs.trim(),
        certifications: asArray(form.certifications),
        certification_notes: form.certificationNotes.trim(),
      })
      toast.success('Farm profile saved.')
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save farm profile.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
    <header><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Farmer dashboard</p><h1 className="text-3xl font-bold text-gray-900">Farm profile</h1><p className="mt-2 text-sm text-gray-600">Edit your farm information. Account contact details are private to your profile; this page does not publish your phone number.</p></header>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loading ? <p role="status" className="mt-6 text-sm text-gray-600">Loading farm profile…</p> : <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl border border-gray-200 bg-white p-5 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Farm name" required value={form.name} onChange={value => update('name', value)} />
        <Field label="Farm area (acres)" type="number" min="0" step="0.01" value={form.areaAcres} onChange={value => update('areaAcres', value)} />
        <Field label="Village / area" value={form.village} onChange={value => update('village', value)} />
        <Field label="District" value={form.district} onChange={value => update('district', value)} />
        <Field label="State" required value={form.state} onChange={value => update('state', value)} />
        <Field label="PIN code" value={form.pincode} onChange={value => update('pincode', value)} />
      </div>
      <TextArea label="Farm description" value={form.description} onChange={value => update('description', value)} />
      <TextArea label="Crops grown (comma separated)" value={form.crops} onChange={value => update('crops', value)} />
      <TextArea label="Farming methods (farmer-reported)" value={form.methods} onChange={value => update('methods', value)} />
      <TextArea label="Pesticide and fertilizer inputs (farmer-reported)" value={form.inputs} onChange={value => update('inputs', value)} />
      <TextArea label="Certifications held (names, comma separated)" value={form.certifications} onChange={value => update('certifications', value)} />
      <TextArea label="Certification details (issuer, validity, evidence description)" value={form.certificationNotes} onChange={value => update('certificationNotes', value)} />
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Farm-entered methods and certification details are self-reported. They do not establish independently verified or certified organic status; never upload identity documents or private certification scans to the public product-images bucket.</div>
      <div className="text-sm text-gray-600">Farmer contact on file: {profile?.phone || '---'}</div>
      <button disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Saving…' : 'Save farm profile'}</button>
    </form>}
  </div>
}

function Field({ label, value, onChange, required, type = 'text', min, step }: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  type?: string
  min?: string
  step?: string
}) {
  return <label className="block text-sm font-medium">{label}<input className="input mt-1" type={type} min={min} step={step} required={required} value={value} onChange={event => onChange(event.target.value)} /></label>
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-medium">{label}<textarea className="input mt-1 min-h-20" maxLength={4000} value={value} onChange={event => onChange(event.target.value)} /></label>
}
