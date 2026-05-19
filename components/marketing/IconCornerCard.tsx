import Link from "next/link";
import Image from "next/image";
import {
  commemorationsOn,
  fastingStatus,
  formatLongDate,
  paschaInfo,
  startOfDayUtc,
  type FastKind,
} from "@/lib/calendar/orthodox";
import { getSaint } from "@/lib/saints/saints";

const FAST_PILL: Record<FastKind, string> = {
  strict: "bg-[#c1272d]/15 border-[#c1272d]/40 text-[#f8cac7]",
  "wine-oil": "bg-[#d4af37]/15 border-[#d4af37]/45 text-[#f4dc91]",
  fish: "bg-[#7b9b8f]/15 border-[#7b9b8f]/45 text-[#bfd6cc]",
  fast: "bg-paper/[0.08] border-paper/25 text-paper/85",
  "fast-free": "bg-emerald-500/15 border-emerald-500/40 text-emerald-200",
  normal: "bg-paper/[0.06] border-paper/20 text-paper/75",
};

/**
 * The home hero's right-column card. Two modes:
 *
 *   Mode 1 — saint has an iconUrl: the icon JPG fills the upper portion
 *   of the card as a real photo background, with a dark gradient overlay so
 *   text below reads. Like an actual Orthodox icon corner with the icon
 *   present.
 *
 *   Mode 2 — no icon for the day's saint (the common case for minor
 *   commemorations): pure typographic card. No placeholder, no decoration.
 *   The date and the saint's name carry the visual weight.
 *
 * Replaces the v3.1 wood-gradient + candle-glow + "+" placeholder card.
 */
export function IconCornerCard() {
  const today = startOfDayUtc(new Date());
  const fast = fastingStatus(today);
  const pascha = paschaInfo(today);
  const commemorations = commemorationsOn(today);
  const headline =
    commemorations.find((c) => c.kind === "feast") ?? commemorations[0];
  const headlineSaint =
    headline?.saint ?? (headline?.slug ? getSaint(headline.slug) : null);

  const hasIcon = !!headlineSaint?.iconUrl;
  const paschaLine =
    pascha.daysAway > 0
      ? `${pascha.daysAway} days until Pascha`
      : pascha.daysAway === 0
        ? "Pascha is today"
        : "Pascha has passed";

  return (
    <Link
      href="/prayers/today"
      aria-label="Open today's prayer"
      className="group relative block overflow-hidden rounded-[28px] border border-paper/15 shadow-[0_24px_60px_rgba(0,0,0,0.55)] transition-colors duration-200 hover:border-[#d4af37]/55 bg-night-soft"
      style={{
        height: "min(72dvh, 580px)",
        aspectRatio: "9 / 19",
      }}
    >
      {hasIcon && headlineSaint ? (
        <>
          {/* Photo-anchored mode — saint icon fills the upper portion. */}
          <div className="absolute inset-0">
            <Image
              src={headlineSaint.iconUrl!}
              alt={`Icon of ${headlineSaint.name}`}
              fill
              priority
              sizes="(max-width: 768px) 90vw, 360px"
              className="object-cover object-top"
            />
            {/* Dark gradient: top transparent → bottom solid night, so the
                lower text panel is fully readable. */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(22,18,25,0) 0%, rgba(22,18,25,0.15) 38%, rgba(22,18,25,0.85) 64%, rgba(22,18,25,0.98) 88%)",
              }}
            />
          </div>

          {/* Text panel — sits over the gradient's lower half. */}
          <div className="relative h-full flex flex-col justify-end px-6 pb-7">
            <p className="font-sans text-[10.5px] uppercase tracking-[2px] text-[#d4af37]/85 font-semibold">
              Today
            </p>
            <p className="mt-1 font-sans text-[12.5px] text-paper/70">
              {formatLongDate(today)}
            </p>

            <h2 className="mt-4 font-serif text-[26px] md:text-[28px] leading-[1.15] text-paper">
              {headline?.name ?? headlineSaint.name}
            </h2>
            {headlineSaint.byname && (
              <p className="mt-1 font-serif italic text-[13px] text-[#d4af37]/90">
                &ldquo;{headlineSaint.byname}&rdquo;
              </p>
            )}

            <div className="mt-5 space-y-2.5">
              <div
                className={`rounded-pill border px-3 py-1.5 text-center font-sans text-[12px] font-medium ${FAST_PILL[fast.kind]}`}
              >
                {fast.label}
              </div>
              <p className="font-sans text-[11px] text-paper/55 text-center">
                {paschaLine}
              </p>
              <p className="font-sans text-[12px] font-semibold text-[#d4af37] text-center group-hover:underline underline-offset-2">
                Open today&rsquo;s prayer →
              </p>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Typographic mode — no decoration. The day's date and saint name
              carry the card. */}
          <div className="relative h-full flex flex-col px-7 py-8">
            <p className="font-sans text-[10.5px] uppercase tracking-[2px] text-[#d4af37]/85 font-semibold">
              Today
            </p>
            <p className="mt-1.5 font-sans text-[13px] text-paper/70">
              {formatLongDate(today)}
            </p>

            <div className="mt-auto mb-auto flex flex-col">
              <h2 className="font-serif text-[28px] md:text-[32px] leading-[1.15] text-paper">
                {headline?.name ?? "No commemoration indexed"}
              </h2>
              {headline?.note && (
                <p className="mt-3 font-serif italic text-[14.5px] text-paper/65 leading-[1.5]">
                  {headline.note}
                </p>
              )}
            </div>

            <div className="space-y-2.5">
              <div
                className={`rounded-pill border px-3 py-1.5 text-center font-sans text-[12px] font-medium ${FAST_PILL[fast.kind]}`}
              >
                {fast.label}
              </div>
              <p className="font-sans text-[11px] text-paper/55 text-center">
                {paschaLine}
              </p>
              <p className="font-sans text-[12px] font-semibold text-[#d4af37] text-center group-hover:underline underline-offset-2">
                Open today&rsquo;s prayer →
              </p>
            </div>
          </div>
        </>
      )}
    </Link>
  );
}
