"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type Viewer = {
  id: string;
  role: "car_owner" | "shop_owner";
};

type Conversation = {
  id: string;
  shop_id: string;
  car_owner_id: string;
  car_owner_name: string;
};

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export default function ConversationPage() {
  const params = useParams<{ conversationId: string }>();
  const router = useRouter();
  const conversationId = params.conversationId;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [otherPartyName, setOtherPartyName] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const authUser = sessionData.session?.user;

      if (!authUser) {
        router.push("/login");
        return;
      }

      const { data: userRow } = await supabase
        .from("users")
        .select("id, role")
        .eq("id", authUser.id)
        .single();

      if (cancelled) return;

      if (!userRow) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setViewer(userRow);

      const { data: conversationRow } = await supabase
        .from("conversations")
        .select("id, shop_id, car_owner_id, car_owner_name")
        .eq("id", conversationId)
        .maybeSingle();

      if (cancelled) return;

      if (!conversationRow) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setConversation(conversationRow);

      const [{ data: messagesData }, otherPartyResult] = await Promise.all([
        supabase
          .from("messages")
          .select("id, sender_id, body, created_at")
          .eq("conversation_id", conversationRow.id)
          .order("created_at"),
        userRow.role === "shop_owner"
          ? Promise.resolve(conversationRow.car_owner_name)
          : supabase
              .from("shops")
              .select("business_name")
              .eq("id", conversationRow.shop_id)
              .single()
              .then(({ data }) => data?.business_name ?? "This shop"),
      ]);

      if (cancelled) return;

      setMessages(messagesData ?? []);
      setOtherPartyName(otherPartyResult);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [conversationId, router]);

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!viewer || !conversation || replyBody.trim() === "") return;

    setSendError(null);
    setSending(true);

    const { data: inserted, error: insertError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        sender_id: viewer.id,
        body: replyBody.trim(),
      })
      .select("id, sender_id, body, created_at")
      .single();

    if (insertError || !inserted) {
      setSendError(insertError?.message ?? "Couldn't send message.");
      setSending(false);
      return;
    }

    await supabase
      .from("conversations")
      .update({
        updated_at: new Date().toISOString(),
        ...(viewer.role === "shop_owner" ? { status: "replied" } : {}),
      })
      .eq("id", conversation.id);

    setMessages((prev) => [...prev, inserted]);
    setReplyBody("");
    setSending(false);
  }

  if (loading) return null;

  if (notFound || !conversation || !viewer) {
    return (
      <main className="mx-auto flex max-w-sm flex-col gap-4 px-6 py-24 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">
          We couldn&apos;t find that conversation.
        </p>
        <Link href="/search" className="underline">
          Back to search
        </Link>
      </main>
    );
  }

  const backHref = viewer.role === "shop_owner" ? "/dashboard" : "/messages";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-1">
        <Link href={backHref} className="text-sm underline">
          Back
        </Link>
        <h1 className="text-2xl font-semibold">{otherPartyName}</h1>
      </div>

      <div className="flex flex-col gap-4">
        {messages.length === 0 ? (
          <p className="text-zinc-400 dark:text-zinc-600">No messages yet.</p>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.sender_id === viewer.id;
            return (
              <div
                key={message.id}
                className={`flex flex-col gap-1 rounded border p-3 ${
                  isOwnMessage
                    ? "self-end border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                    : "self-start border-zinc-300 dark:border-zinc-700"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{message.body}</p>
                <p
                  className={`text-xs ${
                    isOwnMessage
                      ? "text-zinc-300 dark:text-zinc-600"
                      : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {isOwnMessage ? "You" : otherPartyName} ·{" "}
                  {new Date(message.created_at).toLocaleString()}
                </p>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleReply} className="flex flex-col gap-3">
        <textarea
          required
          rows={3}
          placeholder="Write a reply..."
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />

        {sendError && <p className="text-sm text-red-600">{sendError}</p>}

        <button
          type="submit"
          disabled={sending || replyBody.trim() === ""}
          className="self-start rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
    </main>
  );
}
