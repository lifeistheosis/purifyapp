// The heartbeat's report of the deletes the privacy page promises (Fable's
// release check 1, L2). They run once a day from Render's cron call to
// /api/cron/hourly-goals, so most calls skip them; a call that skips them
// still says how their last run on this server went, so one call is enough
// for the release check in docs/release/TEMPLATE.md.

import { describe, expect, it, vi } from "vitest";

const pruned = vi.hoisted(() => ({ calls: 0 }));

vi.mock("@/lib/ops/prune", () => ({
  pruneReports: async () => {
    pruned.calls += 1;
    return { app_errors: 3, search_misses: "absent" };
  },
}));
vi.mock("@/lib/shop/abandonedSweep", () => ({ sweepAbandonedCheckouts: async () => ({ swept: 0 }) }));
vi.mock("@/lib/ambassadors/payouts", () => ({ clearMatured: async () => ({}), runAmbassadorPayouts: async () => ({}) }));
vi.mock("@/lib/email/jobs", () => ({ runEmailJobs: async () => ({ running: 0, allowance: 0, reports: [] }) }));
vi.mock("@/lib/shop/cartReminderSweep", () => ({ sendCartReminders: async () => ({}) }));
vi.mock("@/lib/admin/ownerBriefSend", () => ({ sendOwnerBrief: async () => ({ sent: false, reason: "not the brief's hour" }) }));
vi.mock("@/lib/admin/autoSends", () => ({ runAutoSends: async () => ({ lines: [] }) }));

import { runMaintenance } from "../maintenance";

describe("the deletes on the heartbeat", () => {
  it("run once a day, and every call in between says how the last run went", async () => {
    const admin = {} as never;
    // 03:00 UTC on a Tuesday: none of the daytime jobs is due.
    const first = Date.UTC(2026, 10, 10, 3, 0);

    const ran = await runMaintenance(admin, first);
    expect(ran.pruneReports).toEqual({ ran: true, ok: true, detail: { app_errors: 3, search_misses: "absent" } });

    const skipped = await runMaintenance(admin, first + 10 * 60_000);
    expect(skipped.pruneReports).toEqual({
      ran: false,
      last: { at: "2026-11-10T03:00:00.000Z", ok: true, detail: { app_errors: 3, search_misses: "absent" } },
    });
    expect(pruned.calls).toBe(1);

    const nextDay = await runMaintenance(admin, first + 21 * 3_600_000);
    expect(nextDay.pruneReports?.ran).toBe(true);
    expect(pruned.calls).toBe(2);
  });
});
