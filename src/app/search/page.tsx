"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function SearchPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push("/login");
        return;
      }
      setChecking(false);
    });
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (checking) return null;

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">Find a shop</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Placeholder — search and filtering are built in a later phase.
      </p>
      <button onClick={handleSignOut} className="underline">
        Sign out
      </button>
    </main>
  );
}
