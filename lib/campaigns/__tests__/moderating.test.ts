import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { client, world, type Row, type World } from "@/lib/security/__tests__/fakeSupabase";

/**
 * Prayer campaigns in the moderators' queue (app/api/community/moderation),
 * in the team's one queue (lib/admin/communityQueue.ts), and kept only as
 * long as was said (lib/campaigns/upkeep.ts), run against an in-memory
 * Supabase.
 *
 * What would go wrong if these broke: a campaign nobody can approve, so none
 * is ever public; a moderator shown campaigns that are not open for them, or
 * one whose words may mean its writer is in danger left at the foot of the
 * queue; an admin's account moderating a campaign before its session has
 * passed the sign-in code; the same campaign twice in the team's queue; a
 * sick person's name kept on the servers past the thirty days that were
 * promised, or a campaign of July's deleted with its picture left behind.
 */

const state = vi.hoisted(() => ({
  admin: null as unknown,
  user: null as null | { id: string; email: string; created_at: string; user_metadata: Record<string, unknown> },
  admins: new Set<string>(),
  /** What the sign-in code check says of the account that asks. */
  standing: "reader" as "reader" | "admin" | "held",
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => state.admin }));
vi.mock("@/lib/supabase/server", () => ({
  createClientFromRequest: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }), getSession: async () => ({ data: { session: null } }) },
  }),
}));
vi.mock("@/lib/security/ratelimit", () => ({ rateLimited: async () => false, ipKey: () => "test" }));
vi.mock("@/lib/admin/access", () => ({ isAdminEmail: (email?: string | null) => Boolean(email && state.admins.has(email)) }));
vi.mock("@/lib/community/adminStanding", () => ({ requestStanding: async () => state.standing, standingOf: () => state.standing }));
vi.mock("@/lib/community/trustServer", () => ({ staffAmong: async () => new Set<string>(), STAFF_BADGES: ["team", "moderator"] }));
vi.mock("@/lib/profile/server", () => ({ identity: async () => ({ name: "A moderator" }) }));
vi.mock("@/lib/profile/bannerFile", () => ({ deleteBannerFiles: async () => {} }));
vi.mock("@/lib/community/notify", () => ({
  insertNotifications: async () => {},
  notifyClergyOfQuestion: async () => {},
  notifyMentions: async () => {},
  notifyOfReply: async () => {},
}));
// Community's own queue is not what is tried here: it stands empty, and its actions answer.
vi.mock("@/lib/community/moderation", async (original) => {
  const real = await original<typeof import("@/lib/community/moderation")>();
  return {
    ...real,
    readPendingHolds: async () => ({ rows: [], live: true }),
    readOpenReports: async () => [],
    readModLog: async () => ({ rows: [], live: true }),
    runModAction: async () => ({ ok: true }),
  };
});
// The heartbeat's other jobs are not what is tried here.
vi.mock("@/lib/ops/prune", () => ({ pruneReports: async () => ({}) }));
vi.mock("@/lib/shop/abandonedSweep", () => ({ sweepAbandonedCheckouts: async () => ({ swept: 0 }) }));
vi.mock("@/lib/ambassadors/payouts", () => ({ clearMatured: async () => ({}), runAmbassadorPayouts: async () => ({}) }));
vi.mock("@/lib/email/jobs", () => ({ runEmailJobs: async () => ({ running: 0, allowance: 0, reports: [] }) }));
vi.mock("@/lib/shop/cartReminderSweep", () => ({ sendCartReminders: async () => ({}) }));
vi.mock("@/lib/admin/plannerDigest", () => ({ sendPlannerDigest: async () => ({}) }));
vi.mock("@/lib/admin/weeklyLetter", () => ({ sendWeeklyLetter: async () => ({}) }));

