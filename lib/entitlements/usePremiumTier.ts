"use client";

// React hook over getClientPremiumTier, for nav chrome that shows whether the
// signed-in user already holds Plus/Pro.
//
// Anti-flash: the resolved tier is persisted (module cache + localStorage).
// The initial render is always "loading" so SSR and hydration agree, but a
// useLayoutEffect adopts the cached tier BEFORE the browser paints — so after
// the first ever load, a full page refresh shows "Pro/Plus Activated" on the
// first frame instead of flashing the gold "Premium" pill. A live revalidate
// then runs; a "unknown" result (a hung read) is ignored so a slow/locked
// auth read never drops a real subscriber down to Free.

import { useEffect, useLayoutEffect, useState } from "react";
import { getClientPremiumTier, type PremiumTier } from "./client";

const CACHE_KEY = "purify:premiumTier";
let remembered: PremiumTier | null = null;

// useLayoutEffect on the client, useEffect on the server (avoids the SSR
// warning); the layout variant is what runs before paint.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function isTier(v: unknown): v is PremiumTier {
  return v === "free" || v === "plus" || v === "pro";
}

function readCache(): PremiumTier | null {
  if (remembered) return remembered;
  try {
    const v = window.localStorage.getItem(CACHE_KEY);
    if (isTier(v)) {
      remembered = v;
      return v;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeCache(t: PremiumTier) {
  remembered = t;
  try {
    window.localStorage.setItem(CACHE_KEY, t);
  } catch {
    /* ignore */
  }
}

export function usePremiumTier(): PremiumTier | "loading" {
  const [tier, setTier] = useState<PremiumTier | "loading">("loading");

  // Adopt the cached tier before the first paint, so a refresh doesn't flash.
  useIsoLayoutEffect(() => {
    const cached = readCache();
    if (cached) setTier(cached);
  }, []);

  // Revalidate against the live entitlement.
  useEffect(() => {
    let alive = true;
    getClientPremiumTier().then((t) => {
      if (!alive || t === "unknown") return;
      writeCache(t);
      setTier(t);
    });
    return () => {
      alive = false;
    };
  }, []);

  return tier;
}
