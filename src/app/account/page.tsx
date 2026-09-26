"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Nav from "@/components/Nav";
import DeleteAccountSection from "@/components/DeleteAccountSection";

type Profile = {
  name: string;
  email: string;
};

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: userRow } = await supabase
        .from("users")
        .select("name, email, role")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      if (!userRow) {
        router.push("/login");
        return;
      }

      // Shop owners manage their account from the dashboard, which already
      // covers their profile — this page is the car-owner equivalent.
      if (userRow.role === "shop_owner") {
        router.push("/dashboard");
        return;
      }

      setProfile({ name: userRow.name, email: userRow.email });
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading || !profile) {
    return (
      <>
        <Nav />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
          <div className="h-8 w-48 animate-pulse rounded bg-surface" />
          <div className="h-32 animate-pulse rounded-xl border border-white/10 bg-surface" />
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Account
        </h1>

        <section className="flex flex-col gap-4 rounded-xl border border-white/10 bg-surface p-5">
          <div>
            <p className="text-sm text-muted">Name</p>
            <p className="text-lg text-foreground">{profile.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted">Email</p>
            <p className="text-foreground">{profile.email}</p>
          </div>
        </section>

        <DeleteAccountSection />
      </main>
    </>
  );
}
