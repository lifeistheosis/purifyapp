"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authOrigin } from "@/lib/site";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Forgot-password form. Sends a Supabase reset link that lands on
 * `/reset` with a recovery token; ResetForm handles the actual
 * password change.
 */
export function ForgotForm() {
  const { t } = useTranslate();
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
        // Land on the stateless OTP callback (cross-browser safe), which
        // establishes the recovery session and forwards to /reset. Going
        // straight to /reset relied on the PKCE verifier cookie, which is
        // absent when the email opens in a mail app's in-app browser.
        { redirectTo: `${origin}/api/auth/callback?next=/reset` },
      );
      if (err) throw err;
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("forgot.sendFailed"));
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-gold/35 bg-gold/[0.06] p-5">
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-gold mb-2">
          {t("forgot.sentTitle")}
        </p>
        <p className="font-serif text-body text-paper/90 leading-[1.65]">
          {t("forgot.sentBody", { email: email.trim() })}
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
          {t("common.email")}
        </label>
        <input
          id="forgot-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("ui.youSomewhereCom")}
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
        {pending ? t("forgot.pending") : t("forgot.submit")}
      </button>
      <p className="text-center font-sans text-caption text-paper/55">
        <Link href="/signin" className="hover:text-paper">
          {t("ui.backToSignIn")}
        </Link>
      </p>
    </form>
  );
}
