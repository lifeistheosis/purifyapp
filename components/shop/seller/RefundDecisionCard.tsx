"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { REFUND_REASON_LABELS } from "@/lib/shop/refunds";
import type { ShopRefundReason } from "@/lib/shop/types";
import { useTranslate } from "@/components/i18n/MessagesProvider";

const field =
  "w-full rounded-md border border-paper/15 bg-night px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/35 focus:outline-none focus:border-paper/40 focus:ring-1 focus:ring-paper/20";

/**
 * A pending refund request from the seller's side. Approve moves the
 * money (or parks the request for manual settlement — the API decides
 * and reports which); decline asks for a sentence of reasoning because
 * "no" with no why is how disputes start.
 */
export function RefundDecisionCard({
  refundId,
  reason,
  details,
  amountLabel,
}: {
  refundId: string;
  reason: ShopRefundReason;
  details: string | null;
  amountLabel: string;
}) {
  const { t } = useTranslate();
  const router = useRouter();
  const [busy, setBusy] = useState<false | "approved" | "declined">(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);

  async function decide(decision: "approved" | "declined") {
    if (decision === "declined" && !note.trim()) {
      setError("Add a short note explaining the decline.");
      return;
    }
    setBusy(decision);
    setError(null);
    try {
      const res = await fetch("/api/shop/seller/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refundId, decision, note: note.trim() || null }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        router.refresh();
        return;
      }
      setError(data.error ?? "Couldn't save the decision.");
    } catch {
      setError("Couldn't save the decision.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-crimson-soft/40 bg-crimson-soft/[0.06] p-5">
      <p className="font-sans text-ui font-semibold text-paper">
        {t("shop.refundRequested")} {amountLabel}
      </p>
      <p className="mt-1.5 font-sans text-detail text-paper/70">
        {t("shop.reason")} {REFUND_REASON_LABELS[reason]}
      </p>
      {details ? (
        <p className="mt-2 rounded-md bg-night/60 p-3 font-serif text-body text-paper/80 leading-[1.6]">
          &ldquo;{details}&rdquo;
        </p>
      ) : null}

      {declining ? (
        <label className="mt-4 block space-y-1.5">
          <span className="font-sans text-caption font-semibold text-paper/60">
            {t("shop.whyAreYouDecliningThe")}
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={2000}
            className={field}
          />
        </label>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 font-sans text-detail text-crimson-soft">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!declining ? (
          <>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => decide("approved")}
              className="tap-press inline-flex min-h-[44px] items-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night hover:bg-paper/90 disabled:opacity-60"
            >
              {busy === "approved" ? "Refunding…" : "Approve refund"}
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => setDeclining(true)}
              className="tap-press inline-flex min-h-[44px] items-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper disabled:opacity-60"
            >
              {t("shop.decline")}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => decide("declined")}
              className="tap-press inline-flex min-h-[44px] items-center rounded-pill border border-crimson-soft/60 px-6 font-sans text-ui font-semibold text-paper disabled:opacity-60"
            >
              {busy === "declined" ? "Saving…" : "Confirm decline"}
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => {
                setDeclining(false);
                setError(null);
              }}
              className="font-sans text-detail font-medium text-paper/60 hover:text-paper"
            >
              {t("nav.back")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
