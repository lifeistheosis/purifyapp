import Link from "next/link";
import type { Commemoration, FastKind } from "@/lib/calendar/orthodox";
import type { Saint } from "@/lib/saints/saints";
import { SaintIcon } from "@/components/saints/SaintIcon";
import { DropCap } from "./DropCap";

/**
 * The "feast of the day" panel, Hallow-card aesthetic. The saint of the
 * day (or a quiet Cross fallback) sits on the left, the date + name +
 * fast + Pascha countdown stack on the right with simple hairline
 * dividers. No ornament SVGs inside the card; the chrome stays calm so
 * the typography does the work.
 */
export function FeastPanel({
 dateLabel,
 headline,
 headlineSaint,
 others,
 fast,
 paschaPrimary,
 paschaSecondary,
}: {
 dateLabel: string;
 headline: Commemoration | null;
 headlineSaint: Saint | null;
 others: Commemoration[];
 fast: { kind: FastKind; label: string; rule: string };
 paschaPrimary: string;
 paschaSecondary: string;
}) {
 // When a real saint icon is available, render a two-column layout
 // (icon + text). When not, drop the icon column entirely, no Cross
 // fallback, no glow, and let the text column run the full panel width.
 const hasIcon = !!headlineSaint;
 return (
 <div className="rounded-xl border border-gold/15 bg-paper/[0.02] overflow-hidden">
 <div
 className={
 hasIcon
 ? "px-6 md:px-10 py-8 md:py-9 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-7 md:gap-10 items-start"
 : "px-6 md:px-10 py-8 md:py-9"
 }
 >
 {hasIcon && (
 <div className="mx-auto md:mx-0 md:mt-1">
 <SaintIcon saint={headlineSaint} size="lg" priority />
 </div>
 )}

 {/* Text column */}
 <div className={hasIcon ? "min-w-0 text-center md:text-left" : "min-w-0"}>
 {/* Date, quiet small-caps line. */}
 <p className="font-sans text-[11px] uppercase tracking-[2px] text-gold/75 font-semibold">
 {dateLabel}
 </p>
 {headline ? (
 <>
 {/^[A-Za-z]/.test(headline.name) ? (
 <DropCap
 name={headline.name}
 href={
 headlineSaint ? `/saints/${headlineSaint.slug}` : undefined
 }
 />
 ) : (
 <h1 className="mt-3 font-display-serif text-[30px] md:text-[42px] leading-[1.06] text-paper">
 {headlineSaint ? (
 <Link
 href={`/saints/${headlineSaint.slug}`}
 className="hover:text-gold transition-colors"
 >
 {headline.name}
 </Link>
 ) : (
 headline.name
 )}
 </h1>
 )}
 {headline.note && (
 <p className="mt-3 font-serif italic text-[16px] md:text-[17px] text-paper/75 leading-[1.6] clear-left">
 {headline.note}
 </p>
 )}
 </>
 ) : (
 <p className="mt-4 font-serif text-[17px] text-paper/65 leading-[1.6]">
 No saints indexed for this day yet.{" "}
 <Link
 href="/saints"
 className="text-gold hover:text-gold/80 underline-offset-2 hover:underline"
 >
 Browse all saints
 </Link>
 </p>
 )}

 {/* Inline fast + Pascha, quiet two-column with a single hairline
 above each, no decorative ornament. */}
 <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5 clear-left">
 <div className="border-t border-paper/10 pt-3">
 <p className="font-sans text-[10.5px] uppercase tracking-[2px] text-gold/70 font-semibold">
 The Fast
 </p>
 <p className="mt-1 font-display-serif text-[18px] text-paper leading-tight">
 {fast.label}
 </p>
 <p className="mt-1 font-serif text-[13.5px] text-paper/70 leading-[1.55]">
 {fast.rule}
 </p>
 </div>
 <div className="border-t border-paper/10 pt-3">
 <p className="font-sans text-[10.5px] uppercase tracking-[2px] text-gold/70 font-semibold">
 Pascha
 </p>
 <p className="mt-1 font-display-serif text-[18px] text-paper leading-tight">
 {paschaPrimary}
 </p>
 <p className="mt-1 font-serif text-[13.5px] text-paper/70 leading-[1.55]">
 {paschaSecondary}
 </p>
 </div>
 </div>
 </div>
 </div>

 {others.length > 0 && (
 <div className="px-6 md:px-10 pb-7 pt-4 border-t border-paper/10">
 <p className="font-sans text-[10.5px] uppercase tracking-[2px] text-gold/70 font-semibold mb-3.5 text-center md:text-left">
 Also commemorated today
 </p>
 <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
 {others.map((c, i) => (
 <li
 key={i}
 className="flex items-baseline gap-2 font-sans text-[13px] text-paper/75 leading-[1.5]"
 >
 <span
 aria-hidden
 className="shrink-0 translate-y-[2px] text-gold/55 text-[9px]"
 >
 ✦
 </span>
 <span>
 <span className="text-paper/90">{c.name}</span>
 {c.note && <span className="text-paper/45"> · {c.note}</span>}
 </span>
 </li>
 ))}
 </ul>
 </div>
 )}
 </div>
 );
}
