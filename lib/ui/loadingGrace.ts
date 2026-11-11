/**
 * A page's outline waits a moment before it shows (1.9, build 89 note 4).
 *
 * A route's `loading.tsx` is what Next puts on screen the instant a reader
 * taps, while the page itself is read. In the apps the page is on the phone
 * and is read in a few hundredths of a second, so the outline was a flash:
 * the page left, grey boxes stood for three frames, the page arrived. And
 * once page switches were pictured (lib/ui/routeMotion.ts) it became worse
 * than a flash: the browser pictured the OUTLINE settling in, and React holds
 * the next change until a picture has finished, so the real page was kept
 * back for a third of a second and then cut in. Measured on the export on
 * 2026-11-10, Prayers to Discover: the outline at 57ms, the page at 371ms.
 *
 * So the outline waits. While a reader is on their way to a page, its outline
 * holds off for GRACE_MS (components/ui/AfterAMoment.tsx suspends on the
 * promise below, and a transition that is suspended keeps the page the reader
 * is on). A page that is ready inside the moment arrives as itself, and the
 * outline is never drawn.
 *
 * A page that is not ready gets its outline, and from the week 1.9 was
 * finished the outline arrives as a page does and the page then takes its
 * place under a dissolve: components/nav/RouteTransition.tsx ("A page that
 * is slow to come") and lib/ui/outlineLeave.ts. Both were cuts before.
 *
 * Only on the way to a page. An outline can also be asked for by a page that
 * is already on screen (something in it is being fetched), and that is not a
 * transition: holding off there would leave React with nothing to show. The
 * two are told apart by the address: on the way, the page being rendered is
 * not yet the address in the bar.
 *
 * No React here, so it can be tested; lib/ui/__tests__/loadingGrace.test.ts.
 */

import { samePage } from "./routeMotion";

/**
 * How long an outline holds off. Long enough that a page read from the phone
 * arrives first with room to spare, short enough that a slow page still
 * answers the tap before a reader wonders (a fifth of a second is about
 * where a wait starts to be felt).
 */
export const GRACE_MS = 200;

/** A moment that has passed is not waited again for the same page within this long. */
export const KEEP_MS = 2000;

let moment: { page: string; promise: Promise<void>; at: number } | null = null;

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/**
 * Whether the outline of the page being rendered should hold off: only in a
 * browser, and only while the address in the bar is still the page the
 * reader is leaving.
 */
export function onTheWay(rendering: string, inTheBar: string | null): boolean {
  if (inTheBar === null) return false;
  return !samePage(rendering, inTheBar);
}

/**
 * The moment to wait for this page: one promise for as long as the reader is
 * on their way to it, so every render of the outline waits on the same one.
 */
export function momentFor(page: string): Promise<void> {
  const t = now();
  if (moment && samePage(moment.page, page) && t - moment.at < KEEP_MS) return moment.promise;
  const promise = new Promise<void>((resolve) => {
    setTimeout(resolve, GRACE_MS);
  });
  moment = { page, promise, at: t };
  return promise;
}

/** Test seam. */
export function resetLoadingGraceForTests(): void {
  moment = null;
}
