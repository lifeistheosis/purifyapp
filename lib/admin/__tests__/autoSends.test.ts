import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BoardTask } from "../planner";
import { DESK_DEFAULTS } from "../ownerDesk";
import type { DeskState } from "../ownerDeskStore";

const state = vi.hoisted(() => ({
  desk: null as unknown as DeskState,
  tasks: [] as BoardTask[],
  boardError: null as string | null,
  boardReads: 0,
  starts: [] as { kind: string; periodKey: string; createdByEmail: string | null }[],
  result: { ok: true } as Record<string, unknown>,
  logged: [] as { action: string }[],
}));

vi.mock("@/lib/admin/ownerDeskStore", () => ({ readDesk: async () => state.desk }));
vi.mock("@/lib/admin/boardRead", () => ({
  readBoard: async () => {
    state.boardReads += 1;
    return { tasks: state.tasks, error: state.boardError };
  },
}));
vi.mock("@/lib/email/campaignStart", () => ({
  startCampaign: async (_a: unknown, opts: { kind: string; periodKey: string; createdByEmail: string | null }) => {
    state.starts.push({ kind: opts.kind, periodKey: opts.periodKey, createdByEmail: opts.createdByEmail });
    return state.result;
  },
}));
vi.mock("@/lib/admin/activityLog", () => ({ logActivity: async (e: { action: string }) => void state.logged.push(e) }));

import { forgetAutoSends, runAutoSends } from "../autoSends";

/**
 * The emails that send themselves (lib/admin/autoSends.ts; his "yes auto" of
 * 2026-11-13): only what that morning's brief named, only at the hour, never
 * held, never skipped, and once.
 */

const RULE = "email-weekly:2026-W47";
const NOON = new Date("2026-11-22T17:00:00Z"); // Sunday, 12 noon in New York
const named = { day: "2026-11-22", at: "2026-11-22T12:30:00Z", pieces: [{ ruleKey: RULE, kind: "weekly" as const, periodKey: "2026-W47" }] };
const due: BoardTask = { id: null, ruleKey: RULE, title: "Send the Sunday calendar email", notes: "", category: "email", dueOn: "2026-11-22", status: "open", byItself: false, auto: true };

beforeEach(() => {
  forgetAutoSends();
  state.desk = { present: true, ok: true, settings: DESK_DEFAULTS, saved: null, holds: {}, announcement: named };
  state.tasks = [due];
  state.boardError = null;
  state.boardReads = 0;
  state.starts = [];
  state.result = { ok: true, mailingKey: "weekly:2026-W47", periodKey: "2026-W47", jobId: "j", run: { counts: { sent: 40 }, owed: 0, note: null } };
  state.logged = [];
});

describe("a send by itself", () => {
  it("starts the piece the brief named, once, through the panel's own start, and logs it", async () => {
    const r = await runAutoSends({} as never, NOON);
    expect(state.starts).toEqual([{ kind: "weekly", periodKey: "2026-W47", createdByEmail: null }]);
    expect(r.lines).toEqual([{ ruleKey: RULE, outcome: "started", detail: "40 sent in the first share" }]);
    expect(state.logged.map((l) => l.action)).toEqual(["email.campaign_auto_send"]);
    await runAutoSends({} as never, new Date(NOON.getTime() + 10 * 60_000));
    expect(state.starts).toHaveLength(1);
  });

  it("does nothing while the switch is off, or when the desk could not be read", async () => {
    state.desk = { ...state.desk, settings: { ...DESK_DEFAULTS, autoSend: false } };
    expect((await runAutoSends({} as never, NOON)).off).toBe("the switch is off");
    state.desk = { ...state.desk, settings: DESK_DEFAULTS, ok: false };
    expect((await runAutoSends({} as never, NOON)).off).toBe("the desk could not be read");
    expect(state.starts).toEqual([]);
    expect(state.boardReads).toBe(0);
  });

  it("does nothing the brief did not name today", async () => {
    state.desk = { ...state.desk, announcement: { ...named, day: "2026-11-21" } };
    await runAutoSends({} as never, NOON);
    state.desk = { ...state.desk, announcement: null };
    await runAutoSends({} as never, NOON);
    expect(state.starts).toEqual([]);
  });

  it("never sends what he held", async () => {
    state.desk = { ...state.desk, holds: { [RULE]: { at: "2026-11-22T13:00:00Z", by: "him" } } };
    const r = await runAutoSends({} as never, NOON);
    expect(r.lines).toEqual([{ ruleKey: RULE, outcome: "held" }]);
    expect(state.starts).toEqual([]);
  });

  it("never sends what the board skipped or moved, and nothing at all when the board could not be read", async () => {
    state.tasks = [{ ...due, status: "skipped" }];
    expect((await runAutoSends({} as never, NOON)).lines).toEqual([{ ruleKey: RULE, outcome: "not due" }]);
    state.tasks = [{ ...due, dueOn: "2026-11-29" }];
    expect((await runAutoSends({} as never, NOON)).lines).toEqual([{ ruleKey: RULE, outcome: "not due" }]);
    state.tasks = [due];
    state.boardError = "admin_tasks: timeout";
    expect((await runAutoSends({} as never, NOON)).off).toMatch(/^the board could not be read/);
    expect(state.starts).toEqual([]);
  });

  it("waits for the hour without reading the board", async () => {
    const r = await runAutoSends({} as never, new Date("2026-11-22T16:00:00Z")); // 11 AM
    expect(r.lines).toEqual([{ ruleKey: RULE, outcome: "too early" }]);
    expect(state.boardReads).toBe(0);
    expect(state.starts).toEqual([]);
  });

  it("treats a piece already gone as done, and a lasting refusal as said once", async () => {
    state.result = { ok: false, status: 409, code: "exists", error: "The weekly email for 2026-W47 already went out." };
    expect((await runAutoSends({} as never, NOON)).lines[0].outcome).toBe("already");
    await runAutoSends({} as never, new Date(NOON.getTime() + 10 * 60_000));
    expect(state.starts).toHaveLength(1);

    forgetAutoSends();
    state.starts = [];
    state.result = { ok: false, status: 422, code: "words", error: "The words do not pass: urgency" };
    expect((await runAutoSends({} as never, NOON)).lines[0]).toMatchObject({ outcome: "refused" });
    await runAutoSends({} as never, new Date(NOON.getTime() + 10 * 60_000));
    expect(state.starts).toHaveLength(1);
    expect(state.logged.map((l) => l.action)).toEqual(["email.campaign_auto_refused"]);
  });

  it("tries again after a failure that may pass", async () => {
    state.result = { ok: false, status: 503, code: "job", error: "email_jobs: timeout" };
    expect((await runAutoSends({} as never, NOON)).lines[0].outcome).toBe("failed");
    await runAutoSends({} as never, new Date(NOON.getTime() + 10 * 60_000));
    expect(state.starts).toHaveLength(2);
  });
});
