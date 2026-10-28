create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null unique references public.profiles (id) on delete cascade,
  name text not null,
  description text not null default '',
  village text,
  district text,
  state text not null,
  pincode text,
  trust_score integer check (trust_score is null or trust_score between 0 and 100),
  avg_rating numeric(3, 2) check (avg_rating is null or avg_rating between 0 and 5),
  total_orders integer not null default 0 check (total_orders >= 0),
  area_acres numeric(10, 2),
  crops_grown text[] not null default '{}',
  certifications text[] not null default '{}',
  profile_image_url text,
  cover_image_url text,
  verification_status text not null default 'not_submitted'
    check (verification_status in ('not_submitted', 'pending', 'approved', 'rejected', 'expired', 'resubmit')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

insert into public.categories (id, name, slug, sort_order)
values
  ('cat-vegetables', 'Vegetables', 'vegetables', 1),
  ('cat-fruits', 'Fruits', 'fruits', 2),
  ('cat-grains', 'Grains', 'grains', 3),
  ('cat-pulses', 'Pulses', 'pulses', 4),
  ('cat-spices', 'Spices', 'spices', 5),
  ('cat-dairy', 'Dairy', 'dairy', 6),
  ('cat-herbs', 'Herbs', 'herbs', 7),
  ('cat-flowers', 'Flowers', 'flowers', 8)
on conflict (id) do nothing;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles (id) on delete restrict,
  farm_id uuid not null references public.farms (id) on delete restrict,
  category_id text not null references public.categories (id),
  name text not null check (length(trim(name)) between 1 and 120),
  description text not null default '',
  price_per_unit numeric(12, 2) not null check (price_per_unit > 0),
  unit text not null check (unit in ('kg', 'g', 'piece', 'litre', 'ml', 'bundle', 'dozen', 'quintal')),
  quantity_available numeric(12, 3) not null default 0 check (quantity_available >= 0),
  quantity_reserved numeric(12, 3) not null default 0 check (quantity_reserved >= 0),
  min_order_qty numeric(12, 3) not null default 1 check (min_order_qty > 0),
  max_order_qty numeric(12, 3) check (max_order_qty is null or max_order_qty >= min_order_qty),
  grade text check (grade is null or grade in ('a', 'b', 'c', 'A', 'B', 'C', 'premium')),
  harvest_date date,
  is_seasonal boolean not null default false,
  is_surplus boolean not null default false,
  organic_status text not null default 'not_disclosed'
    check (organic_status in ('certified_organic', 'certification_pending', 'farmer_declared_organic', 'conventional', 'not_disclosed')),
  pesticide_status text not null default 'not_disclosed'
    check (pesticide_status in ('none_used', 'natural_only', 'minimal_use', 'standard_use', 'used', 'not_disclosed')),
  farming_method text,
  images text[] not null default '{}',
  bulk_price_tiers jsonb not null default '[]'::jsonb check (jsonb_typeof(bulk_price_tiers) = 'array'),
  is_active boolean not null default true,
  is_archived boolean not null default false,
  avg_rating numeric(3, 2) not null default 0 check (avg_rating between 0 and 5),
  review_count integer not null default 0 check (review_count >= 0),
  sold_count integer not null default 0 check (sold_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (quantity_reserved <= quantity_available)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references public.profiles (id) on delete restrict,
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  delivery_charge numeric(12, 2) not null default 0 check (delivery_charge >= 0),
  platform_fee numeric(12, 2) not null default 0 check (platform_fee >= 0),
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'preparing', 'ready', 'shipped', 'delivered', 'cancelled', 'refund_requested', 'refunded')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  payment_method text not null default 'test',
  payment_reference text,
  delivery_address jsonb not null,
  delivery_slot text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  farmer_id uuid not null references public.profiles (id) on delete restrict,
  product_name text not null,
  product_image text,
  unit text not null,
  quantity numeric(12, 3) not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price > 0),
  total_price numeric(12, 2) not null check (total_price >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'preparing', 'ready', 'shipped', 'delivered', 'cancelled', 'refund_requested', 'refunded')),
  created_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity numeric(12, 3) not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create or replace function public.protect_farm_verification()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is not null and (
    (tg_op = 'INSERT' and new.verification_status <> 'not_submitted')
    or (tg_op = 'UPDATE' and new.verification_status is distinct from old.verification_status)
  ) then
    raise exception 'Farm verification status can only be changed by a trusted administrator.';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists protect_farm_verification on public.farms;
