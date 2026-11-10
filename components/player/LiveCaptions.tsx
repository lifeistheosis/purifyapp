"use client";

import { memo, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";

import { clockNow, subscribeClock } from "@/lib/player/clock";
import { followWord, lineAt, lineParts, wordAt, wordsOf, type CaptionLine } from "@/lib/player/captions";
import { getAudioSnapshot, type CaptionSource } from "@/lib/prayers/persistentAudioStore";
import { cn } from "@/lib/cn";
import { textDir } from "@/lib/i18n/textDir";

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
 *     word by word. Where the timing file times each word (build 86 note 78,
 *     "each word timestamped and followed in the lyrics section"), a word
 *     lights when it is sung and keeps its glow for as long as it is held,
 *     then lets it go; and the word being sung is kept in sight, so a line
 *     longer than the box is followed row by row.
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
 *
 * A chant's own page (1.8, sheet r3-18, the owner's pick of 2026-10-31, B's
 * page) leads with the words as they are sung and puts a line's English under
 * them (`english="under"`), shown under the line being sung only, and under
 * every line while nothing is being sung (app/globals.css, "Sung words").
 * Since lines then change height as the light moves, every row the change
 * moves is carried from where it was by its own amount, not only the rows
 * under the line.
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

/** A line longer than this keeps its size when it is sung (a hymn of the Canon is one long line, r3-18). */
export const LONG_LINE = 80;

/** Where the words fade at the box's top and foot: Now Playing's, and a chant's page's, as each sheet draws it. */
const FADE_PLAYER = "linear-gradient(180deg, transparent 0, #000 36px, #000 calc(100% - 64px), transparent 100%)";
const FADE_PAGE = "linear-gradient(180deg, transparent 0, #000 20px, #000 calc(100% - 40px), transparent 100%)";

/**
 * Where the rows were, before the line changed: every row's top, and the
 * parts of the line coming and the line going that change size.
 */
