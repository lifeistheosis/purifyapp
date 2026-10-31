import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { filterReaders, fold, initialsOf, isWaiting, marksOf, matches, sortReaders, sourceWord, type Reader } from "../readers";

// Users: the owner's pick C on sheet r3-15 (2026-10-30), one directory of
// readers with the reader's card; Verification and Badges are its filters.

const NOW = Date.parse("2026-10-30T09:41:00Z");

const reader = (over: Partial<Reader>): Reader => ({
  id: "00000000-0000-4000-8000-000000000000",
  email: "reader@example.com",
  name: null,
  handle: null,
  joinedAt: "2026-09-02T10:00:00Z",
  provider: "google",
  lastSignInAt: null,
  plan: null,
  planSource: null,
  badges: [],
  check: null,
  seal: null,
  ...over,
});

const A = reader({ id: "a", name: "Sample Reader A", email: "reader.a@example.com", joinedAt: "2026-10-30T08:00:00Z", plan: "plus", badges: ["beta_tester"] });
const C = reader({ id: "c", name: "Sample Reader C", handle: "choir.sample", email: "choir@example.com", provider: "apple", plan: "plus", check: "requested" });
const D = reader({ id: "d", name: "Sample Reader D", email: "reader.d@example.com", provider: "email", plan: "pro", check: "verified", joinedAt: "2026-08-18T00:00:00Z" });
const F = reader({ id: "f", name: "Ștefan Fără", email: "f@example.com", seal: "requested", joinedAt: "2026-06-21T00:00:00Z" });
const ALL = [A, C, D, F];

describe("the directory", () => {
  it("finds a reader by email, @handle or name, whatever the case or the accents", () => {
    expect(matches(C, "choir@")).toBe(true);
    expect(matches(C, "@choir")).toBe(true);
    expect(matches(C, "SAMPLE READER C")).toBe(true);
    expect(matches(F, "stefan")).toBe(true);
    expect(matches(F, "fara")).toBe(true);
    expect(matches(D, "choir")).toBe(false);
    expect(fold(" @Ștefan ")).toBe("stefan");
  });

  it("filters by when they joined, how they sign in, their plan and their marks", () => {
    const ids = (f: Parameters<typeof filterReaders>[1]) => filterReaders(ALL, f, NOW).map((r) => r.id);
    expect(ids({ joined: "today" })).toEqual(["a"]);
    expect(ids({ joined: "90d" })).toEqual(["a", "c", "d"]);
    expect(ids({ provider: "apple" })).toEqual(["c"]);
    expect(ids({ plan: "pro" })).toEqual(["d"]);
    expect(ids({ plan: "free" })).toEqual(["f"]);
    expect(ids({ marks: "badge" })).toEqual(["a"]);
    expect(ids({ marks: "check" })).toEqual(["c", "d"]);
    expect(ids({ marks: "seal" })).toEqual(["f"]);
    expect(ids({ marks: "none" })).toEqual([]);
  });

  it("makes the queue a filter: who asked for a mark and has no answer yet", () => {
    expect(ALL.filter(isWaiting).map((r) => r.id)).toEqual(["c", "f"]);
    expect(filterReaders(ALL, { waiting: true }, NOW).map((r) => r.id)).toEqual(["c", "f"]);
  });

  it("puts the oldest request first when waiting, the newest reader first otherwise", () => {
    const asked = new Map([
      ["c", "2026-10-27T10:00:00Z"],
      ["f", "2026-10-29T22:30:00Z"],
    ]);
    expect(sortReaders([F, C], true, asked).map((r) => r.id)).toEqual(["c", "f"]);
    expect(sortReaders(ALL, false).map((r) => r.id)).toEqual(["a", "c", "d", "f"]);
  });

  it("says each reader's marks, the waiting ones first", () => {
    expect(marksOf(C)).toEqual([{ text: "asked for the check", kind: "waiting" }]);
    expect(marksOf(D)).toEqual([{ text: "Verified", kind: "given" }]);
    expect(marksOf(A)).toEqual([{ text: "Beta Tester", kind: "badge" }]);
  });

  it("draws the card's initials and says where a plan comes from", () => {
    expect(initialsOf(C)).toBe("SC");
    expect(initialsOf({ name: null, handle: null, email: "reader@example.com" })).toBe("R");
    expect(sourceWord("apple")).toBe("App Store");
    expect(sourceWord("comp")).toBe("comped");
  });
});

