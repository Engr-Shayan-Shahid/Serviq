-- =============================================================================
-- Fix: restaurant onboarding must not hit staff RLS
-- Register creates restaurant + owner staff via security definer RPC.
-- Client must NOT upsert into staff directly during signup.
-- =============================================================================

-- Allow a user to update their own staff profile (name/email) after trigger insert
drop policy if exists "User can update their own staff row" on public.staff;
create policy "User can update their own staff row"
  on public.staff
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and role = public.get_my_staff_role()
  );

-- Ensure owner update policy exists (needed for staff management later)
drop policy if exists "Owner can update staff in their restaurant" on public.staff;
create policy "Owner can update staff in their restaurant"
  on public.staff
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.restaurants r
      where r.id = staff.restaurant_id
        and r.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.restaurants r
      where r.id = staff.restaurant_id
        and r.owner_id = auth.uid()
    )
  );

-- Single safe onboarding path: bypasses RLS, creates restaurant + owner staff
create or replace function public.register_restaurant(
  p_name text,
  p_slug text,
  p_owner_name text
)
returns public.restaurants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_restaurant public.restaurants;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Restaurant name is required';
  end if;

  if p_slug is null or length(trim(p_slug)) = 0 then
    raise exception 'Restaurant slug is required';
  end if;

  if p_owner_name is null or length(trim(p_owner_name)) = 0 then
    raise exception 'Owner name is required';
  end if;

  -- Already owns a restaurant? Return it (idempotent-ish for retries)
  select *
  into v_restaurant
  from public.restaurants
  where owner_id = v_uid
  limit 1;

  if found then
    update public.staff
    set
      name = trim(p_owner_name),
      email = coalesce(
        (select email from auth.users where id = v_uid),
        email
      )
    where user_id = v_uid;

    return v_restaurant;
  end if;

  select email into v_email from auth.users where id = v_uid;

  insert into public.restaurants (
    name,
    slug,
    owner_id,
    subscription_status
  )
  values (
    trim(p_name),
    trim(p_slug),
    v_uid,
    'trialing'
  )
  returning * into v_restaurant;

  -- Trigger may also insert staff; upsert wins with correct owner name
  insert into public.staff (
    restaurant_id,
    user_id,
    role,
    name,
    email
  )
  values (
    v_restaurant.id,
    v_uid,
    'owner',
    trim(p_owner_name),
    coalesce(v_email, '')
  )
  on conflict (user_id) do update
  set
    restaurant_id = excluded.restaurant_id,
    role = 'owner',
    name = excluded.name,
    email = excluded.email;

  return v_restaurant;
end;
$$;

revoke all on function public.register_restaurant(text, text, text) from public;
grant execute on function public.register_restaurant(text, text, text) to authenticated;
