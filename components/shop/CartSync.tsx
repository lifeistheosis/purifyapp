"use client";

// Mounted once in the shop layout. Watches the local cart (the same
// "purify:cart" + "storage" events lib/shop/cart already dispatches) and
// debounces a snapshot up to the server for the admin live-cart view. No
// UI. Static-export-safe: client-only, and syncCartSnapshot no-ops
// gracefully when there is no session/origin to reach.

import { useEffect } from "react";
import { getCart } from "@/lib/shop/cart";
import { syncCartSnapshot } from "@/lib/shop/cartSync";

const DEBOUNCE_MS = 1500;

export function CartSync() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      syncCartSnapshot(getCart());
    };

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, DEBOUNCE_MS);
    };

    const onHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };

    // Capture an already-filled cart on mount, then react to changes.
    syncCartSnapshot(getCart());
    window.addEventListener("purify:cart", schedule);
    window.addEventListener("storage", schedule);
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", flush);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("purify:cart", schedule);
      window.removeEventListener("storage", schedule);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  return null;
}
