import Link from "next/link";
import type { ReadingRef } from "@/lib/calendar/orthodox";

/**
 * Fourth card in the mobile Today timeline: the appointed readings
 * (Epistle + Gospel + OT where present), each linking into the full
 * chapter in the Bible reader.
 */
export function TodayReadingsCard({
  readings,
  eyebrow = "Today's Readings",
  emptyLabel = "No readings appointed.",
}: {
  readings: ReadingRef[];
  eyebrow?: string;
  emptyLabel?: string;
}) {
  if (!readings.length) {
    return (
      <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-4">
        <p className="font-sans text-[12px] text-paper/55">{eyebrow}</p>
        <p className="mt-2 font-sans text-[14px] text-paper/55 italic">{emptyLabel}</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-4">
      <p className="font-sans text-[12px] text-paper/55">{eyebrow}</p>
      <ul className="mt-2 divide-y divide-paper/8">
        {readings.map((r, i) => {
          const kind =
            r.kind === "epistle"
              ? "Epistle"
              : r.kind === "ot"
              ? "Old Testament"
              : "Gospel";
          return (
            <li key={i}>
              <Link
                href={`/bible/${r.book}/${r.chapter}#v${r.from}`}
                className="flex items-baseline justify-between gap-3 py-2.5 group"
              >
                <span className="font-sans text-[10.5px] uppercase tracking-[1.5px] text-paper/45 font-semibold">
                  {kind}
                </span>
                <span className="font-serif text-[15px] text-paper text-right group-hover:text-gold transition-colors">
                  {r.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
