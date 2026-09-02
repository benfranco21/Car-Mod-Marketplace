"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import Nav from "@/components/Nav";

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

  if (loading) {
    return (
      <>
        <Nav />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
          <div className="h-8 w-40 animate-pulse rounded bg-surface" />
          <div className="h-56 animate-pulse rounded-xl border border-white/10 bg-surface" />
        </main>
      </>
    );
  }

  if (notFound || !conversation || !viewer) {
    return (
      <>
        <Nav />
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center gap-4 px-4 py-24 text-center">
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
              d="M9 3H5a2 2 0 0 0-2 2v4m0 6v4a2 2 0 0 0 2 2h4m6 0h4a2 2 0 0 0 2-2v-4m0-6V5a2 2 0 0 0-2-2h-4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M9 9l6 6m0-6-6 6" strokeLinecap="round" />
          </svg>
          <p className="text-foreground">We couldn&apos;t find that conversation.</p>
          <Link href="/search" className="text-accent hover:underline">
            Back to search
          </Link>
        </main>
      </>
    );
  }

  const backHref = viewer.role === "shop_owner" ? "/dashboard" : "/messages";

  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-1">
          <Link href={backHref} className="text-sm text-accent hover:underline">
            Back
          </Link>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {otherPartyName}
          </h1>
        </div>

        <div className="flex flex-col gap-3">
          {messages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-surface/50 px-6 py-10 text-center">
              <p className="text-sm text-muted">
                No messages yet — say hello to start the conversation.
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.sender_id === viewer.id;
              return (
                <div
                  key={message.id}
                  className={`flex max-w-[85%] flex-col gap-1 rounded-xl border p-3 ${
                    isOwnMessage
                      ? "self-end border-accent/30 bg-accent/10"
                      : "self-start border-white/10 bg-surface"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm text-foreground">
                    {message.body}
                  </p>
                  <p className="text-xs text-muted">
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
            className="rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-foreground outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent"
          />

          {sendError && <p className="text-sm text-action">{sendError}</p>}

          <button
            type="submit"
            disabled={sending || replyBody.trim() === ""}
            className="self-start rounded-lg bg-action px-5 py-2.5 text-sm font-medium text-white transition hover:bg-action/90 disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </form>
      </main>
    </>
  );
}
