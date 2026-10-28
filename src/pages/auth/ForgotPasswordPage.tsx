import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Leaf, AlertCircle, CheckCircle } from 'lucide-react'
import { IS_DEMO_MODE } from '@/lib/constants'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (IS_DEMO_MODE) { setSent(true); return }
    if (!supabase) { setError('Supabase authentication is not configured.'); return }
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: new URL('/reset-password', window.location.origin).toString(),
    })
    if (error) {
      const message = error.message.toLowerCase().includes('rate limit')
        ? 'Too many recovery emails were requested. Please wait before trying again.'
        : `Unable to request a password reset: ${error.message}`
      setError(message)
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center"><Leaf className="w-6 h-6 text-white" /></div>
          <span className="text-2xl font-bold text-primary-800">FarmDirect</span>
        </Link>
        <div className="card p-8">
          {sent ? (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Check your email</h2>
              <p className="text-gray-500 text-sm mb-6">
                {IS_DEMO_MODE ? 'Demo mode: password reset email would be sent here.' : "We've sent a reset link to your email address."}
              </p>
              <Link to="/login" className="btn-primary">Back to Sign In</Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-1">Reset Password</h1>
              <p className="text-gray-500 text-sm mb-6">Enter your email and we'll send a reset link.</p>
              {error && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3 mb-4"><AlertCircle className="w-4 h-4" />{error}</div>}
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <button type="submit" className="btn-primary w-full justify-center">Send Reset Link</button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-4">
                <Link to="/login" className="text-primary-600 font-medium">Back to Sign In</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
