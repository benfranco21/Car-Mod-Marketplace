import Nav from "@/components/Nav";

export const metadata = {
  title: "Terms of Service — ModFind",
};

export default function TermsPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Terms of Service
          </h1>
          <p className="text-sm text-muted">Last updated 26 September 2026.</p>
        </div>

        <div className="flex flex-col gap-8 text-foreground/90">
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-medium text-foreground">
              Your account
            </h2>
            <p>
              You agree to provide accurate information when you create an
              account or a shop listing. Shop owners are responsible for
              keeping their own listing — business details, services, and
              portfolio — accurate and up to date.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-medium text-foreground">
              Using ModFind
            </h2>
            <p>
              Messaging on ModFind is for genuine quote requests and
              conversations between car owners and shops. Harassment, spam,
              and fraudulent messages are not allowed, whichever side of a
              conversation you&apos;re on.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-medium text-foreground">
              What ModFind is (and isn&apos;t)
            </h2>
            <p>
              ModFind connects car owners with shops — we&apos;re not a party
              to the work you agree to or the transaction that follows.
              Disputes about workmanship, pricing, timelines, or anything
              else about the actual job are between the car owner and the
              shop, not ModFind.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-medium text-foreground">
              Enforcement
            </h2>
            <p>
              We can suspend or remove accounts, listings, or messages that
              violate these terms.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-medium text-foreground">
              Early-stage software
            </h2>
            <p>
              ModFind is early-stage software. Features and pricing may
              change as it develops, and we don&apos;t yet offer any uptime
              guarantee.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
