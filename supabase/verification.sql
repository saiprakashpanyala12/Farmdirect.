-- Read-only verification queries. Run in Supabase SQL Editor as a project
-- administrator after applying the application migrations.

-- 1. Confirm application tables exist and whether RLS is enabled/forced.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'storage')
  and c.relkind in ('r', 'p')
  and (
    (n.nspname = 'public' and c.relname in (
      'profiles', 'farms', 'categories', 'products', 'orders',
      'order_items', 'cart_items', 'quotation_requests',
      'farmer_expenses', 'harvest_entries'
    ))
    or (n.nspname = 'storage' and c.relname = 'objects')
  )
order by n.nspname, c.relname;

-- 2. Inspect every effective policy's command, target roles, USING and CHECK.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as check_expression
from pg_policies
where (schemaname = 'public' and tablename in (
  'profiles', 'farms', 'categories', 'products', 'orders',
  'order_items', 'cart_items', 'quotation_requests',
  'farmer_expenses', 'harvest_entries'
))
or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

-- 3. Inspect trigger definitions and the actual trigger function bodies.
select
  event_object_schema,
  event_object_table,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
from information_schema.triggers
where (event_object_schema = 'public' and event_object_table in (
  'profiles', 'farms', 'quotation_requests', 'farmer_expenses', 'harvest_entries'
))
   or (event_object_schema = 'auth' and event_object_table = 'users')
order by event_object_schema, event_object_table, trigger_name, event_manipulation;

select
  p.oid::regprocedure as function_signature,
  pg_get_userbyid(p.proowner) as function_owner,
  p.prosecdef as security_definer,
  has_function_privilege('anon', p.oid, 'execute') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated_can_execute,
  pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'protect_profile_privileges',
    'create_profile_for_new_user',
    'protect_farm_verification',
    'is_farmdirect_admin',
    'user_can_read_order',
    'create_test_order',
    'cancel_pending_order',
    'protect_quotation_updates',
    'protect_farmer_expense',
    'protect_harvest_entry'
  )
order by p.proname, p.oid::regprocedure::text;

-- 4. Check table-level and column-level grants (RLS is evaluated in addition).
select
  table_schema,
  table_name,
  grantee,
  privilege_type,
  column_name
from information_schema.role_table_grants
where (table_schema = 'public' and table_name in (
  'profiles', 'farms', 'categories', 'products', 'orders',
  'order_items', 'cart_items', 'quotation_requests',
  'farmer_expenses', 'harvest_entries'
))
or (table_schema = 'storage' and table_name = 'objects')
order by table_schema, table_name, grantee, privilege_type, column_name;

select
  table_schema,
  table_name,
  grantee,
  column_name,
  privilege_type
from information_schema.column_privileges
where table_schema = 'public'
  and table_name in ('profiles', 'products', 'orders', 'order_items', 'farmer_expenses', 'harvest_entries')
  and column_name in ('role', 'is_verified', 'farmer_id', 'customer_id', 'status', 'payment_status', 'quoted_unit_price', 'surplus_price_per_unit', 'surplus_available_until', 'amount', 'expense_date')
order by table_name, grantee, column_name, privilege_type;

-- 5. Confirm the image bucket and its public flag / upload limits.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'product-images';

-- 6. Confirm the required relations exist (each result must be non-null).
select
  to_regclass('public.profiles') as profiles,
  to_regclass('public.farms') as farms,
  to_regclass('public.categories') as categories,
  to_regclass('public.products') as products,
  to_regclass('public.cart_items') as cart_items,
  to_regclass('public.orders') as orders,
  to_regclass('public.order_items') as order_items,
  to_regclass('public.quotation_requests') as quotation_requests,
  to_regclass('public.farmer_expenses') as farmer_expenses,
  to_regclass('public.harvest_entries') as harvest_entries,
  to_regclass('storage.objects') as storage_objects;

