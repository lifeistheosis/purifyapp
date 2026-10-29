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
import { PlanFlowBar } from "@/components/plans/PlanFlowBar";
import { ListenButton, ReadAloudFollow } from "@/components/bible/ReadAloud";
import { GreekNumberingNote } from "@/components/bible/GreekNumberingNote";
import { InterlinearToggle } from "@/components/bible/InterlinearToggle";
import { MobileChapterPill } from "@/components/bible/MobileChapterPill";
import { ReaderSettingsMenu } from "@/components/bible/ReaderSettingsMenu";
import { AmbienceButton } from "@/components/player/AmbienceButton";
import { ReadingProgressBar } from "@/components/bible/ReadingProgressBar";
import { RestoreTranslation } from "@/components/bible/RestoreTranslation";
import { TranslationSwitcher } from "@/components/bible/TranslationSwitcher";
import { VerseFocusFlash } from "@/components/bible/VerseFocusFlash";
import { SourceList, marked, type ListedSource } from "@/components/citations/Marked";
import { T } from "@/components/i18n/T";
import { BIBLE_START_SIZE, ReaderFocusButton, ReaderFocusController, ReaderPrefsProvider } from "@/components/reader/ReaderPrefs";
import { KeepDay } from "@/components/streak/KeepDay";
import type { BibleBook, NamedPassageId } from "@/lib/bible/books";
import { hebrewLine } from "@/lib/bible/psalmNumbers";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { cn } from "@/lib/cn";
import { useScrollAway } from "@/lib/ui/scrollAway";

