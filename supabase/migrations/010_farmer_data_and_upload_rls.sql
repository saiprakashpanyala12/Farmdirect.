do $$
begin
  if to_regprocedure('public.farmdirect_development_onboarding_enabled()') is null then
    raise exception 'Apply migration 007_development_onboarding.sql before migration 010.';
  end if;
  if to_regclass('public.profiles') is null
     or to_regclass('public.farms') is null
     or to_regclass('public.products') is null
     or to_regclass('storage.objects') is null then
    raise exception 'Apply migrations 001 and 002 before migration 010.';
  end if;
end;
$$;

create unique index if not exists products_id_farmer_id_uq
  on public.products (id, farmer_id);

create table if not exists public.farmer_expenses (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid,
  expense_date date not null default current_date,
  category text not null check (category in (
    'seeds', 'fertilizers', 'pesticides', 'labour', 'irrigation',
    'packaging', 'transportation', 'equipment', 'maintenance', 'other'
  )),
  amount numeric(12, 2) not null check (amount > 0),
  notes text not null default '' check (length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint farmer_expenses_product_owner_fk
    foreign key (product_id, farmer_id)
    references public.products (id, farmer_id)
    on delete restrict
);

create index if not exists farmer_expenses_owner_date_idx
  on public.farmer_expenses (farmer_id, expense_date desc);
alter table public.farmer_expenses enable row level security;
revoke all on public.farmer_expenses from anon, authenticated;
grant select, delete on public.farmer_expenses to authenticated;
grant insert (farmer_id, product_id, expense_date, category, amount, notes)
  on public.farmer_expenses to authenticated;
grant update (product_id, expense_date, category, amount, notes, updated_at)
  on public.farmer_expenses to authenticated;

drop policy if exists "Farmers manage their own expenses" on public.farmer_expenses;
create policy "Farmers manage their own expenses"
  on public.farmer_expenses for all
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
    and (
      product_id is null
      or exists (
        select 1 from public.products product
        where product.id = farmer_expenses.product_id
          and product.farmer_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Farmer expense ownership cap" on public.farmer_expenses;
create policy "Farmer expense ownership cap"
  on public.farmer_expenses as restrictive for all
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
    and (
      product_id is null
      or exists (
        select 1 from public.products product
        where product.id = farmer_expenses.product_id
          and product.farmer_id = (select auth.uid())
      )
    )
  );

create or replace function public.protect_farmer_expense()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is not null and new.farmer_id is distinct from old.farmer_id then
    raise exception 'Expense ownership cannot be changed.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists protect_farmer_expense on public.farmer_expenses;
create trigger protect_farmer_expense
  before update on public.farmer_expenses
  for each row execute function public.protect_farmer_expense();
revoke all on function public.protect_farmer_expense() from public, anon, authenticated;

create table if not exists public.harvest_entries (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid,
  crop_name text not null check (length(trim(crop_name)) between 1 and 120),
  planting_date date,
  expected_harvest_date date,
  expected_quantity numeric(12, 3) check (expected_quantity is null or expected_quantity >= 0),
  actual_harvest_date date,
  actual_quantity numeric(12, 3) check (actual_quantity is null or actual_quantity >= 0),
  unit text not null default 'kg'
    check (unit in ('kg', 'g', 'piece', 'litre', 'ml', 'bundle', 'dozen', 'quintal')),
  status text not null default 'planned'
    check (status in ('planned', 'growing', 'harvested', 'cancelled')),
  notes text not null default '' check (length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint harvest_entries_product_owner_fk
    foreign key (product_id, farmer_id)
    references public.products (id, farmer_id)
    on delete restrict
);

create index if not exists harvest_entries_owner_date_idx
  on public.harvest_entries (farmer_id, expected_harvest_date);
alter table public.harvest_entries enable row level security;
revoke all on public.harvest_entries from anon, authenticated;
grant select, delete on public.harvest_entries to authenticated;
grant insert (
  farmer_id, product_id, crop_name, planting_date, expected_harvest_date,
  expected_quantity, actual_harvest_date, actual_quantity, unit, status, notes
) on public.harvest_entries to authenticated;
grant update (
  product_id, crop_name, planting_date, expected_harvest_date,
  expected_quantity, actual_harvest_date, actual_quantity, unit, status, notes, updated_at
) on public.harvest_entries to authenticated;

drop policy if exists "Farmers manage their own harvest entries" on public.harvest_entries;
create policy "Farmers manage their own harvest entries"
  on public.harvest_entries for all
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
    and (
      product_id is null
      or exists (
        select 1 from public.products product
        where product.id = harvest_entries.product_id
          and product.farmer_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Harvest ownership cap" on public.harvest_entries;
create policy "Harvest ownership cap"
  on public.harvest_entries as restrictive for all
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
    and (
      product_id is null
      or exists (
        select 1 from public.products product
        where product.id = harvest_entries.product_id
          and product.farmer_id = (select auth.uid())
      )
    )
  );

create or replace function public.protect_harvest_entry()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is not null and new.farmer_id is distinct from old.farmer_id then
    raise exception 'Harvest ownership cannot be changed.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists protect_harvest_entry on public.harvest_entries;
create trigger protect_harvest_entry
  before update on public.harvest_entries
  for each row execute function public.protect_harvest_entry();
revoke all on function public.protect_harvest_entry() from public, anon, authenticated;

grant execute on function public.farmdirect_development_onboarding_enabled() to authenticated;

drop policy if exists "Verified farmers create products" on public.products;
create policy "Verified farmers create products"
  on public.products for insert
  to authenticated
  with check (
    farmer_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'farmer'
        and (
          p.is_verified
          or public.farmdirect_development_onboarding_enabled()
        )
    )
    and exists (
      select 1 from public.farms f
      where f.id = farm_id
        and f.farmer_id = (select auth.uid())
        and (
          f.verification_status = 'approved'
          or public.farmdirect_development_onboarding_enabled()
        )
    )
  );

drop policy if exists "Farmer product insert authorization cap" on public.products;
create policy "Farmer product insert authorization cap"
  on public.products as restrictive for insert
  to authenticated
  with check (
    farmer_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'farmer'
        and (p.is_verified or public.farmdirect_development_onboarding_enabled())
    )
    and exists (
      select 1 from public.farms f
      where f.id = farm_id
        and f.farmer_id = (select auth.uid())
        and (f.verification_status = 'approved' or public.farmdirect_development_onboarding_enabled())
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
      where p.id = (select auth.uid())
        and p.role = 'farmer'
        and (
          p.is_verified
          or public.farmdirect_development_onboarding_enabled()
        )
    )
  )
  with check (
    farmer_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'farmer'
        and (
          p.is_verified
          or public.farmdirect_development_onboarding_enabled()
        )
    )
    and exists (
      select 1 from public.farms f
      where f.id = farm_id
        and f.farmer_id = (select auth.uid())
        and (
          f.verification_status = 'approved'
          or public.farmdirect_development_onboarding_enabled()
        )
    )
  );

drop policy if exists "Farmer product update authorization cap" on public.products;
create policy "Farmer product update authorization cap"
  on public.products as restrictive for update
  to authenticated
  using (
    farmer_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'farmer'
        and (p.is_verified or public.farmdirect_development_onboarding_enabled())
    )
  )
  with check (
    farmer_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'farmer'
        and (p.is_verified or public.farmdirect_development_onboarding_enabled())
    )
    and exists (
      select 1 from public.farms f
      where f.id = farm_id
        and f.farmer_id = (select auth.uid())
        and (f.verification_status = 'approved' or public.farmdirect_development_onboarding_enabled())
    )
  );

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
create policy "Verified farmers upload product images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.profiles p
      join public.farms f on f.farmer_id = p.id
      where p.id = (select auth.uid())
        and p.role = 'farmer'
        and (
          p.is_verified
          or public.farmdirect_development_onboarding_enabled()
        )
        and (
          f.verification_status = 'approved'
          or public.farmdirect_development_onboarding_enabled()
        )
    )
  );

