import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { client, world, type Row, type World } from "@/lib/security/__tests__/fakeSupabase";

/**
 * The two notices of prayer campaigns (1.9, phase 4; lib/campaigns/notices.ts).
 *
 *   a moderator has read your campaign   to its creator, once;
 *   a campaign in your prayers has an    to each reader who carries it and
 *   update                               asked to be told, and to nobody else.
 *
 * What this file holds:
 *
 *   off until asked       nobody is told of an update unless they asked, on
 *                         that campaign (CONTRIBUTING.md, "Reminders and
 *                         streaks");
 *   names nobody          the update's row carries no title, no name and no
 *                         word of the update;
 *   never its writer      the creator is not told of their own update;
 *   never after leaving   a reader whose own last day has passed is not told;
 *   best effort           a notice that cannot be written never fails the
 *                         approval or the update that asked for it;
 *   OFF while the inbox   the switch is off, and stays off, until the inbox
 *   cannot say them       has words for a campaign's notice.
 *
 * What would go wrong if this broke: a reader told of a stranger's illness
 * on their screen without having asked; or a row the inbox reads out as
 * "Purify replied to your post", opening a post that is not there.
 */

// The writers are exercised as they will run once the switch is on. That it
// is off as shipped is held at the foot of this file, from the file itself.
vi.mock("@/lib/campaigns/noticesOn", () => ({ CAMPAIGN_NOTICES: true }));

import { approvalNoticeRow, readersToTell, tellCreatorItIsUp, tellOfApprovedNote, tellOfUpdate, updateNoticeRows, UPDATE_NOTICES_MAX } from "@/lib/campaigns/notices";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const ANNA = "11111111-1111-4111-8111-111111111111";
const BEN = "22222222-2222-4222-8222-222222222222";
const CARA = "33333333-3333-4333-8333-333333333333";
const DAN = "44444444-4444-4444-8444-444444444444";
const C1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const C2 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const THREAD = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";
const UPDATE = "dddddddd-dddd-4ddd-8ddd-ddddddddddd1";
const COMMENT = "dddddddd-dddd-4ddd-8ddd-ddddddddddd2";
const NOW = Date.UTC(2026, 10, 10, 12, 0);

let w: World;
/** The stand-in, as the service's own client. */
const db = () => client(w) as never;
const notices = () => w.tables.community_notifications as Row[];
const carries = (user: string, over: Row = {}) => (w.tables.prayer_campaign_prayers as Row[]).push({ campaign_id: C1, user_id: user, places: ["evening"], until_on: null, notify_updates: false, ...over });

