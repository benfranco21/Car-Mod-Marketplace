import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted sm:px-6">
        <span>&copy; {new Date().getFullYear()} ModFind</span>
        <div className="flex items-center gap-5">
          <Link href="/privacy" className="transition hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="transition hover:text-foreground">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
