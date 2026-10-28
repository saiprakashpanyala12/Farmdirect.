import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { listFarmerProducts } from '@/lib/marketplace'
import type { Farm, Product } from '@/types/database'
import { formatPrice } from '@/lib/utils'

export default function FarmerProfilePage() {
  const { id = '' } = useParams()
  const [farm, setFarm] = useState<Farm | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void (async () => {
      if (!supabase) {
        setError('Supabase is not configured.')
        setLoading(false)
        return
      }
      const { data: farmData, error: farmError } = await supabase
        .from('farms')
        .select('*')
        .eq('farmer_id', id)
        .maybeSingle()
      if (farmError) throw new Error(`Unable to load farmer profile: ${farmError.message}`)
      if (!farmData) {
        if (active) setFarm(null)
        return
      }
      const visibleProducts = (await listFarmerProducts(id)).filter(product => product.is_active && !product.is_archived)
      if (!active) return
      setFarm(farmData as Farm)
      setProducts(visibleProducts)
    })().catch(caught => {
      if (active) setError(caught instanceof Error ? caught.message : 'Unable to load farmer profile.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [id])

  if (loading) return <div className="container-main py-8"><p role="status">Loading farmer profile…</p></div>
  if (error) return <div className="container-main py-8"><p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p></div>
  if (!farm) return <div className="container-main py-8"><h1 className="text-2xl font-bold">Farmer profile unavailable</h1><p className="mt-2 text-sm text-gray-600">This farmer profile is not available.</p><Link className="mt-4 inline-block text-primary-700 underline" to="/products">Browse products</Link></div>

  return <div className="container-main py-8">
    <header className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Farm profile</p>
      <h1 className="mt-2 text-3xl font-bold text-gray-900">{farm.name}</h1>
      <p className="mt-2 text-sm text-gray-600">{[farm.village, farm.district, farm.state].filter(Boolean).join(', ')}</p>
      {farm.description && <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-700">{farm.description}</p>}
    </header>
    <section className="mt-8">
      <h2 className="mb-4 text-xl font-semibold">Available products</h2>
      {products.length === 0 ? <p className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">No active products are currently listed.</p>
        : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{products.map(product => <Link key={product.id} to={`/products/${product.id}`} className="overflow-hidden rounded-xl border border-gray-200 bg-white hover:shadow-md">
          {product.images[0] ? <img src={product.images[0]} alt={product.name} className="h-44 w-full object-cover" /> : <div className="flex h-44 items-center justify-center bg-gray-50 text-sm text-gray-500">No product image</div>}
          <div className="p-4"><h3 className="font-semibold">{product.name}</h3><p className="mt-1 text-sm text-gray-600">{formatPrice(product.price_per_unit)} / {product.unit}</p></div>
        </Link>)}</div>}
    </section>
  </div>
}
