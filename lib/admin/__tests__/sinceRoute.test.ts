import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/admin/since, the Home's feed (sheet r3-15, Home B and A mixed), over
 * tables held in memory. The fake answers each table with its canned rows and
 * records what was asked of it; the line and the rows are the route's.
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
      for (const m of ["select", "eq", "in", "or", "gte", "order", "limit", "range"]) {
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

import { GET } from "@/app/api/admin/since/route";

async function call(qs = "") {
  const res = await GET(new NextRequest(`http://x/api/admin/since${qs}`));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

beforeEach(() => {
  state.admin = { email: "owner@example.com" };
  state.tables = {};
  state.asked = [];
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-30T09:41:00Z"));
});

describe("/api/admin/since", () => {
  it("answers 403 to anyone who is not an admin, and reads nothing", async () => {
    state.admin = null;
    const { status, body } = await call();
    expect(status).toBe(403);
    expect(body.error).toBe("Forbidden");
    expect(state.asked).toEqual([]);
  });

  it("starts the feed where his previous visit ended, from his own log", async () => {
    state.tables.admin_usage = {
      data: [
        { at: "2026-10-30T09:30:00Z", kind: "view", label: null },
        { at: "2026-10-29T21:40:00Z", kind: "view", label: null },
      ],
      error: null,
    };
    const { status, body } = await call();
    expect(status).toBe(200);
    expect(body.line).toBe("2026-10-29T21:40:00.000Z");
    expect(body.basis).toBe("visit");
    // His rows only.
    const usage = state.asked.find((a) => a.table === "admin_usage")!;
    expect(usage.calls).toContainEqual(["eq", ["actor_email", "owner@example.com"]]);
  });

  it("keeps a line the page sends, and then does not read the log", async () => {
    const { body } = await call("?at=2026-10-30T09:00:00.000Z");
    expect(body.line).toBe("2026-10-30T09:00:00.000Z");
    expect(body.basis).toBe("asked");
    expect(state.asked.some((a) => a.table === "admin_usage")).toBe(false);
  });

  it("says it is showing the last day when the log cannot be read, and names it unread", async () => {
    state.tables.admin_usage = { data: null, error: { code: "42P01", message: "relation does not exist" } };
    const { body } = await call();
    expect(body.basis).toBe("day");
    expect(body.unread).toContain("your use log");
  });

  it("makes each row a door: orders, members, tickets, requests and ticks", async () => {
    state.tables.admin_usage = { data: [{ at: "2026-10-29T21:40:00Z", kind: "view", label: null }], error: null };
    state.tables.shop_orders = {
      data: [
        { email: "ann@example.com", total_cents: 4200, payment_status: "paid", created_at: "2026-10-30T09:37:00Z", paid_at: "2026-10-30T09:38:00Z", items: [{ quantity: 2 }] },
        { email: "c@example.com", total_cents: 1600, payment_status: "refunded", created_at: "2026-10-29T23:15:00Z", paid_at: null, items: [{ quantity: 1 }] },
      ],
      error: null,
    };
    state.tables.profiles = { data: [{ joined_at: "2026-10-30T02:00:00Z" }], error: null, count: 41 };
    state.tables.email_sends = { data: [{ user_id: "u1", created_at: "2026-10-30T08:55:00Z" }], error: null };
    state.tables.entitlements = { data: [{ user_id: "u1", plus_source: "google" }], error: null };
    state.tables.support_tickets = {
      data: [{ email: "b@example.com", subject: "Restore my purchase", status: "open", created_at: "2026-10-30T03:40:00Z" }],
      error: null,
    };
    state.tables.user_verification = {
      data: [{ user_id: "u2", status: "requested", claim: "I run my parish choir's page", requested_at: "2026-10-29T22:30:00Z" }],
      error: null,
    };
    state.tables.admin_tasks = { data: [{ title: "Write this week's patch note", done_at: "2026-10-29T22:05:00Z", auto: true }], error: null };

    const { body } = await call();
    const events = body.events as { kind: string; title: string; detail: string; tab: string; mark: string }[];
    expect(events.map((e) => e.kind)).toEqual(["order", "member", "ticket", "order", "check", "tick"]);
    expect(events[0]).toMatchObject({ title: "An order came in, $42", detail: "2 items, ann@example.com", tab: "orders", mark: "good" });
    expect(events[1]).toMatchObject({ title: "A new Plus member", detail: "from Google Play", tab: "subscriptions" });
    expect(events[2]).toMatchObject({ mark: "wait", tab: "messages" });
    expect(events[3].detail).toContain("since refunded");
    expect(events[4]).toMatchObject({ title: "Asked for the blue check", tab: "verification", mark: "wait" });
    expect(events[4].detail).toContain("u2@example.com");
    expect(events[5].title).toBe("Ticked by the app: Write this week's patch note");
    // The refunded order is in the feed but not in what came in.
    expect(body.orderCents).toBe(4200);
    expect(body.readers).toEqual({ count: 41, times: ["2026-10-30T02:00:00Z"] });
    expect(body.unread).toEqual([]);
  });

  it("counts an order by when its money landed, or its checkout when there is no payment time", async () => {
    await call("?at=2026-10-29T21:40:00.000Z");
    const orders = state.asked.find((a) => a.table === "shop_orders")!;
    expect(orders.calls).toContainEqual([
      "or",
      ['paid_at.gte."2026-10-29T21:40:00.000Z",and(paid_at.is.null,created_at.gte."2026-10-29T21:40:00.000Z")'],
    ]);
  });

  it("names a source that did not answer instead of showing it as quiet", async () => {
    state.tables.support_tickets = { data: null, error: { message: "boom" } };
    state.tables.clergy_verifications = { data: null, error: { code: "42P01", message: "missing" } };
    const { status, body } = await call("?at=2026-10-29T21:40:00.000Z");
    expect(status).toBe(200);
    expect(body.unread).toEqual(["the support tickets", "the clergy seal requests"]);
  });
});
