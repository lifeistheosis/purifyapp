"use client";

// A slide-in cart panel, mounted once in the shop layout so it's reachable on
// every shop screen. Opens on "Add to cart" (openCartDrawer) or from a cart
// trigger. Shows the line items, live subtotal, and quantity controls; the
// actual multi-item checkout lives on /shop/cart (with the clickwrap), so the
// drawer's primary action routes there.

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/ui/overlay";

import { Minus } from "@/components/ui/icons/Minus";
import { Plus } from "@/components/ui/icons/Plus";
import { cn } from "@/lib/cn";
import {
  cartCount,
  cartSubtotalCents,
  removeFromCart,
  setCartQuantity,
  subscribeCartOpen,
  useCart,
} from "@/lib/shop/cart";
import { formatPrice } from "@/lib/shop/format";
import { useTranslate } from "@/components/i18n/MessagesProvider";

export function CartDrawer() {
  const { t } = useTranslate();
  const items = useCart();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Open on request (add-to-cart / cart trigger).
  useEffect(() => subscribeCartOpen(() => setOpen(true)), []);

  // Escape closes; lock the body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    lockBodyScroll();
    return () => {
      window.removeEventListener("keydown", onKey);
      unlockBodyScroll();
    };
  }, [open]);

  const subtotal = cartSubtotalCents(items);
  const currency = items[0]?.currency ?? "usd";
  const count = cartCount(items);

  return (
    <>
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        aria-label={t("shop.cart")}
        aria-hidden={!open}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col bg-night shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <p className="font-display-serif text-title-sm text-paper">
            {t("shop.yourCart")}
            {count > 0 ? <span className="text-paper/50"> · {count}</span> : null}
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("shop.closeCart")}
            className="tap-press flex h-9 w-9 items-center justify-center rounded-full text-paper/60 hover:bg-paper/10 hover:text-paper"
          >
            <CloseIcon />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="font-serif text-body text-paper/60">
              {t("shop.yourCartIsEmpty")}
            </p>
            <Link
              href="/shop"
              onClick={() => setOpen(false)}
              className="tap-press inline-flex min-h-[44px] items-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night hover:bg-paper/90"
            >
              {t("shop.browseTheShop")}
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {items.map((item) => (
                <li
                  key={item.slug}
                  className="flex gap-3 rounded-xl border border-paper/10 bg-night-soft/60 p-3"
                >
                  <Link
                    href={`/shop/icons/${item.slug}`}
                    onClick={close}
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-paper/[0.04]"
                  >
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.imageAlt ?? item.title}
                        fill
                        sizes="64px"
                        className="object-contain p-1"
                      />
                    ) : null}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/shop/icons/${item.slug}`}
                        onClick={close}
                        className="min-w-0 truncate font-sans text-detail font-semibold text-paper underline-offset-4 hover:underline"
                      >
                        {item.title}
                      </Link>
                      <p className="shrink-0 font-sans text-detail font-semibold text-paper">
                        {formatPrice(item.priceCents * item.quantity, item.currency)}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="inline-flex items-center rounded-pill border border-paper/15">
                        <button
                          type="button"
                          aria-label={`Reduce quantity of ${item.title}`}
                          onClick={() => setCartQuantity(item.slug, item.quantity - 1)}
                          className="tap-press flex h-8 w-8 items-center justify-center rounded-l-pill text-paper/70 hover:text-paper"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="min-w-[2ch] text-center font-sans text-caption font-semibold text-paper">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase quantity of ${item.title}`}
                          onClick={() => setCartQuantity(item.slug, item.quantity + 1)}
                          className="tap-press flex h-8 w-8 items-center justify-center rounded-r-pill text-paper/70 hover:text-paper"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.slug)}
                        className="font-sans text-eyebrow font-medium text-paper/45 underline underline-offset-4 hover:text-paper"
                      >
                        {t("prayers.diptychs.remove")}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-white/8 px-5 py-4 safe-pb">
              <div className="flex items-center justify-between">
                <p className="font-sans text-ui text-paper/70">{t("shop.subtotalX")}</p>
                <p className="font-sans text-title-sm font-semibold text-paper">
                  {formatPrice(subtotal, currency)}
                </p>
              </div>
              <p className="mt-1 font-sans text-caption text-paper/45">
                {t("shop.shippingTaxesCalculatedAtCheckout")}
              </p>
              <Link
                href="/shop/cart"
                onClick={() => setOpen(false)}
                className="tap-press mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night hover:bg-paper/90"
              >
                {t("shop.viewCartCheckOut")}
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function CloseIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
