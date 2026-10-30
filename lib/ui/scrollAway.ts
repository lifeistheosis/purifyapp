import { useEffect } from "react";

/**
 * A page's own controls step away while the reader reads on, and come back
 * when they scroll up (1.8, the Bible reader as the owner's pick B of
 * round 2, "The page": "No bar at all, only two round buttons over the page
 * ... The floating pill comes back when you scroll up, with Listen";
 * Homebase/boards/purify-master/variants/02-bible).
 *
 * One attribute on <body> says the controls are away, and app/globals.css
 * does the rest ("The page: the Bible reader with no bar"): the round
 * buttons over the top of the page, the pill at its foot and, in the apps,
 * the tab bar leave together and come back together. Nothing renders while
 * the page scrolls: the attribute is written only when the answer changes.
 * On <body> and not on <html>, because the motion switch is on <html>, and
 * each reduced-motion escape needs it as an ancestor of the rule it quiets.
 *
 * The tab bar is every screen's, and steps away on the reader's alone (the
 * owner's "add everything we left out" of 2026-10-28, with his pick B of the
 * reader's buttons, r18/choose/4-bible-buttons): a second attribute on
 * <body>, SCREEN_ATTR, says the screen that watches is open, and the tab
 * bar's rules in globals.css are keyed on the two. Only that screen mounts
 * this hook (ChapterScreen), and both attributes go with it, so on any other
 * screen the tab bar is as it always was.
 *
 * The rule, and why:
 *  - Down, the reader is reading: after a run of AWAY_AFTER_PX one way, the
 *    controls go. A nudge of a few pixels is not reading on.
 *  - Up, they want something: after BACK_AFTER_PX the controls are back,
 *    sooner than they left, because the wish is felt at once.
 *  - At the top of the chapter they always show: the title and the buttons
 *    are one opening, as the design draws them. Not at its foot: the pill and
 *    its fade would lie over the last lines just as they are read, and the
 *    pager there offers the next chapter already.
 *  - Only the reader's own hand decides. A scroll the page makes by itself
 *    (a verse landed on from a link, a place given back on the way back, the
 *    reading kept in view while it is read aloud, the page moved back to its
 *    new end when the room at its foot shrinks) leaves the controls as they
 *    were, except at the top.
 *
 * The mini player steps aside by the same rule, on every page (1.8, the
 * owner's pick B of r3-05, "the small pill": components/prayers/
 * NowPlayingBar.tsx). It runs a watcher of its own, which answers as the
 * reader's does, so on the reader's screen the two leave and come back
 * together.
 */

/** Down this far, one way, and the controls go. */
export const AWAY_AFTER_PX = 24;
/** Up this far and they are back. */
export const BACK_AFTER_PX = 10;
/** The top of the page, where they always show. */
export const TOP_PX = 64;
/** A scroll this long after the reader's hand last moved is the page's own. */
export const HAND_MS = 1200;
/** A scroll this soon after the page's foot moved is the page's own. */
export const FOOT_SETTLE_MS = 300;

/** Away or not, how far the reader has gone the one way, and from where. */
export type Away = { away: boolean; run: number; y: number };

/**
 * The next answer, from the last one and where the page is now. `byHand` is
 * whether the reader's hand moved it.
 */
export function stepAway(prev: Away, y: number, byHand: boolean): Away {
  if (y <= TOP_PX) return { away: false, run: 0, y };
  if (!byHand) return { away: prev.away, run: 0, y };
  const dy = y - prev.y;
  if (dy === 0) return prev;
  // The run is how far the reader has gone one way; a turn starts it again.
  const run = prev.run !== 0 && Math.sign(dy) === Math.sign(prev.run) ? prev.run + dy : dy;
  const away = run >= AWAY_AFTER_PX ? true : run <= -BACK_AFTER_PX ? false : prev.away;
  return { away, run, y };
}

/** What a reader's own hand on the page sends: a finger, a wheel, a press, a key. */
const HANDS = ["touchstart", "touchmove", "wheel", "pointerdown", "keydown"] as const;

/** Until when every scroll is the page's own, whoever's hand is on the glass. */
let footSettlesAt = -Infinity;

/**
 * Says the room the page keeps at its foot has just changed: the mini player
 * came, went, drew in or came back (app/globals.css, --now-playing-h). Where
 * the room shrinks at the very end of a page, the browser moves the page back
 * to its new end, and that move reads as the reader scrolling up: the mini
 * player would come straight back each time it drew in there, and on the
 * Bible's page the reader's own controls with it. For FOOT_SETTLE_MS from
 * now, every watcher counts a scroll as the page's own.
 */
export function noteFootMoved(): void {
  footSettlesAt = performance.now() + FOOT_SETTLE_MS;
}

/** Watches the window's scroll and says when the answer changes. Answers the way to stop. */
export function watchScrollAway(onChange: (away: boolean) => void): () => void {
  let state: Away = { away: false, run: 0, y: window.scrollY };
  let hand = -Infinity;
  let raf = 0;
  const check = () => {
    raf = 0;
    const now = performance.now();
    const byHand = now - hand <= HAND_MS && now >= footSettlesAt;
    const next = stepAway(state, window.scrollY, byHand);
    if (next.away !== state.away) onChange(next.away);
    state = next;
  };
  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(check);
  };
  const touched = () => {
    hand = performance.now();
  };
  const passive = { passive: true } as const;
  window.addEventListener("scroll", onScroll, passive);
  for (const type of HANDS) window.addEventListener(type, touched, passive);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("scroll", onScroll);
    for (const type of HANDS) window.removeEventListener(type, touched);
  };
}

/** The attribute on <body> that says the page's controls are away. */
export const AWAY_ATTR = "data-reader-away";

/**
 * The attribute on <body> that says the screen whose controls step away is
 * open: the tab bar, which is every screen's, takes its way of leaving and
 * coming back from it, there and nowhere else.
 */
export const SCREEN_ATTR = "data-reader-screen";

/**
 * Mounted once by the screen whose controls step away. The attributes go
 * with the screen, so the next screen opens with its controls, and the tab
 * bar, in sight.
 */
export function useScrollAway(): void {
  useEffect(() => {
    const body = document.body;
    body.setAttribute(SCREEN_ATTR, "");
    const stop = watchScrollAway((away) => {
      if (away) body.setAttribute(AWAY_ATTR, "");
      else body.removeAttribute(AWAY_ATTR);
    });
    return () => {
      stop();
      body.removeAttribute(AWAY_ATTR);
      body.removeAttribute(SCREEN_ATTR);
    };
  }, []);
}
