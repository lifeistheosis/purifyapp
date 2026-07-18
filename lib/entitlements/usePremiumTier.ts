"use client";

// React hook wrapper over getClientPremiumTier, for nav chrome that shows
// whether the signed-in user already has Plus/Pro ("Activated" badge).
// Starts "loading" so the button can render its neutral state without a
// flash, then settles to the real tier.

import { useEffect, useState } from "react";
import { getClientPremiumTier, type PremiumTier } from "./client";

export function usePremiumTier(): PremiumTier | "loading" {
  const [tier, setTier] = useState<PremiumTier | "loading">("loading");
  useEffect(() => {
    let alive = true;
    getClientPremiumTier().then((t) => {
      if (alive) setTier(t);
    });
    return () => {
      alive = false;
    };
  }, []);
  return tier;
}
