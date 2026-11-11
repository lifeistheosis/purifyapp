import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { client, world, type Row, type World } from "@/lib/security/__tests__/fakeSupabase";

/**
 * A campaign's updates and comments, run for real against an in-memory
 * Supabase: reading them, writing one, taking one off, and the guards that
 * keep Community's reactions out of a campaign.
 *
 * Both are replies in the campaign's own thread in Community, a post with a
 * state of its own (docs/1.9-build/sql/campaigns-2-threads.sql). That the
 * public key can read neither the thread nor a comment under it was proved
 * on a scratch PostgreSQL with the table's own row policies; what is held
 * here is everything the routes decide.
 *
 * What would go wrong if these broke: a comment under a campaign that is
 * closed, waiting or kept from this reader; an update from someone who did
 * not start the campaign; a link or an ask for money under a grief; an
 * account id or a count in what a reader is handed; a creator able to erase
 * a comment with no trace; a reaction counted under a prayer.
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

import { PATCH as patchOne } from "@/app/api/campaigns/[id]/route";
import { DELETE as deletePost } from "@/app/api/community/posts/[id]/route";
import { DELETE as takeOff, GET as read, POST as write } from "@/app/api/campaigns/[id]/thread/route";
import { __setCampaignsOpening } from "@/lib/campaigns/flags";
import { saysDanger } from "@/lib/campaigns/safety";
import { asksForMoney, isCampaignReply, isCampaignThread } from "@/lib/campaigns/thread";

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
const plus = (days: number) => new Date(Date.now() + days * DAY).toISOString();

beforeEach(() => {
  w = world();
  w.users = new Set([ANNA, BEN, CARA]);
  w.tables.prayer_campaigns = [];
  w.tables.community_posts = [];
  w.tables.community_post_replies = [];
  w.tables.community_text_holds = [];
  w.tables.community_blocks = [];
  w.tables.community_mutes = [];
  w.tables.community_mod_log = [];
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
const posts = () => w.tables.community_posts!;
const replies = () => w.tables.community_post_replies!;
const holds = () => w.tables.community_text_holds!;

/** A campaign of Anna's that a moderator has read and that runs. */
function running(over: Row = {}): string {
  const id = crypto.randomUUID();
  w.tables.prayer_campaigns!.push({
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
    ends_at: plus(7),
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

type Thread = {
  updates: { id: string; body: string; update: boolean; mine: boolean; muted: boolean; author_name: string }[];
  comments: { id: string; body: string; update: boolean; mine: boolean; muted: boolean; author_name: string }[];
  commentsOpen: boolean;
  signedIn: boolean;
  canUpdate: boolean;
  canComment: boolean;
};
const thread = async (id: string): Promise<Thread> => (await (await read(new Request(`${SITE}/api/campaigns/${id}/thread`), params(id))).json()) as Thread;
const say = (id: string, kind: "update" | "comment", body: string, more: Record<string, unknown> = {}) =>
  write(new Request(`${SITE}/api/campaigns/${id}/thread`, json({ kind, body, ...more })), params(id));
const remove = (id: string, note: string) => takeOff(new Request(`${SITE}/api/campaigns/${id}/thread?note=${note}`, { method: "DELETE" }), params(id));
const idOf = async (res: Response) => ((await res.json()) as { id: string }).id;

describe("the switch", () => {
  it("closed: reading, writing and taking off all answer 404, and the database is never asked", async () => {
    __setCampaignsOpening("closed");
    state.admin = null;
    const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    expect((await read(new Request(`${SITE}/api/campaigns/${id}/thread`), params(id))).status).toBe(404);
    expect((await say(id, "comment", "Praying.")).status).toBe(404);
    expect((await remove(id, id)).status).toBe(404);
  });

  it("testers first: a 404 for everyone the campaigns are not open for", async () => {
    __setCampaignsOpening("testers");
    const id = running();
    expect((await read(new Request(`${SITE}/api/campaigns/${id}/thread`), params(id))).status).toBe(404);
    expect((await say(id, "comment", "Praying.")).status).toBe(404);
    expect(replies()).toEqual([]);
  });
});

describe("reading a campaign's updates and comments", () => {
  it("is empty before anyone has written, opens no thread, and says what this reader may do", async () => {
    const id = running();
    signIn(null);
    expect(await thread(id)).toEqual({ updates: [], comments: [], commentsOpen: true, signedIn: false, canUpdate: false, canComment: false });
    signIn(BEN);
    expect(await thread(id)).toMatchObject({ signedIn: true, canUpdate: false, canComment: true });
    signIn(ANNA);
    expect(await thread(id)).toMatchObject({ canUpdate: true, canComment: true });
    expect(posts()).toEqual([]);
  });

  it("opens only for whoever may open the campaign", async () => {
    for (const over of [{ status: "held" }, { status: "removed" }, { audience: "circle" }, { days: null }] as Row[]) {
      const id = running(over);
      expect((await read(new Request(`${SITE}/api/campaigns/${id}/thread`), params(id))).status, JSON.stringify(over)).toBe(404);
      expect((await say(id, "comment", "Praying.")).status, JSON.stringify(over)).toBe(404);
    }
    // And not for a reader who has blocked or muted its creator, as its page is not.
    const id = running();
    w.tables.community_blocks!.push({ blocker_id: BEN, blocked_id: ANNA, created_at: new Date().toISOString() });
    expect((await read(new Request(`${SITE}/api/campaigns/${id}/thread`), params(id))).status).toBe(404);
  });

  it("gives the updates newest first and the comments oldest first, and never an account id or a count", async () => {
    const id = running();
    signIn(ANNA);
    await say(id, "update", "The operation is on Thursday.");
    await say(id, "update", "It went well. Thank you.");
    signIn(BEN);
    await say(id, "comment", "Praying for Maria.");
    signIn(CARA);
    await say(id, "comment", "Lord, have mercy.");
    replies().forEach((r, i) => (r.created_at = new Date(Date.now() - (10 - i) * 60_000).toISOString()));
    const res = await read(new Request(`${SITE}/api/campaigns/${id}/thread`), params(id));
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const text = await res.text();
    const got = JSON.parse(text) as Thread;
    expect(got.updates.map((u) => u.body)).toEqual(["It went well. Thank you.", "The operation is on Thursday."]);
    expect(got.comments.map((c) => c.body)).toEqual(["Praying for Maria.", "Lord, have mercy."]);
    expect(got.comments.map((c) => c.mine)).toEqual([false, true]);
    expect(got.comments[0].author_name).toBe("Ben");
    for (const uuid of [ANNA, BEN, CARA]) expect(text).not.toContain(uuid);
    expect(text).not.toMatch(/user_id|_count|post_id/);
  });

  it("leaves out the words of someone the reader has blocked, and folds a muted writer's", async () => {
    const id = running();
    signIn(BEN);
    await say(id, "comment", "From Ben.");
    signIn(CARA);
    await say(id, "comment", "From Cara.");
    signIn(ANNA);
    w.tables.community_blocks!.push({ blocker_id: ANNA, blocked_id: BEN, created_at: new Date().toISOString() });
    w.tables.community_mutes!.push({ muter_id: ANNA, muted_id: CARA, created_at: new Date().toISOString() });
    const got = await thread(id);
    expect(got.comments.map((c) => [c.body, c.muted])).toEqual([["From Cara.", true]]);
  });

  it("shows nothing that waits for a moderator or was taken off", async () => {
    const id = running();
    await say(id, "comment", "Shown.");
    await say(id, "comment", "Waiting.");
    await say(id, "comment", "Removed.");
    replies()[1].status = "held";
    replies()[2].status = "removed";
    expect((await thread(id)).comments.map((c) => c.body)).toEqual(["Shown."]);
  });
});

describe("an update", () => {
  it("is its creator's alone, and is written as one", async () => {
    const id = running();
    expect((await say(id, "update", "Not mine to say.")).status).toBe(403);
    expect(replies()).toEqual([]);
    signIn(ANNA);
    const res = await say(id, "update", "The operation is on Thursday.");
    expect(res.status).toBe(200);
    expect(replies()).toMatchObject([{ user_id: ANNA, body: "The operation is on Thursday.", campaign_update: true, status: "visible", author_name: "Anna" }]);
  });

  it("goes up three times a day at most", async () => {
    const id = running();
    signIn(ANNA);
    for (let i = 0; i < 3; i++) expect((await say(id, "update", `Update ${i + 1}.`)).status).toBe(200);
    const fourth = await say(id, "update", "A fourth.");
    expect(fourth.status).toBe(429);
    expect(((await fourth.json()) as { code: string }).code).toBe("updates_today");
    // Yesterday's do not count against today.
    replies().forEach((r) => (r.created_at = new Date(Date.now() - 25 * 3_600_000).toISOString()));
    expect((await say(id, "update", "The next day.")).status).toBe(200);
  });

  it("still goes up where comments are closed, since it is the creator's own word", async () => {
    const id = running({ comments_open: false });
    signIn(ANNA);
    expect((await say(id, "update", "Thank you all.")).status).toBe(200);
  });
});

describe("a comment", () => {
  it("needs an account", async () => {
    const id = running();
    signIn(null);
    expect((await say(id, "comment", "Praying.")).status).toBe(401);
    expect(replies()).toEqual([]);
  });

  it("opens the campaign's one thread with the first word, as a post no feed can list, and writes under it after", async () => {
    const id = running();
    expect((await say(id, "comment", "Praying for Maria.")).status).toBe(200);
    expect(posts()).toMatchObject([{ user_id: ANNA, campaign_id: id, status: "campaign", kind: "discussion", title: "For Maria" }]);
    signIn(CARA);
    await say(id, "comment", "Lord, have mercy.");
    expect(posts()).toHaveLength(1);
    expect(replies().map((r) => [r.post_id, r.user_id, r.campaign_update, r.status])).toEqual([
      [posts()[0].id, BEN, false, "visible"],
      [posts()[0].id, CARA, false, "visible"],
    ]);
  });

  it("is refused on a campaign that is not running, and where comments are closed", async () => {
    for (const over of [{ status: "ended" }, { status: "answered" }, { ends_at: plus(-1) }] as Row[]) {
      const id = running(over);
      const res = await say(id, "comment", "Praying.");
      expect(res.status, JSON.stringify(over)).toBe(409);
      expect(((await res.json()) as { code: string }).code).toBe("not_running");
    }
    const closed = running({ comments_open: false });
    const res = await say(closed, "comment", "Praying.");
    expect(res.status).toBe(409);
    expect(((await res.json()) as { code: string }).code).toBe("comments_closed");
    expect(await thread(closed)).toMatchObject({ commentsOpen: false, canComment: false });
    expect(replies()).toEqual([]);
  });

  it("is closed and opened by the campaign's creator alone, and what was written stays", async () => {
    const id = running();
    await say(id, "comment", "Praying.");
    const close = () => patchOne(new Request(`${SITE}/api/campaigns/${id}`, json({ commentsOpen: false }, "PATCH")), params(id));
    expect((await close()).status).toBe(403);
    signIn(ANNA);
    expect((await close()).status).toBe(200);
    signIn(BEN);
    expect((await say(id, "comment", "Again.")).status).toBe(409);
    expect((await thread(id)).comments.map((c) => c.body)).toEqual(["Praying."]);
  });

  it("carries no link, as the campaign itself carries none", async () => {
    const id = running();
    for (const body of ["See https://example.com/help", "more at example.com/give"]) {
      const res = await say(id, "comment", body);
      expect(res.status, body).toBe(400);
      expect(((await res.json()) as { code: string }).code).toBe("campaign_link");
    }
    expect(replies()).toEqual([]);
  });

  it("asks before masking a listed word, then keeps the masked words and the words as written for the moderators", async () => {
    const id = running();
    state.masked.set("darn", "****");
    const asked = await say(id, "comment", "A darn shame.");
    expect(asked.status).toBe(409);
    expect((await asked.json()) as { code: string; preview: { body: string } }).toMatchObject({ code: "filtered", preview: { body: "A **** shame." } });
    expect(replies()).toEqual([]);
    expect((await say(id, "comment", "A darn shame.", { confirmFiltered: true })).status).toBe(200);
    expect(replies()).toMatchObject([{ body: "A **** shame.", status: "visible" }]);
    expect(holds()).toMatchObject([{ reply_id: replies()[0].id, original_body: "A darn shame.", hits: 1 }]);
  });

  it("waits for a moderator when the spam guard holds it, and is shown to nobody until then", async () => {
    const id = running();
    state.guard = { kind: "hold", trust: state.trust, reason: "new_account", detail: "first words from a new account" };
    const res = await say(id, "comment", "Praying for Maria.");
    expect((await res.json()) as { held: boolean }).toMatchObject({ ok: true, held: true });
    expect(replies()).toMatchObject([{ status: "held" }]);
    expect(holds()).toMatchObject([{ reply_id: replies()[0].id, reason: "new_account" }]);
    expect((await thread(id)).comments).toEqual([]);
  });

  it("waits for a moderator when it asks for money, and is not refused for naming a gift", async () => {
    const id = running();
    for (const body of ["Please donate to her family.", "Her GoFundMe is up.", "Venmo me and I will pass it on.", "Send money if you can."]) {
      expect(asksForMoney(body), body).toBe(true);
    }
    for (const body of ["Lord, have mercy on Maria.", "We lit a candle for her.", "May her memory be eternal."]) {
      expect(asksForMoney(body), body).toBe(false);
    }
    const res = await say(id, "comment", "Please donate to her family.");
    expect((await res.json()) as { held: boolean }).toMatchObject({ ok: true, held: true });
    expect(replies()).toMatchObject([{ status: "held" }]);
    expect(holds()).toMatchObject([{ reason: "spam", detail: "money asked under a prayer campaign" }]);
  });

  it("words that may mean danger wait for a moderator who reads them first, and their writer is told at once", async () => {
    const id = running();
    signIn(BEN);
    const res = await say(id, "comment", "I do not want to live any more. Please pray for me too.");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, held: true, safety: true });
    // Held from everyone until a moderator has read it.
    expect(replies()).toMatchObject([{ status: "held", campaign_update: false }]);
    expect((await thread(id)).comments).toEqual([]);
    // Filed under a reason the table allows, with the truth in its detail, which the queue reads first.
    expect(holds()).toMatchObject([{ reply_id: replies()[0].id, reason: "spam", detail: "crisis: the writer may be in danger" }]);
    expect(saysDanger(holds()[0].detail as string)).toBe(true);
  });

  it("the same for its creator's own update", async () => {
    const id = running();
    signIn(ANNA);
    const res = await say(id, "update", "She told me today that she wants to kill herself. I am frightened; she said: I want to die.");
    expect(await res.json()).toMatchObject({ ok: true, held: true, safety: true });
    expect(replies()).toMatchObject([{ status: "held", campaign_update: true }]);
    expect((await thread(id)).updates).toEqual([]);
    expect(holds()).toMatchObject([{ reason: "spam", detail: "crisis: the writer may be in danger" }]);
  });

  it("the mark goes before whatever else held it, under that reason", async () => {
    const id = running();
    signIn(BEN);
    state.guard = { kind: "hold", trust: state.trust, reason: "new_account", detail: "first words from a new account" };
    const res = await say(id, "comment", "Thoughts of suicide again tonight.");
    expect(await res.json()).toMatchObject({ ok: true, held: true, safety: true });
    expect(holds()).toMatchObject([{ reason: "new_account", detail: "crisis; first words from a new account" }]);
    expect(saysDanger(holds()[0].detail as string)).toBe(true);
  });

  it("words with no danger in them are told nothing of it, held or not", async () => {
    const id = running();
    signIn(BEN);
    const plain = await say(id, "comment", "Praying for Maria.");
    expect(await plain.json()).toMatchObject({ ok: true, held: false, safety: false });
    const money = await say(id, "comment", "Please donate to her family.");
    expect(await money.json()).toMatchObject({ ok: true, held: true, safety: false });
    expect(holds().map((h) => h.detail)).toEqual(["money asked under a prayer campaign"]);
  });

  it("is refused as the spam guard refuses it, with its reason", async () => {
    const id = running();
    state.guard = { kind: "refuse", status: 429, code: "slow_down", error: "You're posting quickly. Please slow down a little.", limit: 20 };
    const res = await say(id, "comment", "Praying.");
    expect(res.status).toBe(429);
    expect(((await res.json()) as { code: string }).code).toBe("slow_down");
    expect(replies()).toEqual([]);
  });

  it("cannot be written by someone the campaign's creator has blocked", async () => {
    const id = running();
    state.blocks = [{ blocker: ANNA, blocked: BEN }];
    const res = await say(id, "comment", "Praying.");
    expect(res.status).toBe(403);
    expect(((await res.json()) as { code: string }).code).toBe("blocked");
    expect(replies()).toEqual([]);
  });
});

describe("taking one off", () => {
  it("its own writer deletes it", async () => {
    const id = running();
    const note = await idOf(await say(id, "comment", "More than I meant to say."));
    expect((await remove(id, note)).status).toBe(200);
    expect(replies()).toEqual([]);
    expect(w.tables.community_mod_log).toEqual([]);
  });

  it("the campaign's creator takes a comment off: kept, marked removed, and written in the moderators' log as theirs", async () => {
    const id = running();
    const note = await idOf(await say(id, "comment", "Unkind words."));
    signIn(ANNA);
    expect((await remove(id, note)).status).toBe(200);
    expect(replies()).toMatchObject([{ id: note, status: "removed", removed_reason: "Taken off by the campaign's creator" }]);
    expect(w.tables.community_mod_log).toMatchObject([{ actor_id: ANNA, actor_name: "Anna", action: "creator_remove_comment", target_kind: "reply", target_id: note }]);
    expect((await thread(id)).comments).toEqual([]);
  });

  it("is nobody else's to take off, and never another campaign's note", async () => {
    const id = running();
    const other = running({ title: "For Peter" });
    const note = await idOf(await say(id, "comment", "Praying."));
    signIn(CARA);
    expect((await remove(id, note)).status).toBe(403);
    // Anna started both campaigns: the note is named under the wrong one.
    signIn(ANNA);
    await say(other, "update", "A word.");
    expect((await remove(other, note)).status).toBe(404);
    expect(replies().find((r) => r.id === note)).toMatchObject({ status: "visible" });
    signIn(null);
    expect((await remove(id, note)).status).toBe(401);
  });
});

describe("a thread goes only with its campaign", () => {
  // Found by Admin's review of the SQL, 2026-11-10: a thread is a post of
  // the campaign's creator, and Community lets a post's author delete their
  // post. That would have let a creator wipe every reader's comment at once,
  // where his yes to item 126 gives them two things only: close comments,
  // and take one off.
  const remove = (postId: string) => deletePost(new Request(`${SITE}/api/community/posts/${postId}`, { method: "DELETE" }), params(postId));

  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_COMMUNITY_ENABLED", "1"));
  afterEach(() => vi.unstubAllEnvs());

  it("cannot be deleted through Community's own delete, by its creator or by anyone", async () => {
    const id = running();
    await say(id, "comment", "Praying for Maria.");
    signIn(CARA);
    await say(id, "comment", "Lord, have mercy.");
    const threadId = String(posts()[0].id);
    for (const who of [ANNA, BEN, CARA]) {
      signIn(who);
      expect((await remove(threadId)).status, who).toBe(404);
    }
    expect(posts()).toHaveLength(1);
    expect(replies()).toHaveLength(2);
  });

  it("leaves Community's own delete as it was for a post of Talk together", async () => {
    posts().push({ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", user_id: BEN, kind: "discussion", title: "A talk", body: "Hello", status: "visible", campaign_id: null });
    signIn(CARA);
    expect((await remove("cccccccc-cccc-4ccc-8ccc-cccccccccccc")).status).toBe(403);
    signIn(BEN);
    expect((await remove("cccccccc-cccc-4ccc-8ccc-cccccccccccc")).status).toBe(200);
    expect(posts()).toEqual([]);
  });
});

describe("nothing is counted under a campaign", () => {
  const ROOT = process.cwd();
  const source = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

  it("knows a campaign's thread and a reply under one from Community's own", async () => {
    const id = running();
    const note = await idOf(await say(id, "comment", "Praying."));
    posts().push({ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", user_id: ANNA, kind: "discussion", title: "A talk", body: "Hello", status: "visible", campaign_id: null });
    replies().push({ id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", post_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", user_id: BEN, body: "A reply", status: "visible" });
    const admin = client(w) as never;
    expect(await isCampaignReply(admin, note)).toBe(true);
    expect(await isCampaignReply(admin, "dddddddd-dddd-4ddd-8ddd-dddddddddddd")).toBe(false);
    expect(await isCampaignReply(admin, "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee")).toBe(false);
    expect(await isCampaignThread(admin, String(posts()[0].id))).toBe(true);
    expect(await isCampaignThread(admin, "cccccccc-cccc-4ccc-8ccc-cccccccccccc")).toBe(false);
    // With campaigns closed nothing is read at all: a reaction in Community costs what it did.
    __setCampaignsOpening("closed");
    expect(await isCampaignReply(null as never, note)).toBe(false);
    expect(await isCampaignThread(null as never, String(posts()[0].id))).toBe(false);
  });

  it("is refused by both of Community's routes that take a reaction, before anything is written", () => {
    const responses = source("app/api/community/responses/route.ts");
    expect(responses).toContain("if (replyId && (await isCampaignReply(admin, replyId)))");
    expect(responses.indexOf("isCampaignReply(admin, replyId)")).toBeLessThan(responses.indexOf('admin.from("community_responses").insert'));
    const reactions = source("app/api/community/reactions/route.ts");
    expect(reactions).toContain("if (replyId ? await isCampaignReply(admin, replyId) : await isCampaignThread(admin, targetId))");
    expect(reactions.indexOf("isCampaignReply(admin, replyId)")).toBeLessThan(reactions.indexOf('.from("community_reactions")'));
  });

  it("is in no read of Community: every one of them asks for a post that is visible, and a thread never is", () => {
    // The thread's state is what keeps it out, so these reads must go on
    // asking for it. If one stops, a campaign's comments would be served to
    // whoever can name the thread, past the campaigns switch.
    const repliesRoute = source("app/api/community/posts/[id]/replies/route.ts");
    expect(repliesRoute).toContain('if (!parent || parent.status !== "visible")');
    expect(repliesRoute).toContain('if (!post || post.status !== "visible")');
    expect(source("app/api/community/posts/route.ts")).toContain('admin.from("community_posts").select(cols).eq("status", "visible")');
    expect(source("lib/profile/server.ts")).toMatch(/from\("community_posts"\)[\s\S]{0,200}\.eq\("status", "visible"\)/);
    expect(source("lib/email/communityDigest.ts")).toMatch(/from\("community_posts"\)[\s\S]{0,120}\.eq\("status", "visible"\)/);
    // A thread is written with that state and no other.
    expect(source("lib/campaigns/thread.ts")).toContain('status: "campaign",');
  });

  it("tells nobody when a moderator approves a held comment under a campaign", () => {
    const moderation = source("lib/community/moderation.ts");
    expect(moderation).toContain('const underCampaign = (parent as { status?: string } | null)?.status === "campaign";');
    expect(moderation).toContain("if (!underCampaign && reasons.some(HELD_AT_WRITE)) {");
    // And the parent is read only where it always was: when the reply was held at the moment it was written.
    expect(moderation).toMatch(/const \{ data: parent \} = reasons\.some\(HELD_AT_WRITE\)\s+\? await admin\.from\("community_posts"\)/);
  });

  it("hands a reader a note with nothing to count", () => {
    const thread = source("lib/campaigns/thread.ts");
    const projection = thread.slice(thread.indexOf("function publicNote"), thread.indexOf("/** Whether a campaign takes new words"));
    expect(projection).not.toMatch(/count|user_id:|reply_count/);
  });
});

describe("the notices, as they ship: off until the inbox can say them", () => {
  // lib/campaigns/noticesOn.ts is read here as it is committed (tellMe.test.ts
  // runs the same routes with it on).
  it("the Updates door is offered no line to ask on, even for a reader whose account carries the campaign", async () => {
    const id = running();
    w.tables.prayer_campaign_prayers = [{ campaign_id: id, user_id: BEN, places: ["evening"], until_on: null, notify_updates: true }];
    expect("tellMe" in ((await thread(id)) as unknown as Record<string, unknown>)).toBe(false);
  });

  it("an update tells nobody, whoever asked", async () => {
    const id = running();
    w.tables.community_notifications = [];
    w.tables.prayer_campaign_prayers = [{ campaign_id: id, user_id: BEN, places: ["evening"], until_on: null, notify_updates: true }];
    signIn(ANNA);
    const res = await write(new Request(`${SITE}/api/campaigns/${id}/thread`, json({ kind: "update", body: "She came through the operation, thank God." })), params(id));
    expect(res.status).toBe(200);
    expect(w.tables.community_notifications).toEqual([]);
  });
});
