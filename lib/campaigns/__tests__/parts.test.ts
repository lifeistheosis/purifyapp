import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { client, world, type Row, type World } from "@/lib/security/__tests__/fakeSupabase";

/**
 * The parts of prayer campaigns that ship in 1.9 built and switched off on
 * the server (lib/campaigns/parts.ts), and the first of them, "Prayed by
 * many" (his item 118).
 *
 * His word, 2026-11-10: pictures and top campaigns are "built and shipped
 * switched off by a server-side switch ... then turned on with no store
 * build". So the switch is the server's alone, an app is told it and never
 * decides it, and off is off on the server too.
 *
 * What would go wrong if these broke: a part turned on by an app's own
 * bundle before the website says so; a route that answers while its part is
 * off; and, for "Prayed by many", a figure beside a need, a small campaign
 * listed so that the list says who carries it, or a campaign listed against
 * its creator's wish. His own rule allows none of those (CONTRIBUTING.md,
 * "On prayer, no figures at all").
 *
 * "Prayed by many" is on since 2026-11-10, by his word ("rec yes to all"):
 * his rule now carries the one exception, in the form these cases hold. Off
 * is still a position, as pictures are today, so the cases that hold what
 * off means set it and do not assume it.
 */

const state = vi.hoisted(() => ({
  admin: null as unknown,
  user: null as null | { id: string; email: string; created_at: string; user_metadata: Record<string, unknown> },
  admins: new Set<string>(),
  open: { status: 200, body: { open: true } as unknown },
  asked: [] as string[],
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => state.admin }));
vi.mock("@/lib/supabase/server", () => ({
  createClientFromRequest: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }), getSession: async () => ({ data: { session: null } }) },
  }),
}));
vi.mock("@/lib/security/ratelimit", () => ({ rateLimited: async () => false, ipKey: () => "test" }));
vi.mock("@/lib/admin/access", () => ({ isAdminEmail: (email?: string | null) => Boolean(email && state.admins.has(email)) }));
// The app's own requests, standing in: what the open route would answer.
vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(async (path: string) => {
    state.asked.push(path);
    return new Response(JSON.stringify(state.open.body), { status: state.open.status, headers: { "content-type": "application/json" } });
  }),
}));

import { PATCH as patchOne, GET as getOne } from "@/app/api/campaigns/[id]/route";
import { GET as many } from "@/app/api/campaigns/many/route";
import { GET as isOpen } from "@/app/api/campaigns/open/route";
import { fetchMany } from "@/lib/campaigns/client";
import { __setCampaignsOpening } from "@/lib/campaigns/flags";
import { MANY_FLOOR, MANY_SHOWN } from "@/lib/campaigns/model";
import { CAMPAIGN_PARTS, __resetCampaignParts, __setCampaignPart, campaignPart } from "@/lib/campaigns/parts";
import { __forgetMany } from "@/lib/campaigns/server";
import { __forgetCampaignsOpen, campaignPartNow, campaignsOpenNow, subscribeCampaignsOpen } from "@/lib/campaigns/useCampaignsOpen";

const ANNA = "11111111-1111-4111-8111-111111111111";
const BEN = "22222222-2222-4222-8222-222222222222";
const SITE = "https://purifyapp.net";
const DAY = 86_400_000;
const ROOT = process.cwd();
const source = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

let w: World;

