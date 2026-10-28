"use client";

import { memo, useEffect, useLayoutEffect, useRef } from "react";

import { clockNow, subscribeClock } from "@/lib/player/clock";
import { lineAt, lineParts, wordsOf, type CaptionLine } from "@/lib/player/captions";
import { getAudioSnapshot, type CaptionSource } from "@/lib/prayers/persistentAudioStore";
import { cn } from "@/lib/cn";

/**
 * The words, lit as they are sung or read (1.7, redrawn for 1.8). One
 * component for Now Playing's words (the owner's round 8 B, "the verse being
 * read lit and the rest dim, moving as it reads") and a chant's Sing along
 * (round 9 A, "the words move with the singing, the original under each
 * English line"), so the two read alike, lit by the one clock
 * (lib/player/clock.ts).
 *
 *   - The line being sung is large, bold and white with a soft white glow;
 *     the lines beside it a step back, the rest further. Its words light one
 *     by one as each is reached, where they are the words being sung: a line
 *     read in its English is lit whole, and the sung words under it light
 *     word by word.
 *   - The words move: the line being sung rises to a third of the way down,
 *     unless the reader has just scrolled to look elsewhere. The box scrolls
 *     like any list, so every line can be read with nothing playing.
 *   - The line growing and the one before it shrinking are one smooth move
 *     (First, Last, Invert, Play, as lib/ui/flip.ts does for lists), never a
 *     jump; with motion off, they simply change.
 *   - A tap on a line goes there, once its recording is the one playing.
 *
 * The words are painted from the clock, not from React state: the light
 * glides with the voice, and only the line being sung is touched each frame.
 * Everything is drawn in the page's ink (opacity, never a colour), so on a
 * light palette the words are ink and nothing glows.
 */
const WAIT = 0.36;
/** Where the line being sung stands in the box, from the top. */
const ANCHOR = 0.3;
/** After the reader scrolls the words, they are left alone this long. */
const HANDS_OFF_MS = 4000;
/** The move from one line to the next. */
const MOVE_MS = 520;

type Look = "player" | "page";

/** cubic-bezier(0.22, 1, 0.36, 1), the house curve (--ease-house), for the scroll the script drives. */
function houseEase(p: number): number {
  const cx = 0.66;
  const bx = 3 * (0.36 - 0.22) - cx;
  const ax = 1 - cx - bx;
  const cy = 3;
  const by = -3;
  const ay = 1;
  let t = p;
  for (let i = 0; i < 8; i++) {
    const x = ((ax * t + bx) * t + cx) * t - p;
    const dx = (3 * ax * t + 2 * bx) * t + cx;
    if (Math.abs(x) < 1e-5 || dx === 0) break;
    t -= x / dx;
  }
  t = Math.min(1, Math.max(0, t));
  return ((ay * t + by) * t + cy) * t;
}

function reduced(): boolean {
  return typeof document !== "undefined" && document.documentElement.dataset.motion === "reduce";
}

/** Where the rows that move were, before the line changed. */
type First = { from: number; to: number; nextTop: number; afterTop: number | null; nextShift: number; prevShift: number; nextSize: number; prevSize: number };

