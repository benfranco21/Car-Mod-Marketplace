# Car Mod Marketplace — Project Roadmap

## Vision
A platform connecting South African car modification businesses (wrap shops,
exhaust shops, fabricators, wheel shops, etc.) with car owners looking for
specific work. Car owners search/filter by service and location, view shop
profiles and portfolios, and request quotes or message shops directly. The
goal is to give smaller, Facebook-only businesses the same visibility as
established shops.

**MVP core loop (the only thing that has to work for v1):**
Shop creates a profile → car owner searches/filters → car owner views shop
profile → car owner contacts shop or requests a quote → conversation happens
in-app.

Everything else (payments, analytics, saved favorites, advanced reviews) is
v2 and out of scope until the core loop is proven.

## Recommended tech stack
- **Frontend:** Next.js (React) + Tailwind CSS
- **Backend/database/auth/storage:** Supabase (Postgres database, built-in
  auth, file storage for shop photos, generous free tier)
- **Hosting:** Vercel (pairs naturally with Next.js, free tier for MVP)
- **Version control:** GitHub (already set up)

This stack is chosen for speed of building and low cost while validating,
not for long-term scale — that's the right tradeoff at this stage.

## How to use this document
Work through the phases in order. Do not start a phase until the previous
one is genuinely working and tested — resist the urge to jump ahead. At the
end of each phase, there's a "Done when" checklist; if you can't tick every
box, stay in that phase. Paste one stage's tasks into Claude Code at a time
rather than the whole document at once.

---

## Phase 0 — Project setup
**Goal:** A working, empty, deployed skeleton.

- [ ] Initialize a Next.js project with Tailwind CSS
- [ ] Push initial commit to GitHub
- [ ] Create a Supabase project (note down the project URL and API keys)
- [ ] Connect Supabase to the Next.js app (environment variables, client setup)
- [ ] Deploy the empty app to Vercel and confirm it loads at a live URL

**Done when:** you can visit a live URL and see a blank homepage, and the
codebase is committed to GitHub.

---

## Phase 1 — Database schema & authentication
**Goal:** The data model exists, and both shops and car owners can sign up
and log in.

- [ ] Design core tables: `users`, `shops`, `services` (category list),
      `shop_services` (many-to-many), `messages` or `conversations`
- [ ] Set up authentication via Supabase Auth (email/password is enough
      for MVP — skip social login for now)
- [ ] Build a signup flow that distinguishes "I'm a car owner" vs
      "I'm a shop owner" (this determines what they see after login)
- [ ] Build a basic login/logout flow

**Done when:** you can sign up as both a shop and a car owner, log out, and
log back in, with data persisting in Supabase.

---

## Phase 2 — Shop side: profile creation & dashboard
**Goal:** A shop owner can create a public profile and see incoming messages.

- [ ] Build the "create/edit shop profile" form: business name, location,
      services offered, description, contact info
- [ ] Add photo upload for portfolio images (Supabase storage)
- [ ] Build the shop dashboard shell (this is where the lead inbox will
      live in Phase 4)

**Done when:** a shop owner can create a complete profile with photos and
see it saved correctly in the database.

---

## Phase 3 — Car owner side: search, filter & shop profile view
**Goal:** A car owner can find and view a shop.

- [x] Build the search/browse page with filter by service category and
      location
- [x] Build the public shop profile page (read-only view of what shops
      created in Phase 2)
- [x] Connect search results to shop profile pages (tap a result, land on
      the profile)

**Done when:** a car owner can filter by category, see a list of matching
shops, and open a shop's full profile.

---

## Phase 4 — The core loop: contact / quote request
**Goal:** A car owner can reach a shop, and the shop can respond. This is
the single most important phase — it's the actual product.

- [x] Build a "request a quote" or "message this shop" action on the shop
      profile page
- [x] Build a simple messaging/conversation view (car owner side and shop
      side both need to see the same thread)
- [x] Wire the shop dashboard's lead inbox to show new messages/requests
- [x] Add basic status (e.g. "new" vs "replied") to leads in the dashboard

**Done when:** a test car owner account can message a test shop account,
and the shop account can see and reply to that message.

---

## Phase 5 — Seed real data & test with real people
**Goal:** Replace test data with real shops and get real people using it.

- [ ] Manually create profiles for 5–10 real shops (with their permission,
      using the validation conversations from earlier) to avoid an empty
      app during testing
- [ ] Walk a handful of real car owners and shop owners through the app
      and watch where they get stuck
- [ ] Fix the friction points that come up — don't add new features yet

**Done when:** a real shop and a real car owner have completed the full
loop (search → profile → message) without your help.

---

## Phase 6 — Polish for pitching
**Goal:** The app looks credible enough to show to shop owners as part of
your pitch, not just to prove the concept works.

- [ ] Clean up styling/spacing pass across all screens
- [ ] Add basic empty states (e.g. "no shops match your filters yet")
- [x] Add a simple landing/homepage explaining what the app is, for shops
      landing on it cold
- [ ] Confirm the app works properly on mobile browsers specifically
      (most users will be on their phones)

**Done when:** you'd be comfortable pulling this up on your phone in front
of a shop owner without explaining away rough edges.

---

## Future phases — deliberately deferred past Phase 5

**Social feed:** shops post updates (new work, availability, offers);
car owners follow shops and scroll a chronological feed of posts from
shops they follow; posts link back to the shop's profile and quote
request flow.

Deliberately not scheduled as a numbered phase yet — it's a
meaningful chunk of new product surface (follows, a feed, a posting
UI for shops), and building it before Phase 5's real-world testing
would risk polishing a feature before we know the core loop (search →
profile → quote → message) actually works for real shops and car
owners. Revisit once Phase 5 validates that loop.

---

## Backlog — deliberately not in MVP
Keep this list so good ideas aren't lost, but don't build any of it until
the phases above are done and validated:
- Reviews & ratings
- Saved/favorited shops
- In-app payments
- Push notifications
- Shop analytics dashboard
- Featured/boosted listings (monetization feature)
- Native mobile app (vs. mobile web)
