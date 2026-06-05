import type { MonthCell } from "@/lib/calendar/orthodox";
import { Cross } from "@/components/ui/icons/Cross";
import { Grapes } from "@/components/ui/icons/Grapes";
import { Fish } from "@/components/ui/icons/Fish";
import { Wheat } from "@/components/ui/icons/Wheat";
import { Lampada } from "@/components/ui/icons/Lampada";
import { CalendarCell } from "./CalendarCell";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function iso(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/**
 * The illuminated month grid: a header of weekday names, 42 day-tiles, and a
 * legend keyed by the bespoke icons. Pure server render; each cell is a Link.
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
  const mm = String(month + 1).padStart(2, "0");
  const styleQS = style === "old" ? "&style=old" : "";
  return (
    <div>
      <div className="grid grid-cols-7 border-t border-l border-gold/15 mb-0">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="border-r border-b border-gold/15 py-1.5 font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-gold/70 text-center"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 border-l border-gold/15">
        {grid.map((cell, i) => {
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
            Major feast
          </span>
          <span className="inline-flex items-center gap-1.5" style={{ color: "rgb(224 86 86)" }}>
            <Wheat size={14} />
            Strict fast
          </span>
          <span className="inline-flex items-center gap-1.5" style={{ color: "rgb(214 158 78)" }}>
            <Grapes size={14} />
            Wine &amp; oil
          </span>
          <span className="inline-flex items-center gap-1.5" style={{ color: "rgb(96 184 172)" }}>
            <Fish size={14} />
            Fish allowed
          </span>
          <span className="inline-flex items-center gap-1.5" style={{ color: "rgb(40 200 140)" }}>
            <Lampada size={14} />
            Fast-free
          </span>
        </div>
      </div>
    </div>
  );
}
