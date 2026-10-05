/**
 * Going back puts the reader where their thumb was.
 *
 * The browser restores a page's scroll as a number of pixels. That is the
 * right place only if the page is the same height above that point as it was
 * when the reader left, and a long list here is not: cards off screen are
 * placeholders (`content-visibility: auto`), drawn at a guessed height until
 * they are scrolled to, and a list that has just been put back has not been
 * scrolled at all.
 *
 * Measured on the 1.5.2 export on 2026-10-05, at a phone's size, on the
 * saints list (a card was really 282px and its placeholder 200px): a reader
 * who scrolled 20 saints down, opened one and came back found that saint
 * 1,400px above where they had left it; 40 saints down, 3,022px; 80 saints
 * down, 5,882px, seven screens away. The scroll number was right every time.
 * `scripts/export-walk.mjs` had been reading that number and calling it the
 * reader's place.
 *
 * So the place is remembered as what it is: the link that was tapped, and how
 * far from the top of the screen it sat. Coming back, that link is found
 * again and the page is moved until it sits there. It works whatever the
 * cards' heights turn out to be, and on a list that is fetched after the page
 * arrives (Community), where no pixel count could.
 *
 * Left alone:
 *   - A link that is not part of the page: one in a bar, a sheet or a menu
 *     (anything fixed or sticky). It will not be there, or it will be exactly
 *     where it was, and neither says anything about the page behind it.
 *   - A page left some other way (the tab bar, a button). The browser's
 *     number is all there is, and the placeholders are now sized close to
 *     the real cards so that it lands near (`.cv-card` in app/globals.css).
 *   - The reader. The first touch, wheel or key ends the adjusting at once.
 *
 * No React here, so it can be tested with a stubbed window; the mount is
 * components/nav/ScrollResetBridge.tsx.
 */

/** The tapped link: which one, and where on the screen it was. */
export type Place = { href: string; nth: number; top: number };

/** A tap older than this did not cause the navigation that follows it. */
export const TAP_MS = 15000;

/**
 * How long the page is watched after coming back. A list drawn from the
 * page's own data is there on the first frame; one that is fetched arrives
 * within a second or two. Frames, at about sixty a second.
 */
export const WATCH_FRAMES = 150;

/** The page is left alone once the link has sat still this many frames, and not before `SETTLE_FRAMES`. */
export const STEADY_FRAMES = 6;

/** The browser may put its own number back a few frames late. Stay through that. */
export const SETTLE_FRAMES = 30;

/** How many pages' places are kept. A reader's way back is rarely this deep. */
const KEEP = 24;

const STOP_EVENTS = ["touchstart", "wheel", "keydown", "pointerdown"] as const;

const places = new Map<string, Place>();
let lastTap: { place: Place; from: string; at: number } | null = null;
let stopWatching: (() => void) | null = null;

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/** The page a place belongs to. The query is part of it: a filtered list is another list. */
function address(): string {
  return window.location.pathname + window.location.search;
}

/** True when the link rides in something pinned to the screen rather than in the page. */
function isPinned(el: Element): boolean {
  for (let node: Element | null = el; node && node !== document.body; node = node.parentElement) {
    const position = window.getComputedStyle(node).position;
    if (position === "fixed" || position === "sticky") return true;
  }
  return false;
}

function linksTo(href: string): HTMLAnchorElement[] {
  const out: HTMLAnchorElement[] = [];
  for (const a of Array.from(document.links)) {
    if (a.getAttribute("href") === href) out.push(a as HTMLAnchorElement);
  }
  return out;
}

/** The link the place names, if the page has drawn it. */
function find(place: Place): HTMLAnchorElement | null {
  const same = linksTo(place.href);
  const drawn = (a: HTMLAnchorElement | undefined) => (a && a.getClientRects().length > 0 ? a : null);
  return drawn(same[place.nth]) ?? same.find((a) => a.getClientRects().length > 0) ?? null;
}

/**
 * Call from a capturing `click` listener on the document. Remembers the link
 * under the thumb. Whether it led anywhere is decided when a route commits.
 */
export function noteLinkTap(event: { target: EventTarget | null }): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const target = event.target as Element | null;
  const link = target && typeof target.closest === "function" ? (target.closest("a[href]") as HTMLAnchorElement | null) : null;
  if (!link) return;
  const href = link.getAttribute("href");
  // A place on this page, or somewhere outside the app, leaves no page behind.
  if (!href || href.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(href)) return;
  if (isPinned(link)) {
    lastTap = null;
    return;
  }
  lastTap = {
    place: { href, nth: Math.max(0, linksTo(href).indexOf(link)), top: link.getBoundingClientRect().top },
    from: address(),
    at: now(),
  };
}

/**
 * Call when a page opened by going forward has committed. The link that was
 * tapped on the page just left becomes that page's place.
 */
export function keepPlace(): void {
  const tap = lastTap;
  lastTap = null;
  if (!tap || now() - tap.at > TAP_MS) return;
  places.delete(tap.from);
  places.set(tap.from, tap.place);
  while (places.size > KEEP) {
    const oldest = places.keys().next().value;
    if (oldest === undefined) break;
    places.delete(oldest);
  }
}

/** Ends the adjusting. Safe to call at any time. */
export function endReturn(): void {
  stopWatching?.();
}

/**
 * Call when a page reached by going back has committed. If the reader left
 * it by a link, moves the page until that link is where their thumb was.
 * Returns whether it had a place to return to, for the test and nothing else.
 */
export function returnToPlace(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  lastTap = null;
  endReturn();
  const key = address();
  const place = places.get(key);
  if (!place) return false;
  places.delete(key);

  let frames = 0;
  let steady = 0;
  let frame = 0;
  let done = false;
  function stop() {
    if (done) return;
    done = true;
    if (frame) window.cancelAnimationFrame(frame);
    for (const type of STOP_EVENTS) window.removeEventListener(type, stop);
    if (stopWatching === stop) stopWatching = null;
  }
  function look() {
    if (done) return;
    frames += 1;
    const link = find(place!);
    if (link) {
      const off = link.getBoundingClientRect().top - place!.top;
      if (Math.abs(off) > 1) {
        // At once, whatever the page's own scroll behaviour says: this is a
        // correction, not a journey.
        window.scrollBy({ top: off, left: 0, behavior: "instant" as ScrollBehavior });
        steady = 0;
      } else {
        steady += 1;
      }
    }
    if (frames >= WATCH_FRAMES || (steady >= STEADY_FRAMES && frames >= SETTLE_FRAMES)) {
      stop();
      return;
    }
    frame = window.requestAnimationFrame(look);
  }
  // The reader's own hand ends it: passive, and never preventing anything.
  for (const type of STOP_EVENTS) window.addEventListener(type, stop, { passive: true });
  stopWatching = stop;
  // Once now, before the page is painted, then frame by frame.
  look();
  return true;
}

/** Test seam. */
export function resetReturnPlaceForTests(): void {
  endReturn();
  places.clear();
  lastTap = null;
  stopWatching = null;
}
