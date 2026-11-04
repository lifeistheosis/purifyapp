import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/admin/timeline, the log that never resets (the owner, 2026-11-04),
 * over tables held in memory. The fake answers each table with its canned
 * rows and records what was asked of it. Every address and figure is made up.
 */

type Row = Record<string, unknown>;
type Answer = { data: Row[] | null; error: { code?: string; message: string } | null; count?: number | null };

const state = vi.hoisted(() => ({
  admin: { email: "owner@example.com" } as { email: string } | null,
  tables: {} as Record<string, Answer>,
  asked: [] as { table: string; calls: [string, unknown[]][] }[],
}));

vi.mock("@/lib/admin/access", () => ({ getAdminUser: async () => state.admin }));
vi.mock("@/lib/admin/accountEmails", () => ({
  emailsByUserId: async (ids: string[]) => new Map(ids.map((id) => [id, `${id}@example.com`])),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      const record = { table, calls: [] as [string, unknown[]][] };
      state.asked.push(record);
      const query: Record<string, unknown> = {};
      for (const m of ["select", "eq", "in", "or", "gte", "lt", "order", "limit", "range"]) {
        query[m] = (...args: unknown[]) => {
          record.calls.push([m, args]);
          return query;
        };
      }
      query.then = <T>(resolve: (a: Answer) => T) =>
        Promise.resolve(state.tables[table] ?? { data: [], error: null, count: 0 }).then(resolve);
      return query;
    },
  }),
}));

import { GET } from "@/app/api/admin/timeline/route";

async function call(qs = "") {
  const res = await GET(new NextRequest(`http://x/api/admin/timeline${qs}`));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

const callsOf = (table: string) => state.asked.find((a) => a.table === table)?.calls ?? [];

beforeEach(() => {
  state.admin = { email: "owner@example.com" };
  state.tables = {};
  state.asked = [];
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-04T15:00:00Z"));
});

describe("/api/admin/timeline", () => {
  it("answers 403 to anyone who is not an admin, and reads nothing", async () => {
    state.admin = null;
    const { status } = await call();
    expect(status).toBe(403);
    expect(state.asked).toEqual([]);
  });

  it("reads the newest week, bound at both ends, with where he last looked", async () => {
    state.tables.admin_usage = {
      data: [
        { at: "2026-11-04T14:58:00Z", kind: "view", label: null },
        { at: "2026-11-04T04:10:00Z", kind: "view", label: null },
      ],
      error: null,
    };
    state.tables.profiles = { data: [{ joined_at: "2026-11-04T13:00:00Z" }], error: null, count: 1 };
    state.tables.support_tickets = {
      data: [{ email: "reader@example.com", subject: "Bookmarks", status: "open", created_at: "2026-11-03T12:00:00Z" }],
      error: null,
    };
    const { status, body } = await call();
    expect(status).toBe(200);
    expect(body.from).toBe("2026-10-28T15:01:00.000Z");
    expect(body.to).toBe("2026-11-04T15:01:00.000Z");
    expect(body.more).toBe(true);
    expect((body.line as { at: string }).at).toBe("2026-11-04T04:10:00.000Z");
    expect(callsOf("support_tickets")).toEqual(
      expect.arrayContaining([
        ["gte", ["created_at", "2026-10-28T15:01:00.000Z"]],
        ["lt", ["created_at", "2026-11-04T15:01:00.000Z"]],
      ]),
    );
    const orFilter = callsOf("shop_orders").find(([m]) => m === "or")?.[1][0] as string;
    expect(orFilter).toContain('paid_at.lt."2026-11-04T15:01:00.000Z"');
    expect(orFilter).toContain('created_at.gte."2026-10-28T15:01:00.000Z"');
    expect((body.events as { kind: string }[]).map((e) => e.kind)).toEqual(["ticket"]);
    expect((body.readers as { times: string[] }).times).toEqual(["2026-11-04T13:00:00Z"]);
  });

  it("reads an older week without his log, and the window says where it is", async () => {
    const { body } = await call("?before=2026-10-28T15:01:00.000Z");
    expect(body.line).toBeNull();
    expect(body.from).toBe("2026-10-21T15:01:00.000Z");
    expect(state.asked.some((a) => a.table === "admin_usage")).toBe(false);
  });

  it("reads nothing before the floor, and refuses a time that is not one", async () => {
    const past = await call("?before=2026-04-01T00:00:00.000Z");
    expect(past.body.more).toBe(false);
    expect(past.body.events).toEqual([]);
    expect(state.asked).toEqual([]);
    const bad = await call("?before=yesterday");
    expect(bad.status).toBe(400);
  });
});