function signIn(id: string | null) {
  state.user = id ? { id, email: `${id.slice(0, 4)}@example.com`, created_at: new Date(Date.now() - 90 * DAY).toISOString(), user_metadata: {} } : null;
}
const today = () => new Date().toISOString().slice(0, 10);
const plus = (days: number) => new Date(Date.now() + days * DAY).toISOString();
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const json = (body: unknown, method = "POST") => ({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

beforeEach(() => {
  w = world();
  w.users = new Set([ANNA, BEN]);
  w.tables.prayer_campaigns = [];
  w.tables.prayer_campaign_prayers = [];
  w.tables.community_blocks = [];
  w.tables.community_mutes = [];
  state.admin = client(w);
  state.admins = new Set();
  state.open = { status: 200, body: { open: true } };
  state.asked = [];
  __setCampaignsOpening("open");
  __resetCampaignParts();
  __forgetMany();
  __forgetCampaignsOpen();
  signIn(BEN);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  __setCampaignsOpening("closed");
  __resetCampaignParts();
  vi.restoreAllMocks();
});

let n = 0;
/** A campaign that runs, by a letter for its title. */
function running(title: string, over: Row = {}): string {
  const id = crypto.randomUUID();
  w.tables.prayer_campaigns!.push({
    id,
    creator_id: ANNA,
    title,
    intention: "healing",
    for_whom: "living",
    subject_name: "Maria",
    details: null,
    note: null,
    days: 7,
    starts_on: today(),
    ends_on: new Date(Date.now() + 6 * DAY).toISOString().slice(0, 10),
    ends_at: plus(7),
    prayer_rule: null,
    prayer_id: null,
    status: "active",
    audience: "public",
    listed: true,
    creator_name: "Anna",
    creator_handle: "anna",
    created_at: new Date(Date.now() - ++n * 1000).toISOString(),
    held_reason: null,
    mod_cleared_at: new Date().toISOString(),
    keep_after_end: false,
    comments_open: true,
    ...over,
  });
  return id;
}
/** So many readers added it, each so many days ago. */
function carriedBy(campaignId: string, readers: number, daysAgo = 0) {
  for (let i = 0; i < readers; i++) {
    w.tables.prayer_campaign_prayers!.push({
      campaign_id: campaignId,
      user_id: crypto.randomUUID(),
      places: ["evening"],
      until_on: null,
      joined_at: new Date(Date.now() - daysAgo * DAY - i * 1000).toISOString(),
    });
  }
}
const titles = async (span = "week") => {
  const res = await many(new Request(`${SITE}/api/campaigns/many?span=${span}`));
  return { status: res.status, titles: res.status === 200 ? ((await res.json()) as { campaigns: { title: string }[] }).campaigns.map((c) => c.title) : [] };
};

describe("the switches", () => {
  it("are committed as he has said: Prayed by many on, pictures off until his three steps are done", () => {
    expect(CAMPAIGN_PARTS).toEqual({ many: true, pictures: false });
    expect(campaignPart("many")).toBe(true);
    expect(campaignPart("pictures")).toBe(false);
  });

  it("Prayed by many is on only because his own rule now allows it, in his words and in this form", () => {
    // The part was built off and waited for this: CONTRIBUTING.md allowed no
    // list ordered by how many pray. If the exception is ever taken out of
    // his rule, this fails until the part is switched off again.
    const rule = readFileSync(join(ROOT, "CONTRIBUTING.md"), "utf8").replace(/\s+/g, " ");
    expect(rule).toContain("### On prayer, no figures at all");
    expect(rule).toContain("**One list is permitted, on the owner's word** (2026-11-10: \"rec yes to all\"");
    for (const promise of [
      "The order is shown; no figure ever is: no number of people, and no rank numeral.",
      "A campaign is listed only once five readers carry it",
      "It stands under the newest campaigns and never in their place",
      "a creator can keep a campaign out of it",
      "it is no precedent for a count beside an intention, anywhere",
    ]) {
      expect(rule, promise).toContain(promise);
    }
  });

  it("are the server's alone: the file loads only on the server, and nothing a reader's device runs reads it", () => {
    expect(source("lib/campaigns/parts.ts").startsWith('import "server-only";')).toBe(true);
    // No screen, and no file marked for the browser, names it.
    const naming: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) {
          if (e.name !== "__tests__" && e.name !== "node_modules") walk(rel);
        } else if (/\.tsx?$/.test(e.name)) {
          const src = source(rel);
          const browser = dir.startsWith("components") || /^\s*["']use client["']/.test(src);
          // By its full name anywhere, or as "./parts" from beside it.
          const names = /campaigns\/parts["']/.test(src) || (dir === "lib/campaigns" && /from ["']\.\/parts["']/.test(src));
          if (browser && names) naming.push(rel);
        }
      }
    };
    walk("components");
    walk("lib/campaigns");
    walk("app/(app)/campaigns");
    expect(naming).toEqual([]);
  });

  it("are told to an app with the answer that campaigns are open, and nowhere else", async () => {
    const told = async () => (await (await isOpen(new Request(`${SITE}/api/campaigns/open`))).json()) as { open: boolean; parts: Record<string, boolean> };
    __setCampaignPart("many", false);
    expect(await told()).toEqual({ open: true, parts: { many: false, pictures: false } });
    __setCampaignPart("many", true);
    expect(await told()).toEqual({ open: true, parts: { many: true, pictures: false } });
    // A reader campaigns are not open for is told nothing of the parts either.
    __setCampaignsOpening("testers");
    const res = await isOpen(new Request(`${SITE}/api/campaigns/open`));
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain("many");
  });
});

