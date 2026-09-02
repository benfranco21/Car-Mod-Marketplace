"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

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
  const router = useRouter();

  const [loggedIn, setLoggedIn] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<number>>(
    new Set()
  );
  const [locationQuery, setLocationQuery] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session);
    });
  }, []);

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

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/search");
  }

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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Find a shop</h1>
        {loggedIn ? (
          <button onClick={handleSignOut} className="text-sm underline">
            Sign out
          </button>
        ) : (
          <Link href="/login" className="text-sm underline">
            Log in
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Location
          <input
            type="text"
            placeholder="e.g. Cape Town"
            value={locationQuery}
            onChange={(e) => setLocationQuery(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <div className="flex flex-col gap-1 text-sm">
          Services
          <div className="flex flex-wrap gap-2">
            {services.map((service) => {
              const checked = selectedServiceIds.has(service.id);
              return (
                <label
                  key={service.id}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${
                    checked
                      ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                      : "border-zinc-300 dark:border-zinc-700"
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
        <p className="text-zinc-500 dark:text-zinc-400">Loading shops...</p>
      ) : loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : filteredShops.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400">
          No shops match your filters yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filteredShops.map((shop) => (
            <li key={shop.id}>
              <Link
                href={`/shops/${shop.id}`}
                className="block rounded border border-zinc-300 p-5 transition hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-4">
                    <h2 className="text-lg font-medium">{shop.business_name}</h2>
                    <span className="shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
                      {shop.location}
                    </span>
                  </div>
                  {shop.description && (
                    <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {shop.description}
                    </p>
                  )}
                  {shop.shop_services.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {shop.shop_services.map((row) => {
                        const service = services.find((s) => s.id === row.service_id);
                        if (!service) return null;
                        return (
                          <span
                            key={service.id}
                            className="rounded-full border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-700"
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
  );
}
