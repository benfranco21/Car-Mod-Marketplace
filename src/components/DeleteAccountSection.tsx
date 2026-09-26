"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const CONFIRM_TEXT = "DELETE";

export default function DeleteAccountSection() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setDeleting(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setError("Your session has expired. Please log in again and retry.");
      setDeleting(false);
      return;
    }

    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't delete your account. Please try again.");
      setDeleting(false);
      return;
    }

    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-action/30 bg-action/5 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-lg font-medium text-foreground">
          Delete account
        </h2>
        <p className="text-sm text-muted">
          Permanently deletes your account, profile, and message history.
          This can&apos;t be undone.
        </p>
      </div>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="self-start rounded-lg border border-action/50 px-4 py-2 text-sm text-action transition hover:bg-action/10"
        >
          Delete my account
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            Type {CONFIRM_TEXT} to confirm
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              className="max-w-xs rounded-lg border border-white/10 bg-background px-3 py-2.5 text-foreground outline-none transition focus:border-action focus:ring-1 focus:ring-action"
            />
          </label>

          {error && <p className="text-sm text-action">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={confirmInput !== CONFIRM_TEXT || deleting}
              className="rounded-lg bg-action px-5 py-2.5 text-sm font-medium text-white transition hover:bg-action/90 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Permanently delete"}
            </button>
            <button
              onClick={() => {
                setConfirming(false);
                setConfirmInput("");
                setError(null);
              }}
              disabled={deleting}
              className="rounded-lg border border-white/15 px-5 py-2.5 text-sm text-muted transition hover:border-white/30 hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
