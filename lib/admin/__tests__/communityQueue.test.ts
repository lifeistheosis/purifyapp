import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  UNDO_MS,
  besideDanger,
  buildQueue,
  careAction,
  campaignKey,
  countWaiting,
  holdKey,
  recipeKey,
  recipeNewKey,
  reportKey,
  secondsLeft,
  tallyReasons,
  waitingKeys,
  withReason,
  type HoldIn,
  type QueueRow,
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

/**
 * A campaign's pictures ("After 1.9: the panel", item 1, moved into 1.9 with
 * pictures, at the arbiter's word of 2026-11-10): one row a picture, its
 * reports folded in, cleared or taken down by the campaigns chat's two
 * decisions (lib/campaigns/pictures.ts), the second held back with Undo.
 * Every campaign, picture and reader below is made up.
 */
describe("a campaign's pictures that wait", () => {
  const PIC = "33333333-3333-4333-8333-333333333333";
  const picture = (over: Partial<NonNullable<QueueSources["waitingPictures"]>[number]> = {}) => ({
    id: PIC,
    url: "https://example.test/held/picture.jpg?token=short-lived",
    shown: false,
    alt: "Our parish's icon corner",
    check_result: "clear",
    created_at: "2026-11-10T10:00:00Z",
    reports: [] as { reason_code: string | null; reason: string | null }[],
    campaign: { id: "44444444-4444-4444-8444-444444444444", title: "For Maria's recovery", creator_name: "Reader C" },
    ...over,
  });

  it("shows none while pictures are off (the source is absent)", () => {
    expect(buildQueue(EMPTY)).toEqual([]);
  });

  it("gives a new picture one row, with its campaign, its words and the picture itself", () => {
    const [row] = buildQueue({ ...EMPTY, waitingPictures: [picture()] });
    expect(row.key).toBe(`picture:${PIC}`);
    expect(row.what).toBe("New picture · a picture waiting to be cleared");
    expect(row.text).toBe('On the campaign "For Maria\'s recovery"');
    expect(row.note).toBe("Its creator says it shows: Our parish's icon corner");
    expect(row.picture).toBe("https://example.test/held/picture.jpg?token=short-lived");
    expect(row.who).toEqual({ name: "Reader C", handle: null });
    expect(row.actions.map((a) => a.label)).toEqual(["Clear it", "Take it down"]);
  });

  it("clears with approve_picture, and takes down with remove_picture held back for Undo, carrying the reason readers gave most", () => {
    const [row] = buildQueue({
      ...EMPTY,
      waitingPictures: [picture({ reports: [{ reason_code: "about_me", reason: null }, { reason_code: "about_me", reason: null }, { reason_code: "other", reason: null }] })],
    });
    const [clear, down] = row.actions;
    expect(clear.calls).toEqual([{ url: "/api/admin/community", body: { action: "approve_picture", id: PIC } }]);
    expect(clear.removal).toBe(false);
    expect(down.removal).toBe(true);
    expect(down.tone).toBe("danger");
    expect(down.calls[0].body).toEqual({ action: "remove_picture", id: PIC, reason: "shows the reporter or someone in their care, without agreement" });
    expect(row.what).toBe("Hidden by reports · 3 reports · a picture waiting to be cleared");
    expect(row.reasons).toBe("shows the reporter or someone in their care, without agreement 2 · something else");
  });

  it("says when a reported picture is still shown, and offers to keep it", () => {
    const [row] = buildQueue({ ...EMPTY, waitingPictures: [picture({ shown: true, reports: [{ reason_code: null, reason: "Not a photo of the person" }] })] });
    expect(row.what).toBe("Reported · 1 report · a picture readers can see");
    expect(row.actions[0].label).toBe("Keep it");
    expect(row.reasons).toBe("Not a photo of the person");
  });

  it("names what the check said, when it said anything but clear", () => {
    const [row] = buildQueue({ ...EMPTY, waitingPictures: [picture({ alt: null, check_result: "possible face of a child" })] });
    expect(row.note).toBe("The check said: possible face of a child");
  });

  it("counts each picture once on the rail, beside its campaign's own row", () => {
    const keys = waitingKeys({ ...EMPTY, waitingPictures: [picture(), picture({ id: "55555555-5555-4555-8555-555555555555" })] });
    expect(countWaiting(keys)).toBe(2);
  });
});

describe("the route reads pictures only while they are on", () => {
  const route = readFileSync(join(process.cwd(), "app/api/admin/community/route.ts"), "utf8");

  it("asks for campaigns and the pictures part both, and reads nothing otherwise", () => {
    expect(route).toContain('return campaignsInBuild() && campaignPart("pictures");');
    expect(route).toContain("if (!picturesOn()) return { rows: [], error: null };");
    expect(route).toContain("...(picturesOn() ? { waitingPictures: waitingPictures.rows } : {}),");
  });

  it("counts them on the rail with the queue's own key, and takes their two decisions", () => {
    expect(route).toContain("...waitingPictures.rows.map((p) => pictureKey(p.id)),");
    expect(route).toMatch(/"approve_picture",\s*\n\s*"remove_picture",/);
  });
});

