import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Leaf, Eye, EyeOff, AlertCircle, ChevronRight, CheckCircle } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { BUSINESS_TYPES, IS_SUPABASE_DEV_AUTH } from '@/lib/constants'
import type { BusinessType, UserRole } from '@/types/database'

type Step = 'role' | 'details'

const detailsSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(10, 'Enter a valid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  business_name: z.string().optional(),
  business_type: z.string().optional(),
  farm_name: z.string().optional(),
  farm_state: z.string().optional(),
  farm_village: z.string().optional(),
  farm_district: z.string().optional(),
})
type DetailsForm = z.infer<typeof detailsSchema>

export default function RegisterPage() {
  const { signUp, resendConfirmation } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedRole = searchParams.get('role')
  const presetRole: UserRole | null =
    requestedRole === 'farmer' || requestedRole === 'business' || requestedRole === 'customer'
      ? requestedRole
      : null
  const [step, setStep] = useState<Step>(presetRole ? 'details' : 'role')
  const [selectedRole, setSelectedRole] = useState<UserRole>(presetRole ?? 'customer')
  const [businessType, setBusinessType] = useState<BusinessType>('restaurant')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)
  const [resendWait, setResendWait] = useState(0)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
  })

  const onSubmit = async (data: DetailsForm) => {
    setError(null)
    if (selectedRole === 'farmer' && (!data.farm_name?.trim() || !data.farm_state?.trim())) {
      setError('Enter your farm name and state to continue.')
      return
    }
    if (selectedRole === 'business' && !data.business_name?.trim()) {
      setError('Enter your business name to continue.')
      return
    }
    let result: Awaited<ReturnType<typeof signUp>>
    try {
      result = await signUp(data.email, data.password, {
        full_name: data.full_name,
        phone: data.phone,
        role: selectedRole,
        business_name: selectedRole === 'business' ? data.business_name : undefined,
        business_type: selectedRole === 'business' ? businessType : undefined,
        farm_name: selectedRole === 'farmer' ? data.farm_name : undefined,
        farm_state: selectedRole === 'farmer' ? data.farm_state : undefined,
        farm_village: selectedRole === 'farmer' ? data.farm_village : undefined,
        farm_district: selectedRole === 'farmer' ? data.farm_district : undefined,
      })
    } catch (caught) {
      setError(caught instanceof Error ? `Unable to register: ${caught.message}` : 'Unable to register at this time.')
      return
    }
    const { error, confirmationRequired, role } = result
    if (error) { setError(error); return }
    if (confirmationRequired) {
      setRegisteredEmail(data.email.trim().toLowerCase())
      return
    }
    if (!role) {
      setError('Your account was created, but its profile could not be loaded. Sign in again; contact support if the issue continues.')
      return
    }
    navigate(role === 'farmer' ? '/farm' : role === 'admin' ? '/admin' : '/account')
  }

  const resendEmail = async () => {
    if (!registeredEmail || resendWait > 0) return
    setResendError(null)
    setResendMessage(null)
    const { error } = await resendConfirmation(registeredEmail)
    if (error) {
      setResendError(error)
      return
    }
    setResendMessage('If this address has a pending registration, a new confirmation email has been requested.')
    setResendWait(60)
    const timer = window.setInterval(() => {
      setResendWait(seconds => {
        if (seconds <= 1) {
          window.clearInterval(timer)
          return 0
        }
        return seconds - 1
      })
    }, 1000)
  }

  const ROLES = [
    { value: 'customer' as UserRole, title: 'Household Customer', desc: 'Buy fresh produce for your home', emoji: '🏠' },
    { value: 'farmer'   as UserRole, title: 'Farmer / Seller',    desc: 'Sell your produce directly to buyers', emoji: '🌾' },
    { value: 'business' as UserRole, title: 'Business Buyer',     desc: 'Restaurant, hotel, retailer, wholesaler', emoji: '🏪' },
  ]

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-primary-800">FarmDirect</span>
        </Link>

        <div className="card p-8">
          {registeredEmail && !IS_SUPABASE_DEV_AUTH ? (
            <div className="text-center">
              <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Confirm your email</h1>
              <p className="text-sm text-gray-600 mb-5">
                If registration completed for <strong>{registeredEmail}</strong>, Supabase has sent a confirmation link. Follow it to activate your account.
                If the email does not arrive, check spam or wait before requesting another.
              </p>
              {resendError && <p role="alert" className="mb-3 text-sm text-red-700">{resendError}</p>}
              {resendMessage && <p role="status" className="mb-3 text-sm text-green-700">{resendMessage}</p>}
              <button onClick={resendEmail} disabled={resendWait > 0} className="btn-primary w-full justify-center disabled:opacity-50">
                {resendWait > 0 ? `Request another link in ${resendWait}s` : 'Resend confirmation email'}
              </button>
              <p className="text-sm text-gray-500 mt-5"><Link to="/login" className="text-primary-600 font-medium">Return to sign in</Link></p>
            </div>
          ) : step === 'role' ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Create an account</h1>
              <p className="text-gray-500 text-sm mb-6">Choose how you want to use FarmDirect</p>
              <div className="space-y-3 mb-6">
                {ROLES.map(r => (
                  <button
                    key={r.value}
                    onClick={() => setSelectedRole(r.value)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                      selectedRole === r.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-3xl">{r.emoji}</span>
                    <div className="flex-1">
                      <p className={`font-semibold ${selectedRole === r.value ? 'text-primary-800' : 'text-gray-900'}`}>{r.title}</p>
                      <p className="text-sm text-gray-500">{r.desc}</p>
                    </div>
                    {selectedRole === r.value && <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center"><span className="text-white text-xs">✓</span></div>}
                  </button>
                ))}
              </div>
              <button onClick={() => setStep('details')} className="btn-primary w-full justify-center btn-lg">
                Continue <ChevronRight className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-6">
                <button onClick={() => setStep('role')} className="text-sm text-primary-600 hover:underline">← Back</button>
                <span className="text-gray-300">|</span>
                <span className="badge-green text-xs capitalize">{selectedRole === 'business' ? `${BUSINESS_TYPES.find(b=>b.value===businessType)?.label}` : selectedRole}</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Your details</h1>
              <p className="text-gray-500 text-sm mb-6">Fill in your information to complete registration</p>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label">Full Name</label>
                  <input className={`input ${errors.full_name ? 'input-error' : ''}`} placeholder="Rajesh Patil" {...register('full_name')} />
                  {errors.full_name && <p className="error-text"><AlertCircle className="w-3.5 h-3.5" />{errors.full_name.message}</p>}
                </div>
                {selectedRole === 'business' && (
                  <>
                    <div>
                      <label className="label">Business Type</label>
                      <select className="select" value={businessType} onChange={event => {
                        const selected = BUSINESS_TYPES.find(type => type.value === event.target.value)
                        if (selected) setBusinessType(selected.value)
                      }}>
                        {BUSINESS_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Business Name</label>
                      <input className="input" placeholder="Your restaurant / store name" {...register('business_name')} />
                    </div>
                  </>
                )}
                {selectedRole === 'farmer' && (
                  <>
                    <div>
                      <label className="label">Farm name</label>
                      <input className={`input ${errors.farm_name ? 'input-error' : ''}`} placeholder="Name of your farm" {...register('farm_name', { required: 'Enter your farm name' })} />
                      {errors.farm_name && <p className="error-text">{errors.farm_name.message}</p>}
                    </div>
                    <div>
                      <label className="label">State</label>
                      <input className={`input ${errors.farm_state ? 'input-error' : ''}`} placeholder="State or union territory" {...register('farm_state', { required: 'Enter your state' })} />
                      {errors.farm_state && <p className="error-text">{errors.farm_state.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="label">Village (optional)</label><input className="input" {...register('farm_village')} /></div>
                      <div><label className="label">District (optional)</label><input className="input" {...register('farm_district')} /></div>
                    </div>
                  </>
                )}
                <div>
                  <label className="label">Email address</label>
                  <input type="email" autoComplete="email" className={`input ${errors.email ? 'input-error' : ''}`} placeholder="you@email.com" {...register('email')} />
                  {errors.email && <p className="error-text"><AlertCircle className="w-3.5 h-3.5" />{errors.email.message}</p>}
                </div>
                <div>
                  <label className="label">Phone number</label>
                  <input type="tel" className={`input ${errors.phone ? 'input-error' : ''}`} placeholder="9876543210" {...register('phone')} />
                  {errors.phone && <p className="error-text"><AlertCircle className="w-3.5 h-3.5" />{errors.phone.message}</p>}
                </div>
                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                      placeholder="Min 8 characters"
                      {...register('password')}
                    />
                    <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="error-text"><AlertCircle className="w-3.5 h-3.5" />{errors.password.message}</p>}
                </div>
                <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center btn-lg">
                  {isSubmitting ? 'Creating account…' : 'Create Account'}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-800">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
