do $$
declare
  v_policy record;
begin
  for v_policy in
    select policy.polname
      from pg_policy policy
      join pg_class relation on relation.oid = policy.polrelid
      join pg_namespace namespace on namespace.oid = relation.relnamespace
     where namespace.nspname = 'public'
       and relation.relname = 'products'
       and policy.polcmd = 'r'
       and coalesce(pg_get_expr(policy.polqual, policy.polrelid), '')
           ilike '%is_product_publicly_visible%'
  loop
    execute format('drop policy %I on public.products', v_policy.polname);
  end loop;

  drop policy if exists "Available products are public" on public.products;
  drop policy if exists "Verified and approved product listings are visible" on public.products;
end;
$$;

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
      join public.farms farm
        on farm.id = product.farm_id
       and farm.farmer_id = product.farmer_id
     where product.id = p_product_id
       and product.is_active
       and not product.is_archived
       and farmer.role = 'farmer'
       and farmer.is_verified
       and farm.verification_status = 'approved'
  );
$$;

revoke all on function public.is_product_publicly_visible(uuid) from public;
grant execute on function public.is_product_publicly_visible(uuid) to anon, authenticated;

create policy "Verified and approved product listings are visible"
  on public.products for select
  to anon, authenticated
  using (
    public.is_product_publicly_visible(id)
    or farmer_id = (select auth.uid())
    or public.is_farmdirect_admin()
  );

grant select on public.products to anon, authenticated;

notify pgrst, 'reload schema';
