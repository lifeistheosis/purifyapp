"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PREMIUM_CHIP } from "@/components/premium/PremiumUI";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { localBookNames } from "@/lib/bible/books";
import { usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import { READING_PLANS, dayLabel } from "@/lib/plans/plans";
import { nextDay, planStreak, usePlans } from "@/lib/plans/progress";
import { useMounted } from "@/lib/useMounted";

/**
 * The reading plans, as rows (1.7, the owner's note 22: "a cleaner UI"). The
 * plans a reader has begun come first, each with where they are ("Day 6 of
 * 89 · Matthew 6") and a thin paper line of how far; then the rest, each with
 * one line of what it is and how long a day takes. A row opens the plan's
 * page, where Begin is. Plus is shown with its mark, never hidden. The gold
 * bars and the gold streak line went: the premium ink is for the Plus mark.
 */
export function PlansClient({ minutes }: { minutes: Record<string, number> }) {
  const { t, tn } = useTranslate();
  const mounted = useMounted();
  const locked = usePlusFeatures() === false;
  const state = usePlans();
  const books = useMemo(() => localBookNames(t), [t]);
  const bookName = useCallback((slug: string) => books[slug] ?? t(`bible.books.${slug}`), [books, t]);
  const progressOf = (id: string) => (mounted ? state[id] : undefined);
  const streak = mounted ? planStreak(state) : 0;
  const begun = READING_PLANS.filter((p) => progressOf(p.id));
  const rest = READING_PLANS.filter((p) => !progressOf(p.id));

  const chevron = <ChevronLeft size={16} className="shrink-0 -scale-x-100 text-paper/40 rtl:scale-x-100" />;

  return (
    <div className="mt-6 pb-16">
      {streak > 0 ? <p className="mb-2 font-sans text-detail font-semibold text-paper/80">{tn("plans.streak", streak)}</p> : null}

      {begun.length > 0 ? (
        <ul className="divide-y divide-paper/8 border-y border-paper/8" data-plans-begun="">
          {begun.map((plan) => {
            const progress = progressOf(plan.id);
            const next = nextDay(plan, progress);
            const read = progress ? Object.keys(progress.done).length : 0;
            return (
              <li key={plan.id}>
                <Link href={`/plans/${plan.id}`} className="flex items-center gap-3 py-5 active:opacity-80">
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif text-title-sm font-semibold leading-snug text-paper">{t(`plans.${plan.id}.name`)}</span>
                    <span className="mt-1 block truncate font-sans text-caption text-paper/55">
                      {next === null
                        ? t("plans.finishedShort")
                        : `${t("plans.dayOf", { day: next + 1, total: plan.days.length })} · ${dayLabel(plan.days[next], bookName)}`}
                    </span>
                    <span aria-hidden className="mt-3 block h-1 overflow-hidden rounded-full bg-paper/10">
                      <span className="block h-full rounded-full bg-paper/80" style={{ width: `${Math.round((read / plan.days.length) * 100)}%` }} />
                    </span>
                  </span>
                  <span className="shrink-0 font-sans text-detail font-semibold text-paper/75">{t("plans.continue")}</span>
                  {chevron}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}

      {rest.length > 0 ? (
        <ul className={`divide-y divide-paper/8 border-b border-paper/8${begun.length ? "" : " border-t"}`} data-plans-rest="">
          {rest.map((plan) => (
            <li key={plan.id}>
              <Link href={`/plans/${plan.id}`} className="flex items-center gap-3 py-5 active:opacity-80">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="font-serif text-title-sm font-semibold leading-snug text-paper">{t(`plans.${plan.id}.name`)}</span>
                    {locked ? <span className={PREMIUM_CHIP}>{t("study.purifyPlus")}</span> : null}
                  </span>
                  <span className="mt-1 block font-sans text-detail leading-[1.55] text-paper/70">{t(`plans.${plan.id}.body`)}</span>
                  <span className="mt-1.5 block font-sans text-caption text-paper/50">
                    {tn("plans.days", plan.days.length)}
                    {minutes[plan.id] ? ` · ${t("plans.minutesADay", { min: minutes[plan.id] })}` : ""}
                  </span>
                </span>
                {chevron}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
