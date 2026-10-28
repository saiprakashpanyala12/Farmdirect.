import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import toast from 'react-hot-toast'
import type { Product } from '@/types/database'
import { availableStock, productUnitPrice } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthContext'
import { IS_DEMO_MODE } from '@/lib/constants'
import { supabase } from '@/lib/supabase'

export interface CartLineItem {
  product: Product
  quantity: number
}

export interface FarmerCartGroup {
  farmerId: string
  farmerName: string
  items: CartLineItem[]
  subtotal: number
}

interface CartContextValue {
  items: CartLineItem[]
  isOpen: boolean
  itemCount: number
  subtotal: number
  farmerGroups: FarmerCartGroup[]
  addItem: (product: Product, qty?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, qty: number) => void
  clearCart: () => void
  toggleCart: () => void
  openCart: () => void
  closeCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)
const CART_STORAGE_KEY = 'fd_cart'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { profile, isLoading: isAuthLoading } = useAuth()
  const [items, setItems] = useState<CartLineItem[]>(() => {
    if (!IS_DEMO_MODE) return []
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? '[]')
      return Array.isArray(stored)
        ? stored.filter((item): item is CartLineItem =>
            typeof item === 'object' &&
            item !== null &&
            'product' in item &&
            'quantity' in item &&
            typeof item.quantity === 'number' &&
            Number.isFinite(item.quantity)
          )
        : []
    } catch {
      return []
    }
  })
  const [isOpen, setIsOpen] = useState(false)
  const [cartReady, setCartReady] = useState(IS_DEMO_MODE)
  const cartOwnerId = useRef<string | null>(null)
  const syncQueue = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    if (!IS_DEMO_MODE) return
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  }, [items])

  useEffect(() => {
    if (IS_DEMO_MODE || isAuthLoading) return
    let active = true
    cartOwnerId.current = null
    setCartReady(false)
    if (!profile || !supabase) {
      setItems([])
      setCartReady(true)
      return () => { active = false }
    }

    void (async () => {
      try {
        const { data, error } = await supabase
          .from('cart_items')
          .select('product_id, quantity, product:products(*, category:categories(id,name,slug), farm:farms(*))')
          .eq('user_id', profile.id)
        if (error) throw new Error(`Unable to load your saved cart: ${error.message}`)
        if (!active) return
        const remoteItems: CartLineItem[] = (data ?? [])
          .filter((row): row is typeof row & { product: Product } => isProduct(row.product))
          .map(row => ({ product: row.product, quantity: Number(row.quantity) }))
        setItems(current => {
          const remoteIds = new Set(remoteItems.map(item => item.product.id))
          return [...remoteItems, ...current.filter(item => !remoteIds.has(item.product.id))]
        })
        cartOwnerId.current = profile.id
        setCartReady(true)
      } catch (error) {
        if (!active) return
        setCartReady(true)
        toast.error(error instanceof Error ? error.message : 'Unable to load your saved cart.')
      }
    })()
    return () => { active = false }
  }, [profile, isAuthLoading])

  useEffect(() => {
    if (IS_DEMO_MODE || !cartReady || !profile || cartOwnerId.current !== profile.id || !supabase) return
    const client = supabase
    const ownerId = profile.id
    const sync = async () => {
      const rows = items.map(({ product, quantity }) => ({
        user_id: ownerId,
        product_id: product.id,
        quantity,
        updated_at: new Date().toISOString(),
      }))
      if (rows.length) {
        const { error } = await client.from('cart_items').upsert(rows, { onConflict: 'user_id,product_id' })
        if (error) throw new Error(`Unable to save your cart: ${error.message}`)
        const productIds = rows.map(row => row.product_id)
        const { error: deleteError } = await client
          .from('cart_items')
          .delete()
          .eq('user_id', ownerId)
          .not('product_id', 'in', `(${productIds.join(',')})`)
        if (deleteError) throw new Error(`Unable to synchronize removed cart items: ${deleteError.message}`)
      } else {
        const { error } = await client.from('cart_items').delete().eq('user_id', ownerId)
        if (error) throw new Error(`Unable to clear your saved cart: ${error.message}`)
      }
    }
    syncQueue.current = syncQueue.current
      .then(sync)
      .catch(error => {
        toast.error(error instanceof Error ? error.message : 'Unable to synchronize your cart.')
      })
  }, [items, cartReady, profile])

  const addItem = useCallback((product: Product, qty = 1) => {
    const available = availableStock(product)
    if (available <= 0) return

    setItems(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      const nextQty = Math.min(
        existing ? existing.quantity + qty : Math.max(qty, product.min_order_qty),
        available,
        product.max_order_qty ?? Number.POSITIVE_INFINITY
      )

      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: nextQty } : item
        )
      }
      return [...prev, { product, quantity: nextQty }]
    })
    setIsOpen(true)
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(item => item.product.id !== productId))
  }, [])

  const updateQuantity = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      removeItem(productId)
      return
    }
    setItems(prev => prev.map(item => {
      if (item.product.id !== productId) return item
      return {
        ...item,
        quantity: Math.min(
          Math.max(qty, item.product.min_order_qty),
          availableStock(item.product),
          item.product.max_order_qty ?? Number.POSITIVE_INFINITY
        ),
      }
    }))
  }, [removeItem])

  const clearCart = useCallback(() => setItems([]), [])
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])

  const subtotal = useMemo(() =>
    items.reduce((sum, { product, quantity }) =>
      sum + productUnitPrice(product, quantity) * quantity, 0
    ), [items]
  )

  const farmerGroups = useMemo((): FarmerCartGroup[] => {
    const groups = new Map<string, FarmerCartGroup>()
    for (const item of items) {
      const farmerId = item.product.farmer_id
      let group = groups.get(farmerId)
      if (!group) {
        group = {
          farmerId,
          farmerName: item.product.farmer?.full_name ?? 'Local farmer',
          items: [],
          subtotal: 0,
        }
        groups.set(farmerId, group)
      }
      group.items.push(item)
      group.subtotal += productUnitPrice(item.product, item.quantity) * item.quantity
    }
    return [...groups.values()]
  }, [items])

  const value: CartContextValue = {
    items,
    isOpen,
    itemCount,
    subtotal,
    farmerGroups,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    toggleCart: () => setIsOpen(open => !open),
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}

function isProduct(value: unknown): value is Product {
  if (!value || typeof value !== 'object') return false
  const product = value as Record<string, unknown>
  return typeof product.id === 'string'
    && typeof product.name === 'string'
    && typeof product.price_per_unit === 'number'
    && typeof product.quantity_available === 'number'
    && typeof product.min_order_qty === 'number'
    && Array.isArray(product.images)
    && typeof product.unit === 'string'
    && typeof product.farmer_id === 'string'
    && typeof product.category_id === 'string'
    && typeof product.is_active === 'boolean'
    && typeof product.is_seasonal === 'boolean'
    && typeof product.is_surplus === 'boolean'
    && typeof product.organic_status === 'string'
    && typeof product.pesticide_status === 'string'
    && typeof product.review_count === 'number'
    && typeof product.created_at === 'string'
}