describe("a removal that tells its poster asks why first (the Terms, \"What we may remove\")", () => {
  it("puts the moderator's reason on every call of a removal that tells, and leaves the rest alone", () => {
    const tells = { id: "remove", label: "Remove", tone: "danger" as const, removal: true, notifies: true, calls: [{ url: "/x", body: { action: "remove_community_post", id: "a" } }, { url: "/x", body: { action: "dismiss", id: "b" } }], done: "Removed." };
    const quiet = { ...tells, notifies: undefined };
    expect(withReason(tells, "spam").calls.map((c) => c.body.reason_code)).toEqual(["spam", "spam"]);
    expect(withReason(quiet, "spam")).toBe(quiet);
  });

  it("marks the removals of a post, a reply, a held one, a campaign, a picture and a shared page", () => {
    const src = readFileSync(join(process.cwd(), "lib/admin/communityQueue.ts"), "utf8");
    expect(src.match(/notifies: true/g)?.length).toBe(6);
  });
});

describe("words that may mean their writer is in danger (the safety line; the moderators' rule, 2026-11-10)", () => {
  const marked = hold({ id: "h9", reason: "spam", detail: "crisis: the writer may be in danger", original_body: null, created_at: "2026-11-10T22:00:00Z" });
  const older = hold({ id: "h2", reply_id: "33333333-3333-4333-8333-333333333333", reason: "spam", detail: "a short link", created_at: "2026-11-01T09:00:00Z", reply: { id: "33333333-3333-4333-8333-333333333333", post_id: POST, body: "Look here.", author_name: "Reader C", author_handle: "reader_c", status: "held" } });

  it("is read first, says so, and never shows the reason the table files it under", () => {
    const rows = buildQueue({ ...EMPTY, holds: [older, marked] });
    expect(rows[0].key).toBe(holdKey(marked));
    expect(rows[0].what.startsWith("Read first: the writer may be in danger")).toBe(true);
    expect(rows[0].what).not.toMatch(/spam/i);
    expect(rows[0].first).toBe(true);
    expect(rows[0].note ?? "").not.toMatch(/crisis/);
    expect(rows[0].note).toContain("never as against the house rules");
  });

  it("asks for a real reason before its removal, and only its removal", () => {
    const row = buildQueue({ ...EMPTY, holds: [marked] })[0];
    const remove = row.actions.find((a) => a.id === "remove");
    expect(remove?.needsReason).toBe(true);
    expect(row.actions.filter((a) => a.id !== "remove").every((a) => !a.needsReason)).toBe(true);
  });

  it("keeps what else held it, without the mark", () => {
    const both = hold({ id: "h3", reason: "new_account", detail: "crisis; first words from a new account" });
    const row = buildQueue({ ...EMPTY, holds: [both] })[0];
    expect(row.note).toContain("first words from a new account");
    expect(row.note ?? "").not.toMatch(/crisis/);
    expect(besideDanger("crisis: the writer may be in danger")).toBeNull();
    expect(besideDanger("crisis; first words from a new account")).toBe("first words from a new account");
    expect(besideDanger(null)).toBeNull();
  });

  it("leaves an ordinary hold as it was", () => {
    const row = buildQueue({ ...EMPTY, holds: [older] })[0];
    expect(row.what).toBe("Held · spam · a reply");
    expect(row.first).toBeFalsy();
    expect(row.actions.some((a) => a.needsReason)).toBe(false);
  });

  it("holds a campaign whose writer may be in danger to the same rule on its removal", () => {
    const campaign = (id: string, held_reason: string) => ({
      id,
      title: "For my brother",
      intention: "healing",
      for_whom: "living",
      subject_name: null,
      details: null,
      days: 7,
      ends_on: null,
      creator_name: "Reader D",
      creator_handle: "reader_d",
      held_reason,
      created_at: "2026-11-10T21:00:00Z",
    });
    const rows = buildQueue({ ...EMPTY, waitingCampaigns: [campaign("c1", "new"), campaign("c2", "new; crisis")] });
    const urgent = rows.find((r) => r.key === campaignKey("c2", "c2"));
    const plain = rows.find((r) => r.key === campaignKey("c1", "c1"));
    expect(urgent?.actions.find((a) => a.id === "remove")?.needsReason).toBe(true);
    expect(plain?.actions.find((a) => a.id === "remove")?.needsReason).toBeFalsy();
  });

  it("the panel offers no reason in advance and not the house rules, and waits for one", () => {
    const queue = readFileSync(join(process.cwd(), "components/admin/community/Queue.tsx"), "utf8");
    expect(queue).toContain("useState<RemovalReason | null>(strict ? null : DEFAULT_REMOVAL_REASON)");
    expect(queue).toContain("REASON_OPTIONS.filter((o) => o.value !== DEFAULT_REMOVAL_REASON)");
    expect(queue).toContain("disabled={Boolean(a.needsReason && !why)}");
  });
});

