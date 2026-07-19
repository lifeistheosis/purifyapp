"use client";

import Link from "next/link";
import { getRuleMeta } from "@/lib/prayers/rules";
import { useTranslate } from "@/components/i18n/MessagesProvider";

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
export function PrayNowCard() {
  const { locale, t } = useTranslate();
  const rule = getRuleMeta("morning");
  // Rule titles still carry a legacy titleDe field; the prayers surface
  // migrates them to the catalog with the rest of the rules metadata.
  const ruleTitle =
    (locale === "de" ? rule?.titleDe : undefined) ??
    rule?.title ??
    t("today.prayNow.morningFallback");
  const labels = {
    eyebrow: t("today.prayNow.eyebrow"),
    ruleTitle,
    minutes: (n: number) => t("today.minRead", { count: n }),
    begin: t("today.prayNow.begin"),
    anthemKicker: t("today.prayNow.anthemKicker"),
    anthemTitle: t("today.prayNow.anthemTitle"),
    anthemBody: t("today.prayNow.anthemBody"),
  };

  const minutes = rule?.estimatedMinutes;

  return (
    <div className="space-y-3">
      {/* Featured card: the day's rule, as a soft gradient call-to-pray with
          a clear Begin pill — the Today screen's primary action. */}
      <Link
        href={rule?.href ?? "/prayers/morning"}
        className="group relative block overflow-hidden rounded-[28px] p-5 shadow-[0_18px_40px_-14px_rgba(0,0,0,0.5)] transition-transform active:scale-[0.99]"
        style={{
          background:
            "radial-gradient(115% 90% at 88% 12%, rgba(255,255,255,0.16) 0%, transparent 55%), linear-gradient(150deg, #34343a 0%, #232327 60%, #1a1a1d 100%)",
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full bg-paper/15 blur-2xl"
        />
        <div className="relative flex items-start gap-4">
          <span
            aria-hidden
            className="shrink-0 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-paper/10 text-gold-pale ring-1 ring-inset ring-paper/15"
          >
            <SunIcon />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-gold-pale/80">
              {labels.eyebrow}
            </p>
            <h3 className="mt-1 font-serif text-title-sm leading-[1.15] text-paper">
              {labels.ruleTitle}
            </h3>
            {minutes != null && (
              <p className="mt-1.5 inline-flex items-center gap-1.5 font-sans text-caption text-paper/70">
                <ClockIcon />
                <span>{labels.minutes(minutes)}</span>
              </p>
            )}
          </div>
        </div>
        <span className="relative mt-5 flex w-full items-center justify-center gap-1.5 rounded-pill bg-gold px-5 py-3 font-sans text-ui font-semibold text-night shadow-[0_6px_16px_-4px_rgba(0,0,0,0.5)] transition-colors group-hover:bg-gold-soft">
          {labels.begin}
          <ChevronRight />
        </span>
      </Link>

      {/* The Prayer Rope Anthem — first-party audio, as a quiet play row. */}
      <Link
        href="/prayers/anthem"
        className="group flex items-center gap-3 rounded-[22px] border border-paper/10 bg-paper/[0.04] px-4 py-3.5 transition-colors hover:bg-paper/[0.07]"
      >
        <span
          aria-hidden
          className="shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-full bg-gold text-night shadow-[0_6px_16px_-6px_rgba(0,0,0,0.6)]"
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
    </div>
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
