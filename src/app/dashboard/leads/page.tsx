"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import Nav from "@/components/Nav";
import { getUnreadConversationIds } from "@/lib/unread";

type Lead = {
  id: string;
  car_owner_name: string;
  status: "new" | "replied";
  updated_at: string;
};

export default function LeadsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: shopRow, error: shopError } = await supabase
        .from("shops")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (cancelled) return;

      if (shopError || !shopRow) {
        setLoadError("Couldn't load your shop. Please refresh the page.");
        setLoading(false);
        return;
      }

      const [{ data: leadsData }, unread] = await Promise.all([
        supabase
          .from("conversations")
          .select("id, car_owner_name, status, updated_at")
          .eq("shop_id", shopRow.id)
          .order("updated_at", { ascending: false }),
        getUnreadConversationIds(user.id, "shop_owner"),
      ]);

      if (cancelled) return;

      setLeads(leadsData ?? []);
      setUnreadIds(unread);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <>
        <Nav />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
          <div className="h-8 w-48 animate-pulse rounded bg-surface" />
          <div className="h-40 animate-pulse rounded-xl border border-white/10 bg-surface" />
        </main>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <Nav />
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-4 px-4 py-24 text-center">
          <p className="text-sm text-action">{loadError}</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Leads
        </h1>

        {leads.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/15 bg-surface/50 px-6 py-12 text-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-muted"
            >
              <path
                d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-sm text-muted">No quote requests yet.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {leads.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/messages/${lead.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-surface p-4 transition hover:border-accent/50"
                >
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      {unreadIds.has(lead.id) && (
                        <span
                          aria-label="Unread"
                          className="h-2 w-2 shrink-0 rounded-full bg-action"
                        />
                      )}
                      {lead.car_owner_name}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(lead.updated_at).toLocaleString()}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                      lead.status === "new"
                        ? "bg-accent/15 text-accent"
                        : "border border-white/10 text-muted"
                    }`}
                  >
                    {lead.status === "new" ? "New" : "Replied"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