// ── The route ─────────────────────────────────────────────────────────────

type Answer = { data: unknown; error: { code?: string; message: string } | null };

const state = vi.hoisted(() => ({
  admin: { email: "owner@example.com" } as { email: string } | null,
  users: [] as Record<string, unknown>[],
  tables: {} as Record<string, Answer>,
  listCalls: 0,
}));

vi.mock("@/lib/admin/access", () => ({ getAdminUser: async () => state.admin }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        listUsers: async ({ page }: { page: number }) => {
          state.listCalls++;
          return { data: { users: page === 1 ? state.users : [] }, error: null };
        },
      },
    },
    from(table: string) {
      const filters: [string, unknown][] = [];
      let window: [number, number] = [0, Infinity];
      const query: Record<string, unknown> = {};
      for (const m of ["select", "order", "limit"]) query[m] = () => query;
      query.eq = (c: string, v: unknown) => (filters.push([c, v]), query);
      query.range = (from: number, to: number) => ((window = [from, to]), query);
      const answer = () => {
        const a = state.tables[table] ?? { data: [], error: null };
        if (a.error || !Array.isArray(a.data)) return a;
        const rows = (a.data as Record<string, unknown>[]).filter((r) => filters.every(([c, v]) => r[c] === undefined || r[c] === v));
        return { data: rows.slice(window[0], window[1] + 1), error: null };
      };
      query.maybeSingle = () => Promise.resolve(answer()).then((a) => ({ ...a, data: Array.isArray(a.data) ? (a.data[0] ?? null) : a.data }));
      query.then = <T>(resolve: (a: Answer) => T) => Promise.resolve(answer()).then(resolve);
      return query;
    },
  }),
}));

import { GET } from "@/app/api/admin/readers/route";

const ID_C = "11111111-1111-4111-8111-111111111111";
const ID_D = "22222222-2222-4222-8222-222222222222";

