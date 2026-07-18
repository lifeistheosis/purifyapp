"use client";

// Client helper that mirrors the local cart (lib/shop/cart) up to the
// server for the admin live-cart / abandoned-recovery view. Recovery and
// analytics only: the server never trusts it for money.
//
// A cart token (a client-generated UUID in its own localStorage key) keys
// the server row so guests are covered too; a signed-in session links the
// row to the user server-side. Sending goes through apiFetch so the native
// shell attaches its Bearer token and the correct absolute origin.

import { apiFetch } from "@/lib/api/client";
import { cartSubtotalCents, type CartItem } from "@/lib/shop/cart";

const TOKEN_KEY = "purify:shop.cartToken";

/** Stable per-device cart token; created on first use. */
export function getCartToken(): string {
  try {
    let t = window.localStorage.getItem(TOKEN_KEY);
    if (!t) {
      t = crypto.randomUUID();
      window.localStorage.setItem(TOKEN_KEY, t);
    }
    return t;
  } catch {
    // Storage blocked: a throwaway token still lets the request validate;
    // it just won't be stable across reloads.
    return crypto.randomUUID();
  }
}

/** Fire-and-forget snapshot of the current cart to /api/shop/cart/sync. */
export function syncCartSnapshot(items: CartItem[]): void {
  const payload = {
    cartToken: getCartToken(),
    items: items.map((i) => ({
      slug: i.slug,
      title: i.title,
      quantity: i.quantity,
      unitPriceCents: i.priceCents,
    })),
    subtotalCents: cartSubtotalCents(items),
    currency: items[0]?.currency ?? null,
  };
  // Never let a sync failure surface in the UI; this is a background nicety.
  void apiFetch("/api/shop/cart/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