import { GET as queue, POST as act } from "@/app/api/community/moderation/route";
import { buildQueue, campaignKey, waitingKeys, type QueueSources } from "@/lib/admin/communityQueue";
import { __setCampaignsOpening } from "@/lib/campaigns/flags";
import { heldWhy, type WaitingCampaign } from "@/lib/campaigns/model";
import { KEPT_DAYS, runCampaignUpkeep } from "@/lib/campaigns/upkeep";
import { runMaintenance } from "@/lib/ops/maintenance";

const ANNA = "11111111-1111-4111-8111-111111111111";
const MARK = "22222222-2222-4222-8222-222222222222";
const EDGAR = "55555555-5555-4555-8555-555555555555";
const C1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const C2 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const C3 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3";
const R1 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const SITE = "https://purifyapp.net";
const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 10, 12, 0);
const iso = (ms: number) => new Date(ms).toISOString();

let w: World;

/** A campaign of the rework, held until read, forty days for the reposed unless said otherwise. */
function campaign(id: string, over: Row = {}): Row {
  return {
    id,
    creator_id: ANNA,
    title: "Forty days for Nicholas",
    intention: "departed",
    for_whom: "departed",
    subject_name: "Nicholas",
    details: "He fell asleep on Tuesday.",
    days: 40,
    starts_on: "2026-11-10",
    ends_on: "2026-12-19",
    ends_at: "2026-12-20T12:00:00.000Z",
    status: "held",
    held_reason: "new",
    audience: "public",
    creator_name: "Anna",
    creator_handle: "anna",
    keep_after_end: false,
    mod_cleared_at: null,
    ended_at: null,
    image_url: null,
    created_at: iso(NOW - 3_600_000),
    updated_at: iso(NOW - 3_600_000),
    ...over,
  };
}

function signIn(id: string | null) {
  state.user = id ? { id, email: id === EDGAR ? "edgar@example.com" : `${id.slice(0, 4)}@example.com`, created_at: iso(NOW - 90 * DAY), user_metadata: {} } : null;
}

