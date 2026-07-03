// Timeline scroll restoration. Anchor-based, not pixel-based: we remember
// which event card was at the top of the viewport (plus a small offset), and
// on return scroll that card back into place. Anchors survive filter-induced
// height changes and virtualized rendering, where a raw scrollY would not.
//
// Two storage tiers:
//  - sessionStorage: browser-session semantics (Back/Forward, reload) — the
//    web expectation.
//  - localStorage mirror: cold-start resume for the native shell (process
//    death, app relaunch) and the "Continue exploring" entry point.
//
// Both writes are fire-and-forget; every read is validated and TTL-bound.

const SCROLL_KEY = "purify.history.scroll";
const TTL_MS = 24 * 60 * 60 * 1000; // 1 day — a stale position surprises

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
