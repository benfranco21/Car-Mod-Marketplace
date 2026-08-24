"use client";

import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

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

      const [{ data: shopServicesData }, { data: portfolioData }] =
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
        ]);

      if (cancelled) return;

      setShop(shopRow);
      setServices(servicesData ?? []);
      setSelectedServiceIds(
        new Set((shopServicesData ?? []).map((row) => row.service_id))
      );
      setPortfolioImages(portfolioData ?? []);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

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

  if (loading) return null;

  if (loadError || !shop) {
    return (
      <main className="mx-auto flex max-w-sm flex-col gap-4 px-6 py-24 text-center">
        <p className="text-sm text-red-600">{loadError}</p>
        <button onClick={handleSignOut} className="underline">
          Sign out
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Shop dashboard</h1>
        <button onClick={handleSignOut} className="text-sm underline">
          Sign out
        </button>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Profile</h2>

        {!editing ? (
          <div className="flex flex-col gap-4 rounded border border-zinc-300 p-5 dark:border-zinc-700">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Business name
              </p>
              <p className="text-lg">{shop.business_name}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Location
              </p>
              <p>{shop.location}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Description
              </p>
              <p className="whitespace-pre-wrap">
                {shop.description || (
                  <span className="text-zinc-400 dark:text-zinc-600">
                    No description yet.
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Services offered
              </p>
              {selectedServiceIds.size === 0 ? (
                <p className="text-zinc-400 dark:text-zinc-600">
                  No services selected yet.
                </p>
              ) : (
                <div className="mt-1 flex flex-wrap gap-2">
                  {services
                    .filter((service) => selectedServiceIds.has(service.id))
                    .map((service) => (
                      <span
                        key={service.id}
                        className="rounded-full border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
                      >
                        {service.name}
                      </span>
                    ))}
                </div>
              )}
            </div>
            <button
              onClick={startEditing}
              className="self-start rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
            >
              Edit profile
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSave}
            className="flex flex-col gap-4 rounded border border-zinc-300 p-5 dark:border-zinc-700"
          >
            <label className="flex flex-col gap-1 text-sm">
              Business name
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Location
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Description
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>

            <div className="flex flex-col gap-1 text-sm">
              Services offered
              <div className="flex flex-wrap gap-2">
                {services.map((service) => {
                  const checked = formServiceIds.has(service.id);
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
                        onChange={() => toggleFormService(service.id)}
                      />
                      {service.name}
                    </label>
                  );
                })}
              </div>
            </div>

            {saveError && <p className="text-sm text-red-600">{saveError}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="rounded border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Portfolio photos</h2>

        <label className="self-start rounded border border-zinc-300 px-4 py-2 text-sm cursor-pointer dark:border-zinc-700">
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

        {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}

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
                <div key={image.id} className="group relative aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={data.publicUrl}
                    alt=""
                    className="h-full w-full rounded object-cover"
                  />
                  <button
                    onClick={() => handleDeleteImage(image)}
                    disabled={deletingImageId === image.id}
                    className="absolute right-1 top-1 rounded bg-black/70 px-2 py-1 text-xs text-white disabled:opacity-50"
                  >
                    {deletingImageId === image.id ? "..." : "Remove"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
