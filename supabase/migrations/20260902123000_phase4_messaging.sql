-- Phase 4: quote requests & in-app messaging

-- 1. conversations: one thread per (shop, car owner) pair
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  car_owner_id uuid not null references public.users (id) on delete cascade,
  car_owner_name text not null,
  status text not null default 'new' check (status in ('new', 'replied')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, car_owner_id)
);

create index conversations_shop_id_idx on public.conversations (shop_id);
create index conversations_car_owner_id_idx on public.conversations (car_owner_id);

alter table public.conversations enable row level security;

create policy "Participants can view their conversations"
  on public.conversations for select
  using (
    auth.uid() = car_owner_id
    or exists (
      select 1 from public.shops
      where shops.id = conversations.shop_id
      and shops.owner_id = auth.uid()
    )
  );

create policy "Car owners can start a conversation with a shop"
  on public.conversations for insert
  with check (auth.uid() = car_owner_id);

create policy "Participants can update their conversation"
  on public.conversations for update
  using (
    auth.uid() = car_owner_id
    or exists (
      select 1 from public.shops
      where shops.id = conversations.shop_id
      and shops.owner_id = auth.uid()
    )
  );

-- 2. messages: individual messages within a conversation
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index messages_conversation_id_idx on public.messages (conversation_id);

alter table public.messages enable row level security;

create policy "Participants can view messages in their conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
      and (
        conversations.car_owner_id = auth.uid()
        or exists (
          select 1 from public.shops
          where shops.id = conversations.shop_id
          and shops.owner_id = auth.uid()
        )
      )
    )
  );

create policy "Participants can send messages in their conversations"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
      and (
        conversations.car_owner_id = auth.uid()
        or exists (
          select 1 from public.shops
          where shops.id = conversations.shop_id
          and shops.owner_id = auth.uid()
        )
      )
    )
  );
