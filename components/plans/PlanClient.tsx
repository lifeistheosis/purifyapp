"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PlusGate } from "@/components/florilegium/PlusGate";
import { CARD, CARD_BG } from "@/components/ui/Graphite";
import { Check } from "@/components/ui/icons/Check";
import { cn } from "@/lib/cn";
import { getClientEntitlements } from "@/lib/entitlements/client";
import { onEntitlementsChanged } from "@/lib/entitlements/refresh";
import { dayLabel, getPlan } from "@/lib/plans/plans";
import { completeDay, nextDay, planStreak, resetPlan, startPlan, uncompleteDay, usePlans } from "@/lib/plans/progress";

/**
 * One reading plan: today's reading with a way to mark it read, the streak,
 * the progress, and every day of the plan. A Purify Plus tool, entitlement
 * read at runtime and erring open while it loads (FlorilegiumGate's posture).
 */
export function PlanClient({ id }: { id: string }) {
  const [entitled, setEntitled] = useState(true);
  useEffect(() => {
    let alive = true;
    const resolve = () =>
      getClientEntitlements().then((e) => {
        if (alive) setEntitled(e.plusFeatures);
      });
    void resolve();
    const off = onEntitlementsChanged(() => void resolve());
    return () => {
      alive = false;
      off();
    };
  }, []);
  if (!entitled) return <PlusGate titleKey="plus.plans.title" blurbKey="plus.plans.body" modalFeature="plans" />;
  return <Plan id={id} />;
}

function Plan({ id }: { id: string }) {
  const { t, tn } = useTranslate();
  const plan = getPlan(id);
  const state = usePlans();
  const [confirmReset, setConfirmReset] = useState(false);
  if (!plan) return null;

  const progress = state[id];
  const next = nextDay(plan, progress);
  const read = progress ? Object.keys(progress.done).length : 0;
  const streak = planStreak(state);
  const bookName = (slug: string) => t(`bible.books.${slug}`);

  if (!progress) {
    return (
      <div className="mt-8">
        <button
          type="button"
          onClick={() => startPlan(id)}
          className="inline-flex min-h-12 items-center rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night hover:bg-paper/90"
        >
          {t("plans.start")}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {next !== null ? (
        <section aria-labelledby="plan-today" className={cn(CARD, "hover:translate-y-0 md:p-8")} style={CARD_BG}>
          <h2 id="plan-today" className="text-title-sm leading-snug text-paper md:text-title">
            {dayLabel(plan.days[next], bookName)}
          </h2>
          <p className="mt-1.5 font-sans text-detail font-semibold text-premium-ink">
            {t("plans.dayOf", { day: next + 1, total: plan.days.length })}
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {plan.days[next].map((r) => (
              <li key={`${r.book}-${r.chapter}`}>
                <Link
                  href={`/bible/${r.book}/${r.chapter}`}
                  className="inline-flex min-h-11 items-center rounded-pill border border-paper/15 bg-paper/[0.04] px-4 font-sans text-detail font-medium text-paper/85 hover:border-paper/35 hover:text-paper"
                >
                  {bookName(r.book)} {r.chapter}
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => completeDay(plan, next)}
            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night hover:bg-paper/90"
          >
            <Check size={18} />
            {t("plans.markRead")}
          </button>
        </section>
      ) : (
        <section className={cn(CARD, "hover:translate-y-0 md:p-8")} style={CARD_BG}>
          <h2 className="text-title-sm text-paper md:text-title">{t("plans.finished")}</h2>
        </section>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="font-sans text-ui text-paper/70">
          {t("plans.progress", { read, total: plan.days.length })}
        </p>
        {streak > 0 ? <p className="font-sans text-ui font-semibold text-premium-ink">{tn("plans.streak", streak)}</p> : null}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper/10" aria-hidden>
        <div className="h-full rounded-full bg-premium" style={{ width: `${Math.round((read / plan.days.length) * 100)}%` }} />
      </div>

      <section aria-labelledby="plan-days" className="mt-10">
        <h2 id="plan-days" className="text-title-sm text-paper">{t("plans.allDays")}</h2>
        <ol className="mt-4 divide-y divide-paper/8 border-y border-paper/8">
          {plan.days.map((day, i) => {
            const done = Boolean(progress.done[String(i)]);
            return (
              <li key={i} className="flex items-center gap-3 py-2">
                <button
                  type="button"
                  onClick={() => (done ? uncompleteDay(id, i) : completeDay(plan, i))}
                  aria-pressed={done}
                  aria-label={t(done ? "plans.markUnread" : "plans.markDayRead", { day: i + 1 })}
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors",
                    done ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-300" : "border-paper/20 text-paper/40 hover:border-paper/45",
                  )}
                >
                  {done ? <Check size={17} /> : <span className="font-sans text-caption tabular-nums">{i + 1}</span>}
                </button>
                <Link
                  href={`/bible/${day[0].book}/${day[0].chapter}`}
                  className={cn("min-w-0 flex-1 font-sans text-ui", done ? "text-paper/50" : "text-paper/85 hover:text-paper")}
                >
                  {dayLabel(day, bookName)}
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <p className="mt-8">
        <button
          type="button"
          onClick={() => {
            if (!confirmReset) {
              setConfirmReset(true);
              window.setTimeout(() => setConfirmReset(false), 4000);
              return;
            }
            resetPlan(id);
            setConfirmReset(false);
          }}
          className="inline-flex min-h-11 items-center font-sans text-detail text-paper/50 underline underline-offset-4 hover:text-paper"
        >
          {confirmReset ? t("plans.resetConfirm") : t("plans.reset")}
        </button>
      </p>
    </div>
  );
}
