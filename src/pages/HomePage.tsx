import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, Leaf, Shield, TrendingUp, Search, MapPin,
  Star, CheckCircle, Truck, Award, Users, ChevronRight,
  ShoppingBag, Zap, Tag, ChevronDown
} from 'lucide-react'
import ProductCard from '@/features/products/ProductCard'
import { useProducts } from '@/features/products/useProducts'
import { useFarms } from '@/features/products/useFarms'
import StarRating from '@/components/ui/StarRating'
import { DEMO_HARVEST_ANNOUNCEMENTS, DEMO_TESTIMONIALS } from '@/lib/demo-data'
import { IS_DEMO_MODE } from '@/lib/constants'
import { formatPrice, hasActiveSurplusOffer } from '@/lib/utils'

const CATEGORIES = [
  { name: 'Vegetables', slug: 'vegetables', emoji: '🥦', bg: 'bg-green-50',  border: 'border-green-200'  },
  { name: 'Fruits',     slug: 'fruits',     emoji: '🍎', bg: 'bg-red-50',    border: 'border-red-200'    },
  { name: 'Grains',     slug: 'grains',     emoji: '🌾', bg: 'bg-amber-50',  border: 'border-amber-200'  },
  { name: 'Pulses',     slug: 'pulses',     emoji: '🫘', bg: 'bg-orange-50', border: 'border-orange-200' },
  { name: 'Spices',     slug: 'spices',     emoji: '🌶️', bg: 'bg-red-50',    border: 'border-red-200'    },
  { name: 'Dairy',      slug: 'dairy',      emoji: '🥛', bg: 'bg-blue-50',   border: 'border-blue-200'   },
  { name: 'Herbs',      slug: 'herbs',      emoji: '🌿', bg: 'bg-emerald-50',border: 'border-emerald-200'},
  { name: 'Flowers',    slug: 'flowers',    emoji: '🌸', bg: 'bg-pink-50',   border: 'border-pink-200'   },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Browse & Discover', desc: 'Search fresh products from local farmers near you.', icon: Search },
  { step: '02', title: 'Choose Your Farmer', desc: 'Read farm profiles, product details, and available customer reviews.', icon: Shield },
  { step: '03', title: 'Order Directly',    desc: 'Place retail or bulk orders. Fair prices — no middlemen.', icon: ShoppingBag },
  { step: '04', title: 'Fresh Delivery',    desc: 'Receive produce delivered direct from the farm.', icon: Truck },
]

