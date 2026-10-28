import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingBag, BarChart3, Leaf,
  Users, Settings, LogOut, Bell, Menu, X,
  FileText, Calendar, AlertTriangle, Star, Shield, Truck,
  MessageSquare, TrendingUp, DollarSign, ClipboardList, HelpCircle
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { APP_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'

type Role = 'farmer' | 'customer' | 'admin'

const NAV_ITEMS: Record<Role, { icon: React.ElementType; label: string; to: string }[]> = {
  farmer: [
    { icon: LayoutDashboard, label: 'Overview',     to: '/farm' },
    { icon: Package,         label: 'Products',     to: '/farm/products' },
    { icon: AlertTriangle,   label: 'Inventory',    to: '/farm/inventory' },
    { icon: ShoppingBag,     label: 'Orders',       to: '/farm/orders' },
    { icon: BarChart3,       label: 'Analytics',    to: '/farm/analytics' },
    { icon: DollarSign,      label: 'Costs',        to: '/farm/costs' },
    { icon: Calendar,        label: 'Harvest',      to: '/farm/harvest' },
    { icon: TrendingUp,      label: 'Surplus',      to: '/farm/surplus' },
    { icon: ClipboardList,   label: 'Quotations',   to: '/farm/quotations' },
    { icon: Star,            label: 'Trust Score',  to: '/farm/trust-score' },
    { icon: Leaf,            label: 'Farm Profile', to: '/farm/profile' },
  ],
  customer: [
    { icon: LayoutDashboard, label: 'Overview',      to: '/account' },
    { icon: ShoppingBag,     label: 'Orders',        to: '/account/orders' },
    { icon: Star,            label: 'Wishlist',      to: '/account/wishlist' },
    { icon: ClipboardList,   label: 'Quotations',    to: '/account/quotations' },
    { icon: Bell,            label: 'Notifications', to: '/account/notifications' },
    { icon: Truck,           label: 'Addresses',     to: '/account/addresses' },
    { icon: HelpCircle,      label: 'Support',       to: '/account/support' },
    { icon: Settings,        label: 'Profile',       to: '/account/profile' },
  ],
  admin: [
    { icon: LayoutDashboard, label: 'Overview',   to: '/admin' },
    { icon: Leaf,            label: 'Farmers',    to: '/admin/farmers' },
    { icon: Package,         label: 'Products',   to: '/admin/products' },
    { icon: ShoppingBag,     label: 'Orders',     to: '/admin/orders' },
    { icon: Users,           label: 'Users',      to: '/admin/users' },
    { icon: Star,            label: 'Reviews',    to: '/admin/reviews' },
    { icon: Shield,          label: 'Disputes',   to: '/admin/disputes' },
    { icon: FileText,        label: 'Audit Log',  to: '/admin/audit-log' },
    { icon: Settings,        label: 'Settings',   to: '/admin/settings' },
  ],
}

const ROLE_LABELS: Record<Role, string> = {
  farmer: 'Farmer Portal',
  customer: 'My Account',
  admin: 'Admin Panel',
}

export default function DashboardLayout({ role }: { role: Role }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navItems = NAV_ITEMS[role]

  const SidebarContent = () => (
    <aside className="flex flex-col h-full bg-primary-950 text-white w-64">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-primary-900">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center"><Leaf className="w-5 h-5 text-white" /></div>
          <div>
            <span className="font-bold text-sm text-white block">{APP_NAME}</span>
            <span className="text-primary-400 text-xs">{ROLE_LABELS[role]}</span>
          </div>
        </Link>
      </div>

      <div className="px-4 py-4 border-b border-primary-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-700 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-white">{profile?.full_name?.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.full_name}</p>
            <p className="text-xs text-primary-400 truncate">{profile?.email}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map(({ icon: Icon, label, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/farm' || to === '/account' || to === '/admin'}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              isActive ? 'bg-primary-700 text-white font-medium' : 'text-primary-300 hover:bg-primary-800 hover:text-white'
            )}
            onClick={() => setSidebarOpen(false)}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />{label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-primary-900 space-y-0.5">
        <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-primary-300 hover:bg-primary-800 hover:text-white transition-colors">
          <Leaf className="w-4 h-4" />Back to Store
        </Link>
        <button
          onClick={async () => { await signOut(); navigate('/') }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors"
        >
          <LogOut className="w-4 h-4" />Sign Out
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0"><SidebarContent /></div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 flex flex-col w-64"><SidebarContent /></div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <button className="lg:hidden btn-icon" onClick={() => setSidebarOpen(true)}><Menu className="w-5 h-5" /></button>
          <div className="flex-1" />
          <Link to="/account/notifications" className="btn-icon"><Bell className="w-5 h-5" /></Link>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  )
}
