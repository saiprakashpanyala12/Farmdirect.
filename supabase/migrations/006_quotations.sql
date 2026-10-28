create table if not exists public.quotation_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles (id) on delete restrict,
  farmer_id uuid not null references public.profiles (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  requested_quantity numeric(12, 3) not null check (requested_quantity > 0),
  message text not null default '' check (length(message) <= 2000),
  status text not null default 'requested'
    check (status in ('requested', 'quoted', 'declined', 'cancelled')),
  quoted_unit_price numeric(12, 2) check (quoted_unit_price is null or quoted_unit_price > 0),
  farmer_response text check (farmer_response is null or length(farmer_response) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'quoted' and quoted_unit_price is not null) or status <> 'quoted'),
  check (status <> 'declined' or quoted_unit_price is null)
);

create index if not exists quotation_requests_buyer_idx
  on public.quotation_requests (buyer_id, created_at desc);
create index if not exists quotation_requests_farmer_idx
  on public.quotation_requests (farmer_id, created_at desc);

alter table public.quotation_requests enable row level security;
revoke all on public.quotation_requests from anon, authenticated;
grant select on public.quotation_requests to authenticated;
grant insert (buyer_id, farmer_id, product_id, requested_quantity, message)
  on public.quotation_requests to authenticated;
grant update (status, quoted_unit_price, farmer_response, updated_at)
  on public.quotation_requests to authenticated;

drop policy if exists "Participants read quotations" on public.quotation_requests;
create policy "Participants read quotations"
  on public.quotation_requests for select
  to authenticated
  using (
    buyer_id = (select auth.uid())
    or farmer_id = (select auth.uid())
    or public.is_farmdirect_admin()
  );

drop policy if exists "Buyers request quotations" on public.quotation_requests;
create policy "Buyers request quotations"
  on public.quotation_requests for insert
  to authenticated
  with check (
    buyer_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('customer', 'business')
    )
    and exists (
      select 1
      from public.products p
      join public.farms f on f.id = p.farm_id
      where p.id = quotation_requests.product_id
        and p.farmer_id = quotation_requests.farmer_id
        and p.is_active
        and not p.is_archived
        and f.verification_status = 'approved'
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
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'farmer' and p.is_verified
    )
  )
  with check (
    farmer_id = (select auth.uid())
    and status in ('quoted', 'declined')
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'farmer' and p.is_verified
    )
  );

drop policy if exists "Buyers cancel unanswered quotations" on public.quotation_requests;
create policy "Buyers cancel unanswered quotations"
  on public.quotation_requests for update
  to authenticated
  using (buyer_id = (select auth.uid()) and status = 'requested')
  with check (buyer_id = (select auth.uid()) and status = 'cancelled');

create or replace function public.protect_quotation_updates()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    new.updated_at = now();
    return new;
  end if;

  if auth.uid() = old.farmer_id then
    if old.status <> 'requested'
       or new.status not in ('quoted', 'declined')
       or new.id is distinct from old.id
       or new.buyer_id is distinct from old.buyer_id
       or new.farmer_id is distinct from old.farmer_id
       or new.product_id is distinct from old.product_id
       or new.requested_quantity is distinct from old.requested_quantity
       or new.message is distinct from old.message
       or new.created_at is distinct from old.created_at
       or (new.status = 'quoted' and new.quoted_unit_price is null) then
      raise exception 'Invalid farmer quotation response.';
    end if;
  elsif auth.uid() = old.buyer_id then
    if old.status <> 'requested'
       or new.status <> 'cancelled'
       or new.id is distinct from old.id
       or new.buyer_id is distinct from old.buyer_id
       or new.farmer_id is distinct from old.farmer_id
       or new.product_id is distinct from old.product_id
       or new.requested_quantity is distinct from old.requested_quantity
       or new.message is distinct from old.message
       or new.quoted_unit_price is distinct from old.quoted_unit_price
       or new.farmer_response is distinct from old.farmer_response
       or new.created_at is distinct from old.created_at then
      raise exception 'Only unanswered quotations can be cancelled by the buyer.';
    end if;
  else
    raise exception 'You cannot modify this quotation.';
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists protect_quotation_updates on public.quotation_requests;
create trigger protect_quotation_updates
  before update on public.quotation_requests
  for each row execute function public.protect_quotation_updates();

revoke all on function public.protect_quotation_updates() from public, anon, authenticated;
