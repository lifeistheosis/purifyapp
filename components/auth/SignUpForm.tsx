"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authOrigin } from "@/lib/site";
import { PasswordInput } from "./PasswordInput";
import { OAuthButtons } from "./OAuthButtons";

/**
 * Email + password sign-up. The Supabase trigger creates the profiles
 * row automatically; we additionally call `mark_password_set()` RPC
 * once the user lands signed in so the `has_password` flag is true.
 *
 * If "Confirm email" is enabled in Supabase Auth settings (recommended),
 * the user lands in the "check your inbox" state and the password is
 * already on `auth.users`, the flag is set by the SetPasswordForm /
 * first successful sign-in path.
 */
export function SignUpForm() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setPending(true);
    try {
      const supabase = createClient();
      const origin = authOrigin();
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim() || undefined,
          },
          emailRedirectTo: `${origin}/api/auth/callback?next=/account/profile`,
        },
      });
      if (err) throw err;
      // If confirm-email is off, Supabase returns a session; the
      // user is already signed in. Mark the flag and reload.
      if (data.session) {
        try {
          await supabase.rpc("mark_password_set");
        } catch {
          /* ignore, the middleware will trip the set-password gate if needed */
        }
        window.location.href = "/account/profile";
        return;
      }
      setSentTo(email.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create account.");
    } finally {
      setPending(false);
    }
  }

  if (sentTo) {
    return (
      <div className="rounded-lg border border-gold/35 bg-gold/[0.06] p-5">
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-gold mb-2">
          Check your inbox
        </p>
        <p className="font-serif text-body text-paper/90 leading-[1.65]">
          We sent a confirmation link to{" "}
          <span className="font-semibold text-paper">{sentTo}</span>. Open it
          on this device to finish creating your account.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="signup-name"
          className="font-sans text-caption font-medium text-paper/75 block mb-1.5"
        >
          Display name <span className="text-paper/45">(optional)</span>
        </label>
        <input
          id="signup-name"
          type="text"
          autoComplete="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Edgar"
          maxLength={64}
          className="w-full bg-paper/[0.04] border border-paper/20 rounded-pill px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/40 focus:outline-none focus:border-paper/55 transition-colors"
        />
      </div>
      <div>
        <label
          htmlFor="signup-email"
          className="font-sans text-caption font-medium text-paper/75 block mb-1.5"
        >
          Email
        </label>
        <input
          id="signup-email"
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
      <PasswordInput
        label="Password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        showStrength
      />
      <PasswordInput
        label="Confirm password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
      />
      {error ? (
        <p className="font-sans text-detail text-crimson-soft">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-pill bg-paper text-night font-sans text-ui font-semibold py-3 hover:bg-paper/90 disabled:opacity-60 disabled:cursor-wait transition-colors"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center font-sans text-caption text-paper/55">
        Already have one?{" "}
        <Link
          href="/signin"
          className="text-paper hover:underline underline-offset-2"
        >
          Sign in →
        </Link>
      </p>

      <div className="relative my-3">
        <span className="absolute inset-x-0 top-1/2 h-px bg-paper/12" />
        <span className="relative bg-night px-3 text-eyebrow uppercase tracking-[1.5px] text-paper/45 mx-auto inline-block left-1/2 -translate-x-1/2">
          or
        </span>
      </div>

      <OAuthButtons />
    </form>
  );
}
