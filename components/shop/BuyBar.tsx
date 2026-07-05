"use client";

import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/cn";

/**
 * Sticky mobile purchase bar (static sidebar block on md+). Three
 * server-decided modes, passed down as props so the client never
 * reasons about entitlement to buy:
 *
 *  - checkout on + purchasable  → real buy button (POST /api/shop/checkout)
 *  - checkout off + purchasable → honest "Checkout opens soon" + Notify me
 *  - not purchasable            → request-interest path only
 */
export function BuyBar({
  productSlug,
  priceLabel,
  dispatchLabel,
  inventoryLabel,
  purchasable,
  checkoutOn,
  subjectForRequest,
}: {
  productSlug: string;
  priceLabel: string;
  dispatchLabel: string;
  inventoryLabel: string;
  purchasable: boolean;
  checkoutOn: boolean;
  subjectForRequest: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productSlug, quantity: 1 }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "Checkout isn't available right now.");
    } catch {
      setError("Checkout isn't available right now.");
    } finally {
      setBusy(false);
    }
  }

  const notifyHref = `/shop/request?subject=${encodeURIComponent(subjectForRequest)}&notify=1`;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-night/95 px-5 py-3 backdrop-blur safe-pb",
        "md:static md:rounded-lg md:border md:border-paper/10 md:bg-night-soft/60 md:p-6",
      )}
    >
      <div className="mx-auto flex max-w-[560px] items-center justify-between gap-4 md:mx-0 md:flex-col md:items-stretch">
        <div>
          <p className="font-sans text-title-sm font-semibold text-paper">{priceLabel}</p>
          <p className="mt-0.5 font-sans text-caption text-paper/60">
            {inventoryLabel} · {dispatchLabel}
          </p>
        </div>

        {purchasable && checkoutOn ? (
          <button
            type="button"
            onClick={startCheckout}
            disabled={busy}
            className="tap-press inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night hover:bg-paper/90 disabled:opacity-60 md:mt-4"
          >
            {busy ? "Opening checkout…" : "Buy now"}
          </button>
        ) : purchasable ? (
          <div className="flex shrink-0 flex-col items-end gap-1 md:mt-4 md:items-stretch">
            <Link
              href={notifyHref}
              className="tap-press inline-flex min-h-[48px] items-center justify-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper hover:border-paper/45"
            >
              Notify me
            </Link>
            <p className="font-sans text-caption text-paper/60 md:text-center">
              Checkout opens soon.
            </p>
          </div>
        ) : (
          <Link
            href={notifyHref}
            className="tap-press inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper hover:border-paper/45 md:mt-4"
          >
            Request this icon
          </Link>
        )}
      </div>
      {error ? (
        <p role="alert" className="mx-auto mt-2 max-w-[560px] font-sans text-caption text-crimson-soft md:mx-0">
          {error}
        </p>
      ) : null}
    </div>
  );
}