-- 7. Check whether each required security predicate is present in the
-- effective remote definitions (inspect section 2/3 output for exact SQL).
select
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'order_items'
      and policyname = 'Farmers and customers read relevant order items'
      and qual ilike '%farmer_id = (select auth.uid())%'
      and qual ilike '%customer_id = (select auth.uid())%'
      and qual ilike '%is_farmdirect_admin%'
  ) as order_item_isolation_policy_present,
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'farmer_expenses'
      and policyname = 'Farmers manage their own expenses'
      and qual ilike '%farmer_id = (select auth.uid())%'
      and with_check ilike '%farmer_id = (select auth.uid())%'
  ) as farmer_expense_ownership_policy_present,
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'harvest_entries'
      and policyname = 'Farmers manage their own harvest entries'
      and qual ilike '%farmer_id = (select auth.uid())%'
      and with_check ilike '%farmer_id = (select auth.uid())%'
  ) as harvest_entry_ownership_policy_present,
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
      and policyname = 'Verified and approved product listings are visible'
      and qual ilike '%is_verified%'
      and qual ilike '%verification_status%'
  ) as approved_product_visibility_policy_present,
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_test_order'
      and has_function_privilege('authenticated', p.oid, 'execute')
      and not has_function_privilege('anon', p.oid, 'execute')
  ) as authenticated_only_test_order_function,
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'cancel_pending_order'
      and has_function_privilege('authenticated', p.oid, 'execute')
      and not has_function_privilege('anon', p.oid, 'execute')
  ) as authenticated_only_cancel_function;

-- 8. Verify signup role controls and quotation isolation from the effective
-- deployed schema. All fields in this result should be true.
select
  exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'auth'
      and c.relname = 'users'
      and t.tgname = 'create_profile_after_signup'
      and not t.tgisinternal
  ) as signup_profile_trigger_present,
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_profile_for_new_user'
      and pg_get_functiondef(p.oid) ilike '%requested_role%'
      and pg_get_functiondef(p.oid) ilike '%customer%'
      and pg_get_functiondef(p.oid) ilike '%farmer%'
      and pg_get_functiondef(p.oid) ilike '%business%'
      and pg_get_functiondef(p.oid) not ilike '%admin%'
  ) as signup_role_allowlist_present,
  not has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')
    as authenticated_cannot_update_profile_role,
  not has_column_privilege('authenticated', 'public.profiles', 'is_verified', 'UPDATE')
    as authenticated_cannot_update_profile_verification,
  exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'quotation_requests'
      and c.relrowsecurity
  ) as quotation_rls_enabled,
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'quotation_requests'
      and policyname = 'Participants read quotations'
      and cmd = 'SELECT'
      and qual ilike '%buyer_id = (select auth.uid())%'
      and qual ilike '%farmer_id = (select auth.uid())%'
  ) as quotation_participant_read_policy_present,
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'quotation_requests'
      and policyname = 'Buyers request quotations'
      and cmd = 'INSERT'
      and with_check ilike '%buyer_id = (select auth.uid())%'
      and with_check ilike '%is_active%'
      and with_check ilike '%verification_status%'
  ) as quotation_request_policy_present,
  exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'quotation_requests'
      and t.tgname = 'protect_quotation_updates'
      and not t.tgisinternal
  ) as quotation_update_guard_present,
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'protect_quotation_updates'
      and not has_function_privilege('anon', p.oid, 'execute')
  ) as quotation_guard_not_callable_by_anon,
  to_regclass('farmdirect_private.runtime_settings') is not null
    as development_settings_table_exists,
  public.farmdirect_development_onboarding_enabled()
    as development_onboarding_enabled;

-- 9. Verify the farmer operations and surplus pricing schema (migrations
-- 008/009). Each boolean should be true after those migrations are applied.
select
  exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'farmer_expenses' and c.relrowsecurity
  ) as farmer_expenses_rls_enabled,
  exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'harvest_entries' and c.relrowsecurity
  ) as harvest_entries_rls_enabled,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products'
      and column_name = 'surplus_price_per_unit'
  ) as surplus_price_column_present,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products'
      and column_name = 'surplus_available_until'
  ) as surplus_expiry_column_present,
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'create_test_order'
      and pg_get_functiondef(p.oid) ilike '%surplus_price_per_unit%'
      and pg_get_functiondef(p.oid) ilike '%surplus_available_until%'
  ) as checkout_revalidates_surplus_pricing;
