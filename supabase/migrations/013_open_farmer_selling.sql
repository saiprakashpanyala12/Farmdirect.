do $$
declare
  v_policy record;
  v_definition text;
begin
  for v_policy in
    select policy.polname, policy.polcmd, policy.polqual, policy.polwithcheck, relation.oid as relation_id
      from pg_policy policy
      join pg_class relation on relation.oid = policy.polrelid
      join pg_namespace namespace on namespace.oid = relation.relnamespace
     where namespace.nspname = 'public'
       and relation.relname = 'products'
  loop
    v_definition := coalesce(pg_get_expr(v_policy.polqual, v_policy.relation_id), '')
      || ' ' || coalesce(pg_get_expr(v_policy.polwithcheck, v_policy.relation_id), '');

    if v_policy.polcmd = 'r'
       or (v_policy.polcmd in ('a', 'w')
           and (
             v_definition ilike '%is_verified%'
             or v_definition ilike '%verification_status%'
             or v_definition ilike '%farmdirect_development_onboarding_enabled%'
             or v_policy.polname in (
               'Farmer product insert authorization cap',
               'Farmer product update authorization cap'
             )
           )) then
      execute format('drop policy %I on public.products', v_policy.polname);
    end if;
  end loop;

  for v_policy in
    select policy.polname
      from pg_policy policy
      join pg_class relation on relation.oid = policy.polrelid
      join pg_namespace namespace on namespace.oid = relation.relnamespace
     where namespace.nspname = 'public'
       and relation.relname = 'farms'
  loop
    execute format('drop policy %I on public.farms', v_policy.polname);
  end loop;

  for v_policy in
    select policy.polname, relation.oid as relation_id, policy.polqual, policy.polwithcheck
      from pg_policy policy
      join pg_class relation on relation.oid = policy.polrelid
      join pg_namespace namespace on namespace.oid = relation.relnamespace
     where namespace.nspname = 'storage'
       and relation.relname = 'objects'
  loop
    v_definition := coalesce(pg_get_expr(v_policy.polqual, v_policy.relation_id), '')
      || ' ' || coalesce(pg_get_expr(v_policy.polwithcheck, v_policy.relation_id), '');
    if v_definition ilike '%product-images%'
       and (
         v_definition ilike '%is_verified%'
         or v_definition ilike '%verification_status%'
         or v_definition ilike '%farmdirect_development_onboarding_enabled%'
       ) then
      execute format('drop policy %I on storage.objects', v_policy.polname);
    end if;
  end loop;
end;
$$;

alter table public.farms enable row level security;
alter table public.products enable row level security;
alter table public.quotation_requests enable row level security;

drop policy if exists "Approved farms are public" on public.farms;
drop policy if exists "Farmers manage their farm" on public.farms;
create policy "Farm profiles are public"
  on public.farms for select
  to anon, authenticated
  using (true);

create policy "Farmers manage their own farm"
  on public.farms for all
  to authenticated
  using (
    farmer_id = (select auth.uid())
    and exists (
      select 1 from public.profiles profile
       where profile.id = (select auth.uid())
         and profile.role = 'farmer'
    )
  )
  with check (
    farmer_id = (select auth.uid())
    and exists (
      select 1 from public.profiles profile
       where profile.id = (select auth.uid())
         and profile.role = 'farmer'
    )
  );

create policy "Admins manage farms"
  on public.farms for all
  to authenticated
  using (public.is_farmdirect_admin())
  with check (public.is_farmdirect_admin());

drop function if exists public.is_product_publicly_visible(uuid, uuid);
drop function if exists public.is_product_publicly_visible(uuid);

create function public.is_product_publicly_visible(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.products product
      join public.profiles farmer
        on farmer.id = product.farmer_id
       and farmer.role = 'farmer'
      join public.farms farm
        on farm.id = product.farm_id
       and farm.farmer_id = product.farmer_id
     where product.id = p_product_id
       and product.is_active
       and not product.is_archived
  );
$$;

revoke all on function public.is_product_publicly_visible(uuid) from public;
grant execute on function public.is_product_publicly_visible(uuid) to anon, authenticated;

create policy "Active farmer products are public"
  on public.products for select
  to anon, authenticated
  using (
    public.is_product_publicly_visible(id)
    or farmer_id = (select auth.uid())
    or public.is_farmdirect_admin()
  );

drop policy if exists "Verified farmers create products" on public.products;
drop policy if exists "Farmers create their own products" on public.products;
create policy "Farmers create their own products"
  on public.products for insert
  to authenticated
  with check (
    (
      farmer_id = (select auth.uid())
      and exists (
        select 1 from public.profiles profile
         where profile.id = (select auth.uid())
           and profile.role = 'farmer'
      )
      and exists (
        select 1 from public.farms farm
         where farm.id = products.farm_id
           and farm.farmer_id = (select auth.uid())
      )
    )
    or public.is_farmdirect_admin()
  );

