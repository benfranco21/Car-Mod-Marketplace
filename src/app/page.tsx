import Link from "next/link";
import Nav from "@/components/Nav";

const carOwnerPoints = [
  {
    title: "Search by service",
    description:
      "Filter by wraps, exhaust, wheels, fabrication, PPF, or tuning — find the right shop, not just any shop.",
  },
  {
    title: "Message shops directly",
    description:
      "Send a quote request straight to the shop and keep the conversation in one place — no more losing DMs in Facebook.",
  },
  {
    title: "Built for SA car culture",
    description:
      "Made for South African car owners and the shops that build for them.",
  },
];

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-3xl flex-col items-start gap-6 px-4 py-16 sm:px-6 sm:py-24">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Find the right shop for your build
          </h1>
          <p className="max-w-xl text-lg text-muted">
            Car Mod Marketplace connects car owners with wrap, exhaust, wheel,
            fabrication, PPF, and tuning shops — search by what you need, then
            message the shop directly.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/search"
              className="rounded-lg bg-action px-5 py-2.5 text-center text-sm font-medium text-white transition hover:bg-action/90"
            >
              Find a shop
            </Link>
            <Link
              href="/signup/shop"
              className="rounded-lg border border-accent/50 px-5 py-2.5 text-center text-sm font-medium text-accent transition hover:bg-accent/10"
            >
              List your business
            </Link>
          </div>
        </section>

        <section className="border-t border-white/10 bg-surface/40">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-14 sm:px-6">
            <h2 className="font-display text-2xl font-semibold text-foreground">
              For car owners
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {carOwnerPoints.map((point) => (
                <div key={point.title} className="flex flex-col gap-2">
                  <h3 className="font-display text-lg font-medium text-foreground">
                    {point.title}
                  </h3>
                  <p className="text-sm text-muted">{point.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/10">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-14 sm:px-6">
            <h2 className="font-display text-2xl font-semibold text-foreground">
              For shop owners
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <h3 className="font-display text-lg font-medium text-foreground">
                  Get found
                </h3>
                <p className="text-sm text-muted">
                  Show up for people actively searching for exactly what you
                  do — not just scrolling past your posts.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="font-display text-lg font-medium text-foreground">
                  Manage leads in one place
                </h3>
                <p className="text-sm text-muted">
                  Every quote request lands in one inbox instead of scattered
                  across DMs and comments.
                </p>
              </div>
            </div>
            <Link
              href="/signup/shop"
              className="self-start rounded-lg border border-accent/50 px-5 py-2.5 text-sm font-medium text-accent transition hover:bg-accent/10"
            >
              List your business
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