describe("/api/admin/readers", () => {
  beforeEach(() => {
    state.admin = { email: "owner@example.com" };
    state.listCalls = 0;
    state.users = [
      { id: ID_C, email: "choir@example.com", created_at: "2026-09-02T10:00:00Z", last_sign_in_at: "2026-10-30T08:20:00Z", app_metadata: { provider: "apple" }, user_metadata: {} },
      { id: ID_D, email: "reader.d@example.com", created_at: "2026-08-18T00:00:00Z", last_sign_in_at: null, app_metadata: { provider: "email" }, user_metadata: { full_name: "Sample Reader D" } },
    ];
    state.tables = {
      profiles: { data: [{ id: ID_C, handle: "choir.sample", display_name: "Sample Reader C", joined_at: "2026-09-02T10:00:00Z" }], error: null },
      entitlements: { data: [{ user_id: ID_C, plus_until: "2026-11-14T00:00:00Z", pro_until: null, plus_source: "apple", auto_renew: true, billing_issue_at: null }], error: null },
      user_badges: { data: [{ user_id: ID_C, badge: "beta_tester", granted_at: "2026-10-02T00:00:00Z", granted_by: "owner@example.com", note: null }], error: null },
      user_verification: { data: [{ user_id: ID_C, status: "requested", claim: "I run my parish choir's page", requested_at: "2026-10-27T10:00:00Z" }], error: null },
      clergy_verifications: { data: null, error: { code: "42P01", message: "relation does not exist" } },
      shop_orders: { data: [], error: null },
    };
  });

  it("answers 403 to anyone who is not an admin, and reads nothing", async () => {
    state.admin = null;
    const res = await GET(new NextRequest("http://x/api/admin/readers"));
    expect(res.status).toBe(403);
    expect(state.listCalls).toBe(0);
  });

  it("lists every account, joined with its handle, plan, badges and requests", async () => {
    const res = await GET(new NextRequest("http://x/api/admin/readers?fresh=1"));
    const body = (await res.json()) as { total: number; waiting: number; rows: Reader[]; missing: string[]; summary: { providers: Record<string, number> } };
    expect(res.status).toBe(200);
    expect(body.total).toBe(2);
    expect(body.waiting).toBe(1);
    const c = body.rows.find((r) => r.id === ID_C)!;
    expect(c).toMatchObject({ handle: "choir.sample", name: "Sample Reader C", plan: "plus", planSource: "apple", badges: ["beta_tester"], check: "requested" });
    const d = body.rows.find((r) => r.id === ID_D)!;
    expect(d).toMatchObject({ name: "Sample Reader D", plan: null, check: null });
    // A table this database does not have yet is said, not failed on.
    expect(body.missing).toEqual(["clergy seals"]);
    expect(body.summary.providers).toMatchObject({ apple: 1, email: 1 });
  });

  it("filters on the server: the waiting ones, by handle", async () => {
    const res = await GET(new NextRequest("http://x/api/admin/readers?fresh=1&waiting=1&q=%40choir"));
    const body = (await res.json()) as { matched: number; rows: Reader[] };
    expect(body.matched).toBe(1);
    expect(body.rows[0].id).toBe(ID_C);
  });

  it("opens one reader's card, and refuses an id that is not one", async () => {
    const res = await GET(new NextRequest(`http://x/api/admin/readers?id=${ID_C}`));
    const body = (await res.json()) as { reader: Reader; plan: { plus_source: string }; badges: unknown[]; check: { claim: string }; seal: null; unread: string[] };
    expect(res.status).toBe(200);
    expect(body.reader.id).toBe(ID_C);
    expect(body.plan.plus_source).toBe("apple");
    expect(body.badges.length).toBe(1);
    expect(body.check.claim).toBe("I run my parish choir's page");
    expect(body.seal).toBeNull();
    expect(body.unread).toEqual([]);
    expect((await GET(new NextRequest("http://x/api/admin/readers?id=nope"))).status).toBe(400);
    expect((await GET(new NextRequest("http://x/api/admin/readers?id=33333333-3333-4333-8333-333333333333"))).status).toBe(404);
  });

  it("says the directory could not be read rather than showing nobody", async () => {
    state.tables.profiles = { data: null, error: { message: "boom" } };
    const res = await GET(new NextRequest("http://x/api/admin/readers?fresh=1"));
    expect(res.status).toBe(502);
  });
});

describe("the shell's Users", () => {
  it("draws the directory, with Live carts and Abandoned checkouts left where they were", () => {
    const shell = readFileSync(join(process.cwd(), "components/admin/AdminShell.tsx"), "utf8");
    expect(shell).toContain("users: ReadersTab,");
    expect(shell).toContain("carts: LiveCartsTab,");
    expect(shell).toContain("abandoned: AbandonedTab,");
  });

  it("does every write from the card through the routes that already guard it", () => {
    const card = readFileSync(join(process.cwd(), "components/admin/tabs/ReaderCard.tsx"), "utf8");
    for (const route of ["/api/admin/verification", "/api/admin/clergy", "/api/admin/badges", "/api/admin/subscriptions/comp", "/api/admin/gifts"]) {
      expect(card, route).toContain(`"${route}"`);
    }
    // Comping and gifting ask once more before they go.
    expect(card).toContain("setConfirming(true)");
  });
});
