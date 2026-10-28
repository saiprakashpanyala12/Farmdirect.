
import { Link } from 'react-router-dom'

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">FarmDirect</p>
        <h1 className="text-3xl font-bold text-gray-900">Contact</h1>
        <p className="mt-3 max-w-2xl text-sm text-gray-600">Public contact details have not been verified yet.</p>
        <dl className="mt-5 grid gap-3 text-sm text-gray-700 sm:grid-cols-3">
          <div><dt className="font-semibold">Phone</dt><dd>---</dd></div>
          <div><dt className="font-semibold">Email</dt><dd>---</dd></div>
          <div><dt className="font-semibold">Address</dt><dd>---</dd></div>
        </dl>
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Do not send passwords, payment information, or other sensitive details through unverified channels. For account questions, you can review the <Link className="font-semibold underline" to="/help">Help page</Link>.
        </div>
      </div>
    </div>
  )
}
