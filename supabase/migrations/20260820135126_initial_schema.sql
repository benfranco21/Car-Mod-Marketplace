-- Phase 1: core schema (users, shops, services, shop_services)

-- 1. Role type for the users table
create type public.user_role as enum ('car_owner', 'shop_owner');

-- 2. users: app profile row, one-to-one with auth.users
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null,
  role public.user_role not null,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can view their own row"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own row"
  on public.users for update
  using (auth.uid() = id);

-- 3. shops: one public profile per shop-owner user
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.users (id) on delete cascade,
  business_name text not null,
  location text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shops enable row level security;

create policy "Shops are publicly viewable"
  on public.shops for select
  using (true);

create policy "Shop owners can update their own shop"
  on public.shops for update
  using (auth.uid() = owner_id);

-- 4. services: fixed category list
create table public.services (
  id serial primary key,
  name text not null unique
);

alter table public.services enable row level security;

create policy "Services are publicly viewable"
  on public.services for select
  using (true);

insert into public.services (name) values
  ('Wraps'),
  ('Exhaust'),
  ('Wheels'),
  ('Fabrication'),
  ('PPF'),
  ('Tuning');

-- 5. shop_services: many-to-many between shops and services
create table public.shop_services (
  shop_id uuid not null references public.shops (id) on delete cascade,
  service_id integer not null references public.services (id) on delete cascade,
  primary key (shop_id, service_id)
);

create index shop_services_service_id_idx on public.shop_services (service_id);

alter table public.shop_services enable row level security;

create policy "Shop services are publicly viewable"
  on public.shop_services for select
  using (true);

create policy "Shop owners can manage their own shop's services"
  on public.shop_services for all
  using (
    exists (
      select 1 from public.shops
      where shops.id = shop_services.shop_id
      and shops.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.shops
      where shops.id = shop_services.shop_id
      and shops.owner_id = auth.uid()
    )
  );

-- 6. Auto-create the users row (and, for shop owners, the shops row) the
-- moment someone signs up. Runs with elevated privileges (security
-- definer) so it works even before the new user has an active session
-- (e.g. while email confirmation is pending).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'name',
    (new.raw_user_meta_data ->> 'role')::public.user_role
  );

  if (new.raw_user_meta_data ->> 'role') = 'shop_owner' then
    insert into public.shops (owner_id, business_name, location)
    values (
      new.id,
      new.raw_user_meta_data ->> 'business_name',
      new.raw_user_meta_data ->> 'location'
    );
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
