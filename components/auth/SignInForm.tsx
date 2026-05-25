"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "./PasswordInput";
import { OAuthButtons } from "./OAuthButtons";

/**
 * Email + password sign-in. On success, server middleware checks the
 * `has_password` flag and routes accordingly (set-password
 * interstitial if missing, /account/profile if set).
 */
export function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) throw err;
      router.push(next && next.startsWith("/") ? next : "/account/profile");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? friendly(e.message)
          : "Couldn't sign you in. Try again.",
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="signin-email"
          className="font-sans text-[12px] font-medium text-paper/75 block mb-1.5"
        >
          Email
        </label>
        <input
          id="signin-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@somewhere.com"
          className="w-full bg-paper/[0.04] border border-paper/20 rounded-pill px-4 py-3 font-sans text-[15px] text-paper placeholder:text-paper/40 focus:outline-none focus:border-paper/55 transition-colors"
        />
      </div>
      <PasswordInput
        label="Password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />
      {error ? (
        <p className="font-sans text-[13px] text-[#f8cac7]">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-pill bg-paper text-night font-sans text-[14px] font-semibold py-3 hover:bg-paper/90 disabled:opacity-60 disabled:cursor-wait transition-colors"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <div className="flex items-center justify-between text-[12.5px] font-sans">
        <Link
          href="/forgot"
          className="text-paper/65 hover:text-paper underline underline-offset-2 decoration-paper/25"
        >
          Forgot password?
        </Link>
        <Link
          href="/signup"
          className="text-paper/65 hover:text-paper"
        >
          New here? <span className="text-paper">Create an account →</span>
        </Link>
      </div>

      <div className="relative my-3">
        <span className="absolute inset-x-0 top-1/2 h-px bg-paper/12" />
        <span className="relative bg-night px-3 text-[11px] uppercase tracking-[1.5px] text-paper/45 mx-auto inline-block left-1/2 -translate-x-1/2">
          or
        </span>
      </div>

      <OAuthButtons intent="signin" />
    </form>
  );
}

function friendly(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return "Email or password didn't match. Try again.";
  if (/email not confirmed/i.test(msg)) return "Please confirm your email first — check your inbox.";
  return msg;
}