beforeEach(() => {
  w = world();
  w.tables.community_notifications = [];
  w.tables.prayer_campaign_prayers = [];
  w.tables.community_posts = [{ id: THREAD, campaign_id: C1, status: "campaign" }];
  w.tables.community_post_replies = [
    { id: UPDATE, post_id: THREAD, user_id: ANNA, campaign_update: true, status: "visible" },
    { id: COMMENT, post_id: THREAD, user_id: BEN, campaign_update: false, status: "visible" },
  ];
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("a moderator has read your campaign", () => {
  it("is one row to its creator, from Purify, with its own title and nothing to open but their own campaigns", async () => {
    expect(await tellCreatorItIsUp(db(), { creator_id: ANNA, title: "Forty days for Nicholas" })).toBe(1);
    expect(notices()).toHaveLength(1);
    expect(notices()[0]).toMatchObject({ user_id: ANNA, kind: "approved", target_kind: "campaign", actor_name: "Purify", excerpt: "Forty days for Nicholas", post_id: null, reply_id: null });
  });

  it("keeps a long title to one line", () => {
    const row = approvalNoticeRow(ANNA, `For   Maria\n${"x".repeat(300)}`);
    expect(row.excerpt?.startsWith("For Maria x")).toBe(true);
    expect(row.excerpt?.length).toBeLessThanOrEqual(140);
    expect(approvalNoticeRow(ANNA, "   ").excerpt).toBeNull();
  });

  it("tells nobody when the campaign has no creator to tell", async () => {
    expect(await tellCreatorItIsUp(db(), { creator_id: null, title: "For Maria" })).toBe(0);
    expect(await tellCreatorItIsUp(db(), { title: "For Maria" })).toBe(0);
    expect(notices()).toEqual([]);
  });

  it("never fails the approval that asked for it", async () => {
    w.fail.insert = "community_notifications";
    await expect(tellCreatorItIsUp(db(), { creator_id: ANNA, title: "For Maria" })).resolves.toBe(0);
    expect(notices()).toEqual([]);
  });
});

describe("a campaign in your prayers has an update", () => {
  const update = { campaignId: C1, creatorId: ANNA, threadId: THREAD, replyId: UPDATE };

  it("tells nobody by default: carrying a campaign is not asking to be told", async () => {
    carries(BEN);
    carries(CARA);
    expect(await tellOfUpdate(db(), update, NOW)).toBe(0);
    expect(notices()).toEqual([]);
  });

  it("tells each reader who asked, on that campaign, and no one else", async () => {
    carries(BEN, { notify_updates: true });
    carries(CARA);
    carries(DAN, { notify_updates: true, campaign_id: C2 });
    expect(await tellOfUpdate(db(), update, NOW)).toBe(1);
    expect(notices().map((n) => n.user_id)).toEqual([BEN]);
  });

  it("says no title, no name and no word of the update: the row has only where it is", async () => {
    carries(BEN, { notify_updates: true });
    await tellOfUpdate(db(), update, NOW);
    // The row as it is written, whole: nothing in it but who is told, what kind it is, and where the update is.
    expect(updateNoticeRows([BEN], THREAD, UPDATE)).toEqual([{ user_id: BEN, kind: "reply", target_kind: "campaign", post_id: THREAD, reply_id: UPDATE, actor_name: "Purify", excerpt: null }]);
    // And as the table holds it: the same, with the table's own id and time.
    const kept = Object.fromEntries(Object.entries(notices()[0]).filter(([column]) => column !== "id" && column !== "created_at"));
    expect(kept).toEqual({ user_id: BEN, kind: "reply", target_kind: "campaign", post_id: THREAD, reply_id: UPDATE, actor_name: "Purify", excerpt: null });
  });

  it("never tells its creator of their own update, asked or not", async () => {
    carries(ANNA, { notify_updates: true });
    carries(BEN, { notify_updates: true });
    await tellOfUpdate(db(), update, NOW);
    expect(notices().map((n) => n.user_id)).toEqual([BEN]);
  });

  it("never tells a reader whose own last day has passed, and still tells one on the evening of theirs", async () => {
    carries(BEN, { notify_updates: true, until_on: "2026-11-08" });
    carries(CARA, { notify_updates: true, until_on: "2026-11-09" });
    carries(DAN, { notify_updates: true, until_on: "2026-11-20" });
    await tellOfUpdate(db(), update, NOW);
    expect(notices().map((n) => n.user_id).sort()).toEqual([CARA, DAN].sort());
    // The rule on its own: yesterday still counts, the day before does not.
    expect(readersToTell([{ user_id: BEN, until_on: "2026-11-09" }], ANNA, "2026-11-10")).toEqual([BEN]);
    expect(readersToTell([{ user_id: BEN, until_on: "2026-11-08" }], ANNA, "2026-11-10")).toEqual([]);
    expect(readersToTell([{ user_id: BEN, until_on: null }], ANNA, "2026-11-10")).toEqual([BEN]);
  });

  it("tells a reader once, whatever the rows say", () => {
    expect(readersToTell([{ user_id: BEN }, { user_id: BEN }, { user_id: 7 }, {}], ANNA, "2026-11-10")).toEqual([BEN]);
    expect(updateNoticeRows([BEN, BEN, CARA], THREAD, UPDATE).map((r) => r.user_id)).toEqual([BEN, CARA]);
  });

  it("reads the readers a thousand at a time, as the API hands them out, and tells every one of them", async () => {
    // One request is cut at 1,000 rows with no error (lib/supabase/pageAll.ts): 2,300 readers asked.
    const many = Array.from({ length: 2300 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
    for (const user of many) carries(user, { notify_updates: true });
    w.maxRows = 1000;
    expect(await tellOfUpdate(db(), update, NOW)).toBe(2300);
    expect(new Set(notices().map((n) => n.user_id)).size).toBe(2300);
    // And it stops at a bound, which is a stop and not a promise.
    expect(UPDATE_NOTICES_MAX).toBe(5000);
    expect(read("lib/campaigns/notices.ts")).toMatch(/\.order\("user_id"\)\s*\.range\(from, to\),\s*UPDATE_NOTICES_MAX,/);
  });

  it("never fails the update that asked for it", async () => {
    carries(BEN, { notify_updates: true });
    w.fail.insert = "community_notifications";
    await expect(tellOfUpdate(db(), update, NOW)).resolves.toBe(0);
    expect(notices()).toEqual([]);
    w.fail.insert = null;
    w.tables.prayer_campaign_prayers = null as never;
    await expect(tellOfUpdate(db(), update, NOW)).resolves.toBe(0);
  });
});

describe("a held note under a campaign, approved", () => {
  it("tells the readers who asked when it is an update", async () => {
    carries(BEN, { notify_updates: true });
    expect(await tellOfApprovedNote(db(), { replyId: UPDATE, threadId: THREAD, writerId: ANNA }, NOW)).toBe(1);
    expect(notices()[0]).toMatchObject({ user_id: BEN, kind: "reply", target_kind: "campaign", post_id: THREAD, reply_id: UPDATE, excerpt: null });
  });

  it("tells nobody when it is a comment", async () => {
    carries(CARA, { notify_updates: true });
    expect(await tellOfApprovedNote(db(), { replyId: COMMENT, threadId: THREAD, writerId: BEN }, NOW)).toBe(0);
    expect(notices()).toEqual([]);
  });

  it("tells nobody when the thread is no campaign's, or the note is gone", async () => {
    carries(BEN, { notify_updates: true });
    (w.tables.community_posts as Row[])[0].campaign_id = null;
    expect(await tellOfApprovedNote(db(), { replyId: UPDATE, threadId: THREAD, writerId: ANNA }, NOW)).toBe(0);
    expect(await tellOfApprovedNote(db(), { replyId: crypto.randomUUID(), threadId: THREAD, writerId: ANNA }, NOW)).toBe(0);
    expect(notices()).toEqual([]);
  });
});

describe("who calls them", () => {
  it("an approval tells its creator only at the first read of one that is put up", () => {
    const mod = read("lib/campaigns/moderation.ts");
    expect(mod).toContain('if (status === "active" && !hiddenByReports(c.held_reason)) await tellCreatorItIsUp(admin, c);');
  });

  it("an update tells readers only when it is shown at once; one that waits tells nobody until it is approved", () => {
    const thread = read("lib/campaigns/thread.ts");
    expect(thread).toMatch(/if \(input\.kind === "update" && !hold\) \{\s*await tellOfUpdate\(admin, \{ campaignId: campaign\.id, creatorId: campaign\.creator_id, threadId, replyId: id \}, now\);/);
    const community = read("lib/community/moderation.ts");
    expect(community).toContain("if (underCampaign) await tellOfApprovedNote(admin, { replyId: id, threadId: reply.post_id, writerId: reply.user_id });");
    // And a note under a campaign is still never told of as a reply to a post.
    expect(community).toContain("if (!underCampaign && reasons.some(HELD_AT_WRITE)) {");
  });
});

describe("in the app only", () => {
  it("never goes through the writer that also sends a push: a campaign has no words for a lock screen", () => {
    const code = read("lib/campaigns/notices.ts");
    const imports = code.split("\n").filter((line) => /^import /.test(line)).join("\n");
    expect(imports).not.toMatch(/community\/notify|community\/push|lib\/push/);
    expect(code).not.toMatch(/insertNotifications\(|broadcast\(/);
    // Straight into the inbox's own table, and nowhere else.
    expect(code.match(/\.from\("community_notifications"\)\.insert\(/g)).toHaveLength(1);
  });
});

describe("the switch", () => {
  const on = /export const CAMPAIGN_NOTICES: boolean = (true|false);/.exec(read("lib/campaigns/noticesOn.ts"))?.[1];

  it("is one constant, read by every writer before anything is asked of the database", () => {
    expect(on === "true" || on === "false").toBe(true);
    const code = read("lib/campaigns/notices.ts");
    for (const fn of ["tellCreatorItIsUp", "tellOfUpdate", "tellOfApprovedNote"]) {
      const body = new RegExp(`export async function ${fn}\\([\\s\\S]*?\\n\\}`).exec(code)?.[0] ?? "";
      expect(body, fn).toMatch(/\{\n  if \(!CAMPAIGN_NOTICES\) return 0;/);
    }
  });

  it("is off until the inbox has words for a campaign's notice: on with the inbox as it is, both would be misnamed", () => {
    const inbox = read("components/community/NotificationsInbox.tsx");
    const saysCampaign = /target_kind === "campaign"/.test(inbox);
    // While the inbox draws a row by its kind alone, the switch must be off.
    if (!saysCampaign) expect(on).toBe("false");
  });
});
