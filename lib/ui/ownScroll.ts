/**
 * Whether a scroll is the reader's own (1.8, the owner's note 68 of
 * 2026-10-31: the Bible keeps the verse a reader stopped at).
 *
 * The Bible writes the reader's place as they read, and the page is moved by
 * more than their hand: the jump to the top that comes with leaving it (by
 * the tab bar, the way back, any tap), the glide to a verse a link lands on,
 * a place given back on the way back, the verse being read aloud kept in
 * view. Each of those wrote a place of its own until 1.8: verse 1 on every
 * leaving, and the topmost verse on the screen after every landing, so each
 * return walked back three verses. Only the reader's own scroll may move a
 * place, so this says which scrolls those are:
 *
 *  - a finger on the glass that moves the page, and the fling it lets go
 *    into, for as long as the fling runs on without a break. A tap moves
 *    nothing while the finger is down: the jump its link makes comes after
 *    the finger has gone, so it is never the reader's;
 *  - a wheel or a trackpad, for a moment after each turn (a trackpad's own
 *    glide keeps sending them);
 *  - a key that scrolls, for the moment its glide takes;
 *  - the page's scroll bar, while the pointer holds it.
 *
 * scrollAway.ts asks a looser question (any hand on the page lately) for a
 * looser purpose, and the two are kept apart on purpose: there, a tap that
 * leaves the page may count; here it may not.
 *
 * The rule is pure and tested (lib/ui/__tests__/ownScroll.test.ts); the
 * watching is apart from it, in watchOwnScroll().
 */

/** A fling runs on while its scrolls come this close together. */
export const FLING_GAP_MS = 150;
/** A wheel's turn moves the page for this long. */
export const WHEEL_MS = 250;
/** A key's glide takes up to this long. */
export const KEY_MS = 800;

/** What the reader's hand is doing, as far as the rule needs it. */
export type Hand = {
  /** A finger is on the glass. */
  touching: boolean;
  /** The page has moved under it since it came down. */
  moved: boolean;
  /** It let go of a page it moved, which may still be running on. */
  flinging: boolean;
  /** When the last scroll came. */
  lastScroll: number;
  /** When a wheel last turned. */
  wheelAt: number;
  /** When a scrolling key was last pressed. */
  keyAt: number;
  /** The pointer is holding the page's scroll bar. */
  barHeld: boolean;
};

export const IDLE_HAND: Hand = {
  touching: false,
  moved: false,
  flinging: false,
  lastScroll: -Infinity,
  wheelAt: -Infinity,
  keyAt: -Infinity,
  barHeld: false,
};

export type HandEvent =
  | { type: "touchstart" }
  | { type: "touchend" }
  | { type: "wheel"; at: number }
  | { type: "key"; at: number }
  | { type: "bar"; held: boolean };

/** The hand, after something it did. */
export function handAfter(hand: Hand, e: HandEvent): Hand {
  switch (e.type) {
    // A new touch stops a fling, as it does on the glass.
    case "touchstart":
      return { ...hand, touching: true, moved: false, flinging: false };
    case "touchend":
      return { ...hand, touching: false, moved: false, flinging: hand.moved };
    case "wheel":
      return { ...hand, wheelAt: e.at };
    case "key":
      return { ...hand, keyAt: e.at };
    case "bar":
      return { ...hand, barHeld: e.held };
  }
}

/** Whether a scroll that came at `now` is the reader's, and the hand after it. */
export function scrollBy(hand: Hand, now: number): { own: boolean; hand: Hand } {
  const fling = hand.flinging && now - hand.lastScroll <= FLING_GAP_MS;
  const own =
    hand.touching ||
    fling ||
    now - hand.wheelAt <= WHEEL_MS ||
    now - hand.keyAt <= KEY_MS ||
    hand.barHeld;
  return {
    own,
    hand: { ...hand, lastScroll: now, moved: hand.moved || hand.touching, flinging: fling },
  };
}

/** The keys that scroll a page, when nothing that takes them is focused. */
const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Spacebar"]);

/** Whether a key press scrolls the page, rather than typing or pressing a button. */
export function scrollsPage(key: string, target: { tagName?: string; isContentEditable?: boolean } | null): boolean {
  if (!SCROLL_KEYS.has(key)) return false;
  const tag = (target?.tagName ?? "").toUpperCase();
  if (target?.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return false;
  // Space presses a focused button or link; it does not scroll.
  if ((key === " " || key === "Spacebar") && (tag === "BUTTON" || tag === "A" || tag === "SUMMARY")) return false;
  return true;
}

/**
 * Watches the window and calls `onScroll` for every scroll, saying whether it
 * was the reader's own. Answers the way to stop.
 */
export function watchOwnScroll(onScroll: (own: boolean) => void): () => void {
  let hand = IDLE_HAND;
  const passive = { passive: true } as const;
  const touchstart = () => {
    hand = handAfter(hand, { type: "touchstart" });
  };
  const touchend = () => {
    hand = handAfter(hand, { type: "touchend" });
  };
  const wheel = () => {
    hand = handAfter(hand, { type: "wheel", at: performance.now() });
  };
  const keydown = (e: KeyboardEvent) => {
    if (scrollsPage(e.key, e.target as HTMLElement | null)) hand = handAfter(hand, { type: "key", at: performance.now() });
  };
  // The page's own scroll bar: a press on the document itself, not on
  // anything drawn in it.
  const pointerdown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.target === document.documentElement) hand = handAfter(hand, { type: "bar", held: true });
  };
  const pointerup = () => {
    if (hand.barHeld) hand = handAfter(hand, { type: "bar", held: false });
  };
  const scroll = () => {
    const next = scrollBy(hand, performance.now());
    hand = next.hand;
    onScroll(next.own);
  };
  window.addEventListener("touchstart", touchstart, passive);
  window.addEventListener("touchend", touchend, passive);
  window.addEventListener("touchcancel", touchend, passive);
  window.addEventListener("wheel", wheel, passive);
  window.addEventListener("keydown", keydown);
  window.addEventListener("pointerdown", pointerdown, passive);
  window.addEventListener("pointerup", pointerup, passive);
  window.addEventListener("pointercancel", pointerup, passive);
  window.addEventListener("scroll", scroll, passive);
  return () => {
    window.removeEventListener("touchstart", touchstart);
    window.removeEventListener("touchend", touchend);
    window.removeEventListener("touchcancel", touchend);
    window.removeEventListener("wheel", wheel);
    window.removeEventListener("keydown", keydown);
    window.removeEventListener("pointerdown", pointerdown);
    window.removeEventListener("pointerup", pointerup);
    window.removeEventListener("pointercancel", pointerup);
    window.removeEventListener("scroll", scroll);
  };
}
