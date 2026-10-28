import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import type { Profile, UserRole } from '@/types/database'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import { IS_SUPABASE_DEV_AUTH } from '@/lib/constants'

// ── Demo accounts ─────────────────────────────────────────────────────────────
const DEMO_ACCOUNTS: Record<string, { password: string; profile: Profile }> = {
  'farmer@demo.com': {
    password: 'demo1234',
    profile: { id:'farmer-1', email:'farmer@demo.com', full_name:'Rajesh Patil', phone:'9876543210', role:'farmer', is_verified:true, created_at:'2022-01-01' },
  },
  'customer@demo.com': {
    password: 'demo1234',
    profile: { id:'customer-1', email:'customer@demo.com', full_name:'Priya Sharma', phone:'9876543220', role:'customer', is_verified:true, created_at:'2022-06-01' },
  },
  'business@demo.com': {
    password: 'demo1234',
    profile: { id:'business-1', email:'business@demo.com', full_name:'Rohan Mehta', phone:'9876543230', role:'business', business_type:'restaurant', business_name:'Mehta\'s Restaurant', is_verified:true, created_at:'2022-09-01' },
  },
  'admin@demo.com': {
    password: 'demo1234',
    profile: { id:'admin-1', email:'admin@demo.com', full_name:'Admin User', role:'admin', is_verified:true, created_at:'2021-01-01' },
  },
}

interface SavedDemoAccount {
  email: string
  salt: string
  passwordHash: string
  profile: Profile
}

const DEMO_ACCOUNTS_KEY = 'fd_demo_accounts'

function readSavedDemoAccounts(): SavedDemoAccount[] {
  const stored = localStorage.getItem(DEMO_ACCOUNTS_KEY)
  if (!stored) return []
  const parsed: unknown = JSON.parse(stored)
  if (!Array.isArray(parsed)) throw new Error('Saved demo accounts are invalid.')
  return parsed.filter((account): account is SavedDemoAccount =>
    typeof account === 'object' &&
    account !== null &&
    'email' in account &&
    typeof account.email === 'string' &&
    'salt' in account &&
    typeof account.salt === 'string' &&
    'passwordHash' in account &&
    typeof account.passwordHash === 'string' &&
    'profile' in account
  )
}

