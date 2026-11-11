"use client";

import { useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { AmbienceButton } from "@/components/player/AmbienceButton";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { WORDS_PER_MINUTE } from "@/lib/bible/readability";
import { cn } from "@/lib/cn";
import type { SectionHead } from "@/lib/saints/parts";
import { PLACE_ROWS, parsePlace } from "@/lib/saints/paragraphInView";
import { openWorkContents } from "@/lib/saints/workNow";
import { useOverlayOpen } from "@/lib/ui/overlay";
import { KEPT_AT, blockAt, placeIn, visibleBand } from "@/lib/ui/readingPlace";

import { usePartWords } from "./partWords";
import { WORK_HEAD_ID } from "./WorkHead";
import { textDir } from "@/lib/i18n/textDir";

/**
 * A work's pill, floating at the foot of the page on a phone and a tablet:
 * the Bible's (components/bible/MobileChapterPill.tsx), as the owner picked
 * it for the books of the Fathers (1.8, A of r3-29, "As the Bible reads"):
 * the arrow back, Conference 10 · 10, the arrow on and, after a hairline, the sound. The arrows turn
 * the chapter; the name opens the contents, as the chapter's title does.
 * Over it, once the title has gone up, a running line says where in the part
 * the reader is and the minutes left in the chapter, "Chapter 10 of 14 · 10
 * min left", counted from the line being read (lib/ui/readingPlace.ts), so a
 * chapter of one long paragraph counts down as it is read. The names are the
 * work's own (lib/saints/parts.ts): one name for the parts, here, at the
 * head and in the contents; build 86 said "Section 1 of 603" here and "All
 * 603 chapters" at the top.
 *
 * It floats on the page's fade, steps away with the round buttons over the
 * page and the tab bar while the reader reads on, and comes back on a scroll
 * up (lib/ui/scrollAway.ts; globals.css, "The page"), so it is never over
 * the words at rest: the page keeps its own height of room at its foot
 * (safe-pb-reader). It steps aside while anything rises over the reader
 * (lib/ui/overlay.ts). Its face fades in as it arrives with the work's text
 * (globals.css, .reader-pill-in), on the motion switch. Reader chrome: focus
 * mode puts it away.
 *
 * The pill is as wide as the work's longest name, whichever part is being
 * read (1.9; the fresh-eyes walk of the release build: "a council
 * document's Next bar shifts 47px when tapped"). It hugs its name and
 * stands in the middle of the screen, so a name longer or shorter than the
 * last one moved both arrows sideways as the part turned, out from under
 * the finger that was turning the parts: the Symbol of the Faith to the
 * Ecthesis of the Synod, 47px. So the name's place holds the widest of the
 * work's names, unseen, under the one shown (widestNames), and the arrows
 * stand where they stood.
 */

/** How many of a work's names are laid under the one shown. A work may have six hundred parts. */
const NAMES_KEPT = 8;

/**
 * The names that decide the pill's width: every one of a short work, the
 * longest few of a long one (by their letters: near enough, a pixel or two,
 * where the names are numbers). Pure, for its test.
 */
export function widestNames(names: readonly string[], keep: number = NAMES_KEPT): string[] {
  const each = [...new Set(names)];
  if (each.length <= keep) return each;
  return each.sort((a, b) => b.length - a.length).slice(0, keep);
}

export function MobileWorkPill({
  head,
  prev,
  next,
  heads,
  onGo,
  words,
}: {
  head: SectionHead;
  prev: SectionHead | null;
  next: SectionHead | null;
  /** Every part of the work, so the pill keeps one width as the parts turn. */
  heads: readonly SectionHead[];
  onGo: (n: number) => void;
  /** The chapter's words, paragraph by paragraph, for the minutes left. */
  words: readonly number[];
}) {
  const { t } = useTranslate();
  const { pill } = usePartWords();
  const covered = useOverlayOpen();
  const name = pill(head);
  const widest = widestNames(heads.map(pill)).filter((n) => n !== name);
  // A name of the work's own is English; one from the catalog is the reader's.
  const nameLang = "text" in head.pill.name ? "en" : undefined;
  // 44 to the touch: h-10 drew 42.5px at the reader's text size (checkMock, 2026-11-10).
  const arrow = "h-11 w-11 shrink-0 inline-flex items-center justify-center";
  return (
    <div
      aria-label={t("bible.chapterSwitcher")}
      data-reader-chrome
      data-reader-pill
      data-work-pill=""
      // What stands at the foot of the screen (lib/ui/readingPlace.ts): the
      // place a return lands on stands clear of it.
      data-screen-edge="bottom"
      aria-hidden={covered || undefined}
      className={cn(
        "md:hidden native-md-flex fixed inset-x-0 z-40 flex flex-col items-center gap-1.5 px-4 pointer-events-none motion-safe:transition-opacity motion-safe:duration-200",
        covered && "opacity-0",
      )}
      // --pill-lift: the fade under the pill reaches down from it to the foot
      // of the screen (globals.css, .pill-fade).
      style={{
        ["--pill-lift" as string]: "calc(var(--tab-bar-h) + var(--now-playing-h) + var(--readings-flow-h, 0px) + env(safe-area-inset-bottom, 0px) + 12px)",
        bottom: "var(--pill-lift)",
      }}
    >
      {/* The fade the pill floats on, down to the foot of the screen, behind it and the tab bar. */}
      <span aria-hidden className="pill-fade pointer-events-none absolute inset-x-0 -z-10" />
      <RunningLine head={head} words={words} />
      <div
        className={cn(
          "reader-pill-in flex h-14 min-w-0 max-w-full items-center gap-0.5 rounded-pill border border-paper/10 bg-night-soft px-1.5 shadow-[0_14px_34px_rgba(0,0,0,0.55)]",
          covered ? "pointer-events-none" : "pointer-events-auto",
        )}
      >
        <button
          type="button"
          disabled={!prev}
          onClick={() => prev && onGo(prev.n)}
          aria-label={prev ? t("bible.previousTargetAria", { book: pill(prev), chapter: "" }).trim() : t("bible.noPreviousChapter")}
          className={cn(arrow, prev ? "text-paper/85 hover:text-paper" : "text-paper/25")}
        >
          <ChevronLeft size={20} className="rtl:-scale-x-100" />
        </button>
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={openWorkContents}
          aria-label={t("bible.pickChapterCurrentAria", { book: name, chapter: "" }).trim()}
          data-pill-name=""
          className="flex h-11 min-w-0 items-center px-2 font-sans text-[15px] font-semibold leading-tight text-paper"
        >
          {/* The work's widest names under the one shown, unseen, in the one
              place: they hold the pill's width, so the arrows do not move as
              the parts turn. A long name gives way, at its end. */}
          <span className="grid min-w-0 justify-items-center">
            {widest.map((n) => (
              <span key={n} aria-hidden data-pill-width="" className="invisible col-start-1 row-start-1 min-w-0 max-w-full truncate">
                {n}
              </span>
            ))}
            <span lang={nameLang} dir={textDir(nameLang)} className="col-start-1 row-start-1 min-w-0 max-w-full truncate">
              {name}
            </span>
          </span>
        </button>
        <button
          type="button"
          disabled={!next}
          onClick={() => next && onGo(next.n)}
          aria-label={next ? t("bible.nextTargetAria", { book: pill(next), chapter: "" }).trim() : t("bible.noNextChapter")}
          className={cn(arrow, next ? "text-paper/85 hover:text-paper" : "text-paper/25")}
        >
          <ChevronLeft size={20} className="-scale-x-100 rtl:scale-x-100" />
        </button>
        <span aria-hidden className="mx-1.5 h-6 w-px shrink-0 bg-paper/15" />
        <AmbienceButton variant="pill" />
      </div>
    </div>
  );
}

/**
 * The words left in the chapter from the line being read: the paragraphs
 * after the one over the reading line, and what is still under the line of
 * that one. Pure, for its test.
 */
export function wordsLeft(words: readonly number[], at: number, read: number): number {
  let left = Math.round((words[at] ?? 0) * Math.min(1, Math.max(0, 1 - read)));
  for (let i = at + 1; i < words.length; i++) left += words[i] ?? 0;
  return left;
}

/** "Chapter 10 of 14 · 10 min left", once the chapter's title has gone up. */
function RunningLine({ head, words }: { head: SectionHead; words: readonly number[] }) {
  const { t } = useTranslate();
  const { count } = usePartWords();
  const [show, setShow] = useState(false);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [seen, setSeen] = useState(head.n);
  if (seen !== head.n) {
    setSeen(head.n);
    setShow(false);
    setMinutes(null);
  }

  useEffect(() => {
    const title = document.getElementById(WORK_HEAD_ID);
    if (!title || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setShow(e.boundingClientRect.bottom < 0), { threshold: 0 });
    io.observe(title);
    return () => io.disconnect();
  }, [head.n]);

  useEffect(() => {
    let raf = 0;
    const settle = () => {
      raf = 0;
      const rows = document.querySelectorAll<HTMLElement>(PLACE_ROWS);
      if (!rows.length) return;
      const line = placeIn(visibleBand(), KEPT_AT);
      const at = blockAt(rows.length, (i) => rows[i].getBoundingClientRect().top, line);
      const place = parsePlace(rows[at].getAttribute("data-place"));
      if (!place) return;
      const r = rows[at].getBoundingClientRect();
      const left = wordsLeft(words, place.paragraph, r.height > 0 ? (line - r.top) / r.height : 0);
      // Under a minute's reading left says nothing worth a line.
      setMinutes(left >= WORDS_PER_MINUTE ? Math.round(left / WORDS_PER_MINUTE) : null);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(settle);
    };
    raf = requestAnimationFrame(settle);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [head.n, words]);

  const where = count(head);
  const text = [where, minutes ? t("bible.minLeft", { min: minutes }) : null].filter(Boolean).join(" · ");
  return (
    <span
      aria-hidden
      data-running-line=""
      // Open: the fade under the pill is solid up to it (fresh eyes L2, app/globals.css).
      data-open={show && text ? "" : undefined}
      className={cn(
        "grid max-w-full motion-safe:transition-[grid-template-rows,opacity] motion-safe:duration-300 motion-safe:ease-house",
        show && text ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <span className="max-w-full justify-self-center truncate rounded-pill bg-night px-2.5 py-0.5 font-sans text-eyebrow font-medium leading-[1.35] tabular-nums text-paper/60">
        {text}
      </span>
    </span>
  );
}
