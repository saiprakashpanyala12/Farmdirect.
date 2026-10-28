import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('Checking your confirmation link…')

  useEffect(() => {
    let active = true
    void (async () => {
      if (!supabase) {
        setMessage('Authentication is not configured for this application.')
        return
      }
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        setMessage(`Unable to complete sign-in: ${sessionError.message}`)
        return
      }
      if (!session) {
        setMessage('This link is invalid or expired. Request a fresh link and try again.')
        return
      }
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      if (error) {
        setMessage(`Your session was confirmed, but your profile could not be loaded: ${error.message}`)
        return
      }
      if (!active) return
      navigate(profile.role === 'farmer' ? '/farm' : profile.role === 'admin' ? '/admin' : '/account', { replace: true })
    })()
    return () => { active = false }
  }, [navigate])

  return <div className="min-h-screen flex items-center justify-center bg-cream-100 p-4"><div className="card max-w-md p-8 text-center"><h1 className="text-xl font-semibold">Account confirmation</h1><p role="status" className="mt-3 text-sm text-gray-600">{message}</p><Link className="mt-5 inline-block text-primary-700 underline" to="/login">Go to sign in</Link></div></div>
}
