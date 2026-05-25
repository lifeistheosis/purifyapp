"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/auth/PasswordInput";

/**
 * Change-password card. Re-authenticates with the current password
 * before calling `updateUser({ password })` — Supabase doesn't enforce
 * old-password verification on its own, so a stolen session would
 * otherwise be able to rotate the password silently.
 */
export function ChangePasswordCard({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords don't match.");
      return;
    }
    if (next === current) {
      setError("New password must be different from the current one.");
      return;
    }
    setPending(true);
    try {
      const supabase = createClient();
      // Re-auth gate.
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (signInErr) {
        throw new Error("Current password is incorrect.");
      }
      const { error: updErr } = await supabase.auth.updateUser({
        password: next,
      });
      if (updErr) throw updErr;
      await supabase.rpc("mark_password_set");
      setDone(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't change password.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-lg border border-paper/12 bg-paper/[0.02] p-6">
      <h2 className="font-sans text-[16px] font-semibold text-paper mb-1">
        Change password
      </h2>
      <p className="font-sans text-[13px] text-paper/60 mb-5 leading-[1.55]">
        We&rsquo;ll verify your current password first.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3.5 max-w-[420px]">
        <PasswordInput
          label="Current password"
          value={current}
          onChange={setCurrent}
          autoComplete="current-password"
        />
        <PasswordInput
          label="New password"
          value={next}
          onChange={setNext}
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
          <p className="font-sans text-[13px] text-[#f8cac7]">{error}</p>
        ) : null}
        {done ? (
          <p className="font-sans text-[13px] text-emerald-300">
            Password updated.
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-pill bg-paper text-night font-sans text-[13.5px] font-semibold px-5 py-2.5 hover:bg-paper/90 disabled:opacity-60 disabled:cursor-wait transition-colors"
        >
          {pending ? "Saving…" : "Update password"}
        </button>
      </form>
    </section>
  );
}
