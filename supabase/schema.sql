-- ============================================================
--  今晚吃什么 · Tonight's Kitchen
--  Supabase schema — run once in: Supabase Dashboard → SQL Editor
-- ============================================================
--
--  What this file sets up:
--   • 7 tables: dishes, orders, order_items, ratings, wishlist,
--     kitchen_access, kitchen_members
--   • Row Level Security: guests read, unlocked kitchen members write
--   • A public "dish-images" storage bucket + member-only upload policies
--   • Realtime on the five kitchen tables, so both phones update live
--
--  Auth is a single shared access code. Add or change it in the SQL editor:
--    insert into public.kitchen_access (id, code)
--    values (true, 'your-code')
--    on conflict (id) do update set code = excluded.code;
--
--  Visitors get an anonymous Supabase session. `redeem_kitchen_code` checks
--  the code and adds them to `kitchen_members`; the app then remembers the
--  device. The diner/chef switch is a local UI mode, not authorization.
--  Guests can read the live kitchen but cannot write — except the append-only
--  wishlist insert used by the iOS Shortcut.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. Tables
-- ------------------------------------------------------------

create table if not exists public.dishes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('staple', 'vegetable', 'meat', 'soup', 'snack')),
  calories integer not null default 0 check (calories >= 0),
  emoji text,
  image_url text,
  recipe_steps text[] not null default '{}',
  recipe_link text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_date date not null default (now() at time zone 'Asia/Shanghai')::date,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'completed')),
  note text,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  completed_at timestamptz
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  dish_id uuid not null references public.dishes (id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'preparing', 'served')),
  created_at timestamptz not null default now(),
  unique (order_id, dish_id)
);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  dish_id uuid not null references public.dishes (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (order_id, dish_id)
);

