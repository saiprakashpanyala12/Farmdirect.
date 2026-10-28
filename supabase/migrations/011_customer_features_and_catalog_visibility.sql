create table if not exists public.wishlist_items (
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.wishlist_items enable row level security;
revoke all on public.wishlist_items from anon, authenticated;
grant select, insert, delete on public.wishlist_items to authenticated;

drop policy if exists "Customers manage their own wishlist" on public.wishlist_items;
create policy "Customers manage their own wishlist"
  on public.wishlist_items for all
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('customer', 'business')
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('customer', 'business')
    )
    and exists (
      select 1 from public.products product
      where product.id = wishlist_items.product_id
    )
  );

drop policy if exists "Wishlist ownership cap" on public.wishlist_items;
create policy "Wishlist ownership cap"
  on public.wishlist_items as restrictive for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null default 'Home' check (length(trim(label)) between 1 and 80),
  recipient_name text not null check (length(trim(recipient_name)) between 1 and 120),
  phone text not null check (length(trim(phone)) between 8 and 20),
  address_line1 text not null check (length(trim(address_line1)) between 1 and 240),
  address_line2 text not null default '' check (length(address_line2) <= 240),
  locality text not null default '' check (length(locality) <= 120),
  city text not null check (length(trim(city)) between 1 and 120),
  state text not null check (length(trim(state)) between 1 and 120),
  pincode text not null check (pincode ~ '^[0-9]{6}$'),
  delivery_note text not null default '' check (length(delivery_note) <= 1000),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customer_addresses_one_default_idx
  on public.customer_addresses (user_id)
  where is_default;
create index if not exists customer_addresses_user_created_idx
  on public.customer_addresses (user_id, created_at desc);

alter table public.customer_addresses enable row level security;
revoke all on public.customer_addresses from anon, authenticated;
grant select, delete on public.customer_addresses to authenticated;
grant insert (
  user_id, label, recipient_name, phone, address_line1, address_line2,
  locality, city, state, pincode, delivery_note, is_default
) on public.customer_addresses to authenticated;
grant update (
  label, recipient_name, phone, address_line1, address_line2,
  locality, city, state, pincode, delivery_note, is_default, updated_at
) on public.customer_addresses to authenticated;

drop policy if exists "Customers manage their own addresses" on public.customer_addresses;
create policy "Customers manage their own addresses"
  on public.customer_addresses for all
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('customer', 'business')
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('customer', 'business')
    )
  );

drop policy if exists "Address ownership cap" on public.customer_addresses;
create policy "Address ownership cap"
  on public.customer_addresses as restrictive for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.set_default_customer_address(p_address_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1
      from public.profiles p
     where p.id = auth.uid()
       and p.role in ('customer', 'business')
  ) or not exists (
    select 1
      from public.customer_addresses a
     where a.id = p_address_id
       and a.user_id = auth.uid()
  ) then
    raise exception 'Address not found for the current user.';
  end if;

  update public.customer_addresses
     set is_default = false,
         updated_at = now()
   where user_id = auth.uid()
     and is_default;

  update public.customer_addresses
     set is_default = true,
         updated_at = now()
   where id = p_address_id
     and user_id = auth.uid();
end;
$$;

revoke all on function public.set_default_customer_address(uuid) from public, anon;
grant execute on function public.set_default_customer_address(uuid) to authenticated;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (length(trim(type)) between 1 and 80),
  title text not null check (length(trim(title)) between 1 and 160),
  body text not null default '' check (length(body) <= 2000),
  data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where not is_read;

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated;

drop policy if exists "Users read their own notifications" on public.notifications;
create policy "Users read their own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users mark their own notifications read" on public.notifications;
create policy "Users mark their own notifications read"
  on public.notifications for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and is_read);

create or replace function public.notify_customer_order_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type text;
  v_title text;
  v_body text;
begin
  if tg_op = 'INSERT' then
    v_type := 'order_placed';
    v_title := 'Order placed';
    v_body := 'Your order ' || new.order_number || ' was created and is awaiting payment.';
  elsif new.status is distinct from old.status then
    v_type := case
      when new.status = 'confirmed' then 'order_confirmed'
      when new.status = 'cancelled' then 'order_cancelled'
      else 'order_updated'
    end;
    v_title := case
      when new.status = 'confirmed' then 'Order confirmed'
      when new.status = 'cancelled' then 'Order cancelled'
      else 'Order updated'
    end;
    v_body := 'Order ' || new.order_number || ' status changed to ' || replace(new.status::text, '_', ' ') || '.';
  else
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    new.customer_id,
    v_type,
    v_title,
    v_body,
    jsonb_build_object('order_id', new.id, 'order_number', new.order_number, 'status', new.status)
  );
  return new;
end;
$$;

revoke all on function public.notify_customer_order_event() from public, anon, authenticated;
drop trigger if exists notify_customer_order_event on public.orders;
create trigger notify_customer_order_event
  after insert or update of status on public.orders
  for each row execute function public.notify_customer_order_event();

create or replace function public.is_product_publicly_visible(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.products product
      join public.profiles p
        on p.id = product.farmer_id
      join public.farms f
        on f.farmer_id = p.id
       and f.id = product.farm_id
     where product.id = p_product_id
       and product.is_active
       and not product.is_archived
       and p.role = 'farmer'
       and p.is_verified
       and f.verification_status = 'approved'
  );
$$;

revoke all on function public.is_product_publicly_visible(uuid) from public;
grant execute on function public.is_product_publicly_visible(uuid) to anon, authenticated;

drop policy if exists "Available products are public" on public.products;
drop policy if exists "Verified and approved product listings are visible" on public.products;
create policy "Verified and approved product listings are visible"
  on public.products for select
  to anon, authenticated
  using (
    (
      public.is_product_publicly_visible(id)
    )
    or farmer_id = (select auth.uid())
    or public.is_farmdirect_admin()
  );

notify pgrst, 'reload schema';
