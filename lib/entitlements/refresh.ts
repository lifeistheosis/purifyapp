"use client";

/**
 * A purchase changes what the reader is entitled to, and nothing in the app was
 * listening.
 *
 * Every entitlement consumer resolves once, in a mount effect, and then holds
 * that answer: usePlusReadingModes, HistoryTimelinePage, FlorilegiumGate. On top
 * of that usePremiumTier caches the tier in localStorage under
 * "purify:premiumTier" and adopts it before paint. So a reader who bought Plus
 * from the upgrade modal closed the sheet and found the palette still locked,
 * with the confirmation copy telling them it was on. The copy was not wrong
 * about the purchase; the app had simply not asked again.
 *
 * A DOM CustomEvent rather than a store: the listeners are in unrelated trees,
 * several of them mounted above the modal, and this is the idiom the codebase
 * already uses for exactly this shape of cross-tree nudge (see the focus
 * broadcast in lib/onboarding/state.ts).
 *
 * Deliberately carries no payload. A payload would be a second source of truth
 * for entitlement, which is the mistake this file exists downstream of; the
 * event says "ask again", and every listener asks the resolver it already uses.
 */

const EVENT = "purify:entitlements-changed";

/** Tell every entitlement consumer to re-resolve. Safe on the server. */
export function emitEntitlementsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Subscribe. Returns the unsubscribe, so it drops straight into an effect. */
export function onEntitlementsChanged(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}
