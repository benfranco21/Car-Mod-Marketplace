"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getUnreadConversationIds, CONVERSATION_READ_EVENT } from "@/lib/unread";

type AuthState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; id: string; role: "car_owner" | "shop_owner" };

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkUnread(userId: string, role: "car_owner" | "shop_owner") {
      const unreadIds = await getUnreadConversationIds(userId, role);
      if (!cancelled) setHasUnread(unreadIds.size > 0);
    }

    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        if (!cancelled) setAuth({ status: "signed-out" });
        return;
      }

      const { data: userRow } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      if (!userRow) {
        setAuth({ status: "signed-out" });
        return;
      }

      setAuth({ status: "signed-in", id: user.id, role: userRow.role });
      await checkUnread(user.id, userRow.role);
    }

    load();

    // Marking a conversation read happens in a different component's effect
    // (the thread page), racing independently against the check above — this
    // re-checks once that finishes, so the dot doesn't linger on the very
    // page that just cleared it.
    async function onConversationRead() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user || cancelled) return;
      const { data: userRow } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      if (!userRow || cancelled) return;
      await checkUnread(user.id, userRow.role);
    }

    window.addEventListener(CONVERSATION_READ_EVENT, onConversationRead);

    return () => {
      cancelled = true;
      window.removeEventListener(CONVERSATION_READ_EVENT, onConversationRead);
    };
  }, [pathname]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function shortcutFor(role: "car_owner" | "shop_owner") {
    if (role === "shop_owner") {
      if (pathname === "/dashboard") return { href: "/dashboard/leads", label: "Leads" };
      return { href: "/dashboard", label: "Dashboard" };
    }
    if (pathname === "/messages") return { href: "/search", label: "Search" };
    return { href: "/messages", label: "Messages" };
  }

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-surface/95 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="font-display text-lg font-semibold tracking-wide text-foreground"
        >
          Car Mod <span className="text-accent">Marketplace</span>
        </Link>

        <div className="flex items-center gap-5 text-sm">
          {auth.status === "signed-in" &&
            (() => {
              const shortcut = shortcutFor(auth.role);
              const showDot =
                hasUnread && (shortcut.label === "Leads" || shortcut.label === "Messages");
              return (
                <Link
                  href={shortcut.href}
                  className="relative text-muted transition hover:text-foreground"
                >
                  {shortcut.label}
                  {showDot && (
                    <span
                      aria-label="Unread messages"
                      className="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-action"
                    />
                  )}
                </Link>
              );
            })()}
          {auth.status === "signed-in" ? (
            <button
              onClick={handleSignOut}
              className="text-muted transition hover:text-foreground"
            >
              Sign out
            </button>
          ) : auth.status === "signed-out" ? (
            <Link href="/login" className="text-muted transition hover:text-foreground">
              Log in
            </Link>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
