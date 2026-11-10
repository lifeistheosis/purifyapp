import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { client, REWORK_COLUMNS, world, type Row, type World } from "@/lib/security/__tests__/fakeSupabase";

/**
 * The reworked campaign routes, run for real against an in-memory Supabase:
 * the open check, the board, starting one, one campaign, joining, the
 * device's state route, reporting, and the moderators' decisions.
 *
 * None of this can be walked in a browser before release day: the routes are
 * closed, and the columns they read are not on production until the owner
 * has signed and run their SQL (docs/1.9-build/notes/campaigns-fable.md,
 * 5.2). So this is where they are exercised.
 *
 * What would go wrong if these broke: a campaign anyone can read before a
 * moderator has; a creator's account id or a count of who prays in a
 * response; a closed switch that still answers; a tester's door open to
 * everyone; a report that silences a campaign a moderator has already
 * cleared.
 */

const state = vi.hoisted(() => ({
  admin: null as unknown,
  user: null as null | { id: string; email: string; created_at: string; user_metadata: Record<string, unknown> },
  admins: new Set<string>(),
  trust: { level: "member", limits: {}, facts: { accountAgeMs: 90 * 86_400_000, contributions: 0, removals30d: 0, removals90d: 0, staff: false } },
  masked: new Map<string, string>(),
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => state.admin }));
vi.mock("@/lib/supabase/server", () => ({
  createClientFromRequest: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }), getSession: async () => ({ data: { session: null } }) },
  }),
}));
vi.mock("@/lib/security/ratelimit", () => ({ rateLimited: async () => false, ipKey: () => "test" }));
vi.mock("@/lib/admin/access", () => ({ isAdminEmail: (email?: string | null) => Boolean(email && state.admins.has(email)) }));
vi.mock("@/lib/community/adminStanding", () => ({ requestStanding: async () => "reader", standingOf: () => "reader" }));
vi.mock("@/lib/community/trustServer", () => ({
  readTrust: async () => state.trust,
  staffAmong: async () => new Set<string>(),
  STAFF_BADGES: ["team", "moderator"],
}));
// The word filter, standing in: it masks the words a case lists.
vi.mock("@/lib/moderation/server", () => {
  const mask = (text: string | null | undefined) => {
    if (!text) return { text: text ?? null, hits: 0 };
    let out = text;
    let hits = 0;
    for (const [word, stars] of state.masked) {
      if (out.includes(word)) {
        out = out.split(word).join(stars);
        hits++;
      }
    }
    return { text: out, hits };
  };
  return {
    censorPost: async (_admin: unknown, input: { title?: string | null; body?: string | null }) => {
      const t = mask(input.title);
      const b = mask(input.body);
      return { title: t.text, body: b.text, hits: t.hits + b.hits };
    },
    censorName: async (_admin: unknown, name: string) => mask(name).text,
    getBlockedHosts: async () => [],
  };
});
vi.mock("@/lib/profile/server", () => ({ ensureCleanHandle: async () => {}, identity: async () => ({ name: "Moderator" }) }));
vi.mock("@/lib/profile/bannerFile", () => ({ deleteBannerFiles: async () => {} }));
vi.mock("@/lib/community/notify", () => ({
  insertNotifications: async () => {},
  notifyClergyOfQuestion: async () => {},
  notifyMentions: async () => {},
  notifyOfReply: async () => {},
}));

import { GET as getOne, PATCH as patchOne } from "@/app/api/campaigns/[id]/route";
import { DELETE as leave, POST as join } from "@/app/api/campaigns/[id]/join/route";
import { POST as report } from "@/app/api/campaigns/[id]/report/route";
import { GET as mine } from "@/app/api/campaigns/mine/route";
import { GET as isOpen } from "@/app/api/campaigns/open/route";
import { GET as board, POST as create } from "@/app/api/campaigns/route";
import { POST as states } from "@/app/api/campaigns/state/route";
import { __setCampaignsOpening } from "@/lib/campaigns/flags";
import { approveCampaign, dismissCampaignReport, removeCampaign, restoreCampaign } from "@/lib/campaigns/moderation";
import type { ModActor } from "@/lib/community/moderation";

const ANNA = "11111111-1111-4111-8111-111111111111";
const BEN = "22222222-2222-4222-8222-222222222222";
const CARA = "33333333-3333-4333-8333-333333333333";
const DAN = "44444444-4444-4444-8444-444444444444";
const EDGAR = "55555555-5555-4555-8555-555555555555";
const SITE = "https://purifyapp.net";
const MOD: ModActor = { id: EDGAR, name: "Edgar", email: "edgar@example.com", admin: true };
const DAY = 86_400_000;

let w: World;

function signIn(id: string | null, ageDays = 90) {
  state.user = id
    ? {
        id,
        email: id === EDGAR ? "edgar@example.com" : `${id.slice(0, 4)}@example.com`,
        created_at: new Date(Date.now() - ageDays * DAY).toISOString(),
        user_metadata: { display_name: id === ANNA ? "Anna" : "Reader" },
      }
    : null;
}

const today = () => new Date().toISOString().slice(0, 10);
const plus = (days: number) => new Date(Date.now() + days * DAY).toISOString();

