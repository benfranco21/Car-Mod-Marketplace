"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

const PORTFOLIO_BUCKET = "portfolio-images";

export default function ShopProfilePage() {
  const params = useParams<{ shopId: string }>();
  const shopId = params.shopId;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [shop, setShop] = useState<Shop | null>(null);
  const [serviceNames, setServiceNames] = useState<string[]>([]);
  const [portfolioImages, setPortfolioImages] = useState<PortfolioImage[]>([]);

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

      const [{ data: shopServicesData }, { data: portfolioData }] =
        await Promise.all([
          supabase
            .from("shop_services")
            .select("services(name)")
            .eq("shop_id", shopRow.id),
          supabase
            .from("portfolio_images")
            .select("id, storage_path")
            .eq("shop_id", shopRow.id)
            .order("created_at"),
        ]);

      if (cancelled) return;

      setShop(shopRow);
      setServiceNames(
        (shopServicesData ?? [])
          .map((row) => row.services?.name)
          .filter((name): name is string => !!name)
      );
      setPortfolioImages(portfolioData ?? []);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [shopId]);

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

        <button
          type="button"
          disabled
          title="Coming soon"
          className="self-start rounded bg-black px-4 py-2 text-sm text-white opacity-50 dark:bg-white dark:text-black"
        >
          Request a quote
        </button>
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
