drop policy if exists "Available products are public" on public.products;
drop policy if exists "Verified and approved product listings are visible" on public.products;
create policy "Verified and approved product listings are visible"
  on public.products for select
  to anon, authenticated
  using (
    (
      is_active
      and not is_archived
      and exists (
        select 1
        from public.profiles p
        where p.id = farmer_id
          and p.role = 'farmer'
          and p.is_verified
      )
      and exists (
        select 1
        from public.farms f
        where f.id = farm_id
          and f.farmer_id = products.farmer_id
          and f.verification_status = 'approved'
      )
    )
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
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'farmer'
        and p.is_verified
    )
    and exists (
      select 1
      from public.farms f
      where f.id = farm_id
        and f.farmer_id = (select auth.uid())
        and (not is_active or f.verification_status = 'approved')
    )
  );

drop policy if exists "Verified farmers update products" on public.products;
create policy "Verified farmers update products"
  on public.products for update
  to authenticated
  using (
    farmer_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'farmer'
        and p.is_verified
    )
  )
  with check (
    farmer_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'farmer'
        and p.is_verified
    )
    and exists (
      select 1
      from public.farms f
      where f.id = farm_id
        and f.farmer_id = (select auth.uid())
        and (not is_active or f.verification_status = 'approved')
    )
  );
