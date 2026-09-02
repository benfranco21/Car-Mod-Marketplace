"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

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

  if (loading) return null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your messages</h1>
        <Link href="/search" className="text-sm underline">
          Find a shop
        </Link>
      </div>

      {conversations.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400">
          You haven&apos;t messaged any shops yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <Link
                href={`/messages/${conversation.id}`}
                className="flex items-center justify-between gap-4 rounded border border-zinc-300 p-4 transition hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium">
                    {conversation.shops?.business_name ?? "Unknown shop"}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(conversation.updated_at).toLocaleString()}
                  </span>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                    conversation.status === "new"
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "border border-zinc-300 dark:border-zinc-700"
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
  );
}
