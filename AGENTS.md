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

## What's next

Phase 2 (shop profile creation + dashboard) per `project-roadmap.md`.