create policy "Farmers insert only their own products"
  on public.products as restrictive for insert
  to authenticated
  with check (
    (
      farmer_id = (select auth.uid())
      and exists (
        select 1 from public.profiles profile
         where profile.id = (select auth.uid())
           and profile.role = 'farmer'
      )
      and exists (
        select 1 from public.farms farm
         where farm.id = products.farm_id
           and farm.farmer_id = (select auth.uid())
      )
    )
    or public.is_farmdirect_admin()
  );

drop policy if exists "Verified farmers update products" on public.products;
drop policy if exists "Farmers update their own products" on public.products;
create policy "Farmers update their own products"
  on public.products for update
  to authenticated
  using (
    (
      farmer_id = (select auth.uid())
      and exists (
        select 1 from public.profiles profile
         where profile.id = (select auth.uid())
           and profile.role = 'farmer'
      )
    )
    or public.is_farmdirect_admin()
  )
  with check (
    (
      farmer_id = (select auth.uid())
      and exists (
        select 1 from public.profiles profile
         where profile.id = (select auth.uid())
           and profile.role = 'farmer'
      )
      and exists (
        select 1 from public.farms farm
         where farm.id = products.farm_id
           and farm.farmer_id = (select auth.uid())
      )
    )
    or public.is_farmdirect_admin()
  );

create policy "Farmers update only their own products"
  on public.products as restrictive for update
  to authenticated
  using (
    (
      farmer_id = (select auth.uid())
      and exists (
        select 1 from public.profiles profile
         where profile.id = (select auth.uid())
           and profile.role = 'farmer'
      )
    )
    or public.is_farmdirect_admin()
  )
  with check (
    (
      farmer_id = (select auth.uid())
      and exists (
        select 1 from public.profiles profile
         where profile.id = (select auth.uid())
           and profile.role = 'farmer'
      )
      and exists (
        select 1 from public.farms farm
         where farm.id = products.farm_id
           and farm.farmer_id = (select auth.uid())
      )
    )
    or public.is_farmdirect_admin()
  );

grant select on public.products, public.farms to anon, authenticated;
grant insert (
  farmer_id, farm_id, category_id, name, description, price_per_unit, unit,
  quantity_available, min_order_qty, max_order_qty, grade, harvest_date,
  is_seasonal, is_surplus, organic_status, pesticide_status, farming_method,
  images, bulk_price_tiers, is_active, is_archived,
  surplus_price_per_unit, surplus_available_until
) on public.products to authenticated;
grant update (
  farm_id, category_id, name, description, price_per_unit, unit,
  quantity_available, min_order_qty, max_order_qty, grade, harvest_date,
  is_seasonal, is_surplus, organic_status, pesticide_status, farming_method,
  images, bulk_price_tiers, is_active, is_archived, updated_at,
  surplus_price_per_unit, surplus_available_until
) on public.products to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Product images are publicly readable" on storage.objects;
create policy "Product images are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "Verified farmers upload product images" on storage.objects;
drop policy if exists "Farmers upload their product images" on storage.objects;
drop policy if exists "Product image insert authorization cap" on storage.objects;
create policy "Farmers upload their product images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
        from public.profiles profile
        join public.farms farm on farm.farmer_id = profile.id
       where profile.id = (select auth.uid())
         and profile.role = 'farmer'
    )
  );
create policy "Product image insert ownership cap"
  on storage.objects as restrictive for insert
  to authenticated
  with check (
    bucket_id <> 'product-images'
    or (
      (storage.foldername(name))[1] = (select auth.uid())::text
      and exists (
        select 1
          from public.profiles profile
          join public.farms farm on farm.farmer_id = profile.id
         where profile.id = (select auth.uid())
           and profile.role = 'farmer'
      )
    )
  );

drop policy if exists "Farmers update their product images" on storage.objects;
drop policy if exists "Product image update authorization cap" on storage.objects;
create policy "Farmers update their product images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
        from public.profiles profile
        join public.farms farm on farm.farmer_id = profile.id
       where profile.id = (select auth.uid())
         and profile.role = 'farmer'
    )
  )
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
        from public.profiles profile
        join public.farms farm on farm.farmer_id = profile.id
       where profile.id = (select auth.uid())
         and profile.role = 'farmer'
    )
  );
create policy "Product image update ownership cap"
  on storage.objects as restrictive for update
  to authenticated
  using (
    bucket_id <> 'product-images'
    or (
      (storage.foldername(name))[1] = (select auth.uid())::text
      and exists (
        select 1
          from public.profiles profile
          join public.farms farm on farm.farmer_id = profile.id
         where profile.id = (select auth.uid())
           and profile.role = 'farmer'
      )
    )
  )
  with check (
    bucket_id <> 'product-images'
    or (
      (storage.foldername(name))[1] = (select auth.uid())::text
      and exists (
        select 1
          from public.profiles profile
          join public.farms farm on farm.farmer_id = profile.id
         where profile.id = (select auth.uid())
           and profile.role = 'farmer'
      )
    )
  );

drop policy if exists "Farmers remove their product images" on storage.objects;
drop policy if exists "Product image delete authorization cap" on storage.objects;
create policy "Farmers remove their product images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
        from public.profiles profile
        join public.farms farm on farm.farmer_id = profile.id
       where profile.id = (select auth.uid())
         and profile.role = 'farmer'
    )
  );
