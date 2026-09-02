"use client";

import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import Nav from "@/components/Nav";

type Shop = {
  id: string;
  business_name: string;
  location: string;
  description: string | null;
};

type Service = {
  id: number;
  name: string;
};

type PortfolioImage = {
  id: string;
  storage_path: string;
};

type Lead = {
  id: string;
  car_owner_name: string;
  status: "new" | "replied";
  updated_at: string;
};

const PORTFOLIO_BUCKET = "portfolio-images";

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [shop, setShop] = useState<Shop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<number>>(
    new Set()
  );
  const [portfolioImages, setPortfolioImages] = useState<PortfolioImage[]>(
    []
  );
  const [leads, setLeads] = useState<Lead[]>([]);

  const [editing, setEditing] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [formServiceIds, setFormServiceIds] = useState<Set<number>>(
    new Set()
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        router.push("/login");
        return;
      }

      const [{ data: shopRow, error: shopError }, { data: servicesData }] =
        await Promise.all([
          supabase
            .from("shops")
            .select("id, business_name, location, description")
            .eq("owner_id", user.id)
            .single(),
          supabase.from("services").select("id, name").order("id"),
        ]);

      if (cancelled) return;

      if (shopError || !shopRow) {
        setLoadError("Couldn't load your shop profile. Please refresh the page.");
        setLoading(false);
        return;
      }

      const [{ data: shopServicesData }, { data: portfolioData }, { data: leadsData }] =
        await Promise.all([
          supabase
            .from("shop_services")
            .select("service_id")
            .eq("shop_id", shopRow.id),
          supabase
            .from("portfolio_images")
            .select("id, storage_path")
            .eq("shop_id", shopRow.id)
            .order("created_at"),
          supabase
            .from("conversations")
            .select("id, car_owner_name, status, updated_at")
            .eq("shop_id", shopRow.id)
            .order("updated_at", { ascending: false }),
        ]);

      if (cancelled) return;

      setShop(shopRow);
      setServices(servicesData ?? []);
      setSelectedServiceIds(
        new Set((shopServicesData ?? []).map((row) => row.service_id))
      );
      setPortfolioImages(portfolioData ?? []);
      setLeads(leadsData ?? []);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function startEditing() {
    if (!shop) return;
    setBusinessName(shop.business_name);
    setLocation(shop.location);
    setDescription(shop.description ?? "");
    setFormServiceIds(new Set(selectedServiceIds));
    setSaveError(null);
    setEditing(true);
  }

  function toggleFormService(id: number) {
    setFormServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!shop) return;

    setSaveError(null);
    setSaving(true);

    const { error: updateError } = await supabase
      .from("shops")
      .update({
        business_name: businessName,
        location,
        description: description.trim() === "" ? null : description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", shop.id);

    if (updateError) {
      setSaveError(updateError.message);
      setSaving(false);
      return;
    }

    const { error: deleteServicesError } = await supabase
      .from("shop_services")
      .delete()
      .eq("shop_id", shop.id);

    if (deleteServicesError) {
      setSaveError(deleteServicesError.message);
      setSaving(false);
      return;
    }

    if (formServiceIds.size > 0) {
      const { error: insertServicesError } = await supabase
        .from("shop_services")
        .insert(
          Array.from(formServiceIds).map((service_id) => ({
            shop_id: shop.id,
            service_id,
          }))
        );

      if (insertServicesError) {
        setSaveError(insertServicesError.message);
        setSaving(false);
        return;
      }
    }

    setShop({
      ...shop,
      business_name: businessName,
      location,
      description: description.trim() === "" ? null : description,
    });
    setSelectedServiceIds(new Set(formServiceIds));
    setSaving(false);
    setEditing(false);
  }

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!shop || !files || files.length === 0) return;

    setUploadError(null);
    setUploading(true);

    for (const file of Array.from(files)) {
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
      const path = `${shop.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from(PORTFOLIO_BUCKET)
        .upload(path, file);

      if (uploadErr) {
        setUploadError(uploadErr.message);
        continue;
      }

      const { data: inserted, error: insertErr } = await supabase
        .from("portfolio_images")
        .insert({ shop_id: shop.id, storage_path: path })
        .select("id, storage_path")
        .single();

      if (insertErr || !inserted) {
        setUploadError(insertErr?.message ?? "Upload failed.");
        continue;
      }

      setPortfolioImages((prev) => [...prev, inserted]);
    }

    setUploading(false);
    e.target.value = "";
  }

  async function handleDeleteImage(image: PortfolioImage) {
    setDeletingImageId(image.id);

    await supabase.storage.from(PORTFOLIO_BUCKET).remove([image.storage_path]);
    const { error } = await supabase
      .from("portfolio_images")
      .delete()
      .eq("id", image.id);

    if (!error) {
      setPortfolioImages((prev) => prev.filter((img) => img.id !== image.id));
    }

    setDeletingImageId(null);
  }

  if (loading) {
    return (
      <>
        <Nav />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
          <div className="h-8 w-48 animate-pulse rounded bg-surface" />
          <div className="h-56 animate-pulse rounded-xl border border-white/10 bg-surface" />
        </main>
      </>
    );
  }

  if (loadError || !shop) {
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
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Shop dashboard
        </h1>

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-medium text-foreground">
            Profile
          </h2>

          {!editing ? (
            <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-surface p-5">
              <div>
                <p className="text-sm text-muted">Business name</p>
                <p className="text-lg text-foreground">{shop.business_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted">Location</p>
                <p className="text-foreground">{shop.location}</p>
              </div>
              <div>
                <p className="text-sm text-muted">Description</p>
                <p className="whitespace-pre-wrap text-foreground/90">
                  {shop.description || (
                    <span className="text-muted">No description yet.</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted">Services offered</p>
                {selectedServiceIds.size === 0 ? (
                  <p className="text-muted">No services selected yet.</p>
                ) : (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {services
                      .filter((service) => selectedServiceIds.has(service.id))
                      .map((service) => (
                        <span
                          key={service.id}
                          className="rounded-full border border-white/10 bg-background px-3 py-1 text-sm text-muted"
                        >
                          {service.name}
                        </span>
                      ))}
                  </div>
                )}
              </div>
              <button
                onClick={startEditing}
                className="self-start rounded-lg border border-accent/40 px-4 py-2 text-sm text-accent transition hover:bg-accent/10"
              >
                Edit profile
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSave}
              className="flex flex-col gap-4 rounded-xl border border-white/10 bg-surface p-5"
            >
              <label className="flex flex-col gap-1.5 text-sm text-muted">
                Business name
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="rounded-lg border border-white/10 bg-background px-3 py-2.5 text-foreground outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm text-muted">
                Location
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="rounded-lg border border-white/10 bg-background px-3 py-2.5 text-foreground outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm text-muted">
                Description
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="rounded-lg border border-white/10 bg-background px-3 py-2.5 text-foreground outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </label>

              <div className="flex flex-col gap-2 text-sm text-muted">
                Services offered
                <div className="flex flex-wrap gap-2">
                  {services.map((service) => {
                    const checked = formServiceIds.has(service.id);
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
                          onChange={() => toggleFormService(service.id)}
                        />
                        {service.name}
                      </label>
                    );
                  })}
                </div>
              </div>

              {saveError && <p className="text-sm text-action">{saveError}</p>}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-action px-5 py-2.5 text-sm font-medium text-white transition hover:bg-action/90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  className="rounded-lg border border-white/15 px-5 py-2.5 text-sm text-muted transition hover:border-white/30 hover:text-foreground disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-medium text-foreground">
            Portfolio photos
          </h2>

          <label className="self-start cursor-pointer rounded-lg border border-accent/40 px-4 py-2 text-sm text-accent transition hover:bg-accent/10">
            {uploading ? "Uploading..." : "Upload photos"}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>

          {uploadError && <p className="text-sm text-action">{uploadError}</p>}

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
                    className="group relative aspect-square overflow-hidden rounded-lg border border-white/10"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={data.publicUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <button
                      onClick={() => handleDeleteImage(image)}
                      disabled={deletingImageId === image.id}
                      className="absolute right-1.5 top-1.5 rounded-md bg-background/80 px-2 py-1 text-xs text-foreground backdrop-blur transition hover:bg-background disabled:opacity-50"
                    >
                      {deletingImageId === image.id ? "..." : "Remove"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-medium text-foreground">
            Leads
          </h2>

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
                      <span className="font-medium text-foreground">
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
        </section>
      </main>
    </>
  );
}