// Drawn again only when its words or the line being sung change: the player
// around it draws four times a second, and a chapter is hundreds of words.
export const LiveCaptions = memo(function LiveCaptions({
  source,
  lines,
  timed,
  current,
  live,
  active = true,
  look,
  rtl = false,
  lang,
  onSeek,
  className,
}: {
  /** Every line, as it is drawn: timed or not, the words are the words. */
  source: CaptionSource;
  /** Its timed lines (useSungLines), the same index for the same line. */
  lines: CaptionLine[];
  /** Every line has its time: only then does anything light. */
  timed: boolean;
  /** The line being sung, from the one clock; -1 for none. */
  current: number;
  /** These words' recording is the one in the player. */
  live: boolean;
  /** On the screen (Now Playing's words while they are the view shown). */
  active?: boolean;
  look: Look;
  rtl?: boolean;
  /** The language the words are sung in. */
  lang?: string;
  onSeek: (at: number) => void;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const wordRefs = useRef<(HTMLSpanElement | null)[][]>([]);
  /** The line the page shows lit, and the line whose words were painted last. */
  const shown = useRef(-1);
  const painted = useRef(-1);
  const pending = useRef<First | null>(null);
  const lastHand = useRef(-Infinity);
  const scrolling = useRef(0);
  const flipped = useRef<HTMLElement[]>([]);
  const currentRef = useRef(current);
  const followingRef = useRef(false);
  const following = live && timed && active;

  const parts = (el: HTMLLIElement | null | undefined) => ({
    grow: el?.querySelector<HTMLElement>("[data-sung-grow]") ?? null,
    shift: el?.querySelector<HTMLElement>("[data-sung-shift]") ?? null,
  });

  function measureFirst(from: number, to: number): First | null {
    const next = rowRefs.current[to];
    if (!next || to < 0) return null;
    const prev = from >= 0 ? rowRefs.current[from] : null;
    const after = rowRefs.current[to + 1];
    const size = (el: HTMLElement | null) => (el ? parseFloat(getComputedStyle(el).fontSize) || 0 : 0);
    const n = parts(next);
    const p = parts(prev);
    return {
      from,
      to,
      nextTop: next.offsetTop,
      afterTop: after ? after.offsetTop : null,
      nextShift: n.shift ? n.shift.offsetTop - next.offsetTop : 0,
      prevShift: p.shift && prev ? p.shift.offsetTop - prev.offsetTop : 0,
      nextSize: size(n.grow),
      prevSize: size(p.grow),
    };
  }

  /** Put down a move in progress at once: its rows where they belong. */
  function settleFlip() {
    const els = flipped.current;
    if (!els.length) return;
    flipped.current = [];
    for (const el of els) {
      el.style.transition = "none";
      el.style.transform = "";
      el.style.transformOrigin = "";
    }
    void boxRef.current?.offsetHeight;
    for (const el of els) el.style.transition = "";
  }

  function stopScroll() {
    if (scrolling.current) cancelAnimationFrame(scrolling.current);
    scrolling.current = 0;
  }

  /** The scroll that stands line `i` at the anchor, within what the box can scroll. */
  function targetFor(i: number): number | null {
    const box = boxRef.current;
    const row = rowRefs.current[i];
    if (!box || !row) return null;
    const max = box.scrollHeight - box.clientHeight;
    return Math.max(0, Math.min(max, Math.round(row.offsetTop - box.clientHeight * ANCHOR)));
  }

  function scrollTo(top: number, smooth: boolean) {
    const box = boxRef.current;
    if (!box) return;
    stopScroll();
    const from = box.scrollTop;
    if (!smooth || reduced() || Math.abs(top - from) < 1) {
      box.scrollTop = top;
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / MOVE_MS);
      box.scrollTop = from + (top - from) * houseEase(p);
      scrolling.current = p < 1 ? requestAnimationFrame(step) : 0;
    };
    scrolling.current = requestAnimationFrame(step);
  }

  // The words of the line being sung, painted from the clock; the line about
  // to change measured before React draws it, for the smooth move.
  useEffect(() => {
    if (!following) return;
    const clear = (i: number) => {
      for (const el of wordRefs.current[i] ?? []) {
        if (!el) continue;
        el.style.opacity = "";
        el.style.textShadow = "";
      }
    };
    const unsubscribe = subscribeClock(() => {
      const t = clockNow();
      const cur = lineAt(lines, t);
      if (cur !== shown.current && !pending.current) pending.current = measureFirst(shown.current, cur);
      if (cur !== painted.current) {
        clear(painted.current);
        painted.current = cur;
      }
      if (cur < 0) return;
      const els = wordRefs.current[cur] ?? [];
      lines[cur].words.forEach((w, j) => {
        const el = els[j];
        if (!el) return;
        if (t < w.at) {
          el.style.opacity = String(WAIT);
          el.style.textShadow = "";
          return;
        }
        const since = t - w.at;
        const o = WAIT + (1 - WAIT) * Math.min(1, since / 0.12);
        const glow = Math.exp(-since / 0.5);
        el.style.opacity = o >= 0.999 ? "" : o.toFixed(3);
        el.style.textShadow =
          glow > 0.02 ? `0 0 ${(10 + 10 * glow).toFixed(1)}px rgba(255,255,255,${(0.55 * glow).toFixed(3)})` : "";
      });
    });
    return () => {
      unsubscribe();
      clear(painted.current);
      painted.current = -1;
      pending.current = null;
    };
    // measureFirst reads refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [following, lines]);

  // Another set of words (a version chosen, another track, the English
  // turned off): the line being sung stands in place at once, or the top.
  // Before the line's own effect below, which then has nothing to move.
  useLayoutEffect(() => {
    settleFlip();
    stopScroll();
    shown.current = current;
    pending.current = null;
    const box = boxRef.current;
    if (!box) return;
    const top = active && current >= 0 ? targetFor(current) : null;
    box.scrollTop = top ?? 0;
    // Only a new set of words: the line's own changes are the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  // The line being sung changed: the smooth move, and the box follows.
  useLayoutEffect(() => {
    currentRef.current = current;
    followingRef.current = following;
    const from = shown.current;
    shown.current = current;
    const first = pending.current;
    pending.current = null;
    if (!active || current < 0) {
      // Back before the first line (a seek to the start): to the top.
      if (active && live && from >= 0 && current < 0) scrollTo(0, true);
      return;
    }
    const box = boxRef.current;
    const next = rowRefs.current[current];
    if (!box || !next) return;
    settleFlip();
    const adjacent = first && first.from === from && first.to === current && (current === from + 1 || (from < 0 && current === 0));
    if (adjacent && first && !reduced()) {
      const n = parts(next);
      const prev = from >= 0 ? rowRefs.current[from] : null;
      const p = parts(prev);
      const moves: { el: HTMLElement; transform: string; origin?: string }[] = [];
      const dy = first.nextTop - next.offsetTop;
      if (Math.abs(dy) >= 1) moves.push({ el: next, transform: `translateY(${dy}px)` });
      const grownTo = n.grow ? parseFloat(getComputedStyle(n.grow).fontSize) || 0 : 0;
      if (n.grow && first.nextSize && grownTo && Math.abs(grownTo - first.nextSize) > 0.5) {
        const ltr = getComputedStyle(n.grow).direction !== "rtl";
        moves.push({ el: n.grow, transform: `scale(${first.nextSize / grownTo})`, origin: ltr ? "0 0" : "100% 0" });
      }
      // What is under a line rides on the line: measured from the line's own top.
      const nextShift = n.shift ? first.nextShift - (n.shift.offsetTop - next.offsetTop) : 0;
      if (n.shift && Math.abs(nextShift) >= 1) moves.push({ el: n.shift, transform: `translateY(${nextShift}px)` });
      if (p.grow && first.prevSize) {
        const shrunkTo = parseFloat(getComputedStyle(p.grow).fontSize) || 0;
        if (shrunkTo && Math.abs(shrunkTo - first.prevSize) > 0.5) {
          const ltr = getComputedStyle(p.grow).direction !== "rtl";
          moves.push({ el: p.grow, transform: `scale(${first.prevSize / shrunkTo})`, origin: ltr ? "0 0" : "100% 0" });
        }
      }
      const prevShift = p.shift && prev ? first.prevShift - (p.shift.offsetTop - prev.offsetTop) : 0;
      if (p.shift && Math.abs(prevShift) >= 1) moves.push({ el: p.shift, transform: `translateY(${prevShift}px)` });
      // The rows under the line moved by one amount: those that can be seen
      // are carried back and let go with it.
      const after = rowRefs.current[current + 1];
      if (after && first.afterTop !== null) {
        const d = first.afterTop - after.offsetTop;
        if (Math.abs(d) >= 1) {
          const bottom = box.scrollTop + box.clientHeight + 160;
          for (let i = current + 1; i < rowRefs.current.length; i++) {
            const row = rowRefs.current[i];
            if (!row) continue;
            if (row.offsetTop > bottom) break;
            moves.push({ el: row, transform: `translateY(${d}px)` });
          }
        }
      }
      // Invert, with no transition, then let go: the house curve carries
      // every part home (app/globals.css, "Sung words").
      for (const m of moves) {
        m.el.style.transition = "none";
        if (m.origin) m.el.style.transformOrigin = m.origin;
        m.el.style.transform = m.transform;
      }
      void box.offsetHeight;
      for (const m of moves) {
        m.el.style.transition = "";
        m.el.style.transform = "";
      }
      flipped.current = moves.map((m) => m.el);
    }
    if (performance.now() - lastHand.current > HANDS_OFF_MS) {
      const top = targetFor(current);
      // Arriving (the words just shown, a version just chosen) stands the
      // line in place; a line following the last one glides there.
      if (top !== null) scrollTo(top, from >= 0 || current === 0);
    }
    // targetFor, scrollTo and parts read refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, active, live, timed]);

  // Shown again (Now Playing's words chosen): the line being sung, in place.
  useLayoutEffect(() => {
    if (!active) return;
    const cur = currentRef.current;
    if (cur < 0) return;
    const top = targetFor(cur);
    if (top !== null) scrollTo(top, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // The reader's own scrolling: leave the words where they put them for a
  // while, then, if the words are still being sung, go back to the line.
  // Paused, the words stay where the reader left them.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    let back = 0;
    const hand = () => {
      lastHand.current = performance.now();
      stopScroll();
      window.clearTimeout(back);
      back = window.setTimeout(() => {
        const cur = currentRef.current;
        if (cur < 0 || !followingRef.current || !getAudioSnapshot().playing) return;
        const top = targetFor(cur);
        if (top !== null) scrollTo(top, true);
      }, HANDS_OFF_MS + 50);
    };
    box.addEventListener("wheel", hand, { passive: true });
    box.addEventListener("touchmove", hand, { passive: true });
    return () => {
      box.removeEventListener("wheel", hand);
      box.removeEventListener("touchmove", hand);
      window.clearTimeout(back);
      stopScroll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => settleFlip(), []);

  const seekable = live && timed;

  return (
    <div
      ref={boxRef}
      data-sung-look={look}
      className={cn("no-scrollbar relative overflow-y-auto overflow-x-hidden overscroll-contain", className)}
      style={{
        maskImage: "linear-gradient(180deg, transparent 0, #000 36px, #000 calc(100% - 64px), transparent 100%)",
        WebkitMaskImage: "linear-gradient(180deg, transparent 0, #000 36px, #000 calc(100% - 64px), transparent 100%)",
      }}
    >
      <ol dir={rtl ? "rtl" : undefined} className="pb-24 pt-9">
        {source.map((line, i) => {
          const { main, under } = lineParts(line);
          const state = current < 0 ? "rest" : i === current ? "lit" : Math.abs(i - current) === 1 ? "near" : "far";
          const said = timed ? lines[i].words.map((w) => w.text) : wordsOf(line.text);
          const sung = (
            <>
              {said.map((word, j) => (
                <span
                  key={j}
                  ref={(el) => {
                    (wordRefs.current[i] ??= [])[j] = el;
                  }}
                >
                  {word}
                  {j < said.length - 1 ? " " : ""}
                </span>
              ))}
            </>
          );
          const body = (
            <>
              <span data-sung-main dir="auto" lang={main.sung ? lang : "en"} className="block">
                <span data-sung-grow className="block">
                  {main.sung ? sung : main.text}
                </span>
              </span>
              {under.length ? (
                <span data-sung-shift className="block">
                  <span data-sung-under className="block">
                    {under.map((u, k) => (
                      <span
                        key={k}
                        dir="auto"
                        lang={u.sung ? lang : lang ? `${lang}-Latn` : undefined}
                        data-sung-part={u.sung ? "sung" : "translit"}
                        className="block"
                      >
                        {u.sung ? sung : u.text}
                      </span>
                    ))}
                  </span>
                </span>
              ) : null}
            </>
          );
          return (
            <li
              key={i}
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
              data-sung={state}
              aria-current={state === "lit" ? "true" : undefined}
            >
              {seekable ? (
                <button type="button" onClick={() => onSeek(lines[i].at)} className="block w-full text-start">
                  {body}
                </button>
              ) : (
                <div className="text-start">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
});
