import Link from "next/link";
import { commemorationsOn, startOfDayUtc } from "@/lib/calendar/orthodox";
import { getSaint, type Saint } from "@/lib/saints/saints";
import { SaintIcon } from "@/components/saints/SaintIcon";
import { ShelfRow } from "./ShelfRow";
import { T } from "@/components/i18n/T";

type Day = {
  date: Date;
  label: string;
  saint: Saint;
};

/**
 * Horizontal scroll of the next seven days' headline saint. Each chip is
 * a small medallion (the SaintIcon), the saint's name, and the date as
 * a small chip. Skips days with no registry-resolved saint.
 */
export function SaintStrip() {
  const today = startOfDayUtc(new Date());
  const days: Day[] = [];
  for (let i = 1; i <= 14 && days.length < 7; i++) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() + i);
    const c = commemorationsOn(d);
    const headline = c.find((x) => x.kind === "feast") ?? c[0];
    const saint =
      headline?.saint ?? (headline?.slug ? getSaint(headline.slug) : null);
    if (saint) {
      const label = d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
      days.push({ date: d, label, saint });
    }
  }

  if (days.length === 0) return null;

  return (
    <ShelfRow label={<T k="ui.theWeekAhead" />}>
      {days.map(({ date, label, saint }) => (
        <Link
          key={date.toISOString() + saint.slug}
          href={`/saints/${saint.slug}`}
          className="inline-flex flex-col items-center w-[88px] shrink-0 active:scale-[0.97] transition-transform"
        >
          <SaintIcon saint={saint} size="sm" />
          <span className="mt-2 font-sans text-eyebrow uppercase tracking-[1px] text-crimson font-semibold">
            {label}
          </span>
          <span className="mt-1 font-sans text-caption text-paper/85 text-center leading-tight line-clamp-2">
            {saint.name}
          </span>
        </Link>
      ))}
    </ShelfRow>
  );
}
