import { beforeEach, describe, expect, it, vi } from "vitest";

import { READER_EMAIL_LOOK } from "@/lib/email/look";

import type { BoardTask } from "../planner";

const state = vi.hoisted(() => ({
  tasks: [] as BoardTask[],
  boardError: null as string | null,
  drafts: {} as Record<string, { periodKey: string; body: { subject: string } | null; reason: string | null }>,
  jobs: new Set<string>(),
  firstSent: false,
}));

vi.mock("@/lib/admin/boardRead", () => ({ readBoard: async () => ({ tasks: state.tasks, error: state.boardError }) }));
vi.mock("@/lib/email/campaignDrafts", () => ({
  draftCampaign: async (_a: unknown, kind: string) => ({ kind, list: "product_updates", details: {}, ...state.drafts[kind] }),
}));
vi.mock("@/lib/email/jobs", () => ({ jobForMailing: async (_a: unknown, key: string) => (state.jobs.has(key) ? { status: "running" } : null) }));
vi.mock("@/lib/email/campaigns", () => ({ findCampaign: async () => null }));
vi.mock("@/lib/admin/ownerDeskStore", () => ({ briefSent: async () => ({ sent: state.firstSent, at: null }) }));
vi.mock("@/lib/admin/autoSends", () => ({ firstLookKey: () => "first_look:1" }));
vi.mock("@/lib/admin/boardDraft", () => ({ boardDraft: async () => ({ text: "This week: the Entry on Saturday.", week: "2026-W47", sources: ["calendar"] }) }));

import { readToday } from "../briefToday";
import { DESK_DEFAULTS } from "../ownerDesk";
import type { DeskState } from "../ownerDeskStore";

/**
 * Today, as the brief and the panel say it (lib/admin/briefToday.ts): what
 * goes out by itself and when, what he held, what is his to send by hand and
 * why, and what the brief names, which is all that may go by itself.
 */

const SUNDAY_0730 = new Date("2026-11-22T12:30:00Z"); // 7:30 AM in New York
const task = (ruleKey: string, over: Partial<BoardTask> = {}): BoardTask => ({
  id: null,
  ruleKey,
  title: ruleKey,
  notes: "",
  category: "email",
  dueOn: "2026-11-22",
  status: "open",
  byItself: false,
  auto: true,
  ...over,
});
const desk = (over: Partial<DeskState> = {}): DeskState => ({
  present: true,
  ok: true,
  settings: DESK_DEFAULTS,
  saved: null,
  holds: {},
  announcement: null,
  look: { seen: READER_EMAIL_LOOK, at: null, by: null },
  ...over,
});

beforeEach(() => {
  state.tasks = [task("email-weekly:2026-W47")];
  state.boardError = null;
  state.drafts = { weekly: { periodKey: "2026-W47", body: { subject: "The week ahead" }, reason: null } };
  state.jobs = new Set();
  state.firstSent = false;
});

