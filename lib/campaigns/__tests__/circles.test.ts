import { readFileSync } from "node:fs";
import { join as joinPath } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { client, world, type Row, type World } from "@/lib/security/__tests__/fakeSupabase";

/**
 * A prayer campaign kept to one circle (1.9; the notes, 4.2 and section 27).
 *
 * The privacy page he approved says "A prayer campaign is public unless you
 * keep it to a circle". A circle is one of Read together's: a parish, a
 * household, friends, joined by a code. Kept to one, a campaign is opened by
 * that circle's members and its creator, and by nobody else; it is on no
 * board; and to a reader outside the circle it is as a campaign that does
 * not exist.
 *
 * Run against an in-memory Supabase, as the campaign routes' own tests are
 * (routes.test.ts): the routes are closed to everyone but testers until he
 * opens them, so this is where they are exercised.
 *
 * What would go wrong if these broke: a parish's campaign for a sick member
 * read by a stranger who guessed or was sent its address; a circle's name, or
 * that a circle exists, told to someone outside it; a campaign kept to a
 * circle its creator is not in, or to one of July's groups, which July's job
 * deletes; a member who left still carrying the name; or a circle's last
 * member leaving and its campaign's pictures staying in storage with no row.
 */

const state = vi.hoisted(() => ({
  admin: null as unknown,
  user: null as null | { id: string; email: string; created_at: string; user_metadata: Record<string, unknown> },
  trust: { level: "member", limits: {}, facts: { accountAgeMs: 90 * 86_400_000, contributions: 0, removals30d: 0, removals90d: 0, staff: false } },
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => state.admin }));
vi.mock("@/lib/supabase/server", () => ({
  createClientFromRequest: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }), getSession: async () => ({ data: { session: null } }) },
  }),
}));
vi.mock("@/lib/security/ratelimit", () => ({ rateLimited: async () => false, ipKey: () => "test" }));
vi.mock("@/lib/admin/access", () => ({ isAdminEmail: () => false }));
vi.mock("@/lib/community/adminStanding", () => ({ requestStanding: async () => "reader", standingOf: () => "reader" }));
vi.mock("@/lib/community/trustServer", () => ({
  readTrust: async () => state.trust,
  staffAmong: async () => new Set<string>(),
  STAFF_BADGES: ["team", "moderator"],
}));
vi.mock("@/lib/community/guard", () => ({ guardWrite: async () => ({ kind: "ok", trust: state.trust }) }));
vi.mock("@/lib/moderation/server", () => ({
  censorPost: async (_admin: unknown, input: { title?: string | null; body?: string | null }) => ({ title: input.title ?? null, body: input.body ?? null, hits: 0 }),
  censorName: async (_admin: unknown, name: string) => name,
  getBlockedHosts: async () => [],
}));
vi.mock("@/lib/profile/server", () => ({ ensureCleanHandle: async () => {}, identity: async () => ({ name: "Moderator" }) }));
vi.mock("@/lib/profile/bannerFile", () => ({ deleteBannerFiles: async () => {} }));
vi.mock("@/lib/community/notify", () => ({
  insertNotifications: async () => {},
  notifyClergyOfQuestion: async () => {},
  notifyMentions: async () => {},
  notifyOfReply: async () => {},
}));

import { GET as getOne } from "@/app/api/campaigns/[id]/route";
import { POST as join } from "@/app/api/campaigns/[id]/join/route";
import { GET as getPictures } from "@/app/api/campaigns/[id]/pictures/route";
import { POST as report } from "@/app/api/campaigns/[id]/report/route";
import { GET as getThread, POST as writeNote } from "@/app/api/campaigns/[id]/thread/route";
import { GET as myCircles } from "@/app/api/campaigns/circles/route";
import { GET as mine } from "@/app/api/campaigns/mine/route";
import { GET as board, POST as create } from "@/app/api/campaigns/route";
import { POST as states } from "@/app/api/campaigns/state/route";
import { DELETE as leaveCircle } from "@/app/api/circles/[id]/route";
import { beforeCircleGoes } from "@/lib/campaigns/circleEnd";
import { circlesHolding, mayKeepTo, readerCircles } from "@/lib/campaigns/circles";
import { __setCampaignsOpening } from "@/lib/campaigns/flags";
import { readWaitingCampaigns } from "@/lib/campaigns/moderation";
import { __resetCampaignParts, __setCampaignPart } from "@/lib/campaigns/parts";
import { mayRead, type CampaignRow } from "@/lib/campaigns/server";

