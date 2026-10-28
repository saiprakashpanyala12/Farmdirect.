import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'

// Layouts
import PublicLayout from '@/components/layout/PublicLayout'
import DashboardLayout from '@/components/layout/DashboardLayout'

// Public Pages
import HomePage from '@/pages/HomePage'
import ProductsPage from '@/pages/ProductsPage'
import ProductDetailPage from '@/pages/ProductDetailPage'
import CategoryPage from '@/pages/CategoryPage'
import FarmerProfilePage from '@/pages/FarmerProfilePage'
import BulkOrderingPage from '@/pages/BulkOrderingPage'
import HarvestCalendarPage from '@/pages/HarvestCalendarPage'
import SurplusPage from '@/pages/SurplusPage'
import TraceabilityPage from '@/pages/TraceabilityPage'
import AboutPage from '@/pages/AboutPage'
import ContactPage from '@/pages/ContactPage'
import HelpPage from '@/pages/HelpPage'
import PrivacyPage from '@/pages/PrivacyPage'
import TermsPage from '@/pages/TermsPage'
import ShippingPage from '@/pages/ShippingPage'

// Auth Pages
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import AuthCallbackPage from '@/pages/auth/AuthCallbackPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'

// Customer Pages
import CartPage from '@/pages/CartPage'
import CheckoutPage from '@/pages/CheckoutPage'
import OrderConfirmPage from '@/pages/OrderConfirmPage'

// Customer Dashboard
import CustomerDashboard from '@/pages/customer/CustomerDashboard'
import CustomerOrders from '@/pages/customer/CustomerOrders'
import CustomerOrderDetail from '@/pages/customer/CustomerOrderDetail'
import CustomerWishlist from '@/pages/customer/CustomerWishlist'
import CustomerProfile from '@/pages/customer/CustomerProfile'
import CustomerAddresses from '@/pages/customer/CustomerAddresses'
import CustomerNotifications from '@/pages/customer/CustomerNotifications'
import CustomerSupport from '@/pages/customer/CustomerSupport'
import QuotationBuyerPage from '@/pages/customer/QuotationBuyerPage'

// Farmer Dashboard
import FarmerDashboard from '@/pages/farmer/FarmerDashboard'
import FarmerProducts from '@/pages/farmer/FarmerProducts'
import FarmerProductForm from '@/pages/farmer/FarmerProductForm'
import FarmerInventory from '@/pages/farmer/FarmerInventory'
import FarmerOrders from '@/pages/farmer/FarmerOrders'
import FarmerAnalytics from '@/pages/farmer/FarmerAnalytics'
import FarmerFarmProfile from '@/pages/farmer/FarmerFarmProfile'
import FarmerHarvest from '@/pages/farmer/FarmerHarvest'
import FarmerSurplus from '@/pages/farmer/FarmerSurplus'
import FarmerQuotations from '@/pages/farmer/FarmerQuotations'
import FarmerCosts from '@/pages/farmer/FarmerCosts'
import FarmerTrustScore from '@/pages/farmer/FarmerTrustScore'

// Admin Dashboard
import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminFarmers from '@/pages/admin/AdminFarmers'
import AdminProducts from '@/pages/admin/AdminProducts'
import AdminOrders from '@/pages/admin/AdminOrders'
import AdminUsers from '@/pages/admin/AdminUsers'
import AdminReviews from '@/pages/admin/AdminReviews'
import AdminDisputes from '@/pages/admin/AdminDisputes'
import AdminSettings from '@/pages/admin/AdminSettings'
import AdminAuditLog from '@/pages/admin/AdminAuditLog'

// Shared
import NotFoundPage from '@/pages/NotFoundPage'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// ── Guards ────────────────────────────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <LoadingSpinner fullScreen />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireRole({ role, children }: { role: string | string[]; children: React.ReactNode }) {
  const { profile, isLoading } = useAuth()
  if (isLoading) return <LoadingSpinner fullScreen />
  const roles = Array.isArray(role) ? role : [role]
  if (!profile || !roles.includes(profile.role)) return <Navigate to="/" replace />
  return <>{children}</>
}

// ── App Router ────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      {/* ── Public ─────────────────────────────────────────────── */}
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="category/:slug" element={<CategoryPage />} />
        <Route path="farmer/:id" element={<FarmerProfilePage />} />
        <Route path="bulk-ordering" element={<BulkOrderingPage />} />
        <Route path="harvest-calendar" element={<HarvestCalendarPage />} />
        <Route path="surplus" element={<SurplusPage />} />
        <Route path="trace/:batchId" element={<TraceabilityPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="shipping" element={<ShippingPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<RequireAuth><CheckoutPage /></RequireAuth>} />
        <Route path="order-confirm/:orderId" element={<RequireAuth><OrderConfirmPage /></RequireAuth>} />
      </Route>

      {/* ── Auth ────────────────────────────────────────────────── */}
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />
      <Route path="forgot-password" element={<ForgotPasswordPage />} />
      <Route path="auth/callback" element={<AuthCallbackPage />} />
      <Route path="reset-password" element={<ResetPasswordPage />} />

      {/* ── Customer Dashboard ───────────────────────────────────── */}
      <Route path="account" element={
        <RequireAuth>
          <RequireRole role={['customer', 'business']}>
            <DashboardLayout role="customer" />
          </RequireRole>
        </RequireAuth>
      }>
        <Route index element={<CustomerDashboard />} />
        <Route path="orders" element={<CustomerOrders />} />
        <Route path="orders/:id" element={<CustomerOrderDetail />} />
        <Route path="wishlist" element={<CustomerWishlist />} />
        <Route path="profile" element={<CustomerProfile />} />
        <Route path="addresses" element={<CustomerAddresses />} />
        <Route path="notifications" element={<CustomerNotifications />} />
        <Route path="support" element={<CustomerSupport />} />
        <Route path="quotations" element={<QuotationBuyerPage />} />
      </Route>

      {/* ── Farmer Dashboard ─────────────────────────────────────── */}
      <Route path="farm" element={
        <RequireAuth>
          <RequireRole role="farmer">
            <DashboardLayout role="farmer" />
          </RequireRole>
        </RequireAuth>
      }>
        <Route index element={<FarmerDashboard />} />
        <Route path="products" element={<FarmerProducts />} />
        <Route path="products/new" element={<FarmerProductForm />} />
        <Route path="products/:id/edit" element={<FarmerProductForm />} />
        <Route path="inventory" element={<FarmerInventory />} />
        <Route path="orders" element={<FarmerOrders />} />
        <Route path="analytics" element={<FarmerAnalytics />} />
        <Route path="profile" element={<FarmerFarmProfile />} />
        <Route path="harvest" element={<FarmerHarvest />} />
        <Route path="surplus" element={<FarmerSurplus />} />
        <Route path="quotations" element={<FarmerQuotations />} />
        <Route path="costs" element={<FarmerCosts />} />
        <Route path="trust-score" element={<FarmerTrustScore />} />
      </Route>

      {/* ── Admin Dashboard ──────────────────────────────────────── */}
      <Route path="admin" element={
        <RequireAuth>
          <RequireRole role="admin">
            <DashboardLayout role="admin" />
          </RequireRole>
        </RequireAuth>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="farmers" element={<AdminFarmers />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="disputes" element={<AdminDisputes />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="audit-log" element={<AdminAuditLog />} />
      </Route>

      {/* ── 404 ─────────────────────────────────────────────────── */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
