// Reciprocal link block: "this saint/council in Orthodox History." Rendered
// on saint and council pages only when curated events actually reference
// them (integrity-tested slugs), so it can never show an empty shell.

import Link from "next/link";

import type { HistoryEventMeta } from "@/lib/history/events";

export function ViewInHistory({
  events,
  title = "In Orthodox History",
}: {
  events: HistoryEventMeta[];
  title?: string;
}) {
  if (!events.length) return null;
  return (
    <section className="mt-12 border-t border-paper/10 pt-8" aria-label={title}>
      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/45">
        {title}
      </p>
      <ul className="mt-4 space-y-2">
        {events.map((e) => (
          <li key={e.slug}>
            <Link
              href={`/history/${e.slug}`}
              className="tap-press flex min-h-[48px] items-center justify-between gap-3 rounded-md border border-paper/12 px-4 py-2.5 hover:border-paper/25"
            >
              <span className="min-w-0">
                <span className="block font-sans text-caption text-paper/45">
                  {e.displayDate}
                </span>
                <span className="block truncate font-sans text-ui font-semibold text-paper/85">
                  {e.title}
                </span>
              </span>
              <span aria-hidden className="shrink-0 text-paper/40">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/history"
        className="mt-3 inline-block font-sans text-detail text-link hover:underline underline-offset-4"
      >
        Explore the interactive timeline →
      </Link>
    </section>
  );
}