/** Where a mark in a book's introduction leads: its source, under the introduction. */
const INTRO_SOURCE = "intro-source-";

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
 * Phones and tablets, 1.8: the page (the owner's pick B of round 2, locked
 * 2026-10-27; Homebase/boards/purify-master/variants/02-bible). No bar at
 * all: the way back and ••• stand on two round plates over the page (the
 * page's `topBar`, MobileTopBar `plates`; Aa went inside ••• on the owner's
 * pick B of 2026-10-28), and the chapter opens like a book, on its words:
 * the book's name over "Chapter 1", a short rule, then the first lines,
 * arriving one after another (globals.css, "The page"). What stood above the
 * title until 1.7 (the row of pills, the search, the chapter strip), the top
 * bar's own buttons and the reader's settings are in the ••• sheet
 * (ReaderMoreSheet); the floating pill at the foot turns the chapter, says
 * the verse and the minutes left, and holds Listen. The plates, the pill
 * and, in the apps, the tab bar step away as the reader reads on and come
 * back on a scroll up (lib/ui/scrollAway.ts). The words are Large for a
 * reader who has never chosen a size (BIBLE_START_SIZE). On a tablet the
 * text is one column in the middle, the Fathers open in the sheet a phone
 * uses. The computer keeps its toolbar, its popovers and the study rail, and
 * opens on the same title.
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
  introSources = [],
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
  /** The quotations in "About this book", numbered where they stand, each with its line (1.8). */
  introSources?: ListedSource[];
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
  // The round buttons over the page, the pill at its foot and the app's tab
  // bar step away while the reader reads on, and come back on a scroll up.
  useScrollAway();
  return (
    <ReaderPrefsProvider>
      <ReaderFocusController />
      {topBar}
      <div className="bg-night flex">
        <ChapterKeyNav slug={slug} chapter={chapter} />
        <VerseFocusFlash />
        {/* Today's readings, one after another (1.7). */}
        <ReadingsFlowBar book={slug} chapter={chapter} />
        {/* A reading plan's day, chapter by chapter (1.7). Only one of the two
            is ever under way (lib/plans/session.ts). */}
        <PlanFlowBar book={slug} chapter={chapter} />
        {/* The verse being read aloud, lit and kept in view (1.7). */}
        <ReadAloudFollow book={slug} chapter={chapter} />
        <ReadingProgressBar slug={slug} bookName={book.name} chapter={chapter} totalVerses={totalVerses} />
        <MobileChapterPill slug={slug} chapter={chapter} totalVerses={totalVerses} />
        {/* Twenty seconds of a chapter keeps the day for the streak. */}
        <KeepDay strand="day:reading" />
        <div data-reader-chrome className="contents">
          <BookChapterSidebar book={book} current={chapter} />
        </div>
        {/* On a phone and a tablet the page starts under the round plates
            (under-plates, globals.css): the plates' row and the design's
            space under it. The computer's header is 72px tall and fixed. */}
        <section className="flex-1 px-5 md:px-10 under-plates md:pt-16 pb-10 md:pb-16 safe-pb-reader min-w-0">
          <div className="mx-auto max-w-[1200px] w-full">
            {/* The computer's toolbar: one row of the reader's pills in two
                groups, "which scripture" on the left (Translation, Book,
                Save) and "how to read it" on the right (Listen, Ambience,
                Reader, Interlinear, Focus), then the verse search. Size, font
                and spacing live in the Reader popover. A book the Fathers do
                not comment on has no rail, and the text stands in the middle,
                so the toolbar takes the text's width there. Phones and
                tablets have the round buttons over the page instead. */}
            <div className={cn("hidden md:block native-md-hidden", !rail && "mx-auto max-w-[680px]")} data-reader-chrome>
              <div className="mb-4 flex items-center gap-2.5 flex-wrap">
                <TranslationSwitcher currentSlug={slug} configuredLicensed={configuredLicensed} />
                <BookSwitcher currentSlug={slug} />
                <ChapterBookmarkButton book={slug} bookName={book.name} chapter={chapter} />
                <div className="ml-auto flex items-center gap-2.5 flex-wrap justify-end">
                  {/* Read aloud, where the chapter has a reading (1.7). It
                      stood at the end of the title's line until the title
                      became the page's opening (1.8). */}
                  {!usingLicensed ? <ListenButton book={slug} chapter={chapter} bookName={book.name} /> : null}
                  {/* Ambience, lit while a sound plays (1.7, the owner's
                      note 25): the computer's place for the phone's sound
                      button on the chapter's pill. */}
                  <AmbienceButton variant="toolbar" />
                  <ReaderSettingsMenu showInterlinear={showInterlinear} startSize={BIBLE_START_SIZE} />
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
                {/* The chapter opens like a book (1.8, the owner's pick B of
                    round 2): the book's name, large, over "Chapter 1", and a
                    short rule, all in the middle, then the words. One
                    heading, so a screen reader hears "John, Chapter 1". The
                    name arrives, then the chapter, then the rule draws out
                    from its middle and the first lines come in one after
                    another (globals.css, "The page"); with motion off they
                    are simply there. "John 1" on one line with Listen at its
                    end was the 1.7 title; Listen ends the pill now. */}
                <header id="chapter-title" className="mb-5 text-center">
                  <h1 className="font-heading text-paper">
                    <span className="page-open-title block text-balance break-words text-[40px] leading-[1.08] tracking-[-0.3px] min-[380px]:text-[44px]">
                      <T k={`bible.books.${slug}`} />
                    </span>{" "}
                    <span className="page-open-sub mt-1.5 block font-sans text-ui font-normal tracking-normal text-paper/55">
                      <T k="bible.chapterN" replacements={{ n: chapter }} />
                    </span>
                  </h1>
                  {/* The passages the Church knows by name, said where a reader looks.
                      Daniel 13 IS Susanna and 14 IS Bel and the Dragon, so they get their
                      name as a subtitle; Daniel 3 holds the Prayer of Azariah and the Song
                      of the Three partway through, so it links straight to where each
                      begins. Numbers only beside the names, so nothing new to translate.
                      See NAMED_PASSAGES in lib/bible/books.ts for why (2026-09-25). */}
                  {namedWhole ? (
                    <p className="page-open-sub mt-2 font-serif italic text-title-sm md:text-title text-paper/75">
                      <T k={`bible.passages.${namedWhole}`} />
                    </p>
                  ) : null}
                  {/* A psalm's other number, where most Bibles count it
                      differently: our 22 is their 23 (1.7). */}
                  {psalmLine ? (
                    <p className="page-open-sub mt-2 font-sans text-caption text-paper/55">
                      <T k={psalmLine.key} replacements={psalmLine.values} />
                    </p>
                  ) : null}
                  {namedInner.length > 0 ? (
                    <p className="page-open-sub mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 font-sans text-caption text-paper/60">
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
                  <span aria-hidden className="page-open-rule mx-auto mt-5 block h-px w-7 bg-paper/25" />
                </header>
                {greekNumberedApart ? <GreekNumberingNote /> : null}

                {/* Before you read (1.7, the owner's "Do all of these" of
                    2026-10-15): at the start of every book, what it is, who
                    wrote it and when; the longer word about it opens below.
                    Drafts for the owner's and his priest's read
                    (data/bible/intros). Folded to one line under the title
                    from 1.8, so the chapter still opens on its words (the
                    owner's pick B of round 2, which draws John 1 with nothing
                    between the rule and the first verse): a tap opens it in
                    place. Its earlier look, a shouted label and a second box
                    with a ▾ character, was cut as vibe coded on 2026-10-16. */}
                {intro && introFacts ? (
                  <details className="page-open-after group/intro mb-6 rounded-[18px] border border-paper/10 bg-paper/[0.03]">
                    <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 px-5 font-sans text-detail font-semibold text-paper/70 transition-colors group-open/intro:text-paper/90 [&::-webkit-details-marker]:hidden">
                      <T k="bible.beforeYouRead" />
                      <svg aria-hidden width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-paper/50 transition-transform duration-300 ease-house group-open/intro:rotate-180 motion-reduce:transition-none">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </summary>
                    <div className="border-t border-paper/[0.08] px-5 pt-4 pb-4">
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
                    <details className="group/about border-t border-paper/[0.08]">
                      <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 px-5 font-sans text-detail font-semibold text-paper/70 transition-colors group-open/about:text-paper/90 [&::-webkit-details-marker]:hidden">
                        <T k="bible.aboutThisBook" />
                        <svg aria-hidden width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-paper/50 transition-transform duration-300 ease-house group-open/about:rotate-180 motion-reduce:transition-none">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </summary>
                      <div className="px-5 pb-5 font-serif text-body leading-[1.7] text-paper/80 whitespace-pre-line">
                        {marked(intro, introSources, INTRO_SOURCE)}
                      </div>
                      {/* Where its quotations stand (1.8): numbered where
                          they are, listed under the word about the book. */}
                      <SourceList id="intro-sources" idPrefix={INTRO_SOURCE} sources={introSources} lang="en" heading="h3" className="mx-5 mb-5 border-t border-paper/[0.08] pt-5" />
                    </details>
                  </details>
                ) : null}
                {intro && !introFacts && (
                  <details className="page-open-after mb-6 group rounded-md border border-paper/10 bg-paper/[0.03] open:bg-paper/[0.05] transition-colors">
                    <summary className="cursor-pointer list-none px-6 py-4 flex items-center justify-between">
                      <span className="font-sans text-caption font-semibold text-paper/55 group-open:text-paper/75 transition-colors">
                        <T k="bible.aboutThisBook" />
                      </span>
                      <span aria-hidden className="text-paper/55 group-open:rotate-180 transition-transform duration-200 text-caption">
                        <ChevronDown size={14} className="block" />
                      </span>
                    </summary>
                    <div className="px-6 pb-6 -mt-1 font-serif text-body leading-[1.7] text-paper/80 whitespace-pre-line">
                      {marked(intro, introSources, INTRO_SOURCE)}
                    </div>
                    <SourceList id="intro-sources" idPrefix={INTRO_SOURCE} sources={introSources} lang="en" className="mx-6 mb-6 border-t border-paper/[0.08] pt-5" />
                  </details>
                )}

                {/* Commentary discoverability. The desktop study rail (lg+) is always
                    visible; below lg, and on a tablet in the apps, the Fathers open by
                    tapping a marked verse number, which first-time readers don't discover
                    (community, #purify-suggestions: "How am I able to read his
                    commentary?"). This names the affordance, as one plain line: it was a
                    red-tinted box until 1.7. */}
                {hasChapterCommentary && !usingLicensed && (
                  <p className="page-open-after mb-6 lg:hidden native-md-block font-sans text-detail leading-[1.55] text-paper/70">
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