-- Updated public.wishlist definition for link imports
create table if not exists public.wishlist (
  id uuid primary key default gen_random_uuid(),
  title text,
  note text,
  status text not null default 'pending_review' check (status in ('pending_review', 'ready')),
  dish_id uuid references public.dishes (id) on delete set null,
  source text default 'rednote',
  rednote_url text,
  cover_image text,
  calories integer,
  ingredients text[] default '{}',
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

comment on table public.dishes is 'Menu items the chef maintains.';
comment on table public.orders is 'One dinner order per night.';
comment on table public.order_items is 'Dishes in a dinner order + cooking status.';
comment on table public.ratings is 'The diner''s rating for a dish in a completed order.';
comment on table public.wishlist is 'Wishes from the diner, plus RedNote shares waiting in the chef''s inbox.';

-- One shared access code. The table has RLS enabled and no policies, so only
-- the security-definer RPC below can read it. Add the code in the SQL editor.
create table if not exists public.kitchen_access (
  id boolean primary key default true check (id),
  code text not null,
  updated_at timestamptz not null default now()
);

comment on table public.kitchen_access is 'Single shared access code for the private kitchen.';

-- Anonymous Supabase users who have redeemed the access code on this device.
create table if not exists public.kitchen_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.kitchen_members is 'Supabase Auth users who unlocked the kitchen with the access code.';

-- ------------------------------------------------------------
-- 1b. Wishlist migration (for kitchens created before share-import)
-- ------------------------------------------------------------
-- Re-running this block is safe. It renames the old `name` column, adds the
-- share-import columns and moves the old statuses onto the new ones.
--
-- `title` is intentionally nullable: the iOS Shortcut posts only a
-- `rednote_url` + `status`, and the chef's Review modal fills the title later.
-- `source` accepts `rednote` (the column default used by direct REST inserts),
-- `share` (the in-app share sheet) and `manual` (the diner's wishlist form).

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'wishlist' and column_name = 'name'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'wishlist' and column_name = 'title'
  ) then
    alter table public.wishlist rename column name to title;
  end if;
end;
$$;

alter table public.wishlist add column if not exists title text;
alter table public.wishlist alter column title drop not null;
alter table public.wishlist add column if not exists source text not null default 'manual';
alter table public.wishlist add column if not exists rednote_url text;
alter table public.wishlist add column if not exists cover_image text;
alter table public.wishlist add column if not exists calories integer;
alter table public.wishlist add column if not exists ingredients text[] not null default '{}';

alter table public.wishlist drop constraint if exists wishlist_status_check;
update public.wishlist set status = 'pending_review' where status = 'pending';
update public.wishlist set status = 'ready' where status = 'approved';
alter table public.wishlist
  add constraint wishlist_status_check check (status in ('pending_review', 'ready'));

alter table public.wishlist drop constraint if exists wishlist_source_check;
update public.wishlist set source = 'share' where source = 'rednote';
alter table public.wishlist
  add constraint wishlist_source_check check (source in ('manual', 'share', 'rednote'));

-- ------------------------------------------------------------
-- 1c. Access code
-- ------------------------------------------------------------
-- If you ran the earlier email-auth version, its `user_roles` table and trigger
-- can stay in place; this app no longer reads them. Drop them manually if you
-- want a clean project.
--
-- Returns true and records the current anonymous user as a member when the
-- code matches. The code itself is never exposed to the client.
create or replace function public.redeem_kitchen_code(input_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  expected text;
begin
  if auth.uid() is null then
    return false;
  end if;

  select code into expected from public.kitchen_access where id = true;
  if input_code is null
    or expected is null
    or btrim(expected) = ''
    or btrim(input_code) <> btrim(expected) then
    return false;
  end if;

  insert into public.kitchen_members (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  return true;
end;
$$;

revoke all on function public.redeem_kitchen_code(text) from public;
grant execute on function public.redeem_kitchen_code(text) to authenticated;

-- Membership check used by RLS and the storage policies.
create or replace function public.is_kitchen_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.kitchen_members where user_id = auth.uid()
  );
$$;

revoke all on function public.is_kitchen_member() from public;
grant execute on function public.is_kitchen_member() to anon, authenticated;

create index if not exists dishes_category_idx on public.dishes (category);
create index if not exists dishes_active_idx on public.dishes (is_active);
create index if not exists orders_date_idx on public.orders (order_date desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists ratings_dish_idx on public.ratings (dish_id);
create index if not exists wishlist_status_idx on public.wishlist (status);
-- One pending inbox item per shared note.
create unique index if not exists wishlist_rednote_pending_idx
  on public.wishlist (rednote_url)
  where rednote_url is not null and status = 'pending_review';

-- Keep updated_at fresh when a dish is edited.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists dishes_touch_updated_at on public.dishes;
create trigger dishes_touch_updated_at
  before update on public.dishes
  for each row
  execute function public.touch_updated_at();

drop trigger if exists kitchen_access_touch_updated_at on public.kitchen_access;
create trigger kitchen_access_touch_updated_at
  before update on public.kitchen_access
  for each row
  execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- 2. Row Level Security
-- ------------------------------------------------------------
-- Guests (anon) read the live kitchen but cannot write. A Supabase user with a
-- row in public.kitchen_members (created by redeeming the access code) can
-- order, wish and rate. The one deliberate exception is the append-only
-- wishlist insert used by the iOS Shortcut, which only has the public anon key.

alter table public.dishes enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.ratings enable row level security;
alter table public.wishlist enable row level security;
alter table public.kitchen_access enable row level security;
alter table public.kitchen_members enable row level security;

-- Dishes: everyone reads; unlocked members write.
drop policy if exists "kitchen dishes access" on public.dishes;
drop policy if exists "dishes are readable" on public.dishes;
drop policy if exists "dishes are writable by kitchen members" on public.dishes;
create policy "dishes are readable" on public.dishes
  for select to anon, authenticated using (true);
create policy "dishes are writable by kitchen members" on public.dishes
  for all to authenticated
  using (public.is_kitchen_member())
  with check (public.is_kitchen_member());

-- Orders, items and ratings: everyone reads; unlocked members write.
drop policy if exists "kitchen orders access" on public.orders;
drop policy if exists "orders are readable" on public.orders;
drop policy if exists "orders are writable by kitchen members" on public.orders;
create policy "orders are readable" on public.orders
  for select to anon, authenticated using (true);
create policy "orders are writable by kitchen members" on public.orders
  for all to authenticated
  using (public.is_kitchen_member())
  with check (public.is_kitchen_member());

drop policy if exists "kitchen order items access" on public.order_items;
drop policy if exists "order items are readable" on public.order_items;
drop policy if exists "order items are writable by kitchen members" on public.order_items;
create policy "order items are readable" on public.order_items
  for select to anon, authenticated using (true);
create policy "order items are writable by kitchen members" on public.order_items
  for all to authenticated
  using (public.is_kitchen_member())
  with check (public.is_kitchen_member());

drop policy if exists "kitchen ratings access" on public.ratings;
drop policy if exists "ratings are readable" on public.ratings;
drop policy if exists "ratings are writable by kitchen members" on public.ratings;
create policy "ratings are readable" on public.ratings
  for select to anon, authenticated using (true);
create policy "ratings are writable by kitchen members" on public.ratings
  for all to authenticated
  using (public.is_kitchen_member())
  with check (public.is_kitchen_member());

-- Wishlist: everyone reads; unlocked members write.
drop policy if exists "kitchen wishlist access" on public.wishlist;
drop policy if exists "wishlist is readable" on public.wishlist;
drop policy if exists "wishlist is writable by kitchen members" on public.wishlist;
drop policy if exists "shared wishes can be appended anonymously" on public.wishlist;
create policy "wishlist is readable" on public.wishlist
  for select to anon, authenticated using (true);
create policy "wishlist is writable by kitchen members" on public.wishlist
  for all to authenticated
  using (public.is_kitchen_member())
  with check (public.is_kitchen_member());
-- iOS Shortcut: append-only pending shares with the public anon key.
create policy "shared wishes can be appended anonymously" on public.wishlist
  for insert to anon
  with check (
    status = 'pending_review'
    and rednote_url is not null
    and dish_id is null
    and approved_at is null
  );

-- Members: each user can read only their own row. The RPC writes it.
drop policy if exists "users can read their own membership" on public.kitchen_members;
create policy "users can read their own membership" on public.kitchen_members
  for select to authenticated
  using (user_id = auth.uid());

-- kitchen_access has RLS enabled and no policies: only the RPC can read it.

-- Explicit table grants (safe to re-run).
revoke insert, update, delete on public.dishes from anon;
revoke insert, update, delete on public.orders from anon;
revoke insert, update, delete on public.order_items from anon;
revoke insert, update, delete on public.ratings from anon;
revoke update, delete on public.wishlist from anon;
revoke all on public.kitchen_access from anon, authenticated;
revoke all on public.kitchen_members from anon;
revoke insert, update, delete on public.kitchen_members from authenticated;

grant select on public.dishes to anon;
grant select on public.orders to anon;
grant select on public.order_items to anon;
grant select on public.ratings to anon;
grant select, insert on public.wishlist to anon;

grant select, insert, update, delete on public.dishes to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.order_items to authenticated;
grant select, insert, update, delete on public.ratings to authenticated;
grant select, insert, update, delete on public.wishlist to authenticated;
grant select on public.kitchen_members to authenticated;

-- ------------------------------------------------------------
-- 3. Storage: public bucket for dish photos
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dish-images',
  'dish-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "dish images are publicly readable" on storage.objects;
create policy "dish images are publicly readable" on storage.objects
  for select using (bucket_id = 'dish-images');

drop policy if exists "dish images can be uploaded" on storage.objects;
create policy "dish images can be uploaded" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'dish-images'
    and public.is_kitchen_member()
  );

drop policy if exists "dish images can be updated" on storage.objects;
create policy "dish images can be updated" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'dish-images'
    and public.is_kitchen_member()
  )
  with check (
    bucket_id = 'dish-images'
    and public.is_kitchen_member()
  );

drop policy if exists "dish images can be deleted" on storage.objects;
create policy "dish images can be deleted" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'dish-images'
    and public.is_kitchen_member()
  );

-- ------------------------------------------------------------
-- 4. Realtime
-- ------------------------------------------------------------
-- Adds each table to the supabase_realtime publication exactly once.

do $$
declare
  table_name text;
begin
  foreach table_name in array array['dishes', 'orders', 'order_items', 'ratings', 'wishlist']
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;

-- Done. Next (optional): run supabase/seed.sql once to load the demo menu.