const TRUST_FEATURES = [
  { icon: Shield,      title: 'Direct from Farmers',    desc: 'Discover products listed directly by local farmers.' },
  { icon: Leaf,        title: 'Transparent Practices',  desc: 'Organic status, pesticide use, and growing methods disclosed per product.' },
  { icon: Award,       title: 'Trust Score',            desc: 'A transparent 100-point score based on quality, fulfillment, reviews, and transparency.' },
  { icon: CheckCircle, title: 'Clear Growing Details',  desc: 'Product listings disclose the seller-provided organic and growing information.' },
  { icon: TrendingUp,  title: 'Batch Traceability',     desc: 'QR-code traceability shows harvest date, farm origin, and growing practices.' },
  { icon: Users,       title: 'Fair Pricing',           desc: 'Direct farm-to-buyer pricing means farmers earn more and you pay less.' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFaq, setActiveFaq] = useState<number | null>(null)
  const { products, error: productsError } = useProducts()
  const { farms, error: farmsError } = useFarms()

  const featuredProducts = products.filter(p => !hasActiveSurplusOffer(p)).slice(0, 8)
  const surplusProducts  = products.filter(p => hasActiveSurplusOffer(p)).slice(0, 4)

  const faqs = [
    { q: 'How do I know if a product is truly organic?',
      a: 'Product listings show the growing and organic information provided by the farmer. Check the listing details and certification information before purchasing.' },
    { q: 'How does the Farmer Trust Score work?',
      a: 'Seller insights currently show farm profile details and completed paid orders. A review-based Trust Score is not currently calculated.' },
    { q: 'Can I order in bulk for my restaurant or business?',
      a: 'Yes. Business buyers can submit Request for Quotations (RFQs), access wholesale price tiers, set up recurring weekly deliveries, and receive business invoices. Create a Business Buyer account to get started.' },
    { q: 'What happens if my order is substandard or doesn\'t arrive?',
      a: 'Raise a support ticket from your account. Our team reviews the dispute and coordinates with the farmer. Approved refunds are processed promptly. All disputes factor into the farmer\'s Trust Score.' },
    { q: 'How do harvest pre-orders work?',
      a: 'Farmers announce expected harvests with estimated dates and quantities. You reserve a quantity before harvest — prices are locked at reservation. If the harvest is delayed or insufficient, you may cancel for a full refund.' },
    { q: 'Are there any fees for customers?',
      a: 'No platform fees for customers. You pay the product price plus a delivery charge. Any applicable platform fees are shown in the marketplace terms.' },
  ]

  return (
    <div>
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[85vh] flex items-center bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 overflow-hidden">
        <div className="absolute inset-0 bg-hero-pattern opacity-60" />
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600"
            alt=""
            className="w-full h-full object-cover opacity-15"
          />
        </div>
        <div className="absolute top-20 right-10 w-64 h-64 rounded-full bg-accent-400/10 blur-3xl" />
        <div className="absolute bottom-10 left-20 w-48 h-48 rounded-full bg-primary-400/10 blur-3xl" />

        <div className="relative container-main py-20">
          <div className="max-w-3xl">
            {IS_DEMO_MODE && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-medium mb-6">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Demo Mode — Sample Data
              </div>
            )}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-5 leading-tight">
              Fresh From Farm,
              <span className="block text-accent-400">Straight to Your Table</span>
            </h1>
            <p className="text-lg text-primary-200 mb-8 max-w-xl leading-relaxed">
              Buy directly from Indian farmers. Transparent farming practices,
              fair prices, and fresh produce — no middlemen.
            </p>

            <form
              onSubmit={e => { e.preventDefault(); navigate(`/products?q=${encodeURIComponent(searchQuery)}`) }}
              className="flex gap-2 mb-8 max-w-xl"
            >
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tomatoes, rice, organic veggies…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl text-gray-900 bg-white border-0 focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm shadow-lg"
                />
              </div>
              <button type="submit" className="bg-accent-500 hover:bg-accent-600 text-white px-6 py-4 rounded-2xl font-semibold transition-colors shadow-lg whitespace-nowrap">
                Search
              </button>
            </form>

            {IS_DEMO_MODE && (
              <div className="flex flex-wrap gap-6">
              {[
                { value: '12,000+', label: 'Farmers' },
                { value: '2.5L+',   label: 'Happy Customers' },
                { value: '50+',     label: 'Crop Categories' },
                { value: '28',      label: 'States Served' },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-primary-300 text-sm">{s.label}</p>
                </div>
              ))}
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-primary-300 animate-bounce">
          <ChevronDown className="w-6 h-6" />
        </div>
      </section>

      {/* ── Category Nav ──────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100 py-6">
        <div className="container-main">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {CATEGORIES.map(cat => (
              <Link
                key={cat.slug}
                to={`/category/${cat.slug}`}
                className={`flex-shrink-0 flex flex-col items-center gap-2 px-5 py-3 rounded-2xl border-2 ${cat.bg} ${cat.border} hover:shadow-md transition-all group`}
              >
                <span className="text-2xl">{cat.emoji}</span>
                <span className="text-xs font-semibold text-gray-700 whitespace-nowrap group-hover:text-primary-700">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Products ─────────────────────────────────────────────── */}
      <section className="section bg-cream-100">
        <div className="container-main">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="section-title">Featured Products</h2>
              <p className="section-subtitle">Freshly listed by farmers across India</p>
            </div>
            <Link to="/products" className="hidden sm:flex items-center gap-1 text-primary-600 text-sm font-semibold hover:text-primary-800">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {productsError && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{productsError}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {featuredProducts.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
          {!productsError && featuredProducts.length === 0 && <p className="mt-4 text-sm text-gray-500">No products are currently listed.</p>}
          <div className="text-center mt-8">
            <Link to="/products" className="btn-primary btn-lg">
              Browse All Products <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section className="section bg-white">
        <div className="container-main">
          <div className="text-center mb-12">
            <h2 className="section-title">How FarmDirect Works</h2>
            <p className="section-subtitle max-w-xl mx-auto">From farm to your door in 4 simple steps — transparent and fair</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={i} className="relative text-center p-6 rounded-2xl bg-gradient-to-b from-primary-50 to-white border border-primary-100">
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div className="hidden lg:block absolute top-10 right-0 translate-x-1/2 z-10">
                      <ArrowRight className="w-5 h-5 text-primary-300" />
                    </div>
                  )}
                  <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-4 shadow-glow">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-xs font-bold text-primary-400 mb-1">{step.step}</div>
                  <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Harvest Announcements ─────────────────────────────────────────── */}
      {IS_DEMO_MODE && <section className="section bg-gradient-to-br from-accent-50 to-primary-50">
        <div className="container-main">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-2 badge-accent mb-2"><Zap className="w-3.5 h-3.5" /> Upcoming Harvests</div>
              <h2 className="section-title">Pre-Order Fresh Harvests</h2>
              <p className="section-subtitle">Reserve your share of the upcoming season's best produce</p>
            </div>
            <Link to="/harvest-calendar" className="hidden sm:flex items-center gap-1 text-primary-600 text-sm font-semibold">
              View Calendar <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {DEMO_HARVEST_ANNOUNCEMENTS.map(ann => (
              <Link key={ann.id} to="/harvest-calendar" className="card p-5 flex gap-4 hover:shadow-card-md transition-all group">
                <div className="w-16 h-16 rounded-xl bg-accent-100 flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-accent-700">
                    {new Date(ann.expected_harvest_date).toLocaleDateString('en-IN', { month: 'short' })}
                  </span>
                  <span className="text-2xl font-bold text-accent-800">
                    {new Date(ann.expected_harvest_date).getDate()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 group-hover:text-primary-700 mb-1">{ann.product_name}</h4>
                  <p className="text-sm text-gray-500 mb-2">{ann.farmer?.full_name} · {ann.farm?.district}</p>
                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    <span className="text-gray-600">{ann.estimated_quantity.toLocaleString()} {ann.unit}</span>
                    {ann.expected_price_min && (
                      <span className="font-semibold text-primary-700">
                        {formatPrice(ann.expected_price_min)}–{formatPrice(ann.expected_price_max ?? ann.expected_price_min)}/{ann.unit}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 self-center group-hover:text-primary-600" />
              </Link>
            ))}
          </div>
        </div>
      </section>}

      {/* ── Top Farmers ───────────────────────────────────────────────────── */}
      <section className="section bg-white">
        <div className="container-main">
          <div className="mb-8">
            <h2 className="section-title">Top-Rated Farmers</h2>
            <p className="section-subtitle">Meet farmers sharing their products on FarmDirect</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {farmsError && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{farmsError}</p>}
            {farms.map(farm => (
              <Link key={farm.id} to={`/farmer/${farm.farmer_id}`} className="card overflow-hidden group hover:shadow-card-md transition-all">
                <div className="relative h-32 bg-primary-100">
                  {farm.cover_image_url && (
                    <img src={farm.cover_image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute top-3 right-3 bg-white rounded-full px-2.5 py-1 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-bold text-gray-900">{farm.trust_score}/100</span>
                  </div>
                </div>
                <div className="p-4 -mt-8 relative">
                  <div className="w-16 h-16 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-primary-100 mb-3">
                    {farm.profile_image_url ? (
                      <img src={farm.profile_image_url} alt={farm.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Leaf className="w-7 h-7 text-primary-500" /></div>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 group-hover:text-primary-700 mb-0.5">{farm.name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mb-3">
                    <MapPin className="w-3.5 h-3.5" />{farm.district}, {farm.state}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="font-semibold text-gray-900">{farm.avg_rating}</span>
                      <span className="text-gray-400">({farm.total_orders} orders)</span>
                    </div>
                    <span className="text-primary-600 font-medium text-xs">View Farm →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Surplus Deals ─────────────────────────────────────────────────── */}
      {surplusProducts.length > 0 && (
        <section className="section bg-orange-50">
          <div className="container-main">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="inline-flex items-center gap-2 badge-orange mb-2"><Tag className="w-3.5 h-3.5" /> Surplus & Savings</div>
                <h2 className="section-title">Surplus Produce Deals</h2>
                <p className="section-subtitle">Reduce food waste, save money — excellent quality at discounted prices</p>
              </div>
              <Link to="/surplus" className="hidden sm:flex items-center gap-1 text-orange-600 text-sm font-semibold">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {surplusProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── Business CTA ──────────────────────────────────────────────────── */}
      <section className="section bg-primary-900 text-white">
        <div className="container-main">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-700 text-primary-200 text-sm font-medium mb-5">
                <ShoppingBag className="w-4 h-4" /> For Restaurants & Businesses
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                Bulk Ordering for Your Business
              </h2>
              <p className="text-primary-300 mb-6 leading-relaxed">
                Restaurants, hotels, retailers, and grocers — get wholesale prices, submit RFQs,
                set up recurring weekly orders, and receive business invoices.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Wholesale price tiers (pay less as you order more)',
                  'Request for Quotation (RFQ) system',
                  'Recurring daily or weekly order schedules',
                  'Business GST invoices',
                  'Multiple delivery locations',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-primary-200">
                    <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>
              <div className="flex gap-3 flex-wrap">
                <Link to="/register?role=business" className="btn-accent btn-lg">Create Business Account</Link>
                <Link to="/bulk-ordering" className="btn-secondary btn-lg">Learn More</Link>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=600" alt="Business ordering" className="w-full object-cover h-80" />
              </div>
              <div className="absolute -bottom-4 -left-4 card p-4 shadow-card-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Save 15–30%</p>
                    <p className="text-xs text-gray-500">vs retail market prices</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust & Transparency ──────────────────────────────────────────── */}
      <section className="section bg-cream-100">
        <div className="container-main">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 badge-green mb-4 text-sm"><Shield className="w-4 h-4" /> Farm Transparency</div>
            <h2 className="section-title">Why Trust FarmDirect?</h2>
            <p className="section-subtitle max-w-xl mx-auto">Radical transparency — every product page shows exactly what went into growing your food.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TRUST_FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i} className="card p-6 hover:shadow-card-md transition-all">
                  <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────────── */}
      {IS_DEMO_MODE && <section className="section bg-white">
        <div className="container-main">
          <div className="text-center mb-10">
            <h2 className="section-title">What Our Community Says</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {DEMO_TESTIMONIALS.map(t => (
              <div key={t.id} className="card p-5 flex flex-col">
                <StarRating rating={t.rating} size="sm" />
                <p className="text-sm text-gray-600 mt-3 mb-4 leading-relaxed flex-1 italic">"{t.body}"</p>
                <div className="flex items-center gap-3">
                  <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full bg-gray-100" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>}

      {/* ── Farmer CTA ────────────────────────────────────────────────────── */}
      <section className="section bg-gradient-to-br from-primary-800 to-primary-900 text-white">
        <div className="container-main text-center">
          <div className="max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary-700 flex items-center justify-center mx-auto mb-5">
              <Leaf className="w-8 h-8 text-accent-400" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Are You a Farmer?</h2>
            <p className="text-primary-300 mb-8 text-lg leading-relaxed">
              Join FarmDirect and sell directly to households, restaurants, and businesses across India.
              No middlemen. Better prices. Transparent marketplace.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/register?role=farmer" className="btn-accent btn-lg">
                Start Selling Today <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/about" className="btn-secondary btn-lg">Learn More</Link>
            </div>
            <div className="mt-8 flex justify-center gap-8 text-sm text-primary-300 flex-wrap">
              <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-accent-400" />Free registration</span>
              <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-accent-400" />No upfront costs</span>
              <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-accent-400" />Full dashboard</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="section bg-cream-100">
        <div className="container-main max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="section-title">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="card overflow-hidden">
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-semibold text-gray-900 pr-4">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${activeFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {activeFaq === i && (
                  <div className="px-5 pb-5">
                    <p className="text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/help" className="btn-secondary">View Full Help Center</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