beforeEach(() => {
  w = world();
  w.users = new Set([ANNA, BEN, CARA, DAN, EDGAR]);
  w.tables.prayer_campaign_prayers = [];
  w.tables.prayer_campaign_reports = [];
  w.tables.community_blocks = [];
  w.tables.community_mutes = [];
  w.tables.community_mod_log = [];
  w.tables.profiles = [ANNA, BEN, CARA, DAN, EDGAR].map((id) => ({ id, handle: id === ANNA ? "anna" : null, joined_at: new Date(Date.now() - 90 * DAY).toISOString() }));
  state.admin = client(w);
  state.admins = new Set(["edgar@example.com"]);
  state.trust = { level: "member", limits: {}, facts: { accountAgeMs: 90 * DAY, contributions: 0, removals30d: 0, removals90d: 0, staff: false } };
  state.masked = new Map();
  __setCampaignsOpening("open");
  signIn(ANNA);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  __setCampaignsOpening("closed");
  vi.restoreAllMocks();
});

const json = (body: unknown, method = "POST") => ({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const campaigns = () => w.tables.prayer_campaigns!;
const byId = (id: string) => campaigns().find((r) => r.id === id) as Row;

const FOR_NICHOLAS = {
  forWhom: "departed",
  kind: "departed",
  title: "Forty days for Nicholas",
  name: "Nicholas",
  words: "Pray with us for our father, who fell asleep on Sunday.",
  days: 40,
  consent: "family",
  blessing: true,
  rules: true,
  termsAccepted: true,
};
const start = (over: Record<string, unknown> = {}) => create(new Request(`${SITE}/api/campaigns`, json({ ...FOR_NICHOLAS, startsOn: today(), ...over })));

/** A campaign as the table holds one that a moderator has read. */
function running(creator: string, over: Row = {}): string {
  const id = crypto.randomUUID();
  campaigns().push({
    id,
    creator_id: creator,
    title: "For Maria",
    intention: "healing",
    for_whom: "living",
    subject_name: "Maria",
    details: "She is ill.",
    note: null,
    days: 7,
    starts_on: today(),
    ends_on: new Date(Date.now() + 6 * DAY).toISOString().slice(0, 10),
    ends_at: plus(7),
    prayer_rule: null,
    prayer_id: null,
    status: "active",
    audience: "public",
    creator_name: "Anna",
    creator_handle: "anna",
    created_at: new Date().toISOString(),
    held_reason: null,
    mod_cleared_at: null,
    keep_after_end: false,
    praying_count: 0,
    prayer_count: 0,
    ...over,
  });
  return id;
}

describe("the switch", () => {
  const every = async (): Promise<number[]> => {
    const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    return Promise.all([
      isOpen(new Request(`${SITE}/api/campaigns/open`)),
      board(new Request(`${SITE}/api/campaigns`)),
      start(),
      getOne(new Request(`${SITE}/api/campaigns/${id}`), params(id)),
      patchOne(new Request(`${SITE}/api/campaigns/${id}`, json({ status: "answered" }, "PATCH")), params(id)),
      join(new Request(`${SITE}/api/campaigns/${id}/join`, json({ places: ["evening"] })), params(id)),
      leave(new Request(`${SITE}/api/campaigns/${id}/join`, { method: "DELETE" }), params(id)),
      report(new Request(`${SITE}/api/campaigns/${id}/report`, json({ reason: "unkind" })), params(id)),
      mine(new Request(`${SITE}/api/campaigns/mine`)),
      states(new Request(`${SITE}/api/campaigns/state`, json({ ids: [id] }))),
    ]).then((all) => all.map((r) => r.status));
  };

  it("closed: every route answers 404 and the database is never asked", async () => {
    __setCampaignsOpening("closed");
    // No database at all: a route that reached for one would throw.
    state.admin = null;
    expect(await every()).toEqual(Array(10).fill(404));
  });

  it("testers first: open for an admin's account, and a 404 for everyone else", async () => {
    __setCampaignsOpening("testers");
    signIn(EDGAR);
    expect((await isOpen(new Request(`${SITE}/api/campaigns/open`))).status).toBe(200);
    expect((await board(new Request(`${SITE}/api/campaigns`))).status).toBe(200);
    signIn(BEN);
    expect(await every()).toEqual(Array(10).fill(404));
    signIn(null);
    expect(await every()).toEqual(Array(10).fill(404));
    expect(campaigns()).toEqual([]);
  });

  it("open: for every reader, signed in or not", async () => {
    signIn(null);
    const res = await isOpen(new Request(`${SITE}/api/campaigns/open`));
    expect(res.status).toBe(200);
    // With the parts that ship switched off, each said to be off (parts.test.ts).
    expect(await res.json()).toEqual({ open: true, parts: { many: false, pictures: false } });
    expect((await board(new Request(`${SITE}/api/campaigns`))).status).toBe(200);
  });

  it("answers 404 while the rework's SQL has not run, whatever the switch says", async () => {
    w.missing = { ...REWORK_COLUMNS };
    const id = running(ANNA);
    expect((await board(new Request(`${SITE}/api/campaigns`))).status).toBe(404);
    expect((await getOne(new Request(`${SITE}/api/campaigns/${id}`), params(id))).status).toBe(404);
    expect((await start()).status).toBe(404);
    expect((await mine(new Request(`${SITE}/api/campaigns/mine`))).status).toBe(404);
  });
});

describe("starting a campaign", () => {
  it("is written held, with its days, its blessing and its creator as Community shows them", async () => {
    const res = await start();
    expect(res.status).toBe(200);
    const { id, held } = (await res.json()) as { id: string; held: boolean };
    expect(held).toBe(true);
    const row = byId(id);
    const last = new Date(Date.parse(`${today()}T12:00:00Z`) + 39 * DAY).toISOString().slice(0, 10);
    expect(row).toMatchObject({
      creator_id: ANNA,
      title: "Forty days for Nicholas",
      intention: "departed",
      for_whom: "departed",
      subject_name: "Nicholas",
      details: FOR_NICHOLAS.words,
      days: 40,
      starts_on: today(),
      ends_on: last,
      prayer_rule: null,
      prayer_id: null,
      audience: "public",
      creator_name: "Anna",
      creator_handle: "anna",
      consent_kind: "family",
      status: "held",
      held_reason: "new",
    });
    expect(typeof row.consent_at).toBe("string");
    // The Terms, accepted in the same breath: one moment, kept twice.
    expect(row.terms_accepted_at).toBe(row.consent_at);
    // Noon UTC of the day after its last day.
    expect(row.ends_at).toBe(new Date(Date.parse(`${last}T12:00:00Z`) + DAY).toISOString());
  });

  it("is not started without the Terms of Service accepted, and nothing is written", async () => {
    // His word, 2026-11-10: whoever makes a campaign accepts the Terms, so
    // it is their own and not Purify's. Literally true, as checkout's is.
    for (const termsAccepted of [undefined, false, "true", 1, null]) {
      const res = await start({ termsAccepted });
      expect(res.status, String(termsAccepted)).toBe(400);
    }
    expect(campaigns()).toEqual([]);
  });

  it("keeps the moment the Terms were accepted by its own clock, never the sender's", async () => {
    const before = Date.now();
    const res = await start({ terms_accepted_at: "2020-01-01T00:00:00.000Z", termsAcceptedAt: "2020-01-01T00:00:00.000Z" });
    expect(res.status).toBe(200);
    const { id } = (await res.json()) as { id: string };
    const kept = Date.parse(byId(id).terms_accepted_at as string);
    expect(kept).toBeGreaterThanOrEqual(before - 1000);
    expect(kept).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it("starts no campaign where the acceptance cannot be kept: its SQL, file four, has not run", async () => {
    // Files one to three have run and file four has not. A campaign with no
    // record of its acceptance is the one thing this must never make, so the
    // route answers as a closed door does and writes nothing.
    w.missing = { prayer_campaigns: ["terms_accepted_at"] };
    expect((await start()).status).toBe(404);
    expect(campaigns()).toEqual([]);
  });

  it("is on no board, and nobody's to open but its creator's, until a moderator has read it", async () => {
    const { id } = (await (await start()).json()) as { id: string };
    const listed = (await (await board(new Request(`${SITE}/api/campaigns`))).json()) as { campaigns: unknown[] };
    expect(listed.campaigns).toEqual([]);
    const own = await getOne(new Request(`${SITE}/api/campaigns/${id}`), params(id));
    expect(own.status).toBe(200);
    expect(((await own.json()) as { campaign: { status: string; mine: boolean } }).campaign).toMatchObject({ status: "held", mine: true });
    signIn(BEN);
    expect((await getOne(new Request(`${SITE}/api/campaigns/${id}`), params(id))).status).toBe(404);
    signIn(null);
    expect((await getOne(new Request(`${SITE}/api/campaigns/${id}`), params(id))).status).toBe(404);
  });

  it("needs an account", async () => {
    signIn(null);
    expect((await start()).status).toBe(401);
    expect(campaigns()).toEqual([]);
  });

  it("carries a psalm the prayer book holds for the living, and no other prayer", async () => {
    const living = { forWhom: "living", kind: "healing", consent: "blessing", title: "For Maria", name: "Maria", days: 7 };
    const res = await start({ ...living, prayer: { rule: "protection", id: "psalm-90" } });
    expect(res.status).toBe(200);
    expect(byId(((await res.json()) as { id: string }).id)).toMatchObject({ prayer_rule: "protection", prayer_id: "psalm-90" });
    signIn(BEN);
    const bad = await start({ ...living, prayer: { rule: "morning", id: "our-father" } });
    expect(bad.status).toBe(400);
    expect(((await bad.json()) as { code: string }).code).toBe("bad_prayer");
  });

  it("refuses a link anywhere in it", async () => {
    for (const over of [{ words: "See https://example.com/give for more." }, { title: "Help at example.com/give" }, { name: "www.example.com" }]) {
      const res = await start(over);
      expect(res.status, JSON.stringify(over)).toBe(400);
      expect(((await res.json()) as { code: string }).code).toBe("campaign_link");
    }
    expect(campaigns()).toEqual([]);
  });

  it("refuses a first day that is not today anywhere", async () => {
    const res = await start({ startsOn: new Date(Date.now() + 5 * DAY).toISOString().slice(0, 10) });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe("bad_day");
  });

  it("asks before masking a listed word, and keeps the masked words when told to go on", async () => {
    state.masked = new Map([["damn", "****"]]);
    const first = await start({ words: "This damn illness." });
    expect(first.status).toBe(409);
    const asked = (await first.json()) as { code: string; preview: { words: string } };
    expect(asked.code).toBe("filtered");
    expect(asked.preview.words).toBe("This **** illness.");
    expect(campaigns()).toEqual([]);
    const second = await start({ words: "This damn illness.", confirmFiltered: true });
    expect(second.status).toBe(200);
    const row = byId(((await second.json()) as { id: string }).id);
    expect(row.details).toBe("This **** illness.");
    expect(row.held_reason).toBe("new; words (1 masked)");
  });

  it("tells the moderator what the filters saw: money, a phone number, an address, a writer who may be in danger", async () => {
    const reason = async (words: string) => {
      campaigns().length = 0;
      const res = await start({ words });
      expect(res.status).toBe(200);
      return byId(((await res.json()) as { id: string }).id).held_reason as string;
    };
    expect(await reason("Send what you can by cash app, any amount helps.")).toContain("money");
    expect(await reason("Call the family on +1 (305) 555-0100 to help.")).toContain("phone");
    expect(await reason("Visit us at 12 Olive Tree Street after the service.")).toContain("address");
    expect(await reason("I do not want to live any more. Pray for me.")).toMatch(/^new; crisis/);
    expect(await reason("Pray with us for our father.")).toBe("new");
  });

  it("holds an account to one running campaign in its first day, and to three after", async () => {
    state.trust = { ...state.trust, level: "new", facts: { ...state.trust.facts, accountAgeMs: 3 * 3_600_000 } };
    expect((await start()).status).toBe(200);
    const second = await start({ title: "Another one", name: "Maria" });
    expect(second.status).toBe(409);
    expect(((await second.json()) as { code: string }).code).toBe("campaigns_running");

    signIn(BEN);
    state.trust = { ...state.trust, level: "member", facts: { ...state.trust.facts, accountAgeMs: 90 * DAY } };
    for (let i = 0; i < 3; i++) expect((await start({ title: `Campaign ${i + 1}` })).status).toBe(200);
    expect((await start({ title: "A fourth" })).status).toBe(409);
    // One that is over does not count against the three.
    campaigns().find((r) => r.creator_id === BEN)!.status = "ended";
    expect((await start({ title: "A fourth" })).status).toBe(200);
  });
});

describe("the board", () => {
  it("lists what is running and public, newest first, and nothing else", async () => {
    const older = running(ANNA, { title: "Older", created_at: new Date(Date.now() - 3_600_000).toISOString() });
    const newer = running(BEN, { title: "Newer" });
    running(ANNA, { title: "Waiting", status: "held" });
    running(ANNA, { title: "Removed", status: "removed" });
    running(ANNA, { title: "Closed", status: "answered" });
    running(ANNA, { title: "Past its last day", ends_at: plus(-1) });
    running(ANNA, { title: "A circle's", audience: "circle" });
    signIn(null);
    const res = await board(new Request(`${SITE}/api/campaigns`));
    const { campaigns: list } = (await res.json()) as { campaigns: { id: string; title: string }[] };
    expect(list.map((c) => c.id)).toEqual([newer, older]);
  });

  it("never carries a creator's account id or a count of anyone", async () => {
    running(ANNA, { praying_count: 41, prayer_count: 900 });
    signIn(BEN);
    const text = await (await board(new Request(`${SITE}/api/campaigns`))).text();
    expect(text).not.toContain(ANNA);
    expect(text).not.toMatch(/creator_id|praying_count|prayer_count|held_reason|consent/);
    // The only figure a campaign carries is its own length.
    const shown = (JSON.parse(text) as { campaigns: Record<string, unknown>[] }).campaigns[0];
    expect(Object.entries(shown).filter(([, v]) => typeof v === "number").map(([k]) => k)).toEqual(["days"]);
  });

  it("says which are the reader's own, and is never a shared cache's", async () => {
    running(ANNA);
    const res = await board(new Request(`${SITE}/api/campaigns`));
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(((await res.json()) as { campaigns: { mine: boolean }[] }).campaigns[0].mine).toBe(true);
    signIn(BEN);
    expect(((await (await board(new Request(`${SITE}/api/campaigns`))).json()) as { campaigns: { mine: boolean }[] }).campaigns[0].mine).toBe(false);
  });

  it("leaves out the campaigns of someone the reader has blocked or muted, and their page with them", async () => {
    const annas = running(ANNA, { title: "Anna's" });
    const caras = running(CARA, { title: "Cara's" });
    running(DAN, { title: "Dan's" });
    w.tables.community_blocks!.push({ blocker_id: BEN, blocked_id: ANNA });
    w.tables.community_mutes!.push({ muter_id: BEN, muted_id: CARA });
    signIn(BEN);
    const { campaigns: list } = (await (await board(new Request(`${SITE}/api/campaigns`))).json()) as { campaigns: { title: string }[] };
    expect(list.map((c) => c.title)).toEqual(["Dan's"]);
    expect((await getOne(new Request(`${SITE}/api/campaigns/${annas}`), params(annas))).status).toBe(404);
    expect((await getOne(new Request(`${SITE}/api/campaigns/${caras}`), params(caras))).status).toBe(404);
  });
});

describe("one campaign", () => {
  it("opens for anyone while it runs and once it has ended, and for nobody once removed or kept to a circle", async () => {
    signIn(null);
    for (const [over, status] of [
      [{}, 200],
      [{ status: "ended" }, 200],
      [{ status: "memory_eternal" }, 200],
      [{ status: "removed" }, 404],
      [{ audience: "circle" }, 404],
    ] as const) {
      const id = running(ANNA, over);
      expect((await getOne(new Request(`${SITE}/api/campaigns/${id}`), params(id))).status, JSON.stringify(over)).toBe(status);
    }
    expect((await getOne(new Request(`${SITE}/api/campaigns/nope`), params("nope"))).status).toBe(404);
  });

  it("is closed early by its creator alone, with one of the two closings, and only while it runs", async () => {
    const id = running(ANNA);
    const close = (status: string) => patchOne(new Request(`${SITE}/api/campaigns/${id}`, json({ status }, "PATCH")), params(id));
    signIn(BEN);
    expect((await close("answered")).status).toBe(403);
    signIn(ANNA);
    expect((await close("removed")).status).toBe(400);
    expect((await close("answered")).status).toBe(200);
    expect(byId(id)).toMatchObject({ status: "answered" });
    expect(typeof byId(id).ended_at).toBe("string");
    expect((await close("memory_eternal")).status).toBe(409);
  });

  it("lets its creator keep it on their profile once it has ended", async () => {
    const id = running(ANNA, { for_whom: "departed", intention: "departed" });
    const res = await patchOne(new Request(`${SITE}/api/campaigns/${id}`, json({ keepAfterEnd: true }, "PATCH")), params(id));
    expect(res.status).toBe(200);
    expect(byId(id).keep_after_end).toBe(true);
    // Whether it is kept is its creator's own setting: told to them, and to nobody else.
    const asCreator = (await (await getOne(new Request(`${SITE}/api/campaigns/${id}`), params(id))).json()) as { campaign: Record<string, unknown> };
    expect(asCreator.campaign.keep_after_end).toBe(true);
    signIn(BEN);
    const asReader = (await (await getOne(new Request(`${SITE}/api/campaigns/${id}`), params(id))).json()) as { campaign: Record<string, unknown> };
    expect(asReader.campaign).not.toHaveProperty("keep_after_end");
  });
});

describe("carrying one, signed in", () => {
  const joins = () => w.tables.prayer_campaign_prayers!;

  it("keeps the reader's own choice of prayers and of days on their own row, and counts nothing", async () => {
    const id = running(ANNA);
    signIn(BEN);
    const soon = new Date(Date.now() + 2 * DAY).toISOString().slice(0, 10);
    expect((await join(new Request(`${SITE}/api/campaigns/${id}/join`, json({ places: ["evening", "mine"], until: soon })), params(id))).status).toBe(200);
    expect(joins()).toMatchObject([{ campaign_id: id, user_id: BEN, places: ["evening", "mine"], until_on: soon }]);
    // Again, with another choice: the same row, not a second.
    expect((await join(new Request(`${SITE}/api/campaigns/${id}/join`, json({ places: ["morning"] })), params(id))).status).toBe(200);
    expect(joins()).toMatchObject([{ campaign_id: id, user_id: BEN, places: ["morning"], until_on: null }]);
    expect(byId(id)).toMatchObject({ praying_count: 0, prayer_count: 0 });
  });

  it("keeps no day past the campaign's own, and takes no prayer the app does not have", async () => {
    const id = running(ANNA);
    signIn(BEN);
    await join(new Request(`${SITE}/api/campaigns/${id}/join`, json({ places: ["evening"], until: "2099-01-01" })), params(id));
    expect(joins()[0].until_on).toBeNull();
    expect((await join(new Request(`${SITE}/api/campaigns/${id}/join`, json({ places: ["dinner"] })), params(id))).status).toBe(400);
    expect((await join(new Request(`${SITE}/api/campaigns/${id}/join`, json({ places: [] })), params(id))).status).toBe(400);
  });

  it("is refused for one that is waiting, over or gone, and needs an account", async () => {
    signIn(BEN);
    for (const over of [{ status: "held" }, { status: "removed" }] as const) {
      const id = running(ANNA, over);
      expect((await join(new Request(`${SITE}/api/campaigns/${id}/join`, json({ places: ["evening"] })), params(id))).status).toBe(404);
    }
    const ended = running(ANNA, { status: "ended" });
    expect((await join(new Request(`${SITE}/api/campaigns/${ended}/join`, json({ places: ["evening"] })), params(ended))).status).toBe(409);
    const id = running(ANNA);
    signIn(null);
    expect((await join(new Request(`${SITE}/api/campaigns/${id}/join`, json({ places: ["evening"] })), params(id))).status).toBe(401);
    expect(joins()).toEqual([]);
  });

  it("is taken out by the reader's own hand, whatever state the campaign is in", async () => {
    const id = running(ANNA);
    signIn(BEN);
    await join(new Request(`${SITE}/api/campaigns/${id}/join`, json({ places: ["evening"] })), params(id));
    byId(id).status = "removed";
    expect((await leave(new Request(`${SITE}/api/campaigns/${id}/join`, { method: "DELETE" }), params(id))).status).toBe(200);
    expect(joins()).toEqual([]);
  });

  it("follows the reader to another device: their own rows, and only those still running", async () => {
    const maria = running(ANNA, { title: "For Maria" });
    const over = running(ANNA, { title: "Over", status: "ended" });
    const cara = running(ANNA, { title: "Cara's" });
    joins().push(
      { campaign_id: maria, user_id: BEN, places: ["evening"], until_on: null, joined_at: "2026-11-10T00:00:00Z" },
      { campaign_id: over, user_id: BEN, places: ["evening"], until_on: null, joined_at: "2026-11-09T00:00:00Z" },
      { campaign_id: cara, user_id: CARA, places: ["morning"], until_on: null, joined_at: "2026-11-10T00:00:00Z" },
    );
    const mineStarted = running(BEN, { title: "Ben's own", status: "held" });
    signIn(BEN);
    const res = await mine(new Request(`${SITE}/api/campaigns/mine`));
    const body = (await res.json()) as { started: { id: string }[]; carried: { campaign: { id: string }; places: string[] }[]; signedIn: boolean };
    expect(body.signedIn).toBe(true);
    expect(body.carried.map((c) => c.campaign.id)).toEqual([maria]);
    expect(body.carried[0].places).toEqual(["evening"]);
    expect(body.started.map((c) => c.id)).toEqual([mineStarted]);
    expect(JSON.stringify(body)).not.toContain(CARA);
    signIn(null);
    expect(await (await mine(new Request(`${SITE}/api/campaigns/mine`))).json()).toEqual({ started: [], carried: [], signedIn: false });
  });
});

describe("July's campaigns", () => {
  // July's rows are still in the table: public then, with no last day, and
  // never read by a moderator. The rework runs none of them. What would go
  // wrong if this broke: on the day campaigns open, a months-old campaign for
  // someone's illness stands on the board with no end and no moderator's
  // reading, and a reader who tapped "prayed" once in July finds a stranger's
  // name among those they carry.
  /** A campaign as July left it: running, by its row, with no length. */
  const ofJuly = (creator: string, over: Row = {}) => running(creator, { title: "From July", days: null, starts_on: null, ends_on: null, ends_at: null, ...over });

  it("is on no board, with a last day or without", async () => {
    ofJuly(ANNA);
    ofJuly(ANNA, { ends_at: plus(30) });
    const ours = running(BEN);
    for (const reader of [null, BEN, ANNA]) {
      signIn(reader);
      const { campaigns: list } = (await (await board(new Request(`${SITE}/api/campaigns`))).json()) as { campaigns: { id: string }[] };
      expect(list.map((c) => c.id), String(reader)).toEqual([ours]);
    }
  });

  it("opens for nobody but the reader who started it, who finds it ended and can take it down", async () => {
    const id = ofJuly(ANNA);
    for (const reader of [null, BEN]) {
      signIn(reader);
      expect((await getOne(new Request(`${SITE}/api/campaigns/${id}`), params(id))).status, String(reader)).toBe(404);
    }
    signIn(ANNA);
    const res = await getOne(new Request(`${SITE}/api/campaigns/${id}`), params(id));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { campaign: { status: string; mine: boolean; days: number | null } }).campaign).toMatchObject({ status: "ended", mine: true, days: null });
    const own = (await (await mine(new Request(`${SITE}/api/campaigns/mine`))).json()) as { started: { id: string; status: string }[]; carried: unknown[] };
    expect(own.started).toMatchObject([{ id, status: "ended" }]);
    // The row is left exactly as it was.
    expect(byId(id)).toMatchObject({ status: "active", days: null });
  });

  it("is joined by nobody, closed by nobody and reported by nobody", async () => {
    const id = ofJuly(ANNA);
    signIn(BEN);
    expect((await join(new Request(`${SITE}/api/campaigns/${id}/join`, json({ places: ["evening"] })), params(id))).status).toBe(404);
    expect((await report(new Request(`${SITE}/api/campaigns/${id}/report`, json({ reason: "unkind" })), params(id))).status).toBe(404);
    signIn(ANNA);
    expect((await join(new Request(`${SITE}/api/campaigns/${id}/join`, json({ places: ["evening"] })), params(id))).status).toBe(409);
    expect((await patchOne(new Request(`${SITE}/api/campaigns/${id}`, json({ status: "answered" }, "PATCH")), params(id))).status).toBe(409);
    expect(w.tables.prayer_campaign_prayers).toEqual([]);
    expect(byId(id).status).toBe("active");
  });

  it("is carried by nobody: a tap on \"prayed\" in July was no choice to carry a name", async () => {
    const id = ofJuly(ANNA);
    w.tables.prayer_campaign_prayers!.push(
      { campaign_id: id, user_id: BEN, places: null, until_on: null, joined_at: "2026-07-20T00:00:00Z" },
      { campaign_id: id, user_id: ANNA, places: null, until_on: null, joined_at: "2026-07-20T00:00:00Z" },
    );
    for (const reader of [BEN, ANNA]) {
      signIn(reader);
      const body = (await (await mine(new Request(`${SITE}/api/campaigns/mine`))).json()) as { carried: unknown[] };
      expect(body.carried, reader).toEqual([]);
    }
    signIn(null);
    const told = (await (await states(new Request(`${SITE}/api/campaigns/state`, json({ ids: [id] })))).json()) as { states: Record<string, string> };
    expect(told.states[id]).toBe("over");
  });

  it("does not count against the campaigns its creator may have running", async () => {
    // An account in its first day may have one. One of July's is not that one.
    state.trust = { ...state.trust, level: "new", facts: { ...state.trust.facts, accountAgeMs: 3 * 3_600_000 } };
    ofJuly(ANNA);
    expect((await start()).status).toBe(200);
    expect((await start({ title: "Another one", name: "Maria" })).status).toBe(409);
  });
});

describe("what a device asks", () => {
  it("is told which of the campaigns it carries still run, and nothing more", async () => {
    const run = running(ANNA);
    const waiting = running(ANNA, { status: "held", mod_cleared_at: null });
    const closed = running(ANNA, { status: "memory_eternal" });
    const past = running(ANNA, { ends_at: plus(-1) });
    const removed = running(ANNA, { status: "removed" });
    const never = "99999999-9999-4999-8999-999999999999";
    signIn(null);
    const res = await states(new Request(`${SITE}/api/campaigns/state`, json({ ids: [run, waiting, closed, past, removed, never] })));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({
      states: { [run]: "running", [waiting]: "running", [closed]: "over", [past]: "over", [removed]: "gone", [never]: "gone" },
    });
    expect(text).not.toContain(ANNA);
    expect(text).not.toContain("Maria");
  });

  it("takes ids and nothing else, and not too many", async () => {
    expect((await states(new Request(`${SITE}/api/campaigns/state`, json({ ids: ["nope"] })))).status).toBe(400);
    expect((await states(new Request(`${SITE}/api/campaigns/state`, json({ ids: [] })))).status).toBe(400);
    expect((await states(new Request(`${SITE}/api/campaigns/state`, json({ ids: Array.from({ length: 25 }, () => crypto.randomUUID()) })))).status).toBe(400);
  });
});

describe("reports", () => {
  const reports = () => w.tables.prayer_campaign_reports!;
  const send = (id: string, reason: string, words?: string) =>
    report(new Request(`${SITE}/api/campaigns/${id}/report`, json({ reason, words })), params(id));

  it("keeps a reason to tick and the reader's words, once a reader", async () => {
    const id = running(ANNA);
    signIn(BEN);
    expect((await send(id, "money", "It asks for donations.")).status).toBe(200);
    expect((await send(id, "money", "Again.")).status).toBe(200);
    expect(reports()).toHaveLength(1);
    expect(reports()[0]).toMatchObject({ campaign_id: id, reporter_id: BEN, reason_code: "money", reason: "It asks for donations.", status: "open", target_kind: "campaign" });
    expect(byId(id).status).toBe("active");
  });

  it("needs an account and a reason, and is not for one's own campaign", async () => {
    const id = running(ANNA);
    expect((await send(id, "unkind")).status).toBe(400);
    signIn(BEN);
    expect((await send(id, "because")).status).toBe(400);
    signIn(null);
    expect((await send(id, "unkind")).status).toBe(401);
    expect(reports()).toEqual([]);
  });

  it("hides it at once when someone says it is about them, and writes that in the log", async () => {
    const id = running(ANNA);
    signIn(BEN);
    const res = await send(id, "about_me", "That is my mother. Nobody asked us.");
    expect(res.status).toBe(200);
    // The reporter is told it was sent, and nothing about what happened next.
    expect(await res.json()).toEqual({ ok: true });
    expect(byId(id)).toMatchObject({ status: "held", held_reason: "reports; about_me" });
    expect(w.tables.community_mod_log).toMatchObject([{ action: "auto_hide", target_kind: "campaign", target_id: id, actor_name: "Auto-moderation" }]);
  });

  it("does not hide on that reason from an account made today", async () => {
    const id = running(ANNA);
    w.tables.profiles!.find((p) => p.id === BEN)!.joined_at = new Date(Date.now() - 3_600_000).toISOString();
    signIn(BEN, 0);
    await send(id, "about_me");
    expect(byId(id).status).toBe("active");
  });

  it("hides it when three readers report it, and not at two", async () => {
    const id = running(ANNA);
    signIn(BEN);
    await send(id, "unkind");
    signIn(CARA);
    await send(id, "not_prayer");
    expect(byId(id).status).toBe("active");
    signIn(DAN);
    await send(id, "money");
    expect(byId(id)).toMatchObject({ status: "held", held_reason: "reports (3)" });
  });

  it("cannot silence a campaign a moderator has read and kept", async () => {
    const id = running(ANNA, { mod_cleared_at: new Date().toISOString() });
    for (const who of [BEN, CARA, DAN]) {
      signIn(who);
      await send(id, "about_me");
    }
    expect(byId(id).status).toBe("active");
    expect(reports()).toHaveLength(3);
  });
});

describe("a moderator's decisions", () => {
  const log = () => w.tables.community_mod_log!.map((l) => l.action);

  it("approve puts a waiting campaign on the board: read, and not yet cleared against reports", async () => {
    signIn(ANNA);
    const { id } = (await (await start()).json()) as { id: string };
    expect(await approveCampaign(client(w) as never, MOD, id)).toEqual({ ok: true });
    expect(byId(id)).toMatchObject({ status: "active", held_reason: null });
    // Whoever reads a new campaign cannot know whether the person it names
    // agreed. So the first reading leaves reports able to hide it.
    expect(byId(id).mod_cleared_at).toBeNull();
    signIn(null);
    const { campaigns: list } = (await (await board(new Request(`${SITE}/api/campaigns`))).json()) as { campaigns: { id: string }[] };
    expect(list.map((c) => c.id)).toEqual([id]);
    expect(log()).toEqual(["approve_campaign"]);
    // Twice is refused: it is not waiting any more.
    expect(await approveCampaign(client(w) as never, MOD, id)).toMatchObject({ ok: false, status: 409 });
  });

  it("the whole way: read, reported by the person it names and hidden, kept by a moderator, and then not hidden again", async () => {
    // Every campaign is read before it is public, so the campaign a reader
    // can report has always been approved once. Until 2026-11-10 that first
    // approval cleared it, and no report could hide any campaign.
    signIn(ANNA);
    const { id } = (await (await start()).json()) as { id: string };
    expect(await approveCampaign(client(w) as never, MOD, id)).toEqual({ ok: true });
    const tell = (reason: string) => report(new Request(`${SITE}/api/campaigns/${id}/report`, json({ reason })), params(id));

    signIn(BEN);
    expect((await tell("about_me")).status).toBe(200);
    expect(byId(id)).toMatchObject({ status: "held", held_reason: "reports; about_me" });

    // A moderator looks, and keeps it: now it is cleared.
    expect(await approveCampaign(client(w) as never, MOD, id)).toEqual({ ok: true });
    expect(byId(id).status).toBe("active");
    expect(typeof byId(id).mod_cleared_at).toBe("string");
    expect(w.tables.prayer_campaign_reports!.map((r) => r.status)).toEqual(["dismissed"]);

    for (const who of [BEN, CARA, DAN]) {
      signIn(who);
      expect((await tell("about_me")).status).toBe(200);
    }
    expect(byId(id).status).toBe("active");
  });

  it("approve ends one whose days ran out while it waited, and does not put it up", async () => {
    const id = running(ANNA, { status: "held", ends_at: plus(-1) });
    expect(await approveCampaign(client(w) as never, MOD, id)).toEqual({ ok: true });
    expect(byId(id).status).toBe("ended");
  });

  it("remove takes it from everyone, keeps the row, and closes its reports as acted on", async () => {
    const id = running(ANNA);
    w.tables.prayer_campaign_reports!.push({ id: "r1", campaign_id: id, target_kind: "campaign", reporter_id: BEN, status: "open", reason_code: "money" });
    expect(await removeCampaign(client(w) as never, MOD, id, "Asked for money.")).toEqual({ ok: true });
    expect(byId(id)).toMatchObject({ status: "removed", removed_reason: "Asked for money.", removed_by_email: "edgar@example.com" });
    expect(w.tables.prayer_campaign_reports![0].status).toBe("actioned");
    signIn(ANNA);
    expect((await getOne(new Request(`${SITE}/api/campaigns/${id}`), params(id))).status).toBe(404);
    expect(log()).toEqual(["remove_campaign"]);
  });

  it("restore puts back what was removed, cleared, and nothing that was not", async () => {
    const id = running(ANNA, { status: "removed", removed_reason: "A mistake." });
    expect(await restoreCampaign(client(w) as never, MOD, id)).toEqual({ ok: true });
    expect(byId(id)).toMatchObject({ status: "active", removed_reason: null, removed_by_email: null });
    expect(await restoreCampaign(client(w) as never, MOD, id)).toMatchObject({ ok: false, status: 409 });
  });

  it("a dismissed report is recorded, not deleted", async () => {
    const id = running(ANNA);
    w.tables.prayer_campaign_reports!.push({ id: "r1", campaign_id: id, target_kind: "campaign", reporter_id: BEN, status: "open", reason_code: "unkind" });
    expect(await dismissCampaignReport(client(w) as never, MOD, "r1")).toEqual({ ok: true });
    expect(w.tables.prayer_campaign_reports!).toMatchObject([{ id: "r1", status: "dismissed" }]);
    expect(byId(id).status).toBe("active");
  });

  it("writes nothing a reader's account could be read from into the log", async () => {
    const id = running(ANNA);
    await removeCampaign(client(w) as never, MOD, id);
    expect(JSON.stringify(w.tables.community_mod_log)).not.toContain(ANNA);
  });
});
