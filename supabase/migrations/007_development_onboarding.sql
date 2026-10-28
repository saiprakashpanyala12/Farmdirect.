create schema if not exists farmdirect_private;
revoke all on schema farmdirect_private from public, anon, authenticated;

create table if not exists farmdirect_private.runtime_settings (
  id boolean primary key default true check (id),
  development_onboarding_enabled boolean not null default false
);

alter table farmdirect_private.runtime_settings enable row level security;
revoke all on farmdirect_private.runtime_settings from public, anon, authenticated;

insert into farmdirect_private.runtime_settings (id, development_onboarding_enabled)
values (true, false)
on conflict (id) do nothing;

create or replace function public.farmdirect_development_onboarding_enabled()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select settings.development_onboarding_enabled
      from farmdirect_private.runtime_settings settings
      where settings.id
    ),
    false
  );
$$;

revoke all on function public.farmdirect_development_onboarding_enabled() from public, anon, authenticated;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := coalesce(new.raw_user_meta_data ->> 'requested_role', 'customer');
  v_business_type text := new.raw_user_meta_data ->> 'business_type';
  v_dev_onboarding boolean := public.farmdirect_development_onboarding_enabled();
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
    v_dev_onboarding and v_role = 'farmer'
  )
  on conflict (id) do update
    set email = excluded.email;

  if v_role = 'farmer' then
    insert into public.farms (farmer_id, name, state, village, district, verification_status)
    values (
      new.id,
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'farm_name'), ''), 'Farm profile pending'),
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'farm_state'), ''), 'Pending'),
      nullif(trim(new.raw_user_meta_data ->> 'farm_village'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'farm_district'), ''),
      case when v_dev_onboarding then 'approved' else 'not_submitted' end
    )
    on conflict (farmer_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists create_profile_after_signup on auth.users;
create trigger create_profile_after_signup
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;

-- Only a trusted project operator should enable this on a dedicated development database:
-- update farmdirect_private.runtime_settings
-- set development_onboarding_enabled = true
-- where id = true;
