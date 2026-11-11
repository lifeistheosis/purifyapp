import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { client, world, type Row, type World } from "@/lib/security/__tests__/fakeSupabase";

/**
 * A reader asks to be told of a campaign's updates (1.9, phase 4), with the
 * campaigns' notices ON, as they will run once the inbox can say them
 * (lib/campaigns/noticesOn.ts; that they ship off is held by notices.test.ts
 * and by routes.test.ts, "the notices, as they ship").
 *
 * What this file holds, through the routes themselves:
 *
 *   off until asked     carrying a campaign tells nobody; only a reader's own
 *                       tick does, on that campaign alone;
 *   their own row       the ask is kept on the reader's own join row, and
 *                       only where their account already carries it;
 *   the line is theirs  the Updates door is told whether to offer the line,
 *   to have or not      and never offers it to its creator, a signed-out
 *                       reader, or one whose account does not carry it;
 *   end to end          an update its creator writes reaches the reader who
 *                       asked, and no one else, with no word in it.
 *
 * What would go wrong if this broke: a reader told of every update of every
 * campaign they ever added; or one reader's tick turning on another's.
 */

const state = vi.hoisted(() => ({
  admin: null as unknown,
  user: null as null | { id: string; email: string; created_at: string; user_metadata: Record<string, unknown> },
  admins: new Set<string>(),
  trust: { level: "member", limits: {}, facts: { accountAgeMs: 90 * 86_400_000, contributions: 0, removals30d: 0, removals90d: 0, staff: false } },
  masked: new Map<string, string>(),
  guard: null as null | Record<string, unknown>,
  blocks: [] as { blocker: string; blocked: string }[],
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
// The spam guard, standing in: it answers what a case sets, and "ok" otherwise.
vi.mock("@/lib/community/guard", () => ({ guardWrite: async () => state.guard ?? { kind: "ok", trust: state.trust } }));
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
  blockedBy: async (_admin: unknown, ids: string[], actorId: string) =>
    new Set(state.blocks.filter((b) => b.blocked === actorId && ids.includes(b.blocker)).map((b) => b.blocker)),
  insertNotifications: async () => {},
  notifyClergyOfQuestion: async () => {},
  notifyMentions: async () => {},
  notifyOfReply: async () => {},
}));

vi.mock("@/lib/campaigns/noticesOn", () => ({ CAMPAIGN_NOTICES: true }));

import { PATCH as tell, POST as join } from "@/app/api/campaigns/[id]/join/route";
import { GET as read, POST as write } from "@/app/api/campaigns/[id]/thread/route";
import { __setCampaignsOpening } from "@/lib/campaigns/flags";

const ANNA = "11111111-1111-4111-8111-111111111111";
const BEN = "22222222-2222-4222-8222-222222222222";
const CARA = "33333333-3333-4333-8333-333333333333";
const SITE = "https://purifyapp.net";
const DAY = 86_400_000;

let w: World;

function signIn(id: string | null) {
  state.user = id
    ? {
        id,
        email: `${id.slice(0, 4)}@example.com`,
        created_at: new Date(Date.now() - 90 * DAY).toISOString(),
        user_metadata: { display_name: id === ANNA ? "Anna" : id === BEN ? "Ben" : "Cara" },
      }
    : null;
}

const today = () => new Date().toISOString().slice(0, 10);

beforeEach(() => {
  w = world();
  w.users = new Set([ANNA, BEN, CARA]);
  w.tables.prayer_campaigns = [];
  w.tables.prayer_campaign_prayers = [];
  w.tables.community_posts = [];
  w.tables.community_post_replies = [];
  w.tables.community_text_holds = [];
  w.tables.community_blocks = [];
  w.tables.community_mutes = [];
  w.tables.community_mod_log = [];
  w.tables.community_notifications = [];
  w.tables.profiles = [ANNA, BEN, CARA].map((id) => ({ id, handle: null, joined_at: new Date(Date.now() - 90 * DAY).toISOString() }));
  state.admin = client(w);
  state.admins = new Set();
  state.masked = new Map();
  state.guard = null;
  state.blocks = [];
  __setCampaignsOpening("open");
  signIn(BEN);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  __setCampaignsOpening("closed");
  vi.restoreAllMocks();
});

