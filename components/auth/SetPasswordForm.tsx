"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "./PasswordInput";

/**
 * Forced interstitial for existing magic-link users (or any signed-in
 * user without `profiles.has_password = true`). The middleware
 * redirects them here from anywhere auth-gated until they set one.
 *
 * No "skip" button, the whole point is to migrate the account to
 * the new model. Sign-out is the only escape (and they'll be back
 * in the same place next time they sign in).
 */
export function SetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      const { error: rpcErr } = await supabase.rpc("mark_password_set");
      if (rpcErr) throw rpcErr;
      router.push("/account/profile");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't set password.");
      setPending(false);
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/signin");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <PasswordInput
        label="Choose a password"
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
        <p className="font-sans text-[13px] text-[#f8cac7]">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-pill bg-paper text-night font-sans text-[14px] font-semibold py-3 hover:bg-paper/90 disabled:opacity-60 disabled:cursor-wait transition-colors"
      >
        {pending ? "Saving…" : "Set password and continue"}
      </button>
      <button
        type="button"
        onClick={signOut}
        className="text-center font-sans text-[12.5px] text-paper/55 hover:text-paper"
      >
        Sign out instead
      </button>
    </form>
  );
}
