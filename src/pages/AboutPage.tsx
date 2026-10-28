
export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">FarmDirect</p>
        <h1 className="text-3xl font-bold text-gray-900">About</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
          FarmDirect is a marketplace for customers and businesses to discover produce listings published directly by farmers. Product availability, harvest estimates, and prices are supplied by each seller and can change.
        </p>
        <p className="mt-4 text-sm text-gray-600">Payments and delivery booking are not configured. Checkout currently creates unpaid test orders only.</p>
      </div>
    </div>
  )
}
