"use client";

// The Pro gate for the reading palettes, shared by the theme controller,
// the settings chips, and the toolbar pill.
//
// NOT EVERY PALETTE IS GATED. Light mode is an accessibility setting and is
// free to every reader; see FREE_THEMES in lib/reader/readingModes.ts for the
// commitment that says so. Ask `allows(theme)` rather than reading a single
// boolean, or light mode goes back behind Pro the moment someone refactors.
//
// While the surface's enforcement flag is off (both ship off today) the
// answer is `allowed` synchronously — no query, no flicker, identical to
// how the Plus layer gates. Once the flag flips for a surface, the hook
// resolves the account's `proFeatures` entitlement; during that resolve
// the Pro themes are unavailable but NOT yet `locked`, so callers don't flash
// an upsell at someone who is actually Pro.

import { useCallback, useEffect, useState } from "react";
import { plusEnforcedFor } from "@/lib/entitlements/entitlements";
import { getClientEntitlements, clientSurface } from "@/lib/entitlements/client";
import { isFreeTheme, type ReadingTheme } from "@/lib/reader/readingModes";

export type ProReadingModesGate = {
  /** May THIS palette be applied right now? Always true for a free theme. */
  allows: (theme: ReadingTheme) => boolean;
  /** May the Pro palettes be applied right now? */
  allowed: boolean;
  /** Definitively not entitled to the Pro palettes (resolved, and the answer
   * was no) — show the quiet Purify Pro upsell. False while still resolving. */
  locked: boolean;
};

export function useProReadingModes(): ProReadingModesGate {
  // Enforcement flags are compile-time constants and the surface is stable
  // for the page lifetime, so this branch never changes after mount. SSR
  // renders as "web", which maps to the (off) web flag. The surface is
  // three-valued, not a boolean, so iOS cannot reach Android's launch switch.
  const enforced = plusEnforcedFor(clientSurface());
  // Only the resolved half of the gate is state; `allows` is derived below,
  // because whether a palette is permitted depends on the palette.
  const [pro, setPro] = useState<{ allowed: boolean; locked: boolean }>(() =>
    enforced ? { allowed: false, locked: false } : { allowed: true, locked: false },
  );

  useEffect(() => {
    if (!enforced) return;
    let cancelled = false;
    getClientEntitlements()
      .then((e) => {
        if (!cancelled) setPro({ allowed: e.proFeatures, locked: !e.proFeatures });
      })
      .catch(() => {
        if (!cancelled) setPro({ allowed: false, locked: true });
      });
    return () => {
      cancelled = true;
    };
  }, [enforced]);

  const allows = useCallback(
    (theme: ReadingTheme) => isFreeTheme(theme) || pro.allowed,
    [pro.allowed],
  );

  return { allows, allowed: pro.allowed, locked: pro.locked };
}
