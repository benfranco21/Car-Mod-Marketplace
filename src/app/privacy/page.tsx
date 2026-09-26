import Nav from "@/components/Nav";

export const metadata = {
  title: "Privacy Policy — ModFind",
};

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted">Last updated 26 September 2026.</p>
        </div>

        <div className="flex flex-col gap-8 text-foreground/90">
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-medium text-foreground">
              What we collect
            </h2>
            <p>
              Depending on how you use ModFind, we collect: your name, email
              address, and role (car owner or shop owner) when you create an
              account; business details for shop accounts — business name,
              location, description, and the services you offer; portfolio
              photos shop owners choose to upload; and the messages sent
              between car owners and shops when requesting or discussing a
              quote.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-medium text-foreground">
              Why we collect it
            </h2>
            <p>
              We use this information to run the core features of ModFind —
              creating your account, showing shop profiles in search results,
              and delivering messages between car owners and shops. We also
              use your email address to send account-related emails, like
              confirming your address when you sign up. We do not sell your
              data, and we do not use it for advertising.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-medium text-foreground">
              Where it&apos;s stored
            </h2>
            <p>
              Account data, shop profiles, and messages are stored in
              Supabase, which handles our database, authentication, and file
              storage. The app itself is hosted on Vercel. Account-related
              emails are sent through Resend. We don&apos;t run our own
              servers — these are the providers with access to your data as
              part of operating ModFind.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-medium text-foreground">
              Your rights
            </h2>
            <p>
              You can request a copy of the personal data we hold about you,
              or ask us to delete it. Account deletion is available directly
              from your dashboard (shop owners) or profile settings (car
              owners), and removes your account along with the data tied to
              it. For anything else — including data requests, or if you&apos;d
              rather we handle deletion manually — contact us at{" "}
              <a
                href="mailto:privacy@modfind.co.za"
                className="text-accent hover:underline"
              >
                privacy@modfind.co.za
              </a>
              .
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-medium text-foreground">
              Changes to this policy
            </h2>
            <p>
              ModFind is early-stage software, and this policy may change as
              the product does. We&apos;ll update the date at the top of this
              page whenever it does.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
