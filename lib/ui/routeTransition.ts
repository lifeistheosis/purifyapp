/**
 * Route-exit flag: the outgoing half of a tab switch.
 *
 * `app/(app)/template.tsx` gives an ENTRANCE only. React does not keep the
 * outgoing tree mounted across a navigation, so "the old screen fades out"
 * cannot be expressed as a component animation; by the time the destination
 * renders there is nothing left to animate. This is the other half.
 *
 * `MobileTabBar` calls `beginRouteExit()` in its tap handler, which sets
 * `document.body.dataset.routeExit`. globals.css then fades
 * `[data-route-content]`, which is the `<main>` in the (app) layout and the
 * Today wrapper in app/page.tsx. Both are SIBLINGS of the tab bar, so the bar
 * and its selected state never move. `<RouteExitBridge />` in the root layout
 * clears the flag the moment the destination commits.
 *
 * Two independent clears, on purpose. A navigation that never commits (a
 * suspended route, a dropped chunk on a bad connection, the app backgrounded
 * mid-tap) must never be able to leave a reader looking at a blank screen, and
 * a pathname watcher alone cannot promise that. The watchdog is the floor.
 *
 * Not React state. The flag has to be set in the same tick as the tap, before
 * React schedules the transition, or the exit visibly lags the press on a
 * mid-range phone. That is the same reason `lib/ui/overlay.ts` writes a body
 * attribute rather than holding state.
 */

/**
 * Hard ceiling on how long content may sit faded out. Five exit durations is
 * well past the p95 of a prefetched client navigation and still short enough
 * that a stall reads as a slow load rather than a broken app.
 */
const WATCHDOG_MS = 700;

let watchdog: ReturnType<typeof setTimeout> | null = null;

export function beginRouteExit(): void {
  if (typeof document === "undefined") return;
  document.body.dataset.routeExit = "1";
  // One timer, always. A second tap during the fade resets it rather than
  // stacking another, which is part of why rapid tapping cannot pile up.
  if (watchdog) clearTimeout(watchdog);
  watchdog = setTimeout(endRouteExit, WATCHDOG_MS);
}

export function endRouteExit(): void {
  if (typeof document === "undefined") return;
  if (watchdog) {
    clearTimeout(watchdog);
    watchdog = null;
  }
  delete document.body.dataset.routeExit;
}

export function isRouteExiting(): boolean {
  if (typeof document === "undefined") return false;
  return document.body.dataset.routeExit === "1";
}
