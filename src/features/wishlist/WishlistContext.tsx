import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/features/auth/AuthContext'
import { addWishlistItem, listWishlistProductIds, removeWishlistItem } from '@/lib/marketplace'
import { IS_DEMO_MODE } from '@/lib/constants'
import { supabase } from '@/lib/supabase'

interface WishlistContextValue {
  productIds: ReadonlySet<string>
  isLoading: boolean
  refreshWishlist: () => Promise<void>
  toggleWishlist: (productId: string) => Promise<boolean>
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { profile, isLoading: authLoading } = useAuth()
  const [productIds, setProductIds] = useState<ReadonlySet<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const requestId = useRef(0)
  const pendingIds = useRef(new Set<string>())

  const refreshWishlist = useCallback(async () => {
    if (authLoading) return
    const request = ++requestId.current
    if (!profile || IS_DEMO_MODE || !supabase) {
      setProductIds(new Set())
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const ids = await listWishlistProductIds(profile.id)
      if (request === requestId.current) setProductIds(new Set(ids))
    } catch (error) {
      if (request === requestId.current) toast.error(error instanceof Error ? error.message : 'Unable to load your wishlist.')
    } finally {
      if (request === requestId.current) setIsLoading(false)
    }
  }, [authLoading, profile])

  useEffect(() => {
    void refreshWishlist()
  }, [refreshWishlist])

  const toggleWishlist = useCallback(async (productId: string) => {
    if (!profile) {
      toast.error('Sign in to save products to your wishlist.')
      return false
    }
    if (IS_DEMO_MODE || !supabase) {
      toast.error('Wishlist saving requires a connected Supabase account.')
      return false
    }
    if (pendingIds.current.has(productId)) return false
    pendingIds.current.add(productId)
    const alreadySaved = productIds.has(productId)
    try {
      if (alreadySaved) await removeWishlistItem(profile.id, productId)
      else await addWishlistItem(profile.id, productId)
      setProductIds(current => {
        const next = new Set(current)
        if (alreadySaved) next.delete(productId)
        else next.add(productId)
        return next
      })
      toast.success(alreadySaved ? 'Removed from wishlist.' : 'Added to wishlist.')
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update your wishlist.')
      return false
    } finally {
      pendingIds.current.delete(productId)
    }
  }, [productIds, profile])

  const value = useMemo(
    () => ({ productIds, isLoading, refreshWishlist, toggleWishlist }),
    [productIds, isLoading, refreshWishlist, toggleWishlist]
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (!context) throw new Error('useWishlist must be used within a WishlistProvider.')
  return context
}
