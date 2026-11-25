"use client";

import { Skeleton } from "../primitives";
import { ApiLimitBanner, ApiLimitsPanel } from "../insights/ApiLimits";
import { HourlyGoals } from "../HourlyGoals";
import { patchJson } from "../adminFetch";
import { GoalsView } from "../goals/GoalsView";
import type { GoalMark, GoalsData } from "@/lib/admin/milestones";
import { useLiveData } from "@/lib/admin/useLiveData";

/**
 * Goals: his milestones as a game, for him alone (docs/handoffs/admin-milestones.md).
 *
 * The page is components/admin/goals/GoalsView.tsx, drawn for his yes and
 * said yes to on 2026-11-24; its figures come from /api/admin/goals, counted
 * by lib/admin/milestones.ts from the kept events. The hourly goals and the
 * Bible licence, which this tab carried before, stay: the licence's banner
 * first when it has something to say, the two panels folded under More.
 *
 * The daily, weekly and monthly goals graded against pasted Play Console
 * reports came off this tab on 2026-09-13 (their rows are kept, behind
 * /api/admin/insights); nothing here reads them.
 */

type Payload = { data: GoalsData; marksSaved: boolean; costsRead: boolean };

export function GoalsTab() {
  // Read every five minutes: a goal moves by the day, not by the second.
  const live = useLiveData<Payload>("/api/admin/goals", 300_000);

  const save = async (marks: GoalMark[]) => {
    const error = await patchJson("/api/admin/goals", { marks }, "POST");
    if (!error) live.refresh();
    return error;
  };

  if (!live.data) {
    return (
      // The page's own shape while it reads, so nothing jumps when it lands
      // (his walk, 2026-11-24: the hour's goals showed first and were pushed
      // down). The hour and the licence come with the page, in their places.
      <div className="space-y-5 font-sans" aria-busy={!live.failing}>
        {live.failing ? (
          <p className="text-[15px]" style={{ color: "var(--adm-ink-2)" }}>
            Your goals could not be read just now. They try again by themselves.
          </p>
        ) : (
          <>
            <span className="sr-only">Reading your goals.</span>
            <Skeleton w="60%" h={96} />
            <Skeleton w="45%" h={64} />
            <Skeleton w="100%" h={12} />
            <Skeleton w="70%" h={40} />
            <Skeleton w="100%" h={180} />
          </>
        )}
      </div>
    );
  }

  const saveMail = async (mail: boolean) => {
    const error = await patchJson("/api/admin/goals", { mail }, "POST");
    if (!error) live.refresh();
    return error;
  };

  return (
    <GoalsView
      data={live.data.data}
      banner={<ApiLimitBanner />}
      hourly={<HourlyGoals />}
      licence={<ApiLimitsPanel />}
      onSaveMarks={save}
      onSaveMail={saveMail}
    />
  );
}
