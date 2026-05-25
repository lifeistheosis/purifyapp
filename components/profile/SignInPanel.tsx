"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Passwordless sign-in. The user types their email; Supabase Auth emails them
 * a magic link that lands on /api/auth/callback. Same flow handles sign-up
 * (an unrecognized email creates an auth.users row, the trigger inserts the
 * matching profile, and the user lands signed in on /account).
 */
/**
 * Pass `compact` when slotting this panel inside another card (e.g.
 * the Public side of `AccountChoice`). Compact mode drops the outer
 * card chrome + preamble paragraph; the surrounding card supplies
 * them.
 */
export function SignInPanel({ compact = false }: { compact?: boolean } = {}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errMsg, setErrMsg] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setState("sending");
    setErrMsg("");
    try {
      const supabase = createClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${origin}/api/auth/callback?next=/account`,
        },
      });
      if (error) throw error;
      setState("sent");
    } catch (err) {
      setState("error");
      setErrMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (state === "sent") {
    return (
      <div className="mt-10 rounded-lg border border-gold/35 bg-gold/[0.06] p-6 md:p-7">
        <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-gold mb-3">
          Check your inbox
        </p>
        <p className="font-serif text-[18px] text-paper/90 leading-[1.65]">
          We sent a sign-in link to{" "}
          <span className="font-semibold text-paper">{email.trim()}</span>.
          Open it on this device to finish signing in. The link is good for
          one hour.
        </p>
        <p className="mt-3 font-sans text-[13px] text-paper/55 leading-[1.6]">
          No email? Check spam, then try again with the same address.
        </p>
        <button
          type="button"
          onClick={() => {
            setState("idle");
            setEmail("");
          }}
          className="mt-5 font-sans text-[13px] text-paper/65 hover:text-paper transition-colors"
        >
          Use a different email →
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={send}
      className={
        compact
          ? ""
          : "mt-10 rounded-lg border border-paper/15 bg-paper/[0.03] p-6 md:p-7"
      }
    >
      {compact ? null : (
        <>
          <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
            Sign in or sign up
          </p>
          <p className="font-serif text-[17px] text-paper/85 leading-[1.65] max-w-[560px]">
            Type your email. We&rsquo;ll send you a one-tap sign-in link.
            You&rsquo;ll never make a password. Same flow whether
            you&rsquo;ve used Purify before or not.
          </p>
        </>
      )}
      <div className={compact ? "flex flex-col gap-3" : "mt-5 flex flex-col sm:flex-row gap-3"}>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@somewhere.com"
          className="flex-1 min-w-0 bg-paper/[0.04] border border-paper/20 rounded-pill px-4 py-3 font-sans text-[15px] text-paper placeholder:text-paper/40 focus:outline-none focus:border-paper/50 transition-colors duration-150"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="shrink-0 font-sans text-[14px] font-semibold rounded-pill px-5 py-3 bg-paper text-night hover:bg-paper/90 disabled:opacity-60 disabled:cursor-wait transition-colors"
        >
          {state === "sending" ? "Sending…" : "Send sign-in link"}
        </button>
      </div>
      {state === "error" && (
        <p className="mt-3 font-sans text-[13px] text-[#f8cac7]">
          {errMsg || "Something went wrong. Try again."}
        </p>
      )}
      {compact ? null : (
        <p className="mt-4 font-sans text-[12.5px] text-paper/45 leading-[1.55]">
          We use only your email for sign-in. No analytics, no ads. You can
          delete your account and every server-side row from this page later.
        </p>
      )}
    </form>
  );
}
