import type {
  CustomerAddress, CustomerNotification, Farm, FarmerExpense, HarvestEntry,
  Order, OrderItem, Product, QuotationRequest,
} from '@/types/database'
import { supabase } from './supabase'

export interface DeliveryAddress {
  fullName: string
  phone: string
  address: string
  city: string
  state: string
  pincode: string
  deliveryNote?: string
}

export interface MarketplaceOrder extends Omit<Order, 'delivery_address'> {
  delivery_address: DeliveryAddress
  items?: OrderItem[]
}

export interface FarmerOrderItem extends OrderItem {
  order?: Pick<Order, 'id' | 'order_number' | 'created_at' | 'status' | 'payment_status' | 'delivery_address'>
}

export interface ProductInput {
  farmName: string
  village: string
  district: string
  state: string
  categoryId: string
  name: string
  description: string
  pricePerUnit: number
  unit: Product['unit']
  quantityAvailable: number
  minOrderQty: number
  maxOrderQty: number | null
  harvestDate: string | null
  organicStatus: Product['organic_status']
  pesticideStatus: Product['pesticide_status']
  isSeasonal: boolean
  isSurplus: boolean
  surplusPricePerUnit: number | null
  surplusAvailableUntil: string | null
  images: string[]
}

function client() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

function formatDatabaseError(error: {
  message: string
  code?: string
  details?: string
  hint?: string
}): string {
  return [
    error.code ? `[${error.code}]` : '',
    error.message,
    error.details,
    error.hint ? `Hint: ${error.hint}` : '',
  ].filter(Boolean).join(' ')
}

const PRODUCT_SELECT = '*, category:categories(id,name,slug), farm:farms(*)'

export async function listWishlistProductIds(userId: string): Promise<string[]> {
  const { data, error } = await client().from('wishlist_items').select('product_id').eq('user_id', userId)
  if (error) throw new Error(`Unable to load your wishlist: ${formatDatabaseError(error)}`)
  return data.map(item => item.product_id)
}

export async function addWishlistItem(userId: string, productId: string): Promise<void> {
  const { error } = await client().from('wishlist_items').insert({ user_id: userId, product_id: productId })
  if (error) throw new Error(`Unable to save this product to your wishlist: ${formatDatabaseError(error)}`)
}

export async function removeWishlistItem(userId: string, productId: string): Promise<void> {
  const { error } = await client().from('wishlist_items').delete().eq('user_id', userId).eq('product_id', productId)
  if (error) throw new Error(`Unable to remove this product from your wishlist: ${formatDatabaseError(error)}`)
}

