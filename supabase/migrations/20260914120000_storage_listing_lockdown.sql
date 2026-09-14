-- Security pass ahead of first real-user testing: close the storage
-- listing hole flagged earlier.
--
-- The "portfolio-images" bucket is public (bucket public = true), so
-- individual file downloads via getPublicUrl() are served directly from
-- storage and never go through storage.objects RLS at all. The
-- publicly-viewable SELECT policy added in Phase 2 was therefore never
-- needed for that path — its only real effect was to let ANY client
-- (including anonymous, unauthenticated ones) call the Storage API's
-- list()/get-metadata endpoints across the *entire* bucket, enumerating
-- every shop's folder and filenames. Nothing in the app calls
-- storage.list() (dashboard/shop pages both go through the
-- portfolio_images table + getPublicUrl()), so replacing the public
-- SELECT policy with an owner-only one closes the enumeration hole
-- with no functional change.
drop policy "Portfolio image files are publicly viewable" on storage.objects;

create policy "Shop owners can list their own portfolio image files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'portfolio-images'
    and exists (
      select 1 from public.shops
      where shops.owner_id = auth.uid()
      and shops.id::text = (storage.foldername(name))[1]
    )
  );

-- Second, unrelated gap found during the same pass: the "shops" and
-- "conversations" UPDATE policies only had a USING clause (which rows a
-- participant may touch), never a WITH CHECK (what the resulting row is
-- allowed to look like). Since public.shops.owner_id is itself publicly
-- readable (shops are meant to be public profiles), any shop owner could
-- harvest another real user's id and PATCH their own shop's owner_id to
-- it directly via the REST API (bypassing the app UI entirely), handing
-- that row's conversations/messages access to an arbitrary account.
-- Likewise, a car owner or shop owner could repoint an existing
-- conversation's shop_id/car_owner_id to reassign it, exposing its
-- message history to whoever they aimed it at. Neither is reachable
-- through the app's own UI, only via a crafted API call.
drop policy "Shop owners can update their own shop" on public.shops;

create policy "Shop owners can update their own shop"
  on public.shops for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create or replace function public.prevent_conversation_reassignment()
returns trigger
language plpgsql
as $$
begin
  if new.shop_id <> old.shop_id
    or new.car_owner_id <> old.car_owner_id
    or new.car_owner_name <> old.car_owner_name
  then
    raise exception 'shop_id, car_owner_id, and car_owner_name cannot be changed after creation';
  end if;
  return new;
end;
$$;

create trigger conversations_prevent_reassignment
  before update on public.conversations
  for each row execute function public.prevent_conversation_reassignment();