type First = { from: number; to: number; tops: number[]; nextShift: number; prevShift: number; nextSize: number; prevSize: number };

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
  english = "over",
  footer,
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
  /**
   * Where a line's English stands: over the sung words (Now Playing, round 8),
   * or under them, the sung words leading (a chant's page, r3-18).
   */
  english?: "over" | "under";
  /** Under the last line, in the same box: where the words come from. */
  footer?: ReactNode;
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
  /** The word last kept in sight: its line and its place. */
  const sungWord = useRef({ line: -1, word: -1 });
  const following = live && timed && active;

  const parts = (el: HTMLLIElement | null | undefined) => ({
    grow: el?.querySelector<HTMLElement>("[data-sung-grow]") ?? null,
    shift: el?.querySelector<HTMLElement>("[data-sung-shift]") ?? null,
    gloss: el?.querySelector<HTMLElement>("[data-sung-gloss]") ?? null,
  });

  function measureFirst(from: number, to: number): First | null {
    if (to < 0 && from < 0) return null;
    const next = to >= 0 ? rowRefs.current[to] : null;
    if (to >= 0 && !next) return null;
    const prev = from >= 0 ? rowRefs.current[from] : null;
    const size = (el: HTMLElement | null) => (el ? parseFloat(getComputedStyle(el).fontSize) || 0 : 0);
    const n = parts(next);
    const p = parts(prev);
    return {
      from,
      to,
      tops: rowRefs.current.map((row) => (row ? row.offsetTop : Number.NaN)),
      nextShift: n.shift && next ? n.shift.offsetTop - next.offsetTop : 0,
      prevShift: p.shift && prev ? p.shift.offsetTop - prev.offsetTop : 0,
      nextSize: size(n.grow),
      prevSize: size(p.grow),
    };
  }

  /**
   * The move from one line to the next, or between the words at rest and a
   * line being sung (First, Last, Invert, Play, as lib/ui/flip.ts does for
   * lists): every row that can be seen and that the change moved is carried
   * back to where it was, by its own amount; the line coming grows from its
   * old size and the line going gives its size back; what is under each rides
   * on it. Then the house curve carries every part home (app/globals.css,
   * "Sung words"). A line's English arriving under it fades in.
   */
  function flip(first: First, from: number, to: number) {
    const box = boxRef.current;
    if (!box) return;
    const next = to >= 0 ? rowRefs.current[to] : null;
    const prev = from >= 0 ? rowRefs.current[from] : null;
    const n = parts(next);
    const p = parts(prev);
    const moves: { el: HTMLElement; transform: string; origin?: string }[] = [];
    // A screen's worth either side of what shows: the rows the box is about
    // to glide past are carried too.
    const seenTop = box.scrollTop - box.clientHeight;
    const seenFoot = box.scrollTop + box.clientHeight * 2;
    rowRefs.current.forEach((row, i) => {
      const was = first.tops[i];
      if (!row || !Number.isFinite(was)) return;
      const now = row.offsetTop;
      const d = was - now;
      if (Math.abs(d) < 1 || Math.max(was, now) + row.offsetHeight < seenTop || Math.min(was, now) > seenFoot) return;
      moves.push({ el: row, transform: `translateY(${d}px)` });
    });
    const origin = (el: HTMLElement) => (getComputedStyle(el).direction !== "rtl" ? "0 0" : "100% 0");
    const resize = (grow: HTMLElement | null, was: number) => {
      if (!grow || !was) return;
      const size = parseFloat(getComputedStyle(grow).fontSize) || 0;
      if (size && Math.abs(size - was) > 0.5) moves.push({ el: grow, transform: `scale(${was / size})`, origin: origin(grow) });
    };
    resize(n.grow, first.nextSize);
    resize(p.grow, first.prevSize);
    // What is under a line rides on the line: measured from the line's own top.
    if (n.shift && next) {
      const d = first.nextShift - (n.shift.offsetTop - next.offsetTop);
      if (Math.abs(d) >= 1) moves.push({ el: n.shift, transform: `translateY(${d}px)` });
    }
    if (p.shift && prev) {
      const d = first.prevShift - (p.shift.offsetTop - prev.offsetTop);
      if (Math.abs(d) >= 1) moves.push({ el: p.shift, transform: `translateY(${d}px)` });
    }
    // Invert, with no transition, then let go.
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
    // The English that was not shown under the line coming (it was a line
    // beside the one being sung) fades in as the line grows.
    if (n.gloss && from >= 0 && typeof n.gloss.animate === "function") {
      const shown = getComputedStyle(n.gloss).opacity || "1";
      n.gloss.animate([{ opacity: 0 }, { opacity: shown }], { duration: MOVE_MS, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    }
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

  /**
   * The word being sung, kept in sight (note 78): where it has gone under the
   * box's fade at the foot (a long line, row after row) or over its top, the
   * box moves it to where the line being sung stands, gliding on the house
   * curve, at once with Purify's motion off (scrollTo). Measured on the
   * layout, not on the screen, so the line's own grow does not mislead it,
   * and never while the reader has just scrolled the words or the box is
   * already moving.
   */
  function keepInSight(el: HTMLElement | null | undefined) {
    const box = boxRef.current;
    if (!box || !el || scrolling.current || performance.now() - lastHand.current < HANDS_OFF_MS) return;
    let top = 0;
    let node: HTMLElement | null = el;
    while (node && node !== box) {
      top += node.offsetTop;
      node = node.offsetParent as HTMLElement | null;
    }
    if (node !== box) return;
    const to = followWord(
      { top, bottom: top + el.offsetHeight },
      { scrollTop: box.scrollTop, height: box.clientHeight, max: box.scrollHeight - box.clientHeight },
      ANCHOR,
    );
    if (to !== null && Math.abs(to - box.scrollTop) >= 1) scrollTo(to, true);
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
      const words = lines[cur].words;
      words.forEach((w, j) => {
        const el = els[j];
        if (!el) return;
        if (t < w.at) {
          el.style.opacity = String(WAIT);
          el.style.textShadow = "";
          return;
        }
        const since = t - w.at;
        const o = WAIT + (1 - WAIT) * Math.min(1, since / 0.12);
        // A word timed to its end (note 78) glows while it is held, and the
        // glow fades once it is sung; one with no end fades from its start.
        const after = typeof w.end === "number" ? Math.max(0, t - w.end) : since;
        const glow = Math.exp(-after / 0.5);
        el.style.opacity = o >= 0.999 ? "" : o.toFixed(3);
        el.style.textShadow =
          glow > 0.02 ? `0 0 ${(10 + 10 * glow).toFixed(1)}px rgba(255,255,255,${(0.55 * glow).toFixed(3)})` : "";
      });
      // The word being sung, kept in sight as it moves on (note 78).
      const k = wordAt(words, t);
      if (k >= 0 && (sungWord.current.line !== cur || sungWord.current.word !== k)) {
        sungWord.current = { line: cur, word: k };
        if (k > 0) keepInSight(els[k]);
      }
    });
    return () => {
      unsubscribe();
      clear(painted.current);
      painted.current = -1;
      pending.current = null;
      sungWord.current = { line: -1, word: -1 };
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
    const box = boxRef.current;
    if (!active || !box) return;
    settleFlip();
    // One line to the next, or the words at rest to a line or back: one
    // smooth move. A jump further (a seek, a tap on a line) stands in place.
    const step = current === from + 1 || from < 0 || current < 0;
    if (first && first.from === from && first.to === current && current !== from && step && !reduced()) {
      flip(first, from, current);
    }
    if (current < 0) {
      // Back before the first line (a seek to the start), or the singing
      // long over: to the top.
      if (live && from >= 0) scrollTo(0, true);
      return;
    }
    if (!rowRefs.current[current]) return;
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
  // The words fade out at the box's edges: shorter fades on a chant's page,
  // whose box is the room between its doors and its player (r3-18 B).
  const fade = look === "page" ? FADE_PAGE : FADE_PLAYER;

  return (
    <div
      ref={boxRef}
      data-sung-look={look}
      className={cn("no-scrollbar relative overflow-y-auto overflow-x-hidden overscroll-contain", className)}
      style={{ maskImage: fade, WebkitMaskImage: fade }}
    >
      <ol dir={rtl ? "rtl" : undefined} className={cn(look === "page" ? "pt-5" : "pt-9", footer ? "pb-2" : "pb-24")}>
        {source.map((line, i) => {
          const { main, under, gloss } = lineParts(line, english);
          const state = current < 0 ? "rest" : i === current ? "lit" : Math.abs(i - current) === 1 ? "near" : "far";
          const said = timed ? lines[i].words.map((w) => w.text) : wordsOf(line.text);
          const part = main.sung ? main : under.find((u) => u.sung);
          // Each word over its sound (notes 56 and 59): one stack a word, lit
          // as one, read in the line's own direction.
          const sounds = part?.pairs && part.pairs.length === said.length ? part.pairs : null;
          const latinLang = lang ? `${lang}-Latn` : undefined;
          const sungLang = part?.latin ? latinLang : lang;
          const ref = (j: number) => (el: HTMLSpanElement | null) => {
            (wordRefs.current[i] ??= [])[j] = el;
          };
          const sung = (
            <>
              {said.map((word, j) =>
                sounds ? (
                  <span key={j}>
                    <span ref={ref(j)} data-sung-pair>
                      <span>{word}</span>
                      <span data-sung-sound dir={textDir(latinLang)} lang={latinLang}>
                        {sounds[j]}
                      </span>
                    </span>
                    {j < said.length - 1 ? " " : ""}
                  </span>
                ) : (
                  <span key={j} ref={ref(j)}>
                    {word}
                    {j < said.length - 1 ? " " : ""}
                  </span>
                ),
              )}
            </>
          );
          const body = (
            <>
              <span
                data-sung-main
                data-sung-latin={main.sung && main.latin ? "" : undefined}
                dir={textDir(main.sung ? sungLang : "en")}
                lang={main.sung ? sungLang : "en"}
                className="block"
              >
                <span data-sung-grow className="block">
                  {main.sung ? sung : main.text}
                </span>
              </span>
              {under.length || gloss ? (
                <span data-sung-shift className="block">
                  {under.length ? (
                    <span data-sung-under className="block">
                      {under.map((u, k) => (
                        <span
                          key={k}
                          dir={textDir(u.sung ? sungLang : latinLang)}
                          lang={u.sung ? sungLang : latinLang}
                          data-sung-part={u.sung ? "sung" : "translit"}
                          className="block"
                        >
                          {u.sung ? sung : u.text}
                        </span>
                      ))}
                    </span>
                  ) : null}
                  {/* The English, under the sung words: shown under the line
                      being sung only, and under every line at rest. */}
                  {gloss ? (
                    <span data-sung-gloss dir="ltr" lang="en">
                      {gloss}
                    </span>
                  ) : null}
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
              data-sung-long={main.text.length > LONG_LINE ? "" : undefined}
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
      {footer ? <div className="pb-24">{footer}</div> : null}
    </div>
  );
});