export async function listWishlistProducts(userId: string): Promise<Array<{ product_id: string; created_at: string; product: Product | null }>> {
  const { data, error } = await client()
    .from('wishlist_items')
    .select('product_id, created_at, product:products(*, category:categories(id,name,slug), farm:farms(*))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Unable to load your wishlist: ${formatDatabaseError(error)}`)
  return data as unknown as Array<{ product_id: string; created_at: string; product: Product | null }>
}

export async function listCustomerAddresses(userId: string): Promise<CustomerAddress[]> {
  const { data, error } = await client()
    .from('customer_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Unable to load your addresses: ${formatDatabaseError(error)}`)
  return data as CustomerAddress[]
}

export type CustomerAddressInput = Omit<CustomerAddress, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'is_default'>

export async function saveCustomerAddress(
  userId: string,
  values: CustomerAddressInput,
  addressId?: string
): Promise<CustomerAddress> {
  const db = client()
  const result = addressId
    ? await db.from('customer_addresses')
      .update({ ...values, is_default: false, updated_at: new Date().toISOString() })
      .eq('id', addressId)
      .eq('user_id', userId)
      .select('*')
      .single()
    : await db.from('customer_addresses')
      .insert({ ...values, user_id: userId, is_default: false })
      .select('*')
      .single()
  if (result.error) throw new Error(`Unable to save your address: ${formatDatabaseError(result.error)}`)
  return result.data as CustomerAddress
}

export async function setDefaultCustomerAddress(addressId: string): Promise<void> {
  const { error } = await client().rpc('set_default_customer_address', { p_address_id: addressId })
  if (error) throw new Error(`Unable to set the default address: ${formatDatabaseError(error)}`)
}

export async function deleteCustomerAddress(userId: string, addressId: string): Promise<void> {
  const { error } = await client().from('customer_addresses').delete().eq('id', addressId).eq('user_id', userId)
  if (error) throw new Error(`Unable to delete your address: ${formatDatabaseError(error)}`)
}

export async function listCustomerNotifications(userId: string): Promise<CustomerNotification[]> {
  const { data, error } = await client()
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Unable to load your notifications: ${formatDatabaseError(error)}`)
  return data as CustomerNotification[]
}

export async function markCustomerNotificationRead(userId: string, notificationId: string): Promise<void> {
  const { error } = await client()
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId)
  if (error) throw new Error(`Unable to update your notification: ${formatDatabaseError(error)}`)
}

export async function markAllCustomerNotificationsRead(userId: string): Promise<void> {
  const { error } = await client()
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  if (error) throw new Error(`Unable to update your notifications: ${formatDatabaseError(error)}`)
}

export async function listProducts(): Promise<Product[]> {
  const { data, error } = await client()
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('is_active', true)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Unable to load products: ${error.message}`)
  return data as Product[]
}

export async function getProduct(productId: string): Promise<Product | null> {
  const { data, error } = await client()
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('id', productId)
    .eq('is_active', true)
    .eq('is_archived', false)
    .maybeSingle()
  if (error) throw new Error(`Unable to load product: ${error.message}`)
  return data as Product | null
}

export async function listFarmerProducts(farmerId: string): Promise<Product[]> {
  const { data, error } = await client()
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('farmer_id', farmerId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Unable to load your products: ${error.message}`)
  return data as Product[]
}

export async function saveProduct(
  farmerId: string,
  input: ProductInput,
  productId?: string
): Promise<Product> {
  const db = client()
  const { data: authData, error: authError } = await db.auth.getUser()
  if (authError) throw new Error(`Unable to verify the current Supabase session: ${formatDatabaseError(authError)}`)
  if (!authData.user || authData.user.id !== farmerId) {
    throw new Error('The active Supabase user does not match the farmer account. Sign in again before saving this product.')
  }

  const farmValues = {
    farmer_id: farmerId,
    name: input.farmName.trim(),
    village: input.village.trim() || null,
    district: input.district.trim() || null,
    state: input.state.trim(),
  }
  const { data: farm, error: farmError } = await db
    .from('farms')
    .upsert(farmValues, { onConflict: 'farmer_id' })
    .select('id')
    .single()
  if (farmError) throw new Error(`Unable to save farm details: ${formatDatabaseError(farmError)}`)

  const productValues = {
    farm_id: farm.id,
    category_id: input.categoryId,
    name: input.name.trim(),
    description: input.description.trim(),
    price_per_unit: input.pricePerUnit,
    unit: input.unit,
    quantity_available: input.quantityAvailable,
    min_order_qty: input.minOrderQty,
    max_order_qty: input.maxOrderQty,
    harvest_date: input.harvestDate || null,
    organic_status: input.organicStatus,
    pesticide_status: input.pesticideStatus,
    is_seasonal: input.isSeasonal,
    is_surplus: input.isSurplus,
    surplus_price_per_unit: input.surplusPricePerUnit,
    surplus_available_until: input.surplusAvailableUntil,
    images: input.images,
    is_active: true,
    is_archived: false,
  }
  const query = productId
    ? db.from('products').update({ ...productValues, updated_at: new Date().toISOString() }).eq('id', productId)
    : db.from('products').insert({ ...productValues, farmer_id: farmerId })
  const { data, error } = await query.select(PRODUCT_SELECT).single()
  if (error) throw new Error(`Unable to save product: ${formatDatabaseError(error)}`)
  return data as Product
}

export async function archiveProduct(productId: string): Promise<void> {
  const { error } = await client()
    .from('products')
    .update({ is_active: false, is_archived: true, updated_at: new Date().toISOString() })
    .eq('id', productId)
  if (error) throw new Error(`Unable to archive product: ${error.message}`)
}

export async function updateProductStock(productId: string, quantity: number): Promise<void> {
  const { error } = await client()
    .from('products')
    .update({ quantity_available: quantity, updated_at: new Date().toISOString() })
    .eq('id', productId)
  if (error) throw new Error(`Unable to update inventory: ${error.message}`)
}

export async function uploadProductImages(farmerId: string, files: File[]): Promise<string[]> {
  const db = client()
  const urls: string[] = []
  for (const file of files) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      throw new Error(`${file.name} is not a supported image format.`)
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error(`${file.name} exceeds the 5 MB image limit.`)
    }
    const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
    const path = `${farmerId}/${crypto.randomUUID()}.${extension}`
    const { error } = await db.storage.from('product-images').upload(path, file, {
      contentType: file.type,
      upsert: false,
    })
    if (error) throw new Error(`Unable to upload ${file.name}: ${error.message}`)
    urls.push(db.storage.from('product-images').getPublicUrl(path).data.publicUrl)
  }
  return urls
}

export async function placeTestOrder(
  items: Array<{ product_id: string; quantity: number }>,
  address: DeliveryAddress,
  deliverySlot: string
): Promise<MarketplaceOrder> {
  const db = client()
  const { data: orderId, error: createError } = await db.rpc('create_test_order', {
    p_items: items,
    p_delivery_address: address,
    p_delivery_slot: deliverySlot,
  })
  if (createError) throw new Error(`Unable to place order: ${createError.message}`)
  const { data, error } = await db
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', orderId)
    .single()
  if (error) throw new Error(`Order was created, but could not be loaded: ${error.message}`)
  return data as MarketplaceOrder
}

export async function listCustomerOrders(customerId: string): Promise<MarketplaceOrder[]> {
  const { data, error } = await client()
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Unable to load your orders: ${error.message}`)
  return data as MarketplaceOrder[]
}

export async function getCustomerOrder(orderId: string, customerId: string): Promise<MarketplaceOrder | null> {
  const { data, error } = await client()
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', orderId)
    .eq('customer_id', customerId)
    .maybeSingle()
  if (error) throw new Error(`Unable to load order: ${error.message}`)
  return data as MarketplaceOrder | null
}

export async function listFarmerOrders(farmerId: string): Promise<FarmerOrderItem[]> {
  const { data, error } = await client()
    .from('order_items')
    .select('*, order:orders(id,order_number,created_at,status,payment_status,delivery_address)')
    .eq('farmer_id', farmerId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Unable to load farmer orders: ${error.message}`)
  return data as FarmerOrderItem[]
}

export async function cancelPendingOrder(orderId: string): Promise<void> {
  const { error } = await client().rpc('cancel_pending_order', { p_order_id: orderId })
  if (error) throw new Error(`Unable to cancel order: ${error.message}`)
}

export async function requestQuotation(input: Pick<QuotationRequest, 'buyer_id' | 'farmer_id' | 'product_id' | 'requested_quantity' | 'message'>): Promise<QuotationRequest> {
  const { data, error } = await client()
    .from('quotation_requests')
    .insert(input)
    .select('*')
    .single()
  if (error) throw new Error(`Unable to request a quotation: ${error.message}`)
  return data as QuotationRequest
}

export async function listQuotations(column: 'buyer_id' | 'farmer_id', userId: string): Promise<QuotationRequest[]> {
  const { data, error } = await client()
    .from('quotation_requests')
    .select('*, product:products(id,name,unit)')
    .eq(column, userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Unable to load quotations: ${error.message}`)
  return data as QuotationRequest[]
}

export async function respondToQuotation(
  quotationId: string,
  response: { status: 'quoted' | 'declined'; quoted_unit_price: number | null; farmer_response: string }
): Promise<void> {
  const { error } = await client()
    .from('quotation_requests')
    .update({ ...response, updated_at: new Date().toISOString() })
    .eq('id', quotationId)
  if (error) throw new Error(`Unable to respond to quotation: ${error.message}`)
}

export async function cancelQuotation(quotationId: string): Promise<void> {
  const { error } = await client()
    .from('quotation_requests')
    .update({ status: 'cancelled' })
    .eq('id', quotationId)
  if (error) throw new Error(`Unable to cancel quotation: ${error.message}`)
}

export async function listFarmerExpenses(farmerId: string): Promise<FarmerExpense[]> {
  const { data, error } = await client()
    .from('farmer_expenses')
    .select('*, product:products(id,name)')
    .eq('farmer_id', farmerId)
    .order('expense_date', { ascending: false })
  if (error) throw new Error(`Unable to load expenses: ${error.message}`)
  return data as FarmerExpense[]
}

export async function saveFarmerExpense(
  farmerId: string,
  input: Omit<FarmerExpense, 'id' | 'farmer_id' | 'created_at' | 'updated_at' | 'product'>,
  expenseId?: string
): Promise<void> {
  const db = client()
  const values = { ...input, updated_at: new Date().toISOString() }
  const query = expenseId
    ? db.from('farmer_expenses').update(values).eq('id', expenseId).eq('farmer_id', farmerId)
    : db.from('farmer_expenses').insert({ ...values, farmer_id: farmerId })
  const { error } = await query
  if (error) throw new Error(`Unable to save expense: ${error.message}`)
}

export async function deleteFarmerExpense(farmerId: string, expenseId: string): Promise<void> {
  const { error } = await client()
    .from('farmer_expenses')
    .delete()
    .eq('id', expenseId)
    .eq('farmer_id', farmerId)
  if (error) throw new Error(`Unable to delete expense: ${error.message}`)
}

export async function listHarvestEntries(farmerId: string): Promise<HarvestEntry[]> {
  const { data, error } = await client()
    .from('harvest_entries')
    .select('*, product:products(id,name)')
    .eq('farmer_id', farmerId)
    .order('expected_harvest_date', { ascending: true, nullsFirst: false })
  if (error) throw new Error(`Unable to load harvest entries: ${error.message}`)
  return data as HarvestEntry[]
}

export async function saveHarvestEntry(
  farmerId: string,
  input: Omit<HarvestEntry, 'id' | 'farmer_id' | 'created_at' | 'updated_at' | 'product'>,
  entryId?: string
): Promise<void> {
  const db = client()
  const values = { ...input, updated_at: new Date().toISOString() }
  const query = entryId
    ? db.from('harvest_entries').update(values).eq('id', entryId).eq('farmer_id', farmerId)
    : db.from('harvest_entries').insert({ ...values, farmer_id: farmerId })
  const { error } = await query
  if (error) throw new Error(`Unable to save harvest entry: ${error.message}`)
}

export async function deleteHarvestEntry(farmerId: string, entryId: string): Promise<void> {
  const { error } = await client()
    .from('harvest_entries')
    .delete()
    .eq('id', entryId)
    .eq('farmer_id', farmerId)
  if (error) throw new Error(`Unable to delete harvest entry: ${error.message}`)
}

export async function getFarmerFarm(farmerId: string): Promise<Farm | null> {
  const { data, error } = await client()
    .from('farms')
    .select('*')
    .eq('farmer_id', farmerId)
    .maybeSingle()
  if (error) throw new Error(`Unable to load your farm profile: ${error.message}`)
  return data as Farm | null
}

export async function updateFarmerFarm(
  farmerId: string,
  values: Pick<Farm,
    'name' | 'description' | 'village' | 'district' | 'state' | 'pincode' |
    'area_acres' | 'crops_grown' | 'certifications' | 'farming_methods' |
    'inputs_disclosure' | 'certification_notes'
  >
): Promise<Farm> {
  const { data, error } = await client()
    .from('farms')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('farmer_id', farmerId)
    .select('*')
    .single()
  if (error) throw new Error(`Unable to update your farm profile: ${error.message}`)
  return data as Farm
}
