// Taking a chant recording down from the admin (A7): the list every app reads,
// the read behind it, and the admin's switch. The rule that matters most: when
// the takedowns cannot be read, the list is the committed one, unchanged, as
// every app read it before.

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  pulls: [] as { ref: string; pulled: boolean; reason?: string | null; changed_by?: string | null; pulled_at?: string | null; restored_at?: string | null }[],
  readError: null as null | { code?: string; message: string },
  upserts: [] as Record<string, unknown>[],
  upsertError: null as null | { code?: string; message: string },
  admin: { id: "a1", email: "owner@example.com" } as { id: string; email: string } | null,
  logged: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      expect(table).toBe("chant_pulls");
      const filters: ((r: Record<string, unknown>) => boolean)[] = [];
      const q: Record<string, unknown> = {
        select: () => q,
        eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), q),
        upsert: async (row: Record<string, unknown>) => {
          state.upserts.push(row);
          return { error: state.upsertError };
        },
        then: <T,>(resolve: (v: unknown) => T) =>
          Promise.resolve(
            state.readError
              ? { data: null, error: state.readError }
              : { data: state.pulls.filter((r) => filters.every((f) => f(r))), error: null },
          ).then(resolve),
      };
      return q;
    },
  }),
}));
vi.mock("@/lib/admin/access", () => ({ getAdminUser: async () => state.admin }));
vi.mock("@/lib/admin/activityLog", () => ({ logActivity: async (e: Record<string, unknown>) => void state.logged.push(e) }));
vi.mock("@/lib/security/ratelimit", () => ({ rateLimited: async () => false }));

import base from "@/data/chants-live.json";
import { GET as liveList } from "@/app/audio/chants/live.json/route";
import { GET as adminGet, POST as adminPost } from "@/app/api/admin/chant-pulls/route";
import { readLiveList } from "../live";
import { withPulls, type LiveListFile } from "../pulls";
import { activePulls, forgetPulls } from "../pulls.server";

const BASE = base as LiveListFile;
const first = BASE.live[0];

beforeEach(() => {
  state.pulls = [];
  state.readError = null;
  state.upserts = [];
  state.upsertError = null;
  state.admin = { id: "a1", email: "owner@example.com" };
  state.logged = [];
  forgetPulls();
});

describe("withPulls", () => {
  it("moves a taken-down recording from live to pulled", () => {
    const l = withPulls(BASE, [first]);
    expect(l.live).not.toContain(first);
    expect(l.pulled).toContain(first);
    expect(l.live.length).toBe(BASE.live.length - 1);
  });

  it("is the committed list, unchanged, with no takedowns", () => {
    expect(withPulls(BASE, [])).toEqual(BASE);
  });

  it("ignores anything not shaped like a recording, so a stray row cannot empty the list", () => {
    expect(withPulls(BASE, ["*", "", "../x", "Psalm 135/EN"])).toEqual(BASE);
  });
});

describe("activePulls", () => {
  it("reads the recordings switched off, and only those", async () => {
    state.pulls = [
      { ref: first, pulled: true },
      { ref: "psalm-117/ar", pulled: false },
    ];
    expect(await activePulls()).toEqual([first]);
  });

  it("reads at most once a minute", async () => {
    state.pulls = [{ ref: first, pulled: true }];
    const t = 1_000_000;
    expect(await activePulls(undefined, t)).toEqual([first]);
    state.pulls = [];
    expect(await activePulls(undefined, t + 30_000)).toEqual([first]);
    expect(await activePulls(undefined, t + 61_000)).toEqual([]);
  });

  it("answers no takedowns when the table is missing or the read fails", async () => {
    state.readError = { code: "42P01", message: "missing" };
    expect(await activePulls()).toEqual([]);
    forgetPulls();
    state.readError = { message: "connection reset" };
    expect(await activePulls()).toEqual([]);
  });
});

describe("GET /audio/chants/live.json", () => {
  it("serves the committed list less the takedowns, readable by the apps and kept minutes", async () => {
    state.pulls = [{ ref: first, pulled: true }];
    const res = await liveList();
    const body = await res.json();
    expect(readLiveList(body)).not.toBeNull();
    expect(body.live).not.toContain(first);
    expect(body.pulled).toContain(first);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=300");
  });

  it("serves the committed list unchanged before the table exists", async () => {
    state.readError = { code: "PGRST205", message: "Could not find the table" };
    expect(await (await liveList()).json()).toEqual(BASE);
  });
});

describe("the admin's switch", () => {
  const post = (body: unknown) =>
    adminPost(new NextRequest("https://purifyapp.net/api/admin/chant-pulls", { method: "POST", body: JSON.stringify(body) }));

  it("is 403 to anyone who is not an admin", async () => {
    state.admin = null;
    expect((await adminGet()).status).toBe(403);
    expect((await post({ ref: first, pulled: true, reason: "x" })).status).toBe(403);
  });

  it("lists every recording on the list with its switch", async () => {
    state.pulls = [{ ref: first, pulled: true, reason: "The choir asked", changed_by: "owner@example.com", pulled_at: "2026-11-09T12:00:00Z" }];
    const body = await (await adminGet()).json();
    expect(body.absent).toBe(false);
    expect(body.recordings).toHaveLength(BASE.live.length);
    expect(body.recordings.find((r: { ref: string }) => r.ref === first)).toMatchObject({ pulled: true, reason: "The choir asked" });
  });

  it("takes one down with a reason, and logs who", async () => {
    expect((await post({ ref: first, pulled: true, reason: "The choir asked" })).status).toBe(200);
    expect(state.upserts[0]).toMatchObject({ ref: first, pulled: true, reason: "The choir asked", changed_by: "owner@example.com" });
    expect(state.logged[0]).toMatchObject({ action: "chant_recording.pulled", entityId: first });
  });

  it("asks why before taking one down, and refuses a recording the list does not have", async () => {
    expect((await post({ ref: first, pulled: true })).status).toBe(400);
    expect((await post({ ref: "no-such/en", pulled: true, reason: "x" })).status).toBe(404);
    expect((await post({ ref: "../etc", pulled: true, reason: "x" })).status).toBe(400);
    expect(state.upserts).toHaveLength(0);
  });

  it("puts one back", async () => {
    expect((await post({ ref: first, pulled: false })).status).toBe(200);
    expect(state.upserts[0]).toMatchObject({ ref: first, pulled: false });
  });

  it("says the switch is not set up while the table is missing, and never claims it moved", async () => {
    state.upsertError = { code: "42P01", message: "missing" };
    expect((await post({ ref: first, pulled: true, reason: "x" })).status).toBe(409);
    state.readError = { code: "42P01", message: "missing" };
    expect((await (await adminGet()).json()).absent).toBe(true);
  });
});
