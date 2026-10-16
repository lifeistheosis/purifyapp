"use client";

// The walkthroughs (1.7, the owner's note 24 of 2026-10-16): a calm phone page.
// Its name and one line, then each walked book as a row of the one cover
// system (components/covers/CoverListRow.tsx): the book's icon on its cover,
// the walk's name, how far the reader has walked it in plain words, and what it
// is. A row opens the book's own page, where Begin and Continue are.

import { CoverListRow } from "@/components/covers/CoverListRow";
import { WorkCover } from "@/components/covers/WorkCover";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { totals } from "@/lib/walkthroughs/progress";
import { useWalkProgress } from "@/lib/walkthroughs/useWalkProgress";

export type HubBook = {
  book: string;
  title: string;
  intro: string;
  total: number;
  /** The cover's address (the website's, in the apps), or null for the plate. */
  cover: string | null;
};

const SEP = " · ";

function WalkRow({ b }: { b: HubBook }) {
  const { t, tn } = useTranslate();
  const walked = totals(useWalkProgress(b.book)).chapters;
  const meta =
    walked > 0
      ? t("walk.progressOf", { done: walked, total: b.total })
      : [tn("bible.chapterCount", b.total), t("walk.free")].join(SEP);
  return (
    <CoverListRow
      href={`/walkthroughs/${b.book}`}
      cover={<WorkCover title={b.title} imageUrl={b.cover} size="md" />}
      title={<span lang="en">{b.title}</span>}
      meta={meta}
      blurb={<span lang="en">{b.intro}</span>}
    />
  );
}

export function WalkthroughsHub({ books }: { books: HubBook[] }) {
  const { t } = useTranslate();
  return (
    <section className="bg-night px-5 pb-16 pt-8 md:px-8 md:pt-14" aria-labelledby="walk-hub-title">
      <div className="mx-auto w-full max-w-[680px]">
        <h1 id="walk-hub-title" className="text-heading font-bold leading-[1.1] tracking-[-0.01em] text-paper">
          {t("walk.hubTitle")}
        </h1>
        <p className="mt-3 max-w-[56ch] font-sans text-body leading-[1.6] text-paper/70">{t("walk.hubIntro")}</p>
        <ul className="mt-8 divide-y divide-paper/[0.07] border-y border-paper/[0.08]">
          {books.map((b) => (
            <WalkRow key={b.book} b={b} />
          ))}
        </ul>
      </div>
    </section>
  );
}
