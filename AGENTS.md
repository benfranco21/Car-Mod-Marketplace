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

## What's next

Phase 4 (quote requests + in-app messaging) per `project-roadmap.md`.

