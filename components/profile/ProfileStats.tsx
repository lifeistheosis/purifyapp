"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CARD, CARD_BG, Eyebrow, ICON_TILE_SM } from "@/components/ui/Graphite";
import { Book } from "@/components/ui/icons/Book";
import { Bookmark } from "@/components/ui/icons/Bookmark";
import { Pen } from "@/components/ui/icons/Pen";
import { Scroll } from "@/components/ui/icons/Scroll";
import { cn } from "@/lib/cn";
import { useReadingStats } from "@/lib/profile/useReadingStats";
import { useCompletionCount } from "@/lib/catechism/useCompletionCount";
import { useCompletedCollections } from "@/lib/catechism/useCollectionProgress";

/**
 * Live counters drawn from localStorage, shared with the You tab through
 * lib/profile/useReadingStats.ts. This surface and that one used to run
 * two separate scans of the same keys, which is two answers waiting to
 * disagree about how much a reader has gathered.
 *
 * Four cards: verses highlighted, paragraphs highlighted, notes written,
 * bookmarks saved. The numbers update without a reload because every
 * highlight, note, or bookmark change broadcasts an event the hook
 * listens to. No prayer-streak counters: the rule is the rule, the day is
 * the day.
 *
 * Drawn since 2026-09-28 as the graphite cards of the Prayer and Discover
 * redesign, each with its own mark, where they were four flat boxes.
 */
export function ProfileStats() {
  const { t, tn } = useTranslate();
  const stats = useReadingStats();
  const catechisms = useCompletionCount();
  const completed = useCompletedCollections();

  const readingItems = [
    { id: "verses", label: t("ui.versesHighlighted"), value: stats.verses, icon: <Book size={20} /> },
    {
      id: "paragraphs",
      label: t("ui.paragraphsHighlighted"),
      value: stats.paragraphs,
      icon: <Scroll size={20} />,
    },
    { id: "notes", label: t("ui.notesWritten"), value: stats.notes, icon: <Pen size={20} /> },
    { id: "bookmarks", label: t("ui.bookmarksSaved"), value: stats.bookmarks, icon: <Bookmark size={20} /> },
  ];
  return (
    <>
      <section className="mt-12">
        <Eyebrow level={2}>{t("ui.yourReading")}</Eyebrow>
        <ul className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {readingItems.map((it) => (
            <li
              key={it.id}
              className={cn(CARD, "rounded-[22px] p-6 hover:translate-y-0 md:p-6")}
              style={CARD_BG}
            >
              <span aria-hidden className={ICON_TILE_SM}>
                {it.icon}
              </span>
              <p className="mt-6 font-sans text-display-sm font-bold leading-none tabular-nums tracking-[-0.02em] text-paper">
                {it.value}
              </p>
              <p className="mt-2 font-sans text-detail leading-[1.4] text-paper/65">
                {it.label}
              </p>
            </li>
          ))}
        </ul>
        {/* One quiet line, only once there is something to say. */}
        {catechisms > 0 && (
          <p className="mt-4 font-serif text-detail text-paper/60">
            {tn("catechism.accountCount", catechisms)}
          </p>
        )}
        {/* The collections seen through, one line each, for everyone. */}
        {completed.length > 0 && (
          <ul className={catechisms > 0 ? "mt-1 flex flex-col gap-0.5" : "mt-4 flex flex-col gap-0.5"}>
            {completed.map((c) => (
              <li key={c.slug} className="font-serif text-detail text-paper/60">
                <Link href="/catechism/collections" className="hover:text-paper transition-colors [transition-duration:var(--duration-fast)] motion-reduce:transition-none">
                  {t("catechism.collections.completedLine", { name: c.name })}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