create policy "Product image delete ownership cap"
  on storage.objects as restrictive for delete
  to authenticated
  using (
    bucket_id <> 'product-images'
    or (
      (storage.foldername(name))[1] = (select auth.uid())::text
      and exists (
        select 1
          from public.profiles profile
          join public.farms farm on farm.farmer_id = profile.id
         where profile.id = (select auth.uid())
           and profile.role = 'farmer'
      )
    )
  );

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := coalesce(new.raw_user_meta_data ->> 'requested_role', 'customer');
  v_business_type text := new.raw_user_meta_data ->> 'business_type';
begin
  if v_role not in ('customer', 'farmer', 'business') then
    v_role := 'customer';
  end if;

  if v_role = 'business' and (
    v_business_type is null
    or v_business_type not in (
    'restaurant', 'hotel', 'retailer', 'grocery_store',
    'wholesaler', 'distributor', 'food_processor', 'other'
    )
  ) then
    v_business_type := 'other';
  end if;

  insert into public.profiles (
    id, email, full_name, phone, role, business_type, business_name, is_verified
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone',
    v_role,
    case when v_role = 'business' then v_business_type else null end,
    case when v_role = 'business' then new.raw_user_meta_data ->> 'business_name' else null end,
    false
  )
  on conflict (id) do update
    set email = excluded.email;

  if v_role = 'farmer' then
    insert into public.farms (farmer_id, name, state, village, district)
    values (
      new.id,
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'farm_name'), ''), 'Farm profile'),
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'farm_state'), ''), 'Not provided'),
      nullif(trim(new.raw_user_meta_data ->> 'farm_village'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'farm_district'), '')
    )
    on conflict (farmer_id) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;

insert into public.farms (farmer_id, name, state)
select profile.id,
       coalesce(nullif(trim(profile.full_name), ''), 'Farm') || ' Farm',
       'Not provided'
  from public.profiles profile
 where profile.role = 'farmer'
   and not exists (
     select 1 from public.farms farm where farm.farmer_id = profile.id
   )
on conflict (farmer_id) do nothing;

drop policy if exists "Buyers request quotations" on public.quotation_requests;
create policy "Buyers request quotations"
  on public.quotation_requests for insert
  to authenticated
  with check (
    buyer_id = (select auth.uid())
    and exists (
      select 1 from public.profiles buyer
       where buyer.id = (select auth.uid())
         and buyer.role in ('customer', 'business')
    )
    and exists (
      select 1
        from public.products product
        join public.farms farm
          on farm.id = product.farm_id
         and farm.farmer_id = product.farmer_id
        join public.profiles farmer
          on farmer.id = product.farmer_id
         and farmer.role = 'farmer'
       where product.id = quotation_requests.product_id
         and product.farmer_id = quotation_requests.farmer_id
         and product.is_active
         and not product.is_archived
    )
  );

drop policy if exists "Farmers respond to quotations" on public.quotation_requests;
create policy "Farmers respond to quotations"
  on public.quotation_requests for update
  to authenticated
  using (
    farmer_id = (select auth.uid())
    and status = 'requested'
    and exists (
      select 1 from public.profiles profile
       where profile.id = (select auth.uid())
         and profile.role = 'farmer'
    )
  )
  with check (
    farmer_id = (select auth.uid())
    and status in ('quoted', 'declined')
    and exists (
      select 1 from public.profiles profile
       where profile.id = (select auth.uid())
         and profile.role = 'farmer'
    )
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
  if v_customer_id is null or not exists (
    select 1 from public.profiles profile
     where profile.id = v_customer_id
       and profile.role in ('customer', 'business')
  ) then
    raise exception 'A customer or business account must be signed in to place an order.';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 50 then
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
    if v_quantity is null or v_quantity <= 0 or v_quantity > 10000 then
      raise exception 'Order quantities must be positive and no greater than 10000.';
    end if;

    select product.id, product.farmer_id, product.name, product.images, product.unit,
           product.price_per_unit, product.bulk_price_tiers, product.quantity_available,
           product.quantity_reserved, product.min_order_qty, product.max_order_qty,
           product.is_active, product.is_archived, product.farm_id,
           product.surplus_price_per_unit, product.surplus_available_until
      into v_product
      from public.products product
     where product.id = (v_line ->> 'product_id')::uuid
     for update;

    if not found or not v_product.is_active or v_product.is_archived then
      raise exception 'A product in this order is unavailable.';
    end if;
    if not exists (
      select 1
        from public.profiles farmer
        join public.farms farm
          on farm.farmer_id = farmer.id
         and farm.id = v_product.farm_id
       where farmer.id = v_product.farmer_id
         and farmer.role = 'farmer'
    ) then
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
    if v_product.surplus_price_per_unit is not null
       and v_product.surplus_available_until > now() then
      v_unit_price := least(v_unit_price, v_product.surplus_price_per_unit);
    end if;
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

notify pgrst, 'reload schema';
