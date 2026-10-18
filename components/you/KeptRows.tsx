"use client";

// What you have kept, on the You tab (1.8): everything a reader keeps, by
// what it is. It was four numbers on four tiles (verses, paragraphs, notes,
// bookmarks) that did not open what they counted (lib/you/you.ts says how
// each went wrong). Now each row is a group of Saved with its count and the
// newest thing in it, and opens Saved on that group: verses, the writings of
// the Fathers, saints, prayers, readings and icons. The journal closes the
// list, with the reader's newest words in it. The last row opens everything.
//
// Without Plus the journal row carries the Plus mark and opens the upgrade
// sheet named for the journal, as its Write button does: the journal is a
// Plus tool, shown and never hidden. The notes themselves stay on their
// verses, free.

import { useMemo } from "react";

import { PlusLock } from "@/components/billing/PlusMark";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { savedSource, savedTitle } from "@/components/saved/kinds";
import { verseOf } from "@/components/saved/SavedRow";
import { Star } from "@/components/ui/icons/Star";
import { YouList, YouRow, YouSection } from "@/components/you/YouList";
import { usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import type { JournalItem } from "@/lib/journal/feed";
import type { SavedItem } from "@/lib/saved/feed";
import { saintNameOf } from "@/lib/saved/passages";
import { keptRows, type KeptGroup } from "@/lib/you/you";

/** Each group's name: the chip of Saved it opens. A closed map of literal keys. */
const GROUP_KEY: Record<KeptGroup, string> = {
  verses: "study.saved.verses",
  writings: "saved.filter.writings",
  saints: "study.saved.saints",
  prayers: "nav.prayers",
  readings: "saved.filter.readings",
  icons: "saved.filter.icons",
};

export function KeptRows({
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
  const { t } = useTranslate();
  const locked = usePlusFeatures() === false;
  const upgrade = useUpgradeModal();
  const rows = useMemo(() => keptRows(feed), [feed]);
  const newestNote = journal[0] ?? null;

  /** The newest thing in a group, as its row names it. */
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

  if (rows.length === 0 && !newestNote) {
    return (
      <YouSection title={t("you.kept.title")} className={className} data-you-kept="">
        <p className="flex items-center gap-2.5 px-1 font-sans text-ui text-paper/70">
          <Star size={18} className="shrink-0 text-paper/55" />
          {t("saved.emptyLine")}
        </p>
      </YouSection>
    );
  }

  const total = feed.length;
  return (
    <YouSection title={t("you.kept.title")} className={className} data-you-kept="">
      <YouList>
        {rows.map((r, i) => (
          <YouRow
            key={r.group}
            first={i === 0}
            href={`/saved?kind=${r.group}`}
            title={t(GROUP_KEY[r.group])}
            detail={nameOf(r.newest)}
            note={r.count}
            data-kept={r.group}
          />
        ))}
        {newestNote ? (
          <YouRow
            first={rows.length === 0}
            href="/journal"
            onClick={(e) => {
              if (!locked) return;
              e.preventDefault();
              upgrade.open("journal");
            }}
            title={t("journal.title")}
            // The newest words written, in the reading serif, as the journal sets them.
            detail={<span className="font-serif text-detail text-paper/70">{newestNote.body.replace(/\s+/g, " ").trim()}</span>}
            note={
              <>
                {locked ? <PlusLock size={12} /> : null}
                {journal.length}
              </>
            }
            data-kept="journal"
          />
        ) : null}
        {total > 0 ? <YouRow href="/saved" title={t("common.seeAll")} note={total} data-kept="all" /> : null}
      </YouList>
    </YouSection>
  );
}
