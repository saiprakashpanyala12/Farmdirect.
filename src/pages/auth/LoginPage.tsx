import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Leaf, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { IS_DEMO_MODE, IS_SUPABASE_DEV_AUTH } from '@/lib/constants'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { signIn, resendConfirmation } = useAuth()
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendMessage, setResendMessage] = useState('')
  const [resendWait, setResendWait] = useState(0)

  const { register, handleSubmit, setValue, getValues, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async ({ email, password }: FormData) => {
    setError(null)
    setResendMessage('')
    let result: Awaited<ReturnType<typeof signIn>>
    try {
      result = await signIn(email, password)
    } catch (caught) {
      setError(caught instanceof Error ? `Unable to sign in: ${caught.message}` : 'Unable to sign in at this time.')
      return
    }
    const { error, role } = result
    if (error) { setError(error); return }
    navigate(role === 'farmer' ? '/farm' : role === 'admin' ? '/admin' : '/account', { replace: true })
  }

  useEffect(() => {
    if (resendWait <= 0) return
    const timer = window.setTimeout(() => setResendWait(seconds => Math.max(0, seconds - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [resendWait])

  const requestConfirmation = async () => {
    const email = getValues('email').trim()
    if (!email || resendWait > 0) return
    setError(null)
    setResendMessage('')
    const { error } = await resendConfirmation(email)
    if (error) {
      setError(error)
      return
    }
    setResendMessage('If this account is awaiting confirmation, a new link has been requested. Check your inbox and spam folder.')
    setResendWait(60)
  }

  const quickLogin = (email: string) => {
    setValue('email', email)
    setValue('password', 'demo1234')
  }

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-primary-800">FarmDirect</span>
        </Link>

        <div className="card p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-gray-500 text-sm mb-6">Sign in to your FarmDirect account</p>

          {IS_DEMO_MODE && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-xs font-semibold text-amber-800 mb-2">🌾 Demo Mode — Quick Login:</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Farmer', email: 'farmer@demo.com' },
                  { label: 'Customer', email: 'customer@demo.com' },
                  { label: 'Business', email: 'business@demo.com' },
                  { label: 'Admin', email: 'admin@demo.com' },
                ].map(acc => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => quickLogin(acc.email)}
                    className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-1.5 rounded-lg font-medium transition-colors"
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-amber-600 mt-2">Password: demo1234</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}
          {!IS_SUPABASE_DEV_AUTH && error?.includes('confirm your email') && (
            <button type="button" onClick={requestConfirmation} disabled={resendWait > 0} className="mb-4 text-sm font-medium text-primary-700 underline disabled:opacity-50">
              {resendWait > 0 ? `Request another confirmation link in ${resendWait}s` : 'Resend confirmation email'}
            </button>
          )}
          {resendMessage && <p role="status" className="mb-4 text-sm text-green-700">{resendMessage}</p>}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input type="email" autoComplete="email" className={`input ${errors.email ? 'input-error' : ''}`} placeholder="you@email.com" {...register('email')} />
              {errors.email && <p className="error-text"><AlertCircle className="w-3.5 h-3.5" />{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                  placeholder="••••••••"
                  {...register('password')}
                />
                <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="error-text"><AlertCircle className="w-3.5 h-3.5" />{errors.password.message}</p>}
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-800">Forgot password?</Link>
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center btn-lg">
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 font-semibold hover:text-primary-800">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
