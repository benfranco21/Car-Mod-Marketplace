"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

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

  if (loading) return null;

  if (notFound || !shop) {
    return (
      <main className="mx-auto flex max-w-sm flex-col gap-4 px-6 py-24 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">
          We couldn&apos;t find that shop.
        </p>
        <Link href="/search" className="underline">
          Back to search
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-16">
      <Link href="/search" className="text-sm underline">
        Back to search
      </Link>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{shop.business_name}</h1>
          <p className="text-zinc-500 dark:text-zinc-400">{shop.location}</p>
        </div>

        {shop.description && (
          <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
            {shop.description}
          </p>
        )}

        {serviceNames.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {serviceNames.map((name) => (
              <span
                key={name}
                className="rounded-full border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
              >
                {name}
              </span>
            ))}
          </div>
        )}

        {!viewer ? (
          <div className="rounded border border-zinc-300 p-4 text-sm dark:border-zinc-700">
            <Link href="/login" className="underline">
              Log in
            </Link>{" "}
            or{" "}
            <Link href="/signup/car-owner" className="underline">
              sign up
            </Link>{" "}
            to request a quote from this shop.
          </div>
        ) : viewer.role === "car_owner" ? (
          existingConversationId ? (
            <Link
              href={`/messages/${existingConversationId}`}
              className="self-start rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
            >
              View conversation
            </Link>
          ) : (
            <form
              onSubmit={handleSendMessage}
              className="flex flex-col gap-3 rounded border border-zinc-300 p-4 dark:border-zinc-700"
            >
              <label className="flex flex-col gap-1 text-sm">
                Request a quote
                <textarea
                  required
                  rows={3}
                  placeholder="Tell the shop what you need..."
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>

              {sendError && <p className="text-sm text-red-600">{sendError}</p>}

              <button
                type="submit"
                disabled={sending || messageBody.trim() === ""}
                className="self-start rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
              >
                {sending ? "Sending..." : "Send message"}
              </button>
            </form>
          )
        ) : null}
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Portfolio</h2>

        {portfolioImages.length === 0 ? (
          <p className="text-zinc-400 dark:text-zinc-600">
            No photos uploaded yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {portfolioImages.map((image) => {
              const { data } = supabase.storage
                .from(PORTFOLIO_BUCKET)
                .getPublicUrl(image.storage_path);
              return (
                <div key={image.id} className="aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={data.publicUrl}
                    alt=""
                    className="h-full w-full rounded object-cover"
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
