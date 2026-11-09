// The two routes of the errors list (A10): where reports come in, anonymous
// and held to a budget, and where the admin reads them.

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  recorded: [] as Record<string, unknown>[],
  limited: false,
  admin: { email: "owner@example.com" } as { email: string } | null,
  rows: [] as Record<string, unknown>[],
  readError: null as null | { code?: string; message: string },
}));

vi.mock("@/lib/errors/store", () => ({
  recordError: async (r: Record<string, unknown>) => {
    state.recorded.push(r);
    return "stored";
  },
}));
vi.mock("@/lib/security/ratelimit", () => ({
  rateLimited: async () => state.limited,
  ipKey: () => "ip",
}));
vi.mock("@/lib/admin/access", () => ({ getAdminUser: async () => state.admin }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from() {
      let window: [number, number] = [0, Infinity];
      const q: Record<string, unknown> = {};
      for (const m of ["select", "gte", "order"]) q[m] = () => q;
      q.range = (a: number, b: number) => ((window = [a, b]), q);
      q.then = <T,>(resolve: (v: unknown) => T) =>
        Promise.resolve(
          state.readError ? { data: null, error: state.readError } : { data: state.rows.slice(window[0], window[1] + 1), error: null },
        ).then(resolve);
      return q;
    },
  }),
}));

import { POST } from "@/app/api/errors/route";
import { GET } from "@/app/api/admin/errors/route";

const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request("https://purifyapp.net/api/errors", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0 (Linux; Android 14)", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

const OK = { source: "screen", page: "/today", message: "x is undefined", appVersion: "1.9", platform: "android" };

beforeEach(() => {
  state.recorded = [];
  state.limited = false;
  state.admin = { email: "owner@example.com" };
  state.rows = [];
  state.readError = null;
});

describe("POST /api/errors", () => {
  it("keeps a well-formed report and answers 204", async () => {
    const res = await post(OK);
    expect(res.status).toBe(204);
    expect(state.recorded).toEqual([{ source: "screen", page: "/today", message: "x is undefined", status: undefined, appVersion: "1.9", platform: "android" }]);
  });

  it("refuses what is not JSON, or not the shape, and keeps nothing", async () => {
    expect((await post(OK, { "content-type": "text/plain" })).status).toBe(415);
    expect((await post({ ...OK, source: "server" })).status).toBe(400);
    expect((await post({ ...OK, userId: "x" })).status).toBe(400);
    expect((await post("{")).status).toBe(400);
    expect(state.recorded).toHaveLength(0);
  });

  it("holds an address to its budget", async () => {
    state.limited = true;
    expect((await post(OK)).status).toBe(429);
    expect(state.recorded).toHaveLength(0);
  });

  it("answers a crawler as if kept, and keeps nothing", async () => {
    const res = await post(OK, { "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" });
    expect(res.status).toBe(204);
    expect(state.recorded).toHaveLength(0);
  });

  it("keeps nothing from the admin's own pages", async () => {
    expect((await post({ ...OK, page: "/admin" })).status).toBe(204);
    expect(state.recorded).toHaveLength(0);
  });
});

describe("GET /api/admin/errors", () => {
  const get = (q = "") => GET(new NextRequest(`https://purifyapp.net/api/admin/errors${q}`));

  it("is 403 to anyone who is not an admin", async () => {
    state.admin = null;
    expect((await get()).status).toBe(403);
  });

  it("says the list is not set up while the table is missing, never that nothing failed", async () => {
    state.readError = { code: "42P01", message: "relation does not exist" };
    expect(await (await get()).json()).toEqual({ absent: true });
  });

  it("answers the faults of the day, folded", async () => {
    state.rows = [
      { at: "2026-11-09T10:00:00Z", source: "screen", page: "/today", message: "x", route: null, status: null, app_version: "1.9", platform: "ios" },
      { at: "2026-11-09T11:00:00Z", source: "screen", page: "/today", message: "x", route: null, status: null, app_version: "1.9", platform: "ios" },
    ];
    const body = await (await get("?days=7")).json();
    expect(body).toMatchObject({ absent: false, days: 7, total: 2, truncated: false });
    expect(body.groups).toHaveLength(1);
    expect(body.groups[0].count).toBe(2);
  });
});
