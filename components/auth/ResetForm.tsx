"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "./PasswordInput";

/**
 * Renders on `/reset` after the user clicks the recovery link from
 * their email. Supabase has already exchanged the token for a
 * temporary session by the time this component mounts (the
 * `recovery` event in `onAuthStateChange` fires before the page is
 * interactive). All we do is call `updateUser({ password })` and
 * flip the `has_password` flag.
 */
export function ResetForm() {
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
      try {
        await supabase.rpc("mark_password_set");
      } catch {
        /* ignore, middleware will tolerate either state */
      }
      router.push("/account/profile");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update password.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <PasswordInput
        label="New password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        showStrength
      />
      <PasswordInput
        label="Confirm new password"
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
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
