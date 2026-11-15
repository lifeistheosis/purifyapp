/**
 * The picture Now Playing is opened from (build 98 note 8, his word of
 * 2026-11-15: "make the music player opening more smooth"). The house's way
 * is that a card carries its picture into what it opens: the mini player's
 * open buttons note where their picture stands as they are tapped, and Now
 * Playing flies a copy of it from there into the cover's place as it rises
 * (components/player/NowPlayingSheet.tsx). Taken once; a note older than a
 * moment is let go, so a later opening from elsewhere carries nothing.
 */
export type Carried = { left: number; top: number; width: number; height: number; round: boolean };

const FRESH_MS = 700;
let carried: (Carried & { at: number }) | null = null;

/** Notes where the tapped picture stands, or forgets it when there is none. */
export function noteCarryFrom(el: Element | null | undefined): void {
  carried = null;
  if (!el) return;
  const r = el.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return;
  const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
  carried = { left: r.left, top: r.top, width: r.width, height: r.height, round: radius >= Math.min(r.width, r.height) / 2 - 1, at: Date.now() };
}

/** The picture noted for this opening, once, or null. */
export function takeCarry(): Carried | null {
  const c = carried;
  carried = null;
  if (!c || Date.now() - c.at > FRESH_MS) return null;
  return { left: c.left, top: c.top, width: c.width, height: c.height, round: c.round };
}
