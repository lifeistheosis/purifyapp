"use client";

// A walked book's own page (1.7, the owner's note 24 of 2026-10-16): a calm
// phone page in place of the Living Tapestry and its four number tiles. The
// book's cover (its icon, the read-aloud covers' own, or the plate with its
// title: components/covers/WorkCover.tsx), its name, and one way on (Begin,
// or Continue with the next chapter) with how far the reader has walked in
// plain words, all on the first screen; then what the walk is. Then the
// chapters in the book's movements and, once the reader has written any,
// their own sentences, each part on the phone page frame's switch
// (components/layout/SectionTabs.tsx). Everything the reader has done is kept
// on this device (lib/walkthroughs/progress.ts).

import Link from "next/link";

import { WorkCover } from "@/components/covers/WorkCover";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SectionTabs, type SectionTab } from "@/components/layout/SectionTabs";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Lampada } from "@/components/ui/icons/Lampada";
import { dateLocale } from "@/lib/i18n/deviceDates";
import { todayKey } from "@/lib/rhythm/dayKey";
import { nextChapter, totals, walkStreak } from "@/lib/walkthroughs/progress";
import { useWalkProgress } from "@/lib/walkthroughs/useWalkProgress";

import { ChapterList, type WalkChapter, type WalkMovement } from "./ChapterList";

export type BookMeta = {
  book: string;
  title: string;
  intro: string;
  total: number;
  /** The cover's address (the website's, in the apps), or null for the plate. */
  cover: string | null;
  /** Chapters written so far, with their titles. */
  chapters: WalkChapter[];
  movements: WalkMovement[];
};

const SEP = " · ";

export function BookWalkClient({ meta }: { meta: BookMeta }) {
  const { t, tn, locale } = useTranslate();
  const p = useWalkProgress(meta.book);
  const sum = totals(p);
  const streak = walkStreak(p, todayKey());
  const written = new Set(meta.chapters.map((c) => c.n));
  const next = nextChapter(p, meta.total);
  const resume = next != null && written.has(next) ? next : null;
  const walked = new Set(Object.keys(p.done).map(Number));
  const titleOf = new Map(meta.chapters.map((c) => [c.n, c.title]));
  const facts = [tn("bible.chapterCount", meta.total), t("walk.free")].join(SEP);
  const ledger = Object.entries(p.ledger)
    .map(([n, l]) => ({ n: Number(n), ...l }))
    .filter((l) => l.text.length > 0)
    .sort((a, b) => a.n - b.n);

  const tabs: SectionTab[] = [
    {
      id: "chapters",
      labelKey: "walk.chapterNav",
      panel: <ChapterList book={meta.book} movements={meta.movements} chapters={meta.chapters} walked={walked} next={resume} />,
    },
  ];
  if (ledger.length > 0) {
    tabs.push({
      id: "ledger",
      labelKey: "walk.yourLedger",
      panel: (
        <div>
          <p className="font-sans text-caption text-paper/55">{t("walk.ledgerPrivate")}</p>
          <ol className="mt-3 divide-y divide-paper/[0.07] border-y border-paper/[0.08]">
            {ledger.map((l) => (
              <li key={l.n}>
                <Link href={`/walkthroughs/${meta.book}/${l.n}`} prefetch={false} className="tap-press block py-4">
                  <span className="block font-sans text-caption text-paper/55">
                    {[
                      t("walk.chapterN", { n: l.n }),
                      titleOf.get(l.n),
                      new Date(l.at).toLocaleDateString(dateLocale(locale), { month: "short", day: "numeric" }),
                    ]
                      .filter(Boolean)
                      .join(SEP)}
                  </span>
                  <span className="mt-1.5 block font-serif text-body leading-[1.55] text-paper/90">{l.text}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      ),
    });
  }

  return (
    <section className="bg-night px-5 pb-16 pt-8 md:px-8 md:pt-14" aria-labelledby="walk-book-title">
      <div className="mx-auto w-full max-w-[680px]">
        {/* The book as a book's page shows it: the cover, its name, and the
            way on, centred, on the first screen; then what the walk is, as
            reading text set to the left. */}
        <header className="flex flex-col items-center text-center">
          <WorkCover title={meta.title} imageUrl={meta.cover} size="lg" className="shadow-[0_24px_60px_-24px_rgba(0,0,0,0.75)]" />
          <h1
            id="walk-book-title"
            lang="en"
            className="mt-6 text-title font-bold leading-[1.12] tracking-[-0.01em] text-paper text-balance"
          >
            {meta.title}
          </h1>
          <p className="mt-2 font-sans text-detail text-paper/55">{facts}</p>

          <div className="mt-6 flex flex-col items-center gap-2.5">
            {resume ? (
              <Link
                href={`/walkthroughs/${meta.book}/${resume}`}
                data-walk-resume
                className="tap-press inline-flex min-h-11 items-center gap-1.5 rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night"
              >
                {sum.chapters === 0 ? t("walk.begin") : t("walk.continueN", { n: resume })}
                <ChevronRight size={15} className="shrink-0 rtl:-scale-x-100" />
              </Link>
            ) : next == null ? (
              <p className="font-serif text-body leading-[1.5] text-paper">{t("walk.walkedInFull")}</p>
            ) : null}
            {sum.chapters > 0 ? (
              <p data-walk-done className="font-sans text-detail text-paper/65">
                {t("walk.progressOf", { done: sum.chapters, total: meta.total })}
              </p>
            ) : null}
            {streak > 0 ? (
              <p className="inline-flex items-center gap-1.5 font-sans text-detail text-paper/65">
                <Lampada size={15} className="shrink-0" />
                {tn("walk.streakDays", streak)}
              </p>
            ) : null}
          </div>
        </header>

        <p lang="en" className="mt-9 max-w-[60ch] font-sans text-body leading-[1.6] text-paper/75">
          {meta.intro}
        </p>
        {locale !== "en" ? <p className="mt-2 font-sans text-caption text-paper/55">{t("walk.englishForNow")}</p> : null}

        <SectionTabs idBase="walk" labelKey="saints.sectionSwitcher" tabs={tabs} className="mt-8" />
      </div>
    </section>
  );
}
