"use client";

// React hook over getClientPremiumTier, for nav chrome that shows whether the
// signed-in user already holds Plus/Pro.
//
// A module-level cache (`remembered`) survives client-side remounts, so
// switching tabs no longer flashes the gold "Premium" pill before settling on
// the green "Activated" state: after the first resolve, every later mount
// starts from the known tier. The cache is intentionally NOT read in the
// useState initializer's first paint on a fresh load (it's null then), so SSR
// and hydration still agree on "loading". A "unknown" result (a hung read)
// never overwrites the cache — the pill keeps its last good state instead of
// dropping to Free.

import { useEffect, useState } from "react";
import { getClientPremiumTier, type PremiumTier } from "./client";

let remembered: PremiumTier | null = null;

export function usePremiumTier(): PremiumTier | "loading" {
  const [tier, setTier] = useState<PremiumTier | "loading">(
    remembered ?? "loading",
  );
  useEffect(() => {
    let alive = true;
    getClientPremiumTier().then((t) => {
      if (!alive || t === "unknown") return;
      remembered = t;
      setTier(t);
    });
    return () => {
      alive = false;
    };
  }, []);
  return tier;
}
