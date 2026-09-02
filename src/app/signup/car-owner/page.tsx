"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import Nav from "@/components/Nav";

export default function CarOwnerSignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: "car_owner", name } },
    });

    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    setConfirmationSent(true);
  }

  if (confirmationSent) {
    return (
      <>
        <Nav />
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center gap-4 px-4 py-16 text-center sm:py-24">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-accent"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="m8 12.5 2.5 2.5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Check your email
          </h1>
          <p className="text-muted">
            We sent a confirmation link to{" "}
            <strong className="text-foreground">{email}</strong>. Click it,
            then{" "}
            <Link href="/login" className="text-accent hover:underline">
              log in
            </Link>{" "}
            to get started.
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-4 py-16 sm:py-24">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Sign up as a car owner
        </h1>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-xl border border-white/10 bg-surface p-6"
        >
          <label className="flex flex-col gap-1.5 text-sm text-muted">
            Name
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-white/10 bg-background px-3 py-2.5 text-foreground outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </label>

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
              minLength={6}
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
            {submitting ? "Signing up..." : "Sign up"}
          </button>
        </form>

        <p className="text-sm text-muted">
          Own a shop?{" "}
          <Link href="/signup/shop" className="text-accent hover:underline">
            Sign up here
          </Link>
          . Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Log in
          </Link>
          .
        </p>
      </main>
    </>
  );
}