const ANNA = "11111111-1111-4111-8111-111111111111";
const BEN = "22222222-2222-4222-8222-222222222222";
const CARA = "33333333-3333-4333-8333-333333333333";
const DAN = "44444444-4444-4444-8444-444444444444";
/** Anna's and Ben's parish: a circle on a reading path. */
const PARISH = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
/** Cara's household: Anna is not in it. */
const HOUSEHOLD = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
/** One of July's parish groups, inside a July campaign. Anna is in it. */
const JULYS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3";
const NOWHERE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9";
const SITE = "https://purifyapp.net";
const BUCKET = "campaign-media";
const DAY = 86_400_000;

let w: World;

function signIn(id: string | null) {
  state.user = id
    ? { id, email: `${id.slice(0, 4)}@example.com`, created_at: new Date(Date.now() - 90 * DAY).toISOString(), user_metadata: { display_name: id === ANNA ? "Anna" : "Reader" } }
    : null;
}

const today = () => new Date().toISOString().slice(0, 10);
const json = (body: unknown, method = "POST") => ({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const campaigns = () => w.tables.prayer_campaigns!;
const member = (group: string, user: string, name = "Reader"): Row => ({ group_id: group, user_id: user, member_name: name, joined_at: new Date().toISOString() });

/** A campaign as the table holds one a moderator has read: kept to the parish unless a case says otherwise. */
function kept(creator: string, over: Row = {}): string {
  const id = crypto.randomUUID();
  campaigns().push({
    id,
    creator_id: creator,
    title: "For Maria before her operation",
    intention: "healing",
    for_whom: "living",
    subject_name: "Maria",
    details: "She is ill.",
    note: null,
    days: 7,
    starts_on: today(),
    ends_on: new Date(Date.now() + 6 * DAY).toISOString().slice(0, 10),
    ends_at: new Date(Date.now() + 7 * DAY).toISOString(),
    prayer_rule: null,
    prayer_id: null,
    status: "active",
    audience: "circle",
    circle_id: PARISH,
    creator_name: "Anna",
    creator_handle: "anna",
    created_at: new Date().toISOString(),
    held_reason: null,
    mod_cleared_at: new Date().toISOString(),
    keep_after_end: false,
    comments_open: true,
    listed: true,
    praying_count: 0,
    prayer_count: 0,
    ...over,
  });
  return id;
}

const FOR_MARIA = {
  forWhom: "living",
  kind: "healing",
  title: "For Maria before her operation",
  name: "Maria",
  words: "Her operation is on Thursday.",
  days: 7,
  consent: "blessing",
  blessing: true,
  rules: true,
  termsAccepted: true,
};
const start = (over: Record<string, unknown> = {}) => create(new Request(`${SITE}/api/campaigns`, json({ ...FOR_MARIA, startsOn: today(), ...over })));
const open = (id: string) => getOne(new Request(`${SITE}/api/campaigns/${id}`), params(id));

beforeEach(() => {
  w = world();
  w.users = new Set([ANNA, BEN, CARA, DAN]);
  w.tables.prayer_campaign_prayers = [];
  w.tables.prayer_campaign_reports = [];
  w.tables.prayer_campaign_pictures = [];
  w.tables.community_blocks = [];
  w.tables.community_mutes = [];
  w.tables.community_mod_log = [];
  w.tables.community_posts = [];
  w.tables.community_post_replies = [];
  w.tables.upload_owners = [];
  w.tables.group_path_days = [];
  w.tables.profiles = [ANNA, BEN, CARA, DAN].map((id) => ({ id, handle: id === ANNA ? "anna" : null, joined_at: new Date(Date.now() - 90 * DAY).toISOString() }));
  w.tables.prayer_campaign_groups = [
    { id: PARISH, campaign_id: null, creator_id: ANNA, name: "St Nicholas parish", kind: "parish", invite_code: "PARISH", member_count: 2, path_id: "gospels", path_started_on: today() },
    { id: HOUSEHOLD, campaign_id: null, creator_id: CARA, name: "Cara's household", kind: "household", invite_code: "HOUSEH", member_count: 1, path_id: "gospels", path_started_on: today() },
    { id: JULYS, campaign_id: "july-campaign", creator_id: ANNA, name: "July's parish group", kind: "parish", invite_code: "JULYSG", member_count: 1, path_id: null, path_started_on: null },
  ];
  w.tables.prayer_campaign_group_members = [member(PARISH, ANNA, "Anna"), member(PARISH, BEN, "Ben"), member(HOUSEHOLD, CARA, "Cara"), member(JULYS, ANNA, "Anna")];
  state.admin = client(w);
  __setCampaignsOpening("open");
  signIn(ANNA);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  __setCampaignsOpening("closed");
  __resetCampaignParts();
  vi.restoreAllMocks();
});

describe("who may open a campaign kept to a circle", () => {
  const row = (over: Partial<CampaignRow> = {}): CampaignRow => ({ id: "c", creator_id: ANNA, status: "active", days: 7, audience: "circle", circle_id: PARISH, ...over });
  const inParish = new Set([PARISH]);

  it("its circle's members and its creator, and nobody else", () => {
    expect(mayRead(row(), BEN, inParish)).toBe(true);
    // Its creator, whatever circles they are in now.
    expect(mayRead(row(), ANNA)).toBe(true);
    // In another circle, in none, and not signed in.
    expect(mayRead(row(), CARA, new Set([HOUSEHOLD]))).toBe(false);
    expect(mayRead(row(), DAN)).toBe(false);
    expect(mayRead(row(), null, inParish)).toBe(false);
  });

  it("while it waits for a moderator, its creator alone; and removed, nobody", () => {
    expect(mayRead(row({ status: "held" }), ANNA)).toBe(true);
    expect(mayRead(row({ status: "held" }), BEN, inParish)).toBe(false);
    expect(mayRead(row({ status: "removed" }), ANNA, inParish)).toBe(false);
    expect(mayRead(row({ status: "removed" }), BEN, inParish)).toBe(false);
  });

  it("a row that names a circle is never public by accident", () => {
    // The table holds the two columns to each other; were one ever to slip, the row is still its circle's.
    expect(mayRead(row({ audience: "public" }), DAN)).toBe(false);
    expect(mayRead(row({ audience: "public" }), ANNA)).toBe(true);
  });

  it("a public campaign is unchanged: everyone, whatever circles they are in", () => {
    for (const reader of [ANNA, DAN, null]) expect(mayRead(row({ audience: "public", circle_id: null }), reader)).toBe(true);
  });
});

describe("a reader's circles", () => {
  it("are their own reading circles, by name: never another's, and never one of July's groups", async () => {
    expect(await readerCircles(state.admin as never, ANNA)).toEqual([{ id: PARISH, name: "St Nicholas parish", kind: "parish" }]);
    expect(await readerCircles(state.admin as never, CARA)).toEqual([{ id: HOUSEHOLD, name: "Cara's household", kind: "household" }]);
    expect(await readerCircles(state.admin as never, DAN)).toEqual([]);
    expect(await readerCircles(state.admin as never, null)).toEqual([]);
  });

  it("the question of membership is answered from the members' table, by the reader's own id", async () => {
    expect([...(await circlesHolding(state.admin as never, BEN, [PARISH, HOUSEHOLD]))]).toEqual([PARISH]);
    expect([...(await circlesHolding(state.admin as never, DAN, [PARISH]))]).toEqual([]);
    expect([...(await circlesHolding(state.admin as never, null, [PARISH]))]).toEqual([]);
    // What is not an id is not asked about.
    expect([...(await circlesHolding(state.admin as never, BEN, ["parish", null, undefined]))]).toEqual([]);
  });

  it("where the members cannot be read, nobody is taken for a member", async () => {
    w.tables.prayer_campaign_group_members = null;
    expect([...(await circlesHolding(state.admin as never, BEN, [PARISH]))]).toEqual([]);
    expect(await readerCircles(state.admin as never, ANNA)).toEqual([]);
    expect(await mayKeepTo(state.admin as never, ANNA, PARISH)).toBe(false);
  });

  it("the route: a reader's circles and the campaigns running in them, and nothing of a circle they are not in", async () => {
    const older = kept(ANNA, { title: "Older", created_at: new Date(Date.now() - 3_600_000).toISOString() });
    const newer = kept(BEN, { title: "Newer", creator_name: "Ben", creator_handle: null });
    kept(ANNA, { title: "Waiting", status: "held" });
    kept(ANNA, { title: "Removed", status: "removed" });
    kept(ANNA, { title: "Past its last day", ends_at: new Date(Date.now() - DAY).toISOString() });
    kept(CARA, { title: "The household's", circle_id: HOUSEHOLD });
    kept(ANNA, { title: "Everyone's", audience: "public", circle_id: null });
    const res = await myCircles(new Request(`${SITE}/api/campaigns/circles`));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    const text = await res.text();
    const body = JSON.parse(text) as { circles: Row[]; campaigns: { id: string; title: string; circle?: { name: string }; mine?: boolean }[] };
    expect(body.circles).toEqual([{ id: PARISH, name: "St Nicholas parish", kind: "parish" }]);
    expect(body.campaigns.map((c) => c.id)).toEqual([newer, older]);
    expect(body.campaigns.every((c) => c.circle?.name === "St Nicholas parish")).toBe(true);
    // Never the way in to a circle, an account id, or a count of anyone.
    expect(text).not.toMatch(/PARISH|HOUSEH|invite|creator_id|praying_count|prayer_count|circle_id|member_count/);
    expect(text).not.toContain(BEN);
    expect(text).not.toContain("household");
  });

  it("leaves out a campaign by someone the reader has blocked or muted, as the board does", async () => {
    kept(BEN, { title: "Ben's" });
    w.tables.community_blocks!.push({ blocker_id: ANNA, blocked_id: BEN });
    const body = (await (await myCircles(new Request(`${SITE}/api/campaigns/circles`))).json()) as { campaigns: Row[] };
    expect(body.campaigns).toEqual([]);
  });

  it("answers a reader who is not signed in with two empty lists, and nobody while campaigns are closed", async () => {
    kept(ANNA);
    signIn(null);
    const res = await myCircles(new Request(`${SITE}/api/campaigns/circles`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ circles: [], campaigns: [] });
    __setCampaignsOpening("closed");
    state.admin = null;
    expect((await myCircles(new Request(`${SITE}/api/campaigns/circles`))).status).toBe(404);
  });
});

describe("the two rules that are asked twice", () => {
  // Which circles are a reader's, and which campaigns are in them, are each
  // asked in the read and asked again of what came back. Either alone keeps
  // a stranger out, so a case above cannot tell when one is taken away:
  // this holds that both stand.
  const source = (path: string) => readFileSync(joinPath(process.cwd(), path), "utf8");

  it("only a circle on a reading path, never one of July's groups: in the read, and of each row", () => {
    const circles = source("lib/campaigns/circles.ts");
    expect(circles).toMatch(/\.is\("campaign_id", null\)\s*\.not\("path_id", "is", null\);/);
    expect(circles).toContain(".filter((g) => g.campaign_id === null && g.path_id !== null)");
  });

  it("only the campaigns kept to the reader's own circles: in the read, and of each row", () => {
    const server = source("lib/campaigns/server.ts");
    expect(server).toMatch(/\.eq\("audience", "circle"\)\s*\.in\(\s*"circle_id",\s*circles\.map\(\(c\) => c\.id\),\s*\)/);
    expect(server).toContain('typeof r.circle_id === "string" && nameOf.has(r.circle_id)');
  });

  it("and every route that opens a campaign asks who may, the same way", () => {
    const routes = ["route.ts", "join/route.ts", "report/route.ts", "pictures/route.ts", "thread/route.ts"].map((name) => source(`app/api/campaigns/[id]/${name}`));
    // The question with the circle in it, and never the bare one, which knows no circle.
    for (const route of routes) {
      expect(route).toContain("mayOpen(admin, row,");
      expect(route).not.toMatch(/\bmayRead\(/);
    }
    expect(routes.join("").match(/await mayOpen\(admin, row,/g)).toHaveLength(7);
  });
});

describe("starting one", () => {
  it("kept to a circle of the writer's own: written so, and held for a moderator like any other", async () => {
    const res = await start({ circleId: PARISH });
    expect(res.status).toBe(200);
    const { id } = (await res.json()) as { id: string };
    const row = campaigns().find((r) => r.id === id) as Row;
    expect(row.audience).toBe("circle");
    expect(row.circle_id).toBe(PARISH);
    expect(row.status).toBe("held");
    // A member does not see it until a moderator has read it; its creator does.
    signIn(BEN);
    expect((await open(id)).status).toBe(404);
    signIn(ANNA);
    expect((await open(id)).status).toBe(200);
  });

  it("with no circle named it is for everyone in Community, as before", async () => {
    for (const over of [{}, { circleId: null }]) {
      const { id } = (await (await start(over)).json()) as { id: string };
      const row = campaigns().find((r) => r.id === id) as Row;
      expect(row.audience).toBe("public");
      expect(row.circle_id ?? null).toBeNull();
    }
  });

  it("is refused, with one answer and nothing written, for a circle that is not theirs, one of July's groups, and one that does not exist", async () => {
    const answers: string[] = [];
    for (const circleId of [HOUSEHOLD, JULYS, NOWHERE]) {
      const res = await start({ circleId });
      expect(res.status, circleId).toBe(400);
      answers.push(JSON.stringify(await res.json()));
    }
    expect(new Set(answers).size).toBe(1);
    expect(JSON.parse(answers[0])).toMatchObject({ code: "bad_circle" });
    expect(campaigns()).toEqual([]);
  });

  it("takes only an id for a circle", async () => {
    for (const circleId of ["parish", "", 7, { id: PARISH }]) expect((await start({ circleId })).status, JSON.stringify(circleId)).toBe(400);
    expect(campaigns()).toEqual([]);
  });
});

describe("opening it", () => {
  it("its members and its creator are handed it, with its circle's name; a reader outside the circle is told what is told of none", async () => {
    const id = kept(ANNA);
    const none = await getOne(new Request(`${SITE}/api/campaigns/${NOWHERE}`), params(NOWHERE));
    const noSuch = { status: none.status, body: await none.text() };
    expect(noSuch.status).toBe(404);

    signIn(BEN);
    const forBen = await open(id);
    expect(forBen.status).toBe(200);
    const shown = ((await forBen.json()) as { campaign: Row }).campaign;
    expect(shown.circle).toEqual({ name: "St Nicholas parish" });
    expect(shown.mine).toBe(false);
    expect(JSON.stringify(shown)).not.toMatch(/circle_id|creator_id|invite|audience/);

    signIn(ANNA);
    expect((((await (await open(id)).json()) as { campaign: Row }).campaign).circle).toEqual({ name: "St Nicholas parish" });

    for (const outsider of [CARA, DAN, null]) {
      signIn(outsider);
      const res = await open(id);
      expect({ status: res.status, body: await res.text() }, String(outsider)).toEqual(noSuch);
    }
  });

  it("its creator can still open it after leaving the circle; a member who leaves cannot", async () => {
    const id = kept(ANNA);
    w.tables.prayer_campaign_group_members = w.tables.prayer_campaign_group_members!.filter((m) => m.group_id !== PARISH);
    expect((await open(id)).status).toBe(200);
    signIn(BEN);
    expect((await open(id)).status).toBe(404);
  });

  it("a public campaign names no circle", async () => {
    const id = kept(ANNA, { audience: "public", circle_id: null });
    signIn(DAN);
    expect("circle" in (((await (await open(id)).json()) as { campaign: Row }).campaign)).toBe(false);
  });

  it("every other way in asks the same question: its updates and comments, joining, reporting, its pictures", async () => {
    __setCampaignPart("pictures", true);
    const id = kept(ANNA);
    const ways = (): Promise<Response>[] => [
      getThread(new Request(`${SITE}/api/campaigns/${id}/thread`), params(id)),
      writeNote(new Request(`${SITE}/api/campaigns/${id}/thread`, json({ kind: "comment", body: "Praying for Maria." })), params(id)),
      join(new Request(`${SITE}/api/campaigns/${id}/join`, json({ places: ["evening"] })), params(id)),
      report(new Request(`${SITE}/api/campaigns/${id}/report`, json({ reason: "unkind" })), params(id)),
      getPictures(new Request(`${SITE}/api/campaigns/${id}/pictures`), params(id)),
    ];
    for (const outsider of [CARA, DAN]) {
      signIn(outsider);
      expect((await Promise.all(ways())).map((r) => r.status), outsider).toEqual([404, 404, 404, 404, 404]);
    }
    // Nothing of theirs was written.
    expect(w.tables.prayer_campaign_prayers).toEqual([]);
    expect(w.tables.prayer_campaign_reports).toEqual([]);
    expect(w.tables.community_post_replies).toEqual([]);

    // A member reads its updates and its pictures, and joins it.
    signIn(BEN);
    expect((await getThread(new Request(`${SITE}/api/campaigns/${id}/thread`), params(id))).status).toBe(200);
    expect((await getPictures(new Request(`${SITE}/api/campaigns/${id}/pictures`), params(id))).status).toBe(200);
    expect((await join(new Request(`${SITE}/api/campaigns/${id}/join`, json({ places: ["evening"] })), params(id))).status).toBe(200);
    expect(w.tables.prayer_campaign_prayers).toHaveLength(1);
  });
});

describe("where it is listed", () => {
  it("on no board, even for its own members", async () => {
    kept(ANNA);
    for (const reader of [ANNA, BEN, DAN, null]) {
      signIn(reader);
      const { campaigns: list } = (await (await board(new Request(`${SITE}/api/campaigns`))).json()) as { campaigns: Row[] };
      expect(list, String(reader)).toEqual([]);
    }
  });

  it("its creator's own list says which circle it is kept to", async () => {
    kept(ANNA);
    const { started } = (await (await mine(new Request(`${SITE}/api/campaigns/mine`))).json()) as { started: { circle?: { name: string } }[] };
    expect(started.map((c) => c.circle)).toEqual([{ name: "St Nicholas parish" }]);
  });

  it("a member carries it across devices only while they are still in the circle", async () => {
    const id = kept(ANNA);
    w.tables.prayer_campaign_prayers!.push({ campaign_id: id, user_id: BEN, places: ["evening"], until_on: null, joined_at: new Date().toISOString() });
    signIn(BEN);
    const carried = async () => ((await (await mine(new Request(`${SITE}/api/campaigns/mine`))).json()) as { carried: { campaign: { id: string; circle?: { name: string } } }[] }).carried;
    expect((await carried()).map((c) => [c.campaign.id, c.campaign.circle?.name])).toEqual([[id, "St Nicholas parish"]]);
    w.tables.prayer_campaign_group_members = w.tables.prayer_campaign_group_members!.filter((m) => !(m.group_id === PARISH && m.user_id === BEN));
    expect(await carried()).toEqual([]);
  });
});

describe("the moderators' queue", () => {
  it("reads one kept to a circle like any other, and says which circle will see it", async () => {
    kept(ANNA, { title: "The parish's", status: "held", held_reason: "new", mod_cleared_at: null });
    kept(CARA, { title: "Everyone's", status: "held", held_reason: "new", mod_cleared_at: null, audience: "public", circle_id: null, created_at: new Date(Date.now() + 1000).toISOString() });
    const { rows, live } = await readWaitingCampaigns(state.admin as never);
    expect(live).toBe(true);
    expect(rows.map((r) => [r.title, r.circle])).toEqual([
      ["The parish's", "St Nicholas parish"],
      ["Everyone's", null],
    ]);
    // What leaves for the queue names the circle and never its id or its way in.
    expect(JSON.stringify(rows)).not.toMatch(/circle_id|audience|invite|PARISH/);
  });

  it("where a circle's name cannot be read, it is still said to be kept to one", async () => {
    kept(ANNA, { status: "held", held_reason: "new", circle_id: NOWHERE });
    const { rows } = await readWaitingCampaigns(state.admin as never);
    expect(rows.map((r) => r.circle)).toEqual([""]);
  });
});

describe("what a device is told of the names it carries", () => {
  const ask = async (ids: string[]) => ((await (await states(new Request(`${SITE}/api/campaigns/state`, json({ ids })))).json()) as { states: Record<string, string> }).states;

  it("one kept to a circle runs for its members and its creator, and is gone for anyone else, as one that never was", async () => {
    const id = kept(ANNA);
    const everyones = kept(ANNA, { audience: "public", circle_id: null });
    for (const [reader, said] of [
      [ANNA, "running"],
      [BEN, "running"],
      [CARA, "gone"],
      [DAN, "gone"],
      [null, "gone"],
    ] as const) {
      signIn(reader);
      expect(await ask([id, everyones, NOWHERE]), String(reader)).toEqual({ [id]: said, [everyones]: "running", [NOWHERE]: "gone" });
    }
  });

  it("a member who leaves the circle is told to let its name go", async () => {
    const id = kept(ANNA);
    signIn(BEN);
    expect(await ask([id])).toEqual({ [id]: "running" });
    w.tables.prayer_campaign_group_members = w.tables.prayer_campaign_group_members!.filter((m) => !(m.group_id === PARISH && m.user_id === BEN));
    expect(await ask([id])).toEqual({ [id]: "gone" });
  });

  it("and one that is over says so to its own, as any campaign does", async () => {
    const id = kept(ANNA, { status: "answered" });
    signIn(BEN);
    expect(await ask([id])).toEqual({ [id]: "over" });
  });
});

describe("a circle that ends", () => {
  const PICTURE = "c/dddddddd-dddd-4ddd-8ddd-ddddddddddd1.webp";
  const leave = (id: string) => leaveCircle(new Request(`${SITE}/api/circles/${id}`, { method: "DELETE" }), params(id));

  function withPicture(campaignId: string) {
    w.tables.prayer_campaign_pictures!.push({ id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd1", campaign_id: campaignId, bucket: BUCKET, path: PICTURE, position: 0, status: "shown", created_at: new Date().toISOString() });
    w.tables.upload_owners!.push({ bucket: BUCKET, path: PICTURE, owner_id: ANNA });
    w.objects = new Set([`${BUCKET}/${PICTURE}`]);
  }

  it("when its last member leaves, the campaign kept to it goes with it, and its pictures' files go first", async () => {
    const id = kept(ANNA);
    withPicture(id);
    signIn(BEN);
    expect((await leave(PARISH)).status).toBe(200);
    // One member is left: the circle stands, and so does its campaign and its picture.
    expect(w.tables.prayer_campaign_groups!.some((g) => g.id === PARISH)).toBe(true);
    expect(campaigns().map((c) => c.id)).toEqual([id]);
    expect(w.objects.has(`${BUCKET}/${PICTURE}`)).toBe(true);

    signIn(ANNA);
    expect((await leave(PARISH)).status).toBe(200);
    expect(w.tables.prayer_campaign_groups!.some((g) => g.id === PARISH)).toBe(false);
    // The database deletes the campaign with its circle, and the picture's row with the campaign.
    expect(campaigns()).toEqual([]);
    expect(w.tables.prayer_campaign_pictures).toEqual([]);
    // And the file, which is no row, is not left behind.
    expect([...w.objects]).toEqual([]);
  });

  it("a campaign kept to another circle, and one for everyone, are not touched", async () => {
    const households = kept(CARA, { circle_id: HOUSEHOLD });
    const everyones = kept(ANNA, { audience: "public", circle_id: null });
    withPicture(households);
    await beforeCircleGoes(state.admin as never, PARISH);
    expect(w.objects.has(`${BUCKET}/${PICTURE}`)).toBe(true);
    expect(campaigns().map((c) => c.id).sort()).toEqual([households, everyones].sort());
  });

  it("never throws, and asks nothing for what is not an id", async () => {
    w.tables.prayer_campaigns = null;
    await expect(beforeCircleGoes(state.admin as never, PARISH)).resolves.toBeUndefined();
    await expect(beforeCircleGoes(state.admin as never, "parish")).resolves.toBeUndefined();
  });
});
