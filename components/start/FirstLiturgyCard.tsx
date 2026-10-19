"use client";

// Start here's door to Your first Liturgy (1.7). Before the reader has begun
// it says what the guide is; once they have, it says where they are: their
// church, their day and how much of the checklist is done, from the plan on
// the device (lib/start/liturgyPlan.ts). It imports none of the guide's words.

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { useToday } from "@/lib/calendar/useToday";
import { CHECK_IDS, dayOf, formatDay, kindNameKey, upcomingDate, useLiturgyPlan } from "@/lib/start/liturgyPlan";

export function FirstLiturgyCard() {
  const { t, locale } = useTranslate();
  const plan = useLiturgyPlan();
  const todayDate = useToday();
  const begun = plan.step !== "intro" || plan.done;
  const date = todayDate ? upcomingDate(plan, dayOf(todayDate)) : null;
  const where = [
    plan.kind && plan.kind !== "unsure" ? t(kindNameKey(plan.kind)) : null,
    date ? formatDay(date, locale) : null,
    t("start.liturgy.ready.count", { n: plan.checked.length, total: CHECK_IDS.length }),
  ].filter(Boolean);

  return (
    <section aria-labelledby="start-liturgy-title" className="mt-12">
      <h2 id="start-liturgy-title" className="text-title-sm font-bold leading-tight text-paper">
        {t("start.liturgy.title")}
      </h2>
      <div className="mt-3 rounded-2xl border border-paper/10 bg-paper/[0.03] p-5">
        <p className="font-sans text-body leading-[1.6] text-paper/75">{t("start.liturgy.card.lead")}</p>
        {begun ? <p className="mt-3 font-sans text-detail font-semibold text-paper/70">{where.join(" · ")}</p> : null}
        <Link
          href="/start/first-liturgy"
          className="tap-press mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-night"
        >
          {begun ? t("start.liturgy.today.open") : t("start.liturgy.card.open")}
          <ChevronRight size={15} className="rtl:-scale-x-100" />
        </Link>
      </div>
    </section>
  );
}
