import { beforeEach, describe, expect, it, vi } from "vitest";

import { DESK_DEFAULTS } from "../ownerDesk";
import type { DeskState } from "../ownerDeskStore";

const state = vi.hoisted(() => ({
  desk: null as unknown as DeskState,
  logged: null as { sent: boolean; at: string | null } | null,
  sends: [] as { dedupeKey: string; kind: string; to: string; subject: string; userId: string | null }[],
  sendResult: { status: "sent" } as Record<string, unknown>,
  writes: [] as { key: string; value: Record<string, unknown> }[],
  composes: 0,
  savedDrafts: 0,
  board: null as null | { text: string; week: string; sources: string[] },
  announce: [{ ruleKey: "email-weekly:2026-W47", kind: "weekly", periodKey: "2026-W47" }],
}));

vi.mock("@/lib/admin/access", () => ({ adminEmails: () => ["owner@example.org"] }));
vi.mock("@/lib/admin/ownerDeskStore", () => ({
  DESK_KEYS: { settings: "owner_desk", holds: "owner_desk_holds", announced: "owner_desk_announced", look: "owner_desk_look" },
  readDesk: async () => state.desk,
  briefSent: async () => state.logged,
  writeDesk: async (_a: unknown, key: string, value: Record<string, unknown>) => {
    state.writes.push({ key, value });
    return { ok: true };
  },
}));
vi.mock("@/lib/admin/briefToday", () => ({
  readToday: async (_a: unknown, _now: Date, _d: unknown, mode: string) => {
    state.composes += 1;
    return {
      day: "2026-11-22",
      needs: [],
      pieces: [{ ruleKey: "email-weekly:2026-W47", name: "The Sunday email", kind: "weekly", periodKey: "2026-W47", subject: "The week ahead", state: "goes", at: "12 noon", why: null }],
      board: state.board ? { ...state.board } : null,
      boardError: null,
      announce: mode === "brief" ? state.announce : [],
    };
  },
}));
vi.mock("@/lib/admin/briefFigures", () => ({
  readBriefFigures: async (_a: unknown, span: unknown) => ({
    span,
    readers: "not read",
    plus: "not read",
    money: "not read",
    opened: "not read",
    community: "not read",
    misses: "not read",
    errors: "not read",
    context: [],
    waiting: { messages: null, refunds: null, toPost: null },
    week: null,
  }),
}));
vi.mock("@/lib/admin/boardDraft", () => ({
  saveBoardDraft: async () => {
    state.savedDrafts += 1;
    return "saved";
  },
}));
vi.mock("@/lib/email/ledger", () => ({
  sendEmailOnce: async (_a: unknown, msg: { dedupeKey: string; kind: string; to: string; subject: string; userId: string | null }) => {
    state.sends.push(msg);
    return state.sendResult;
  },
}));

import { composeBrief, forgetBriefRuns, sendOwnerBrief } from "../ownerBriefSend";

/**
 * The brief's sending (lib/admin/ownerBriefSend.ts): at his hour, one a day,
 * to the owner alone, and what it names as going out by itself is written
 * down only once it is in his inbox.
 */

const SUNDAY = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 22, h + 5, m)); // New York hour h on Sunday 22 November

beforeEach(() => {
  forgetBriefRuns();
  state.desk = { present: true, ok: true, settings: DESK_DEFAULTS, saved: null, holds: {}, announcement: null, look: { seen: "1", at: null, by: null } };
  state.logged = { sent: false, at: null };
  state.sends = [];
  state.sendResult = { status: "sent" };
  state.writes = [];
  state.composes = 0;
  state.savedDrafts = 0;
  state.board = null;
});

describe("the brief's sending", () => {
  it("waits for his hour, reading nothing", async () => {
    expect(await sendOwnerBrief({} as never, SUNDAY(7, 29))).toMatchObject({ sent: false, reason: "not the brief's hour" });
    expect(state.composes).toBe(0);
    expect(state.sends).toEqual([]);
  });

  it("goes at 7:30 his time, to the owner alone, once a day by his date", async () => {
    const r = await sendOwnerBrief({} as never, SUNDAY(7, 30));
    expect(r).toMatchObject({ sent: true, day: "2026-11-22", named: 1 });
    expect(state.sends).toHaveLength(1);
    expect(state.sends[0]).toMatchObject({ dedupeKey: "owner_brief:2026-11-22", kind: "owner_brief", to: "owner@example.org", userId: null });
    expect(await sendOwnerBrief({} as never, SUNDAY(7, 40))).toMatchObject({ sent: false, reason: "already sent today" });
    expect(state.sends).toHaveLength(1);
  });

  it("names the pieces that go by themselves only after it was sent", async () => {
    await sendOwnerBrief({} as never, SUNDAY(7, 30));
    expect(state.writes).toEqual([
      {
        key: "owner_desk_announced",
        value: { day: "2026-11-22", at: SUNDAY(7, 30).toISOString(), pieces: state.announce },
      },
    ]);
  });

  it("names nothing when the send failed, and tries again in half an hour, not ten minutes", async () => {
    state.sendResult = { status: "failed", error: "Resend: 500" };
    expect(await sendOwnerBrief({} as never, SUNDAY(7, 30))).toMatchObject({ sent: false, reason: "failed: Resend: 500" });
    expect(state.writes).toEqual([]);
    expect(await sendOwnerBrief({} as never, SUNDAY(7, 40))).toMatchObject({ reason: "waiting to try again" });
    state.sendResult = { status: "sent" };
    expect(await sendOwnerBrief({} as never, SUNDAY(8, 1))).toMatchObject({ sent: true });
  });

  it("names nothing when the desk could not be read", async () => {
    state.desk = { ...state.desk, ok: false };
    expect(await sendOwnerBrief({} as never, SUNDAY(7, 30))).toMatchObject({ sent: true, named: 0 });
    expect(state.writes).toEqual([]);
  });

  it("does not send when the log says today's has gone, from any server", async () => {
    state.logged = { sent: true, at: SUNDAY(7, 31).toISOString() };
    expect(await sendOwnerBrief({} as never, SUNDAY(9))).toMatchObject({ sent: false, reason: "already sent today" });
    expect(state.composes).toBe(0);
  });

  it("saves the board message's draft when it sends, and never when it only shows", async () => {
    state.board = { text: "This week: the Entry on Saturday.", week: "2026-W47", sources: ["calendar"] };
    const preview = await composeBrief({} as never, SUNDAY(9), "preview");
    expect(state.savedDrafts).toBe(0);
    expect(preview.announce).toEqual([]);
    expect(preview.today.board?.saved).toBe("preview");
    await sendOwnerBrief({} as never, SUNDAY(7, 30));
    expect(state.savedDrafts).toBe(1);
  });

  it("is the weekly one on Monday, and its subject says so", async () => {
    await sendOwnerBrief({} as never, new Date(Date.UTC(2026, 10, 23, 12, 30)));
    expect(state.sends[0].subject).toMatch(/^The Sunday email goes out at 12 noon · Your week, 16 to 22 November$/);
  });
});
