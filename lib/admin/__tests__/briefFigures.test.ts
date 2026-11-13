import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/weeklyLetter", () => ({
  readWaiting: async () => ({ messages: 2, refunds: 0, toPost: 1 }),
  readWeek: async () => null,
}));

import { openedTitle, readBriefFigures, saleLines, topOpened } from "../briefFigures";
import { spanFor } from "../ownerBrief";
import { plannerEvidence } from "../plannerEvidence";
import { fakeDb } from "./fakeDb";

/**
 * The brief's reads (lib/admin/briefFigures.ts): each stands alone, says "not
 * read" or "not kept yet" rather than 0, and never asks for a reader's name,
 * handle or address. Every figure here is made up.
 */

const TUESDAY = new Date("2026-11-17T12:30:00Z");
const ABSENT = { code: "PGRST205", message: "Could not find the table 'public.x' in the schema cache" };

describe("what readers opened", () => {
  it("names a saint, a chapter and a prayer by their titles, and nothing else", () => {
    expect(openedTitle("/saints/xenia-of-petersburg")).toEqual({ group: "saints", label: "St. Xenia of St. Petersburg" });
    expect(openedTitle("/bible/john/1/")).toEqual({ group: "chapters", label: "John 1" });
    expect(openedTitle("/prayers/morning?x=1")).toMatchObject({ group: "prayers" });
    expect(openedTitle("/saints/no-such-saint")).toBeNull();
    expect(openedTitle("/shop")).toBeNull();
    expect(openedTitle("/saints/xenia-of-petersburg/web")).toBeNull();
  });

  it("counts a reader once a page, however many times it was opened or pinged", () => {
    const rows = [
      ...Array.from({ length: 5 }, () => ({ session_id: "s1", path: "/bible/john/1" })),
      { session_id: "s2", path: "/bible/john/1/" },
      { session_id: "s3", path: "/bible/genesis/1" },
      { session_id: "s1", path: "/saints/xenia-of-petersburg" },
    ];
    const top = topOpened(rows);
    expect(top.chapters).toEqual([
      { label: "John 1", count: 2 },
      { label: "Genesis 1", count: 1 },
    ]);
    expect(top.saints).toEqual([{ label: "St. Xenia of St. Petersburg", count: 1 }]);
  });
});

describe("a sale, in words", () => {
  it("says which offer began or ended, and when", () => {
    expect(
      saleLines({ setDiscount: { enabled: false, percent: 10 } }, { setDiscount: { enabled: true, percent: 10 } }, "2026-11-16T15:00:00Z"),
    ).toEqual(["The set discount (10% off) began on Monday."]);
    expect(saleLines({ cartDeal: { enabled: true } }, { cartDeal: { enabled: false } }, "2026-11-16T15:00:00Z")).toEqual([
      "The cart deal ended on Monday.",
    ]);
    expect(saleLines({ multiBuy: { enabled: true } }, { multiBuy: { enabled: true } }, "2026-11-16T15:00:00Z")).toEqual([]);
  });
});

