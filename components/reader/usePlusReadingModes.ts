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
// free to every reader, and so is True black since 1.6; see FREE_THEMES in
// lib/reader/readingModes.ts for the commitments that say so. Ask
// `allows(theme)` rather than reading a single boolean, or a free palette
// goes back behind a paywall the moment someone refactors.
//
// While the surface's enforcement flag is off the answer is `allowed`
// synchronously: no query, no flicker. Where it is on, the account's
// `plusFeatures` entitlement is asked for; while the answer is on its way
// the paid themes are NOT yet `locked`, so callers don't flash an upsell at
// someone who is actually entitled.
//
// ONE ANSWER FOR THE WHOLE APP (build 93 note 3). Every caller of this hook
// reads the same answer, held in one place (lib/reader/plusModesGate.ts,
// which tells the story): the part that dresses the app can no longer say no
// while the page a reader is tapping says yes. It is asked again whenever it
// can have changed:
//
//   - a purchase or a restore (lib/entitlements/refresh.ts), as before;
//   - a sign-in or a sign-out. A sign-in steps to the next page without
//     loading the app again, so nothing else would notice it;
//   - the signal coming back: an answer asked for with no signal is a no;
//   - the app coming back to the front, where a subscription bought or ended
//     on another device shows;
//   - and any part appearing, as each part always asked, unless the answer
//     is only a moment old.

import { useCallback, useSyncExternalStore } from "react";

import { clientSurface, getClientEntitlements } from "@/lib/entitlements/client";
import { plusEnforcedFor } from "@/lib/entitlements/entitlements";
import { onEntitlementsChanged } from "@/lib/entitlements/refresh";
import { PLUS_MODES_ASKING, PLUS_MODES_OPEN, createPlusModesGate, type PlusModes } from "@/lib/reader/plusModesGate";
import { isFreeTheme, type ReadingTheme } from "@/lib/reader/readingModes";
import { createClient } from "@/lib/supabase/client";

export type PlusReadingModesGate = {
  /** May THIS palette be applied right now? Always true for a free theme. */
  allows: (theme: ReadingTheme) => boolean;
  /** May the paid palettes be applied right now? */
  allowed: boolean;
  /** Definitively not entitled to the paid palettes (resolved, and the answer
   * was no): show the quiet Purify Plus upsell. False while still resolving. */
  locked: boolean;
};

/** What this device last heard, "1" or "0": a reader it last knew to have Plus keeps their palette while it asks. */
export const PLUS_MODES_KEPT_KEY = "purify.reader.plusModes";

const gate = createPlusModesGate({
  // The enforcement flags are compile-time constants; the surface is not
  // always known at the first moment of a shell (clientSurface says why), so
  // it is asked each time. The surface is three-valued, not a boolean, so iOS
  // cannot reach Android's launch switch.
  enforced: () => plusEnforcedFor(clientSurface()),
  ask: () => getClientEntitlements().then((e) => e.plusFeatures),
  recall: () => {
    try {
      const kept = window.localStorage.getItem(PLUS_MODES_KEPT_KEY);
      return kept === "1" ? true : kept === "0" ? false : null;
    } catch {
      return null;
    }
  },
  remember: (answer) => {
    // An answer got with no signal says the reader could not be asked, not
    // that they have no Plus: it is not kept for the next opening.
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    try {
      window.localStorage.setItem(PLUS_MODES_KEPT_KEY, answer ? "1" : "0");
    } catch {
      /* no storage: the next opening asks with nothing kept */
    }
  },
});

let listening = false;

/** The moments the answer can change, listened for once, for as long as the app is open. */
function listen(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  onEntitlementsChanged(() => void gate.refresh(true));
  try {
    createClient().auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      // On a timer: the asking reads the session, and this runs inside the
      // auth lock (lib/profile/myPicture.ts says why that must wait).
      window.setTimeout(() => void gate.refresh(true), 0);
    });
  } catch {
    /* no account client: the other moments still ask */
  }
  window.addEventListener("online", () => void gate.refresh(true));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void gate.refresh();
  });
}

function subscribe(changed: () => void): () => void {
  listen();
  const stop = gate.subscribe(changed);
  // A part that appears asks, as each part always did.
  void gate.refresh();
  return stop;
}

// The page as the server drew it, which the first client render has to agree
// with: the server is always "web" (clientSurface).
const serverAnswer = (): PlusModes => (plusEnforcedFor("web") ? PLUS_MODES_ASKING : PLUS_MODES_OPEN);

export function usePlusReadingModes(): PlusReadingModesGate {
  const paid = useSyncExternalStore(subscribe, gate.get, serverAnswer);
  // `allows` is derived, because whether a palette is permitted depends on
  // the palette.
  const allows = useCallback(
    (theme: ReadingTheme) => isFreeTheme(theme) || paid.allowed,
    [paid.allowed],
  );

  return { allows, allowed: paid.allowed, locked: paid.locked };
}
