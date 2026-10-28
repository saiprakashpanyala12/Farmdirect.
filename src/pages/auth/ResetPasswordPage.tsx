import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (password.length < 8) return setError('Use at least 8 characters for your new password.')
    if (password !== confirm) return setError('The passwords do not match.')
    if (!supabase) return setError('Authentication is not configured.')
    setSaving(true)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      setSaving(false)
      return setError('This password reset link is invalid or expired. Request a new link.')
    }
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (updateError) return setError(`Unable to update password: ${updateError.message}`)
    navigate('/login', { replace: true })
  }

  return <div className="min-h-screen flex items-center justify-center bg-cream-100 p-4"><div className="card w-full max-w-md p-8"><h1 className="text-2xl font-bold">Choose a new password</h1><p className="mt-2 text-sm text-gray-600">Use the password reset link sent to your email.</p>{error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<form onSubmit={submit} className="mt-5 space-y-4"><label className="block text-sm font-medium">New password<input className="input mt-1" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} /></label><label className="block text-sm font-medium">Confirm password<input className="input mt-1" type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={event => setConfirm(event.target.value)} /></label><button disabled={saving} className="btn-primary w-full justify-center">{saving ? 'Updating…' : 'Update password'}</button></form><Link className="mt-5 block text-center text-sm text-primary-700 underline" to="/login">Back to sign in</Link></div></div>
}
