# Car Mod Marketplace — Project Status

*A plain-language status update, written for you, not for a future AI
session. Last updated 24 August 2026.*

## What this app is

A website that connects car modification businesses (wrap shops,
exhaust shops, wheel shops, fabricators, tuners, etc.) with car
owners looking for that kind of work. Shops that don't have much of
a web presence — often just a Facebook page — get a proper profile
people can actually search for. Car owners search by the type of
work they need and their area, look through shop profiles and photo
galleries, and reach out.

## What's actually working right now

- **Shops and car owners can both sign up and log in.** When
  someone signs up, the app already knows whether they're "a shop"
  or "a car owner" and sends them to the right place.
- **A shop owner can build out their profile.** Once logged in, a
  shop can fill in their business name, location, a description of
  what they do, and tick off which services they offer (wraps,
  exhaust, wheels, fabrication, PPF, tuning). They can come back and
  edit any of it later.
- **A shop owner can upload photos of their work.** There's a simple
  photo gallery on the dashboard — upload a batch of photos, and
  remove any you don't want anymore. This is the start of the
  portfolio a car owner will eventually see on a shop's public
  profile page.
- **All of this is actually saved properly**, not just something
  that looks like it works on screen — I tested the whole flow
  (sign up, log in, edit profile, save, upload photos, delete a
  photo, reload the page) against the real database, and everything
  round-tripped correctly with no errors.

## What a shop owner *can't* do yet

Car owners can't actually find or view a shop yet — there's no
search page and no public shop profile page. Right now, a shop's
profile only exists as something they can see and edit themselves
after logging in. Nobody can browse the marketplace yet. That's the
very next piece of work.

## What's next

**Search & shop profile pages.** The plan is: a page where a car
owner can filter by service type and location, see a list of
matching shops, and click through to a shop's full public profile
(the same info a shop filled in, but read-only, for anyone to see —
including their portfolio photos).

After that comes the actual point of the whole app: letting a car
owner message a shop or request a quote, and letting the shop see
and reply to that in their dashboard.

## Known issues / things worth doing yourself

- **I haven't personally clicked through the new dashboard in a
  browser yet.** I tried today, but Supabase (the database/login
  service this runs on) has a limit on how many confirmation emails
  it'll send per hour on the free plan, and I hit that limit while
  testing. It should reset within an hour or so — worth doing a
  quick manual click-through next time you sit down with this, just
  as a sanity check, even though it's already been tested
  automatically.
- **No real shops or car owners are using this yet** — this is all
  still test data. That's expected at this stage; the plan is to add
  a handful of real shop profiles once search and profile pages
  exist (that's a couple of phases away still).
- **This is still an MVP.** No payments, no reviews, no messaging
  yet — those are all coming later, on purpose, so the core
  "find a shop and get in touch" flow gets built and proven first.
