"use client";

// The Pro gate for Premium Reading Modes, shared by the theme controller,
// the settings-menu chips, and the toolbar pill.
//
// While the surface's enforcement flag is off (both ship off today) the
// answer is `allowed` synchronously — no query, no flicker, identical to
// how the Plus layer gates. Once the flag flips for a surface, the hook
// resolves the account's `proFeatures` entitlement; during that resolve
// the themes are unavailable but NOT yet `locked`, so callers don't flash
// an upsell at someone who is actually Pro.

import { useEffect, useState } from "react";
import { plusEnforcedFor } from "@/lib/entitlements/entitlements";
import { getClientEntitlements, clientSurface } from "@/lib/entitlements/client";

export type ProReadingModesGate = {
  /** May premium themes be applied right now? */
  allowed: boolean;
  /** Definitively not entitled (resolved, and the answer was no) — show
   * the quiet Purify Pro upsell. False while still resolving. */
  locked: boolean;
};

export function useProReadingModes(): ProReadingModesGate {
  // Enforcement flags are compile-time constants and the surface is stable
  // for the page lifetime, so this branch never changes after mount. SSR
  // renders as "web", which maps to the (off) web flag.
  const enforced = plusEnforcedFor(clientSurface());
  const [gate, setGate] = useState<ProReadingModesGate>(() =>
    enforced ? { allowed: false, locked: false } : { allowed: true, locked: false },
  );

  useEffect(() => {
    if (!enforced) return;
    let cancelled = false;
    getClientEntitlements()
      .then((e) => {
        if (!cancelled)
          setGate({ allowed: e.proFeatures, locked: !e.proFeatures });
      })
      .catch(() => {
        if (!cancelled) setGate({ allowed: false, locked: true });
      });
    return () => {
      cancelled = true;
    };
  }, [enforced]);

  return gate;
}
