alter table public.products
  add column if not exists surplus_price_per_unit numeric(12, 2),
  add column if not exists surplus_available_until timestamptz;

alter table public.products
  drop constraint if exists products_surplus_price_check;

alter table public.products
  add constraint products_surplus_price_check
  check (
    (surplus_price_per_unit is null and surplus_available_until is null)
    or (
      is_surplus
      and surplus_price_per_unit is not null
      and surplus_available_until is not null
      and surplus_price_per_unit > 0
      and surplus_price_per_unit < price_per_unit
    )
  );

grant insert (surplus_price_per_unit, surplus_available_until)
  on public.products to authenticated;
grant update (surplus_price_per_unit, surplus_available_until)
  on public.products to authenticated;

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

    select p.id, p.farmer_id, p.name, p.images, p.unit, p.price_per_unit,
           p.bulk_price_tiers, p.quantity_available, p.quantity_reserved,
           p.min_order_qty, p.max_order_qty, p.is_active, p.is_archived,
           p.farm_id, p.surplus_price_per_unit, p.surplus_available_until
      into v_product
      from public.products p
     where p.id = (v_line ->> 'product_id')::uuid
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
         and farmer.is_verified
         and farm.verification_status = 'approved'
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
