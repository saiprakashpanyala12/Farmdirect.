import { useCallback, useEffect, useRef, useState } from 'react'
import type { Product } from '@/types/database'
import { IS_DEMO_MODE } from '@/lib/constants'
import { listProducts } from '@/lib/marketplace'

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(!IS_DEMO_MODE)
  const [error, setError] = useState(IS_DEMO_MODE ? 'Live product listings require a connected Supabase project.' : '')
  const requestId = useRef(0)

  const refreshProducts = useCallback(async () => {
    if (IS_DEMO_MODE) return
    const request = ++requestId.current
    setIsLoading(true)
    setError('')
    try {
      const liveProducts = await listProducts()
      if (request === requestId.current) setProducts(liveProducts)
    } catch (caught) {
      if (request === requestId.current) {
        setError(caught instanceof Error ? caught.message : 'Unable to load products.')
      }
    } finally {
      if (request === requestId.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (IS_DEMO_MODE) return
    let lastRefreshAt = 0
    const refreshIfReady = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastRefreshAt < 2000) return
      lastRefreshAt = Date.now()
      void refreshProducts()
    }
    void refreshProducts()
    window.addEventListener('focus', refreshIfReady)
    document.addEventListener('visibilitychange', refreshIfReady)
    return () => {
      requestId.current += 1
      window.removeEventListener('focus', refreshIfReady)
      document.removeEventListener('visibilitychange', refreshIfReady)
    }
  }, [refreshProducts])

  return { products, isLoading, error, refreshProducts }
}
