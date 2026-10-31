import { describe, expect, it } from "vitest";

import {
  UNDO_MS,
  buildQueue,
  campaignKey,
  countWaiting,
  holdKey,
  recipeKey,
  recipeNewKey,
  reportKey,
  secondsLeft,
  tallyReasons,
  waitingKeys,
  type HoldIn,
  type QueueSources,
  type ReportIn,
} from "../communityQueue";

/**
 * Community, his pick A on r3-17 (2026-10-30): one queue, one row per thing,
 * oldest first, the buttons on the row, ten seconds of Undo before a removal
 * is written. Every reader, post and word below is made up.
 */

const POST = "11111111-1111-4111-8111-111111111111";
const REPLY = "22222222-2222-4222-8222-222222222222";

const post = { id: POST, kind: "discussion", title: null, body: "A post readers flagged.", quote_text: null, quote_source: null, author_name: "Reader B", status: "visible" };

const report = (id: string, at: string, reason: string | null, over: Partial<ReportIn> = {}): ReportIn => ({
  id,
  post_id: POST,
  reply_id: null,
  reason,
  created_at: at,
  post,
  reply: null,
  ...over,
});

const hold = (over: Partial<HoldIn> = {}): HoldIn => ({
  id: "h1",
  post_id: null,
  reply_id: REPLY,
  reason: "words",
  detail: null,
  original_title: null,
  original_body: "The reply as its writer wrote it, with the word in full.",
  created_at: "2026-10-30T16:00:00Z",
  post: null,
  reply: { id: REPLY, post_id: POST, body: "The reply as readers see it now, masked ••••.", author_name: "Reader A", author_handle: "reader_a", status: "visible" },
  ...over,
});

const EMPTY: QueueSources = { holds: [], reports: [], pendingRecipes: [], campaignReports: [], recipeReports: [], reviewReports: [] };

