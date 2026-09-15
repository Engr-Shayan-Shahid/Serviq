-- Allow logged-in users (e.g. owner testing) to browse public menus and place orders.
-- Anon policies alone are not used when a Supabase session cookie exists.

create policy "Authenticated can select any restaurant for public menu"
  on public.restaurants
  for select
  to authenticated
  using (true);

create policy "Authenticated can select active menu categories"
  on public.menu_categories
  for select
  to authenticated
  using (is_active = true);

create policy "Authenticated can select available menu items"
  on public.menu_items
  for select
  to authenticated
  using (is_available = true);

create policy "Authenticated can select tables for ordering"
  on public.tables
  for select
  to authenticated
  using (true);

create policy "Authenticated can insert orders"
  on public.orders
  for insert
  to authenticated
  with check (true);

create policy "Authenticated can select orders"
  on public.orders
  for select
  to authenticated
  using (true);

create policy "Authenticated can insert order items"
  on public.order_items
  for insert
  to authenticated
  with check (true);

create policy "Authenticated can select order items"
  on public.order_items
  for select
  to authenticated
  using (true);
