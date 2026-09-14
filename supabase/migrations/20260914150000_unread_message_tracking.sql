-- Unread message indicators: track each participant's last-read time per
-- conversation, and denormalize who sent the most recent message so unread
-- state can be computed without scanning the messages table on every page
-- load.

alter table public.conversations
  add column last_message_sender_id uuid references public.users (id);

-- Backfill from existing messages so already-seeded demo conversations get
-- correct unread state immediately, not just new ones going forward.
update public.conversations c
set last_message_sender_id = latest.sender_id
from (
  select distinct on (conversation_id) conversation_id, sender_id
  from public.messages
  order by conversation_id, created_at desc
) latest
where latest.conversation_id = c.id;

-- One row per (conversation, participant): when that participant last
-- opened the thread. A separate table (rather than two nullable columns on
-- conversations, one per side) means RLS can restrict each participant to
-- writing only their own row via a plain "user_id = auth.uid()" check, with
-- no risk of one side resetting the other's read state the way a shared-row
-- WITH CHECK would need extra care to prevent.
create table public.conversation_reads (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_reads enable row level security;

create policy "Users can view their own read state"
  on public.conversation_reads for select
  using (user_id = auth.uid());

create policy "Users can set their own read state for conversations they're in"
  on public.conversation_reads for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.conversations
      where conversations.id = conversation_reads.conversation_id
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

create policy "Users can update their own read state"
  on public.conversation_reads for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
