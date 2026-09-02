"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import Nav from "@/components/Nav";

type Shop = {
  id: string;
  business_name: string;
  location: string;
  description: string | null;
};

type PortfolioImage = {
  id: string;
  storage_path: string;
};

type Viewer = {
  id: string;
  name: string;
  role: "car_owner" | "shop_owner";
};

const PORTFOLIO_BUCKET = "portfolio-images";

export default function ShopProfilePage() {
  const params = useParams<{ shopId: string }>();
  const router = useRouter();
  const shopId = params.shopId;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [shop, setShop] = useState<Shop | null>(null);
  const [serviceNames, setServiceNames] = useState<string[]>([]);
  const [portfolioImages, setPortfolioImages] = useState<PortfolioImage[]>([]);

  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [existingConversationId, setExistingConversationId] = useState<
    string | null
  >(null);
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: shopRow, error: shopError } = await supabase
        .from("shops")
        .select("id, business_name, location, description")
        .eq("id", shopId)
        .maybeSingle();

      if (cancelled) return;

      if (shopError || !shopRow) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const [
        { data: shopServicesData },
        { data: portfolioData },
        { data: sessionData },
      ] = await Promise.all([
        supabase
          .from("shop_services")
          .select("services(name)")
          .eq("shop_id", shopRow.id)
          .returns<{ services: { name: string } | null }[]>(),
        supabase
          .from("portfolio_images")
          .select("id, storage_path")
          .eq("shop_id", shopRow.id)
          .order("created_at"),
        supabase.auth.getSession(),
      ]);

      if (cancelled) return;

      setShop(shopRow);
      setServiceNames(
        (shopServicesData ?? [])
          .map((row) => row.services?.name)
          .filter((name): name is string => !!name)
      );
      setPortfolioImages(portfolioData ?? []);

      const authUser = sessionData.session?.user;
      if (authUser) {
        const { data: userRow } = await supabase
          .from("users")
          .select("id, name, role")
          .eq("id", authUser.id)
          .single();

        if (cancelled) return;

        if (userRow) {
          setViewer(userRow);

          if (userRow.role === "car_owner") {
            const { data: conversationRow } = await supabase
              .from("conversations")
              .select("id")
              .eq("shop_id", shopRow.id)
              .eq("car_owner_id", userRow.id)
              .maybeSingle();

            if (cancelled) return;
            setExistingConversationId(conversationRow?.id ?? null);
          }
        }
      }

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [shopId]);

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    if (!shop || !viewer || messageBody.trim() === "") return;

    setSendError(null);
    setSending(true);

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .insert({
        shop_id: shop.id,
        car_owner_id: viewer.id,
        car_owner_name: viewer.name,
      })
      .select("id")
      .single();

    if (conversationError || !conversation) {
      setSendError(conversationError?.message ?? "Couldn't start the conversation.");
      setSending(false);
      return;
    }

    const { error: messageError } = await supabase.from("messages").insert({
      conversation_id: conversation.id,
      sender_id: viewer.id,
      body: messageBody.trim(),
    });

    if (messageError) {
      setSendError(messageError.message);
      setSending(false);
      return;
    }

    router.push(`/messages/${conversation.id}`);
  }

  if (loading) {
    return (
      <>
        <Nav />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
          <div className="h-8 w-40 animate-pulse rounded bg-surface" />
          <div className="h-40 animate-pulse rounded-xl border border-white/10 bg-surface" />
        </main>
      </>
    );
  }

  if (notFound || !shop) {
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
          <p className="text-foreground">We couldn&apos;t find that shop.</p>
          <Link href="/search" className="text-accent hover:underline">
            Back to search
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/search" className="text-sm text-accent hover:underline">
          Back to search
        </Link>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {shop.business_name}
            </h1>
            <p className="text-muted">{shop.location}</p>
          </div>

          {shop.description && (
            <p className="whitespace-pre-wrap text-foreground/90">
              {shop.description}
            </p>
          )}

          {serviceNames.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {serviceNames.map((name) => (
                <span
                  key={name}
                  className="rounded-full border border-white/10 bg-background px-3 py-1 text-sm text-muted"
                >
                  {name}
                </span>
              ))}
            </div>
          )}

          {!viewer ? (
            <div className="rounded-xl border border-white/10 bg-surface p-4 text-sm text-muted">
              <Link href="/login" className="text-accent hover:underline">
                Log in
              </Link>{" "}
              or{" "}
              <Link href="/signup/car-owner" className="text-accent hover:underline">
                sign up
              </Link>{" "}
              to request a quote from this shop.
            </div>
          ) : viewer.role === "car_owner" ? (
            existingConversationId ? (
              <Link
                href={`/messages/${existingConversationId}`}
                className="self-start rounded-lg bg-action px-5 py-2.5 text-sm font-medium text-white transition hover:bg-action/90"
              >
                View conversation
              </Link>
            ) : (
              <form
                onSubmit={handleSendMessage}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-surface p-5"
              >
                <label className="flex flex-col gap-1.5 text-sm text-muted">
                  Request a quote
                  <textarea
                    required
                    rows={3}
                    placeholder="Tell the shop what you need..."
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    className="rounded-lg border border-white/10 bg-background px-3 py-2.5 text-foreground outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </label>

                {sendError && <p className="text-sm text-action">{sendError}</p>}

                <button
                  type="submit"
                  disabled={sending || messageBody.trim() === ""}
                  className="self-start rounded-lg bg-action px-5 py-2.5 text-sm font-medium text-white transition hover:bg-action/90 disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send message"}
                </button>
              </form>
            )
          ) : null}
        </div>

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-medium text-foreground">
            Portfolio
          </h2>

          {portfolioImages.length === 0 ? (
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
                <rect x="3" y="4" width="18" height="14" rx="2" />
                <path d="m3 15 5-5 4 4 4-4 5 5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="8" cy="9" r="1.5" />
              </svg>
              <p className="text-sm text-muted">No photos uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {portfolioImages.map((image) => {
                const { data } = supabase.storage
                  .from(PORTFOLIO_BUCKET)
                  .getPublicUrl(image.storage_path);
                return (
                  <div
                    key={image.id}
                    className="aspect-square overflow-hidden rounded-lg border border-white/10"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={data.publicUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
