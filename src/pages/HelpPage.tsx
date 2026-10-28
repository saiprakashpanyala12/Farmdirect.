
import { Link } from 'react-router-dom'

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">FarmDirect</p>
        <h1 className="text-3xl font-bold text-gray-900">Help & Support</h1>
        <div className="mt-6 max-w-3xl space-y-5">
          <section><h2 className="font-semibold text-gray-900">Why can’t I sign in?</h2><p className="mt-1 text-sm text-gray-600">Email confirmation is required. Follow the confirmation link or request another from the registration or sign-in page. If email delivery is rate-limited, wait and try later; do not repeatedly submit signup requests.</p></section>
          <section><h2 className="font-semibold text-gray-900">Why is a farmer’s product not visible?</h2><p className="mt-1 text-sm text-gray-600">Only active, non-archived products from farmer accounts are listed. Ask the farmer to confirm that the product is active and attached to their own farm.</p></section>
          <section><h2 className="font-semibold text-gray-900">Does checkout charge my payment method?</h2><p className="mt-1 text-sm text-gray-600">No. Payment processing and delivery booking are not configured. Checkout creates an unpaid test order.</p></section>
          <section><h2 className="font-semibold text-gray-900">Where can I get support?</h2><p className="mt-1 text-sm text-gray-600">Verified public support details have not been supplied yet. Phone: --- · Email: --- · Address: ---</p><Link to="/contact" className="mt-2 inline-block text-sm font-medium text-primary-700 underline">Contact information</Link></section>
        </div>
      </div>
    </div>
  )
}
