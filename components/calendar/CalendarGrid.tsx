"use client";

import type { MonthCell } from "@/lib/calendar/orthodox";
import { Cross } from "@/components/ui/icons/Cross";
import { Grapes } from "@/components/ui/icons/Grapes";
import { Fish } from "@/components/ui/icons/Fish";
import { Wheat } from "@/components/ui/icons/Wheat";
import { Lampada } from "@/components/ui/icons/Lampada";
import { CalendarCell } from "./CalendarCell";
import { FAST_META } from "./fastMeta";
import type { FastKind } from "@/lib/calendar/orthodox";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/** The fasting registers the legend explains, in the order a reader meets
 * them through the year. Icons and hues come from FAST_META; only the order
 * and the label keys live here. */
const LEGEND: { kind: FastKind; Icon: typeof Wheat; labelKey: string }[] = [
  { kind: "strict", Icon: Wheat, labelKey: "calendar.fastShort.strict" },
  { kind: "wine-oil", Icon: Grapes, labelKey: "calendar.fastShort.wine-oil" },
  { kind: "fish", Icon: Fish, labelKey: "calendar.fastShort.fish" },
  { kind: "fast-free", Icon: Lampada, labelKey: "calendar.fastShort.fast-free" },
];

/** Sunday-first short weekday names in the active locale (Jan 2023
 * started on a Sunday, so day 1+i gives Sun..Sat).
 *
 * Cached per locale at module scope. This used to run inside the JSX on every
 * render, and constructing an Intl.DateTimeFormat is one of the more
 * expensive things a render body can do; the seven Date allocations beside it
 * were the cheap part. A reader has at most a handful of locales in a
 * session, so the map never grows. */
const WEEKDAY_CACHE = new Map<string, string[]>();

function weekdayNames(locale: string): string[] {
  const hit = WEEKDAY_CACHE.get(locale);
  if (hit) return hit;
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  const names = Array.from({ length: 7 }, (_, i) =>
    fmt.format(new Date(Date.UTC(2023, 0, 1 + i))),
  );
  WEEKDAY_CACHE.set(locale, names);
  return names;
}

/**
 * The illuminated month grid: a header of weekday names, 42 day-tiles, and a
 * legend keyed by the bespoke icons. Client so the weekday header and
 * legend follow the active locale (native switches included).
 */
export function CalendarGrid({
  grid,
  year,
  month,
  selectedIso,
  style,
}: {
  grid: MonthCell[];
  year: number;
  month: number;
  /** `YYYY-MM-DD`. A string, not a Date, so the selection compare is one
   * string equality instead of three getUTC* calls per cell, and so nothing
   * has to revive a Date on the client. */
  selectedIso: string;
  style: "new" | "old";
}) {
  const { locale, t } = useTranslate();
  const mm = String(month + 1).padStart(2, "0");
  const styleQS = style === "old" ? "&style=old" : "";

  // monthGrid always returns 6 weeks (42 cells); a 30-day month that starts
  // early needs only 5, leaving a blank trailing row. Drop any trailing
  // week whose cells are all out-of-month so the grid fits with no empty row.
  let cells = grid;
  while (cells.length > 7 && cells.slice(-7).every((c) => !c.inMonth)) {
    cells = cells.slice(0, -7);
  }

  return (
    <div>
      <div className="grid grid-cols-7 border-t border-l border-paper/12">
        {/* These names come from Intl, not from our message files, so their
            length is not something translation can control. At 360px a column
            is 44.7px, and the 1.8px tracking alone adds 10.8px to a six-letter
            name: Polish "NIEDZ." overflowed into its neighbour. The tracking is
            an eyebrow flourish that costs more than it earns at this width, so
            it starts at the sm breakpoint. min-w-0 lets the grid child actually
            shrink, and truncate is the backstop for ar, ur and ne, which are
            long on glyph width alone and take no benefit from uppercase. */}
        {weekdayNames(locale).map((d) => (
          <div
            key={d}
            className="min-w-0 truncate border-r border-b border-paper/8 py-1.5 font-sans text-eyebrow font-semibold uppercase tracking-normal sm:tracking-[1.8px] text-gold/70 text-center"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 border-l border-paper/12">
        {cells.map((cell) => {
          const isSelected = cell.inMonth && cell.iso === selectedIso;
          return (
            <CalendarCell
              key={cell.iso}
              cell={cell}
              isSelected={isSelected}
              href={`/calendar?m=${year}-${mm}&d=${cell.iso}${styleQS}`}
            />
          );
        })}
      </div>

      {/* Legend. The house panel idiom, a full hairline and a faint fill, the
          same one components/account/security/* uses; it was a second black
          card painted on a black section, which left an 8%-white outline as
          the only thing describing it. Each chip colours its icon AND its
          label together through currentColor.

          The five hues come from FAST_META, which is what the tiles and the
          badges read, rather than being hand-typed here a second time. They
          were duplicated, and the duplicate had already drifted. */}
      <div className="mt-6 rounded-xl border border-paper/12 bg-paper/[0.03] px-4 py-3">
        <div className="flex flex-wrap gap-x-5 gap-y-2.5 font-sans text-caption">
          <span className="inline-flex items-center gap-1.5 text-festal">
            <Cross size={14} />
            {t("calendar.legend.majorFeast")}
          </span>
          {LEGEND.map(({ kind, Icon, labelKey }) => (
            <span
              key={kind}
              className="inline-flex items-center gap-1.5"
              style={{ color: `rgb(${FAST_META[kind].rgb})` }}
            >
              <Icon size={14} />
              {t(labelKey)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
