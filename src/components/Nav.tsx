"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type AuthState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; role: "car_owner" | "shop_owner" };

export default function Nav() {
  const router = useRouter();
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

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
      setAuth(userRow ? { status: "signed-in", role: userRow.role } : { status: "signed-out" });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
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
          {auth.status === "signed-in" && (
            <Link
              href={auth.role === "shop_owner" ? "/dashboard" : "/messages"}
              className="text-muted transition hover:text-foreground"
            >
              {auth.role === "shop_owner" ? "Dashboard" : "Messages"}
            </Link>
          )}
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
