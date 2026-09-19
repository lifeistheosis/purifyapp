"use client";

import { Cart } from "@/components/ui/icons/Cart";
import { Sparkle } from "@/components/ui/icons/Sparkle";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { countdownLabel } from "@/lib/shop/cartDeals";
import { formatPrice } from "@/lib/shop/format";
import type { ShopCartInsights } from "@/lib/shop/types";
import { useServerClock } from "@/lib/shop/useCartInsights";

/**
 * The small live signals a shopper sees around a product and a cart. Every
 * one of them states a fact the server counted or will honour:
 *
 *   CartDemandLine    other shoppers holding this product (lib/shop/cartDemand)
 *   CartDealTag       a deal live on this cart line, with its real end time
 *   FreeShippingMeter how far the cart is from the owner's threshold
 *
 * None has a fallback number. Nothing counted, nothing shown.
 */

export function CartDemandLine({ count }: { count: number | undefined }) {
  const { tn } = useTranslate();
  if (!count || count < 1) return null;
  return (
    <p className="inline-flex items-center gap-2 font-sans text-caption font-medium text-paper/75">
      <span className="relative flex h-2 w-2" aria-hidden>
        <span className="demand-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      <Cart size={14} className="text-paper/55" />
      {tn("shop.inOtherCarts", count)}
    </p>
  );
}

type Deal = Pick<ShopCartInsights["deals"][string], "percent" | "endsAt">;

/**
 * The deal on one cart line: what it is and when it ends. The prices sit in the
 * line's own price column, struck and discounted, so they are not repeated
 * here. The countdown is the real end: checkout stops honouring the deal at
 * that second (lib/shop/cartDeals.ts).
 */
export function CartDealTag({ deal, skewMs }: { deal: Deal; skewMs: number }) {
  const { t } = useTranslate();
  const now = useServerClock(true, skewMs);
  const left = deal.endsAt - now;
  if (left <= 0) return null;
  return (
    <div className="mt-2 inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.07] px-2.5 py-1.5 font-sans text-caption">
      <Sparkle size={13} className="text-emerald-300" aria-hidden />
      <span className="font-semibold text-emerald-300">{t("shop.cartDealUnlocked")}</span>
      <span className="font-semibold text-paper">{t("shop.cartDealOff", { percent: deal.percent })}</span>
      <span className="tabular-nums text-paper/60">{t("shop.cartDealEndsIn", { time: countdownLabel(left) })}</span>
    </div>
  );
}

/** "$12 away from free shipping", with a bar, or the unlocked line. */
export function FreeShippingMeter({
  subtotalCents,
  thresholdCents,
  currency,
  pro,
}: {
  subtotalCents: number;
  thresholdCents: number | null | undefined;
  currency: string;
  /** Pro already ships free; the meter would be telling them nothing. */
  pro?: boolean | null;
}) {
  const { t } = useTranslate();
  if (pro || !thresholdCents || thresholdCents <= 0 || subtotalCents <= 0) return null;
  const done = subtotalCents >= thresholdCents;
  const pct = Math.min(100, Math.round((subtotalCents / thresholdCents) * 100));
  return (
    <div className="mt-3">
      <p className={"font-sans text-caption " + (done ? "font-semibold text-emerald-300" : "text-paper/70")}>
        {done
          ? t("shop.freeShippingUnlocked")
          : t("shop.freeShippingAway", { amount: formatPrice(thresholdCents - subtotalCents, currency) })}
      </p>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={t("shop.freeShippingOver", { amount: formatPrice(thresholdCents, currency) })}
      >
        <div
          className={"h-full rounded-full transition-[width] duration-500 " + (done ? "bg-emerald-400" : "bg-gold")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
