import { Link } from 'react-router-dom'
import { Leaf } from 'lucide-react'
import { APP_NAME, APP_TAGLINE } from '@/lib/constants'

export default function Footer() {
  return (
    <footer className="bg-primary-950 text-white">
      <div className="container-main py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center"><Leaf className="w-6 h-6 text-white" /></div>
              <div>
                <span className="font-bold text-xl text-white block">{APP_NAME}</span>
                <span className="text-primary-300 text-xs">{APP_TAGLINE}</span>
              </div>
            </Link>
            <p className="text-primary-300 text-sm leading-relaxed mb-5 max-w-xs">
              Connecting verified farmers directly with households, restaurants, and businesses across India.
            </p>
            <p className="text-primary-300 text-sm">Phone: --- · Email: --- · Address: ---</p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">Shop</h4>
            <ul className="space-y-2.5">
              {[
                { label:'All Products',  to:'/products' },
                { label:'Vegetables',    to:'/category/vegetables' },
                { label:'Fruits',        to:'/category/fruits' },
                { label:'Grains',        to:'/category/grains' },
                { label:'Spices',        to:'/category/spices' },
                { label:'Bulk Orders',   to:'/bulk-ordering' },
                { label:'Surplus Deals', to:'/surplus' },
              ].map(l => <li key={l.to}><Link to={l.to} className="text-primary-300 text-sm hover:text-white transition-colors">{l.label}</Link></li>)}
            </ul>
          </div>

          {/* Farmers */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">For Farmers</h4>
            <ul className="space-y-2.5">
              {[
                { label:'Sell on FarmDirect',  to:'/register?role=farmer' },
                { label:'Farmer Dashboard',    to:'/farm' },
                { label:'Harvest Calendar',    to:'/harvest-calendar' },
                { label:'Pricing Insights',    to:'/farm/analytics' },
                { label:'Trust Score',         to:'/farm/trust-score' },
              ].map(l => <li key={l.to}><Link to={l.to} className="text-primary-300 text-sm hover:text-white transition-colors">{l.label}</Link></li>)}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">Company</h4>
            <ul className="space-y-2.5">
              {[
                { label:'About Us',         to:'/about'    },
                { label:'Contact',          to:'/contact'  },
                { label:'Help & Support',   to:'/help'     },
                { label:'Privacy Policy',   to:'/privacy'  },
                { label:'Terms of Service', to:'/terms'    },
                { label:'Shipping Policy',  to:'/shipping' },
              ].map(l => <li key={l.to}><Link to={l.to} className="text-primary-300 text-sm hover:text-white transition-colors">{l.label}</Link></li>)}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-primary-900">
        <div className="container-main py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-primary-400">
          <p>© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          <p>Built with ❤️ for Indian farmers and consumers</p>
        </div>
      </div>
    </footer>
  )
}
