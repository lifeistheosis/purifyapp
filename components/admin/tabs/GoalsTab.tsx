"use client";

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
      <div className="space-y-5 font-sans">
        <ApiLimitBanner />
        <p className="text-[15px]" style={{ color: "var(--adm-ink-2)" }}>
          {live.failing ? "Your goals could not be read just now. They try again by themselves." : "Reading your goals."}
        </p>
        <HourlyGoals />
        <ApiLimitsPanel />
      </div>
    );
  }

  return <GoalsView data={live.data.data} banner={<ApiLimitBanner />} hourly={<HourlyGoals />} licence={<ApiLimitsPanel />} onSaveMarks={save} />;
}
