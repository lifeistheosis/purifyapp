"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { addToCart, clearCart, openCartDrawer } from "@/lib/shop/cart";
import { getCartToken } from "@/lib/shop/cartSync";
import { closeNativeCheckout, openStripe } from "@/lib/shop/openStripe";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SecureCheckoutNote } from "./SecureCheckoutNote";

/**
 * Sticky mobile purchase bar (static sidebar block on md+). Three
 * server-decided modes, passed down as props so the client never
 * reasons about entitlement to buy:
 *
 *  - checkout on + purchasable  → real buy button (POST /api/shop/checkout)
 *  - checkout off + purchasable → honest "Checkout opens soon" + Notify me
 *  - not purchasable            → request-interest path only
 *
 * On a phone (redrawn 2026-09-30) the bar holds only what the decision
 * needs: the price and whether it is in hand, the two buttons side by side,
 * and the agreement. It used to stack seven lines and cover a third of the
 * screen. The shipping and dispatch lines and the Stripe note moved up into
 * the page (ProductDetailClient), where there is room for them; the sidebar
 * on md+ still carries all of it.
 *
 * Buy now is never greyed out. A greyed button reads as broken; this one
 * answers a tap without the agreement by lighting the checkbox and saying
 * why. The agreement itself is unchanged: the checkout API refuses an order
 * without it, and records it against the order.
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
  urgencyLabel,
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
  /** "Only 2 left" from lib/shop/stock.ts, or null. Never a guess. */
  urgencyLabel?: string | null;
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
  const [nudge, setNudge] = useState(false);
  const agreeRef = useRef<HTMLInputElement | null>(null);

  function handleAddToCart() {
    addToCart({ slug: productSlug, title, priceCents, currency, imageUrl, imageAlt });
    setAdded(true);
    openCartDrawer();
    setTimeout(() => setAdded(false), 1800);
  }

  async function startCheckout() {
    if (!agreed) {
      setError(t("shop.agreeTermsFirst"));
      setNudge(true);
      agreeRef.current?.focus();
      window.setTimeout(() => setNudge(false), 1400);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The cart token lets checkout honour a cart deal on this product if
        // it has one; it names a cart, never a price.
        body: JSON.stringify({ productSlug, quantity: 1, termsAccepted: true, cartToken: getCartToken() }),
      });
      const data = (await res.json()) as { url?: string; orderId?: string; error?: string };
      if (res.ok && data.url) {
        // Web: redirect. Native: in-app browser; on close, a paid checkout goes
        // to the orders and an abandoned one is cancelled and stays here.
        await openStripe(data.url, () => {
          void closeNativeCheckout(data.orderId).then((outcome) => {
            if (outcome === "left") {
              setError(t("shop.checkoutClosedNothingCharged"));
              return;
            }
            if (outcome === "paid") clearCart();
            router.push("/shop/orders");
          });
        });
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
        "fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-night/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur safe-pb",
        "md:static md:rounded-2xl md:border md:border-paper/10 md:bg-night-soft/60 md:p-6 md:backdrop-blur-none",
      )}
    >
      <div className="mx-auto max-w-[560px] md:mx-0">
        {/* The price, and whether it is in hand. One line on a phone. */}
        <div className="flex items-baseline justify-between gap-3 md:block">
          <p className="shrink-0 font-sans text-title-sm font-semibold tabular-nums text-paper md:text-heading">
            {priceLabel}
          </p>
          <p className="min-w-0 truncate text-right font-sans text-caption text-paper/60 md:mt-1.5 md:whitespace-normal md:text-left md:text-detail">
            {inventoryLabel}
            {urgencyLabel ? <span className="font-semibold text-premium-ink"> · {urgencyLabel}</span> : null}
            <span className="max-md:hidden"> · {dispatchLabel}</span>
          </p>
        </div>
        <p className="mt-1 font-sans text-detail font-medium text-emerald-300/90 max-md:hidden">{shippingLabel}</p>

        {purchasable && checkoutOn ? (
          <>
            {/* Side by side on a phone, Buy now the wider; stacked in the
                sidebar, Buy now first. */}
            <div className="mt-2.5 grid grid-cols-[1fr_1.3fr] gap-2 md:mt-5 md:grid-cols-1 md:gap-2.5">
              <button
                type="button"
                onClick={handleAddToCart}
                className={cn(
                  "tap-press inline-flex min-h-12 items-center justify-center rounded-pill border px-4 font-sans text-ui font-semibold transition-colors md:order-2",
                  added
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                    : "border-paper/25 text-paper hover:border-paper/50",
                )}
              >
                {added ? `${t("shop.addedToCart")} ✓` : t("shop.addToCart")}
              </button>
              <button
                type="button"
                onClick={startCheckout}
                disabled={busy}
                className="tap-press inline-flex min-h-12 items-center justify-center rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-night hover:bg-paper/90 disabled:cursor-wait disabled:opacity-70 md:order-1"
              >
                {busy ? t("shop.openingCheckout") : t("shop.buyNow")}
              </button>
            </div>
            <label
              className={cn(
                "mt-2.5 flex cursor-pointer items-start gap-2.5 rounded-md transition-shadow duration-300",
                nudge && "ring-2 ring-premium/70 ring-offset-4 ring-offset-night",
              )}
            >
              <input
                ref={agreeRef}
                type="checkbox"
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked);
                  if (e.target.checked) setError(null);
                }}
                className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
              />
              <span className="font-sans text-caption leading-[1.5] text-paper/60">
                {t("ui.iAgreeToThe")}{" "}
                <Link href="/terms" className="underline underline-offset-2 hover:text-paper/80">
                  {t("shop.terms")}
                </Link>{" "}
                {t("ui.andThe")}{" "}
                <Link href="/shop/policies" className="underline underline-offset-2 hover:text-paper/80">
                  {t("shop.shippingRefundPolicy")}
                </Link>
                .
              </span>
            </label>
            <div className="mt-3 max-md:hidden">
              <SecureCheckoutNote />
            </div>
          </>
        ) : purchasable ? (
          <div className="mt-2.5 flex items-center justify-between gap-3 md:mt-5 md:flex-col md:items-stretch">
            <p className="font-sans text-caption text-paper/60 md:order-2 md:text-center">
              {t("shop.checkoutOpensSoon")}
            </p>
            <Link
              href={notifyHref}
              className="tap-press inline-flex min-h-12 shrink-0 items-center justify-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper hover:border-paper/50"
            >
              {t("shop.notifyMe")}
            </Link>
          </div>
        ) : (
          <Link
            href={notifyHref}
            className="tap-press mt-2.5 flex min-h-12 w-full items-center justify-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper hover:border-paper/50 md:mt-5"
          >
            {t("shop.requestThisItem")}
          </Link>
        )}
        {error ? (
          <p role="alert" className="mt-2 font-sans text-caption text-crimson-soft">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
