"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

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
      <main className="mx-auto flex max-w-sm flex-col gap-4 px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          We sent a confirmation link to <strong>{email}</strong>. Click it,
          then{" "}
          <Link href="/login" className="underline">
            log in
          </Link>{" "}
          to get started.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-6 py-24">
      <h1 className="text-2xl font-semibold">Sign up as a car owner</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {submitting ? "Signing up..." : "Sign up"}
        </button>
      </form>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Own a shop?{" "}
        <Link href="/signup/shop" className="underline">
          Sign up here
        </Link>
        . Already have an account?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
        .
      </p>
    </main>
  );
}