describe("one row per thing", () => {
  it("makes three reports on one post a single row, with the reasons tallied", () => {
    const rows = buildQueue({
      ...EMPTY,
      reports: [
        report("r1", "2026-10-29T10:00:00Z", "Off topic"),
        report("r2", "2026-10-29T11:00:00Z", "Rude"),
        report("r3", "2026-10-29T09:00:00Z", "Off topic"),
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].what).toBe("Reported · 3 reports · a post in Discussion");
    expect(rows[0].reasons).toBe("Off topic 2 · Rude");
    expect(rows[0].at).toBe("2026-10-29T09:00:00Z");
    // Keep it up dismisses every report (kept as dismissed); Remove is held for Undo.
    const keep = rows[0].actions.find((a) => a.id === "keep-up")!;
    expect(keep.removal).toBe(false);
    expect(keep.calls.map((c) => c.body)).toEqual([
      { action: "dismiss_community_report", id: "r1" },
      { action: "dismiss_community_report", id: "r2" },
      { action: "dismiss_community_report", id: "r3" },
    ]);
    const remove = rows[0].actions.find((a) => a.id === "remove")!;
    expect(remove).toMatchObject({ label: "Remove post", tone: "danger", removal: true });
    expect(remove.calls).toEqual([{ url: "/api/admin/community", body: { action: "remove_community_post", id: POST, reason: "Off topic" } }]);
  });

  it("folds a post the reports hid and its reports into the hold's one row", () => {
    const rows = buildQueue({
      ...EMPTY,
      holds: [
        hold({
          id: "h2",
          post_id: POST,
          reply_id: null,
          reason: "reports",
          original_body: null,
          reply: null,
          post: { id: POST, kind: "discussion", title: null, body: "Hidden by reports.", author_name: "Reader B", author_handle: "reader_b", status: "held" },
        }),
      ],
      reports: [report("r1", "2026-10-29T10:00:00Z", "Spam"), report("r2", "2026-10-29T12:00:00Z", "Spam")],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].what).toBe("Held · hidden by reports · 2 reports · a post in Discussion");
    expect(rows[0].note).toBe("Hidden from readers until you decide.");
    expect(rows[0].actions.map((a) => [a.id, a.label, a.removal])).toEqual([
      ["remove", "Remove", true],
      ["approve", "Approve and show", false],
    ]);
  });

  it("offers the word filter's three choices on a masked reply, and shows what was written", () => {
    const [row] = buildQueue({ ...EMPTY, holds: [hold()] });
    expect(row.what).toBe("Held for review · masked words · a reply");
    expect(row.who).toEqual({ name: "Reader A", handle: "reader_a" });
    expect(row.text).toContain("masked");
    expect(row.written).toContain("in full");
    expect(row.actions.map((a) => a.label)).toEqual(["Remove", "Keep hidden", "Approve as written"]);
    expect(row.actions.find((a) => a.id === "approve")!.calls).toEqual([
      { url: "/api/admin/community/filter", body: { action: "approve_hold", id: "h1" } },
    ]);
  });

  it("keeps a recipe sent in, a reported recipe, a review and a campaign as rows of their own, oldest first", () => {
    const rows = buildQueue({
      ...EMPTY,
      pendingRecipes: [
        { id: "rec-new", title: "Lenten lentil soup", fast_level: "Strict fast", season: "any", tradition: "any", summary: null, ingredients: "Lentils", steps: "Simmer", created_at: "2026-10-28T08:00:00Z" },
      ],
      recipeReports: [
        { id: "rr1", reason: "Not Lenten", created_at: "2026-10-27T08:00:00Z", recipe: { id: "rec-1", title: "Fish stew", status: "published" } },
        { id: "rr2", reason: "Not Lenten", created_at: "2026-10-27T09:00:00Z", recipe: { id: "rec-1", title: "Fish stew", status: "published" } },
      ],
      reviewReports: [
        { id: "vr1", reason: "Rude", created_at: "2026-10-30T08:00:00Z", review: { id: "rev-1", stars: 1, body: "SAMPLE words", photo_urls: null, author_name: "Reader D", status: "published" }, recipe: { id: "rec-1", title: "Fish stew" } },
      ],
      campaignReports: [
        { id: "cr1", reason: "Not a prayer", created_at: "2026-10-26T08:00:00Z", campaign: { id: "camp-1", title: "A campaign", status: "active", intention: "For peace", subject_name: null } },
      ],
    });
    expect(rows.map((r) => r.key)).toEqual(["campaign:camp-1", "recipe:rec-1", "recipe-new:rec-new", "review:rev-1"]);
    expect(rows[1].what).toBe("Reported · 2 reports · a recipe");
    expect(rows[1].actions.find((a) => a.id === "dismiss")!.calls).toHaveLength(2);
    expect(rows[2].actions.map((a) => a.label)).toEqual(["Remove", "Publish"]);
    expect(rows[2].note).toBe("Strict fast");
    for (const r of rows) {
      const dismiss = r.actions.find((a) => a.id === "dismiss");
      if (dismiss) expect(dismiss.done).toContain("record");
    }
  });

  it("offers only Dismiss on something already removed", () => {
    const [row] = buildQueue({
      ...EMPTY,
      reports: [report("r1", "2026-10-29T10:00:00Z", "Rude", { post: { ...post, status: "removed" } })],
    });
    expect(row.what).toContain("already removed");
    expect(row.actions.map((a) => a.id)).toEqual(["dismiss"]);
  });

  it("groups the reports on one profile by its handle, and holds its clearing for Undo", () => {
    const profile = { handle: "reader_e", name: "Reader E", bio: "SAMPLE bio", status: null, banner_url: null };
    const rows = buildQueue({
      ...EMPTY,
      reports: [
        report("p1", "2026-10-29T10:00:00Z", "Rude", { post_id: null, post: null, is_profile: true, profile }),
        report("p2", "2026-10-29T11:00:00Z", "Rude", { post_id: null, post: null, is_profile: true, profile }),
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].what).toBe("Reported · 2 reports · a profile");
    expect(rows[0].actions.filter((a) => a.removal).map((a) => a.label)).toEqual(["Reset handle", "Clear profile"]);
  });
});

describe("the count on the rail", () => {
  it("is the number of rows, whatever number of holds and reports name them", () => {
    const src: QueueSources = {
      ...EMPTY,
      holds: [hold({ id: "h9", post_id: POST, reply_id: null, reason: "reports" })],
      reports: [report("r1", "2026-10-29T10:00:00Z", "Spam"), report("r2", "2026-10-29T10:30:00Z", "Spam")],
      pendingRecipes: [{ id: "rec-new", title: "Soup", fast_level: "Strict fast", season: "any", tradition: "any", summary: null, ingredients: "", steps: "", created_at: "2026-10-28T08:00:00Z" }],
    };
    expect(waitingKeys(src)).toHaveLength(2);
    // The counts-only read keys the same rows from ids alone.
    expect(
      countWaiting([
        holdKey({ id: "h9", post_id: POST, reply_id: null }),
        reportKey({ id: "r1", post_id: POST, reply_id: null }),
        reportKey({ id: "r2", post_id: POST, reply_id: null }),
        recipeNewKey("rec-new"),
      ]),
    ).toBe(2);
  });

  it("falls back to the report when the thing it named is gone", () => {
    expect(recipeKey(null, "rr9")).toBe("recipe-report:rr9");
    expect(campaignKey(undefined, "cr9")).toBe("campaign-report:cr9");
  });
});

describe("ten seconds of Undo", () => {
  it("counts down whole seconds and never below zero", () => {
    expect(UNDO_MS).toBe(10_000);
    const start = 1_000_000;
    expect(secondsLeft(start + UNDO_MS, start)).toBe(10);
    expect(secondsLeft(start + UNDO_MS, start + 1_500)).toBe(9);
    expect(secondsLeft(start + UNDO_MS, start + 20_000)).toBe(0);
  });

  it("tallies reasons once each, most given first", () => {
    expect(tallyReasons(["Rude", null, "Spam", "Rude", "  "])).toBe("Rude 2 · Spam");
    expect(tallyReasons([null])).toBeNull();
  });
});
