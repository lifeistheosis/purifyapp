"use client";

import { Cart } from "@/components/ui/icons/Cart";
import { Check } from "@/components/ui/icons/Check";
import { PrayerRope } from "@/components/ui/icons/PrayerRope";
import { Sparkle } from "@/components/ui/icons/Sparkle";
import { Truck } from "@/components/ui/icons/Truck";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { countdownLabel } from "@/lib/shop/cartDeals";
import { formatPrice } from "@/lib/shop/format";
import type { Ladder, PricedSegment } from "@/lib/shop/promotions";
import type { ShopCartInsights } from "@/lib/shop/types";
import { useServerClock } from "@/lib/shop/useCartInsights";

/**
 * The small live signals a shopper sees around a product and a cart. Every
 * one of them states a fact the server counted or will honour:
 *
 *   CartDemandLine    other shoppers holding this product (lib/shop/cartDemand)
 *   CartDealTag       a deal live on this cart line, with its real end time
 *   OfferTag          the set or multi-buy price on a cart line
 *   FreeShippingMeter how far the cart is from the owner's threshold
 *   CartLadder        the meter, and the order's place against each offer
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

/**
 * Why a cart line costs less than its list price, when that is one of the
 * standing offers (the cart deal has its own tag, with its countdown). The
 * prices sit in the line's own price column. "1 of 2" when only some of the
 * line's pieces take it: two icons and one set, say.
 */
export function OfferTag({
  segments,
  quantity,
  minItems,
}: {
  segments: readonly PricedSegment[];
  quantity: number;
  minItems: number | null | undefined;
}) {
  const { t, tn } = useTranslate();
  const offers = segments.filter((s) => s.kind === "set_bundle" || s.kind === "multi_buy");
  if (offers.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {offers.map((s) => (
        <span
          key={`${s.kind}-${s.unitCents}`}
          className="inline-flex flex-wrap items-center gap-x-1.5 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.07] px-2.5 py-1 font-sans text-caption"
        >
          {s.kind === "set_bundle" ? (
            <PrayerRope size={13} className="text-emerald-300" aria-hidden />
          ) : (
            <Sparkle size={13} className="text-emerald-300" aria-hidden />
          )}
          <span className="font-semibold text-emerald-300">
            {s.kind === "set_bundle"
              ? t("shop.offerSetTag", { percent: s.percent ?? 0 })
              : tn("shop.offerMultiTag", minItems ?? 2, { percent: s.percent ?? 0 })}
          </span>
          {s.quantity < quantity ? (
            <span className="tabular-nums text-paper/60">{t("shop.offerSomeOf", { count: s.quantity, total: quantity })}</span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

/**
 * The ladder: where the order stands against each thing it can still unlock,
 * one row per offer that is on (the owner, 2026-10-01: "if you add more, it's
 * free shipping, or if you add one more, it's discounted").
 *
 *   shipping   the meter: how far from free shipping, or that it ships free
 *   multi-buy  dots for the pieces in the order, and how many more it takes
 *   set        that a whole set is in the order (finishing one has its own
 *              card in the cart, with the pieces to add)
 *
 * Every row is computed from the order as checkout will price it
 * (lib/shop/promotions.ts). It counts up to something real and says what that
 * is; it never counts down, and nothing in it expires.
 */
export function CartLadder({
  ladder,
  currency,
  showShippingDone = true,
  className,
}: {
  ladder: Ladder;
  currency: string;
  /** The cart's own shipping row already says it ships free. */
  showShippingDone?: boolean;
  className?: string;
}) {
  const { t, tn } = useTranslate();
  const { shipping, multiBuy, set } = ladder;
  const rows: React.ReactNode[] = [];

  if (shipping.kind === "away") {
    const pct = Math.round(shipping.progress * 100);
    rows.push(
      <li key="ship">
        <p className="flex items-center gap-2 font-sans text-caption text-paper/75">
          <Truck size={15} className="shrink-0 text-premium-ink" aria-hidden />
          {t("shop.freeShippingAway", { amount: formatPrice(shipping.awayCents, currency) })}
        </p>
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper/10"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={t("shop.freeShippingOver", { amount: formatPrice(shipping.thresholdCents, currency) })}
        >
          <div className="h-full rounded-full bg-gold transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
      </li>,
    );
  } else if (shipping.kind === "free" && showShippingDone) {
    rows.push(<DoneRow key="ship" icon={<Truck size={15} aria-hidden />} text={t("shop.freeShippingUnlocked")} />);
  }

  if (multiBuy.kind === "away") {
    rows.push(
      <li key="multi" className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-sans text-caption text-paper/75">
          <Sparkle size={15} className="shrink-0 text-premium-ink" aria-hidden />
          {tn("shop.ladderMultiAway", multiBuy.need, { percent: multiBuy.percent })}
        </p>
        <span
          className="flex shrink-0 items-center gap-1"
          role="img"
          aria-label={t("shop.ladderMultiProgress", { have: multiBuy.have, total: multiBuy.minItems })}
        >
          {Array.from({ length: Math.min(multiBuy.minItems, 10) }, (_, i) => (
            <span
              key={i}
              className={cn("h-2 w-2 rounded-full", i < multiBuy.have ? "bg-gold" : "bg-paper/15")}
            />
          ))}
        </span>
      </li>,
    );
  } else if (multiBuy.kind === "on" && multiBuy.applied) {
    rows.push(
      <DoneRow
        key="multi"
        icon={<Sparkle size={15} aria-hidden />}
        text={tn("shop.ladderMultiOn", multiBuy.minItems, { percent: multiBuy.percent })}
      />,
    );
  }

  if (set.kind === "complete") {
    rows.push(
      <DoneRow key="set" icon={<PrayerRope size={15} aria-hidden />} text={t("shop.ladderSetOn", { percent: set.percent })} />,
    );
  }

  if (rows.length === 0) return null;
  return <ul className={cn("mt-3 space-y-2.5", className)}>{rows}</ul>;
}

function DoneRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-2 font-sans text-caption font-semibold text-emerald-300">
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0">{text}</span>
      <Check size={14} className="shrink-0" aria-hidden />
    </li>
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
