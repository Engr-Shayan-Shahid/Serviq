-- =============================================================================
-- Restaurant SaaS — initial schema, RLS, storage
-- =============================================================================
--
-- ROLE ARCHITECTURE (read before building middleware / panels)
-- -----------------------------------------------------------------------------
-- Users live in Supabase auth.users (one auth system for everyone).
-- Role is NEVER taken from auth metadata or JWT claims alone.
-- Role comes ONLY from public.staff (user_id UNIQUE → one user, one role).
--
-- PANEL ISOLATION — enforce in middleware.ts (server-side, every request):
--
-- 1. On every visit to a protected route (/dashboard, /kitchen, /waiter):
--    - Read the Supabase session (auth user).
--    - If no session → redirect to /auth/login.
--    - Query: SELECT role, restaurant_id FROM staff WHERE user_id = auth.uid()
--    - If no staff row → redirect to /auth/login (not a known panel user).
--
-- 2. Role → panel mapping (strict):
--    - /dashboard  → allow ONLY if staff.role = 'owner'
--    - /kitchen    → allow ONLY if staff.role = 'kitchen'
--    - /waiter     → allow ONLY if staff.role = 'waiter'
--
-- 3. Wrong role ≠ redirect to the correct panel (do NOT log them out):
--    - owner visiting /kitchen or /waiter  → redirect to /dashboard
--    - kitchen visiting /dashboard or /waiter → redirect to /kitchen
--    - waiter visiting /dashboard or /kitchen → redirect to /waiter
--
-- 4. Never treat one shared "logged in" cookie as enough for all panels.
--    Each panel must independently verify staff.role on every page load
--    (middleware + preferably a server layout check as defense in depth).
--
-- 5. Owner login must never unlock kitchen/waiter UI, and vice versa —
--    isolation is enforced by this staff.role check, not by separate auth apps.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. restaurants
-- -----------------------------------------------------------------------------

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  primary_color text default '#000000',
  secondary_color text default '#ffffff',
  owner_id uuid references auth.users (id),
  subscription_status text default 'trialing',
  stripe_customer_id text,
  created_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- 2. staff
-- user_id is UNIQUE: one auth user → one role → one panel (no role confusion)
-- -----------------------------------------------------------------------------

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade unique,
  role text not null check (role in ('owner', 'kitchen', 'waiter')),
  name text not null,
  email text not null,
  created_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- 3. menu_categories
-- -----------------------------------------------------------------------------

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants (id) on delete cascade,
  name text not null,
  description text,
  image_url text,
  display_order int default 0,
  is_active boolean default true,
  time_slot text default 'all_day'
    check (time_slot in ('all_day', 'breakfast', 'lunch', 'dinner')),
  created_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- 4. menu_items
-- -----------------------------------------------------------------------------

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants (id) on delete cascade,
  category_id uuid references public.menu_categories (id) on delete set null,
  name text not null,
  description text,
  price decimal(10, 2) not null,
  image_url text,
  is_available boolean default true,
  display_order int default 0,
  created_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- 5. tables
-- -----------------------------------------------------------------------------

create table public.tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants (id) on delete cascade,
  table_number text not null,
  qr_code_url text,
  created_at timestamptz default now(),
  unique (restaurant_id, table_number)
);

