import Link from "next/link";
import type { Saint } from "@/lib/saints/saints";
import { SaintIcon } from "@/components/saints/SaintIcon";

/**
 * Second card in the mobile Today timeline: the saint of the day.
 *
 * Two render modes:
 *   - `saint` provided: full registry profile with icon and a "min read"
 *     estimate, tap navigates to /saints/{slug}.
 *   - `fallbackName` provided: the day's headline commemoration is named
 *     in the calendar but not deeply profiled in the registry. Show the
 *     name (and one-line note when present) and tap-through to the
 *     calendar day so the user sees fuller commemoration text.
 */
export function TodaySaintCard({
  saint,
  fallbackName,
  fallbackNote,
  eyebrow = "Today's Saint",
  estimateMinutes,
}: {
  saint?: Saint;
  fallbackName?: string;
  fallbackNote?: string;
  eyebrow?: string;
  estimateMinutes?: number;
}) {
  if (saint) {
    const minutes =
      estimateMinutes ??
      Math.max(
        2,
        Math.min(
          12,
          Math.round(
            ((saint.shortBio?.length ?? 0) +
              (saint.life?.join(" ").length ?? 0)) /
              900,
          ),
        ),
      );
    return (
      <Link
        href={`/saints/${saint.slug}`}
        className="flex items-stretch gap-4 rounded-2xl border border-paper/10 bg-paper/[0.03] p-4 transition-colors hover:bg-paper/[0.06]"
      >
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[12px] text-paper/55">{eyebrow}</p>
          <h3 className="mt-1 font-serif text-[20px] leading-[1.2] text-paper">
            {saint.name}
          </h3>
          <p className="mt-3 inline-flex items-center gap-1.5 font-sans text-[12px] text-paper/55">
            <ClockIcon />
            <span>{minutes} min</span>
          </p>
        </div>
        <div className="relative shrink-0 self-stretch flex items-center">
          <SaintIcon saint={saint} size="md" />
          <span
            aria-hidden
            className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-night/85 border border-paper/20 text-paper"
          >
            <ChevronRight />
          </span>
        </div>
      </Link>
    );
  }

  // Commemorated-but-not-profiled fallback.
  if (fallbackName) {
    return (
      <Link
        href="/calendar"
        className="flex items-stretch gap-4 rounded-2xl border border-paper/10 bg-paper/[0.03] p-4 transition-colors hover:bg-paper/[0.06]"
      >
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[12px] text-paper/55">{eyebrow}</p>
          <h3 className="mt-1 font-serif text-[18.5px] leading-[1.25] text-paper">
            {fallbackName}
          </h3>
          {fallbackNote && (
            <p className="mt-2 font-serif italic text-[13.5px] text-paper/65 leading-[1.45]">
              {fallbackNote}
            </p>
          )}
          <p className="mt-3 inline-flex items-center gap-1.5 font-sans text-[12px] text-paper/55">
            Open in calendar
          </p>
        </div>
        <div className="relative shrink-0 self-stretch flex items-center">
          <span
            aria-hidden
            className="flex h-12 w-12 items-center justify-center rounded-full border border-paper/15 bg-night text-gold/85 text-[20px]"
          >
            ✦
          </span>
        </div>
      </Link>
    );
  }

  return null;
}

function ClockIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
