"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import Nav from "@/components/Nav";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setSubmitting(false);
      setError(error.message);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .single();

    setSubmitting(false);

    if (profileError || !profile) {
      setError("Logged in, but couldn't load your profile. Please try again.");
      return;
    }

    router.push(profile.role === "shop_owner" ? "/dashboard" : "/search");
  }

  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-4 py-16 sm:py-24">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Log in
        </h1>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-xl border border-white/10 bg-surface p-6"
        >
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-white/10 bg-background px-3 py-2.5 text-foreground outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm text-muted">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-white/10 bg-background px-3 py-2.5 text-foreground outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </label>

          {error && <p className="text-sm text-action">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-action px-5 py-2.5 text-sm font-medium text-white transition hover:bg-action/90 disabled:opacity-50"
          >
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="text-sm text-muted">
          No account yet?{" "}
          <Link href="/signup/car-owner" className="text-accent hover:underline">
            Sign up as a car owner
          </Link>{" "}
          or{" "}
          <Link href="/signup/shop" className="text-accent hover:underline">
            sign up your shop
          </Link>
          .
        </p>
      </main>
    </>
  );
}
