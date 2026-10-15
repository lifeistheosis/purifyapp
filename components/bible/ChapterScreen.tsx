"use client";

import type { ReactNode } from "react";

import { BibleSearch } from "@/components/bible/BibleSearch";
import { BookChapterSidebar } from "@/components/bible/BookChapterSidebar";
import { BookSwitcher } from "@/components/bible/BookSwitcher";
import { ChapterBookmarkButton } from "@/components/bible/ChapterBookmarkButton";
import { ChapterDiscussions } from "@/components/bible/ChapterDiscussions";
import { ChapterKeyNav } from "@/components/bible/ChapterKeyNav";
import { ChapterPager } from "@/components/bible/ChapterPager";
import { KeepScrolling } from "@/components/bible/KeepScrolling";
import { ReadingsFlowBar } from "@/components/bible/ReadingsFlowBar";
import { GreekNumberingNote } from "@/components/bible/GreekNumberingNote";
import { InterlinearToggle } from "@/components/bible/InterlinearToggle";
import { MobileBookPill } from "@/components/bible/MobileBookPill";
import { MobileChapterPill } from "@/components/bible/MobileChapterPill";
import { MobileChapterStrip } from "@/components/bible/MobileChapterStrip";
import { ReaderSettingsMenu } from "@/components/bible/ReaderSettingsMenu";
import { ReadingProgressBar } from "@/components/bible/ReadingProgressBar";
import { RestoreTranslation } from "@/components/bible/RestoreTranslation";
import { TranslationSwitcher } from "@/components/bible/TranslationSwitcher";
import { VerseFocusFlash } from "@/components/bible/VerseFocusFlash";
import { T } from "@/components/i18n/T";
import { ReaderFocusButton, ReaderFocusController, ReaderPrefsProvider } from "@/components/reader/ReaderPrefs";
import { KeepDay } from "@/components/streak/KeepDay";
import type { BibleBook, NamedPassageId } from "@/lib/bible/books";
import { hebrewLine } from "@/lib/bible/psalmNumbers";

/**
 * A chapter of the Bible, as a screen: the bars, the switchers, the title,
 * and the places the verses and the Fathers go.
 *
 * It is one client component for the reason components/layout/AppFrame.tsx
 * is one. Each client component a SERVER component renders is named in the
 * page's payload on a line of its own, about 590 bytes here, and this page
 * drew twenty-six of them straight from app/(app)/bible/[book]/[chapter]:
 * 15 KB of a 51 KB chapter, on each of 1,362 chapters, and the screen's own
 * markup written out beside them every time. Drawn from here they are named
 * once, in this file's code.
 *
 * Nothing about the screen changed. The server page still reads the chapter
 * and fills three places:
 *
 *  - `topBar`, the phone's bar. It is mounted from the page because the back
 *    bar's own list of screens that have a bar is checked against pages and
 *    layouts, and only there (lib/nav/__tests__/backBar.test.ts). A bar
 *    mounted in here would be one that check cannot see.
 *  - `reader`, the verses. The public-domain reader in the apps, and on the
 *    website a licensed translation when one is chosen.
 *  - `rail`, the Fathers beside the text on a wide screen. The apps fetch
 *    them when the rail is first seen; the website writes them into the page.
 *
 * The last two stay the server's so that an app never carries the code of
 * the pair it does not use. Whatever else belongs to a chapter's screen goes
 * in here, not back in the page.
 */