drop policy if exists "Product image insert authorization cap" on storage.objects;
create policy "Product image insert authorization cap"
  on storage.objects as restrictive for insert
  to authenticated
  with check (
    bucket_id <> 'product-images'
    or (
      (storage.foldername(name))[1] = (select auth.uid())::text
      and exists (
        select 1
        from public.profiles p
        join public.farms f on f.farmer_id = p.id
        where p.id = (select auth.uid())
          and p.role = 'farmer'
          and (p.is_verified or public.farmdirect_development_onboarding_enabled())
          and (f.verification_status = 'approved' or public.farmdirect_development_onboarding_enabled())
      )
    )
  );

drop policy if exists "Farmers update their product images" on storage.objects;
create policy "Farmers update their product images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.profiles p
      join public.farms f on f.farmer_id = p.id
      where p.id = (select auth.uid())
        and p.role = 'farmer'
        and (p.is_verified or public.farmdirect_development_onboarding_enabled())
        and (f.verification_status = 'approved' or public.farmdirect_development_onboarding_enabled())
    )
  )
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.profiles p
      join public.farms f on f.farmer_id = p.id
      where p.id = (select auth.uid())
        and p.role = 'farmer'
        and (p.is_verified or public.farmdirect_development_onboarding_enabled())
        and (f.verification_status = 'approved' or public.farmdirect_development_onboarding_enabled())
    )
  );