describe("a waiting campaign's place (2026-11-11)", () => {
  const waiting = (over: Record<string, unknown>) => ({
    id: "c9",
    title: "For my brother",
    intention: "healing",
    for_whom: "living",
    subject_name: "Marko",
    details: null,
    days: 7,
    ends_on: null,
    creator_name: "Reader E",
    creator_handle: "reader_e",
    held_reason: "new",
    created_at: "2026-11-11T00:00:00Z",
    ...over,
  });

  it("is on the row, as readers will see it once it is up", () => {
    const row = buildQueue({ ...EMPTY, waitingCampaigns: [waiting({ place_country: "RS", place_name: "Novi Sad" })] })[0];
    expect(row.note).toContain("Place: ");
    expect(row.note).toContain("Novi Sad");
    expect(row.note).toContain("Serbia");
    expect(row.note!.indexOf("For Marko")).toBeLessThan(row.note!.indexOf("Place: "));
  });

  it("says the country alone, or nothing", () => {
    expect(buildQueue({ ...EMPTY, waitingCampaigns: [waiting({ place_country: "GR", place_name: null })] })[0].note).toContain("Place: Greece");
    expect(buildQueue({ ...EMPTY, waitingCampaigns: [waiting({})] })[0].note ?? "").not.toContain("Place:");
  });
});

describe("the care note, beside the decision (call 26, his yes of 2026-11-11)", () => {
  // A comment on a campaign the safety line marked: held on its reply, as lib/campaigns/thread.ts holds it.
  const marked = hold({ id: "44444444-4444-4444-8444-444444444444", reason: "spam", detail: "crisis: the writer may be in danger", original_body: null });
  const campaign = (id: string, held_reason: string) => ({
    id,
    title: "For my brother",
    intention: "healing",
    for_whom: "living",
    subject_name: null,
    details: null,
    days: 7,
    ends_on: null,
    creator_name: "Reader D",
    creator_handle: "reader_d",
    held_reason,
    created_at: "2026-11-10T21:00:00Z",
  });
  const care = (row: QueueRow | undefined) => row?.actions.find((a) => a.id === "care");

  it("stands on a marked comment while the route says it can be sent, and sends the campaigns' own action for its hold", () => {
    const row = buildQueue({ ...EMPTY, holds: [marked], care: true })[0];
    const action = care(row);
    expect(action).toEqual(careAction("hold", marked.id));
    expect(action).toMatchObject({ label: "Send the care note", note: true, removal: false, done: "Care note sent." });
    expect(row.actions.find((a) => a.id === "care")?.calls).toEqual([{ url: "/api/admin/community", body: { action: "care_note_for_hold", id: marked.id } }]);
    // It asks first, in the moderators' page's own words.
    expect(row.actions.find((a) => a.id === "care")?.asks).toBe("A short private note from Purify goes to this writer's inbox, with where to find help. It quotes nothing they wrote.");
  });

  it("stands on a waiting campaign the line marked, and on no other", () => {
    const rows = buildQueue({ ...EMPTY, waitingCampaigns: [campaign("c1", "new"), campaign("c2", "new; crisis")], care: true });
    expect(care(rows.find((r) => r.key === campaignKey("c2", "c2")))?.calls).toEqual([{ url: "/api/admin/community", body: { action: "care_note_for_campaign", id: "c2" } }]);
    expect(care(rows.find((r) => r.key === campaignKey("c1", "c1")))).toBeUndefined();
  });

  it("is drawn by the route's answer alone: nothing while it says nothing", () => {
    expect(care(buildQueue({ ...EMPTY, holds: [marked] })[0])).toBeUndefined();
    expect(care(buildQueue({ ...EMPTY, waitingCampaigns: [campaign("c2", "crisis")] })[0])).toBeUndefined();
  });

  it("never stands on words the line did not mark, nor on a held post, which its sender does not read", () => {
    expect(care(buildQueue({ ...EMPTY, holds: [hold({ reason: "spam", detail: "a short link" })], care: true })[0])).toBeUndefined();
    const onPost = hold({ reason: "spam", detail: "crisis: the writer may be in danger", post_id: POST, reply_id: null, reply: null, post: { id: POST, title: null, body: "A post.", author_name: "Reader B", author_handle: null, status: "held" } });
    expect(care(buildQueue({ ...EMPTY, holds: [onPost], care: true })[0])).toBeUndefined();
  });

  it("is not a decision: the panel keeps the row to be decided once the note is sent, and asks before it goes", () => {
    const tab = readFileSync(join(process.cwd(), "components/admin/tabs/CommunityTab.tsx"), "utf8");
    expect(tab).toContain("else if (action.note) setNoted((n) => ({ ...n, [row.key]: action.done }));");
    expect(tab).toContain("care: community.care === true,");
    const queue = readFileSync(join(process.cwd(), "components/admin/community/Queue.tsx"), "utf8");
    expect(queue).toContain("onClick={() => setAsking(a.id)}");
    expect(queue).toContain('row.actions.filter((a) => a.tone !== "primary" && !a.note)');
  });
});
