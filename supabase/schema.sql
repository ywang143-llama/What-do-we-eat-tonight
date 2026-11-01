-- ============================================================
--  今晚吃什么 · Tonight's Kitchen
--  Supabase schema — run once in: Supabase Dashboard → SQL Editor
-- ============================================================
--
--  What this file sets up:
--   • 5 tables: dishes, orders, order_items, ratings, wishlist
--   • Row Level Security for a private two-person kitchen
--   • A public "dish-images" storage bucket + upload policies
--   • Realtime on every table, so both phones update live
--
--  This app intentionally allows the `anon` role to read/write so that it
--  works out of the box with just the public anon key. It is designed for a
--  private URL shared by two people. If you ever make it public, add real
--  authentication and replace the policies at the bottom of this file.
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

-- ------------------------------------------------------------
-- 2. Row Level Security
-- ------------------------------------------------------------
-- Private two-person app: the anon key is treated as the shared house key.
-- The app also signs in anonymously when enabled, which satisfies
-- `authenticated` policies below. Both roles are allowed.

alter table public.dishes enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.ratings enable row level security;
alter table public.wishlist enable row level security;

drop policy if exists "kitchen dishes access" on public.dishes;
create policy "kitchen dishes access" on public.dishes
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "kitchen orders access" on public.orders;
create policy "kitchen orders access" on public.orders
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "kitchen order items access" on public.order_items;
create policy "kitchen order items access" on public.order_items
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "kitchen ratings access" on public.ratings;
create policy "kitchen ratings access" on public.ratings
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "kitchen wishlist access" on public.wishlist;
create policy "kitchen wishlist access" on public.wishlist
  for all to anon, authenticated using (true) with check (true);

-- Explicit table grants (safe to re-run).
grant select, insert, update, delete on public.dishes to anon, authenticated;
grant select, insert, update, delete on public.orders to anon, authenticated;
grant select, insert, update, delete on public.order_items to anon, authenticated;
grant select, insert, update, delete on public.ratings to anon, authenticated;
grant select, insert, update, delete on public.wishlist to anon, authenticated;

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
  for insert to anon, authenticated
  with check (bucket_id = 'dish-images');

drop policy if exists "dish images can be updated" on storage.objects;
create policy "dish images can be updated" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'dish-images')
  with check (bucket_id = 'dish-images');

drop policy if exists "dish images can be deleted" on storage.objects;
create policy "dish images can be deleted" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'dish-images');

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