describe("the reads", () => {
  function db() {
    return fakeDb(
      {
        shop_orders: () => ({
          data: [
            { id: "o1", email: "buyer@example.org", total_cents: 4500, payment_status: "paid", created_at: "2026-11-16T09:00:00Z", paid_at: "2026-11-16T09:01:00Z" },
            { id: "o2", email: "buyer2@example.org", total_cents: 2000, payment_status: "paid", created_at: "2026-11-09T09:00:00Z", paid_at: "2026-11-09T09:02:00Z" },
          ],
        }),
        shop_refund_requests: () => ({ data: [] }),
        plus_events: () => ({ error: ABSENT }),
        analytics_pageviews: () => ({
          data: [
            { session_id: "a", path: "/bible/john/1", ts: "2026-11-16T10:00:00Z" },
            { session_id: "b", path: "/bible/john/1", ts: "2026-11-16T11:00:00Z" },
            { session_id: "c", path: "/saints/xenia-of-petersburg", ts: "2026-11-16T12:00:00Z" },
          ],
        }),
        community_post_replies: () => ({
          data: [
            { id: "r1", post_id: "p1", status: "visible", created_at: "2026-11-16T10:00:00Z" },
            { id: "r2", post_id: "p1", status: "visible", created_at: "2026-11-16T11:00:00Z" },
            { id: "r3", post_id: "p2", status: "visible", created_at: "2026-11-16T12:00:00Z" },
            { id: "r4", post_id: "p3", status: "visible", created_at: "2026-11-16T12:00:00Z" },
          ],
        }),
        community_posts: (call) =>
          call.filters.some((f) => f.column === "category")
            ? { data: [{ id: "q1", title: "Must I fast before Vespers?", status: "visible", group_id: null, reply_count: 0, category: "question", created_at: "2026-11-16T08:00:00Z" }] }
            : {
                data: [
                  { id: "p1", title: "On the Nativity Fast", status: "visible", group_id: null },
                  { id: "p2", title: "email me at mary@example.org", status: "visible", group_id: null },
                  { id: "p3", title: "Our parish group's plans", status: "visible", group_id: "g1" },
                ],
              },
        search_misses: () => ({ error: ABSENT }),
        app_errors: () => ({ error: { code: "57014", message: "statement timeout" } }),
        patch_notes: () => ({ data: [{ version: "1.9", title: "Campaigns", published_at: "2026-11-16T14:00:00Z", status: "published" }] }),
        eikon_drops: () => ({ data: [] }),
        admin_activity_log: () => ({ data: [] }),
      },
      {
        analytics_daily_buckets: () => ({
          data: Array.from({ length: 8 }, (_, i) => ({
            day: new Date(Date.parse("2026-11-09T00:00:00Z") + i * 86_400_000).toISOString().slice(0, 10),
            visitors: String(100 + i),
            views: 700,
            signups: i === 7 ? 5 : 3,
          })),
        }),
      },
    );
  }

  it("read yesterday against the same day last week, each read on its own", async () => {
    const d = db();
    const f = await readBriefFigures(d as never, spanFor(TUESDAY, false));
    expect(f.readers).toMatchObject({ visitors: { now: 107, before: 100 }, signups: { now: 5, before: 3 } });
    expect(f.money).toMatchObject({ total: { shop: 4500 }, prior: { shop: 2000 }, orders: { now: 1, before: 1 }, subs: "not kept yet", priorKept: false });
    expect(f.opened).toMatchObject({ chapters: [{ label: "John 1", count: 2 }], saints: [{ label: "St. Xenia of St. Petersburg", count: 1 }] });
    expect(f.context.map((c) => c.line)).toEqual(["Purify 1.9 was published on Monday: Campaigns."]);
    expect(f.waiting).toEqual({ messages: 2, refunds: 0, toPost: 1 });
  });

  it("say not kept yet for a table this database does not have, and not read for one that failed, never 0", async () => {
    const f = await readBriefFigures(db() as never, spanFor(TUESDAY, false));
    expect(f.plus).toBe("not kept yet");
    expect(f.misses).toBe("not kept yet");
    expect(f.errors).toBe("not read");
  });

  it("show only public threads, and drop a title that holds an address", async () => {
    const f = await readBriefFigures(db() as never, spanFor(TUESDAY, false));
    expect(f.community).toEqual({
      replies: 4,
      answered: [{ label: "On the Nativity Fast", count: 2 }],
      questions: { count: 1, unanswered: 1, top: [{ label: "Must I fast before Vespers?", count: 0 }] },
    });
  });

  it("never ask for a reader's name, handle, account or address where readers' words are read", async () => {
    const d = db();
    await readBriefFigures(d as never, spanFor(TUESDAY, false));
    const readerTables = new Set(["community_posts", "community_post_replies", "analytics_pageviews", "search_misses", "app_errors"]);
    const asked = d.calls.filter((c) => readerTables.has(c.table)).map((c) => `${c.table}: ${c.columns}`);
    expect(asked.length).toBeGreaterThanOrEqual(5);
    for (const a of asked) expect(a).not.toMatch(/author|user_id|email|handle|name/);
  });
});

describe("the monthly note on the board", () => {
  it("ticks the month it was sent in, though it carries the month it is about", async () => {
    // Sent on 1 December, about November: it is December's task that is done.
    const d = fakeDb({
      board_messages: () => ({ data: [] }),
      email_campaigns: () => ({ data: [{ kind: "monthly", period_key: "2026-11", created_at: "2026-12-01T17:00:00Z" }] }),
      eikon_drops: () => ({ data: [] }),
    });
    const done = await plannerEvidence(d as never, { from: "2026-11-01", to: "2026-12-01" });
    expect(done.has("email-monthly:2026-12")).toBe(true);
    expect(done.has("email-monthly:2026-11")).toBe(false);
  });
});
