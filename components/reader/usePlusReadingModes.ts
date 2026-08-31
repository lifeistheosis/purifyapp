"use client";

// The Plus gate for the reading palettes, shared by the theme controller,
// the settings chips, and the toolbar pill.
//
// Premium Reading Modes moved from Pro to Plus on 2026-08-12, by the owner's
// call. The move is a widening and nobody lost anything: `plus` is derived as
// `pro || active(plus_until)` in lib/entitlements/entitlements.ts, so every
// Pro account still satisfies this gate.
//
// NOT EVERY PALETTE IS GATED. Light mode is an accessibility setting and is
// free to every reader; see FREE_THEMES in lib/reader/readingModes.ts for the
// commitment that says so. Ask `allows(theme)` rather than reading a single
// boolean, or light mode goes back behind a paywall the moment someone
// refactors.
//
// While the surface's enforcement flag is off (both ship off today) the
// answer is `allowed` synchronously — no query, no flicker. Once the flag
// flips for a surface, the hook resolves the account's `plusFeatures`
// entitlement; during that resolve the paid themes are unavailable but NOT
// yet `locked`, so callers don't flash an upsell at someone who is actually
// entitled.

import { useCallback, useEffect, useState } from "react";
import { plusEnforcedFor } from "@/lib/entitlements/entitlements";
import { onEntitlementsChanged } from "@/lib/entitlements/refresh";
import { getClientEntitlements, clientSurface } from "@/lib/entitlements/client";
import { isFreeTheme, type ReadingTheme } from "@/lib/reader/readingModes";

export type PlusReadingModesGate = {
  /** May THIS palette be applied right now? Always true for a free theme. */
  allows: (theme: ReadingTheme) => boolean;
  /** May the paid palettes be applied right now? */
  allowed: boolean;
  /** Definitively not entitled to the paid palettes (resolved, and the answer
   * was no) — show the quiet Purify Plus upsell. False while still resolving. */
  locked: boolean;
};

export function usePlusReadingModes(): PlusReadingModesGate {
  // Enforcement flags are compile-time constants and the surface is stable
  // for the page lifetime, so this branch never changes after mount. SSR
  // renders as "web", which maps to the (off) web flag. The surface is
  // three-valued, not a boolean, so iOS cannot reach Android's launch switch.
  const enforced = plusEnforcedFor(clientSurface());
  // Only the resolved half of the gate is state; `allows` is derived below,
  // because whether a palette is permitted depends on the palette.
  const [paid, setPaid] = useState<{ allowed: boolean; locked: boolean }>(() =>
    enforced ? { allowed: false, locked: false } : { allowed: true, locked: false },
  );

  useEffect(() => {
    if (!enforced) return;
    let cancelled = false;
    const resolve = () =>
      getClientEntitlements()
        .then((e) => {
          if (!cancelled)
            setPaid({ allowed: e.plusFeatures, locked: !e.plusFeatures });
        })
        .catch(() => {
          if (!cancelled) setPaid({ allowed: false, locked: true });
        });
    void resolve();
    // A reader who buys Plus from the upgrade modal is standing in the reader
    // with this menu open. Without this the palette they just paid for stays
    // locked until they navigate away and back.
    const off = onEntitlementsChanged(() => void resolve());
    return () => {
      cancelled = true;
      off();
    };
  }, [enforced]);

  const allows = useCallback(
    (theme: ReadingTheme) => isFreeTheme(theme) || paid.allowed,
    [paid.allowed],
  );

  return { allows, allowed: paid.allowed, locked: paid.locked };
}