create trigger protect_farm_verification
  before insert or update on public.farms
  for each row execute function public.protect_farm_verification();

create index if not exists products_active_created_idx
  on public.products (is_active, is_archived, created_at desc);
create index if not exists products_farmer_created_idx
  on public.products (farmer_id, created_at desc);
create index if not exists products_category_idx
  on public.products (category_id);
create index if not exists orders_customer_created_idx
  on public.orders (customer_id, created_at desc);
create index if not exists order_items_farmer_idx
  on public.order_items (farmer_id, order_id);
create index if not exists order_items_order_idx
  on public.order_items (order_id);

alter table public.farms enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.cart_items enable row level security;

create or replace function public.is_farmdirect_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

revoke all on function public.is_farmdirect_admin() from public;
grant execute on function public.is_farmdirect_admin() to anon, authenticated;

create or replace function public.user_can_read_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.orders o
     where o.id = p_order_id
       and (
         o.customer_id = (select auth.uid())
         or exists (
           select 1 from public.order_items oi
           where oi.order_id = o.id and oi.farmer_id = (select auth.uid())
         )
         or public.is_farmdirect_admin()
       )
  );
$$;

revoke all on function public.user_can_read_order(uuid) from public, anon;
grant execute on function public.user_can_read_order(uuid) to authenticated;

drop policy if exists "Approved farms are public" on public.farms;
create policy "Approved farms are public"
  on public.farms for select
  to anon, authenticated
  using (
    verification_status = 'approved'
    or farmer_id = (select auth.uid())
    or public.is_farmdirect_admin()
  );

drop policy if exists "Farmers manage their farm" on public.farms;
create policy "Farmers manage their farm"
  on public.farms for all
  to authenticated
  using (
    farmer_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'farmer'
    )
  )
  with check (
    farmer_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'farmer'
    )
  );

drop policy if exists "Active categories are public" on public.categories;
create policy "Active categories are public"
  on public.categories for select
  to anon, authenticated
  using (is_active);

drop policy if exists "Available products are public" on public.products;
create policy "Available products are public"
  on public.products for select
  to anon, authenticated
  using (
    (is_active and not is_archived)
    or farmer_id = (select auth.uid())
    or public.is_farmdirect_admin()
  );

drop policy if exists "Verified farmers create products" on public.products;
create policy "Verified farmers create products"
  on public.products for insert
  to authenticated
  with check (
    farmer_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'farmer' and p.is_verified
    )
    and exists (
      select 1 from public.farms f
      where f.id = farm_id and f.farmer_id = (select auth.uid())
    )
  );

drop policy if exists "Verified farmers update products" on public.products;
create policy "Verified farmers update products"
  on public.products for update
  to authenticated
  using (
    farmer_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'farmer' and p.is_verified
    )
  )
  with check (
    farmer_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'farmer' and p.is_verified
    )
    and exists (
      select 1 from public.farms f
      where f.id = farm_id and f.farmer_id = (select auth.uid())
    )
  );

revoke all on public.products from anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert (
  farmer_id, farm_id, category_id, name, description, price_per_unit, unit,
  quantity_available, min_order_qty, max_order_qty, grade, harvest_date,
  is_seasonal, is_surplus, organic_status, pesticide_status, farming_method,
  images, bulk_price_tiers, is_active, is_archived
) on public.products to authenticated;
grant update (
  farm_id, category_id, name, description, price_per_unit, unit,
  quantity_available, min_order_qty, max_order_qty, grade, harvest_date,
  is_seasonal, is_surplus, organic_status, pesticide_status, farming_method,
  images, bulk_price_tiers, is_active, is_archived, updated_at
) on public.products to authenticated;

drop policy if exists "Customers and involved farmers read orders" on public.orders;
create policy "Customers and involved farmers read orders"
  on public.orders for select
  to authenticated
  using (
    public.user_can_read_order(id)
  );

