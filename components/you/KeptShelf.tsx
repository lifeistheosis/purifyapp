"use client";

// What you have kept, on the You tab (1.8): everything a reader keeps, by
// what it is. It was four numbers on four tiles (verses, paragraphs, notes,
// bookmarks) that did not open what they counted (lib/you/you.ts says how
// each went wrong), and then, in 1.8, a list of rows.
//
// Drawn as the owner's pick A of r3-25 draws it (note 71, "the Ladder, then
// the day"): a shelf of covers, each group wearing the newest thing in it
// (lib/you/covers.ts), its count in the corner, its name and that newest
// thing at its foot, and See all with the total over the shelf. Three stand
// across the screen; past three the shelf scrolls sideways
// (components/ui/ScrollRail.tsx). Each opens Saved on its group: verses, the
// writings of the Fathers, saints, prayers, readings and icons. The journal
// closes the shelf, with the reader's newest words on it.
//
// Without Plus the journal carries the Plus mark and opens the upgrade sheet
// named for the journal, as its Write button does: the journal is a Plus
// tool, shown and never hidden. The notes themselves stay on their verses,
// free. The counts are allowed: the rule of no figures is for prayer.

import Link from "next/link";
import { useMemo, type MouseEvent, type ReactNode } from "react";

import { PlusLock } from "@/components/billing/PlusMark";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CoverArt } from "@/components/player/CoverArt";
import { savedSource, savedTitle } from "@/components/saved/kinds";
import { verseOf } from "@/components/saved/SavedRow";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { Star } from "@/components/ui/icons/Star";
import { ScrollRail } from "@/components/ui/ScrollRail";
import { usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import type { JournalItem } from "@/lib/journal/feed";
import type { SavedItem } from "@/lib/saved/feed";
import { saintNameOf } from "@/lib/saved/passages";
import { coverOf, subjectOf, type YouCover } from "@/lib/you/covers";
import { keptRows, type KeptGroup } from "@/lib/you/you";
import { useCoversVersion } from "@/lib/readAloud/useCovers";

/** Each group's name: the chip of Saved it opens. A closed map of literal keys. */
const GROUP_KEY: Record<KeptGroup, string> = {
  verses: "study.saved.verses",
  writings: "saved.filter.writings",
  saints: "study.saved.saints",
  prayers: "nav.prayers",
  readings: "saved.filter.readings",
  icons: "saved.filter.icons",
};

export function KeptShelf({
  feed,
  journal,
  verseLabel,
  className,
}: {
  feed: readonly SavedItem[];
  journal: readonly JournalItem[];
  /** "John 3:16" in the reader's language. */
  verseLabel: (book: string, chapter: number, verse: number) => string;
  className?: string;
}) {
  useCoversVersion();
  const { t } = useTranslate();
  const locked = usePlusFeatures() === false;
  const upgrade = useUpgradeModal();
  const rows = useMemo(() => keptRows(feed), [feed]);
  const newestNote = journal[0] ?? null;
  const total = feed.length;

  /** The newest thing in a group, as its tile names it. */
  const nameOf = (item: SavedItem): string => {
    const v = verseOf(item);
    if (v) return verseLabel(v.book, v.chapter, v.verse);
    if (item.passage) return saintNameOf(item.passage.saintSlug);
    if (item.bookmark) {
      const b = item.bookmark;
      return b.kind === "writing-section" ? [savedTitle(b), b.saintName].filter(Boolean).join(" · ") : savedTitle(b) || savedSource(b) || "";
    }
    return "";
  };

  const heading = (
    <p id="you-kept-title" role="heading" aria-level={2} className="font-sans text-caption text-paper/55">
      {t("you.kept.title")}
    </p>
  );

  if (rows.length === 0 && !newestNote) {
    return (
      <section data-you-kept="" aria-labelledby="you-kept-title" className={className}>
        <div className="px-1">{heading}</div>
        <p className="mt-2.5 flex items-center gap-2.5 px-1 font-sans text-ui text-paper/70">
          <Star size={18} className="shrink-0 text-paper/55" />
          {t("saved.emptyLine")}
        </p>
      </section>
    );
  }

  return (
    <section data-you-kept="" aria-labelledby="you-kept-title" className={className}>
      <div className="flex items-baseline justify-between gap-3 px-1">
        {heading}
        {total > 0 ? (
          <Link
            href="/saved"
            data-kept="all"
            className="tap-press -my-3 inline-flex min-h-11 items-center gap-[5px] font-sans text-detail font-semibold text-paper/80"
          >
            {t("common.seeAll")}
            <span className="font-semibold tabular-nums text-paper/55">{total}</span>
            <ChevronLeft size={12} aria-hidden className="-scale-x-100 opacity-60 rtl:scale-x-100" />
          </Link>
        ) : null}
      </div>
      <ScrollRail
        as="ul"
        snap
        arrows={false}
        label={t("you.kept.title")}
        // The row scrolls sideways, which clips what falls outside it: room
        // under the covers for their shadow, given back to the page after.
        className="-mx-5 -mb-5 mt-2.5"
        trackClassName="gap-[9px] px-5 scroll-px-5 pb-6"
      >
        {rows.map((r) => (
          <Tile
            key={r.group}
            href={`/saved?kind=${r.group}`}
            name={t(GROUP_KEY[r.group])}
            detail={nameOf(r.newest)}
            count={r.count}
            cover={coverOf(subjectOf(r.newest))}
            data={r.group}
          />
        ))}
        {newestNote ? (
          <Tile
            href="/journal"
            onClick={(e) => {
              if (!locked) return;
              e.preventDefault();
              upgrade.open("journal");
            }}
            name={t("journal.title")}
            // The newest words written, in the reading serif, as the journal sets them.
            detail={<span className="font-serif">{newestNote.body.replace(/\s+/g, " ").trim()}</span>}
            count={
              <>
                {locked ? <PlusLock size={11} /> : null}
                {journal.length}
              </>
            }
            cover={null}
            data="journal"
          />
        ) : null}
      </ScrollRail>
    </section>
  );
}

/** One cover on the shelf: the picture, its count in the corner, its name and its newest thing at the foot. */
function Tile({
  href,
  onClick,
  name,
  detail,
  count,
  cover,
  data,
}: {
  href: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  name: string;
  detail: ReactNode;
  count: ReactNode;
  cover: YouCover | null;
  data: string;
}) {
  return (
    <li className="w-[calc((100%_-_18px)/3)] md:w-[168px]">
      <Link
        href={href}
        onClick={onClick}
        data-kept={data}
        className="you-tile dark-island tap-press relative block h-[130px] overflow-hidden rounded-2xl bg-night-soft"
      >
        <CoverArt
          src={cover?.src ?? null}
          fallback={cover?.fallback}
          size={130}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: cover?.focus }}
        />
        <span aria-hidden className="you-tile-shade absolute inset-0" />
        <span className="absolute end-2 top-2 inline-flex h-6 min-w-7 items-center justify-center gap-1 rounded-xl bg-night/70 px-[7px] font-sans text-[12.5px] font-bold tabular-nums text-paper ring-1 ring-inset ring-paper/15">
          {count}
        </span>
        <span className="absolute inset-x-2.5 bottom-2.5 text-start">
          <span className="block truncate font-heading text-[16px] font-bold leading-[1.15] text-paper">{name}</span>
          <span className="mt-[3px] line-clamp-2 font-sans text-[11px] leading-[1.25] text-paper/75">{detail}</span>
        </span>
      </Link>
    </li>
  );
}