-- -----------------------------------------------------------------------------
-- 6. orders
-- -----------------------------------------------------------------------------

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants (id) on delete cascade,
  table_id uuid references public.tables (id) on delete set null,
  table_number text not null,
  status text default 'pending'
    check (status in ('pending', 'preparing', 'ready', 'served')),
  total_amount decimal(10, 2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- 7. order_items
-- name/price are snapshots at time of order
-- -----------------------------------------------------------------------------

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  name text not null,
  price decimal(10, 2) not null,
  quantity int not null default 1,
  special_note text,
  created_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

create index restaurants_owner_id_idx on public.restaurants (owner_id);
create index restaurants_slug_idx on public.restaurants (slug);

create index staff_restaurant_id_idx on public.staff (restaurant_id);
create index staff_user_id_idx on public.staff (user_id);
create index staff_role_idx on public.staff (role);

create index menu_categories_restaurant_id_idx on public.menu_categories (restaurant_id);
create index menu_items_restaurant_id_idx on public.menu_items (restaurant_id);
create index menu_items_category_id_idx on public.menu_items (category_id);

create index tables_restaurant_id_idx on public.tables (restaurant_id);

create index orders_restaurant_id_idx on public.orders (restaurant_id);
create index orders_status_idx on public.orders (restaurant_id, status);

create index order_items_order_id_idx on public.order_items (order_id);

-- -----------------------------------------------------------------------------
-- Keep orders.updated_at in sync
-- -----------------------------------------------------------------------------

create or replace function public.set_orders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_set_updated_at
before update on public.orders
for each row
execute function public.set_orders_updated_at();

-- -----------------------------------------------------------------------------
-- Auto-create owner staff row when a restaurant is created
-- (staff.user_id UNIQUE — owner is always the first staff member)
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_restaurant_owner_staff()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is not null then
    insert into public.staff (restaurant_id, user_id, role, name, email)
    values (
      new.id,
      new.owner_id,
      'owner',
      new.name,
      coalesce(
        (select email from auth.users where id = new.owner_id),
        'owner@unknown'
      )
    )
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_restaurant_created_add_owner_staff
after insert on public.restaurants
for each row
execute function public.handle_new_restaurant_owner_staff();

-- -----------------------------------------------------------------------------
-- RLS helpers (security definer — avoid recursive policy checks)
-- -----------------------------------------------------------------------------

create or replace function public.get_my_staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select s.role
  from public.staff s
  where s.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.get_my_restaurant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.restaurant_id
  from public.staff s
  where s.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_owner_of_restaurant(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.restaurants r
    where r.id = p_restaurant_id
      and r.owner_id = auth.uid()
  );
$$;

-- -----------------------------------------------------------------------------
-- Enable RLS on all tables
-- -----------------------------------------------------------------------------

alter table public.restaurants enable row level security;
alter table public.staff enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.tables enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- -----------------------------------------------------------------------------
-- restaurants policies
-- -----------------------------------------------------------------------------

create policy "Owner can select their own restaurant"
  on public.restaurants
  for select
  to authenticated
  using (owner_id = auth.uid());

create policy "Owner can update their own restaurant"
  on public.restaurants
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Needed so register/onboarding can create the restaurant row
create policy "Owner can insert their own restaurant"
  on public.restaurants
  for insert
  to authenticated
  with check (owner_id = auth.uid());

-- Public menu page resolves branding + restaurant_id by slug (no login)
create policy "Public can select restaurants for menu"
  on public.restaurants
  for select
  to anon
  using (true);

-- Kitchen/waiter need restaurant context in their panels
create policy "Staff can select their restaurant"
  on public.restaurants
  for select
  to authenticated
  using (id = public.get_my_restaurant_id());

-- -----------------------------------------------------------------------------
-- staff policies
-- -----------------------------------------------------------------------------

create policy "User can read their own staff row"
  on public.staff
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Owner can read all staff in their restaurant"
  on public.staff
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.restaurants r
      where r.id = staff.restaurant_id
        and r.owner_id = auth.uid()
    )
  );

create policy "Owner can insert staff in their restaurant"
  on public.staff
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.restaurants r
      where r.id = staff.restaurant_id
        and r.owner_id = auth.uid()
    )
  );

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

create policy "Owner can delete staff in their restaurant"
  on public.staff
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.restaurants r
      where r.id = staff.restaurant_id
        and r.owner_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- menu_categories policies
-- -----------------------------------------------------------------------------

create policy "Owner can manage menu categories"
  on public.menu_categories
  for all
  to authenticated
  using (public.is_owner_of_restaurant(restaurant_id))
  with check (public.is_owner_of_restaurant(restaurant_id));