export function ChapterScreen({
  book,
  chapter,
  totalVerses,
  showInterlinear,
  greekNumberedApart,
  configuredLicensed,
  licensedId,
  usingLicensed,
  intro,
  hasChapterCommentary,
  namedWhole,
  namedInner,
  topBar,
  reader,
  rail,
}: {
  book: BibleBook;
  chapter: number;
  totalVerses: number;
  /** The Greek can sit beside this chapter's verses. */
  showInterlinear: boolean;
  /** An Old Testament chapter whose Greek is numbered apart from its English. */
  greekNumberedApart: boolean;
  /** Licensed translations that are set up, for the switcher. */
  configuredLicensed: string[];
  /** The licensed translation asked for, carried on to the next chapter. */
  licensedId: string | null;
  /** A licensed translation is what the reader is showing. */
  usingLicensed: boolean;
  /** "About this book", on a book's first chapter. */
  intro: string | null;
  hasChapterCommentary: boolean;
  /** The name the Church knows the whole chapter by, if it has one. */
  namedWhole: NamedPassageId | null;
  /** Named passages that begin partway through the chapter. */
  namedInner: readonly { id: NamedPassageId; verse: number }[];
  /** The phone's bar over the chapter. The page mounts it; see below. */
  topBar: ReactNode;
  reader: ReactNode;
  /** Null for a book with no commentary at all: the rail is not drawn. */
  rail: ReactNode;
}) {
  const slug = book.slug;
  const psalmLine = slug === "psalms" ? hebrewLine(chapter) : null;
  return (
    <ReaderPrefsProvider>
      <ReaderFocusController />
      {topBar}
      <div className="bg-night flex">
        <ChapterKeyNav slug={slug} chapter={chapter} />
        <VerseFocusFlash />
        {/* Today's readings, one after another (1.7). */}
        <ReadingsFlowBar book={slug} chapter={chapter} />
        <ReadingProgressBar slug={slug} bookName={book.name} chapter={chapter} totalVerses={totalVerses} />
        <MobileChapterPill slug={slug} chapter={chapter} />
        {/* Twenty seconds of a chapter keeps the day for the streak. */}
        <KeepDay strand="day:reading" />
        <div data-reader-chrome className="contents">
          <BookChapterSidebar book={book} current={chapter} />
        </div>
        {/* Mobile top padding clears the 48px top bar and the 2px progress line
            pinned to its bottom edge. The verse counter lives inside the bar
            (ChapterVerseStatus), so nothing else pins under it. */}
        <section className="flex-1 px-5 md:px-10 pt-12 md:pt-16 pb-10 md:pb-16 safe-pb-reader min-w-0">
          <div className="mx-auto max-w-[1200px] w-full">
            {/* Row 1, always: Translation + Book at their natural width.
                On desktop the typography cluster (font + interlinear) sits to
                their right. On mobile that cluster is split off into row 2 below.
                Switchers are kept at content width (not stretched) so they don't
                shift as the book name length changes. */}
            {/* Desktop toolbar: a single tidy row, two semantic groups:
                "which scripture" on the left (Translation · Book · Save) and
                "how to read it" on the right (Reader prefs menu · Interlinear ·
                Focus). The three reader-preference cycle-pills (Size, Font, Spacing)
                are collapsed inside the Reader menu so the row stays at six controls
                instead of eight, matching how Kindle/Apple Books/Medium handle
                set-and-forget prefs. Wraps as a unit if pinched. */}
            <div className="mb-4 hidden md:flex items-center gap-2.5 flex-wrap" data-reader-chrome>
              <TranslationSwitcher currentSlug={slug} configuredLicensed={configuredLicensed} />
              <BookSwitcher currentSlug={slug} />
              <ChapterBookmarkButton book={slug} bookName={book.name} chapter={chapter} />
              <div className="ml-auto flex items-center gap-2.5 flex-wrap justify-end">
                <ReaderSettingsMenu showInterlinear={showInterlinear} embedded />
                {showInterlinear && <InterlinearToggle />}
                <ReaderFocusButton />
              </div>
            </div>
            {/* Mobile keeps its own compact row (the menu carries Focus and
                Interlinear inside on mobile). The book pill opens the bottom-sheet
                picker instead of the desktop popover. */}
            <div className="md:hidden mb-4 flex items-center gap-2.5 flex-wrap" data-reader-chrome>
              <TranslationSwitcher currentSlug={slug} configuredLicensed={configuredLicensed} />
              <MobileBookPill currentSlug={slug} currentChapter={chapter} />
            </div>
            {/* Row 2, mobile only: Interlinear pill (NT) + Reader chip sit as a
                pair at the start of the row, matching the Translation + Book
                cluster above. Previously the Reader chip floated to the far right
                via ml-auto, which read as "misplaced" against the otherwise
                left-aligned chips. */}
            <div className="md:hidden mb-4 flex items-center gap-3 flex-wrap" data-reader-chrome>
              {showInterlinear && <InterlinearToggle />}
              <ReaderSettingsMenu showInterlinear={showInterlinear} />
            </div>
            <div className="mb-6" data-reader-chrome>
              <BibleSearch />
            </div>
            <div data-reader-chrome className="contents">
              <MobileChapterStrip book={book} current={chapter} />
            </div>

            <RestoreTranslation testament={book.testament} />

            {/* 280px at lg, 320 at xl. At exactly 1024 (iPad landscape, small
                laptops) the old 320 + gap-10 beside the 240px chapter sidebar left the
                verse column about 344px wide, narrower than on a phone. */}
            <div className="reader-grid lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-10">
              {/* Reader column */}
              <div className="min-w-0 mx-auto w-full max-w-[680px]">
                <header id="chapter-title" className="mb-6">
                  <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55">
                    <T k={`bible.books.${slug}`} />
                  </p>
                  <h1 className="mt-1 font-serif text-display-sm md:text-display leading-none text-paper">
                    <T k="bible.chapterN" replacements={{ n: chapter }} />
                  </h1>
                  {/* The passages the Church knows by name, said where a reader looks.
                      Daniel 13 IS Susanna and 14 IS Bel and the Dragon, so they get their
                      name as a subtitle; Daniel 3 holds the Prayer of Azariah and the Song
                      of the Three partway through, so it links straight to where each
                      begins. Numbers only beside the names, so nothing new to translate.
                      See NAMED_PASSAGES in lib/bible/books.ts for why (2026-09-25). */}
                  {namedWhole ? (
                    <p className="mt-2 font-serif italic text-title-sm md:text-title text-paper/75">
                      <T k={`bible.passages.${namedWhole}`} />
                    </p>
                  ) : null}
                  {/* A psalm's other number, where most Bibles count it
                      differently: our 22 is their 23 (1.7). */}
                  {psalmLine ? (
                    <p className="mt-2 font-sans text-caption text-paper/55">
                      <T k={psalmLine.key} replacements={psalmLine.values} />
                    </p>
                  ) : null}
                  {namedInner.length > 0 ? (
                    <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-sans text-caption text-paper/60">
                      {namedInner.map((p) => (
                        <a
                          key={p.id}
                          href={`#v${p.verse}`}
                          className="underline decoration-paper/25 underline-offset-4 hover:text-paper hover:decoration-paper/60"
                        >
                          <T k={`bible.passages.${p.id}`} /> {chapter}:{p.verse}
                        </a>
                      ))}
                    </p>
                  ) : null}
                </header>
                <hr className="mb-8 border-0 h-px bg-white/10" />
                {greekNumberedApart ? <GreekNumberingNote /> : null}

                {intro && (
                  <details className="mb-10 group rounded-md border border-paper/10 bg-paper/[0.03] open:bg-paper/[0.05] transition-colors">
                    <summary className="cursor-pointer list-none px-6 py-4 flex items-center justify-between">
                      <span className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55 group-open:text-paper/75 transition-colors">
                        <T k="bible.aboutThisBook" />
                      </span>
                      <span aria-hidden className="text-paper/55 group-open:rotate-180 transition-transform duration-200 text-caption">
                        ▾
                      </span>
                    </summary>
                    <div className="px-6 pb-6 -mt-1 font-serif text-body leading-[1.7] text-paper/80 whitespace-pre-line">
                      {intro}
                    </div>
                  </details>
                )}

                {/* Commentary discoverability. The desktop study rail (lg+) is always
                    visible; below lg the Fathers open by tapping a marked verse number,
                    which first-time readers don't discover (community, #purify-suggestions:
                    "How am I able to read his commentary?"). This names the affordance. */}
                {hasChapterCommentary && !usingLicensed && (
                  <p className="mb-8 lg:hidden rounded-md border border-accent/25 bg-accent/[0.06] px-4 py-3 font-sans text-detail leading-[1.55] text-paper/80">
                    <span className="font-semibold text-paper"><T k="bible.readWithFathers" /></span>{" "}
                    <T k="bible.commentaryHint1" />{" "}
                    <span className="font-semibold text-comment"><T k="bible.commentaryHintRed" /></span>{" "}
                    <T k="bible.commentaryHint2" />
                  </p>
                )}

                {reader}

                <ChapterPager slug={slug} chapter={chapter} v={licensedId ?? undefined} />

                {/* What readers are saying about this chapter in Community, and a
                    way to start a conversation about it. */}
                <ChapterDiscussions book={slug} bookName={book.name} chapter={chapter} />

                {!usingLicensed && (
                  <p className="hidden md:block mt-10 mb-3 font-sans text-eyebrow text-paper/55 leading-[1.6]" data-reader-chrome>
                    ← → <T k="bible.readerShortcuts" />
                  </p>
                )}

                {!usingLicensed && (
                  <p className="mt-6 md:mt-3 font-sans text-eyebrow text-paper/55 leading-[1.6]">
                    <T k="bible.chapterSources" />
                  </p>
                )}

                {/* The next chapter, waiting at the foot: scroll on into it (1.7). */}
                <KeepScrolling slug={slug} chapter={chapter} v={licensedId ?? undefined} />

                {/* Mobile + tablet: commentary is opened on demand via the
                    verse-number glyph; ChapterReader owns the MobileCommentarySheet. */}
              </div>

              {/* Desktop study rail */}
              {rail ? (
                <aside className="hidden lg:block" data-reader-chrome>
                  <div className="sticky top-[88px] max-h-[calc(100dvh-104px)] overflow-y-auto scrollbar-thin pr-2 -mr-2">
                    <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
                      <T k="bible.patristicCommentary" />
                    </p>
                    {rail}
                  </div>
                </aside>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </ReaderPrefsProvider>
  );
}