drop policy if exists "Customers and involved farmers read order items" on public.order_items;
drop policy if exists "Farmers and customers read relevant order items" on public.order_items;

revoke all on public.orders, public.order_items from anon, authenticated;
grant select on public.orders, public.order_items to authenticated;
grant select on public.farms to anon, authenticated;
grant insert, update on public.farms to authenticated;
grant select on public.categories to anon, authenticated;

drop policy if exists "Users manage their own cart" on public.cart_items;
create policy "Users manage their own cart"
  on public.cart_items for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.cart_items to authenticated;

create policy "Farmers and customers read relevant order items"
  on public.order_items for select
  to authenticated
  using (
    farmer_id = (select auth.uid())
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = (select auth.uid())
    )
    or public.is_farmdirect_admin()
  );

create or replace function public.create_test_order(
  p_items jsonb,
  p_delivery_address jsonb,
  p_delivery_slot text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := auth.uid();
  v_line jsonb;
  v_product record;
  v_quantity numeric(12, 3);
  v_unit_price numeric(12, 2);
  v_line_total numeric(12, 2);
  v_subtotal numeric(12, 2) := 0;
  v_delivery_charge numeric(12, 2) := 0;
  v_farm_subtotals jsonb := '{}'::jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_order_id uuid := gen_random_uuid();
  v_order_number text := 'FD-' || upper(substr(replace(v_order_id::text, '-', ''), 1, 10));
  v_farm_id text;
  v_farm_subtotal numeric(12, 2);
  v_tier jsonb;
begin
  if v_customer_id is null then
    raise exception 'Sign in is required to place an order.';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'An order must contain between 1 and 50 distinct products.';
  end if;
  if (select count(*) from jsonb_array_elements(p_items) as item(value))
     <> (select count(distinct (item.value ->> 'product_id')::uuid)
           from jsonb_array_elements(p_items) as item(value)) then
    raise exception 'An order cannot contain duplicate product entries.';
  end if;
  if jsonb_typeof(p_delivery_address) <> 'object'
     or coalesce(p_delivery_address ->> 'fullName', '') = ''
     or coalesce(p_delivery_address ->> 'phone', '') = ''
     or coalesce(p_delivery_address ->> 'address', '') = ''
     or coalesce(p_delivery_address ->> 'city', '') = ''
     or coalesce(p_delivery_address ->> 'state', '') = ''
     or coalesce(p_delivery_address ->> 'pincode', '') !~ '^[0-9]{6}$' then
    raise exception 'A complete delivery address with a valid PIN code is required.';
  end if;

  for v_line in
    select item.value
      from jsonb_array_elements(p_items) as item(value)
     order by (item.value ->> 'product_id')::uuid
  loop
    v_quantity := (v_line ->> 'quantity')::numeric;
    if v_quantity <= 0 or v_quantity > 10000 then
      raise exception 'Order quantities must be positive and no greater than 10000.';
    end if;

    select p.id, p.farmer_id, p.name, p.images, p.unit, p.price_per_unit,
           p.bulk_price_tiers, p.quantity_available, p.quantity_reserved,
           p.min_order_qty, p.max_order_qty, p.is_active, p.is_archived, p.farm_id
      into v_product
      from public.products p
     where p.id = (v_line ->> 'product_id')::uuid
     for update;

    if not found or not v_product.is_active or v_product.is_archived then
      raise exception 'A product in this order is unavailable.';
    end if;
    if v_quantity < v_product.min_order_qty
       or (v_product.max_order_qty is not null and v_quantity > v_product.max_order_qty) then
      raise exception 'A product quantity is outside its allowed order range.';
    end if;
    if v_quantity > v_product.quantity_available - v_product.quantity_reserved then
      raise exception 'Stock changed for %, please update your cart.', v_product.name;
    end if;

    v_unit_price := v_product.price_per_unit;
    for v_tier in
      select value
        from jsonb_array_elements(v_product.bulk_price_tiers)
       where v_quantity >= (value ->> 'min_qty')::numeric
       order by (value ->> 'min_qty')::numeric desc
    loop
      v_unit_price := (v_tier ->> 'price_per_unit')::numeric;
      exit;
    end loop;
    if v_unit_price <= 0 then
      raise exception 'Invalid product price configuration.';
    end if;

    v_line_total := round(v_unit_price * v_quantity, 2);
    v_subtotal := v_subtotal + v_line_total;
    v_farm_id := v_product.farmer_id::text;
    v_farm_subtotals := jsonb_set(
      v_farm_subtotals,
      array[v_farm_id],
      to_jsonb(coalesce((v_farm_subtotals ->> v_farm_id)::numeric, 0) + v_line_total),
      true
    );
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'farmer_id', v_product.farmer_id,
      'product_name', v_product.name,
      'product_image', v_product.images[1],
      'unit', v_product.unit,
      'quantity', v_quantity,
      'unit_price', v_unit_price,
      'total_price', v_line_total
    ));
  end loop;

  for v_farm_id, v_farm_subtotal in
    select key, value::numeric from jsonb_each_text(v_farm_subtotals)
  loop
    if v_farm_subtotal < 500 then
      v_delivery_charge := v_delivery_charge + 30;
    end if;
  end loop;

  insert into public.orders (
    id, order_number, customer_id, total_amount, delivery_charge,
    status, payment_status, payment_method, delivery_address, delivery_slot
  ) values (
    v_order_id, v_order_number, v_customer_id,
    v_subtotal + v_delivery_charge, v_delivery_charge,
    'pending', 'pending', 'test', p_delivery_address, p_delivery_slot
  );

  for v_line in select value from jsonb_array_elements(v_lines)
  loop
    update public.products
       set quantity_reserved = quantity_reserved + (v_line ->> 'quantity')::numeric,
           updated_at = now()
     where id = (v_line ->> 'product_id')::uuid;

    insert into public.order_items (
      order_id, product_id, farmer_id, product_name, product_image,
      unit, quantity, unit_price, total_price
    ) values (
      v_order_id, (v_line ->> 'product_id')::uuid, (v_line ->> 'farmer_id')::uuid,
      v_line ->> 'product_name', v_line ->> 'product_image',
      v_line ->> 'unit', (v_line ->> 'quantity')::numeric,
      (v_line ->> 'unit_price')::numeric, (v_line ->> 'total_price')::numeric
    );
  end loop;

  return v_order_id;
