<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project status

`project-roadmap.md` in the repo root is the source of truth for what
comes after this point — work through its phases in order and don't
jump ahead of what's marked done below.

## Phase 0 — Project setup: COMPLETE, verified

- Next.js (App Router) + TypeScript + Tailwind CSS, scaffolded via
  `create-next-app`.
- Pushed to GitHub: `github.com/benfranco21/Car-Mod-Marketplace`
  (`main` branch).
- Deployed to Vercel, connected to the GitHub repo — every push to
  `main` auto-deploys. Live URL: `https://car-mod-marketplace.vercel.app`.
- Supabase connected: client at `src/lib/supabase/client.ts`, reads
  `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
  `.env.local` (git-ignored; see `.env.local.example` for the shape).
  Same two vars are also set in the Vercel project's environment
  variables, since Vercel builds from GitHub and never sees
  `.env.local`.
- `/api/health` returns whether those env vars are present, without
  exposing their values — useful for confirming prod config quickly.

## Phase 1 — Database schema & authentication: schema COMPLETE,
## signup/login COMPLETE, verified

Database (migration: `supabase/migrations/20260820135126_initial_schema.sql`):

- Tables: `users` (role: `car_owner` | `shop_owner`, one-to-one with
  `auth.users`), `shops` (one per shop-owner user), `services` (fixed
  category list: Wraps, Exhaust, Wheels, Fabrication, PPF, Tuning),
  `shop_services` (many-to-many join table).
- Row Level Security is on for all four tables: `shops`, `services`,
  and `shop_services` are publicly readable (needed for Phase 3
  search); `users` rows are only visible/editable by their own owner.
- A `handle_new_user` trigger on `auth.users` auto-creates the
  matching `public.users` row (and, for shop owners, the `shops` row)
  the instant someone signs up — it runs with elevated privileges, so
  it works whether or not email confirmation is pending. Role/name/
  business_name/location are passed in via `signUp()`'s
  `options.data` and read from `raw_user_meta_data` in the trigger.
- **Supabase project currently has "confirm email" required** — a new
  signup has no active session until the user clicks the emailed
  link. Signup pages account for this (see below). If this setting is
  ever changed in the Supabase dashboard, the pages don't need
  changes — they already branch on whether `signUp()` returns a
  session.

Pages built (client components, using the browser Supabase client):

- `/signup/car-owner` — name, email, password.
- `/signup/shop` — name, email, password, business name, location
  (services are added later, in the Phase 2 profile editor — not
  collected at signup).
- `/login` — shared for both roles; after `signInWithPassword()`,
  looks up the caller's role from `public.users` and redirects to
  `/dashboard` (shop owner) or `/search` (car owner).
- `/dashboard` and `/search` — placeholder shells for now (client-side
  session check, redirect to `/login` if signed out, sign-out
  button). Real content is Phase 2 (`/dashboard`) and Phase 3
  (`/search`).

Verified: built a script that exercised the real `handle_new_user`
trigger and a real `signInWithPassword()` call end-to-end for both
roles directly against the Supabase project (bypassing only the
confirmation *email send*, to stay under the project's free-tier
email rate limit — the trigger, tables, and login/redirect logic were
all exercised for real). All test data was cleaned up afterward. Not
yet manually clicked through in a browser — recommended as a sanity
check before starting Phase 2.

## Phase 2 — Shop side: profile creation & dashboard: COMPLETE, verified

Database (migration: `supabase/migrations/20260824180000_phase2_shop_profile.sql`):

- New `portfolio_images` table (`shop_id`, `storage_path`), RLS:
  publicly readable, insert/delete restricted to the owning shop's
  owner.
- New `portfolio-images` storage bucket (public, so Phase 3 profile
  pages can render images without auth). Files are uploaded under
  `<shop_id>/<filename>`; storage policies restrict upload/delete to
  that shop's owner using the same folder-name convention.
- This session's Postgres pooler connection string is saved as
  `DATABASE_URL` in `.env.local` (git-ignored, not committed) —
  it's how this migration was pushed (`supabase db push --db-url`)
  and how end-to-end verification below queried/confirmed test data,
  without needing `supabase login`/`supabase link` in this
  environment.

Dashboard (`src/app/dashboard/page.tsx`, client component):

- Read-only profile view by default: business name, location,
  description, services offered (as tags), portfolio photo gallery.
- "Edit profile" toggles into a form (business name, location,
  description, services multi-select checkboxes) that updates
  `shops` and re-syncs `shop_services` (delete-then-reinsert selected
  rows — simple and correct given there are only 6 possible
  services).
- Portfolio section: multi-file upload straight to
  `portfolio-images/<shop_id>/...`, with a matching row inserted into
  `portfolio_images`; each photo has a "Remove" button (deletes the
  storage file, then the row). Thumbnails render via
  `getPublicUrl()` since the bucket is public.

Verified end-to-end against the real Supabase project via a
Playwright-driven headless Chromium session (the `chromium-cli` tool
wasn't available in this environment, so a throwaway Playwright
script did the driving instead): signed up a test shop owner,
confirmed the account directly via `DATABASE_URL` (bypassing the
actual confirmation email), logged in, confirmed the trigger-seeded
business name/location appeared, edited and saved every field plus
services, reloaded to confirm the changes persisted (not just local
state), uploaded two photos, confirmed the public storage URL
actually resolves (HTTP 200), removed one photo, and reloaded to
confirm the removal persisted too. Zero console or network errors
throughout. All test database rows were cleaned up afterward. One
leftover ~68-byte test image was left behind in the `portfolio-images`
bucket — Supabase blocks direct `DELETE` on `storage.objects` via
SQL (it requires the Storage API plus a valid session or a
service-role key, neither available in that moment) — **this has
since been deleted manually via the Supabase dashboard.**

Known gap: the automated Playwright pass above is not the same as a
human clicking through the real UI. An attempt to do that manually
today hit Supabase's free-tier auth email rate limit before it could
be completed — worth finishing next session once the rate limit
resets (sign up a real test shop account via the actual browser,
click the confirmation email, click through the dashboard).

## Phase 3 — Car owner side: search, filter & shop profile view: COMPLETE, verified

No new migration needed — the Phase 1/2 migrations already made
`shops`, `services`, `shop_services`, and `portfolio_images` publicly
readable (`using (true)` on all four `select` policies). Confirmed
this live via anonymous (no-session) REST calls before building
anything.

Pages built (client components):

- `/search` — rebuilt from the Phase 1 placeholder into a fully public
  browse page (no login required, unlike the old placeholder that
  redirected to `/login`). Fetches all shops with their embedded
  `shop_services`, then filters client-side: service category chips
  (multi-select, OR match) and a location text field (case-insensitive
  substring match). Header shows "Log in" when signed out or "Sign
  out" when signed in, but never gates the page itself. Empty state
  when no shops match.
- `/shops/[shopId]` — new public, read-only shop profile page:
  business name, location, description, service tags, portfolio photo
  gallery (same `getPublicUrl()` pattern as the dashboard). A disabled
  "Request a quote" button is a placeholder for Phase 4. An invalid/
  unknown shop id shows a friendly "couldn't find that shop" message
  with a link back to `/search`, instead of erroring.
- Search results link directly to `/shops/[shop.id]`.

Verified end-to-end with a real Playwright-driven headless Chromium
session, deliberately using a **cookie-free browser context** (not
just "not clicking sign out") to prove the public-page requirement.
Created a real temporary shop-owner account directly via a SQL insert
into `auth.users` (bypassing GoTrue's `signUp()` — a plain
`@example.com` test address was rejected by Supabase's email
validator, `@gmail.com` was accepted, and inserting directly avoided
sending any confirmation email at all), with the same `handle_new_user`
trigger firing to create `public.users`/`shops`. Logged in as that
user just long enough to set services and upload one real photo, then
signed out — the browser context had zero cookies when it loaded the
profile page, and every field, service tag, and the uploaded photo
(HTTP 200 from its public storage URL) rendered correctly. Also
confirmed clicking a shop card in `/search` navigates to the correct
`/shops/[shopId]` URL, and that an unknown shop id renders the
not-found state instead of crashing. Zero console/network errors
throughout. All test data (the auth user, which cascades to
`users`/`shops`/`shop_services`/`portfolio_images`, plus the uploaded
storage file) was cleaned up afterward — confirmed the shop row no
longer exists post-cleanup.

## Phase 4 — The core loop: contact / quote request: COMPLETE, verified

Database (migration: `supabase/migrations/20260902123000_phase4_messaging.sql`):

- New `conversations` table: one thread per `(shop_id, car_owner_id)`
  pair (unique constraint — repeated quote requests to the same shop
  reuse the same thread), `status` (`'new' | 'replied'`, defaults to
  `'new'`), `updated_at` for inbox sorting.
- New `messages` table: `conversation_id`, `sender_id`, `body`,
  `created_at`.
- RLS on both restricts read/write to the two participants (the car
  owner, or the shop's owner via a join through `shops.owner_id`) —
  unlike Phase 1-3's public tables, these are private by default.
  Confirmed anonymous REST calls return `[]`/`401` on both tables.
- **Deliberate design choice**: `conversations.car_owner_name` is a
  denormalized snapshot taken at creation time, not a join to
  `public.users`. Postgres RLS is row-level only — a policy letting a
  shop owner read a car owner's `users` row would have exposed the
  *entire* row (including `email`), not just `name`, however narrowly
  the app's own queries were scoped. Snapshotting the name avoids
  needing any new `users` policy at all, so `email` is never in a row
  a shop owner can reach. Since nothing in the app lets a user edit
  their `name` after signup, staleness isn't a practical concern.
- Status only ever moves `'new'` → `'replied'`, flipped the first time
  the shop owner sends a message in a conversation; it does not
  revert to `'new'` on a later car-owner follow-up. Deliberately
  simple "have I responded to this lead" tracking, not a full
  unread/needs-reply indicator.

Pages built (client components):

- Shop profile page (`/shops/[shopId]`) — the disabled Phase 3
  placeholder is now a real action with three states: logged out
  shows an inline "Log in or sign up to request a quote" prompt (no
  forced redirect away from the page); a logged-in car owner with no
  existing thread gets a textarea right on the page, and sending it
  creates the conversation + first message together before routing to
  the thread; a car owner who already has a thread with this shop
  gets a "View conversation" link instead of a second compose box.
  Logged-in shop owners never see this section at all (including on
  their own shop's profile) — messaging is car-owner → shop only.
- `/messages/[conversationId]` — the shared thread view for both
  sides (requires login; redirects to `/login` if signed out). Shows
  the other party's name (the shop's `business_name` for a car owner,
  the conversation's snapshotted `car_owner_name` for a shop owner),
  each message labeled "You" vs. the other party, and a reply box.
  Sending a reply appends it locally (no full refetch) and, only when
  the sender is a shop owner, flips `status` to `'replied'`.
- `/messages` — new car owner inbox: their conversations sorted by
  most recent activity, shop name + status badge, linking into the
  thread. (Labeled "Awaiting reply" / "Replied" here, vs. "New" /
  "Replied" on the shop's side — same underlying status, worded for
  which side is looking at it.)
- Dashboard (`src/app/dashboard/page.tsx`) — new "Leads" section below
  Portfolio: the shop's conversations sorted by most recent activity,
  car owner name + new/replied badge, linking into the same thread
  view.

Verified end-to-end with a real Playwright-driven Chromium session
against two ephemeral real accounts (a shop owner and a car owner),
created the same way as Phase 3's verification — direct SQL insert
into `auth.users` (bypassing GoTrue's email-domain validation and any
confirmation email), with `handle_new_user` firing normally. Using
two separate browser contexts (one per role, real login through the
`/login` form, not session injection) confirmed the full loop for
real: logged-out visitor sees the prompt with no compose box; the car
owner sends a first message and lands on the thread with it visible;
the shop owner sees the lead in their dashboard labeled "New," opens
it, sees the car owner's message, and replies; the dashboard badge
flips to "Replied"; the shop owner's own profile page shows no quote
UI; the car owner sees the shop's reply in the thread and "Replied" in
their own `/messages` inbox; revisiting the shop profile now shows
"View conversation" instead of a second compose box. Also confirmed
anonymous REST calls to the specific conversation and message rows
created during this test both returned `[]`, proving RLS actually
enforces participant-only access rather than just the app UI choosing
not to show it. All test data (both auth users, cascading to their
`shops`/`conversations`/`messages` rows) was cleaned up afterward —
confirmed the shop row and all conversations were gone.

## Visual design pass — "Midnight racer": COMPLETE, verified, live

Not a numbered roadmap phase — a cross-cutting visual pass applied on
top of the functionality built in Phases 1-4. Purely visual; no
behavior changed.

Design system, wired as global Tailwind v4 tokens in
`src/app/globals.css` (`@theme inline`) and fonts in `src/app/layout.tsx`:

- Background `#0B0E14`, surface `#1A2230`, accent cyan `#4FD8E0`
  (links/highlights/active nav), action red `#E14F3D` (reserved for
  exactly one primary button per screen — e.g. "Send message," "Save
  changes," "Log in" — never used decoratively), text `#EAF0F6` /
  `#8C97A6` (secondary). Display font Oswald (headings, wordmark),
  body font Inter, both via `next/font/google`.
- New shared `src/components/Nav.tsx` (client component): wordmark,
  and auth-aware right side (Log in when signed out; Dashboard or
  Messages — role-dependent — plus Sign out when signed in). Used on
  every page below instead of each page rolling its own header/sign-
  out button.

Applied to all 7 existing functional pages — `/search`,
`/shops/[shopId]`, `/dashboard`, `/messages/[conversationId]`,
`/messages`, `/login`, `/signup/car-owner`, `/signup/shop` — plus the
shared `Nav`. Root `/` was deliberately left untouched (still the
default `create-next-app` placeholder; a separate task). Empty/
loading/not-found states across these pages got on-brand treatment
(icon + message, pulse skeletons) instead of plain grey placeholder
text. The "one primary action per screen" rule holds even on the
dashboard's busiest state (the profile edit form): "Save changes" is
the only action-red element next to several accent-outlined buttons
(Edit profile, Upload photos, service chips, Cancel).

Pushed as 8 separate commits — design foundation + `/search` together
first, then each of the other 6 pages as its own commit — specifically
so a problem in one page's styling could be isolated and fixed without
touching the others, per explicit instruction after the Phase 3/4
push miss below.

Verified per page before each push: `tsc --noEmit` + `eslint` clean,
a full `next build` (matching what Vercel actually runs, to catch
anything a type-check alone wouldn't), then Playwright screenshots at
mobile (390px) and desktop (1280px) widths. Covered every conditional
UI state, not just the happy path: loading skeletons, empty states,
the shop-profile not-found state, the logged-out quote prompt, the
car-owner compose form vs. the "View conversation" link for a
returning car owner, and the dashboard's read vs. edit-mode profile
view — using two ephemeral real accounts (a shop owner and a car
owner) with real populated data (a shop with services/description, a
conversation with real messages), created and cleaned up the same way
as Phase 3/4's verification. Zero console/page errors throughout.
After the final push, confirmed live in production against
`https://car-mod-marketplace.vercel.app` via both content-marker curl
checks on every page and real Playwright screenshots against the live
URL (not just local dev) — including confirming the shop profile
page's new loading skeleton is what's actually being served
server-side, since that page's real content only appears after
client-side data fetching resolves.

**Incident during this session, since corrected:** after Phase 3 and
Phase 4 were built and marked "verified, pushed" in this file, they
had in fact only been *committed locally* — `git push` was never run.
Vercel's production deployment silently stayed on the Phase 2 commit
for over a week of (accurately documented, but unpushed) work. The
user caught this by noticing Vercel's dashboard hadn't redeployed.
Root cause was purely a missed step, not a Vercel/webhook problem —
`git status` immediately showed "ahead of origin/main by 2 commits."
Both commits were then pushed with nothing else changed. **Lesson
applied for the rest of this session and going forward: `git push`
immediately after every commit, never batch commits locally and push
later** — confirmed via `git log origin/main` after every subsequent
push in this session, and this design pass's 8 commits were each
pushed individually rather than batched, partly for exactly this
reason.

## What's next

Phase 5 (seed real shop data, walk real people through the app) per
`project-roadmap.md`.

