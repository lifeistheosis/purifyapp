"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authOrigin } from "@/lib/site";

/**
 * Forgot-password form. Sends a Supabase reset link that lands on
 * `/reset` with a recovery token; ResetForm handles the actual
 * password change.
 */
export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const origin = authOrigin();
      const { error: err } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${origin}/reset` },
      );
      if (err) throw err;
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the email.");
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-gold/35 bg-gold/[0.06] p-5">
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-gold mb-2">
          Reset link sent
        </p>
        <p className="font-serif text-body text-paper/90 leading-[1.65]">
          If <span className="font-semibold text-paper">{email.trim()}</span>{" "}
          is registered with us, you&rsquo;ll get a link to set a new
          password. The link is good for one hour.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="forgot-email"
          className="font-sans text-caption font-medium text-paper/75 block mb-1.5"
        >
          Email
        </label>
        <input
          id="forgot-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@somewhere.com"
          className="w-full bg-paper/[0.04] border border-paper/20 rounded-pill px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/40 focus:outline-none focus:border-paper/55 transition-colors"
        />
      </div>
      {error ? (
        <p className="font-sans text-detail text-crimson-soft">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-pill bg-paper text-night font-sans text-ui font-semibold py-3 hover:bg-paper/90 disabled:opacity-60 disabled:cursor-wait transition-colors"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <p className="text-center font-sans text-caption text-paper/55">
        <Link href="/signin" className="hover:text-paper">
          ← Back to sign in
        </Link>
      </p>
    </form>
  );
}