end;
$$;

revoke all on function public.create_test_order(jsonb, jsonb, text) from public, anon;
grant execute on function public.create_test_order(jsonb, jsonb, text) to authenticated;

create or replace function public.cancel_pending_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := auth.uid();
  v_order public.orders%rowtype;
  v_item record;
begin
  if v_customer_id is null then
    raise exception 'Sign in is required to cancel an order.';
  end if;

  select * into v_order
    from public.orders
   where id = p_order_id and customer_id = v_customer_id
   for update;
  if not found then
    raise exception 'Order not found in your account.';
  end if;
  if v_order.status <> 'pending' or v_order.payment_status <> 'pending' then
    raise exception 'Only pending, unpaid orders can be cancelled.';
  end if;

  for v_item in
    select oi.product_id, sum(oi.quantity) as quantity
      from public.order_items oi
     where oi.order_id = p_order_id
     group by oi.product_id
     order by oi.product_id
  loop
    update public.products
       set quantity_reserved = quantity_reserved - v_item.quantity,
           updated_at = now()
     where id = v_item.product_id
       and quantity_reserved >= v_item.quantity;
    if not found then
      raise exception 'Unable to release reserved inventory for this order.';
    end if;
  end loop;

  update public.order_items
     set status = 'cancelled'
   where order_id = p_order_id;
  update public.orders
     set status = 'cancelled', updated_at = now()
   where id = p_order_id;
end;
$$;

revoke all on function public.cancel_pending_order(uuid) from public, anon;
grant execute on function public.cancel_pending_order(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Product images are publicly readable" on storage.objects;
create policy "Product images are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "Verified farmers upload product images" on storage.objects;
create policy "Verified farmers upload product images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'farmer' and p.is_verified
    )
  );

drop policy if exists "Farmers update their product images" on storage.objects;
create policy "Farmers update their product images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Farmers remove their product images" on storage.objects;
create policy "Farmers remove their product images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
