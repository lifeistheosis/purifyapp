"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CartDealTag, FreeShippingMeter } from "@/components/shop/CartSignals";
import { ProductRail } from "@/components/shop/ProductRail";
import { Minus } from "@/components/ui/icons/Minus";
import { Plus } from "@/components/ui/icons/Plus";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { hasActiveProClient } from "@/lib/entitlements/client";
import { useIsNative } from "@/lib/platform/native";
import {
  clearCart,
  removeFromCart,
  setCartQuantity,
  useCart,
} from "@/lib/shop/cart";
import { previewCart } from "@/lib/shop/cartPricing";
import { getCartToken } from "@/lib/shop/cartSync";
import { fetchShopConfig, fetchShopProducts } from "@/lib/shop/catalogClient";
import { formatPrice } from "@/lib/shop/format";
import { closeNativeCheckout, openStripe } from "@/lib/shop/openStripe";
import { productHref } from "@/lib/shop/productHref";
import { useAsyncData } from "@/lib/shop/useAsyncData";
import { useCartInsights, useServerClock } from "@/lib/shop/useCartInsights";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SecureCheckoutNote } from "./SecureCheckoutNote";
import { OrderBump } from "./OrderBump";
import { pickOrderBump } from "@/lib/shop/addOn";

/**
 * The cart. Local until the moment of checkout: items live on the device,
 * and the server re-prices every line from the database when the buyer
 * commits, so the subtotal here is a preview, never an invoice. One
 * store, one checkout, one shipping charge.
 *
 * Redrawn 2026-09-30 ("faster cart"). The summary used to be a panel fixed
 * to the foot of a phone, eight rows tall, that covered half the screen and
 * the "Pairs well with" row under it. It now sits in the page after the
 * items (beside them on md+, where it stays in view), and a one-line bar
 * with the total and Check out appears only while the summary is scrolled
 * out of sight. Check out is never greyed: a tap without the agreement
 * lights the checkbox and says why, as on the product page.
 */
