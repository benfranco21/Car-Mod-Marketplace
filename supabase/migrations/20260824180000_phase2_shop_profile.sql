-- Phase 2: shop profile portfolio images (storage bucket + table)

-- 1. portfolio_images: one row per uploaded photo, pointing at the file's
-- path in the "portfolio-images" storage bucket.
create table public.portfolio_images (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index portfolio_images_shop_id_idx on public.portfolio_images (shop_id);

alter table public.portfolio_images enable row level security;

create policy "Portfolio image rows are publicly viewable"
  on public.portfolio_images for select
  using (true);

create policy "Shop owners can add portfolio images to their own shop"
  on public.portfolio_images for insert
  with check (
    exists (
      select 1 from public.shops
      where shops.id = portfolio_images.shop_id
      and shops.owner_id = auth.uid()
    )
  );

create policy "Shop owners can delete their own portfolio images"
  on public.portfolio_images for delete
  using (
    exists (
      select 1 from public.shops
      where shops.id = portfolio_images.shop_id
      and shops.owner_id = auth.uid()
    )
  );

-- 2. Storage bucket for the actual image files. Public so shop profile
-- pages (Phase 3) can render images via their public URL without an
-- authenticated request. Files are uploaded under "<shop_id>/<filename>",
-- which the policies below use to check ownership.
insert into storage.buckets (id, name, public)
values ('portfolio-images', 'portfolio-images', true);

create policy "Portfolio image files are publicly viewable"
  on storage.objects for select
  using (bucket_id = 'portfolio-images');

create policy "Shop owners can upload their own portfolio image files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'portfolio-images'
    and exists (
      select 1 from public.shops
      where shops.owner_id = auth.uid()
      and shops.id::text = (storage.foldername(name))[1]
    )
  );

create policy "Shop owners can delete their own portfolio image files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'portfolio-images'
    and exists (
      select 1 from public.shops
      where shops.owner_id = auth.uid()
      and shops.id::text = (storage.foldername(name))[1]
    )
  );
