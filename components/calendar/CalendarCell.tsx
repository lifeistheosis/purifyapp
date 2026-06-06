import Link from "next/link";
import type { MonthCell } from "@/lib/calendar/orthodox";
import { Cross } from "@/components/ui/icons/Cross";
import { toneFor, TONE_RGB } from "@/lib/calendar/tone";
import { FAST_META } from "./fastMeta";
import { cn } from "@/lib/cn";

// Strip leading prefix labels so cell names read at a glance.
function shortName(name: string): string {
 return name
 .replace(
 /^(Holy|St\.|Hieromartyr|Venerable-martyr|Great-martyr|Virgin-martyr|Martyr|Prophet|Apostle|Apostles|Translation of (the )?Relics of|Synaxis of( the)?|Commemoration of( the)?|Feast of( the)?)\s+/i,
 "",
 )
 .trim();
}

/**
 * One day in the month grid, a ruled rectangular tile (not a card), in the
 * idiom of a printed wall calendar. Feast days get a rubric-red day number
 * and a small saint icon when one is indexed; ordinary days stay quiet.
 * Today is marked by a single thick gold outline, not a tinted background.
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
 className="aspect-square min-h-[58px] md:min-h-[84px] border-r border-b border-gold/15 bg-paper/[0.01]"
 />
 );
 }

 const tone = toneFor({ hasFeast: cell.hasFeast, fast: cell.fast });
 const meta = FAST_META[cell.fast];
 const FastIcon = meta.Icon;
 const label = cell.headline ? shortName(cell.headline.name) : "";
 const rgb = TONE_RGB[tone];

 const baseClasses =
 "group relative aspect-square min-h-[58px] md:min-h-[84px] flex flex-col justify-center md:justify-start p-1.5 overflow-hidden border-r border-b transition-colors duration-150";

 return (
 <Link
 href={href}
 scroll={false}
 style={{ ["--tone" as string]: rgb }}
 className={cn(
 baseClasses,
 // Today: a single thick gold outline, no tinted background.
 cell.isToday &&
 "lampada-glow outline outline-2 outline-offset-[-2px] outline-gold/65 z-[1]",
 // Selected (but not today): paper outline
 !cell.isToday &&
 isSelected &&
 "outline outline-2 outline-offset-[-2px] outline-paper/55 bg-paper/[0.05] z-[1]",
 // Default state, including hover
 !cell.isToday &&
 !isSelected &&
 (cell.hasFeast
 ? "border-gold/30 bg-gold/[0.04] hover:bg-gold/[0.09]"
 : "border-gold/15 bg-paper/[0.015] hover:bg-paper/[0.05]"),
 )}
 >
 <div className="flex items-start justify-between gap-1">
 <span
 className={cn(
 "font-display-serif text-ui md:text-body leading-none",
 cell.hasFeast ? "rubric" : "text-paper/85",
 )}
 style={
 cell.isToday && !cell.hasFeast
 ? { color: `rgb(${rgb})` }
 : undefined
 }
 >
 {cell.day}
 </span>
 {/* Markers cluster in the top-right: feast Cross + fast icon, side
 by side. Keeping them out of the bottom corner means the feast
 name below can use the full width without colliding. */}
 <span className="flex items-center gap-1 shrink-0">
 {FastIcon && (
 <span
 aria-hidden
 className="opacity-80 leading-none"
 style={{ color: `rgb(${meta.rgb})` }}
 >
 <FastIcon size={11} />
 </span>
 )}
 {cell.hasFeast && (
 // Hardcoded festal gold (#d4af37): keeps the feast marker truly gold,
 // independent of the app-wide neutralized `--color-gold` (warm grey).
 <Cross
 size={12}
 className="text-[#d4af37] mt-[1px]"
 aria-label="Feast"
 />
 )}
 </span>
 </div>

 {label && (
 <span
 className={cn(
 "mt-auto font-serif text-eyebrow leading-[1.2] hidden md:line-clamp-2",
 "[overflow-wrap:anywhere] hyphens-auto",
 cell.hasFeast ? "rubric opacity-90" : "text-paper/60",
 )}
 >
 {label}
 </span>
 )}
 </Link>
 );
}