export function CartClient() {
  const { t, tn } = useTranslate();
  const router = useRouter();
  const items = useCart();
  const native = useIsNative();
  const { data: config } = useAsyncData(fetchShopConfig, []);
  // Display-only: reflects the buyer's real Pro shipping perk. Fails open to
  // false (the server re-decides shipping at checkout either way), so a
  // jammed auth lock never blocks the cart. See hasActiveProClient.
  const { data: pro } = useAsyncData(hasActiveProClient, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [nudge, setNudge] = useState(false);
  const agreeRef = useRef<HTMLInputElement | null>(null);
  // The phone's one-line bar shows only while the summary's own Check out
  // button is out of view.
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const checkoutRef = useRef<HTMLButtonElement | null>(null);
  const [checkoutVisible, setCheckoutVisible] = useState(true);
  const hasItems = items.length > 0;
  useEffect(() => {
    const el = checkoutRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    // Whole, not merely touching: with two lines in the cart the button's
    // top edge sits two pixels inside a 390x844 screen, which is not a
    // button anyone can see.
    const io = new IntersectionObserver(([entry]) => setCheckoutVisible(entry.intersectionRatio >= 0.99), {
      threshold: [0, 1],
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasItems]);
  // One offer per visit to the cart: once something is added from it, the
  // card does not come back with the next candidate.
  const [bumped, setBumped] = useState(false);

  const currency = items[0]?.currency ?? "usd";

  // Deals live on this cart, and what they do to the total. A preview of what
  // checkout recomputes from the database; see lib/shop/cartPricing.ts.
  const { insights, skewMs } = useCartInsights(items.map((i) => i.slug), items.length > 0);
  const hasDeals = Boolean(insights && Object.keys(insights.deals).length > 0);
  const now = useServerClock(hasDeals, skewMs);
  const preview = previewCart(items, insights?.deals, now);
  const subtotal = preview.subtotalCents;
  const threshold = config?.freeShippingThresholdCents ?? null;
  const shipsFree = !pro && threshold != null && threshold > 0 && subtotal >= threshold;

  // Pairs well with: the rest of the shop that is not already in the cart,
  // best sellers first. One read of the catalogue the grid already caches.
  const inCart = new Set(items.map((i) => i.slug));
  const { data: catalogue } = useAsyncData(() => fetchShopProducts({ limit: 24 }), []);
  const pairs = (catalogue ?? [])
    .filter((p) => !inCart.has(p.slug) && p.inventory_status !== "out_of_stock")
    .sort((a, b) => (b.units_sold ?? 0) - (a.units_sold ?? 0))
    .slice(0, 8);
  // The order bump: one piece from the same store, sized to the cart
  // (lib/shop/addOn.ts).
  const bump = bumped ? null : pickOrderBump(catalogue ?? [], inCart, subtotal);

  function askForAgreement() {
    setError(t("shop.agreeTermsFirst"));
    setNudge(true);
    agreeRef.current?.focus({ preventScroll: true });
    window.setTimeout(() => setNudge(false), 1400);
  }

  async function checkout() {
    if (!agreed) {
      askForAgreement();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productSlug: i.slug, quantity: i.quantity })),
          termsAccepted: true,
          // Names this device's cart so checkout can honour a cart deal. It
          // carries no price; the server recomputes every deal itself.
          cartToken: getCartToken(),
        }),
      });
      const data = (await res.json()) as { url?: string; orderId?: string; error?: string };
      if (res.ok && data.url) {
        // Native: on close, paid goes to the orders (and empties this device's
        // cart, which the success page could not reach from the in-app
        // browser), and an abandoned checkout is cancelled and stays here.
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

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[680px] px-5 pb-16 md:px-8">
        <h1 className="pt-10 text-heading text-paper md:pt-14">{t("shop.yourCart")}</h1>
        <p className="mt-6 font-serif text-body text-paper/65 leading-[1.65]">
          {t("shop.nothingHereYetAnythingYou")}
        </p>
        <Link
          href="/shop"
          className="tap-press mt-6 inline-flex min-h-12 items-center rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night hover:bg-paper/90"
        >
          {t("shop.browseTheShop")}
        </Link>
      </div>
    );
  }

  const checkoutOff = config ? !config.checkoutEnabled : false;

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 pb-28 md:px-8 md:pb-16">
      <h1 className="pt-8 text-heading text-paper md:pt-14">
        {t("shop.yourCart")}
      </h1>

      <div className="mt-6 gap-10 md:mt-8 md:grid md:grid-cols-[minmax(0,1fr)_380px] md:items-start">
        <div>
          <ul className="divide-y divide-paper/8 border-y border-paper/8">
            {items.map((item) => (
              <li key={item.slug} className="flex gap-4 py-4">
                <Link
                  href={productHref(item.slug, native)}
                  className="shop-vitrine relative h-24 w-20 shrink-0 overflow-hidden rounded-xl ring-1 ring-inset ring-paper/[0.07] md:h-28 md:w-24"
                >
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.imageAlt ?? item.title}
                      fill
                      sizes="96px"
                      className="object-contain p-2"
                    />
                  ) : null}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={productHref(item.slug, native)}
                      className="line-clamp-2 min-w-0 font-heading text-ui font-bold leading-snug text-paper underline-offset-4 hover:underline md:text-body"
                    >
                      {item.title}
                    </Link>
                    {preview.deals[item.slug] ? (
                      <p className="shrink-0 text-right font-sans text-ui font-semibold tabular-nums text-paper">
                        <span className="block font-sans text-caption font-normal text-paper/45 line-through">
                          {formatPrice(item.priceCents * item.quantity, item.currency)}
                        </span>
                        {formatPrice(preview.deals[item.slug].unitCents * item.quantity, item.currency)}
                      </p>
                    ) : (
                      <p className="shrink-0 font-sans text-ui font-semibold tabular-nums text-paper">
                        {formatPrice(item.priceCents * item.quantity, item.currency)}
                      </p>
                    )}
                  </div>
                  {preview.deals[item.slug] ? (
                    <CartDealTag deal={preview.deals[item.slug]} skewMs={skewMs} />
                  ) : null}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                    <div className="inline-flex items-center rounded-pill border border-paper/15">
                      <button
                        type="button"
                        aria-label={t("shop.reduceQuantityOf", { title: item.title })}
                        onClick={() => setCartQuantity(item.slug, item.quantity - 1)}
                        className="tap-press flex h-9 w-9 items-center justify-center rounded-l-pill text-paper/70 hover:text-paper"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="min-w-[2ch] text-center font-sans text-detail font-semibold tabular-nums text-paper">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={t("shop.increaseQuantityOf", { title: item.title })}
                        onClick={() => setCartQuantity(item.slug, item.quantity + 1)}
                        className="tap-press flex h-9 w-9 items-center justify-center rounded-r-pill text-paper/70 hover:text-paper"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.slug)}
                      className="inline-flex min-h-11 items-center font-sans text-caption font-medium text-paper/50 underline underline-offset-4 hover:text-paper"
                    >
                      {t("prayers.diptychs.remove")}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={clearCart}
            className="mt-2 inline-flex min-h-11 items-center font-sans text-caption font-medium text-paper/45 underline underline-offset-4 hover:text-paper/70"
          >
            {t("shop.clearCart")}
          </button>
        </div>

        {/* The summary: in the page after the items on a phone, beside them
            on md+, where it stays in view. */}
        <div
          ref={summaryRef}
          className="mt-6 rounded-2xl border border-paper/10 bg-night-soft/60 p-5 md:sticky md:top-24 md:mt-0 md:p-6"
        >
          <div className="flex items-baseline justify-between">
            <p className="font-sans text-ui text-paper/70">
              {tn("shop.subtotalItems", items.length)}
            </p>
            <p className="font-sans text-title-sm font-semibold tabular-nums text-paper">
              {formatPrice(subtotal, currency)}
            </p>
          </div>
          {preview.savingsCents > 0 ? (
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <p className="font-sans text-caption font-semibold text-emerald-300">{t("shop.cartDealSaving")}</p>
              <p className="font-sans text-caption font-semibold text-emerald-300">
                {t("shop.cartDealSavingAmount", { amount: formatPrice(preview.savingsCents, currency) })}
              </p>
            </div>
          ) : null}
          {/* Shipping line, honest to the buyer's real Pro status. */}
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <p className="font-sans text-caption text-paper/55">{t("shop.shipping")}</p>
            {pro ? (
              <p className="font-sans text-caption font-semibold text-emerald-300">
                {config ? (
                  <span className="mr-1.5 text-paper/40 line-through">
                    {formatPrice(config.flatShippingCents, currency)}
                  </span>
                ) : null}
                {t("shop.freeWithPurifyPro")}
              </p>
            ) : shipsFree ? (
              <p className="font-sans text-caption font-semibold text-emerald-300">
                {config ? (
                  <span className="mr-1.5 text-paper/40 line-through">
                    {formatPrice(config.flatShippingCents, currency)}
                  </span>
                ) : null}
                {t("shop.freeShippingUnlocked")}
              </p>
            ) : (
              <p className="font-sans text-caption text-paper/70">
                {config
                  ? t("shop.shippingOncePerOrder", {
                      price: formatPrice(config.flatShippingCents, currency),
                    })
                  : t("shop.calculatedAtCheckout")}
              </p>
            )}
          </div>
          {!shipsFree ? (
            <FreeShippingMeter subtotalCents={subtotal} thresholdCents={threshold} currency={currency} pro={pro} />
          ) : null}
          {!pro && !shipsFree ? (
            <Link
              href="/pricing"
              className="mt-1 inline-flex min-h-11 items-center gap-1 font-sans text-caption font-medium text-premium-ink hover:text-premium-bright"
            >
              {t("shop.freeShippingOnEveryOrder")}
            </Link>
          ) : null}

          {bump ? (
            <OrderBump product={bump} heading={t("shop.bumpHeading")} onAdded={() => setBumped(true)} className="mt-3" />
          ) : null}

          <label
            className={cn(
              "mt-4 flex cursor-pointer items-start gap-2.5 rounded-md transition-shadow duration-300",
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

          {error ? (
            <p role="alert" className="mt-2 font-sans text-caption text-crimson-soft">
              {error}
            </p>
          ) : null}

          <button
            ref={checkoutRef}
            type="button"
            onClick={() => void checkout()}
            disabled={busy || checkoutOff}
            className="tap-press mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night hover:bg-paper/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy
              ? t("shop.openingCheckout")
              : checkoutOff
                ? t("shop.checkoutOpensSoonAction")
                : t("shop.checkOut")}
          </button>
          <SecureCheckoutNote className="mt-2.5 w-full justify-center" />
        </div>
      </div>

      {pairs.length > 0 ? (
        <div className="-mx-5 mt-8 md:mx-0 md:mt-14">
          <ProductRail title={t("shop.pairsWellWith")} products={pairs} />
        </div>
      ) : null}

      {/* The phone's one line: the total and Check out, only while the
          summary's own button is out of view. */}
      <div
        inert={checkoutVisible}
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-night/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-300 ease-house safe-pb md:hidden",
          checkoutVisible ? "translate-y-full" : "translate-y-0",
        )}
      >
        <div className="mx-auto flex max-w-[560px] items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-sans text-caption text-paper/60">{tn("shop.subtotalItems", items.length)}</p>
            <p className="font-sans text-title-sm font-semibold tabular-nums text-paper">{formatPrice(subtotal, currency)}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (agreed && !checkoutOff) {
                void checkout();
                return;
              }
              summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
              if (!checkoutOff) askForAgreement();
            }}
            disabled={busy}
            className="tap-press inline-flex min-h-12 shrink-0 items-center justify-center rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night hover:bg-paper/90 disabled:cursor-wait disabled:opacity-70"
          >
            {busy ? t("shop.openingCheckout") : t("shop.checkOut")}
          </button>
        </div>
      </div>
    </div>
  );
}