const post = (body: unknown) => new Request(`${SITE}/api/community/moderation`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const get = (qs = "") => new Request(`${SITE}/api/community/moderation${qs}`);
const statusOf = (id: string) => w.tables.prayer_campaigns?.find((r) => r.id === id)?.status;
/** The in-memory database as the service-role client the server code is written against. */
const db = () => client(w) as never;

beforeEach(() => {
  process.env.NEXT_PUBLIC_COMMUNITY_ENABLED = "1";
  w = world();
  w.users = new Set([ANNA, MARK, EDGAR]);
  w.tables.prayer_campaigns = [];
  w.tables.prayer_campaign_reports = [];
  w.tables.community_mod_log = [];
  w.tables.user_badges = [{ user_id: MARK, badge: "moderator" }];
  w.tables.profiles = [ANNA, MARK, EDGAR].map((id) => ({ id, display_name: "A reader", joined_at: iso(NOW - 90 * DAY) }));
  state.admin = client(w);
  state.admins = new Set(["edgar@example.com"]);
  state.standing = "reader";
  __setCampaignsOpening("open");
  signIn(MARK);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  __setCampaignsOpening("closed");
  vi.restoreAllMocks();
});

describe("the moderators' queue", () => {
  it("carries the campaigns waiting to be read, one that may mean danger first, and never an account", async () => {
    w.tables.prayer_campaigns = [
      campaign(C1, { created_at: iso(NOW - 3 * 3_600_000) }),
      campaign(C2, { title: "For Maria", for_whom: "living", intention: "healing", held_reason: "new; crisis", created_at: iso(NOW - 3_600_000) }),
      campaign(C3, { status: "active", held_reason: null }),
    ];
    w.tables.prayer_campaign_reports = [{ id: R1, campaign_id: C3, reporter_id: MARK, reason_code: "money", reason: "It asks for a transfer.", status: "open", created_at: iso(NOW) }];
    const res = await queue(get());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { campaigns: { waiting: WaitingCampaign[]; reports: { id: string; campaign: { id: string } | null }[]; live: boolean } };
    expect(body.campaigns.live).toBe(true);
    expect(body.campaigns.waiting.map((c) => c.id)).toEqual([C2, C1]);
    expect(body.campaigns.reports.map((r) => [r.id, r.campaign?.id])).toEqual([[R1, C3]]);
    const raw = JSON.stringify(body);
    expect(raw).not.toContain(ANNA);
    expect(raw).not.toContain("creator_id");
    expect(raw).not.toContain("reporter_id");
    // The button in Community counts them with the rest.
    expect(await (await queue(get("?summary=1"))).json()).toEqual({ waiting: 3 });
  });

  it("approves a waiting campaign onto the board, cleared, and writes who did", async () => {
    w.tables.prayer_campaigns = [campaign(C1)];
    expect((await act(post({ action: "approve_campaign", id: C1 }))).status).toBe(200);
    const row = w.tables.prayer_campaigns[0];
    expect(row.status).toBe("active");
    expect(row.held_reason).toBeNull();
    expect(typeof row.mod_cleared_at).toBe("string");
    expect((w.tables.community_mod_log ?? []).map((l) => [l.action, l.target_kind, l.target_id, l.actor_id])).toEqual([["approve_campaign", "campaign", C1, MARK]]);
  });

  it("removes one, and sets a report aside as dismissed and not deleted", async () => {
    w.tables.prayer_campaigns = [campaign(C1, { status: "active" }), campaign(C2, { status: "active" })];
    w.tables.prayer_campaign_reports = [{ id: R1, campaign_id: C2, reporter_id: ANNA, reason_code: "other", reason: null, status: "open", created_at: iso(NOW) }];
    expect((await act(post({ action: "remove_campaign", id: C1, reason: "Asks for money." }))).status).toBe(200);
    expect(statusOf(C1)).toBe("removed");
    expect(w.tables.prayer_campaigns.find((r) => r.id === C1)?.removed_reason).toBe("Asks for money.");
    expect((await act(post({ action: "dismiss_campaign_report", id: R1 }))).status).toBe(200);
    expect(w.tables.prayer_campaign_reports.map((r) => [r.id, r.status])).toEqual([[R1, "dismissed"]]);
    expect(statusOf(C2)).toBe("active");
    // And one removed can be put back.
    expect((await act(post({ action: "restore_campaign", id: C1 }))).status).toBe(200);
    expect(statusOf(C1)).toBe("active");
  });

  it("is for moderators only", async () => {
    w.tables.prayer_campaigns = [campaign(C1)];
    signIn(ANNA);
    expect((await queue(get())).status).toBe(404);
    expect((await act(post({ action: "approve_campaign", id: C1 }))).status).toBe(404);
    signIn(null);
    expect((await act(post({ action: "approve_campaign", id: C1 }))).status).toBe(401);
    expect(statusOf(C1)).toBe("held");
  });

  it("asks an admin's account for the sign-in code before it moderates a campaign, as for a post", async () => {
    // The team's account, by email, whose session has not passed the second
    // step: it moderates by nothing, not even to approve its own campaign.
    w.tables.prayer_campaigns = [campaign(C1)];
    signIn(EDGAR);
    state.standing = "held";
    expect((await queue(get())).status).toBe(404);
    expect((await act(post({ action: "approve_campaign", id: C1 }))).status).toBe(404);
    expect(statusOf(C1)).toBe("held");
    // With the code passed it does, as an admin.
    state.standing = "admin";
    expect((await act(post({ action: "approve_campaign", id: C1 }))).status).toBe(200);
    expect(statusOf(C1)).toBe("active");
  });
});

describe("the moderators' queue, by the switch", () => {
  it("closed: carries nothing of campaigns, reads none of their tables, and knows no such action", async () => {
    __setCampaignsOpening("closed");
    // Not one campaign table exists here: a read of any would fail the queue.
    delete (w.tables as Record<string, unknown>).prayer_campaigns;
    delete (w.tables as Record<string, unknown>).prayer_campaign_reports;
    const res = await queue(get());
    expect(res.status).toBe(200);
    expect(await res.json()).not.toHaveProperty("campaigns");
    expect(await (await queue(get("?summary=1"))).json()).toEqual({ waiting: 0 });
    expect((await act(post({ action: "approve_campaign", id: C1 }))).status).toBe(400);
    expect((await act(post({ action: "remove_campaign", id: C1 }))).status).toBe(400);
  });

  it("testers first: a moderator by badge sees none of it, the team does", async () => {
    __setCampaignsOpening("testers");
    w.tables.prayer_campaigns = [campaign(C1)];
    // A reader who moderates, and is not of the team.
    const forMark = await queue(get());
    expect(forMark.status).toBe(200);
    expect(await forMark.json()).not.toHaveProperty("campaigns");
    expect((await act(post({ action: "approve_campaign", id: C1 }))).status).toBe(400);
    expect(statusOf(C1)).toBe("held");
    // The team's account, its code passed.
    signIn(EDGAR);
    state.standing = "admin";
    const body = (await (await queue(get())).json()) as { campaigns: { waiting: WaitingCampaign[] } };
    expect(body.campaigns.waiting.map((c) => c.id)).toEqual([C1]);
    expect((await act(post({ action: "approve_campaign", id: C1 }))).status).toBe(200);
    expect(statusOf(C1)).toBe("active");
  });

  it("says the queue is not live, and shows nothing, where the rework's SQL has not run", async () => {
    w.missing.prayer_campaigns = ["held_reason", "details", "days", "ends_on", "creator_name", "creator_handle", "mod_cleared_at"];
    w.missing.prayer_campaign_reports = ["reason_code", "status"];
    w.tables.prayer_campaigns = [{ id: C1, creator_id: ANNA, title: "July's", intention: "healing", for_whom: "living", status: "active", created_at: iso(NOW) }];
    const body = (await (await queue(get())).json()) as { campaigns: { waiting: unknown[]; reports: unknown[]; live: boolean } };
    expect(body.campaigns).toEqual({ waiting: [], reports: [], live: false });
  });
});

describe("the team's one queue", () => {
  const EMPTY: QueueSources = { holds: [], reports: [], pendingRecipes: [], campaignReports: [], recipeReports: [], reviewReports: [] };
  const waiting = (over: Partial<WaitingCampaign> = {}): WaitingCampaign => ({
    id: C1,
    title: "Forty days for Nicholas",
    intention: "departed",
    for_whom: "departed",
    subject_name: "Nicholas",
    details: "He fell asleep on Tuesday.",
    days: 40,
    ends_on: "2026-12-19",
    creator_name: "Anna",
    creator_handle: "anna",
    held_reason: "new",
    created_at: "2026-11-10T09:00:00Z",
    ...over,
  });

  it("gives a waiting campaign one row, with Approve and Remove on it", () => {
    const [row, ...rest] = buildQueue({ ...EMPTY, waitingCampaigns: [waiting()] });
    expect(rest).toEqual([]);
    expect(row.key).toBe(campaignKey(C1, C1));
    expect(row.what).toBe("Waiting to be read · a prayer campaign");
    expect(row.who).toEqual({ name: "Anna", handle: "anna" });
    expect(row.text).toBe("Forty days for Nicholas: He fell asleep on Tuesday.");
    expect(row.note).toBe("For Nicholas · for the reposed · 40 days, to 2026-12-19");
    expect(row.actions.map((a) => [a.label, a.removal, a.calls])).toEqual([
      ["Approve", false, [{ url: "/api/admin/community", body: { action: "approve_campaign", id: C1 } }]],
      ["Remove campaign", true, [{ url: "/api/admin/community", body: { action: "remove_campaign", id: C1 } }]],
    ]);
  });

  it("folds the reports on a campaign hidden by them into its one row", () => {
    const report = (id: string, reason: string) => ({ id, reason, created_at: "2026-11-10T08:00:00Z", campaign: { id: C1, title: "Forty days for Nicholas", status: "held", intention: "departed", subject_name: "Nicholas" } });
    const src: QueueSources = { ...EMPTY, waitingCampaigns: [waiting({ held_reason: "reports (2)" })], campaignReports: [report("r1", "Not his family"), report("r2", "Not his family")] };
    const rows = buildQueue(src);
    expect(rows).toHaveLength(1);
    expect(rows[0].what).toBe("Hidden by reports · 2 reports · a prayer campaign");
    expect(rows[0].reasons).toBe("Not his family 2");
    // Since its oldest report, not since it was started.
    expect(rows[0].at).toBe("2026-11-10T08:00:00Z");
    expect(rows[0].actions.map((a) => a.label)).toEqual(["Show again", "Remove campaign"]);
    // The rail counts rows: one.
    expect(waitingKeys(src)).toEqual([campaignKey(C1, C1)]);
  });

  it("puts one that may mean danger before everything older", () => {
    const rows = buildQueue({
      ...EMPTY,
      waitingCampaigns: [waiting({ created_at: "2026-11-01T09:00:00Z" }), waiting({ id: C2, title: "For Maria", held_reason: "new; crisis; words (1 masked)", created_at: "2026-11-10T09:00:00Z" })],
    });
    expect(rows.map((r) => r.key)).toEqual([campaignKey(C2, C2), campaignKey(C1, C1)]);
    expect(rows[0].what).toBe("Read first: the writer may be in danger · Waiting to be read · a prayer campaign · masked words");
  });

  it("is as it was with no campaigns waiting", () => {
    expect(buildQueue({ ...EMPTY, waitingCampaigns: [] })).toEqual(buildQueue(EMPTY));
  });

  it("reads why a campaign waits from the server's few words", () => {
    expect(heldWhy("new")).toEqual([]);
    expect(heldWhy("new; crisis; words (2 masked); money, phone; address")).toEqual(["crisis", "words", "asks", "address"]);
    expect(heldWhy("reports; about_me")).toEqual(["reports"]);
    expect(heldWhy(null)).toEqual([]);
  });
});

describe("how long a campaign is kept", () => {
  const ended = NOW - (KEPT_DAYS + 1) * DAY;
  const recent = NOW - 5 * DAY;
  const ids = () => (w.tables.prayer_campaigns ?? []).map((r) => r.id).sort();

  it("writes down that a campaign past its last day has ended, and no other", async () => {
    w.tables.prayer_campaigns = [
      campaign("over", { status: "active", ends_at: iso(NOW - 3_600_000) }),
      campaign("running", { status: "active", ends_at: iso(NOW + DAY) }),
      campaign("waiting", { status: "held", ends_at: iso(NOW - 3_600_000) }),
    ];
    const report = await runCampaignUpkeep(db(), NOW);
    expect(report.ended).toBe(1);
    expect(Object.fromEntries(w.tables.prayer_campaigns.map((r) => [r.id, r.status]))).toEqual({ over: "ended", running: "active", waiting: "held" });
    expect(w.tables.prayer_campaigns.find((r) => r.id === "over")?.ended_at).toBe(iso(NOW));
  });

  it("deletes a campaign for the living thirty days after its last day, or after it was closed early", async () => {
    w.tables.prayer_campaigns = [
      campaign("old", { for_whom: "living", intention: "healing", status: "ended", ends_at: iso(ended) }),
      campaign("old-unmarked", { for_whom: "living", intention: "healing", status: "active", ends_at: iso(ended) }),
      campaign("answered-long-ago", { for_whom: "living", intention: "healing", status: "answered", ended_at: iso(ended), ends_at: iso(NOW + DAY) }),
      campaign("ended-last-week", { for_whom: "living", intention: "healing", status: "ended", ends_at: iso(recent) }),
      campaign("answered-last-week", { for_whom: "living", intention: "healing", status: "answered", ended_at: iso(recent), ends_at: iso(NOW + DAY) }),
    ];
    const report = await runCampaignUpkeep(db(), NOW);
    expect(report.deleted.living).toBe(3);
    expect(ids()).toEqual(["answered-last-week", "ended-last-week"]);
  });

  it("keeps one for the reposed as long as its creator keeps it, and deletes it otherwise", async () => {
    w.tables.prayer_campaigns = [
      campaign("kept", { status: "ended", ends_at: iso(ended), keep_after_end: true }),
      campaign("kept-closed", { status: "memory_eternal", ended_at: iso(ended), keep_after_end: true }),
      campaign("not-kept", { status: "ended", ends_at: iso(ended) }),
      campaign("not-kept-closed", { status: "memory_eternal", ended_at: iso(ended), ends_at: iso(NOW + DAY) }),
    ];
    const report = await runCampaignUpkeep(db(), NOW);
    expect(report.deleted.reposed).toBe(2);
    expect(ids()).toEqual(["kept", "kept-closed"]);
  });

  it("deletes one that was removed thirty days after the removal, and one never read thirty days after its last day", async () => {
    w.tables.prayer_campaigns = [
      campaign("removed-long-ago", { status: "removed", updated_at: iso(ended) }),
      campaign("removed-last-week", { status: "removed", updated_at: iso(recent) }),
      campaign("never-read", { status: "held", ends_at: iso(ended) }),
      campaign("waiting", { status: "held" }),
    ];
    const report = await runCampaignUpkeep(db(), NOW);
    expect(report.deleted).toMatchObject({ removed: 1, unread: 1 });
    expect(ids()).toEqual(["removed-last-week", "waiting"]);
  });

  it("leaves July's campaigns exactly as they are", async () => {
    // No `days`: a row from before the rework, which may carry a picture.
    const july = { days: null, starts_on: null, ends_on: null, image_url: "https://example.supabase.co/storage/v1/object/public/campaign-media/c/x.webp" };
    w.tables.prayer_campaigns = [
      campaign("july-over", { ...july, status: "active", ends_at: iso(ended) }),
      campaign("july-removed", { ...july, status: "removed", updated_at: iso(ended) }),
    ];
    const before = structuredClone(w.tables.prayer_campaigns);
    const report = await runCampaignUpkeep(db(), NOW);
    expect(report).toEqual({ ended: 0, deleted: { living: 0, reposed: 0, unread: 0, removed: 0 } });
    expect(w.tables.prayer_campaigns).toEqual(before);
  });

  it("says the rework's columns are absent, and deletes nothing, where its SQL has not run", async () => {
    w.missing.prayer_campaigns = ["days", "ended_at", "keep_after_end"];
    w.tables.prayer_campaigns = [{ id: "july", creator_id: ANNA, title: "July's", status: "active", for_whom: "living", ends_at: iso(ended), updated_at: iso(ended), created_at: iso(ended) }];
    const report = await runCampaignUpkeep(db(), NOW);
    expect(report).toEqual({ ended: "absent", deleted: { living: "absent", reposed: "absent", unread: "absent", removed: "absent" } });
    expect(ids()).toEqual(["july"]);
  });

  it("rides the heartbeat hourly, and not at all while campaigns are closed", async () => {
    w.tables.prayer_campaigns = [campaign("over", { status: "active", ends_at: iso(NOW - 3_600_000) })];
    __setCampaignsOpening("closed");
    const closed = await runMaintenance(db(), NOW);
    expect(closed).not.toHaveProperty("campaignUpkeep");
    expect(w.tables.prayer_campaigns[0].status).toBe("active");

    __setCampaignsOpening("open");
    const ran = await runMaintenance(db(), NOW + 60_000);
    expect(ran.campaignUpkeep).toMatchObject({ ran: true, ok: true, detail: { ended: 1 } });
    // Ten minutes on, the same hour: not again.
    expect((await runMaintenance(db(), NOW + 11 * 60_000)).campaignUpkeep).toEqual({ ran: false });
  });
});
