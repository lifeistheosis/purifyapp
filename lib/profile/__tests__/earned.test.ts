import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { earnedBadges, lastFinishedLent, lentWindow } from "../earned";

type Row = Record<string, unknown>;

/** A service client over fixed rows that applies the filters a query names. */
function fakeAdmin(tables: Record<string, Row[]>): SupabaseClient {
  const from = (table: string) => {
    const tests: ((r: Row) => boolean)[] = [];
    let sortKey: string | null = null;
    let cap = Infinity;
    const q: Record<string, unknown> = {};
    q.select = () => q;
    q.eq = (c: string, v: unknown) => (tests.push((r) => r[c] === v), q);
    q.in = (c: string, vs: unknown[]) => (tests.push((r) => vs.includes(r[c])), q);
    q.is = (c: string, v: unknown) => (tests.push((r) => (r[c] ?? null) === v), q);
    q.gte = (c: string, v: string) => (tests.push((r) => String(r[c]) >= v), q);
    q.lt = (c: string, v: string) => (tests.push((r) => String(r[c]) < v), q);
    q.order = (c: string) => ((sortKey = c), q);
    q.limit = (n: number) => ((cap = n), q);
    q.then = (ok: (v: unknown) => unknown) => {
      let rows = (tables[table] ?? []).filter((r) => tests.every((t) => t(r)));
      if (sortKey) rows = [...rows].sort((a, b) => String(a[sortKey!]).localeCompare(String(b[sortKey!])));
      return Promise.resolve({ data: rows.slice(0, cap), error: null }).then(ok);
    };
    return q;
  };
  return { from } as unknown as SupabaseClient;
}

const ME = "reader-1";
const NOW = new Date("2026-10-02T00:00:00Z");

describe("earnedBadges", () => {
  it("reads each badge from what is on file, its date the same day in every time zone", async () => {
    const lent = Array.from({ length: 40 }, (_, i) => ({
      user_id: ME,
      rule_id: "morning",
      prayed_on: new Date(Date.UTC(2026, 1, 23 + i)).toISOString().slice(0, 10),
    }));
    const admin = fakeAdmin({
      prayer_completions: [
        ...lent,
        { user_id: ME, rule_id: "plan:psalter", prayed_on: "2026-07-01" },
        { user_id: "someone-else", rule_id: "plan:gospels", prayed_on: "2026-06-01" },
      ],
      community_posts: [
        { user_id: ME, kind: "scripture", status: "visible", group_id: null, created_at: "2026-09-10T18:00:00Z" },
      ],
    });
    const got = await earnedBadges(admin, ME, NOW);
    expect(got.map((b) => b.id)).toEqual(["psalter", "lent", "first_share"]);
    const psalter = got.find((b) => b.id === "psalter")!;
    // "2026-07-01" alone would be June 30 in Los Angeles and read "Since June".
    for (const timeZone of ["America/Los_Angeles", "Europe/Athens", "Asia/Tokyo"]) {
      const shown = new Intl.DateTimeFormat("en-US", { timeZone, month: "long", day: "numeric" }).format(new Date(psalter.since!));
      expect(shown, timeZone).toBe("July 1");
    }
  });

  it("gives no Lent badge for thirty-nine days, and nothing for a reader with nothing on file", async () => {
    const short = Array.from({ length: 39 }, (_, i) => ({
      user_id: ME,
      rule_id: "morning",
      prayed_on: new Date(Date.UTC(2026, 1, 23 + i)).toISOString().slice(0, 10),
    }));
    expect(await earnedBadges(fakeAdmin({ prayer_completions: short, community_posts: [] }), ME, NOW)).toEqual([]);
    expect(await earnedBadges(fakeAdmin({}), ME, NOW)).toEqual([]);
  });
});

describe("Great Lent", () => {
  it("runs forty days, Clean Monday to the Friday before Lazarus Saturday", () => {
    // Pascha 2026 is April 12: Clean Monday February 23, Lazarus Saturday April 4.
    expect(lentWindow(2026)).toEqual({ start: "2026-02-23", end: "2026-04-04" });
    const { start, end } = lentWindow(2027);
    const days = (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000;
    expect(days).toBe(40);
  });

  it("counts the latest Lent that has ended", () => {
    expect(lastFinishedLent(new Date("2026-10-02T00:00:00Z")).year).toBe(2026);
    expect(lastFinishedLent(new Date("2026-03-15T00:00:00Z")).year).toBe(2025);
  });
});