describe("what an app believes of a part", () => {
  const settle = () => new Promise((r) => setTimeout(r, 0));

  it("is no until the server has said yes", async () => {
    state.open.body = { open: true, parts: { many: true, pictures: false } };
    expect(campaignPartNow("many")).toBe(false);
    const stop = subscribeCampaignsOpen(() => {});
    expect(campaignPartNow("many")).toBe(false);
    await settle();
    expect(campaignsOpenNow()).toBe(true);
    expect(campaignPartNow("many")).toBe(true);
    expect(campaignPartNow("pictures")).toBe(false);
    stop();
  });

  it("is no when the server names no parts, names one it does not know, or says anything but a plain yes", async () => {
    for (const body of [{ open: true }, { open: true, parts: null }, { open: true, parts: { many: "yes", pictures: 1, other: true } }, { open: true, parts: ["many"] }]) {
      __forgetCampaignsOpen();
      state.open.body = body;
      const stop = subscribeCampaignsOpen(() => {});
      await settle();
      expect(campaignsOpenNow(), JSON.stringify(body)).toBe(true);
      expect(campaignPartNow("many"), JSON.stringify(body)).toBe(false);
      expect(campaignPartNow("pictures"), JSON.stringify(body)).toBe(false);
      stop();
    }
  });

  it("is no where campaigns are not open for this reader, whatever the answer carried", async () => {
    state.open = { status: 404, body: { error: "Not found.", parts: { many: true } } };
    const stop = subscribeCampaignsOpen(() => {});
    await settle();
    expect(campaignsOpenNow()).toBe(false);
    expect(campaignPartNow("many")).toBe(false);
    stop();
  });

  it("is no in a closed build, which asks nobody", async () => {
    __setCampaignsOpening("closed");
    state.open.body = { open: true, parts: { many: true, pictures: true } };
    const stop = subscribeCampaignsOpen(() => {});
    await settle();
    expect(campaignPartNow("many")).toBe(false);
    expect(await fetchMany("week")).toEqual([]);
    expect(state.asked).toEqual([]);
    stop();
  });
});