create policy "Public can select active menu categories"
  on public.menu_categories
  for select
  to anon
  using (is_active = true);

-- -----------------------------------------------------------------------------
-- menu_items policies
-- -----------------------------------------------------------------------------

create policy "Owner can manage menu items"
  on public.menu_items
  for all
  to authenticated
  using (public.is_owner_of_restaurant(restaurant_id))
  with check (public.is_owner_of_restaurant(restaurant_id));

create policy "Public can select available menu items"
  on public.menu_items
  for select
  to anon
  using (is_available = true);

-- -----------------------------------------------------------------------------
-- tables policies
-- -----------------------------------------------------------------------------

create policy "Owner can manage tables"
  on public.tables
  for all
  to authenticated
  using (public.is_owner_of_restaurant(restaurant_id))
  with check (public.is_owner_of_restaurant(restaurant_id));

-- -----------------------------------------------------------------------------
-- orders policies
-- -----------------------------------------------------------------------------

create policy "Owner can select all orders for their restaurant"
  on public.orders
  for select
  to authenticated
  using (public.is_owner_of_restaurant(restaurant_id));

create policy "Kitchen can select orders for their restaurant"
  on public.orders
  for select
  to authenticated
  using (
    public.get_my_staff_role() = 'kitchen'
    and restaurant_id = public.get_my_restaurant_id()
  );

create policy "Kitchen can update order status for their restaurant"
  on public.orders
  for update
  to authenticated
  using (
    public.get_my_staff_role() = 'kitchen'
    and restaurant_id = public.get_my_restaurant_id()
  )
  with check (
    public.get_my_staff_role() = 'kitchen'
    and restaurant_id = public.get_my_restaurant_id()
  );

create policy "Waiter can select ready orders for their restaurant"
  on public.orders
  for select
  to authenticated
  using (
    status = 'ready'
    and public.get_my_staff_role() = 'waiter'
    and restaurant_id = public.get_my_restaurant_id()
  );

create policy "Waiter can update ready orders to served"
  on public.orders
  for update
  to authenticated
  using (
    status = 'ready'
    and public.get_my_staff_role() = 'waiter'
    and restaurant_id = public.get_my_restaurant_id()
  )
  with check (
    status = 'served'
    and public.get_my_staff_role() = 'waiter'
    and restaurant_id = public.get_my_restaurant_id()
  );

create policy "Public can insert orders"
  on public.orders
  for insert
  to anon
  with check (true);

-- Live status page: customer loads order by id (UUID obscurity)
create policy "Public can select orders by id"
  on public.orders
  for select
  to anon
  using (true);

-- -----------------------------------------------------------------------------
-- order_items policies
-- -----------------------------------------------------------------------------

create policy "Owner can select order items for their restaurant"
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and public.is_owner_of_restaurant(o.restaurant_id)
    )
  );

create policy "Kitchen can select order items for their restaurant"
  on public.order_items
  for select
  to authenticated
  using (
    public.get_my_staff_role() = 'kitchen'
    and exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and o.restaurant_id = public.get_my_restaurant_id()
    )
  );

create policy "Waiter can select order items for ready orders"
  on public.order_items
  for select
  to authenticated
  using (
    public.get_my_staff_role() = 'waiter'
    and exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and o.status = 'ready'
        and o.restaurant_id = public.get_my_restaurant_id()
    )
  );

create policy "Public can insert order items"
  on public.order_items
  for insert
  to anon
  with check (true);

create policy "Public can select order items by order_id"
  on public.order_items
  for select
  to anon
  using (true);

-- -----------------------------------------------------------------------------
-- Storage: menu-images
-- Public read | Authenticated write (owners upload from dashboard)
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-images',
  'menu-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can read menu images"
  on storage.objects
  for select
  to public
  using (bucket_id = 'menu-images');

create policy "Authenticated users can upload menu images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'menu-images');

create policy "Authenticated users can update menu images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'menu-images')
  with check (bucket_id = 'menu-images');

create policy "Authenticated users can delete menu images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'menu-images');
