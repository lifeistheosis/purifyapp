"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/auth/PasswordInput";

/**
 * Two modes:
 *
 *  - Change mode (`hasPassword: true`) — old + new + confirm. We
 *    re-authenticate with the old password before calling
 *    `updateUser({ password })` so a stolen session can't silently
 *    rotate.
 *  - Set mode (`hasPassword: false`) — new + confirm only. For
 *    legacy magic-link users who signed up before passwords existed
 *    and never went through the /set-password interstitial (e.g.
 *    they got into Security some other way). Same path as the
 *    interstitial: `updateUser({ password })` + `mark_password_set`.
 */
export function ChangePasswordCard({
  email,
  hasPassword,
}: {
  email: string;
  hasPassword: boolean;
}) {
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
      setError("Password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (hasPassword && next === current) {
      setError("New password must be different from the current one.");
      return;
    }
    setPending(true);
    try {
      const supabase = createClient();
      // Re-auth gate (change mode only — set mode has no old password).
      if (hasPassword) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password: current,
        });
        if (signInErr) {
          throw new Error("Current password is incorrect.");
        }
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
      // Reload so the server-rendered Security page re-reads
      // hasPassword and flips this card into change mode.
      if (!hasPassword && typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : hasPassword
            ? "Couldn't change password."
            : "Couldn't set password.",
      );
    } finally {
      setPending(false);
    }
  }

  // ---------------------------------------------------------------
  // Render: split by mode so the copy + field set are honest.
  // ---------------------------------------------------------------

  if (!hasPassword) {
    return (
      <section id="change-password" className="rounded-lg border border-gold/35 bg-gold/[0.05] p-6 scroll-mt-24">
        <h2 className="font-sans text-[16px] font-semibold text-paper mb-1">
          Set a password
        </h2>
        <p className="font-sans text-[13px] text-paper/70 mb-5 leading-[1.55]">
          Your account was created before passwords existed on Purify
          (magic-link era). Pick one now and you&rsquo;ll be able to sign
          in with email + password from anywhere.
        </p>
        <form onSubmit={submit} className="flex flex-col gap-3.5 max-w-[420px]">
          <PasswordInput
            label="Choose a password"
            value={next}
            onChange={setNext}
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
          {done ? (
            <p className="font-sans text-[13px] text-emerald-300">
              Password set. Reloading…
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-pill bg-paper text-night font-sans text-[13.5px] font-semibold px-5 py-2.5 hover:bg-paper/90 disabled:opacity-60 disabled:cursor-wait transition-colors"
          >
            {pending ? "Saving…" : "Set password"}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section id="change-password" className="rounded-lg border border-paper/12 bg-paper/[0.02] p-6 scroll-mt-24">
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
