"use client";

// Whether this reader has the Plus feature layer, for the places that SHOW a
// Plus feature to everyone and ask for Plus only when it is used.
//
// The owner's rule (2026-09-28, and the 1.4 note before it: "you can see each
// one, and tapping it tells you so"): a Plus feature is never hidden from a
// reader without Plus. It is shown with its Plus mark, and using it opens the
// upgrade sheet named for it (components/billing/UpgradeModal.tsx).
//
// null while unknown. Callers treat unknown as allowed, the FlorilegiumGate
// posture: a subscriber must never meet a lock for a second while the answer
// loads, and a reader without Plus loses nothing by seeing the feature a
// moment before its lock.
//
// plusFeatures is the enforcement-aware answer (lib/entitlements/client.ts),
// so on a surface where Plus cannot be bought yet it is true and nothing is
// locked.
//
// ONE request for the page, not one per caller. getClientEntitlements reads
// the session and a table row each time it is called, and a Bible chapter
// mounts a VerseRow per verse (176 in Psalm 118/119), every one of which
// asks. The answer is shared for a minute and dropped the moment the
// entitlements change (a purchase, a restore).

import { useEffect, useState } from "react";

import { getClientEntitlements } from "@/lib/entitlements/client";
import { onEntitlementsChanged } from "@/lib/entitlements/refresh";

const TTL_MS = 60_000;
let shared: { at: number; answer: Promise<boolean | null> } | null = null;
let listening = false;

/** The Plus answer, shared by every caller on the page. */
export function plusFeaturesNow(): Promise<boolean | null> {
  if (typeof window !== "undefined" && !listening) {
    listening = true;
    onEntitlementsChanged(() => {
      shared = null;
    });
  }
  if (!shared || Date.now() - shared.at > TTL_MS) {
    shared = {
      at: Date.now(),
      answer: getClientEntitlements()
        .then((e) => e.plusFeatures)
        .catch(() => null),
    };
  }
  return shared.answer;
}

export function usePlusFeatures(): boolean | null {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    const resolve = () =>
      void plusFeaturesNow().then((v) => {
        if (alive) setAllowed(v);
      });
    resolve();
    // Re-ask after a purchase, so a lock the reader just paid to lift goes.
    const off = onEntitlementsChanged(() => {
      shared = null;
      resolve();
    });
    return () => {
      alive = false;
      off();
    };
  }, []);
  return allowed;
}
