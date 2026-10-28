drop policy if exists "Customers and involved farmers read order items" on public.order_items;
drop policy if exists "Farmers and customers read relevant order items" on public.order_items;

create policy "Farmers and customers read relevant order items"
  on public.order_items for select
  to authenticated
  using (
    farmer_id = (select auth.uid())
    or exists (
      select 1
      from public.orders o
      where o.id = order_id
        and o.customer_id = (select auth.uid())
    )
    or public.is_farmdirect_admin()
  );
