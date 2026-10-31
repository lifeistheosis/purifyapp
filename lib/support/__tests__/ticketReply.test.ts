import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A reader answers their own support ticket from the shop's Messages (1.8,
 * r3-19, Messages A: the owner's console replies reach the reader's inbox,
 * and the reader can answer there). The route,
 * app/api/support/tickets/reply, run for real against an in-memory stand-in
 * for the service role.
 *
 * What would go wrong if a guard went: anyone writing into anyone's ticket
 * by its id; a stranger learning that a ticket exists; a stuck send button
 * flooding the console; a blank or oversized message stored. Every ticket and
 * reader here is SAMPLE (the repo is public).
 */

type Row = Record<string, unknown>;

const state = vi.hoisted(() => ({
  user: null as null | { id: string; email: string },
  limited: false,
  limitKeys: [] as string[],
  db: { support_tickets: [] as Record<string, unknown>[], support_ticket_messages: [] as Record<string, unknown>[] },
}));

/** Just the calls the route and lib/support/tickets.ts make of the service role. */
function admin() {
  return {
    from(table: "support_tickets" | "support_ticket_messages") {
      const filters: [string, unknown][] = [];
      let patch: Row | null = null;
      const b = {
        select: () => b,
        eq: (column: string, value: unknown) => {
          filters.push([column, value]);
          return b;
        },
        update: (values: Row) => {
          patch = values;
          return b;
        },
        insert: (values: Row) => {
          state.db[table].push({ id: `m${state.db[table].length + 1}`, ...values });
          return Promise.resolve({ error: null });
        },
        maybeSingle: () => {
          const rows = state.db[table].filter((r) => filters.every(([c, v]) => r[c] === v));
          if (patch) for (const r of rows) Object.assign(r, patch);
          return Promise.resolve({ data: rows[0] ?? null, error: null });
        },
      };
      return b;
    },
  };
}

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => admin() }));
vi.mock("@/lib/supabase/server", () => ({
  createClientFromRequest: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
  }),
}));
vi.mock("@/lib/security/ratelimit", () => ({
  rateLimited: async (key: string) => {
    state.limitKeys.push(key);
    return state.limited;
  },
  ipKey: () => "test",
}));

import { POST as reply } from "@/app/api/support/tickets/reply/route";

const READER = "00000000-0000-4000-8000-0000000a0001";
const STRANGER = "00000000-0000-4000-8000-0000000a0002";
const MINE = "3f7a21c9-8d0e-4f1a-9b2c-1a2b3c4d5e10";
const THEIRS = "3f7a21c9-8d0e-4f1a-9b2c-1a2b3c4d5e11";
const NOWHERE = "3f7a21c9-8d0e-4f1a-9b2c-1a2b3c4d5e12";

function post(body: unknown) {
  return reply(
    new Request("https://purifyapp.net/api/support/tickets/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://localhost" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

const written = () => state.db.support_ticket_messages.length;

beforeEach(() => {
  state.user = { id: READER, email: "reader@example.com" };
  state.limited = false;
  state.limitKeys = [];
  state.db.support_tickets = [
    { id: MINE, user_id: READER, status: "resolved", subject: "Your prayer rope is on its way" },
    { id: THEIRS, user_id: STRANGER, status: "pending", subject: "Someone else's" },
  ];
  state.db.support_ticket_messages = [];
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("answering a support ticket from the app", () => {
  it("joins the reader's own ticket as theirs and reopens it for the console", async () => {
    const res = await post({ ticketId: MINE, body: "  Thank you, it arrived.  " });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(state.db.support_ticket_messages).toEqual([
      { id: "m1", ticket_id: MINE, author: "customer", body: "Thank you, it arrived." },
    ]);
    expect(state.db.support_tickets.find((t) => t.id === MINE)?.status).toBe("open");
    // The apps call it cross-origin: the answer carries the CORS headers.
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://localhost");
  });

  it("refuses a signed-out caller before reading anything", async () => {
    state.user = null;
    const res = await post({ ticketId: MINE, body: "Hello" });
    expect(res.status).toBe(401);
    expect(written()).toBe(0);
    expect(state.limitKeys).toEqual([]);
  });

  it("answers someone else's ticket exactly as one that does not exist, and writes nothing", async () => {
    const theirs = await post({ ticketId: THEIRS, body: "Let me in" });
    const nowhere = await post({ ticketId: NOWHERE, body: "Let me in" });
    expect(theirs.status).toBe(404);
    expect(nowhere.status).toBe(404);
    expect(await theirs.json()).toEqual(await nowhere.json());
    expect(written()).toBe(0);
    expect(state.db.support_tickets.find((t) => t.id === THEIRS)?.status).toBe("pending");
  });

  it("checks the body: one ticket id and between 1 and 5,000 characters", async () => {
    for (const bad of [
      "not json",
      {},
      { ticketId: "TKT-3F7A21C9", body: "Hello" },
      { ticketId: MINE, body: "   " },
      { ticketId: MINE, body: "x".repeat(5001) },
      { ticketId: MINE },
    ]) {
      const res = await post(bad);
      expect(res.status, JSON.stringify(bad).slice(0, 60)).toBe(400);
    }
    expect(written()).toBe(0);
  });

  it("keeps a budget per reader, and writes nothing past it", async () => {
    state.limited = true;
    const res = await post({ ticketId: MINE, body: "Hello again" });
    expect(res.status).toBe(429);
    expect(state.limitKeys).toEqual([`support-reply:${READER}`]);
    expect(written()).toBe(0);
  });
});
