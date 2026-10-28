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

  if v_role = 'business' and v_business_type not in (
    'restaurant', 'hotel', 'retailer', 'grocery_store',
    'wholesaler', 'distributor', 'food_processor', 'other'
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
    insert into public.farms (farmer_id, name, state, village, district, verification_status)
    values (
      new.id,
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'farm_name'), ''), 'Farm profile pending'),
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'farm_state'), ''), 'Pending'),
      nullif(trim(new.raw_user_meta_data ->> 'farm_village'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'farm_district'), ''),
      'not_submitted'
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

revoke update on public.profiles from authenticated;
grant update (full_name, phone, avatar_url, business_type, business_name)
  on public.profiles to authenticated;
