"use client";

// John 1 as the Bible draws it, for the previews that open on a page of
// Scripture (Ambience, Candlelight and Monastery) and the ones that need a
// verse's words (cross-references, Remember the verse, the Florilegium). The
// app's own text (data/bible/john/1.json, carried in the apps), so a preview
// opens with no signal.
//
// The page is the reader's opening (components/bible/ChapterScreen.tsx): the
// book's name over "Chapter 1" and a short rule, then the verses with their
// numbers small and grey, in the font the reader chose
// (components/reader/ReaderPrefs.tsx), a little smaller to fit the window.

import john1 from "@/data/bible/john/1.json";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { BIBLE_START_SIZE, FONT_CLASSES, useReaderPrefs } from "@/components/reader/ReaderPrefs";
import { cn } from "@/lib/cn";
import { TRY_VERSES } from "@/lib/premium/plusTry";

type Chapter = { book: string; name: string; chapter: number; verses: { n: number; text: string }[] };

const JOHN_1 = john1 as Chapter;

/** A verse of John 1, in the app's own words. */
export function johnVerse(n: number): string {
  return JOHN_1.verses.find((v) => v.n === n)?.text ?? "";
}

/** "John 1:5" in the reader's language. */
export function useJohnReference(): (verse: number) => string {
  const { t } = useTranslate();
  return (verse) => `${t("bible.books.john")} 1:${verse}`;
}

/** The opening of John 1, as the Bible draws a chapter's first page. */
export function JohnPage({ verses = TRY_VERSES }: { verses?: number }) {
  const { t } = useTranslate();
  const { font } = useReaderPrefs(BIBLE_START_SIZE);
  return (
    <article className="px-[18px] pb-16 pt-[18px]">
      <header className="text-center">
        <h3 className="font-heading text-[30px] leading-[1.08] tracking-[-0.2px] text-paper">
          {t("bible.books.john")}
          {/* 60, not 55: under the window's glow, Candlelight's grey at 55 was 4.48:1 here (measured on the export). */}
          <span className="mt-0.5 block font-sans text-[12.5px] font-normal tracking-normal text-paper/60">
            {t("bible.chapterN", { n: JOHN_1.chapter })}
          </span>
        </h3>
        {/* The short rule at the chapter's head. A look puts its own sign in its place (app/globals.css, [data-try-look]). */}
        <span aria-hidden className="try-page-rule mx-auto mt-3 block h-px w-6 bg-paper/25" />
      </header>
      {/* The app's own English text (data/bible/john/1.json), so it says so and runs left to right in every
          language, as Settings' small page does: in Arabic a line's full stop stood at its start. */}
      <div lang="en" dir="ltr" className={cn("mt-2.5 space-y-2 text-[17px] leading-[1.6] text-paper/90", FONT_CLASSES[font])}>
        {JOHN_1.verses.slice(0, verses).map((v) => (
          <p key={v.n}>
            <sup className="me-1.5 align-super font-sans text-eyebrow font-medium tracking-[0.05em] text-paper/55">{v.n}</sup>
            {v.text}
          </p>
        ))}
      </div>
    </article>
  );
}
