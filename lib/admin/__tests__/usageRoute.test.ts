import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/admin/usage GET, run for real over rows held in memory. His pick B
 * for the Audit log (r3-17): "Only your own visits count". It summed every
 * admin's use together, so another admin's visits read as his and could
 * move his rail. Every address and count is made up.
 */

type Row = Record<string, unknown>;

const state = vi.hoisted(() => ({
  admin: { id: "u-1", email: "owner@example.com" } as { id: string; email: string | null } | null,
  rows: [] as Record<string, unknown>[],
  reads: 0,
}));

vi.mock("@/lib/admin/access", () => ({ getAdminUser: async () => state.admin }));
vi.mock("@/lib/security/ratelimit", () => ({ rateLimited: async () => false }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from() {
      const tests: ((r: Row) => boolean)[] = [];
      let window: [number, number] = [0, Infinity];
      const query = {
        select: () => query,
        eq: (c: string, v: unknown) => (tests.push((r) => r[c] === v), query),
        gte: (c: string, v: string) => (tests.push((r) => String(r[c]) >= v), query),
        order: () => query,
        range: (from: number, to: number) => ((window = [from, to]), query),
        then: <T>(resolve: (r: { data: Row[]; error: null }) => T) => {
          state.reads++;
          const hit = state.rows.filter((r) => tests.every((t) => t(r)));
          return Promise.resolve({ data: hit.slice(window[0], window[1] + 1), error: null }).then(resolve);
        },
      };
      return query;
    },
  }),
}));

import { GET } from "@/app/api/admin/usage/route";

const ask = (q = "") => GET(new NextRequest(`https://purifyapp.net/api/admin/usage${q}`));
const recent = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

beforeEach(() => {
  state.admin = { id: "u-1", email: "owner@example.com" };
  state.reads = 0;
  state.rows = [
    { id: 1, actor_email: "owner@example.com", kind: "view", tab: "traffic", ms: 60_000, from_tab: null, label: null, at: recent(1) },
    { id: 2, actor_email: "owner@example.com", kind: "view", tab: "overview", ms: 30_000, from_tab: "traffic", label: null, at: recent(10) },
    { id: 3, actor_email: "second@example.com", kind: "view", tab: "orders", ms: 900_000, from_tab: null, label: null, at: recent(1) },
  ];
});

describe("/api/admin/usage GET", () => {
  it("answers 403 to anyone who is not an admin", async () => {
    state.admin = null;
    expect((await ask()).status).toBe(403);
    expect(state.reads).toBe(0);
  });

  it("counts the signed-in admin's own visits and nobody else's", async () => {
    const body = (await (await ask()).json()) as { days: number; views: { tab: string }[] };
    expect(body.days).toBe(30);
    expect(body.views.map((v) => v.tab).sort()).toEqual(["overview", "traffic"]);
  });

  it("reads the last seven days when asked", async () => {
    const body = (await (await ask("?days=7")).json()) as { days: number; views: { tab: string }[] };
    expect(body.days).toBe(7);
    expect(body.views.map((v) => v.tab)).toEqual(["traffic"]);
  });

  it("hands an account with no address nothing, not somebody else's use", async () => {
    state.admin = { id: "u-2", email: null };
    const body = (await (await ask()).json()) as { views: unknown[] };
    expect(body.views).toEqual([]);
    expect(state.reads).toBe(0);
  });
});
