"use client";

import type { MonthCell } from "@/lib/calendar/orthodox";
import { Cross } from "@/components/ui/icons/Cross";
import { Grapes } from "@/components/ui/icons/Grapes";
import { Fish } from "@/components/ui/icons/Fish";
import { Wheat } from "@/components/ui/icons/Wheat";
import { Lampada } from "@/components/ui/icons/Lampada";
import { CalendarCell } from "./CalendarCell";
import { useTranslate } from "@/components/i18n/MessagesProvider";

function iso(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Sunday-first short weekday names in the active locale (Jan 2023
 * started on a Sunday, so day 1+i gives Sun..Sat). */
function weekdayNames(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  return Array.from({ length: 7 }, (_, i) =>
    fmt.format(new Date(Date.UTC(2023, 0, 1 + i))),
  );
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
  selectedDay,
  style,
}: {
  grid: MonthCell[];
  year: number;
  month: number;
  selectedDay: Date;
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
      <div className="grid grid-cols-7 border-t border-l border-gold/15 mb-0">
        {weekdayNames(locale).map((d) => (
          <div
            key={d}
            className="border-r border-b border-gold/15 py-1.5 font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-gold/70 text-center"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 border-l border-gold/15">
        {cells.map((cell, i) => {
          const isSelected =
            cell.inMonth &&
            cell.date.getUTCFullYear() === selectedDay.getUTCFullYear() &&
            cell.date.getUTCMonth() === selectedDay.getUTCMonth() &&
            cell.date.getUTCDate() === selectedDay.getUTCDate();
          return (
            <CalendarCell
              key={i}
              cell={cell}
              isSelected={isSelected}
              href={`/calendar?m=${year}-${mm}&d=${iso(cell.date)}${styleQS}`}
            />
          );
        })}
      </div>

      {/* Legend. Seated on a black panel so the liturgical tints read warmly;
          each chip colours its icon AND label together (currentColor), instead
          of the old grey labels. */}
      <div className="mt-6 rounded-xl bg-black border border-white/8 px-4 py-3">
        <div className="flex flex-wrap gap-x-5 gap-y-2.5 font-sans text-caption">
          <span className="inline-flex items-center gap-1.5 text-[#d4af37]">
            <Cross size={14} />
            {t("calendar.legend.majorFeast")}
          </span>
          <span className="inline-flex items-center gap-1.5" style={{ color: "rgb(224 86 86)" }}>
            <Wheat size={14} />
            {t("calendar.fastShort.strict")}
          </span>
          <span className="inline-flex items-center gap-1.5" style={{ color: "rgb(214 158 78)" }}>
            <Grapes size={14} />
            {t("calendar.fastShort.wine-oil")}
          </span>
          <span className="inline-flex items-center gap-1.5" style={{ color: "rgb(96 184 172)" }}>
            <Fish size={14} />
            {t("calendar.fastShort.fish")}
          </span>
          <span className="inline-flex items-center gap-1.5" style={{ color: "rgb(40 200 140)" }}>
            <Lampada size={14} />
            {t("calendar.fastShort.fast-free")}
          </span>
        </div>
      </div>
    </div>
  );
}