const json = (body: unknown, method = "POST") => ({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const joins = () => w.tables.prayer_campaign_prayers as Row[];
const notices = () => w.tables.community_notifications as Row[];

/** A campaign of Anna's that a moderator has read and that runs. */
function running(over: Row = {}): string {
  const id = crypto.randomUUID();
  (w.tables.prayer_campaigns as Row[]).push({
    id,
    creator_id: ANNA,
    title: "For Maria",
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
    audience: "public",
    creator_name: "Anna",
    creator_handle: "anna",
    created_at: new Date().toISOString(),
    held_reason: null,
    mod_cleared_at: new Date().toISOString(),
    keep_after_end: false,
    comments_open: true,
    ...over,
  });
  return id;
}

const add = (id: string) => join(new Request(`${SITE}/api/campaigns/${id}/join`, json({ places: ["evening"] })), params(id));
const ask = (id: string, tellMe: unknown) => tell(new Request(`${SITE}/api/campaigns/${id}/join`, json({ tellMe }, "PATCH")), params(id));
const thread = async (id: string) => (await (await read(new Request(`${SITE}/api/campaigns/${id}/thread`), params(id))).json()) as Record<string, unknown>;
const update = (id: string, body: string) => write(new Request(`${SITE}/api/campaigns/${id}/thread`, json({ kind: "update", body })), params(id));
const rowOf = (id: string, user: string) => joins().find((r) => r.campaign_id === id && r.user_id === user) as Row;

describe("asking to be told of updates", () => {
  it("is off when a campaign is added: carrying it is not asking", async () => {
    const id = running();
    expect((await add(id)).status).toBe(200);
    expect(rowOf(id, BEN).notify_updates ?? false).toBe(false);
    expect((await thread(id)).tellMe).toBe(false);
  });

  it("is kept on the reader's own row when they ask, and taken off when they stop", async () => {
    const id = running();
    await add(id);
    const on = await ask(id, true);
    expect(on.status).toBe(200);
    expect(rowOf(id, BEN).notify_updates).toBe(true);
    expect((await thread(id)).tellMe).toBe(true);
    expect((await ask(id, false)).status).toBe(200);
    expect(rowOf(id, BEN).notify_updates).toBe(false);
    expect((await thread(id)).tellMe).toBe(false);
  });

  it("is one reader's on one campaign: nobody else's row moves, and no other campaign of theirs", async () => {
    const id = running();
    const other = running({ title: "For Peter" });
    await add(id);
    await add(other);
    signIn(CARA);
    await add(id);
    signIn(BEN);
    await ask(id, true);
    expect(rowOf(id, BEN).notify_updates).toBe(true);
    expect(rowOf(other, BEN).notify_updates ?? false).toBe(false);
    expect(rowOf(id, CARA).notify_updates ?? false).toBe(false);
  });

  it("stays as the reader set it when they change the prayers that carry it", async () => {
    const id = running();
    await add(id);
    await ask(id, true);
    expect((await join(new Request(`${SITE}/api/campaigns/${id}/join`, json({ places: ["morning", "evening"] })), params(id))).status).toBe(200);
    expect(rowOf(id, BEN)).toMatchObject({ places: ["morning", "evening"], notify_updates: true });
  });

  it("needs the account to carry it: with no row of theirs there is nothing to ask on, and none is made", async () => {
    const id = running();
    const res = await ask(id, true);
    expect(res.status).toBe(409);
    expect(((await res.json()) as { code: string }).code).toBe("not_carried");
    expect(joins()).toEqual([]);
  });

  it("needs an account, a yes or a no, and a campaign's id", async () => {
    const id = running();
    await add(id);
    expect((await ask(id, "yes")).status).toBe(400);
    expect((await ask(id, undefined)).status).toBe(400);
    expect((await ask("not-an-id", true)).status).toBe(404);
    signIn(null);
    expect((await ask(id, true)).status).toBe(401);
    expect(rowOf(id, BEN).notify_updates ?? false).toBe(false);
  });

  it("answers 404 while campaigns are closed", async () => {
    const id = running();
    await add(id);
    __setCampaignsOpening("closed");
    expect((await ask(id, true)).status).toBe(404);
    expect(rowOf(id, BEN).notify_updates ?? false).toBe(false);
  });
});

describe("whether the Updates door offers the line", () => {
  it("never to its creator, to a signed-out reader, or to one whose account does not carry it", async () => {
    const id = running();
    expect("tellMe" in (await thread(id))).toBe(false);
    signIn(null);
    expect("tellMe" in (await thread(id))).toBe(false);
    signIn(ANNA);
    await add(id);
    expect("tellMe" in (await thread(id))).toBe(false);
  });

  it("to a reader whose account carries it, saying how it stands", async () => {
    const id = running();
    await add(id);
    expect((await thread(id)).tellMe).toBe(false);
    await ask(id, true);
    expect((await thread(id)).tellMe).toBe(true);
  });
});

describe("an update, end to end", () => {
  it("reaches the reader who asked and no one else, and carries no word of it", async () => {
    const id = running();
    await add(id);
    await ask(id, true);
    signIn(CARA);
    await add(id);
    signIn(ANNA);
    const sent = await update(id, "She came through the operation, thank God.");
    expect(sent.status).toBe(200);
    expect(notices()).toHaveLength(1);
    const row = notices()[0];
    expect(row).toMatchObject({ user_id: BEN, kind: "reply", target_kind: "campaign", actor_name: "Purify", excerpt: null });
    expect(row.post_id).toBe((w.tables.community_posts as Row[])[0].id);
    expect(row.reply_id).toBe((w.tables.community_post_replies as Row[])[0].id);
    const text = JSON.stringify(row);
    for (const word of ["Maria", "operation", "Anna", "For Maria"]) expect(text, word).not.toContain(word);
  });

  it("tells nobody of a comment", async () => {
    const id = running();
    await add(id);
    await ask(id, true);
    signIn(CARA);
    const res = await write(new Request(`${SITE}/api/campaigns/${id}/thread`, json({ kind: "comment", body: "Praying for her." })), params(id));
    expect(res.status).toBe(200);
    expect(notices()).toEqual([]);
  });

  it("tells nobody of an update that waits for a moderator", async () => {
    const id = running();
    await add(id);
    await ask(id, true);
    signIn(ANNA);
    // Words that may mean danger are held for a moderator who reads them first (lib/campaigns/safety.ts).
    const res = await update(id, "I do not want to live any more. Pray for us.");
    expect(res.status).toBe(200);
    expect(((await res.json()) as { held: boolean }).held).toBe(true);
    expect(notices()).toEqual([]);
  });
});
