"use client";

// The shopper's live numbers: other carts holding a product, and the deals
// live on their own cart. One poll per surface, paused while the tab is
// hidden, refreshed shortly after the cart changes (the sync route stamps a
// line when it arrives, and the deal clock runs off that stamp).
//
// Fails quiet. A shop page never shows an error because a count could not be
// read; it shows no count.

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api/client";
import { getCartToken } from "@/lib/shop/cartSync";
import type { ShopCartInsights } from "@/lib/shop/types";

const POLL_MS = 60_000;
const AFTER_CART_CHANGE_MS = 2_500;

export type CartInsightsState = {
  insights: ShopCartInsights | null;
  /** serverNow - deviceNow at the last read, for countdowns. */
  skewMs: number;
};

export function useCartInsights(slugs: readonly string[], enabled = true): CartInsightsState {
  const key = [...new Set(slugs)].sort().join(",");
  const [state, setState] = useState<CartInsightsState>({ insights: null, skewMs: 0 });

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let poll: ReturnType<typeof setTimeout> | null = null;
    let soon: ReturnType<typeof setTimeout> | null = null;

    async function read() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      try {
        const q = new URLSearchParams({ token: getCartToken() });
        if (key) q.set("slugs", key);
        const sentAt = Date.now();
        const res = await apiFetch(`/api/shop/cart/insights?${q.toString()}`, { cache: "no-store" });
        if (!res.ok || !alive) return;
        const data = (await res.json()) as ShopCartInsights;
        if (!alive) return;
        const midpoint = (sentAt + Date.now()) / 2;
        setState({ insights: data, skewMs: typeof data.now === "number" ? data.now - midpoint : 0 });
      } catch {
        /* offline, blocked, or the route is not deployed yet: show nothing */
      }
    }

    function loop() {
      poll = setTimeout(async () => {
        await read();
        if (alive) loop();
      }, POLL_MS);
    }

    const onCart = () => {
      if (soon) clearTimeout(soon);
      soon = setTimeout(() => void read(), AFTER_CART_CHANGE_MS);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void read();
    };

    void read();
    loop();
    window.addEventListener("purify:cart", onCart);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      if (poll) clearTimeout(poll);
      if (soon) clearTimeout(soon);
      window.removeEventListener("purify:cart", onCart);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [key, enabled]);

  return state;
}

/** A clock that ticks once a second while `active`, corrected by `skewMs`. */
export function useServerClock(active: boolean, skewMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now + skewMs;
}
