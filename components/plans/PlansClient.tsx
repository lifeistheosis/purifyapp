"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CoverArt } from "@/components/player/CoverArt";
import { PREMIUM_CHIP } from "@/components/premium/PremiumUI";
import { localBookNames } from "@/lib/bible/books";
import { cn } from "@/lib/cn";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { useToday } from "@/lib/calendar/useToday";
import { usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import { dateLocale } from "@/lib/i18n/deviceDates";
import { READING_PLANS, dayLabel, getPlan, type ReadingPlan } from "@/lib/plans/plans";
import { SEASON_PICTURE, seasonNow } from "@/lib/plans/season";
import { catchUp, nextDay, planStreak, startPlan, usePlans, type PlanProgress } from "@/lib/plans/progress";
import { hrefOfReading, startPlanSession } from "@/lib/plans/session";
import { readAloudCover } from "@/lib/readAloud/covers";
import { useMounted } from "@/lib/useMounted";

/**
 * The reading plans (1.9, the owner's pick for Practice of 2026-11-06, "a mix
 * of A and B": docs/1.9-build/BRAINSTORM.md). Continue first: the plan read
 * most lately, its day, today's reading and how long it takes, how far it has
 * come, and Continue, which opens the day's reading with the plan's bar at
 * its foot, as Begin on the plan's own page does. Then the other plans as
 * picture tiles, each the icon of its first book's prophet or apostle, the
 * cover a reading aloud wears (lib/readAloud/covers.ts), streamed from the
 * website and never carried in the apps, with the plate when it cannot load.
 *
 * Between them, from two weeks before a season of the Church's year to its
 * feast, that season's plan as a large picture card (lib/plans/season.ts):
 * the Nativity Fast, the Church's own readings of the Nativity, under the
 * Theotokos, with the day the fast begins in the reader's own calendar.
 *
 * 1.7's rows (the owner's note 22: "a cleaner UI") are the tiles now; what
 * they kept still holds: Plus is shown with its mark, never hidden, and no
 * gold. A tile's picture is faded into the tile's own ground by a mask, never
 * shaded over, so no bright hairline shows at its round corners
 * (lib/ui/__tests__/pictureCorners.test.ts; app/globals.css, .plan-tile-picture).
 */
export function PlansClient({ minutes }: { minutes: Record<string, number> }) {
  const { t, tn } = useTranslate();
  const router = useRouter();
  const upgrade = useUpgradeModal();
  const mounted = useMounted();
  const locked = usePlusFeatures() === false;
  const state = usePlans();
  const books = useMemo(() => localBookNames(t), [t]);
  const bookName = useCallback((slug: string) => books[slug] ?? t(`bible.books.${slug}`), [books, t]);
  const progressOf = (id: string) => (mounted ? state[id] : undefined);
  const streak = mounted ? planStreak(state) : 0;
  const catching = mounted ? catchUp(state) : null;

  // The plan to continue: begun and not finished, the one read most lately.
  const current =
    READING_PLANS.filter((p) => {
      const progress = progressOf(p.id);
      return progress && nextDay(p, progress) !== null;
    }).sort((a, b) => lastRead(progressOf(b.id)).localeCompare(lastRead(progressOf(a.id))))[0] ?? null;
  // The season's plan, unless it is the one under way, which Continue shows.
  const [style] = useCalendarStyleDefault();
  const today = useToday();
  const season = today ? seasonNow(today, style) : null;
  const seasonPlan = season && season.planId !== current?.id ? (getPlan(season.planId) ?? null) : null;
  const tiles = READING_PLANS.filter((p) => p.id !== current?.id && p.id !== seasonPlan?.id);

  const begin = (plan: ReadingPlan, day: number) => {
    if (locked) {
      upgrade.open("plans");
      return;
    }
    startPlan(plan.id);
    const session = startPlanSession(plan, day);
    if (session) router.push(hrefOfReading(session.items[0]));
  };

  return (
    <div className="mt-6 pb-16">
      {/* 1.9 (s4-05): yesterday missed is offered back, never a broken streak. */}
      {catching !== null ? (
        <p className="mb-3 font-sans text-detail font-semibold text-paper/80">{t("plans.catchUp", { streak: tn("plans.streak", catching) })}</p>
      ) : streak > 0 ? (
        <p className="mb-3 font-sans text-detail font-semibold text-paper/80">{tn("plans.streak", streak)}</p>
      ) : null}

      {current ? (
        <ContinueCard
          plan={current}
          progress={progressOf(current.id)}
          reading={(day) => dayLabel(current.days[day], bookName)}
          minutes={minutes[current.id] ?? null}
          onContinue={(day) => begin(current, day)}
        />
      ) : null}

      {season && seasonPlan ? (
        <SeasonCard plan={seasonPlan} begins={season.begins} minutes={minutes[seasonPlan.id] ?? null} locked={locked} first={!current} />
      ) : null}

      {tiles.length > 0 ? (
        <section aria-labelledby={current || seasonPlan ? "plans-more" : undefined} aria-label={current || seasonPlan ? undefined : t("plans.title")} className={cn((current || seasonPlan) && "mt-8")}>
          {current || seasonPlan ? (
            <h2 id="plans-more" className="font-sans text-eyebrow font-semibold uppercase tracking-[0.08em] text-paper/55">
              {t("plans.more")}
            </h2>
          ) : null}
          <ul className={cn("grid grid-cols-2 gap-3 md:grid-cols-3", (current || seasonPlan) && "mt-3")} data-plans-tiles="">
            {tiles.map((plan) => {
              const progress = progressOf(plan.id);
              const next = progress ? nextDay(plan, progress) : null;
              const where = !progress
                ? tn("plans.days", plan.days.length)
                : next === null
                  ? t("plans.finishedShort")
                  : t("plans.dayOf", { day: next + 1, total: plan.days.length });
              // A season's plan wears the season's picture; the rest, their first book's figure.
              const cover = plan.season ? { src: SEASON_PICTURE, fallback: SEASON_PICTURE } : readAloudCover(plan.days[0][0].book);
              return (
                <li key={plan.id}>
                  <Link
                    href={`/plans/${plan.id}`}
                    data-plan-tile={plan.id}
                    className="tap-press relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[18px] bg-night-soft p-3 ring-1 ring-inset ring-paper/10"
                  >
                    <CoverArt
                      src={cover.src}
                      fallback={cover.fallback}
                      size={240}
                      className="plan-tile-picture absolute inset-0 h-full w-full"
                    />
                    <span className="relative block font-sans text-ui font-semibold leading-tight text-paper">{t(`plans.${plan.id}.name`)}</span>
                    <span className="relative mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-caption text-paper/70">
                      {where}
                      {locked ? <span className={PREMIUM_CHIP}>{t("study.purifyPlus")}</span> : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** The last day a plan was read on, or begun on: the day keys sort as text. */
export function lastRead(progress: PlanProgress | undefined): string {
  if (!progress) return "";
  return Object.values(progress.done).reduce((last, day) => (day > last ? day : last), progress.startedOn);
}

/** The plan read most lately: its day, today's reading, how far, and Continue. */
function ContinueCard({
  plan,
  progress,
  reading,
  minutes,
  onContinue,
}: {
  plan: ReadingPlan;
  progress: PlanProgress | undefined;
  reading: (day: number) => string;
  minutes: number | null;
  onContinue: (day: number) => void;
}) {
  const { t } = useTranslate();
  const next = nextDay(plan, progress);
  if (next === null) return null;
  const read = progress ? Object.keys(progress.done).length : 0;
  const total = plan.days.length;
  return (
    <section aria-labelledby="plans-continue" data-plans-continue="" className="rounded-[22px] bg-night-soft p-5 ring-1 ring-inset ring-paper/10">
      <p className="font-sans text-caption font-semibold text-paper/55">{t("plans.dayOf", { day: next + 1, total })}</p>
      <h2 id="plans-continue" className="mt-1 font-serif text-title-sm font-semibold leading-snug text-paper">
        <Link href={`/plans/${plan.id}`} className="hover:underline">
          {t(`plans.${plan.id}.name`)}
        </Link>
      </h2>
      <p className="mt-1 font-sans text-caption text-paper/55">
        {minutes ? `${reading(next)} · ${t("plans.minutesADay", { min: minutes })}` : reading(next)}
      </p>
      <span aria-hidden className="mt-4 block h-1 overflow-hidden rounded-full bg-paper/10">
        <span className="block h-full rounded-full bg-paper/80" style={{ width: `${Math.round((read / total) * 100)}%` }} />
      </span>
      <button
        type="button"
        onClick={() => onContinue(next)}
        data-plan-continue=""
        className="tap-press mt-4 inline-flex h-12 w-full items-center justify-center rounded-pill bg-paper font-sans text-ui font-semibold text-night motion-safe:transition-colors hover:bg-paper/90"
      >
        {t("plans.continue")}
      </button>
    </section>
  );
}

/**
 * The season's plan, as a large picture card: the Theotokos over the plan's
 * name, what it is, and how long; before the season, the day it begins. The
 * picture stands at the card's head with nothing laid over it.
 */
function SeasonCard({
  plan,
  begins,
  minutes,
  locked,
  first,
}: {
  plan: ReadingPlan;
  begins: Date | null;
  minutes: number | null;
  locked: boolean;
  /** Nothing stands above it: no Continue. */
  first: boolean;
}) {
  const { t, tn, locale } = useTranslate();
  // In a language the device can write (lib/i18n/deviceDates.ts), at noon UTC as the season gives it.
  const date = begins ? new Intl.DateTimeFormat(dateLocale(locale), { day: "numeric", month: "long", timeZone: "UTC" }).format(begins) : null;
  return (
    <section aria-labelledby="plans-season" data-plans-season="" className={cn("overflow-hidden rounded-[22px] bg-night-soft ring-1 ring-inset ring-paper/10", !first && "mt-4")}>
      <Link href={`/plans/${plan.id}`} className="tap-press block">
        <CoverArt src={SEASON_PICTURE} fallback={SEASON_PICTURE} size={420} className="block h-36 w-full object-cover object-[50%_30%]" />
        <div className="p-5">
          {date ? (
            <p className="font-sans text-caption font-semibold uppercase tracking-[0.06em] text-paper/55">{t("plans.season.begins", { date })}</p>
          ) : null}
          <h2 id="plans-season" className={cn("font-serif text-title-sm font-semibold leading-snug text-paper", date && "mt-1")}>
            {t(`plans.${plan.id}.name`)}
          </h2>
          <p className="mt-1 font-sans text-detail leading-[1.55] text-paper/70">{t(`plans.${plan.id}.body`)}</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-caption text-paper/50">
            {minutes ? `${tn("plans.days", plan.days.length)} · ${t("plans.minutesADay", { min: minutes })}` : tn("plans.days", plan.days.length)}
            {locked ? <span className={PREMIUM_CHIP}>{t("study.purifyPlus")}</span> : null}
          </p>
        </div>
      </Link>
    </section>
  );
}
