"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  SELLER_ACTION_LABELS,
  SELLER_TRANSITIONS,
  transitionNeedsTracking,
} from "@/lib/shop/sellerOrders";
import type { ShopFulfillmentStatus } from "@/lib/shop/types";
import { cn } from "@/lib/cn";

const field =
  "w-full rounded-md border border-paper/15 bg-night px-4 py-3 font-sans text-ui text-paper placeholder:text-paper/35 focus:outline-none focus:border-paper/40 focus:ring-1 focus:ring-paper/20";

/**
 * The order's next moves, driven by the same transition map the API
 * enforces. The primary action rides a sticky bottom bar on mobile so
 * "Mark shipped" is always a thumb away; cancel is a quiet text link,
 * never a big red button beside the primary.
 */
export function SellerOrderActions({
  orderId,
  fulfillmentStatus,
  paymentStatus,
  tracking,
}: {
  orderId: string;
  fulfillmentStatus: ShopFulfillmentStatus;
  paymentStatus: "pending" | "paid" | "refunded" | "cancelled";
  tracking: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState(tracking ?? "");

  const nexts = SELLER_TRANSITIONS[fulfillmentStatus] ?? [];
  const forward = nexts.filter((n) => n !== "cancelled");
  const primary = forward[0] ?? null;
  // Cancelling a paid order isn't offered: money moves through refunds.
  const canCancel = nexts.includes("cancelled") && paymentStatus !== "paid";
  const needsTracking = primary ? transitionNeedsTracking(primary) : false;

  async function apply(status: ShopFulfillmentStatus) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/shop/seller/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          fulfillmentStatus: status,
          tracking: trackingInput.trim() || null,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        router.refresh();
        return;
      }
      setError(data.error ?? "Couldn't update the order.");
    } catch {
      setError("Couldn't update the order.");
    } finally {
      setBusy(false);
    }
  }

  if (!primary && !canCancel) return null;

  return (
    <div>
      {needsTracking ? (
        <label className="block space-y-1.5">
          <span className="font-sans text-caption font-semibold text-paper/60">
            Tracking number *
          </span>
          <input
            value={trackingInput}
            onChange={(e) => setTrackingInput(e.target.value)}
            maxLength={200}
            placeholder="e.g. 9400 1000 0000 0000 0000 00"
            className={field}
          />
        </label>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 font-sans text-detail text-crimson-soft">
          {error}
        </p>
      ) : null}

      <div
        className={cn(
          "mt-4 flex items-center gap-4",
          // Sticky bottom bar on mobile, inline on desktop.
          "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-30 max-md:mt-0",
          "max-md:border-t max-md:border-white/10 max-md:bg-night/95 max-md:px-5 max-md:py-3 max-md:backdrop-blur safe-pb",
        )}
      >
        {primary ? (
          <button
            type="button"
            disabled={busy || (needsTracking && !trackingInput.trim())}
            onClick={() => apply(primary)}
            className="tap-press inline-flex min-h-[48px] flex-1 items-center justify-center rounded-pill bg-paper px-8 font-sans text-ui font-semibold text-night hover:bg-paper/90 disabled:opacity-60 md:flex-none"
          >
            {busy ? "Saving…" : SELLER_ACTION_LABELS[primary] ?? primary}
          </button>
        ) : null}
        {canCancel ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Cancel this order? The buyer will see it as cancelled.")) {
                void apply("cancelled");
              }
            }}
            className="font-sans text-detail font-medium text-paper/60 hover:text-paper disabled:opacity-60"
          >
            Cancel order
          </button>
        ) : null}
      </div>
      {/* Spacer so the sticky bar never covers page content on mobile. */}
      <div aria-hidden className="h-20 md:hidden" />
    </div>
  );
}
