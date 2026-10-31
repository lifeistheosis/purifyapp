import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/admin/support/reader: the reader beside a request (Messages, the
 * owner's pick A, 2026-10-30), run for real with the session and the
 * database stood in for.
 *
 * What would go wrong if this broke: anyone but an admin reading a reader's
 * orders, address and plan; an address put in a query string, where request
 * logs keep it; or a part that failed to read shown as nothing at all.
 */

type Op = { table: string; filters: [string, unknown][] };
type Result = { data: unknown; error: { message: string } | null };

const state = vi.hoisted(() => ({
  user: null as null | { id: string; email?: string | null },
  adminClients: 0,
  ops: [] as Op[],
  handle: (() => ({ data: null, error: null })) as (op: Op) => Result,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }),
  createClientFromRequest: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    state.adminClients += 1;
    return {
      auth: {
        admin: {
          getUserById: async () => ({ data: { user: { created_at: "2026-03-04T10:00:00Z", user_metadata: {} } }, error: null }),
        },
      },
      from(table: string) {
        const op: Op = { table, filters: [] };
        const run = () => {
          state.ops.push(op);
          return Promise.resolve(state.handle(op));
        };
        const chain: Record<string, unknown> = {};
        const self = () => chain;
        const filter = (col: string, val: unknown) => {
          op.filters.push([col, val]);
          return chain;
        };
        Object.assign(chain, {
          select: self,
          order: self,
          limit: self,
          range: self,
          eq: filter,
          in: filter,
          ilike: filter,
          maybeSingle: run,
          single: run,
          then: (ok: (v: Result) => unknown, bad: (e: unknown) => unknown) => run().then(ok, bad),
        });
        return chain;
      },
    };
  },
}));

vi.mock("@/lib/admin/accountEmails", () => ({ userIdByEmail: async () => null }));
vi.mock("@/lib/billing/revenuecatRest", () => ({
  revenuecatRestConfigured: () => false,
  getCustomerDates: async () => null,
}));

import { GET } from "@/app/api/admin/support/reader/route";

const TICKET = "3f0a61d2-1111-4222-8333-444455556666";
const ask = (query: string) => GET(new Request(`https://purifyapp.net/api/admin/support/reader?${query}`));

const ADMIN_EMAILS = process.env.ADMIN_EMAILS;
afterAll(() => {
  if (ADMIN_EMAILS === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = ADMIN_EMAILS;
});

beforeEach(() => {
  process.env.ADMIN_EMAILS = "owner@purify.example";
  state.user = { id: "admin-1", email: "owner@purify.example" };
  state.adminClients = 0;
  state.ops = [];
  state.handle = () => ({ data: null, error: null });
});

describe("/api/admin/support/reader", () => {
  it("answers 403 to a reader who is not signed in, and reads nothing", async () => {
    state.user = null;
    expect((await ask(`ticket=${TICKET}`)).status).toBe(403);
    expect(state.adminClients).toBe(0);
  });

  it("answers 403 to a signed-in reader who is not an admin, and reads nothing", async () => {
    state.user = { id: "u-1", email: "reader@example.com" };
    expect((await ask(`ticket=${TICKET}`)).status).toBe(403);
    expect(state.adminClients).toBe(0);
  });

  it("is asked by ticket, never by an address in the query", async () => {
    expect((await ask("email=a@b.c")).status).toBe(400);
    expect(state.ops).toEqual([]);
  });

  it("finds the reader's orders by account and by the address they bought with", async () => {
    state.handle = (op) => {
      if (op.table === "support_tickets") {
        return { data: { id: TICKET, email: "a_b@example.com", name: "A. Sample", user_id: "u-9", order_id: null }, error: null };
      }
      if (op.table === "shop_orders") {
        const byAccount = op.filters.some(([c]) => c === "user_id");
        return {
          data: [
            {
              id: byAccount ? "o-1" : "o-2",
              created_at: byAccount ? "2026-10-08T10:00:00Z" : "2026-09-01T10:00:00Z",
              items: [{ title: "Greek prayer rope, 33 knots", quantity: 1, unit_price_cents: 2400, product_id: "p-1" }],
            },
          ],
          error: null,
        };
      }
      if (op.table === "entitlements") return { data: null, error: null };
      return { data: [], error: null };
    };
    const res = await ask(`ticket=${TICKET}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { orders: { id: string }[]; reader: { since: string; name: string } };
    expect(body.orders.map((o) => o.id)).toEqual(["o-1", "o-2"]);
    expect(body.reader).toMatchObject({ name: "A. Sample", since: "2026-03-04T10:00:00Z" });
    // The address's own underscore is matched as itself, not as any letter.
    const byAddress = state.ops.find((o) => o.table === "shop_orders" && o.filters.some(([c]) => c === "email"));
    expect(byAddress?.filters).toContainEqual(["email", "a\\_b@example.com"]);
  });

  it("names a part that could not be read rather than showing it as empty", async () => {
    state.handle = (op) => {
      if (op.table === "support_tickets") {
        return { data: { id: TICKET, email: "a.sample@example.com", name: "A. Sample", user_id: "u-9", order_id: null }, error: null };
      }
      if (op.table === "shop_orders") return { data: null, error: { message: "boom" } };
      if (op.table === "entitlements") {
        return { data: { plus_until: "2099-01-01T00:00:00Z", pro_until: null, plus_source: "google" }, error: null };
      }
      return { data: [], error: null };
    };
    const res = await ask(`ticket=${TICKET}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { failed: string[]; plan: { tier: string; source: string }; orders: unknown[] };
    expect(body.failed).toContain("orders");
    expect(body.orders).toEqual([]);
    expect(body.plan).toMatchObject({ tier: "plus", source: "google" });
  });
});
