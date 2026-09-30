"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CARD, CARD_BG } from "@/components/ui/Graphite";
import { cn } from "@/lib/cn";
import { plusFeaturesNow, usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import { READING_PLANS, dayLabel } from "@/lib/plans/plans";
import { nextDay, planStreak, startPlan, usePlans } from "@/lib/plans/progress";

/**
 * The reading plans (lib/plans/plans.ts), each as a card: what it is, how
 * long, and where the reader is in it. Starting one is Purify Plus; every
 * reader sees them all, marked Plus, and meets the upgrade sheet named for
 * them on Start (the owner's rule: a Plus feature is shown, never hidden).
 */
export function PlansClient() {
  const { t, tn } = useTranslate();
  const router = useRouter();
  const upgrade = useUpgradeModal();
  const plus = usePlusFeatures();
  const state = usePlans();
  const streak = planStreak(state);
  const bookName = (slug: string) => t(`bible.books.${slug}`);

  const start = (id: string) => {
    void plusFeaturesNow().then((ok) => {
      if (ok === false) {
        upgrade.open("plans");
        return;
      }
      startPlan(id);
      router.push(`/plans/${id}`);
    });
  };

  return (
    <div className="mt-10">
      {streak > 0 ? (
        <p className="mb-6 font-sans text-ui font-semibold text-premium-ink">{tn("plans.streak", streak)}</p>
      ) : null}
      <ul className="grid gap-4 md:grid-cols-3">
        {READING_PLANS.map((plan) => {
          const progress = state[plan.id];
          const next = nextDay(plan, progress);
          const read = progress ? Object.keys(progress.done).length : 0;
          return (
            <li key={plan.id} className={cn(CARD, "flex flex-col hover:translate-y-0")} style={CARD_BG}>
              <h2 className="text-title-sm leading-snug text-paper">{t(`plans.${plan.id}.name`)}</h2>
              <p className="mt-2 flex-1 font-sans text-ui leading-[1.6] text-paper/70">{t(`plans.${plan.id}.body`)}</p>
              <p className="mt-4 font-sans text-caption text-paper/50">{tn("plans.days", plan.days.length)}</p>
              {progress ? (
                <>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper/10" aria-hidden>
                    <div className="h-full rounded-full bg-premium" style={{ width: `${Math.round((read / plan.days.length) * 100)}%` }} />
                  </div>
                  <Link
                    href={`/plans/${plan.id}`}
                    className="mt-5 inline-flex min-h-11 items-center justify-center rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-night hover:bg-paper/90"
                  >
                    {next === null
                      ? t("plans.finishedShort")
                      : t("plans.continueDay", { day: next + 1, reading: dayLabel(plan.days[next], bookName) })}
                  </Link>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => start(plan.id)}
                  className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-pill border border-paper/25 px-5 font-sans text-ui font-semibold text-paper hover:border-paper/50"
                >
                  {t("plans.start")}
                  {plus === false ? (
                    <span className="rounded-pill border border-premium/50 bg-premium/[0.12] px-2 py-0.5 font-sans text-caption font-semibold text-premium-ink">
                      {t("study.purifyPlus")}
                    </span>
                  ) : null}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
