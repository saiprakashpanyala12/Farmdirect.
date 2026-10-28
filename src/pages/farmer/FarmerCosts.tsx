import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/features/auth/AuthContext'
import {
  deleteFarmerExpense, listFarmerExpenses, listFarmerProducts, saveFarmerExpense,
} from '@/lib/marketplace'
import type { ExpenseCategory, FarmerExpense, Product } from '@/types/database'
import { formatPrice } from '@/lib/utils'

const CATEGORIES: Array<{ value: ExpenseCategory; label: string }> = [
  { value: 'seeds', label: 'Seeds and planting materials' },
  { value: 'fertilizers', label: 'Fertilizers' },
  { value: 'pesticides', label: 'Pesticides' },
  { value: 'labour', label: 'Labour' },
  { value: 'irrigation', label: 'Irrigation and water' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
]

const today = () => new Date().toISOString().slice(0, 10)
const blank = () => ({ date: today(), category: 'other' as ExpenseCategory, amount: '', notes: '', productId: '' })

export default function FarmerCosts() {
  const { profile } = useAuth()
  const [expenses, setExpenses] = useState<FarmerExpense[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState(blank)
  const [editingId, setEditingId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!profile) return
    try {
      const [expenseRows, productRows] = await Promise.all([
        listFarmerExpenses(profile.id),
        listFarmerProducts(profile.id),
      ])
      setExpenses(expenseRows)
      setProducts(productRows)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load farming costs.')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { void load() }, [load])

  const currentMonthTotal = useMemo(() => {
    const month = today().slice(0, 7)
    return expenses.reduce((sum, item) => item.expense_date.startsWith(month) ? sum + Number(item.amount) : sum, 0)
  }, [expenses])
  const lifetimeTotal = useMemo(() => expenses.reduce((sum, item) => sum + Number(item.amount), 0), [expenses])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!profile) return setError('Sign in to manage farming expenses.')
    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount <= 0 || !form.date) return setError('Enter a valid amount and expense date.')
    setSaving(true)
    setError('')
    try {
      await saveFarmerExpense(profile.id, {
        product_id: form.productId || null,
        expense_date: form.date,
        category: form.category,
        amount,
        notes: form.notes.trim(),
      }, editingId || undefined)
      toast.success(editingId ? 'Expense updated.' : 'Expense recorded.')
      setForm(blank())
      setEditingId('')
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save expense.')
    } finally {
      setSaving(false)
    }
  }

  const edit = (expense: FarmerExpense) => {
    setEditingId(expense.id)
    setForm({
      date: expense.expense_date,
      category: expense.category,
      amount: String(expense.amount),
      notes: expense.notes,
      productId: expense.product_id ?? '',
    })
  }

  const remove = async (expense: FarmerExpense) => {
    if (!profile || !window.confirm('Delete this expense record?')) return
    setError('')
    try {
      await deleteFarmerExpense(profile.id, expense.id)
      toast.success('Expense deleted.')
      if (editingId === expense.id) {
        setEditingId('')
        setForm(blank())
      }
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to delete expense.')
    }
  }

  return <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
    <header><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Farmer dashboard</p><h1 className="text-3xl font-bold text-gray-900">Farming costs</h1><p className="mt-2 text-sm text-gray-600">Record expenses for your own farm. Amounts are private to your farmer account.</p></header>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loading ? <p role="status" className="mt-6 text-sm text-gray-600">Loading your expenses…</p> : <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Summary title="Expenses this month" value={formatPrice(currentMonthTotal)} />
        <Summary title="All recorded expenses" value={formatPrice(lifetimeTotal)} />
      </div>
      <section className="mt-7 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold">{editingId ? 'Edit expense' : 'Record an expense'}</h2>
        <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Date<input className="input mt-1" type="date" required value={form.date} onChange={event => setForm(current => ({ ...current, date: event.target.value }))} /></label>
          <label className="text-sm font-medium">Category<select className="select mt-1" value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value as ExpenseCategory }))}>{CATEGORIES.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}</select></label>
          <label className="text-sm font-medium">Amount (INR)<input className="input mt-1" type="number" min="0.01" step="0.01" required value={form.amount} onChange={event => setForm(current => ({ ...current, amount: event.target.value }))} /></label>
          <label className="text-sm font-medium">Associated product (optional)<select className="select mt-1" value={form.productId} onChange={event => setForm(current => ({ ...current, productId: event.target.value }))}><option value="">Farm-wide expense</option>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
          <label className="text-sm font-medium sm:col-span-2">Description (optional)<textarea className="input mt-1 min-h-20" maxLength={2000} value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} /></label>
          <div className="flex gap-2 sm:col-span-2"><button disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Saving…' : editingId ? 'Save changes' : 'Record expense'}</button>{editingId && <button type="button" className="btn-secondary" onClick={() => { setEditingId(''); setForm(blank()) }}>Cancel edit</button>}</div>
        </form>
      </section>
      <section className="mt-7"><h2 className="mb-3 text-xl font-semibold">Expense history</h2>{expenses.length === 0 ? <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-7 text-center text-sm text-gray-600">No expenses recorded yet.</p> : <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-gray-50 text-gray-600"><tr><th className="p-3">Date</th><th className="p-3">Category</th><th className="p-3">Description</th><th className="p-3">Product</th><th className="p-3">Amount</th><th className="p-3">Actions</th></tr></thead><tbody className="divide-y divide-gray-100">{expenses.map(expense => <tr key={expense.id}><td className="p-3">{expense.expense_date}</td><td className="p-3">{CATEGORIES.find(category => category.value === expense.category)?.label ?? expense.category}</td><td className="p-3">{expense.notes}</td><td className="p-3">{expense.product?.name ?? 'Farm-wide'}</td><td className="p-3 font-medium">{formatPrice(Number(expense.amount))}</td><td className="p-3"><div className="flex gap-3"><button className="text-primary-700 underline" onClick={() => edit(expense)}>Edit</button><button className="text-red-700 underline" onClick={() => void remove(expense)}>Delete</button></div></td></tr>)}</tbody></table></div>}</section>
      <p className="mt-5 text-xs text-gray-500">Profitability is not calculated yet because expenses cannot be reliably allocated to completed, paid sales at product level. These totals include only expenses you recorded.</p>
    </>}
  </div>
}

function Summary({ title, value }: { title: string; value: string }) {
  return <article className="rounded-2xl border border-gray-200 bg-white p-5"><p className="text-sm text-gray-500">{title}</p><p className="mt-1 text-2xl font-bold text-gray-900">{value}</p></article>
}
