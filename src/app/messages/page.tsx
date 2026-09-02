"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import Nav from "@/components/Nav";

type Conversation = {
  id: string;
  status: "new" | "replied";
  updated_at: string;
  shops: { business_name: string } | null;
};

export default function MessagesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("conversations")
        .select("id, status, updated_at, shops(business_name)")
        .eq("car_owner_id", user.id)
        .order("updated_at", { ascending: false })
        .returns<Conversation[]>();

      if (cancelled) return;

      setConversations(data ?? []);
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

  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Your messages
          </h1>
          <Link href="/search" className="text-sm text-accent hover:underline">
            Find a shop
          </Link>
        </div>

        {conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/15 bg-surface/50 px-6 py-16 text-center">
            <svg
              width="40"
              height="40"
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
            <p className="font-display text-lg text-foreground">
              No messages yet
            </p>
            <p className="text-sm text-muted">
              You haven&apos;t messaged any shops yet.
            </p>
            <Link
              href="/search"
              className="mt-2 rounded-lg border border-accent/40 px-4 py-2 text-sm text-accent transition hover:bg-accent/10"
            >
              Find a shop
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <Link
                  href={`/messages/${conversation.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-surface p-4 transition hover:border-accent/50"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-foreground">
                      {conversation.shops?.business_name ?? "Unknown shop"}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(conversation.updated_at).toLocaleString()}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                      conversation.status === "new"
                        ? "bg-accent/15 text-accent"
                        : "border border-white/10 text-muted"
                    }`}
                  >
                    {conversation.status === "new" ? "Awaiting reply" : "Replied"}
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
