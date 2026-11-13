import { beforeEach, describe, expect, it, vi } from "vitest";

import { READER_EMAIL_LOOK } from "@/lib/email/look";

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
  firstLooks: [] as { dedupeKey: string; kind: string; to: string; subject: string; userId: string | null }[],
  firstLookResult: { status: "sent" } as Record<string, unknown>,
}));

vi.mock("@/lib/admin/ownerDeskStore", () => ({ readDesk: async () => state.desk }));
vi.mock("@/lib/admin/boardRead", () => ({
  readBoard: async () => {
    state.boardReads += 1;
    return { tasks: state.tasks, error: state.boardError };
  },
}));
vi.mock("@/lib/email/campaignDrafts", () => ({
  draftCampaign: async () => ({ kind: "weekly", list: "product_updates", periodKey: "2026-W47", body: { subject: "The week ahead" }, reason: null, details: {} }),
}));
vi.mock("@/lib/email/marketing", () => ({
  postalAddress: () => "PO Box 1, Somewhere",
  renderMarketing: (body: { subject: string }) => ({ subject: body.subject, html: `<p>${body.subject}</p>`, text: body.subject, headers: {} }),
}));
vi.mock("@/lib/email/ledger", () => ({
  sendEmailOnce: async (_a: unknown, msg: { dedupeKey: string; kind: string; to: string; subject: string; userId: string | null }) => {
    state.firstLooks.push(msg);
    return state.firstLookResult;
  },
}));
vi.mock("@/lib/admin/access", () => ({ adminEmails: () => ["owner@example.org"] }));
vi.mock("@/lib/email/campaignStart", () => ({
  campaignCopyViolations: () => [],
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
  state.desk = { present: true, ok: true, settings: DESK_DEFAULTS, saved: null, holds: {}, announcement: named, look: { seen: READER_EMAIL_LOOK, at: null, by: null } };
  state.tasks = [due];
  state.boardError = null;
  state.boardReads = 0;
  state.starts = [];
  state.result = { ok: true, mailingKey: "weekly:2026-W47", periodKey: "2026-W47", jobId: "j", run: { counts: { sent: 40 }, owed: 0, note: null } };
  state.logged = [];
  state.firstLooks = [];
  state.firstLookResult = { status: "sent" };
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

  describe("the first-send guard", () => {
    // A look he has not cleared: he cleared "0", and the reader emails wear READER_EMAIL_LOOK (lib/email/look.ts).
    const unseen = () => ({ ...state.desk, look: { seen: "0", at: null, by: null } });

    it("sends the first one in a new look to him alone, exactly as readers would get it, and nothing to readers", async () => {
      state.desk = unseen();
      const r = await runAutoSends({} as never, NOON);
      expect(state.starts).toEqual([]);
      expect(state.firstLooks).toEqual([
        expect.objectContaining({ dedupeKey: `first_look:${READER_EMAIL_LOOK}`, kind: "first_look", to: "owner@example.org", userId: null, subject: "The week ahead" }),
      ]);
      expect(r.lines).toEqual([{ ruleKey: RULE, outcome: "to you first" }]);
      expect(state.logged.map((l) => l.action)).toEqual(["email.first_look"]);
    });

    it("keeps readers waiting once his copy has gone, until he clears the look", async () => {
      state.desk = unseen();
      state.firstLookResult = { status: "duplicate" };
      expect((await runAutoSends({} as never, NOON)).lines).toEqual([{ ruleKey: RULE, outcome: "waiting for your look" }]);
      expect(state.starts).toEqual([]);
    });

    it("lets the sends go to readers again once he has seen the look", async () => {
      state.desk = { ...unseen(), look: { seen: READER_EMAIL_LOOK, at: "2026-11-21T15:00:00Z", by: "him" } };
      await runAutoSends({} as never, NOON);
      expect(state.starts).toHaveLength(1);
      expect(state.firstLooks).toEqual([]);
    });

    it("still holds what he held, and sends him no copy of it", async () => {
      state.desk = { ...unseen(), holds: { [RULE]: { at: "2026-11-22T13:00:00Z", by: "him" } } };
      expect((await runAutoSends({} as never, NOON)).lines).toEqual([{ ruleKey: RULE, outcome: "held" }]);
      expect(state.firstLooks).toEqual([]);
    });
  });
});
