"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { BOOKS_OPEN_EVENT } from "@/lib/bible/booksSheet";
import { nextChapter, prevChapter, getBook } from "@/lib/bible/books";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChapterVerseStatus } from "./ChapterVerseStatus";
import { MobileChapterSheet } from "./MobileChapterSheet";
import { ReadAloudPillButton } from "./ReadAloud";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { AmbienceButton } from "@/components/player/AmbienceButton";
import { cn } from "@/lib/cn";
import { useHasReadAloud } from "@/lib/readAloud/chapters";
import { useOverlayOpen } from "@/lib/ui/overlay";
import { EVERYTHING, useOwnPlayer } from "@/lib/player/pagePlayer";
import { usePersistentAudio } from "@/lib/prayers/persistentAudioStore";
import { useIsNative } from "@/lib/platform/native";
import { ReaderDock } from "./ReaderDock";

/** Where the pill stands: a phone's width on the web (md:hidden), and every width in the apps (native-md-flex). */
const PHONE = "(max-width: 767.98px)";
const HOSTS_EVERYTHING: readonly string[] = [EVERYTHING];
const NOTHING: readonly string[] = [];

function subscribePhone(onChange: () => void): () => void {
  const query = window.matchMedia(PHONE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Whether the pill, and so the dock, is on the screen: in the apps always,
 * on the web at a phone's width. The computer's reader keeps its toolbar and
 * the mini player.
 */
function useDockShows(): boolean {
  const native = useIsNative();
  const phone = useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE).matches, () => false);
  return native || phone;
}

/**
 * Hoisted out of the pill body so React (and the new
 * `react-hooks/static-components` rule) sees it as a stable component
 * definition rather than one re-created on every render.
 */
function Arrow({
  target,
  label,
  dir,
}: {
  target: { slug: string; chapter: number } | null;
  label: string;
  dir: "‹" | "›";
}) {
  if (!target) {
    return (
      <span
        aria-hidden
        className="h-10 w-10 shrink-0 inline-flex items-center justify-center text-paper/25 font-sans text-lede leading-none"
      >
        {dir === "‹" ? <ChevronLeft size={20} className="rtl:-scale-x-100" /> : <ChevronLeft size={20} className="-scale-x-100 rtl:scale-x-100" />}
      </span>
    );
  }
  return (
    <Link
      href={`/bible/${target.slug}/${target.chapter}`}
      aria-label={label}
      // 40px drawn, 44 to the touch (.hit-44), as the dock's own arrows (ReaderDock).
      className="hit-44 h-10 w-10 shrink-0 inline-flex items-center justify-center text-paper/85 hover:text-paper font-sans text-lede leading-none"
    >
      {dir === "‹" ? <ChevronLeft size={20} className="rtl:-scale-x-100" /> : <ChevronLeft size={20} className="-scale-x-100 rtl:scale-x-100" />}
    </Link>
  );
}

/**
 * The chapter's pill, floating at the foot of the page on a phone and a
 * tablet (1.8, the owner's pick B of round 2, "The page": "The floating pill
 * comes back when you scroll up, with Listen"; Homebase/boards/purify-master/
 * variants/02-bible). The arrows step back and forward through the canon,
 * and the name between them opens the books sheet (MobileChapterSheet),
 * which the chapter's title opens too since the Bible tab became the chapter
 * (1.8, the owner's pick A of r3-20: lib/bible/booksSheet.ts). The pill
 * holds that one sheet for both. After a hairline, the sound button, then Listen,
 * white and softly lit, where the chapter has a reading. Over the pill, once
 * the title has gone up, a running line says the verse being read and the
 * minutes left (ChapterVerseStatus, which was the top bar's second line
 * until the bar went).
 *
 * It floats on a fade of the page, as drawn: the words go quiet under it.
 * It leaves with the round buttons over the page while the reader reads on,
 * and comes back with them on a scroll up and at the top of the chapter
 * (lib/ui/scrollAway.ts; globals.css, "The page: the Bible reader with no
 * bar"). No blur behind it: a blurred backdrop is redrawn on every frame of
 * a scroll.
 *
 * The sound button stays on it (1.7, the owner's note 25 of 2026-10-16: the
 * ambience "in the reader's bottom bar, by the chapter pager", lit while a
 * sound plays, opening the ambience sheet). A chapter with no reading keeps
 * the pill without Listen, and no button stands there that does nothing.
 *
 * Reader chrome: focus mode puts it away (1.7), so the way out of focus can
 * stand at the foot of the screen with nothing under it.
 *
 * It steps aside, as the tab bar does, while anything rises over the reader
 * (lib/ui/overlay.ts): the Copy pill of a hold and a verse's tools take its
 * very place, and the search screen and the sheets cover it (1.7.1, the
 * owner: "pill buttons colliding here"). It comes back as they go.
 *
 * It never runs past the screen, and a book's name is shown whole (the
 * gate's confirm run, 2026-11-12: "1 Corinthians" and eleven more ended in
 * an ellipsis at 390, and 60 of the 78 books in Polish at 320). Where the
 * name does not fit beside the controls, Listen's word gives its room first,
 * as it always has on the narrowest phones, and the name may take two lines;
 * where it still does not fit, the sound button and Listen go to a row of
 * their own under it, and the reader's foot keeps room for the taller pill.
 *
 * While anything is loaded in the app's one player it is the reader's dock
 * instead (1.9, the owner's pick for Listening: components/bible/ReaderDock.tsx),
 * one card for the player and the chapter, where the pill and the mini
 * player used to stand one over the other. The reader is then the player
 * for everything on this screen, so the mini player steps aside
 * (lib/player/pagePlayer.ts), for a sound playing alone too: the pill's own
 * sound button, lit, stands for it.
 */
