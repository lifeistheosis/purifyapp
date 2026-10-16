"use client";

// A reading plan's day, under way in the chapter (1.7, the owner's note 22:
// "the passage with a plan bar at the bottom (the same idea as Today's
// readings in one go: where you are, Next)"). The same bar as today's
// readings (components/flow/FlowBarShell.tsx): which day of the plan, and on
// a kathisma which psalm of how many; the chapter; a way out; and Next to
// the following chapter, or Done after the last, which keeps the day and
// goes back to the plan's page, where the finish waits (lib/plans/session.ts).

import { useRouter } from "next/navigation";

import { FlowBarShell } from "@/components/flow/FlowBarShell";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Close } from "@/components/ui/icons/Close";
import { localBookNames } from "@/lib/bible/books";
import { getPlan } from "@/lib/plans/plans";
import { finishPlanSession, goToPlanReading, hrefOfReading, leavePlanSession, usePlanSession } from "@/lib/plans/session";
import { softTick } from "@/lib/ui/softTick";

export function PlanFlowBar({ book, chapter }: { book: string; chapter: number }) {
  const { t } = useTranslate();
  const router = useRouter();
  const session = usePlanSession();
  const item = session?.items[session.at];
  const plan = session ? getPlan(session.planId) : null;
  if (!session || !item || !plan || item.book !== book || item.chapter !== chapter) return null;

  const books = localBookNames(t);
  const name = (b: string, c: number) => `${books[b] ?? t(`bible.books.${b}`)} ${c}`;
  const last = session.at === session.items.length - 1;
  const next = last ? null : session.items[session.at + 1];
  const where = [
    t("plans.dayOf", { day: session.day + 1, total: plan.days.length }),
    session.items.length > 1 ? t("readingsFlow.of", { n: session.at + 1, total: session.items.length }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <FlowBarShell>
      <div className="min-w-0 flex-1" data-plan-bar="">
        <p className="truncate font-sans text-caption text-paper/55">{where}</p>
        <p className="truncate font-sans text-ui font-semibold text-paper">{name(item.book, item.chapter)}</p>
      </div>
      <button
        type="button"
        onClick={leavePlanSession}
        aria-label={t("plans.bar.leave")}
        className="tap-press grid h-11 w-11 shrink-0 place-items-center rounded-full text-paper/50"
      >
        <Close size={16} />
      </button>
      {next ? (
        <button
          type="button"
          onClick={() => {
            goToPlanReading(session.at + 1);
            router.push(hrefOfReading(next));
          }}
          className="tap-press h-11 shrink-0 rounded-pill bg-paper px-4 font-sans text-caption font-semibold text-night"
        >
          {t("readingsFlow.next", { what: name(next.book, next.chapter) })}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            const done = finishPlanSession();
            softTick();
            if (done) router.push(`/plans/${done.planId}`);
          }}
          data-plan-done=""
          className="tap-press h-11 shrink-0 rounded-pill bg-paper px-5 font-sans text-caption font-semibold text-night"
        >
          {t("common.done")}
        </button>
      )}
    </FlowBarShell>
  );
}
