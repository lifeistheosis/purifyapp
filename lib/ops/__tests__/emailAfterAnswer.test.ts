// The heartbeat answers before the email jobs' share is sent (found 2026-11-22:
// the 1.9 release held Render's call open past its 100 seconds, and Render
// called the heartbeat failed). Nobody is sent a copy twice either way: each
// copy is locked per account (lib/email/jobs.ts).
import { describe, expect, it, vi } from "vitest";

const sends = vi.hoisted(() => ({ calls: 0 }));

vi.mock("@/lib/ops/prune", () => ({ pruneReports: async () => ({}) }));
vi.mock("@/lib/shop/abandonedSweep", () => ({ sweepAbandonedCheckouts: async () => ({ swept: 0 }) }));
vi.mock("@/lib/ambassadors/payouts", () => ({ clearMatured: async () => ({}), runAmbassadorPayouts: async () => ({}) }));
vi.mock("@/lib/email/jobs", () => ({
  runEmailJobs: async () => {
    sends.calls += 1;
    return { running: 1, allowance: 100, reports: [] };
  },
}));
vi.mock("@/lib/shop/cartReminderSweep", () => ({ sendCartReminders: async () => ({}) }));
vi.mock("@/lib/admin/ownerBriefSend", () => ({ sendOwnerBrief: async () => ({ sent: false, reason: "not the brief's hour" }) }));
vi.mock("@/lib/admin/autoSends", () => ({ runAutoSends: async () => ({ lines: [] }) }));

import { EMAIL_JOBS_FROM_UTC_HOUR, runMaintenance } from "../maintenance";

describe("the email jobs on the heartbeat", () => {
  const noonish = Date.UTC(2026, 10, 27, EMAIL_JOBS_FROM_UTC_HOUR + 1, 0);

  it("are sent after the call has answered, when the caller can wait", async () => {
    const later: Array<() => Promise<void>> = [];
    const report = await runMaintenance({} as never, noonish, { later: (task) => later.push(task) });
    expect(sends.calls, "nothing sent before the answer").toBe(0);
    expect(report.emailJobs).toEqual({ ran: false, detail: "after the response" });
    expect(later).toHaveLength(1);
    await later[0]();
    expect(sends.calls).toBe(1);
  });

  it("are sent in the call where nothing can wait, as before", async () => {
    const report = await runMaintenance({} as never, noonish + 2 * 3_600_000);
    expect(report.emailJobs?.ran).toBe(true);
    expect(sends.calls).toBe(2);
  });
});
