"use client";

// Try reading plans (r3-07 A): the plans page (components/plans/
// PlansClient.tsx), the three plans with what each is and how many days it
// runs, and under them the chosen plan's days as its own page draws them
// (components/plans/PlanPath.tsx, the real path): today ringed, the next
// days waiting, every day of the plan a tap away.
//
// Working, for as long as the preview lasts: tick a day and it fills, the
// count moves, and the streak is counted, as it would be (lib/plans/
// progress.ts, the same pure counting). Nothing is kept: the reader's plans
// are not read or written here, so a preview begins at day one, as a plan
// does.

import { useCallback, useMemo, useState } from "react";

import type { TryProps } from "@/components/billing/PlusTry";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PlanPath } from "@/components/plans/PlanPath";
import { localBookNames } from "@/lib/bible/books";
import { cn } from "@/lib/cn";
import { READING_PLANS, getPlan } from "@/lib/plans/plans";
import { nextDay, planStreak, type PlansState } from "@/lib/plans/progress";
import { todayKey } from "@/lib/rhythm/dayKey";

import { TryWindow } from "./TryKit";

export default function TryPlans({ row }: TryProps) {
  const { t, tn } = useTranslate();
  const books = useMemo(() => localBookNames(t), [t]);
  const bookName = useCallback((slug: string) => books[slug] ?? t(`bible.books.${slug}`), [books, t]);
  const [chosen, setChosen] = useState(READING_PLANS[0].id);
  // The days ticked in this preview, by plan, as the plans' own store keeps them.
  const [state, setState] = useState<PlansState>({});
  const [justRead, setJustRead] = useState<number | null>(null);

  const plan = getPlan(chosen) ?? READING_PLANS[0];
  const progress = state[plan.id];
  const streak = planStreak(state);

  const toggle = (index: number, read: boolean) => {
    const day = todayKey();
    setState((was) => {
      const p = was[plan.id] ?? { startedOn: day, done: {} };
      const done = { ...p.done };
      if (read) done[String(index)] = day;
      else delete done[String(index)];
      return { ...was, [plan.id]: { ...p, done } };
    });
    setJustRead(read ? index : null);
  };

  return (
    <TryWindow label={t(row.name)} tall>
      <div className="px-5 pb-16 pt-6">
        <h3 className="text-title font-bold leading-[1.12] tracking-[-0.01em] text-paper">{t("plans.title")}</h3>
        <p className="mt-2 font-sans text-detail leading-[1.6] text-paper/55">{t("plans.lede")}</p>
        {streak > 0 ? <p className="mt-4 font-sans text-detail font-semibold text-paper/80">{tn("plans.streak", streak)}</p> : null}

        <ul className="mt-4 divide-y divide-paper/8 border-y border-paper/8">
          {READING_PLANS.map((p) => {
            const on = p.id === plan.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setChosen(p.id);
                    setJustRead(null);
                  }}
                  className={cn("tap-press block w-full py-4 text-start", on ? "opacity-100" : "opacity-60 hover:opacity-90")}
                >
                  <span className="block font-serif text-title-sm font-semibold leading-snug text-paper">{t(`plans.${p.id}.name`)}</span>
                  <span className="mt-1 block font-sans text-detail leading-[1.55] text-paper/70">{t(`plans.${p.id}.body`)}</span>
                  <span className="mt-1.5 block font-sans text-caption text-paper/50">{tn("plans.days", p.days.length)}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <PlanPath
          key={plan.id}
          plan={plan}
          progress={progress}
          today={nextDay(plan, progress)}
          justRead={justRead}
          bookName={bookName}
          onToggle={toggle}
        />
      </div>
    </TryWindow>
  );
}
