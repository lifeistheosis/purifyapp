import Link from "next/link";
import { commemorationsOn, startOfDayUtc } from "@/lib/calendar/orthodox";
import { getSaint, type Saint } from "@/lib/saints/saints";
import { SaintIcon } from "@/components/saints/SaintIcon";
import { ShelfRow } from "./ShelfRow";

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
    <ShelfRow label="The week ahead">
      {days.map(({ date, label, saint }) => (
        <Link
          key={date.toISOString() + saint.slug}
          href={`/saints/${saint.slug}`}
          className="inline-flex flex-col items-center w-[88px] shrink-0 active:scale-[0.97] transition-transform"
        >
          <SaintIcon saint={saint} size="sm" />
          <span className="mt-2 font-sans text-[10.5px] uppercase tracking-[1px] text-[#c1272d] font-semibold">
            {label}
          </span>
          <span className="mt-1 font-sans text-[11.5px] text-paper/85 text-center leading-tight line-clamp-2">
            {saint.name}
          </span>
        </Link>
      ))}
    </ShelfRow>
  );
}
