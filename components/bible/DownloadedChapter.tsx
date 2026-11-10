"use client";

// A chapter in a Bible the reader downloaded (1.9; lib/bible/downloads/).
//
// The words as their edition prints them, numbered as it numbers them: the
// Synodal's Psalm 50 begins with its title as verses 1 and 2, the Greek's
// Sirach with its prologue, unnumbered. Drawn as the English is drawn (the
// reader's size, font and spacing, a verse a line, its number small before
// it), with nothing laid over the words that belongs to the English: the
// Fathers, the highlights, the notes and the Greek beside each verse are the
// English verses', and these are numbered apart (docs/1.9-build/PLAN.md,
// item 22, the verse-number map, is what would carry them across).
//
// Each verse of the page's own chapter is a verse row as the English draws
// one (id "v12", data-verse), so the line over the pill says which verse is
// being read and how long is left, and the Bible keeps the reader's place. A
// chapter the edition has past the app's last (the Greek's Joel 4) follows
// under its own heading; a page whose verses the edition sets elsewhere says
// where, and leads there (lib/bible/downloads/page.ts).
//
// Polytonic Greek is set in Cardo (--font-greek), the one font the app
// carries that has every accent of it (the Greek beside the English uses it
// too); the reader's font choice is for the scripts it covers. The Arabic
// runs right to left whatever the app's language (its verse numbers stand at
// the start of each line, on the right), in the Naskh the serif stack carries.

import Link from "next/link";
import { Fragment } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { BIBLE_START_SIZE, FONT_CLASSES, SIZE_CLASSES, useReaderPrefs } from "@/components/reader/ReaderPrefs";
import { SkeletonText } from "@/components/ui/Skeleton";
import type { DownloadableBible } from "@/lib/bible/downloads/catalog";
import { verseAnchor } from "@/lib/bible/downloads/page";
import type { BibleText } from "@/lib/bible/downloads/useShownBible";
import { CandleVeil } from "@/components/reader/CandleVeil";
import { useCandlelightWorn } from "@/components/theme/useWornPalette";
import { cn } from "@/lib/cn";
import { useReadingLine } from "@/lib/reader/useReadingLine";

export function DownloadedChapter({
  bible,
  text,
  book,
  chapter,
}: {
  bible: DownloadableBible;
  /** Loading, or the page: never failed (the screen shows the English then). */
  text: Exclude<BibleText, { state: "failed" }>;
  book: string;
  chapter: number;
}) {
  const { t, locale } = useTranslate();
  const { size, font, leadingValue } = useReaderPrefs(BIBLE_START_SIZE);
  // The palette that is worn, not the one stored: Candlelight at Vespers wears it over
  // the reader's own, and a reader the gate has refused does not wear it at all.
  const candle = useCandlelightWorn();
  useReadingLine(candle);
  const greek = bible.textLang === "grc";

  if (text.state === "loading") {
    return (
      <div aria-busy="true" className="pt-1">
        <SkeletonText lines={9} />
      </div>
    );
  }

  const { page } = text;
  if (page.elsewhere) {
    return (
      <div className="rounded-[18px] border border-paper/10 bg-paper/[0.03] px-5 py-5" data-bible-elsewhere="">
        <p className="font-sans text-detail leading-[1.55] text-paper/80">{t("bible.downloads.elsewhere", { chapter: page.elsewhere })}</p>
        <Link
          href={`/bible/${book}/${page.elsewhere}`}
          className="tap-press mt-3 inline-flex min-h-11 items-center rounded-pill border border-paper/15 bg-paper/[0.04] px-4 font-sans text-detail font-semibold text-paper hover:border-paper/30"
        >
          {t("bible.downloads.goToChapter", { chapter: page.elsewhere })}
        </Link>
      </div>
    );
  }

  return (
    <article
      lang={bible.textLang}
      dir={bible.dir}
      data-bible={bible.id}
      className={cn("text-paper/90", FONT_CLASSES[font], SIZE_CLASSES[size])}
      style={{ ...(leadingValue ? { lineHeight: leadingValue } : {}), ...(greek ? { fontFamily: "var(--font-greek), serif" } : {}) }}
    >
      {candle ? <CandleVeil /> : null}
      <div className={cn("page-open-words space-y-2", candle && "candle-reading")}>
        {page.sections.map((section) => (
          <Fragment key={section.chapter}>
            {section.chapter !== chapter ? (
              <h2 lang={locale} className="pt-8 pb-2 text-center font-sans text-ui font-normal text-paper/55">
                {t("bible.chapterN", { n: section.chapter })}
              </h2>
            ) : null}
            {section.verses.map(([label, words], i) => {
              const own = section.chapter === chapter && typeof label === "number";
              return (
                <div key={i} id={verseAnchor(section.chapter, chapter, label)} data-verse={own ? "" : undefined} className="scroll-mt-24 -mx-2 px-2 py-0.5">
                  <p data-verse-words="" className="indent-0 min-w-0">
                    {label !== "" ? (
                      <sup className="me-1.5 align-super font-sans text-eyebrow font-medium tracking-[0.05em] text-paper/55">{label}</sup>
                    ) : null}
                    {words}
                  </p>
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </article>
  );
}
