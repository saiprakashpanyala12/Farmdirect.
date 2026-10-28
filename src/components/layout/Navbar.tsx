import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Leaf, Search, ShoppingCart, User, Menu, X,
  ChevronDown, MapPin, LogOut, Settings, Package,
  BarChart3, Truck, HelpCircle
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useCart } from '@/features/cart/CartContext'
import { APP_NAME } from '@/lib/constants'

const CATEGORIES = [
  { name: 'Vegetables', slug: 'vegetables' },
  { name: 'Fruits',     slug: 'fruits'     },
  { name: 'Grains',     slug: 'grains'     },
  { name: 'Pulses',     slug: 'pulses'     },
  { name: 'Spices',     slug: 'spices'     },
  { name: 'Dairy',      slug: 'dairy'      },
  { name: 'Herbs',      slug: 'herbs'      },
]

export default function Navbar() {
  const { profile, signOut, isAuthenticated } = useAuth()
  const { itemCount, toggleCart } = useCart()
  const navigate = useNavigate()
  const [mobileOpen,  setMobileOpen]  = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [userMenu,    setUserMenu]    = useState(false)
  const [catMenu,     setCatMenu]     = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [location, setLocation] = useState(() => {
    try {
      const saved = localStorage.getItem('fd_location')
      if (!saved) return ''
      const parsed: unknown = JSON.parse(saved)
      if (typeof parsed !== 'object' || parsed === null || !('label' in parsed) || typeof parsed.label !== 'string') return ''
      return parsed.label
    } catch {
      return ''
    }
  })

  const saveLocation = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const city = String(formData.get('city') ?? '').trim()
    const state = String(formData.get('state') ?? '').trim()
    const pincode = String(formData.get('pincode') ?? '').trim()
    const label = [city, state, pincode].filter(Boolean).join(', ')
    if (!label) return
    try {
      localStorage.setItem('fd_location', JSON.stringify({ label }))
      setLocation(label)
      setLocationError('')
      setLocationOpen(false)
    } catch {
      setLocationError('Unable to save this location in browser storage.')
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) { navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`); setSearchQuery('') }
  }

  const dashboardLink = profile?.role === 'farmer' ? '/farm' : profile?.role === 'admin' ? '/admin' : '/account'

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div className="container-main">
        <div className="flex items-center gap-3 h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center group-hover:bg-primary-700 transition-colors">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-primary-800 hidden sm:block">{APP_NAME}</span>
          </Link>

          {/* Location */}
          <button onClick={() => setLocationOpen(true)} className="hidden md:flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 transition-colors flex-shrink-0">
            <MapPin className="w-4 h-4" /><span className="max-w-[130px] truncate">{location || 'Set Location'}</span><ChevronDown className="w-3 h-3" />
          </button>
          <button onClick={() => setLocationOpen(true)} aria-label={location ? `Delivery location: ${location}` : 'Set delivery location'} className="md:hidden btn-icon flex-shrink-0">
            <MapPin className="w-5 h-5" />
          </button>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 mx-2 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                placeholder="Search vegetables, fruits, grains…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white focus:border-primary-400 transition-all"
              />
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Categories dropdown */}
            <div className="relative hidden lg:block">
              <button onClick={() => setCatMenu(o => !o)} className="btn-ghost text-sm font-medium flex items-center gap-1">
                Categories <ChevronDown className="w-4 h-4" />
              </button>
              {catMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setCatMenu(false)} />
                  <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl shadow-card-md border border-gray-100 py-2 z-20 animate-slide-down">
                    {CATEGORIES.map(c => (
                      <Link key={c.slug} to={`/category/${c.slug}`} className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors" onClick={() => setCatMenu(false)}>
                        {c.name}
                      </Link>
                    ))}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <Link to="/bulk-ordering" className="block px-4 py-2.5 text-sm text-primary-700 font-medium hover:bg-primary-50" onClick={() => setCatMenu(false)}>Bulk Ordering</Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Cart */}
            <button onClick={toggleCart} className="btn-icon relative">
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </button>

            {/* User */}
            {isAuthenticated ? (
              <div className="relative">
                <button onClick={() => setUserMenu(o => !o)} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-700" />
                  </div>
                  <span className="hidden md:block text-sm font-medium text-gray-700 max-w-[90px] truncate">{profile?.full_name?.split(' ')[0]}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
                </button>
                {userMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenu(false)} />
                    <div className="absolute top-full right-0 mt-1 w-52 bg-white rounded-xl shadow-card-md border border-gray-100 py-2 z-20 animate-slide-down">
                      <div className="px-4 py-2 border-b border-gray-100 mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{profile?.full_name}</p>
                        <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
                      </div>
                      <Link to={dashboardLink} className="nav-link mx-2" onClick={() => setUserMenu(false)}><BarChart3 className="w-4 h-4" />Dashboard</Link>
                      <Link to={dashboardLink === '/farm' ? '/farm/orders' : '/account/orders'} className="nav-link mx-2" onClick={() => setUserMenu(false)}><Package className="w-4 h-4" />My Orders</Link>
                      <Link to={`${dashboardLink}/profile`} className="nav-link mx-2" onClick={() => setUserMenu(false)}><Settings className="w-4 h-4" />Profile</Link>
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <button onClick={() => { signOut(); setUserMenu(false) }} className="nav-link mx-2 w-[calc(100%-1rem)] text-red-600 hover:bg-red-50 hover:text-red-700">
                          <LogOut className="w-4 h-4" />Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-ghost text-sm">Sign In</Link>
                <Link to="/register" className="btn-primary text-sm hidden sm:flex">Get Started</Link>
              </div>
            )}

            {/* Mobile toggle */}
            <button className="btn-icon lg:hidden" onClick={() => setMobileOpen(o => !o)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Secondary nav */}
        <nav className="hidden md:flex items-center gap-1 pb-2 overflow-x-auto scrollbar-hide">
          <Link to="/products"          className="nav-link text-xs whitespace-nowrap">All Products</Link>
          {CATEGORIES.map(c => <Link key={c.slug} to={`/category/${c.slug}`} className="nav-link text-xs whitespace-nowrap">{c.name}</Link>)}
          <Link to="/harvest-calendar"  className="nav-link text-xs whitespace-nowrap">Harvest Calendar</Link>
          <Link to="/surplus"           className="nav-link text-xs whitespace-nowrap">Surplus Deals</Link>
          <Link to="/bulk-ordering"     className="nav-link text-xs whitespace-nowrap font-semibold text-primary-700">Bulk Orders</Link>
        </nav>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-1 shadow-lg animate-slide-down">
          <div className="grid grid-cols-2 gap-1">
            {CATEGORIES.map(c => (
              <Link key={c.slug} to={`/category/${c.slug}`} className="nav-link text-sm" onClick={() => setMobileOpen(false)}>{c.name}</Link>
            ))}
          </div>
          <div className="border-t pt-2 mt-2 space-y-1">
            <Link to="/bulk-ordering"   className="nav-link" onClick={() => setMobileOpen(false)}><Truck className="w-4 h-4" />Bulk Ordering</Link>
            <Link to="/harvest-calendar"className="nav-link" onClick={() => setMobileOpen(false)}>Harvest Calendar</Link>
            <Link to="/surplus"         className="nav-link" onClick={() => setMobileOpen(false)}>Surplus Deals</Link>
            <Link to="/help"            className="nav-link" onClick={() => setMobileOpen(false)}><HelpCircle className="w-4 h-4" />Help</Link>
          </div>
          {!isAuthenticated && (
            <div className="flex gap-2 pt-2">
              <Link to="/login"    className="btn-secondary flex-1 text-center" onClick={() => setMobileOpen(false)}>Sign In</Link>
              <Link to="/register" className="btn-primary flex-1 text-center"   onClick={() => setMobileOpen(false)}>Register</Link>
            </div>
          )}
        </div>
      )}
      {locationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="location-dialog-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div><h2 id="location-dialog-title" className="text-xl font-semibold text-gray-900">Set delivery location</h2><p className="mt-1 text-sm text-gray-500">Enter an area manually. This is saved only in this browser.</p></div>
              <button type="button" onClick={() => setLocationOpen(false)} aria-label="Close location dialog"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={saveLocation} className="mt-5 space-y-3">
              {locationError && <p role="alert" className="text-sm text-red-700">{locationError}</p>}
              <label className="block text-sm font-medium text-gray-700">City / area<input name="city" className="input mt-1" required maxLength={100} defaultValue={location.split(', ')[0] ?? ''} /></label>
              <label className="block text-sm font-medium text-gray-700">State<input name="state" className="input mt-1" maxLength={100} defaultValue={location.split(', ')[1] ?? ''} /></label>
              <label className="block text-sm font-medium text-gray-700">PIN code<input name="pincode" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} className="input mt-1" defaultValue={location.split(', ')[2] ?? ''} /></label>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 justify-center">Save location</button>
                {location && <button type="button" onClick={() => { localStorage.removeItem('fd_location'); setLocation(''); setLocationOpen(false) }} className="btn-secondary">Clear</button>}
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  )
}
