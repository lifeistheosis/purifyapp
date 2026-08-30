"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { addToCart, openCartDrawer } from "@/lib/shop/cart";
import { openStripe } from "@/lib/shop/openStripe";
import { useTranslate } from "@/components/i18n/MessagesProvider";

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
  title,
  priceCents,
  currency,
  imageUrl,
  imageAlt,
  priceLabel,
  shippingLabel,
  dispatchLabel,
  inventoryLabel,
  purchasable,
  checkoutOn,
  subjectForRequest,
}: {
  productSlug: string;
  /** Cart line data (display only; the server re-prices at checkout). */
  title: string;
  priceCents: number;
  currency: string;
  imageUrl?: string;
  imageAlt?: string;
  priceLabel: string;
  /** Server-decided shipping line ("Free shipping with Purify Pro" or the flat rate). */
  shippingLabel: string;
  dispatchLabel: string;
  inventoryLabel: string;
  purchasable: boolean;
  checkoutOn: boolean;
  subjectForRequest: string;
}) {
  const { t } = useTranslate();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  // Clickwrap: the checkout API refuses the order unless this was ticked,
  // and the acceptance is recorded server-side against the order.
  const [agreed, setAgreed] = useState(false);

  function handleAddToCart() {
    addToCart({ slug: productSlug, title, priceCents, currency, imageUrl, imageAlt });
    setAdded(true);
    openCartDrawer();
    setTimeout(() => setAdded(false), 1800);
  }

  async function startCheckout() {
    if (!agreed) {
      setError(t("shop.agreeTermsFirst"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productSlug, quantity: 1, termsAccepted: true }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (res.ok && data.url) {
        // Web: redirect. Native: in-app browser, back to orders on close.
        await openStripe(data.url, () => router.push("/shop/orders"));
        return;
      }
      setError(data.error ?? t("shop.checkoutUnavailable"));
    } catch {
      setError(t("shop.checkoutUnavailable"));
    } finally {
      setBusy(false);
    }
  }

  const notifyHref = `/shop/request?subject=${encodeURIComponent(subjectForRequest)}&notify=1`;

  return (
    <div
      className={cn(
        // The bottom pad has to clear the home indicator on mobile web, where
        // safe-pb is inert (no tab bar out here). max() so it never drops
        // below the 12px this bar wants on a phone with no inset at all.
        "fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-night/95 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur safe-pb",
        "md:static md:rounded-lg md:border md:border-paper/10 md:bg-night-soft/60 md:p-6",
      )}
    >
      <div className="mx-auto flex max-w-[560px] items-center justify-between gap-4 md:mx-0 md:flex-col md:items-stretch">
        <div>
          <p className="font-sans text-title-sm font-semibold text-paper">{priceLabel}</p>
          <p className="mt-0.5 font-sans text-caption text-paper/60">
            {inventoryLabel} · {dispatchLabel}
          </p>
          <p className="mt-0.5 font-sans text-caption font-medium text-emerald-300/90">
            {shippingLabel}
          </p>
        </div>

        {purchasable && checkoutOn ? (
          <div className="flex shrink-0 flex-col items-stretch gap-2 md:mt-4">
            <button
              type="button"
              onClick={startCheckout}
              disabled={busy || !agreed}
              className="tap-press inline-flex min-h-[48px] items-center justify-center rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night hover:bg-paper/90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy ? t("shop.openingCheckout") : t("shop.buyNow")}
            </button>
            <button
              type="button"
              onClick={handleAddToCart}
              className={cn(
                "tap-press inline-flex min-h-[44px] items-center justify-center rounded-pill border px-7 font-sans text-ui font-semibold transition-colors",
                added
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                  : "border-paper/25 text-paper hover:border-paper/45",
              )}
            >
              {added ? `${t("shop.addedToCart")} ✓` : t("shop.addToCart")}
            </button>
          </div>
        ) : purchasable ? (
          <div className="flex shrink-0 flex-col items-end gap-1 md:mt-4 md:items-stretch">
            <Link
              href={notifyHref}
              className="tap-press inline-flex min-h-[48px] items-center justify-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper hover:border-paper/45"
            >
              {t("shop.notifyMe")}
            </Link>
            <p className="font-sans text-caption text-paper/60 md:text-center">
              {t("shop.checkoutOpensSoon")}
            </p>
          </div>
        ) : (
          <Link
            href={notifyHref}
            className="tap-press inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper hover:border-paper/45 md:mt-4"
          >
            {t("shop.requestThisIcon")}
          </Link>
        )}
      </div>
      {purchasable && checkoutOn ? (
        <label className="mx-auto mt-2 flex max-w-[560px] cursor-pointer items-start gap-2.5 md:mx-0">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
          />
          <span className="font-sans text-caption leading-[1.5] text-paper/60">
            {t("ui.iAgreeToThe")}{" "}
            <Link
              href="/terms"
              className="underline underline-offset-2 hover:text-paper/80"
            >
              {t("shop.terms")}
            </Link>{" "}
            {t("ui.andThe")}{" "}
            <Link
              href="/shop/policies"
              className="underline underline-offset-2 hover:text-paper/80"
            >
              {t("shop.shippingRefundPolicy")}
            </Link>
            .
          </span>
        </label>
      ) : null}
      {error ? (
        <p role="alert" className="mx-auto mt-2 max-w-[560px] font-sans text-caption text-crimson-soft md:mx-0">
          {error}
        </p>
      ) : null}
    </div>
  );
}
