"use client";

import { useState } from "react";

import { apiFetch } from "@/lib/api/client";
import { useTranslate } from "@/components/i18n/MessagesProvider";

const field =
  "w-full rounded-md border border-paper/15 bg-night px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/35 focus:outline-none focus:border-paper/40 focus:ring-1 focus:ring-paper/20";

/**
 * "My store is ready. Please open it."
 *
 * Replaces the line that told a seller to write to lifeistheosis@gmail.com to
 * schedule the review that flips their store live. That asked them to compose
 * a message with no idea what to put in it, and left no record that they had
 * asked. The route composes it, includes the listing count an admin would
 * otherwise go and look up, and writes an activity-log line whether or not
 * the mail goes out.
 */
export function OpenStoreRequest() {
  const { t } = useTranslate();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/shop/seller/store/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || null }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setSent(true);
        return;
      }
      setError(data.error ?? t("shop.storeAskToOpenFailed"));
    } catch {
      setError(t("shop.storeAskToOpenFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <p role="status" className="mt-3 font-serif text-body text-paper/70 leading-[1.6]">
        {t("shop.storeAskToOpenSent")}
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      <p className="font-serif text-body text-paper/70 leading-[1.6]">
        {t("shop.storeAskToOpenHint")}
      </p>
      <label className="block space-y-1.5">
        <span className="font-sans text-caption font-semibold text-paper/60">
          {t("shop.storeAskNote")}
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={1000}
          className={field}
        />
      </label>
      {error ? (
        <p role="alert" className="font-sans text-detail text-crimson-soft">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={ask}
        disabled={busy}
        className="tap-press inline-flex min-h-[44px] items-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night hover:bg-paper/90 disabled:opacity-60"
      >
        {busy ? t("shop.storeAskToOpenSending") : t("shop.storeAskToOpenCta")}
      </button>
    </div>
  );
}
