import Link from "next/link";
import { getRuleMeta } from "@/lib/prayers/rules";

/**
 * "Pray now" card on the mobile Today shell. The honest, Purify-quiet
 * answer to a guided-audio stack: two real, tappable rows under one
 * header, no streak and no fabricated MM:SS.
 *
 *   1. The day's prayer rule (the Morning Rule), with its real
 *      `estimatedMinutes` from lib/prayers/rules.ts and a Begin arrow.
 *   2. The Prayer Rope Anthem, the one piece of first-party audio we
 *      carry, as a quiet play affordance into /prayers/anthem. Labelled
 *      by what it is ("a short chant"), never a made-up duration.
 *
 * Built in the existing bespoke Today card idiom (rounded-2xl,
 * border-paper/10, bg-paper/[0.03]), not a copy of any other app's card.
 */
export function PrayNowCard({ isDe = false }: { isDe?: boolean }) {
  const rule = getRuleMeta("morning");
  const labels = isDe
    ? {
        eyebrow: "Jetzt beten",
        ruleTitle: rule?.titleDe ?? rule?.title ?? "Morgengebete",
        minutes: (n: number) => `${n} Min`,
        begin: "Beginnen",
        anthemKicker: "Eine Hymne · für das Seil",
        anthemTitle: "Die Gebetsseil-Hymne",
        anthemBody: "Knoten für Knoten gesungen. Ein kurzer Gesang.",
      }
    : {
        eyebrow: "Pray now",
        ruleTitle: rule?.title ?? "Morning prayers",
        minutes: (n: number) => `${n} min`,
        begin: "Begin",
        anthemKicker: "A hymn · for the rope",
        anthemTitle: "The Prayer Rope Anthem",
        anthemBody: "Sung knot by knot. A short chant, follow the lyrics.",
      };

  const minutes = rule?.estimatedMinutes;

  return (
    <section className="overflow-hidden rounded-2xl border border-paper/10 bg-paper/[0.03]">
      <p className="px-3.5 pt-3.5 font-sans text-caption text-paper/55">
        {labels.eyebrow}
      </p>

      {/* Row 1: the day's rule, with its real read estimate. */}
      <Link
        href={rule?.href ?? "/prayers/morning"}
        className="group flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-paper/[0.04]"
      >
        <span
          aria-hidden
          className="shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-full border border-paper/15 bg-paper/[0.04] text-gold/85"
        >
          <SunIcon />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-ui leading-[1.2] text-paper group-hover:text-gold transition-colors">
            {labels.ruleTitle}
          </h3>
          {minutes != null && (
            <p className="mt-1 inline-flex items-center gap-1.5 font-sans text-caption text-paper/55">
              <ClockIcon />
              <span>{labels.minutes(minutes)}</span>
            </p>
          )}
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 font-sans text-caption font-medium text-paper/60 group-hover:text-gold transition-colors">
          {labels.begin}
          <ChevronRight />
        </span>
      </Link>

      <div className="mx-3.5 h-px bg-paper/8" />

      {/* Row 2: the Prayer Rope Anthem, first-party audio. */}
      <Link
        href="/prayers/anthem"
        className="group flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-paper/[0.04]"
      >
        <span
          aria-hidden
          className="shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-full border border-paper/25 bg-paper/[0.04] text-paper/85"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="translate-x-[1px]"
            aria-hidden
          >
            <path d="M7 5.5v13l11-6.5L7 5.5z" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-sans text-eyebrow uppercase tracking-[2px] text-paper/50">
            {labels.anthemKicker}
          </p>
          <h3 className="mt-0.5 font-serif text-ui leading-[1.2] text-paper group-hover:text-gold transition-colors">
            {labels.anthemTitle}
          </h3>
          <p className="mt-1 font-sans text-caption text-paper/55 leading-[1.45]">
            {labels.anthemBody}
          </p>
        </div>
      </Link>
    </section>
  );
}

function SunIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width={13}
      height={13}
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
