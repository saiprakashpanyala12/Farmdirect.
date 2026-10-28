import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useCart } from '@/features/cart/CartContext'
import { saveDemoOrder, type DemoOrder } from '@/features/orders/demo-orders'
import { DELIVERY_BASE_FEE, FREE_DELIVERY_THRESHOLD, IS_DEMO_MODE } from '@/lib/constants'
import { availableStock, productUnitPrice, formatPrice, generateOrderId } from '@/lib/utils'
import { listCustomerAddresses, placeTestOrder } from '@/lib/marketplace'
import type { CustomerAddress } from '@/types/database'

interface DeliveryForm {
  fullName: string
  phone: string
  address: string
  city: string
  state: string
  pincode: string
  deliverySlot: string
}

export default function CheckoutPage() {
  const { profile } = useAuth()
  const { items, farmerGroups, subtotal, clearCart } = useCart()
  const navigate = useNavigate()
  const [form, setForm] = useState<DeliveryForm>({
    fullName: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    deliverySlot: 'Tomorrow, 9 AM - 12 PM',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [addressError, setAddressError] = useState('')
  const [selectedAddressId, setSelectedAddressId] = useState('')

  useEffect(() => {
    let active = true
    if (!profile || IS_DEMO_MODE) return
    void listCustomerAddresses(profile.id).then(result => {
      if (!active) return
      setAddresses(result)
      const defaultAddress = result.find(address => address.is_default)
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id)
        setForm(current => ({
          ...current,
          fullName: defaultAddress.recipient_name,
          phone: defaultAddress.phone,
          address: [defaultAddress.address_line1, defaultAddress.address_line2, defaultAddress.locality].filter(Boolean).join(', '),
          city: defaultAddress.city,
          state: defaultAddress.state,
          pincode: defaultAddress.pincode,
        }))
      }
    }).catch(caught => {
      if (active) setAddressError(caught instanceof Error ? caught.message : 'Unable to load saved addresses.')
    })
    return () => { active = false }
  }, [profile])

  const deliveryCharge = farmerGroups.reduce(
    (total, group) => total + (group.subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_BASE_FEE),
    0
  )
  const total = subtotal + deliveryCharge

  const updateForm = (field: keyof DeliveryForm, value: string) => {
    setForm(current => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!items.length) {
      setError('Your cart is empty. Add products before checking out.')
      return
    }
    if (items.some(({ product, quantity }) => quantity > availableStock(product))) {
      setError('Stock has changed for an item in your cart. Update your cart before placing the order.')
      return
    }
    if (!profile) {
      setError('Sign in before placing your order.')
      return
    }
    if (!/^[0-9+() -]{8,20}$/.test(form.phone.trim())) {
      setError('Enter a valid phone number.')
      return
    }
    if (!/^\d{6}$/.test(form.pincode.trim())) {
      setError('Enter a valid 6-digit PIN code.')
      return
    }

    setIsSubmitting(true)
    try {
      const deliveryAddress = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        deliveryNote: addresses.find(address => address.id === selectedAddressId)?.delivery_note || '',
      }
      if (IS_DEMO_MODE) {
        const now = new Date().toISOString()
        const order: DemoOrder = {
          id: generateOrderId(),
          orderNumber: `FD-${Date.now().toString(36).toUpperCase()}`,
          status: 'pending',
          paymentStatus: 'pending',
          createdAt: now,
          items: [...items],
          farmerGroups: farmerGroups.map(group => ({ ...group, items: [...group.items] })),
          subtotal,
          deliveryCharge,
          total,
          deliveryAddress,
          deliverySlot: form.deliverySlot,
          customerEmail: profile.email,
        }
        saveDemoOrder(order)
        clearCart()
        navigate(`/order-confirm/${encodeURIComponent(order.id)}`)
        return
      }
      const order = await placeTestOrder(
        items.map(({ product, quantity }) => ({ product_id: product.id, quantity })),
        deliveryAddress,
        form.deliverySlot
      )
      clearCart()
      navigate(`/order-confirm/${encodeURIComponent(order.id)}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to place order.')
      setIsSubmitting(false)
    }
  }

  if (!items.length) {
    return (
      <div className="container-main py-12">
        <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Your cart is empty</h1>
          <p className="mt-2 text-sm text-gray-600">Add a product before starting checkout.</p>
          <Link to="/products" className="btn-primary mt-5 inline-flex">Browse products</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container-main py-8">
      <Link to="/cart" className="mb-5 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-700">
        <ArrowLeft className="h-4 w-4" /> Back to cart
      </Link>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <section>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Delivery details</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">Checkout</h1>

          <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p><strong>{IS_DEMO_MODE ? 'Demo checkout:' : 'Test checkout:'}</strong> {IS_DEMO_MODE
              ? 'this saves an order in this browser only. No payment, farmer notification, or delivery booking will occur.'
              : 'this creates a pending Supabase order using live stock checks. No payment is processed and no delivery is booked.'}</p>
          </div>

          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {addressError && <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{addressError} You can still enter the delivery details manually.</p>}

          <form id="checkout-form" onSubmit={handleSubmit} className="mt-6 space-y-5">
            {addresses.length > 0 && (
              <label className="block">
                <span className="label">Use a saved address (optional)</span>
                <select
                  className="select"
                  value={selectedAddressId}
                  onChange={event => {
                    const selectedId = event.target.value
                    setSelectedAddressId(selectedId)
                    const selected = addresses.find(address => address.id === selectedId)
                    if (selected) {
                      setForm(current => ({
                        ...current,
                        fullName: selected.recipient_name,
                        phone: selected.phone,
                        address: [selected.address_line1, selected.address_line2, selected.locality].filter(Boolean).join(', '),
                        city: selected.city,
                        state: selected.state,
                        pincode: selected.pincode,
                      }))
                    }
                  }}
                >
                  <option value="">Enter a different address</option>
                  {addresses.map(address => (
                    <option key={address.id} value={address.id}>{address.label}{address.is_default ? ' (default)' : ''} — {address.city}, {address.state}</option>
                  ))}
                </select>
              </label>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" value={form.fullName} onChange={value => updateForm('fullName', value)} required />
              <Field label="Phone number" type="tel" value={form.phone} onChange={value => updateForm('phone', value)} required />
            </div>
            <Field label="Delivery address" value={form.address} onChange={value => updateForm('address', value)} required />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="City" value={form.city} onChange={value => updateForm('city', value)} required />
              <Field label="State" value={form.state} onChange={value => updateForm('state', value)} required />
              <Field label="PIN code" value={form.pincode} onChange={value => updateForm('pincode', value)} required />
            </div>
            <label className="block">
              <span className="label">Delivery slot</span>
              <select className="select" value={form.deliverySlot} onChange={event => updateForm('deliverySlot', event.target.value)}>
                <option>Tomorrow, 9 AM - 12 PM</option>
                <option>Tomorrow, 12 PM - 3 PM</option>
                <option>Tomorrow, 3 PM - 6 PM</option>
              </select>
            </label>
          </form>
        </section>

        <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">Order summary</h2>
          <div className="mt-4 space-y-3">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="flex justify-between gap-3 text-sm text-gray-600">
                <span>{product.name} × {quantity}</span>
                <span className="whitespace-nowrap">
                  {formatPrice(productUnitPrice(product, quantity) * quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between text-gray-600"><span>Delivery ({farmerGroups.length} farms)</span><span>{deliveryCharge ? formatPrice(deliveryCharge) : 'Free'}</span></div>
            <div className="flex justify-between border-t border-gray-100 pt-3 font-bold text-gray-900"><span>Total</span><span>{formatPrice(total)}</span></div>
          </div>
          <p className="mt-3 flex items-start gap-2 text-xs text-gray-500">
            <ShieldCheck className="h-4 w-4 flex-shrink-0 text-primary-600" />
            Payment is not processed. The order remains pending until payment and fulfillment are configured.
          </p>
          <button form="checkout-form" type="submit" disabled={isSubmitting} className="btn-primary mt-5 w-full justify-center">
            {isSubmitting ? 'Placing order…' : IS_DEMO_MODE ? 'Place demo order' : 'Place test order'}
          </button>
          <p className="mt-2 text-center text-[11px] text-gray-400">{IS_DEMO_MODE ? 'Stored locally on this device' : 'Saved to Supabase as pending and unpaid; no payment is processed'}</p>
        </aside>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        className="input"
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        required={required}
      />
    </label>
  )
}
