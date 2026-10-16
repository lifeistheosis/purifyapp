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
import { ListenButton, ReadAloudFollow } from "@/components/bible/ReadAloud";
import { GreekNumberingNote } from "@/components/bible/GreekNumberingNote";
import { InterlinearToggle } from "@/components/bible/InterlinearToggle";
import { MobileBookPill } from "@/components/bible/MobileBookPill";
import { MobileChapterPill } from "@/components/bible/MobileChapterPill";
import { MobileChapterStrip } from "@/components/bible/MobileChapterStrip";
import { MobileTranslationPill } from "@/components/bible/MobileTranslationPill";
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
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { cn } from "@/lib/cn";

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
 *
 * Phones and tablets, 1.7 (the owner's notes 1 to 8 of 2026-10-16): one
 * column, centred on a tablet as on a phone, holding everything from the
 * controls down. One row of pills (Translation, Book, and Interlinear where
 * the Greek is offered; the Reader pill is gone, the top bar's settings icon
 * does its job), each opening a sheet. Then the chapter's own strip of
 * numbers, and the title on one line, "John 1", with Listen at its end. On a
 * tablet the Fathers open in the sheet a phone uses, so nothing sits beside
 * the text and pushes it off centre. The computer keeps its toolbar, its
 * popovers and the study rail.
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
  introFacts = null,
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
  /** Who wrote it, when, what it is: the head of "Before you read" (1.7). */
  introFacts?: { by: string; when: string; about: string } | null;
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
        {/* The verse being read aloud, lit and kept in view (1.7). */}
        <ReadAloudFollow book={slug} chapter={chapter} />
        <ReadingProgressBar slug={slug} bookName={book.name} chapter={chapter} totalVerses={totalVerses} />
        <MobileChapterPill slug={slug} chapter={chapter} />
        {/* Twenty seconds of a chapter keeps the day for the streak. */}
        <KeepDay strand="day:reading" />
        <div data-reader-chrome className="contents">
          <BookChapterSidebar book={book} current={chapter} />
        </div>
        {/* The phone's bar is sticky and takes its own room, so the screen
            starts 16px under it, on a tablet in the apps too; the computer's
            header is 72px tall and fixed. */}
        <section className="flex-1 px-5 md:px-10 pt-4 md:pt-16 native-md-pt-4 pb-10 md:pb-16 safe-pb-reader min-w-0">
          <div className="mx-auto max-w-[1200px] w-full">
            {/* The computer's toolbar: one row of the reader's pills in two
                groups, "which scripture" on the left (Translation, Book,
                Save) and "how to read it" on the right (Reader, Interlinear,
                Focus), then the verse search. Size, font and spacing live in
                the Reader popover. A book the Fathers do not comment on has
                no rail, and the text stands in the middle, so the toolbar
                takes the text's width there. Phones and tablets have their
                own row, inside the column below. */}
            <div className={cn("hidden md:block native-md-hidden", !rail && "mx-auto max-w-[680px]")} data-reader-chrome>
              <div className="mb-4 flex items-center gap-2.5 flex-wrap">
                <TranslationSwitcher currentSlug={slug} configuredLicensed={configuredLicensed} />
                <BookSwitcher currentSlug={slug} />
                <ChapterBookmarkButton book={slug} bookName={book.name} chapter={chapter} />
                <div className="ml-auto flex items-center gap-2.5 flex-wrap justify-end">
                  <ReaderSettingsMenu showInterlinear={showInterlinear} />
                  {showInterlinear && <InterlinearToggle />}
                  <ReaderFocusButton />
                </div>
              </div>
              <div className="mb-6">
                <BibleSearch />
              </div>
            </div>

            <RestoreTranslation testament={book.testament} />

            {/* 280px at lg, 320 at xl, and only where there is a rail. At
                exactly 1024 (iPad landscape, small laptops) the old 320 +
                gap-10 beside the 240px chapter sidebar left the verse column
                about 344px wide, narrower than on a phone. In the apps a
                tablet has no rail (native-md-block): the Fathers open in the
                sheet, and the column stands in the middle. */}
            <div
              className={cn(
                "reader-grid native-md-block",
                rail && "lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-10",
              )}
            >
              {/* Reader column */}
              <div className="min-w-0 mx-auto w-full max-w-[680px]">
                {/* The phone's and the tablet's controls, inside the column so
                    they share its edges: one row of pills that each open a
                    sheet. It never wraps. When a narrow phone runs out of
                    room the Book pill gives way first (the bar and the title
                    already name the book), down to a few letters, and only
                    then Interlinear; the translation keeps its name.
                    Measured with the app's fonts: in English only the
                    longest Old Testament names give way, and on the
                    narrowest phones; no language pushes the row past the
                    screen. */}
                <div className="md:hidden native-md-block" data-reader-chrome>
                  <div className="mb-3 flex items-center gap-2">
                    <MobileTranslationPill currentSlug={slug} configuredLicensed={configuredLicensed} />
                    <MobileBookPill currentSlug={slug} currentChapter={chapter} />
                    {showInterlinear && <InterlinearToggle className="ms-auto" />}
                  </div>
                  <div className="mb-4">
                    <BibleSearch />
                  </div>
                  <MobileChapterStrip book={book} current={chapter} />
                </div>

                {/* One line, the book and the chapter, as the top bar and the
                    chapter pill write it; Listen at its end where the chapter
                    has a reading. "John" over "Chapter 1" did not look
                    finished (the owner's note 5). */}
                <header id="chapter-title" className="mb-6">
                  <div className="flex items-center justify-between gap-4">
                    <h1 className="min-w-0 font-heading text-heading md:text-display-sm leading-[1.1] text-paper text-balance">
                      <T k={`bible.books.${slug}`} /> {chapter}
                    </h1>
                    {/* Read aloud, where the chapter has a reading (1.7). */}
                    {!usingLicensed ? <ListenButton book={slug} chapter={chapter} bookName={book.name} /> : null}
                  </div>
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

                {/* Before you read (1.7, the owner's "Do all of these" of
                    2026-10-15): at the start of every book, what it is, who
                    wrote it and when, in plain sight; the longer word about
                    it opens below. Drafts for the owner's and his priest's
                    read (data/bible/intros). */}
                {/* One block, not a card stacked on a card: the line about the
                    book leads with no label over it (the label is for screen
                    readers), and the longer word opens inside the same block.
                    Its earlier look, a shouted label and a second box with a
                    ▾ character, was cut as vibe coded on 2026-10-16. */}
                {intro && introFacts ? (
                  <section aria-labelledby="before-you-read" className="mb-10 rounded-[18px] border border-paper/10 bg-paper/[0.03]">
                    <h2 id="before-you-read" className="sr-only">
                      <T k="bible.beforeYouRead" />
                    </h2>
                    <div className="px-5 pt-4 pb-4">
                      <p lang="en" className="font-serif text-body leading-[1.55] text-paper/90">{introFacts.about}</p>
                      <dl lang="en" className="mt-3 grid grid-cols-2 gap-3 font-sans text-caption">
                        <div className="min-w-0">
                          <dt className="text-paper/50"><T k="bible.introBy" /></dt>
                          <dd className="mt-0.5 text-paper/80">{introFacts.by}</dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-paper/50"><T k="bible.introWhen" /></dt>
                          <dd className="mt-0.5 text-paper/80">{introFacts.when}</dd>
                        </div>
                      </dl>
                    </div>
                    <details className="group border-t border-paper/[0.08]">
                      <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 px-5 font-sans text-detail font-semibold text-paper/70 transition-colors group-open:text-paper/90 [&::-webkit-details-marker]:hidden">
                        <T k="bible.aboutThisBook" />
                        <svg aria-hidden width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-paper/50 transition-transform duration-300 ease-house group-open:rotate-180 motion-reduce:transition-none">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </summary>
                      <div className="px-5 pb-5 font-serif text-body leading-[1.7] text-paper/80 whitespace-pre-line">
                        {intro}
                      </div>
                    </details>
                  </section>
                ) : null}
                {intro && !introFacts && (
                  <details className="mb-10 group rounded-md border border-paper/10 bg-paper/[0.03] open:bg-paper/[0.05] transition-colors">
                    <summary className="cursor-pointer list-none px-6 py-4 flex items-center justify-between">
                      <span className="font-sans text-caption font-semibold text-paper/55 group-open:text-paper/75 transition-colors">
                        <T k="bible.aboutThisBook" />
                      </span>
                      <span aria-hidden className="text-paper/55 group-open:rotate-180 transition-transform duration-200 text-caption">
                        <ChevronDown size={14} className="block" />
                      </span>
                    </summary>
                    <div className="px-6 pb-6 -mt-1 font-serif text-body leading-[1.7] text-paper/80 whitespace-pre-line">
                      {intro}
                    </div>
                  </details>
                )}

                {/* Commentary discoverability. The desktop study rail (lg+) is always
                    visible; below lg, and on a tablet in the apps, the Fathers open by
                    tapping a marked verse number, which first-time readers don't discover
                    (community, #purify-suggestions: "How am I able to read his
                    commentary?"). This names the affordance, as one plain line: it was a
                    red-tinted box until 1.7. */}
                {hasChapterCommentary && !usingLicensed && (
                  <p className="mb-8 lg:hidden native-md-block font-sans text-detail leading-[1.55] text-paper/70">
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

                {/* The computer's keys. A tablet in the apps reads as a phone does. */}
                {!usingLicensed && (
                  <p className="hidden md:block native-md-hidden mt-10 mb-3 font-sans text-eyebrow text-paper/55 leading-[1.6]" data-reader-chrome>
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

              {/* Desktop study rail: the website's wide screen only. */}
              {rail ? (
                <aside className="hidden lg:block native-md-hidden" data-reader-chrome>
                  <div className="sticky top-[88px] max-h-[calc(100dvh-104px)] overflow-y-auto scrollbar-thin pr-2 -mr-2">
                    <p className="font-sans text-caption font-semibold text-paper/55 mb-4">
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
