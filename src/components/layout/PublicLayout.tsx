import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import CartDrawer from '@/features/cart/CartDrawer'
import { IS_DEMO_MODE, SUPABASE_CONFIGURED } from '@/lib/constants'

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-cream-100">
      {IS_DEMO_MODE ? (
        <div className="bg-amber-500 text-white text-center py-1.5 px-4 text-xs font-medium">
          🌾 Demo Mode — Sample Data Only | Connect Supabase to use real data
        </div>
      ) : !SUPABASE_CONFIGURED ? (
        <div role="alert" className="bg-red-100 px-4 py-1.5 text-center text-xs font-medium text-red-900">
          Supabase is not configured · Live catalog, account, and order data are unavailable
        </div>
      ) : null}
      <Navbar />
      <main className="flex-1"><Outlet /></main>
      <Footer />
      <CartDrawer />
    </div>
  )
}