describe("the brief's today", () => {
  it("names a piece due today as going at the sends' hour, and announces it", async () => {
    const t = await readToday({} as never, SUNDAY_0730, desk(), "brief");
    expect(t.pieces).toEqual([
      { ruleKey: "email-weekly:2026-W47", name: "The Sunday email", kind: "weekly", periodKey: "2026-W47", subject: "The week ahead", state: "goes", at: "12 noon", why: null },
    ]);
    expect(t.announce).toEqual([{ ruleKey: "email-weekly:2026-W47", kind: "weekly", periodKey: "2026-W47" }]);
  });

  it("goes two hours after a brief that came late, not at the hour", async () => {
    const t = await readToday({} as never, new Date("2026-11-22T16:45:00Z"), desk(), "brief"); // 11:45 AM
    expect(t.pieces[0]).toMatchObject({ state: "goes", at: "1:45 PM" });
  });

  it("announces nothing he held, nothing with nothing to send, and nothing already going", async () => {
    const held = await readToday({} as never, SUNDAY_0730, desk({ holds: { "email-weekly:2026-W47": { at: "x", by: "him" } } }), "brief");
    expect(held.pieces[0].state).toBe("held");
    expect(held.announce).toEqual([]);

    state.drafts.weekly = { periodKey: "2026-W47", body: null, reason: "The calendar has nothing for the coming week." };
    const nothing = await readToday({} as never, SUNDAY_0730, desk(), "brief");
    expect(nothing.pieces[0]).toMatchObject({ state: "nothing", why: "The calendar has nothing for the coming week." });
    expect(nothing.announce).toEqual([]);

    state.drafts.weekly = { periodKey: "2026-W47", body: { subject: "The week ahead" }, reason: null };
    state.jobs.add("weekly:2026-W47");
    const gone = await readToday({} as never, SUNDAY_0730, desk(), "brief");
    expect(gone.pieces[0].state).toBe("gone");
    expect(gone.announce).toEqual([]);
  });

  it("keeps everything for his hand when the switch is off, the desk or the board could not be read", async () => {
    for (const [d, boardError, why] of [
      [desk({ settings: { ...DESK_DEFAULTS, autoSend: false } }), null, "sending by itself is off"],
      [desk({ ok: false }), null, "the desk's settings could not be read, so nothing goes by itself today"],
      [desk(), "admin_tasks: timeout", "the board could not be read, so nothing goes by itself today"],
    ] as const) {
      state.boardError = boardError;
      const t = await readToday({} as never, SUNDAY_0730, d, "brief");
      expect(t.pieces[0]).toMatchObject({ state: "by hand", why });
      expect(t.announce).toEqual([]);
    }
  });

  it("never lists a piece the board has skipped, moved to a later day, or found done", async () => {
    state.tasks = [
      task("email-weekly:2026-W47", { status: "skipped" }),
      task("email-monthly:2026-12", { dueOn: "2026-12-05" }),
      task("shop-feast:nativity-2026", { status: "done" }),
    ];
    const t = await readToday({} as never, SUNDAY_0730, desk(), "brief");
    expect(t.pieces).toEqual([]);
    expect(t.announce).toEqual([]);
  });

  it("puts the board message's draft in, and never announces it", async () => {
    state.tasks = [task("board:2026-W47", { category: "board" })];
    const t = await readToday({} as never, SUNDAY_0730, desk(), "brief");
    expect(t.board?.text).toBe("This week: the Entry on Saturday.");
    expect(t.pieces).toEqual([]);
    expect(t.announce).toEqual([]);
  });
});

describe("the panel's today", () => {
  it("says a piece the brief named goes at the time the brief gave it", async () => {
    const d = desk({ announcement: { day: "2026-11-22", at: "2026-11-22T12:31:00Z", pieces: [{ ruleKey: "email-weekly:2026-W47", kind: "weekly", periodKey: "2026-W47" }] } });
    const t = await readToday({} as never, new Date("2026-11-22T15:00:00Z"), d, "panel");
    expect(t.pieces[0]).toMatchObject({ state: "goes", at: "12 noon" });
    expect(t.announce).toEqual([]);
  });

  it("says one the brief did not name waits for him", async () => {
    const d = desk({ announcement: { day: "2026-11-22", at: "2026-11-22T12:31:00Z", pieces: [] } });
    const t = await readToday({} as never, new Date("2026-11-22T15:00:00Z"), d, "panel");
    expect(t.pieces[0]).toMatchObject({ state: "by hand", why: "this morning's brief did not name it, so it waits for you" });
  });

  it("before the brief, says when the piece will go once the brief names it", async () => {
    const t = await readToday({} as never, new Date("2026-11-22T11:00:00Z"), desk(), "panel"); // 6 AM
    expect(t.pieces[0]).toMatchObject({ state: "goes", at: "12 noon" });
  });
});

describe("the first-send guard in today", () => {
  const unseen = () => desk({ look: { seen: "0", at: null, by: null } });

  it("says a piece in a new look goes to him alone first, and still names it, so it goes to him at the hour", async () => {
    const t = await readToday({} as never, SUNDAY_0730, unseen(), "brief");
    expect(t.pieces[0]).toMatchObject({ state: "first look", at: "12 noon" });
    expect(t.announce).toHaveLength(1);
  });

  it("says it waits for his look once his copy has gone", async () => {
    state.firstSent = true;
    const t = await readToday({} as never, SUNDAY_0730, unseen(), "brief");
    expect(t.pieces[0].state).toBe("waits for your look");
  });
});
