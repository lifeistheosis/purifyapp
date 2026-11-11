"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { authOrigin } from "@/lib/site";

/**
 * Change-email card. Supabase's secure email change sends a link to the new
 * address AND one to the current one, and makes the change only when both
 * are opened. This card used to name the new one only, so the change waited
 * for a link the reader was never told to open (a reader's report,
 * 2026-10-31). It names both now, says when a change is waiting
 * (`pendingEmail`, the account's own new_email), and every link lands on
 * /email/change, which says where the change stands.
 */
export function ChangeEmailCard({ currentEmail, pendingEmail = null }: { currentEmail: string; pendingEmail?: string | null }) {
  const { t } = useTranslate();
  const [next, setNext] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSent(false);
    const target = next.trim();
    if (!target) return;
    if (target === currentEmail) {
      setError(t("ui.emailAlreadyOnFile"));
      return;
    }
    setPending(true);
    try {
      const supabase = createClient();
      // Where Supabase's own page sends the reader after a link (its default
      // template); the house's template goes through app/api/auth/callback,
      // which lands on the same page.
      const { error: err } = await supabase.auth.updateUser({ email: target }, { emailRedirectTo: `${authOrigin()}/email/change` });
      if (err) throw err;
      setSent(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("ui.couldntRequestEmailChange"),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-lg border border-paper/12 bg-paper/[0.02] p-6">
      <h2 className="font-sans text-body font-semibold text-paper mb-1">
        {t("ui.changeEmail")}
      </h2>
      <p className="font-sans text-detail text-paper/60 mb-5 leading-[1.55]">
        {t("ui.current")}{" "}
        <span className="text-paper/85 font-medium">{currentEmail}</span>
        <span className="mt-1 block">{t("emailChange.howItWorks")}</span>
      </p>
      {pendingEmail && !sent ? (
        <p role="status" className="font-sans text-detail text-paper/80 mb-5 leading-[1.55]">
          {t("emailChange.pending", { next: pendingEmail })}
        </p>
      ) : null}
      <form onSubmit={submit} className="flex flex-col gap-3 max-w-[420px]">
        <div>
          <label
            htmlFor="new-email"
            className="font-sans text-caption font-medium text-paper/75 block mb-1.5"
          >
            {t("ui.newEmail")}
          </label>
          <input
            id="new-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder={t("ui.newSomewhereCom")}
            className="w-full bg-paper/[0.04] border border-paper/20 rounded-pill px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/55 focus:outline-none focus:border-paper/55 transition-colors"
          />
        </div>
        {error ? (
          <p className="font-sans text-detail text-crimson-soft">{error}</p>
        ) : null}
        {sent ? (
          <p role="status" className="font-sans text-detail text-emerald-300">
            {t("emailChange.sent", { next: next.trim(), current: currentEmail })}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-pill bg-paper text-night font-sans text-detail font-semibold px-5 py-2.5 hover:bg-paper/90 disabled:opacity-60 disabled:cursor-wait transition-colors"
        >
          {pending ? t("forgot.pending") : t("ui.sendConfirmation")}
        </button>
      </form>
    </section>
  );
}
