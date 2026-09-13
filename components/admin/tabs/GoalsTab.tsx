"use client";

import { ApiLimitBanner, ApiLimitsPanel } from "../insights/ApiLimits";
import { HourlyGoals } from "../HourlyGoals";

/**
 * Goals: live targets only.
 *
 * ── What used to be here, and why it is gone ────────────────────────────
 *
 * This tab carried two kinds of goal. The hourly goals below read live
 * analytics. Everything else, the Overall grade, the streaks, the "start with
 * a set derived from your own data" proposals and the goals table, was graded
 * against series pasted in from a Play Console CSV.
 *
 * The CSV import was removed on 2026-09-01 because those exports describe
 * days that have already finished while the rest of the panel measures live
 * analytics. But removing the import left its output in place: the grades
 * kept rendering against the last report ever pasted, which ended on
 * 2026-08-28, and labelled that "Today" and "This week". A stale grade that
 * looks current is worse than no grade, so on 2026-09-13, at the owner's
 * instruction, every CSV-derived element came off this tab along with the
 * Growth tab that displayed the same data.
 *
 * The stored goals and the imported series were NOT deleted. They live behind
 * /api/admin/insights and the Calendar tab still reads them. Retiring the
 * display is reversible; deleting the rows would not be.
 */
export function GoalsTab() {
  return (
    <div className="space-y-5">
      {/* First thing on the page, because a licence breach outranks a KPI. */}
      <ApiLimitBanner />

      {/* The hour you are in. Live analytics, per-event timestamps, so it can
          answer "how is this hour going", which a daily report never could. */}
      <HourlyGoals />

      <ApiLimitsPanel />
    </div>
  );
}