drop policy if exists "Product image update authorization cap" on storage.objects;
create policy "Product image update authorization cap"
  on storage.objects as restrictive for update
  to authenticated
  using (
    bucket_id <> 'product-images'
    or (
      (storage.foldername(name))[1] = (select auth.uid())::text
      and exists (
        select 1
        from public.profiles p
        join public.farms f on f.farmer_id = p.id
        where p.id = (select auth.uid())
          and p.role = 'farmer'
          and (p.is_verified or public.farmdirect_development_onboarding_enabled())
          and (f.verification_status = 'approved' or public.farmdirect_development_onboarding_enabled())
      )
    )
  )
  with check (
    bucket_id <> 'product-images'
    or (
      (storage.foldername(name))[1] = (select auth.uid())::text
      and exists (
        select 1
        from public.profiles p
        join public.farms f on f.farmer_id = p.id
        where p.id = (select auth.uid())
          and p.role = 'farmer'
          and (p.is_verified or public.farmdirect_development_onboarding_enabled())
          and (f.verification_status = 'approved' or public.farmdirect_development_onboarding_enabled())
      )
    )
  );

drop policy if exists "Farmers remove their product images" on storage.objects;
create policy "Farmers remove their product images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1
      from public.profiles p
      join public.farms f on f.farmer_id = p.id
      where p.id = (select auth.uid())
        and p.role = 'farmer'
        and (p.is_verified or public.farmdirect_development_onboarding_enabled())
        and (f.verification_status = 'approved' or public.farmdirect_development_onboarding_enabled())
    )
  );

drop policy if exists "Product image delete authorization cap" on storage.objects;
create policy "Product image delete authorization cap"
  on storage.objects as restrictive for delete
  to authenticated
  using (
    bucket_id <> 'product-images'
    or (
      (storage.foldername(name))[1] = (select auth.uid())::text
      and exists (
        select 1
        from public.profiles p
        join public.farms f on f.farmer_id = p.id
        where p.id = (select auth.uid())
          and p.role = 'farmer'
          and (p.is_verified or public.farmdirect_development_onboarding_enabled())
          and (f.verification_status = 'approved' or public.farmdirect_development_onboarding_enabled())
      )
    )
  );

notify pgrst, 'reload schema';