describe("Prayed by many, switched off", () => {
  beforeEach(() => __setCampaignPart("many", false));

  it("answers 404 and reads nothing, whoever asks and whatever campaigns' own switch says", async () => {
    state.admin = null;
    for (const opening of ["open", "testers", "closed"] as const) {
      __setCampaignsOpening(opening);
      expect((await titles()).status, opening).toBe(404);
    }
  });

  it("is not drawn by the board, which asks for it only once the server has said the part is on", () => {
    const part = source("components/campaigns/PrayedByMany.tsx");
    expect(part).toContain('const on = useCampaignPart("many");');
    expect(part).toContain("if (!on || !any) return null;");
    // Neither request is made before that.
    expect(part.match(/if \(!on\b/g)?.length).toBeGreaterThanOrEqual(3);
    // And the creator's row for it is behind the same answer.
    expect(source("components/campaigns/CampaignPage.tsx")).toContain("{running && manyOn ? (");
  });
});

describe("Prayed by many, switched on", () => {
  beforeEach(() => __setCampaignPart("many", true));

  it("is still closed where campaigns are closed, or not open for this reader", async () => {
    __setCampaignsOpening("closed");
    expect((await titles()).status).toBe(404);
    __setCampaignsOpening("testers");
    expect((await titles()).status).toBe(404);
  });

  it("orders campaigns by how many readers added them in the time asked, most first", async () => {
    carriedBy(running("Some"), 6);
    carriedBy(running("Most"), 9);
    carriedBy(running("More"), 7);
    expect((await titles()).titles).toEqual(["Most", "More", "Some"]);
  });

  it("counts every reader, past the thousand rows one request returns", async () => {
    // The API gives a thousand rows a request and says nothing when it stops
    // (lib/supabase/__tests__/rowCap.test.ts). Cut there, the newest thousand
    // rows would be 600 of one campaign and 400 of the other, and the board
    // would put the smaller first.
    w.maxRows = 1000;
    const older = running("Carried by 700, a little earlier");
    carriedBy(older, 700, 2);
    const newer = running("Carried by 600, just now");
    carriedBy(newer, 600, 0);
    expect(w.tables.prayer_campaign_prayers).toHaveLength(1300);
    expect((await titles()).titles).toEqual(["Carried by 700, a little earlier", "Carried by 600, just now"]);
  });

  it("counts only the time asked: a day, a week, a month, a year", async () => {
    const old = running("Carried last month");
    carriedBy(old, 8, 20);
    const fresh = running("Carried today");
    carriedBy(fresh, 5, 0);
    expect((await titles("day")).titles).toEqual(["Carried today"]);
    expect((await titles("week")).titles).toEqual(["Carried today"]);
    expect((await titles("month")).titles).toEqual(["Carried last month", "Carried today"]);
    expect((await titles("year")).titles).toEqual(["Carried last month", "Carried today"]);
    expect((await titles("ever")).status).toBe(400);
  });

  it("lists nothing under the floor, so the list never says who carries a small campaign", async () => {
    carriedBy(running("One short"), MANY_FLOOR - 1);
    carriedBy(running("At the floor"), MANY_FLOOR);
    expect((await titles()).titles).toEqual(["At the floor"]);
  });

  it("leaves out a campaign whose creator chose to stay out, one kept to a circle, one of July's, and one that waits or is over", async () => {
    carriedBy(running("Listed"), 6);
    carriedBy(running("Its creator stays out", { listed: false }), 9);
    carriedBy(running("A circle's", { audience: "circle" }), 9);
    carriedBy(running("July's", { days: null, ends_on: null, ends_at: null }), 9);
    carriedBy(running("Waiting", { status: "held" }), 9);
    carriedBy(running("Removed", { status: "removed" }), 9);
    carriedBy(running("Closed", { status: "answered" }), 9);
    carriedBy(running("Past its last day", { ends_at: plus(-1) }), 9);
    expect((await titles()).titles).toEqual(["Listed"]);
  });

  it("leaves out the campaigns of someone this reader has blocked or muted", async () => {
    carriedBy(running("Anna's"), 9);
    carriedBy(running("Ben's own", { creator_id: BEN }), 6);
    w.tables.community_blocks!.push({ blocker_id: BEN, blocked_id: ANNA, created_at: new Date().toISOString() });
    expect((await titles()).titles).toEqual(["Ben's own"]);
    signIn(null);
    __forgetMany();
    expect((await titles()).titles).toEqual(["Anna's", "Ben's own"]);
  });

  it("hands on an order and never a figure: no count, no rank, no account", async () => {
    const most = running("Most");
    carriedBy(most, 9);
    carriedBy(running("Some"), 6);
    const res = await many(new Request(`${SITE}/api/campaigns/many?span=week`));
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const text = await res.text();
    const body = JSON.parse(text) as { campaigns: Record<string, unknown>[] };
    expect(Object.keys(body)).toEqual(["campaigns"]);
    // Each is the board's own row and nothing more.
    const one = (await (await getOne(new Request(`${SITE}/api/campaigns/${most}`), params(most))).json()) as { campaign: Record<string, unknown> };
    expect(Object.keys(body.campaigns[0]).sort()).toEqual(Object.keys(one.campaign).sort());
    expect(text).not.toMatch(/count|rank|tally|readers|joined|"n"/i);
    expect(text).not.toContain(ANNA);
    // The only number anywhere in it is a campaign's own length in days.
    const numbers: number[] = [];
    const gather = (v: unknown) => {
      if (typeof v === "number") numbers.push(v);
      else if (Array.isArray(v)) v.forEach(gather);
      else if (v && typeof v === "object") Object.values(v).forEach(gather);
    };
    gather(body);
    expect(numbers).toEqual([7, 7]);
  });

  it("holds the list to a dozen", async () => {
    for (let i = 0; i < MANY_SHOWN + 5; i++) carriedBy(running(`Campaign ${i}`), MANY_FLOOR + i);
    expect((await titles()).titles).toHaveLength(MANY_SHOWN);
  });

  it("keeps the order for a minute, so the board cannot be used to watch one reader join", async () => {
    const a = running("A");
    carriedBy(a, 6);
    carriedBy(running("B"), 5);
    expect((await titles()).titles).toEqual(["A", "B"]);
    // Readers join B: the order does not move within the minute.
    carriedBy(w.tables.prayer_campaigns!.find((c) => c.title === "B")!.id as string, 4);
    expect((await titles()).titles).toEqual(["A", "B"]);
    __forgetMany();
    expect((await titles()).titles).toEqual(["B", "A"]);
  });
});

describe("a creator stays out of it", () => {
  it("by their own switch, which only they can turn and only they are told of", async () => {
    const id = running("For Maria");
    const turn = (listed: boolean) => patchOne(new Request(`${SITE}/api/campaigns/${id}`, json({ listed }, "PATCH")), params(id));
    expect((await turn(false)).status).toBe(403);
    signIn(ANNA);
    expect((await turn(false)).status).toBe(200);
    expect(w.tables.prayer_campaigns![0].listed).toBe(false);
    const mine = (await (await getOne(new Request(`${SITE}/api/campaigns/${id}`), params(id))).json()) as { campaign: Record<string, unknown> };
    expect(mine.campaign.listed).toBe(false);
    signIn(BEN);
    const theirs = (await (await getOne(new Request(`${SITE}/api/campaigns/${id}`), params(id))).json()) as { campaign: Record<string, unknown> };
    expect("listed" in theirs.campaign).toBe(false);
  });
});
