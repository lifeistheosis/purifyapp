import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { lapsedAt, plusState, resolveSegment, type EntitlementDates } from "../segments";

const NOW = new Date("2026-09-14T12:00:00Z");
const DAY = 86_400_000;
const at = (offsetDays: number) => new Date(NOW.getTime() + offsetDays * DAY).toISOString();
const row = (user_id: string, plus: string | null, pro: string | null = null): EntitlementDates => ({
  user_id,
  plus_until: plus,
  pro_until: pro,
});

describe("plusState", () => {
  it("is active on a future Plus date", () => {
    expect(plusState(row("a", at(20)), NOW)).toBe("active");
  });

  it("is active on Pro alone, because Pro includes Plus", () => {
    expect(plusState(row("a", null, at(5)), NOW)).toBe("active");
    expect(plusState(row("a", at(-30), at(5)), NOW)).toBe("active");
  });

  it("is lapsed only when every date is in the past", () => {
    expect(plusState(row("a", at(-1)), NOW)).toBe("lapsed");
    expect(plusState(row("a", at(-40), at(-2)), NOW)).toBe("lapsed");
  });

  it("counts the exact moment of expiry as lapsed, not active", () => {
    expect(plusState(row("a", NOW.toISOString()), NOW)).toBe("lapsed");
  });

  it("is never for a row with no dates, such as a supporter-only row", () => {
    expect(plusState(row("a", null, null), NOW)).toBe("never");
  });

  it("does not let a garbage date make someone active", () => {
    expect(plusState(row("a", "not a date"), NOW)).toBe("never");
  });
});

describe("lapsedAt", () => {
  it("is the later of the two dates, for the winback clock", () => {
    expect(lapsedAt(row("a", at(-40), at(-10)), NOW)?.toISOString()).toBe(at(-10));
  });

  it("is null for anyone who has not lapsed", () => {
    expect(lapsedAt(row("a", at(3)), NOW)).toBeNull();
    expect(lapsedAt(row("a", null), NOW)).toBeNull();
  });
});

/**
 * Just enough of the supabase-js query builder for resolveSegment: from,
 * select, eq, range. Rows are served a page at a time so pagination is real.
 */
function fakeAdmin(tables: Record<string, Record<string, unknown>[] | Error>) {
  return {
    from(table: string) {
      const filters: [string, unknown][] = [];
      const builder = {
        select() {
          return builder;
        },
        eq(col: string, val: unknown) {
          filters.push([col, val]);
          return builder;
        },
        async range(from: number, to: number) {
          const source = tables[table];
          if (source instanceof Error) return { data: null, error: { message: source.message } };
          const rows = (source ?? []).filter((r) => filters.every(([c, v]) => r[c] === v));
          return { data: rows.slice(from, to + 1), error: null };
        },
      };
      return builder;
    },
  } as unknown as SupabaseClient;
}

describe("resolveSegment", () => {
  const entitlements = [
    row("active-plus", at(10)),
    row("active-pro", null, at(10)),
    row("lapsed", at(-3)),
    row("supporter-only", null, null),
  ];

  it("splits plus_active and plus_lapsed from the same rows", async () => {
    const admin = fakeAdmin({ entitlements });
    expect((await resolveSegment(admin, "plus_active", NOW)).userIds.sort()).toEqual(["active-plus", "active-pro"]);
    expect((await resolveSegment(admin, "plus_lapsed", NOW)).userIds).toEqual(["lapsed"]);
  });

  it("makes free every account without active Plus, including the lapsed and the supporters", async () => {
    const profiles = ["active-plus", "active-pro", "lapsed", "supporter-only", "brand-new"].map((id) => ({ id }));
    const r = await resolveSegment(fakeAdmin({ entitlements, profiles }), "free", NOW);
    expect(r.userIds.sort()).toEqual(["brand-new", "lapsed", "supporter-only"]);
    expect(r.errors).toEqual([]);
  });

  it("reads every page, not just the first thousand", async () => {
    const many = Array.from({ length: 2500 }, (_, i) => row(`u${i}`, at(1)));
    const r = await resolveSegment(fakeAdmin({ entitlements: many }), "plus_active", NOW);
    expect(r.userIds).toHaveLength(2500);
  });

  it("counts only PAID orders as customers, and keeps guest checkouts as addresses", async () => {
    const shop_orders = [
      { user_id: "buyer", email: "b@example.com", payment_status: "paid" },
      { user_id: "buyer", email: "b@example.com", payment_status: "paid" },
      { user_id: "browser", email: "c@example.com", payment_status: "cancelled" },
      { user_id: null, email: "Guest@Example.com", payment_status: "paid" },
    ];
    const r = await resolveSegment(fakeAdmin({ shop_orders }), "shop_customer", NOW);
    expect(r.userIds).toEqual(["buyer"]);
    expect(r.guestEmails).toEqual(["guest@example.com"]);
  });

  it("reports a failed read as an error, never as an empty segment that looks fine", async () => {
    const r = await resolveSegment(
      fakeAdmin({ eikon_drop_claims: new Error('relation "eikon_drop_claims" does not exist') }),
      "eikon_claimant",
      NOW,
    );
    expect(r.userIds).toEqual([]);
    expect(r.errors[0]).toContain("eikon_drop_claims");
  });
});
