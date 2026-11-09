// Searched, not found (A11): the route that keeps the words, the admin's read,
// and the folding.

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  inserts: [] as Record<string, unknown>[],
  insertError: null as null | { code?: string; message: string },
  limited: false,
  admin: { email: "owner@example.com" } as { email: string } | null,
  rows: [] as Record<string, unknown>[],
  readError: null as null | { code?: string; message: string },
}));

vi.mock("@/lib/security/ratelimit", () => ({ rateLimited: async () => state.limited, ipKey: () => "ip" }));
vi.mock("@/lib/admin/access", () => ({ getAdminUser: async () => state.admin }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from() {
      let window: [number, number] = [0, Infinity];
      const q: Record<string, unknown> = {};
      q.insert = async (row: Record<string, unknown>) => {
        state.inserts.push(row);
        return { error: state.insertError };
      };
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

import { POST } from "@/app/api/search/miss/route";
import { GET } from "@/app/api/admin/search-misses/route";
import { groupMisses } from "../missGroups";

const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request("https://purifyapp.net/api/search/miss", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0", ...headers },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  state.inserts = [];
  state.insertError = null;
  state.limited = false;
  state.admin = { email: "owner@example.com" };
  state.rows = [];
  state.readError = null;
});

describe("POST /api/search/miss", () => {
  it("keeps the words, scrubbed again on the server, with the language and the device", async () => {
    const res = await post({ words: "Akathist for maria@example.com", locale: "en", platform: "ios" });
    expect(res.status).toBe(204);
    expect(state.inserts).toEqual([{ words: "akathist for", locale: "en", platform: "ios" }]);
  });

  it("keeps nothing that is only a person's details, and still answers 204", async () => {
    expect((await post({ words: "+1 (555) 123-4567", platform: "web" })).status).toBe(204);
    expect(state.inserts).toHaveLength(0);
  });

  it("refuses an extra field, and keeps nothing", async () => {
    expect((await post({ words: "x y", platform: "web", userId: "u1" })).status).toBe(400);
    expect(state.inserts).toHaveLength(0);
  });

  it("holds an address to its budget", async () => {
    state.limited = true;
    expect((await post({ words: "saint john", platform: "web" })).status).toBe(429);
  });
});

describe("GET /api/admin/search-misses", () => {
  const get = (q = "") => GET(new NextRequest(`https://purifyapp.net/api/admin/search-misses${q}`));

  it("is 403 to anyone who is not an admin", async () => {
    state.admin = null;
    expect((await get()).status).toBe(403);
  });

  it("says it is not set up while the table is missing", async () => {
    state.readError = { code: "PGRST205", message: "Could not find the table in the schema cache" };
    expect(await (await get()).json()).toEqual({ absent: true });
  });

  it("answers the searches folded, for the days asked", async () => {
    state.rows = [
      { words: "saint nektarios", day: "2026-11-09", locale: "en", platform: "ios" },
      { words: "saint nektarios", day: "2026-11-08", locale: "el", platform: "web" },
      { words: "akathist", day: "2026-11-09", locale: "en", platform: "web" },
    ];
    const body = await (await get("?days=7")).json();
    expect(body).toMatchObject({ absent: false, days: 7, total: 3 });
    expect(body.groups[0]).toMatchObject({ words: "saint nektarios", count: 2, days: 2, lastDay: "2026-11-09" });
  });
});

describe("groupMisses", () => {
  it("puts the most asked first, then the most days, and names the languages", () => {
    const g = groupMisses([
      { words: "a", day: "2026-11-01", locale: "en", platform: null },
      { words: "b", day: "2026-11-01", locale: "ro", platform: null },
      { words: "b", day: "2026-11-02", locale: "ro", platform: null },
      { words: "b", day: "2026-11-02", locale: "en", platform: null },
    ]);
    expect(g.map((x) => [x.words, x.count, x.days])).toEqual([
      ["b", 3, 2],
      ["a", 1, 1],
    ]);
    expect(g[0].locales).toEqual(["ro", "en"]);
  });
});
