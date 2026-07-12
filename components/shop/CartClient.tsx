"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Minus } from "@/components/ui/icons/Minus";
import { Plus } from "@/components/ui/icons/Plus";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { hasActivePlusClient } from "@/lib/entitlements/client";
import {
  cartSubtotalCents,
  clearCart,
  removeFromCart,
  setCartQuantity,
  useCart,
} from "@/lib/shop/cart";
import { fetchShopConfig } from "@/lib/shop/catalogClient";
import { formatPrice } from "@/lib/shop/format";
import { openStripe } from "@/lib/shop/openStripe";
import { useAsyncData } from "@/lib/shop/useAsyncData";

/**
 * The cart. Local until the moment of checkout: items live on the device,
 * and the server re-prices every line from the database when the buyer
 * commits, so the subtotal here is a preview, never an invoice. One
 * store, one checkout, one shipping charge.
 */
export function CartClient() {
  const router = useRouter();
  const items = useCart();
  const { data: config } = useAsyncData(fetchShopConfig, []);
  // Display-only: reflects the buyer's real Plus shipping perk. Fails open to
  // false (the server re-decides shipping at checkout either way), so a
  // jammed auth lock never blocks the cart. See hasActivePlusClient.
  const { data: plus } = useAsyncData(hasActivePlusClient, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  const subtotal = cartSubtotalCents(items);
  const currency = items[0]?.currency ?? "usd";

  async function checkout() {
    if (!agreed) {
      setError("Please agree to the Terms and shipping & refund policy first.");
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
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (res.ok && data.url) {
        await openStripe(data.url, () => router.push("/shop/orders"));
        return;
      }
      setError(data.error ?? "Checkout isn't available right now.");
    } catch {
      setError("Checkout isn't available right now.");
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[680px] px-5 pb-16 md:px-8">
        <header className="pt-10 md:pt-14">
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
            Purify Shop
          </p>
          <h1 className="mt-2 font-display-serif text-heading text-paper">Your cart</h1>
        </header>
        <p className="mt-8 font-serif text-body text-paper/65 leading-[1.65]">
          Nothing here yet. Anything you add waits on this device until
          you&rsquo;re ready.
        </p>
        <Link
          href="/shop"
          className="tap-press mt-6 inline-flex min-h-[48px] items-center rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night hover:bg-paper/90"
        >
          Browse the shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[680px] px-5 pb-40 md:px-8 md:pb-16">
      <header className="pt-10 md:pt-14">
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/60">
          Purify Shop
        </p>
        <h1 className="mt-2 font-display-serif text-heading text-paper">Your cart</h1>
      </header>

      <ul className="mt-8 space-y-4">
        {items.map((item) => (
          <li
            key={item.slug}
            className="flex gap-4 rounded-xl border border-paper/10 bg-night-soft/60 p-4"
          >
            <Link
              href={`/shop/icons/${item.slug}`}
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-paper/[0.04]"
            >
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.imageAlt ?? item.title}
                  fill
                  sizes="80px"
                  className="object-contain p-1.5"
                />
              ) : null}
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/shop/icons/${item.slug}`}
                  className="min-w-0 truncate font-sans text-ui font-semibold text-paper hover:underline underline-offset-4"
                >
                  {item.title}
                </Link>
                <p className="shrink-0 font-sans text-ui font-semibold text-paper">
                  {formatPrice(item.priceCents * item.quantity, item.currency)}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="inline-flex items-center rounded-pill border border-paper/15">
                  <button
                    type="button"
                    aria-label={`Reduce quantity of ${item.title}`}
                    onClick={() => setCartQuantity(item.slug, item.quantity - 1)}
                    className="tap-press flex h-9 w-9 items-center justify-center rounded-l-pill text-paper/70 hover:text-paper"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="min-w-[2ch] text-center font-sans text-detail font-semibold text-paper">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label={`Increase quantity of ${item.title}`}
                    onClick={() => setCartQuantity(item.slug, item.quantity + 1)}
                    className="tap-press flex h-9 w-9 items-center justify-center rounded-r-pill text-paper/70 hover:text-paper"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.slug)}
                  className="font-sans text-caption font-medium text-paper/50 underline underline-offset-4 hover:text-paper"
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={clearCart}
        className="mt-4 font-sans text-caption font-medium text-paper/45 underline underline-offset-4 hover:text-paper/70"
      >
        Clear cart
      </button>

      {/* Summary: sticky bottom on phones (Airbnb-style commit bar), a card on md+. */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-night/95 px-5 py-4 backdrop-blur safe-pb",
          "md:static md:mt-8 md:rounded-xl md:border md:border-paper/10 md:bg-night-soft/60 md:p-6",
        )}
      >
        <div className="mx-auto max-w-[640px] md:mx-0">
          <div className="flex items-center justify-between">
            <p className="font-sans text-ui text-paper/70">
              Subtotal ({items.length} {items.length === 1 ? "item" : "items"})
            </p>
            <p className="font-sans text-title-sm font-semibold text-paper">
              {formatPrice(subtotal, currency)}
            </p>
          </div>
          {/* Shipping line, honest to the buyer's real Plus status. */}
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <p className="font-sans text-caption text-paper/55">Shipping</p>
            {plus ? (
              <p className="font-sans text-caption font-semibold text-emerald-300">
                {config ? (
                  <span className="mr-1.5 text-paper/40 line-through">
                    {formatPrice(config.flatShippingCents, currency)}
                  </span>
                ) : null}
                Free with Purify Plus
              </p>
            ) : (
              <p className="font-sans text-caption text-paper/70">
                {config
                  ? `${formatPrice(config.flatShippingCents, currency)} · once per order`
                  : "Calculated at checkout"}
              </p>
            )}
          </div>
          {!plus ? (
            <Link
              href="/pricing"
              className="mt-1.5 inline-flex items-center gap-1 font-sans text-caption font-medium text-gold hover:text-gold-pale"
            >
              Free shipping on every order with Purify Plus →
            </Link>
          ) : null}

          <label className="mt-3 flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
            />
            <span className="font-sans text-caption leading-[1.5] text-paper/60">
              I agree to the{" "}
              <Link href="/terms" className="underline underline-offset-2 hover:text-paper/80">
                Terms
              </Link>{" "}
              and the{" "}
              <Link href="/shop/policies" className="underline underline-offset-2 hover:text-paper/80">
                shipping &amp; refund policy
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
            type="button"
            onClick={() => void checkout()}
            disabled={busy || !agreed || (config ? !config.checkoutEnabled : false)}
            className="tap-press mt-3 inline-flex min-h-[48px] w-full items-center justify-center rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night hover:bg-paper/90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy
              ? "Opening checkout…"
              : config && !config.checkoutEnabled
                ? "Checkout opens soon"
                : "Check out"}
          </button>
        </div>
      </div>
    </div>
  );
}