async function hashDemoPassword(password: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${salt}:${password}`)
  )
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

interface AuthContextValue {
  profile: Profile | null
  isAuthenticated: boolean
  isLoading: boolean
  updateProfile: (
    values: Pick<Profile, 'full_name' | 'phone'> & Partial<Pick<Profile, 'business_type' | 'business_name'>>
  ) => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: string | null; role: UserRole | null }>
  signOut: () => Promise<void>
  signUp: (
    email: string,
    password: string,
    data: Partial<Profile> & { farm_name?: string; farm_state?: string; farm_village?: string; farm_district?: string }
  ) => Promise<{ error: string | null; confirmationRequired: boolean; role: UserRole | null }>
  resendConfirmation: (email: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue>({
  profile: null, isAuthenticated: false, isLoading: true,
  updateProfile: async () => { throw new Error('not ready') },
  signIn: async () => ({ error: 'not ready', role: null }),
  signOut: async () => {},
  signUp: async () => ({ error: 'not ready', confirmationRequired: false, role: null }),
  resendConfirmation: async () => ({ error: 'not ready' }),
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore demo session from localStorage
  useEffect(() => {
    if (IS_DEMO_MODE) {
      try {
        const stored = localStorage.getItem('fd_demo_profile')
        if (stored) setProfile(JSON.parse(stored))
      } catch {}
      setIsLoading(false)
      return
    }
    const client = supabase
    if (!client) {
      setIsLoading(false)
      return
    }

    const restoreSession = async () => {
      try {
        const { data, error } = await client.auth.getSession()
        if (error) throw error
        if (data.session?.user) await fetchProfile(data.session.user.id)
        else setIsLoading(false)
      } catch (error) {
        setProfile(null)
        setIsLoading(false)
        toast.error(error instanceof Error ? error.message : 'Unable to restore the Supabase session.')
      }
    }
    void restoreSession()

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsLoading(true)
        window.setTimeout(() => {
          void fetchProfile(session.user.id).catch(error => {
            toast.error(error instanceof Error ? error.message : 'Unable to load your Supabase profile.')
          })
        }, 0)
      } else {
        setProfile(null)
        setIsLoading(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string): Promise<Profile> => {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error) {
      setProfile(null)
      setIsLoading(false)
      throw new Error(`Unable to load your Supabase profile: ${error.message}`)
    }
    setProfile(data ?? null)
    setIsLoading(false)
    if (!data) throw new Error('Your account profile was not found.')
    return data
  }

  const updateProfile = useCallback(async (
    values: Pick<Profile, 'full_name' | 'phone'> & Partial<Pick<Profile, 'business_type' | 'business_name'>>
  ) => {
    if (!profile) throw new Error('Sign in before updating your profile.')
    const fullName = values.full_name.trim()
    const phone = values.phone?.trim() || ''
    if (!fullName) throw new Error('Enter your name.')
    if (phone && !/^[0-9+() -]{8,20}$/.test(phone)) throw new Error('Enter a valid phone number.')

    if (IS_DEMO_MODE) {
      const updatedProfile = {
        ...profile,
        full_name: fullName,
        phone,
        ...(profile.role === 'business' ? {
          business_type: values.business_type ?? profile.business_type,
          business_name: values.business_name?.trim() ?? profile.business_name,
        } : {}),
      }
      localStorage.setItem('fd_demo_profile', JSON.stringify(updatedProfile))
      setProfile(updatedProfile)
      return
    }

    if (!supabase) throw new Error('Supabase is not configured.')
    const updateValues = {
      full_name: fullName,
      phone,
      ...(profile.role === 'business' ? {
        business_type: values.business_type ?? profile.business_type,
        business_name: values.business_name?.trim() ?? profile.business_name,
      } : {}),
    }
    if (profile.role === 'business' && !updateValues.business_name) {
      throw new Error('Enter your business name.')
    }
    const { data, error } = await supabase
      .from('profiles')
      .update(updateValues)
      .eq('id', profile.id)
      .select('*')
      .single()
    if (error) throw new Error(`Unable to update your profile: ${error.message}`)
    setProfile(data as Profile)
  }, [profile])

  const signIn = useCallback(async (email: string, password: string) => {
    if (IS_DEMO_MODE) {
      const acc = DEMO_ACCOUNTS[email.toLowerCase()]
      if (acc && acc.password === password) {
        setProfile(acc.profile)
        localStorage.setItem('fd_demo_profile', JSON.stringify(acc.profile))
        return { error: null, role: acc.profile.role }
      }

      try {
        const savedAccount = readSavedDemoAccounts().find(
          account => account.email.toLowerCase() === email.toLowerCase()
        )
        if (!savedAccount || await hashDemoPassword(password, savedAccount.salt) !== savedAccount.passwordHash) {
          return { error: 'Invalid email or password', role: null }
        }
        setProfile(savedAccount.profile)
        localStorage.setItem('fd_demo_profile', JSON.stringify(savedAccount.profile))
        return { error: null, role: savedAccount.profile.role }
      } catch {
        return { error: 'Unable to verify this demo account in browser storage.', role: null }
      }
    }
    if (!supabase) return { error: 'Supabase is not configured. Configure the project URL and publishable key.', role: null }
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (error) return { error: authErrorMessage(error.message, IS_SUPABASE_DEV_AUTH), role: null }
    try {
      const signedInProfile = await fetchProfile(data.user.id)
      return { error: null, role: signedInProfile?.role ?? null }
    } catch (caught) {
      return { error: caught instanceof Error ? caught.message : 'Signed in, but unable to load your profile.', role: null }
    }
  }, [])

  const signOut = useCallback(async () => {
    if (IS_DEMO_MODE) {
      setProfile(null)
      localStorage.removeItem('fd_demo_profile')
      return
    }
    if (!supabase) {
      toast.error('Supabase is not configured.')
      return
    }
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error(`Unable to sign out: ${error.message}`)
      return
    }
    setProfile(null)
  }, [])

  const signUp = useCallback(async (
    email: string,
    password: string,
    data: Partial<Profile> & { farm_name?: string; farm_state?: string; farm_village?: string; farm_district?: string }
  ) => {
    if (IS_DEMO_MODE) {
      if (!crypto.subtle) return { error: 'Demo registration requires a secure browser context.', confirmationRequired: false, role: null }
      const normalizedEmail = email.trim().toLowerCase()
      let savedAccounts: SavedDemoAccount[]
      try {
        savedAccounts = readSavedDemoAccounts()
      } catch {
        return { error: 'Unable to read saved demo accounts from browser storage.', confirmationRequired: false, role: null }
      }
      if (DEMO_ACCOUNTS[normalizedEmail] || savedAccounts.some(account => account.email.toLowerCase() === normalizedEmail)) {
        return { error: 'An account with this email already exists. Sign in or use password recovery.', confirmationRequired: false, role: null }
      }

      const saltBytes = crypto.getRandomValues(new Uint8Array(16))
      const salt = Array.from(saltBytes, byte => byte.toString(16).padStart(2, '0')).join('')
      let passwordHash: string
      try {
        passwordHash = await hashDemoPassword(password, salt)
      } catch {
        return { error: 'Unable to create a demo account in this browser.', confirmationRequired: false, role: null }
      }

      const newProfile: Profile = {
        id: 'demo-' + Date.now(),
        email: normalizedEmail,
        full_name: data.full_name ?? 'New User',
        phone: data.phone,
        role: data.role === 'farmer' || data.role === 'business' ? data.role : 'customer',
        business_type: data.business_type,
        business_name: data.business_name,
        is_verified: false,
        created_at: new Date().toISOString(),
      }
      try {
        localStorage.setItem(DEMO_ACCOUNTS_KEY, JSON.stringify([
          ...savedAccounts,
          { email: normalizedEmail, salt, passwordHash, profile: newProfile },
        ]))
      } catch {
        return { error: 'Unable to save this demo account in browser storage.', confirmationRequired: false, role: null }
      }
      setProfile(newProfile)
      localStorage.setItem('fd_demo_profile', JSON.stringify(newProfile))
      return { error: null, confirmationRequired: false, role: newProfile.role }
    }

    if (!supabase) return { error: 'Supabase is not configured. Configure the project URL and publishable key.', confirmationRequired: false, role: null }
    const redirectTo = new URL('/auth/callback', window.location.origin).toString()
    const { data: result, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        ...(!IS_SUPABASE_DEV_AUTH ? { emailRedirectTo: redirectTo } : {}),
        data: {
          full_name: data.full_name,
          phone: data.phone,
          requested_role: data.role === 'farmer' || data.role === 'business' ? data.role : 'customer',
          business_type: data.business_type,
          business_name: data.business_name,
          farm_name: data.farm_name,
          farm_state: data.farm_state,
          farm_village: data.farm_village,
          farm_district: data.farm_district,
        },
      },
    })
    if (error) return { error: authErrorMessage(error.message, IS_SUPABASE_DEV_AUTH), confirmationRequired: false, role: null }
    if (!result.session) {
      return {
        error: IS_SUPABASE_DEV_AUTH
          ? 'Development sign-up did not create a session. On this development Supabase project, turn off email confirmation in Authentication settings, then use a new test address or have an operator confirm the existing test user.'
          : null,
        confirmationRequired: !IS_SUPABASE_DEV_AUTH,
        role: null,
      }
    }
    if (!result.user) {
      return { error: 'Supabase did not return the newly registered user.', confirmationRequired: false, role: null }
    }
    try {
      const createdProfile = await fetchProfile(result.user.id)
      return { error: null, confirmationRequired: false, role: createdProfile.role }
    } catch (caught) {
      return { error: caught instanceof Error ? caught.message : 'Account created, but the profile could not be loaded.', confirmationRequired: false, role: null }
    }
  }, [])

  const resendConfirmation = useCallback(async (email: string) => {
    if (IS_DEMO_MODE || IS_SUPABASE_DEV_AUTH) return { error: 'Confirmation email sending is disabled in this development flow.' }
    if (!supabase) return { error: 'Supabase is not configured.' }
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: new URL('/auth/callback', window.location.origin).toString() },
    })
    return { error: error ? authErrorMessage(error.message) : null }
  }, [])

  return (
    <AuthContext.Provider value={{ profile, isAuthenticated: !!profile, isLoading, updateProfile, signIn, signOut, signUp, resendConfirmation }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

function authErrorMessage(message: string, developmentAuth = false): string {
  const normalized = message.toLowerCase()
  if (normalized.includes('email rate limit') || normalized.includes('rate limit')) {
    return developmentAuth
      ? 'Supabase still tried to send an email. Check that email confirmation is disabled on the development Supabase project; repeated attempts will not bypass the email limit.'
      : 'Too many authentication emails were requested. Please wait before trying again. Configure a production email provider in Supabase before further email-based signup or recovery attempts.'
  }
  if (normalized.includes('user already registered') || normalized.includes('already been registered')) {
    return 'We could not complete registration with these details. Try signing in or use the password recovery link.'
  }
  if (normalized.includes('email not confirmed')) {
    return developmentAuth
      ? 'This development user is unconfirmed. Have a project operator confirm the existing test user in Supabase Auth, or create a fresh test user after disabling email confirmation in the development project.'
      : 'Please confirm your email before signing in. Use the confirmation email or request a new link from the registration screen.'
  }
  return message
}