export function MobileChapterPill({
  slug,
  chapter,
  totalVerses,
  listen = true,
  textKey,
}: {
  slug: string;
  chapter: number;
  totalVerses: number;
  /** Listen reads the English aloud: a chapter shown in a downloaded Bible has none (1.9). */
  listen?: boolean;
  /** What the chapter is shown in, when not the English: the running line looks at the verses again when it changes. */
  textKey?: string;
}) {
  const { t } = useTranslate();
  const book = getBook(slug);
  const bookName = t(`bible.books.${slug}`);
  const prev = prevChapter(slug, chapter);
  const next = nextChapter(slug, chapter);
  const [sheetOpen, setSheetOpen] = useState(false);
  const covered = useOverlayOpen();
  // Only a chapter that has a reading carries Listen.
  const reads = useHasReadAloud(slug, chapter) && listen;
  // The dock: the player and the chapter in one card while anything is loaded.
  const dockShows = useDockShows();
  useOwnPlayer(dockShows ? HOSTS_EVERYTHING : NOTHING);
  const { src } = usePersistentAudio();
  const docked = dockShows && Boolean(src);
  // How the name fits (the doc above): 0 as drawn, 1 with Listen's word given
  // way and the name on up to two lines, 2 with the controls on a row of their
  // own. Measured before the pill is painted, again for each name, chapter and
  // width, starting from the pill as drawn.
  const pillRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const [frameWidth, setFrameWidth] = useState(0);
  const fitKey = `${bookName}|${chapter}|${reads ? 1 : 0}|${frameWidth}`;
  const [fitFor, setFitFor] = useState<{ key: string; fit: 1 | 2 } | null>(null);
  const fit = fitFor?.key === fitKey ? fitFor.fit : 0;
  useLayoutEffect(() => {
    const frame = pillRef.current?.parentElement;
    if (!frame || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setFrameWidth(Math.round(frame.clientWidth)));
    observer.observe(frame);
    return () => observer.disconnect();
  }, [docked]);
  useLayoutEffect(() => {
    const name = nameRef.current;
    if (!name || fit === 2) return;
    const lines = name.getBoundingClientRect().height / (parseFloat(getComputedStyle(name).lineHeight) || 19);
    if (name.scrollWidth > name.clientWidth + 1 || lines > 2.05) setFitFor({ key: fitKey, fit: fit === 0 ? 1 : 2 });
  }, [fitKey, fit, docked]);
  // The pill with its controls under the name is taller than the pill of one
  // row (h-14, 3.5rem) the reader's foot keeps room for (globals.css,
  // .safe-pb-reader): the rest is kept too.
  useLayoutEffect(() => {
    const pill = pillRef.current;
    if (fit !== 2 || !pill) return;
    const root = document.documentElement;
    const oneRow = 3.5 * (parseFloat(getComputedStyle(root).fontSize) || 16);
    root.style.setProperty("--reader-pill-extra", `${Math.max(0, Math.ceil(pill.getBoundingClientRect().height - oneRow))}px`);
    return () => {
      root.style.removeProperty("--reader-pill-extra");
    };
  }, [fit, fitKey]);
  // The chapter's title asks for the same sheet (ChapterScreen).
  useEffect(() => {
    const open = () => setSheetOpen(true);
    window.addEventListener(BOOKS_OPEN_EVENT, open);
    return () => window.removeEventListener(BOOKS_OPEN_EVENT, open);
  }, []);
  if (!book) return null;

  const prevLabel = prev
    ? t("bible.previousTargetAria", {
        book: t(`bible.books.${prev.slug}`),
        chapter: prev.chapter,
      })
    : t("bible.noPreviousChapter");
  const nextLabel = next
    ? t("bible.nextTargetAria", {
        book: t(`bible.books.${next.slug}`),
        chapter: next.chapter,
      })
    : t("bible.noNextChapter");
  const pickLabel = t("bible.pickChapterCurrentAria", {
    book: bookName,
    chapter,
  });

  return (
    <>
      {docked ? (
        <ReaderDock
          slug={slug}
          chapter={chapter}
          bookName={bookName}
          prev={prev}
          next={next}
          prevLabel={prevLabel}
          nextLabel={nextLabel}
          pickLabel={pickLabel}
          covered={covered}
          onPick={() => setSheetOpen(true)}
        />
      ) : (
        <div
          aria-label={t("bible.chapterSwitcher")}
          data-reader-chrome
          data-reader-pill
          // What stands at the foot of the screen, the running line over the
          // pill with it (lib/ui/readingPlace.ts): the verse being read aloud,
          // or landed on, stands clear of it.
          data-screen-edge="bottom"
          // Out of reach and out of hearing while something stands over it.
          aria-hidden={covered || undefined}
          className={cn(
            "md:hidden native-md-flex fixed inset-x-0 z-40 flex flex-col items-center gap-1.5 px-4 pointer-events-none motion-safe:transition-opacity motion-safe:duration-200",
            covered && "opacity-0",
          )}
          // Sit clear of the tab bar, the now-playing bar when one is up, AND the
          // iOS home indicator, plus a 12px gap. Both vars are 0 when the thing
          // they measure is not on screen, so this is one formula for every case.
          // --pill-lift is that height, which the fade under the pill reaches
          // down from, to the foot of the screen (globals.css, .pill-fade).
          style={{
            ["--pill-lift" as string]:
              "calc(var(--tab-bar-h) + var(--now-playing-h) + var(--readings-flow-h, 0px) + env(safe-area-inset-bottom, 0px) + 12px)",
            bottom: "var(--pill-lift)",
          }}
        >
          {/* The fade the pill floats on, down to the foot of the screen, behind it and the tab bar. */}
          <span aria-hidden className="pill-fade pointer-events-none absolute inset-x-0 -z-10" />
          {/* The verse being read and the minutes left, a running line over
              the pill once the title has gone up, as a printed page carries
              its place at its foot. Over the pill and not inside it, so the
              pill keeps its width and the name its room. */}
          <ChapterVerseStatus chapterKey={textKey ? `${slug}/${chapter}/${textKey}` : `${slug}/${chapter}`} totalVerses={totalVerses} />
          <div
            className={cn(
              "flex h-14 min-w-0 max-w-full items-center gap-0.5 border border-paper/10 bg-night-soft px-1.5 shadow-[0_14px_34px_rgba(0,0,0,0.55)]",
              fit === 2 ? "h-auto flex-col rounded-[28px] py-1" : "rounded-pill",
              covered ? "pointer-events-none" : "pointer-events-auto",
            )}
            ref={pillRef}
          >
            <span className="flex min-w-0 max-w-full items-center gap-0.5">
              <Arrow target={prev} label={prevLabel} dir="‹" />
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setSheetOpen(true)}
                aria-label={pickLabel}
                className="flex h-11 min-w-0 items-center px-2 font-sans text-[15px] font-semibold leading-tight text-paper"
              >
                {/* Whole: at 1 it may take two lines, broken between words; at 2, the row its own, anywhere. */}
                <span ref={nameRef} className={fit === 0 ? "truncate" : cn("min-w-0", fit === 2 && "[overflow-wrap:anywhere]")}>
                  {bookName}
                </span>
                <span className="ms-1 shrink-0 tabular-nums">{chapter}</span>
              </button>
              <Arrow target={next} label={nextLabel} dir="›" />
            </span>
            {fit === 2 ? null : <span aria-hidden className="mx-1.5 h-6 w-px shrink-0 bg-paper/15" />}
            <span className="flex shrink-0 items-center gap-0.5">
              <AmbienceButton variant="pill" />
              {reads ? <ReadAloudPillButton book={slug} chapter={chapter} title={`${bookName} ${chapter}`} wordGivesWay={fit === 1} /> : null}
            </span>
          </div>
        </div>
      )}

      <MobileChapterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        currentSlug={slug}
        currentChapter={chapter}
      />
    </>
  );
}
