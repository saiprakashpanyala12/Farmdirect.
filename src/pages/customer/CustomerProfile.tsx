import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { IS_DEMO_MODE } from '@/lib/constants'
import type { BusinessType } from '@/types/database'

const BUSINESS_TYPES: Array<{ value: BusinessType; label: string }> = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'retailer', label: 'Retailer' },
  { value: 'grocery_store', label: 'Grocery store' },
  { value: 'wholesaler', label: 'Wholesaler' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'food_processor', label: 'Food processor' },
  { value: 'other', label: 'Other business buyer' },
]

export default function CustomerProfile() {
  const { profile, updateProfile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [businessName, setBusinessName] = useState(profile?.business_name ?? '')
  const [businessType, setBusinessType] = useState<BusinessType>(profile?.business_type ?? 'other')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setFullName(profile?.full_name ?? '')
    setPhone(profile?.phone ?? '')
    setBusinessName(profile?.business_name ?? '')
    setBusinessType(profile?.business_type ?? 'other')
  }, [profile])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await updateProfile({
        full_name: fullName,
        phone,
        ...(profile?.role === 'business' ? { business_name: businessName, business_type: businessType } : {}),
      })
      setSuccess(IS_DEMO_MODE
        ? 'Profile updated in this demo browser.'
        : 'Profile updated.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update your profile.')
    } finally {
      setBusy(false)
    }
  }

  if (!profile) {
    return <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Sign in to view your profile.</p>
  }

  const accountType = profile.role === 'business'
    ? `Business buyer${profile.business_type ? ` · ${profile.business_type.replace(/_/g, ' ')}` : ''}`
    : profile.role.charAt(0).toUpperCase() + profile.role.slice(1)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">FarmDirect</p>
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="mt-2 text-sm text-gray-600">Update the contact details associated with your account.</p>

        {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {success && <p role="status" className="mt-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{success}</p>}

        <form onSubmit={event => void submit(event)} className="mt-6 space-y-5">
          <label className="block">
            <span className="label">Full name</span>
            <input className="input" value={fullName} onChange={event => setFullName(event.target.value)} required maxLength={120} />
          </label>
          <label className="block">
            <span className="label">Phone number</span>
            <input className="input" type="tel" value={phone} onChange={event => setPhone(event.target.value)} maxLength={20} />
            <span className="mt-1 block text-xs text-gray-500">Use 8–20 digits, spaces, or phone punctuation.</span>
          </label>
          {profile.role === 'business' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label">Business name</span>
                <input className="input" value={businessName} onChange={event => setBusinessName(event.target.value)} required maxLength={160} />
              </label>
              <label className="block">
                <span className="label">Business type</span>
                <select className="select" value={businessType} onChange={event => setBusinessType(event.target.value as BusinessType)}>
                  {BUSINESS_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </label>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <ReadOnly label="Email" value={profile.email} />
            <ReadOnly label="Account type" value={accountType} />
          </div>
          <p className="text-xs leading-5 text-gray-500">Email, account type, business identity, and verification status are managed by the account system and cannot be changed here.</p>
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">{busy ? 'Saving…' : 'Save profile'}</button>
        </form>
      </div>
    </div>
  )
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="label">{label}</span>
      <p className="input bg-gray-50 text-gray-600" aria-readonly="true">{value || 'Not provided'}</p>
    </div>
  )
}
