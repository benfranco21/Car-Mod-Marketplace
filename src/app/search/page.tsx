"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import Nav from "@/components/Nav";

type Service = {
  id: number;
  name: string;
};

type Shop = {
  id: string;
  business_name: string;
  location: string;
  description: string | null;
  shop_services: { service_id: number }[];
};

export default function SearchPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<number>>(
    new Set()
  );
  const [locationQuery, setLocationQuery] = useState("");

  useEffect(() => {
    async function load() {
      const [{ data: shopsData, error: shopsError }, { data: servicesData }] =
        await Promise.all([
          supabase
            .from("shops")
            .select("id, business_name, location, description, shop_services(service_id)")
            .order("business_name"),
          supabase.from("services").select("id, name").order("id"),
        ]);

      if (shopsError) {
        setLoadError("Couldn't load shops. Please refresh the page.");
        setLoading(false);
        return;
      }

      setShops(shopsData ?? []);
      setServices(servicesData ?? []);
      setLoading(false);
    }

    load();
  }, []);

  function toggleService(id: number) {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const filteredShops = useMemo(() => {
    const location = locationQuery.trim().toLowerCase();

    return shops.filter((shop) => {
      const matchesServices =
        selectedServiceIds.size === 0 ||
        shop.shop_services.some((row) => selectedServiceIds.has(row.service_id));

      const matchesLocation =
        location === "" || shop.location.toLowerCase().includes(location);

      return matchesServices && matchesLocation;
    });
  }, [shops, selectedServiceIds, locationQuery]);

  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Find a shop
          </h1>
          <p className="text-sm text-muted">
            Search car modification shops by service and location.
          </p>
        </div>

        <div className="flex flex-col gap-5 rounded-xl border border-white/10 bg-surface p-5">
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            Location
            <input
              type="text"
              placeholder="e.g. Cape Town"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              className="rounded-lg border border-white/10 bg-background px-3 py-2.5 text-foreground outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </label>

          <div className="flex flex-col gap-2 text-sm text-muted">
            Services
            <div className="flex flex-wrap gap-2">
              {services.map((service) => {
                const checked = selectedServiceIds.has(service.id);
                return (
                  <label
                    key={service.id}
                    className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition ${
                      checked
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-white/15 text-muted hover:border-white/30 hover:text-foreground"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleService(service.id)}
                    />
                    {service.name}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl border border-white/10 bg-surface"
              />
            ))}
          </div>
        ) : loadError ? (
          <p className="text-sm text-action">{loadError}</p>
        ) : filteredShops.length === 0 ? (
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
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" strokeLinecap="round" />
            </svg>
            <p className="font-display text-lg text-foreground">
              No shops match your filters
            </p>
            <p className="text-sm text-muted">
              Try a different location or clearing a few filters.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {filteredShops.map((shop) => (
              <li key={shop.id}>
                <Link
                  href={`/shops/${shop.id}`}
                  className="block rounded-xl border border-white/10 bg-surface p-5 transition hover:border-accent/50"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-4">
                      <h2 className="font-display text-xl font-medium text-foreground">
                        {shop.business_name}
                      </h2>
                      <span className="shrink-0 text-sm text-muted">
                        {shop.location}
                      </span>
                    </div>
                    {shop.description && (
                      <p className="line-clamp-2 text-sm text-muted">
                        {shop.description}
                      </p>
                    )}
                    {shop.shop_services.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {shop.shop_services.map((row) => {
                          const service = services.find((s) => s.id === row.service_id);
                          if (!service) return null;
                          return (
                            <span
                              key={service.id}
                              className="rounded-full border border-white/10 bg-background px-3 py-1 text-xs text-muted"
                            >
                              {service.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
