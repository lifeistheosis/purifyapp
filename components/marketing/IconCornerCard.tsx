import Link from "next/link";
import {
  commemorationsOn,
  fastingStatus,
  formatLongDate,
  paschaInfo,
  startOfDayUtc,
  type FastKind,
} from "@/lib/calendar/orthodox";
import { SaintIcon } from "@/components/saints/SaintIcon";
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
 * The home hero's right-column card. Evokes an Orthodox icon corner —
 * a quiet place where the icons hang, the lamp burns, and the day is
 * remembered before God. Shows today's saint, fast, and Pascha
 * countdown; links into /prayers/today.
 *
 * Server component; uses the same date helpers as /calendar and
 * /prayers/today so the surface is always live.
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

  return (
    <Link
      href="/prayers/today"
      aria-label="Open today's prayer"
      className="group relative block overflow-hidden rounded-[28px] border border-[#8a6c2a]/45 shadow-[0_24px_60px_rgba(0,0,0,0.55)] transition-colors duration-200 hover:border-[#d4af37]/55"
      style={{
        background:
          "linear-gradient(170deg, #2a1f10 0%, #1a1219 38%, #161219 100%)",
        height: "min(70dvh, 560px)",
        aspectRatio: "9 / 19",
      }}
    >
      {/* Candle-glow at the top corner. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-10 h-48 w-48 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(212,175,55,0.30) 0%, rgba(212,175,55,0) 70%)",
        }}
      />

      {/* Inner gold frame, as on a real icon panel. */}
      <div className="absolute inset-3 rounded-[20px] border border-[#d4af37]/35 pointer-events-none" />

      <div className="relative h-full flex flex-col px-6 py-7">
        {/* Eyebrow */}
        <p className="font-sans text-[10.5px] uppercase tracking-[2px] text-[#d4af37]/80 font-semibold">
          Today
        </p>
        <p className="mt-1 font-sans text-[12.5px] text-paper/65">
          {formatLongDate(today)}
        </p>

        {/* Saint icon centerpiece */}
        <div className="mt-6 flex-1 flex flex-col items-center justify-center text-center">
          {headlineSaint ? (
            <>
              <SaintIcon saint={headlineSaint} size="md" />
              <p className="mt-4 font-sans text-[15px] font-semibold text-paper leading-tight max-w-[180px]">
                {headline?.name ?? headlineSaint.name}
              </p>
              {headlineSaint.byname && (
                <p className="mt-1 font-serif italic text-[12.5px] text-[#d4af37]/85">
                  &ldquo;{headlineSaint.byname}&rdquo;
                </p>
              )}
            </>
          ) : headline ? (
            <>
              <span
                aria-hidden
                className="h-16 w-16 rounded-full flex items-center justify-center bg-[#d4af37]/15 text-[#f4dc91] border border-[#d4af37]/40 text-[24px]"
              >
                {headline.kind === "feast" ? "✦" : "+"}
              </span>
              <p className="mt-4 font-sans text-[15px] font-semibold text-paper leading-tight max-w-[200px]">
                {headline.name}
              </p>
              {headline.note && (
                <p className="mt-1 font-serif italic text-[12.5px] text-paper/65 max-w-[210px] leading-snug">
                  {headline.note}
                </p>
              )}
            </>
          ) : (
            <p className="font-serif italic text-[14px] text-paper/55 max-w-[180px]">
              No saint indexed for this day.
            </p>
          )}
        </div>

        {/* Bottom: fast + Pascha */}
        <div className="mt-auto space-y-2.5">
          <div
            className={`rounded-pill border px-3 py-1.5 text-center font-sans text-[12px] font-medium ${FAST_PILL[fast.kind]}`}
          >
            {fast.label}
          </div>
          <p className="font-sans text-[11px] text-paper/55 text-center">
            {pascha.daysAway > 0
              ? `${pascha.daysAway} days until Pascha`
              : pascha.daysAway === 0
                ? "Pascha is today"
                : "Pascha has passed"}
          </p>
          <p className="font-sans text-[12px] font-semibold text-[#d4af37] text-center group-hover:underline underline-offset-2">
            Open today&rsquo;s prayer →
          </p>
        </div>
      </div>
    </Link>
  );
}
