"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiFetch } from "@/lib/api/client";
import {
  REFUND_REASON_LABELS,
  REFUND_STATUS_LABELS,
} from "@/lib/shop/refunds";
import type { ShopRefundRequest } from "@/lib/shop/types";

const field =
  "w-full rounded-md border border-paper/15 bg-night px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/35 focus:outline-none focus:border-paper/40 focus:ring-1 focus:ring-paper/20";

/**
 * The buyer's refund corner on an order. Three shapes: a live request
 * (status + withdraw while undecided), a resolved history line, or the
 * quiet "Request a refund" path that unfolds into a two-field form —
 * reason first, because the reason decides everything downstream.
 */
export function BuyerRefundSection({
  orderId,
  eligible,
  latest,
  onChanged,
}: {
  orderId: string;
  eligible: boolean;
  latest: Pick<
    ShopRefundRequest,
    "id" | "status" | "reason" | "resolution_note" | "created_at"
  > | null;
  /** Client pages pass a reload; without it we fall back to router.refresh()
   *  for the server-rendered seller context. */
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => (onChanged ? onChanged() : router.refresh());

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/shop/orders/refund-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          reason: String(f.get("reason")),
          details: String(f.get("details") ?? "").trim() || null,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setOpen(false);
        refresh();
        return;
      }
      setError(data.error ?? "Couldn't file the request.");
    } catch {
      setError("Couldn't file the request.");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    if (!latest) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/shop/orders/refund-request", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refundId: latest.id }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        refresh();
        return;
      }
      setError(data.error ?? "Couldn't withdraw the request.");
    } catch {
      setError("Couldn't withdraw the request.");
    } finally {
      setBusy(false);
    }
  }

  // A live or settled request: report it honestly.
  if (latest && latest.status !== "cancelled") {
    return (
      <div className="rounded-lg border border-paper/10 bg-night-soft/60 p-5">
        <p className="font-sans text-ui font-semibold text-paper">
          {REFUND_STATUS_LABELS[latest.status]}
        </p>
        <p className="mt-1.5 font-sans text-detail text-paper/65">
          {latest.status === "requested"
            ? "The seller is reviewing your request."
            : latest.status === "approved"
              ? "Approved — your refund is being processed."
              : latest.status === "processed"
                ? "The money is on its way back to your payment method."
                : "The seller declined this request."}
          {" · "}Reason: {REFUND_REASON_LABELS[latest.reason]}
        </p>
        {latest.resolution_note ? (
          <p className="mt-2 rounded-md bg-night/60 p-3 font-serif text-body text-paper/80 leading-[1.6]">
            Seller&rsquo;s note: &ldquo;{latest.resolution_note}&rdquo;
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-2 font-sans text-detail text-crimson-soft">
            {error}
          </p>
        ) : null}
        {latest.status === "requested" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void withdraw()}
            className="mt-3 font-sans text-detail font-medium text-paper/60 hover:text-paper disabled:opacity-60"
          >
            Withdraw request
          </button>
        ) : null}
      </div>
    );
  }

  if (!eligible) return null;

  return (
    <div className="rounded-lg border border-paper/10 bg-night-soft/60 p-5">
      {!open ? (
        <>
          <p className="font-sans text-ui font-semibold text-paper">
            Something wrong with this order?
          </p>
          <p className="mt-1.5 font-sans text-detail text-paper/65">
            Tell us what happened and the seller will review it. Damaged,
            wrong, or missing items are always on the seller.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="tap-press mt-4 inline-flex min-h-[44px] items-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper"
          >
            Request a refund
          </button>
        </>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="font-sans text-caption font-semibold text-paper/60">
              What happened? *
            </span>
            <select name="reason" required defaultValue="damaged" className={field}>
              {Object.entries(REFUND_REASON_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="font-sans text-caption font-semibold text-paper/60">
              Anything that helps
            </span>
            <textarea
              name="details"
              rows={3}
              maxLength={2000}
              placeholder="The frame arrived cracked at the corner…"
              className={field}
            />
          </label>
          {error ? (
            <p role="alert" className="font-sans text-detail text-crimson-soft">
              {error}
            </p>
          ) : null}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={busy}
              className="tap-press inline-flex min-h-[44px] items-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night hover:bg-paper/90 disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send request"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
              className="font-sans text-detail font-medium text-paper/60 hover:text-paper"
            >
              Never mind
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
