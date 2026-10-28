import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { listCustomerNotifications, markAllCustomerNotificationsRead, markCustomerNotificationRead } from '@/lib/marketplace'
import { supabase } from '@/lib/supabase'
import type { CustomerNotification } from '@/types/database'

export default function CustomerNotifications() {
  const { profile } = useAuth()
  const [notifications, setNotifications] = useState<CustomerNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!profile || !supabase) {
      setNotifications([])
      setError('Notifications require a connected Supabase account.')
      setLoading(false)
      return
    }
    setError('')
    setLoading(true)
    try {
      setNotifications(await listCustomerNotifications(profile.id))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load notifications.')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { void load() }, [load])

  const unreadCount = notifications.filter(notification => !notification.is_read).length

  const markRead = async (id: string) => {
    if (!profile) return
    setBusy(true)
    setError('')
    try {
      await markCustomerNotificationRead(profile.id, id)
      setNotifications(current => current.map(item => item.id === id ? { ...item, is_read: true } : item))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update notification.')
    } finally {
      setBusy(false)
    }
  }

  const markAllRead = async () => {
    if (!profile || unreadCount === 0) return
    setBusy(true)
    setError('')
    try {
      await markAllCustomerNotificationsRead(profile.id)
      setNotifications(current => current.map(item => ({ ...item, is_read: true })))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update notifications.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">FarmDirect</p>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-2 text-sm text-gray-600">{unreadCount} unread</p>
        </div>
        <button onClick={() => void markAllRead()} disabled={busy || unreadCount === 0} className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50">
          <CheckCheck className="h-4 w-4" /> Mark all as read
        </button>
      </header>

      {error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {loading ? <p role="status" className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">Loading notifications…</p>
        : notifications.length === 0 && !error ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <Bell className="mx-auto h-8 w-8 text-primary-500" />
            <h2 className="mt-3 text-lg font-semibold text-gray-900">No notifications yet</h2>
            <p className="mt-1 text-sm text-gray-600">Order updates will appear here when an order event occurs.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {notifications.map(notification => (
              <li key={notification.id} className={`flex gap-4 p-4 sm:p-5 ${notification.is_read ? '' : 'bg-primary-50/50'}`}>
                <span className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${notification.is_read ? 'bg-gray-300' : 'bg-primary-600'}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-semibold text-gray-900">{notification.title}</h2>
                    <time className="text-xs text-gray-500" dateTime={notification.created_at}>{new Date(notification.created_at).toLocaleString()}</time>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-gray-600">{notification.body}</p>
                  {!notification.is_read && (
                    <button onClick={() => void markRead(notification.id)} disabled={busy} className="mt-2 text-sm font-medium text-primary-700 hover:text-primary-900 disabled:opacity-50">
                      Mark as read
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
    </div>
  )
}
