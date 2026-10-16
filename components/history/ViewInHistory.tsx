// Reciprocal link block: "this saint/council in Orthodox History." Rendered
// on saint and council pages only when curated events actually reference
// them (integrity-tested slugs), so it can never show an empty shell.
//
// 1.7: the rows end in a drawn chevron, turned for the reading direction, and
// the timeline link in words alone; both were the "→" character, which the
// owner's notes of 2026-10-16 count among the generic AI look.

import Link from "next/link";

import type { HistoryEventMeta } from "@/lib/history/events";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { T } from "@/components/i18n/T";

export function ViewInHistory({
  events,
  title,
}: {
  events: HistoryEventMeta[];
  title?: React.ReactNode;
}) {
  if (!events.length) return null;
  return (
    <section className="mt-12 border-t border-paper/10 pt-8">
      <p className="font-sans text-caption font-semibold text-paper/55">
        {title ?? <T k="saints.inOrthodoxHistory" />}
      </p>
      <ul className="mt-4 space-y-2">
        {events.map((e) => (
          <li key={e.slug}>
            <Link
              href={`/history/${e.slug}`}
              className="tap-press flex min-h-[48px] items-center justify-between gap-3 rounded-md border border-paper/12 px-4 py-2.5 hover:border-paper/25"
            >
              <span className="min-w-0">
                <span className="block font-sans text-caption text-paper/55">
                  {e.displayDate}
                </span>
                <span className="block truncate font-sans text-ui font-semibold text-paper/85">
                  {e.title}
                </span>
              </span>
              <ChevronLeft size={16} className="shrink-0 -scale-x-100 text-paper/45 rtl:scale-x-100" />
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/history"
        className="mt-3 inline-block font-sans text-detail text-link hover:underline underline-offset-4"
      >
        <T k="study.history.exploreTimeline" />
      </Link>
    </section>
  );
}
