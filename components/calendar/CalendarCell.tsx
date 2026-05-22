import Link from "next/link";
import type { MonthCell } from "@/lib/calendar/orthodox";
import { Cross } from "@/components/ui/icons/Cross";
import { toneFor, TONE_RGB } from "@/lib/calendar/tone";
import { FAST_META } from "./fastMeta";
import { cn } from "@/lib/cn";

// Strip leading prefix labels so cell names read at a glance.
function shortName(name: string): string {
  return name
    .replace(/^(Holy|St\.|Hieromartyr|Venerable-martyr|Great-martyr|Virgin-martyr|Martyr|Prophet|Apostle|Apostles|Translation of (the )?Relics of|Synaxis of( the)?)\s+/i, "")
    .trim();
}

/**
 * One day in the month grid: a parchment-tinted tile that becomes a lit
 * lampada on `today`, carries a gold Cross for feasts, and shows a bespoke
 * fast icon (tinted by the day's tone). Navigation stays a plain `<Link>`.
 */
export function CalendarCell({
  cell,
  href,
  isSelected,
}: {
  cell: MonthCell;
  href: string;
  isSelected: boolean;
}) {
  if (!cell.inMonth) {
    return (
      <div
        aria-hidden
        className="aspect-square min-h-[58px] md:min-h-[84px] rounded-md"
      />
    );
  }

  const tone = toneFor({ hasFeast: cell.hasFeast, fast: cell.fast });
  const meta = FAST_META[cell.fast];
  const FastIcon = meta.Icon;
  const label = cell.headline ? shortName(cell.headline.name) : "";
  const rgb = TONE_RGB[tone];

  // Tone-dependent colours go through inline styles (reliable) rather than
  // Tailwind arbitrary values, whose `/` would be read as an opacity modifier.
  const toneStyle: React.CSSProperties =
    cell.isToday && !isSelected
      ? {
          ["--tone" as string]: rgb,
          borderColor: `rgb(${rgb} / 0.55)`,
          backgroundColor: `rgb(${rgb} / 0.09)`,
        }
      : { ["--tone" as string]: rgb };

  return (
    <Link
      href={href}
      scroll={false}
      style={toneStyle}
      className={cn(
        "group relative aspect-square min-h-[58px] md:min-h-[84px] rounded-md flex flex-col p-1.5 overflow-hidden border transition-colors duration-150",
        isSelected
          ? "border-paper/55 bg-paper/12"
          : cell.isToday
            ? "lampada-glow"
            : cell.hasFeast
              ? "border-gold/20 bg-gold/[0.05] hover:bg-gold/10 hover:border-gold/35"
              : "border-paper/[0.07] bg-paper/[0.02] hover:bg-paper/[0.06] hover:border-paper/20",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={cn(
            "font-sans text-[13px] md:text-[14px] font-semibold leading-none",
            cell.isToday ? "" : "text-paper/85",
          )}
          style={cell.isToday ? { color: `rgb(${rgb})` } : undefined}
        >
          {cell.day}
        </span>
        {cell.hasFeast && (
          <Cross size={12} className="shrink-0 text-gold" aria-label="Feast" />
        )}
      </div>

      {label && (
        <span className="mt-auto pr-4 font-serif text-[9.5px] md:text-[11px] leading-[1.2] text-paper/60 line-clamp-2 break-words">
          {label}
        </span>
      )}

      {FastIcon && (
        <span
          aria-hidden
          className="absolute bottom-1 right-1 opacity-80"
          style={{ color: `rgb(${meta.rgb})` }}
        >
          <FastIcon size={13} />
        </span>
      )}
    </Link>
  );
}
