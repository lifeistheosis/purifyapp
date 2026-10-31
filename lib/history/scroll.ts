// Timeline scroll restoration. Anchor-based, not pixel-based: we remember
// which event card was at the top of the viewport (plus a small offset), and
// on return scroll that card back into place. Anchors survive filter-induced
// height changes and virtualized rendering, where a raw scrollY would not.
//
// The place is put back on Back alone (a step through history, or a reload of
// the timeline on the web). A fresh visit, from Discover or anywhere, opens at
// the top, and "Continue at ..." (placeToContinue) is the way to the place
// kept from the last visit: put back on every visit, it was a jump the reader
// saw after the page had arrived (the owner's note 66 of build 80).
//
// Two storage tiers:
//  - sessionStorage: browser-session semantics (Back/Forward, reload), the
//    web expectation.
//  - localStorage mirror: cold-start resume for the native shell (process
//    death, app relaunch) and the "Continue exploring" entry point.
//
// Both writes are fire-and-forget; every read is validated and TTL-bound.

const SCROLL_KEY = "purify.history.scroll";
const TTL_MS = 24 * 60 * 60 * 1000; // 1 day, a stale position surprises

export type TimelinePosition = {
  /** Slug of the topmost visible event card. */
  anchorSlug: string;
  /** How far the card's top was above the viewport top line (px). */
  offsetPx: number;
  savedAt: number;
};

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function parse(raw: string | null): TimelinePosition | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<TimelinePosition>;
    if (
      typeof v.anchorSlug !== "string" ||
      !/^[a-z0-9-]+$/.test(v.anchorSlug) ||
      typeof v.offsetPx !== "number" ||
      typeof v.savedAt !== "number"
    ) {
      return null;
    }
    if (Date.now() - v.savedAt > TTL_MS) return null;
    return { anchorSlug: v.anchorSlug, offsetPx: v.offsetPx, savedAt: v.savedAt };
  } catch {
    return null;
  }
}

/**
 * Where the top of the timeline is on the screen: the foot of the pinned era
 * name, under the bar (1.7). The scroll spy reads the reader's place at this
 * line and the restore puts the row back on it, so both follow the pinned
 * name's real size on every width (globals.css, "History": the pin's top is
 * one CSS variable, the bar's height). 120px, the line of the 1.6 cards, when
 * nothing is pinned yet.
 */
export function referenceLine(): number {
  if (!hasWindow()) return 120;
  const head = document.querySelector<HTMLElement>(".history-era-head");
  if (!head) return 120;
  const top = parseFloat(window.getComputedStyle(head).top);
  return (Number.isFinite(top) ? top : 0) + head.offsetHeight;
}

/**
 * Where to scroll so a part of an event's page starts at the foot of the
 * pinned row of parts (components/history/EventPartsNav.tsx, 1.7): the part's
 * place on the page, less the row's pinned top and its height. Worked out
 * here and not left to scrollIntoView, which adds the page's own
 * scroll-padding-top (72px in the apps, globals.css, kept for anchors under
 * the bars) to the part's scroll margin: a tapped Sources landed 74px low,
 * The people still on the row's line, and The people's pill was filled
 * (the export walk, 2026-10-17).
 */
export function partJumpTop({
  scrollY,
  partTop,
  rowTop,
  rowHeight,
}: {
  /** The page's scroll now. */
  scrollY: number;
  /** The part's top on the screen now. */
  partTop: number;
  /** The row's top once pinned: its sticky `top`. */
  rowTop: number;
  rowHeight: number;
}): number {
  return Math.max(0, Math.round(scrollY + partTop - (rowTop + rowHeight)));
}

export function savePosition(anchorSlug: string, offsetPx: number): void {
  if (!hasWindow()) return;
  const value = JSON.stringify({
    anchorSlug,
    offsetPx: Math.round(offsetPx),
    savedAt: Date.now(),
  } satisfies TimelinePosition);
  try {
    sessionStorage.setItem(SCROLL_KEY, value);
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(SCROLL_KEY, value);
  } catch {
    /* ignore */
  }
}

/** Session position first (fresh Back-nav), then the cold-start mirror. */
export function loadPosition(): TimelinePosition | null {
  if (!hasWindow()) return null;
  let session: TimelinePosition | null = null;
  try {
    session = parse(sessionStorage.getItem(SCROLL_KEY));
  } catch {
    /* ignore */
  }
  if (session) return session;
  try {
    return parse(localStorage.getItem(SCROLL_KEY));
  } catch {
    return null;
  }
}

/**
 * The event "Continue at ..." offers, from the place kept: the row the reader
 * had reached on the line. Not when that place is the line's first row still
 * under the pinned name (`offsetPx` above zero): the reader was at the top of
 * the timeline, where the offer led nowhere ("Continue at Pentecost" over
 * Pentecost).
 */
export function placeToContinue(pos: TimelinePosition | null, firstSlug: string | undefined): string | null {
  if (!pos) return null;
  if (pos.anchorSlug === firstSlug && pos.offsetPx > 0) return null;
  return pos.anchorSlug;
}

/** How many frames a put-back place is watched for, at about sixty a second. */
export const RESTORE_WATCH_FRAMES = 60;
/** The watch ends once the row has sat still this many frames... */
export const RESTORE_STEADY_FRAMES = 6;
/** ...and not before this many, through a browser that puts its own number back late. */
export const RESTORE_SETTLE_FRAMES = 12;

const RESTORE_STOP_EVENTS = ["touchstart", "wheel", "keydown", "pointerdown"] as const;

/**
 * Puts the kept row back at its place under the pinned era name, once at the
 * call (from a layout effect, so before the timeline is painted) and then
 * frame by frame while rows around it are first drawn at their real heights
 * (`content-visibility`, globals.css .history-cv), until it has sat still.
 * The reader's own hand ends it at once. Returns the way to end it early (an
 * unmount). The same watch as lib/ui/returnPlace.ts, for a row instead of a
 * link.
 */
export function restorePosition(saved: TimelinePosition): () => void {
  if (!hasWindow()) return () => {};
  const put = (): boolean => {
    const el = document.getElementById(`event-${saved.anchorSlug}`);
    if (!el) return false;
    const off = el.getBoundingClientRect().top - (referenceLine() + saved.offsetPx);
    if (Math.abs(off) <= 1) return true;
    // At once, whatever the page's own scroll behaviour says: a correction,
    // not a journey.
    window.scrollBy({ top: off, left: 0, behavior: "instant" as ScrollBehavior });
    return false;
  };

  let frames = 0;
  let steady = 0;
  let frame = 0;
  let done = false;
  const stop = () => {
    if (done) return;
    done = true;
    if (frame) window.cancelAnimationFrame(frame);
    for (const type of RESTORE_STOP_EVENTS) window.removeEventListener(type, stop);
  };
  const look = () => {
    if (done) return;
    frames += 1;
    steady = put() ? steady + 1 : 0;
    if (frames >= RESTORE_WATCH_FRAMES || (steady >= RESTORE_STEADY_FRAMES && frames >= RESTORE_SETTLE_FRAMES)) {
      stop();
      return;
    }
    frame = window.requestAnimationFrame(look);
  };
  for (const type of RESTORE_STOP_EVENTS) window.addEventListener(type, stop, { passive: true });
  put();
  frame = window.requestAnimationFrame(look);
  return stop;
}

export function clearPosition(): void {
  if (!hasWindow()) return;
  try {
    sessionStorage.removeItem(SCROLL_KEY);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(SCROLL_KEY);
  } catch {
    /* ignore */
  }
}
