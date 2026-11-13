import { beforeEach, describe, expect, it, vi } from "vitest";

import { DESK_DEFAULTS } from "../ownerDesk";
import type { DeskState } from "../ownerDeskStore";

const state = vi.hoisted(() => ({
  user: null as null | { id: string; email: string },
  desk: null as unknown as DeskState,
  writes: [] as { key: string; value: Record<string, unknown>; by: string | null }[],
  writeResult: { ok: true } as Record<string, unknown>,
  composed: [] as string[],
  logged: [] as { action: string; detail?: Record<string, unknown> }[],
}));

vi.mock("@/lib/admin/access", () => ({ getAdminUser: async () => state.user }));
vi.mock("@/lib/security/ratelimit", () => ({ rateLimited: async () => false }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/admin/activityLog", () => ({ logActivity: async (e: { action: string }) => void state.logged.push(e) }));
vi.mock("@/lib/admin/ownerDeskStore", () => ({
  DESK_KEYS: { settings: "owner_desk", holds: "owner_desk_holds", announced: "owner_desk_announced", look: "owner_desk_look" },
  readDesk: async () => state.desk,
  briefSent: async () => ({ sent: false, at: null }),
  writeDesk: async (_a: unknown, key: string, value: Record<string, unknown>, by: string | null) => {
    state.writes.push({ key, value, by });
    return state.writeResult;
  },
}));
vi.mock("@/lib/admin/briefToday", () => ({
  readToday: async () => ({ day: "2026-11-22", needs: [], pieces: [], board: null, boardError: null, announce: [] }),
}));
vi.mock("@/lib/admin/autoSends", () => ({ firstLookKey: () => "first_look:1" }));
vi.mock("@/lib/admin/ownerBriefSend", () => ({
  briefKey: (d: string) => `owner_brief:${d}`,
  composeBrief: async (_a: unknown, _n: Date, mode: string) => {
    state.composed.push(mode);
    return { subject: "Your day", html: "<html>brief</html>", announce: [] };
  },
}));

import { GET, POST } from "@/app/api/admin/desk/route";

/**
 * The desk's route (app/api/admin/desk/route.ts): only an admin reads or
 * changes it; a change is checked, written with what it replaced, and a
 * preview is made but never sent.
 */

const post = (body: unknown) => POST(new Request("https://purifyapp.net/api/admin/desk", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  state.user = { id: "u1", email: "owner@example.org" };
  state.desk = { present: true, ok: true, settings: DESK_DEFAULTS, saved: null, holds: {}, announcement: null, look: { seen: "1", at: null, by: null } };
  state.writes = [];
  state.writeResult = { ok: true };
  state.composed = [];
  state.logged = [];
});

describe("the desk's route", () => {
  it("answers no one but an admin", async () => {
    state.user = null;
    expect((await GET()).status).toBe(403);
    expect((await post({ action: "hold", ruleKey: "email-weekly:2026-W47" })).status).toBe(403);
    expect(state.writes).toEqual([]);
  });

  it("gives the desk with its limits", async () => {
    const r = await GET();
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.settings).toEqual(DESK_DEFAULTS);
    expect(body.limits).toEqual({ brief: ["05:00", "11:00"], send: ["09:00", "17:00"], holdMinutes: 120 });
  });

  it("refuses settings that leave no time to hold, in his words, and writes nothing", async () => {
    const r = await post({ action: "settings", settings: { ...DESK_DEFAULTS, briefAt: "09:00", sendAt: "10:00" } });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/at least 2 hours after the brief/);
    expect(state.writes).toEqual([]);
  });

  it("saves settings, and logs what they replaced", async () => {
    const next = { autoSend: false, briefAt: "06:30", sendAt: "11:00", weeklyDay: 0 };
    const r = await post({ action: "settings", settings: next });
    expect(r.status).toBe(200);
    expect(state.writes).toEqual([{ key: "owner_desk", value: next, by: "owner@example.org" }]);
    expect(state.logged[0]).toMatchObject({ action: "desk.settings", detail: { prior: DESK_DEFAULTS, next } });
  });

  it("holds and lets go only the emails that can send themselves", async () => {
    expect((await post({ action: "hold", ruleKey: "board:2026-W47" })).status).toBe(400);
    expect((await post({ action: "hold", ruleKey: "eikon-open:2026-12" })).status).toBe(400);
    expect(state.writes).toEqual([]);

    expect((await post({ action: "hold", ruleKey: "email-weekly:2026-W47" })).status).toBe(200);
    const held = state.writes[0];
    expect(held.key).toBe("owner_desk_holds");
    expect(Object.keys(held.value.holds as object)).toEqual(["email-weekly:2026-W47"]);

    state.desk = { ...state.desk, holds: held.value.holds as DeskState["holds"] };
    expect((await post({ action: "release", ruleKey: "email-weekly:2026-W47" })).status).toBe(200);
    expect(state.writes[1].value).toEqual({ holds: {} });
    expect(state.logged.map((l) => l.action)).toEqual(["desk.hold", "desk.release"]);
  });

  it("changes nothing while site_settings is not there, or the desk could not be read", async () => {
    state.desk = { ...state.desk, present: false, ok: false };
    expect((await post({ action: "hold", ruleKey: "email-weekly:2026-W47" })).status).toBe(409);
    state.desk = { ...state.desk, present: true, ok: false };
    expect((await post({ action: "hold", ruleKey: "email-weekly:2026-W47" })).status).toBe(503);
    expect(state.writes).toEqual([]);
  });

  it("makes a preview and never sends it", async () => {
    const r = await post({ action: "preview" });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ subject: "Your day", html: "<html>brief</html>" });
    expect(state.composed).toEqual(["preview"]);
  });

  it("clears the reader emails' look when he has seen it, in a row of its own, and logs what it replaced", async () => {
    state.desk = { ...state.desk, look: { seen: "0", at: null, by: null } };
    const r = await post({ action: "look-seen" });
    expect(r.status).toBe(200);
    expect(state.writes).toHaveLength(1);
    expect(state.writes[0]).toMatchObject({ key: "owner_desk_look", value: { seen: "1", by: "owner@example.org" } });
    expect(state.logged[0]).toMatchObject({ action: "desk.look_seen", detail: { prior: { seen: "0" }, next: "1" } });
  });

  it("refuses what it does not know", async () => {
    expect((await post({ action: "send" })).status).toBe(400);
    expect((await post({ action: "settings", settings: { ...DESK_DEFAULTS, briefAt: "7:30" } })).status).toBe(400);
  });
});
