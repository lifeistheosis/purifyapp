"use client";

// Persistent floating cart button for the shop on desktop (md+), where there's
// no buyer sub-tab row to carry the cart. On mobile the sticky ShopSubTabs
// "Cart" tab already provides an always-visible cart trigger, so this is
// hidden there. Both open the same CartDrawer.

import { useEffect } from "react";
import { Cart } from "@/components/ui/icons/Cart";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cartCount, openCartDrawer, useCart } from "@/lib/shop/cart";

export function CartFab() {
  const { t, tn } = useTranslate();
  const count = cartCount(useCart());

  // The app-level back-to-top button owns the same bottom-right corner, so the
  // two stacked on top of each other on every shop page. Flag the FAB's
  // presence on <html> while it's mounted; globals.css lifts back-to-top above
  // it (see .back-to-top).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("has-cart-fab");
    return () => root.classList.remove("has-cart-fab");
  }, []);

  return (
    <button
      type="button"
      onClick={openCartDrawer}
      aria-label={count > 0 ? tn("shop.openCartCount", count) : t("shop.openCart")}
      className="tap-press fixed bottom-6 right-6 z-40 hidden h-14 w-14 items-center justify-center rounded-full border border-paper/15 bg-night-soft shadow-xl transition-colors hover:border-gold/50 hover:bg-night md:flex"
    >
      <Cart size={24} className="text-paper" />
      {count > 0 ? (
        <span
          key={count}
          className="badge-bump absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 font-sans text-[11px] font-bold text-night"
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
