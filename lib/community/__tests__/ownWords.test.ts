// A reader edits and deletes their own posts and replies (1.9, build 95 note
// 10). A reader's ask, sent by the owner: "We should have the ability to
// remove or edit our comments under replies and posts".
//
// Before 1.9 a reply, once sent, could be neither edited nor deleted, and a
// post could only be deleted, taking every reply under it with it, other
// readers' words included. What would go wrong if this broke: someone
// editing or deleting another reader's words; an edit with no "edited" to
// say so; a deletion that leaves other readers' answers hanging or takes
// them with it; a placeholder that still names its writer or keeps their
// words; a reported post edited clean before a moderator looks; a moderator
// telling a reader "we removed your post" for words they took down
// themselves; edits and deletions sent as fast as a script can send them.
//
// Each route runs against a stand-in database (lib/supabase/__tests__/cappedApi.ts)
// that changes the rows it is given, so a test reads what was written.

import type { SupabaseClient } from "@supabase/supabase-js";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

type Row = Record<string, unknown>;

const ANNA = "11111111-1111-4111-8111-111111111111"; // writes, edits, deletes her own
const BEN = "22222222-2222-4222-8222-222222222222"; // answers her, and tries her words
const ON_FASTING = "44444444-4444-4444-8444-444444444444"; // Anna's discussion; Ben replied
const HER_VERSE = "45454545-4545-4545-8545-454545454545"; // Anna's shared verse; nobody replied
const BENS_POST = "46464646-4646-4646-8646-464646464646"; // Ben's discussion
const BEN_ON_FASTING = "51515151-5151-4151-8151-515151515151"; // Ben's reply under hers, first
const ANNA_THANKS = "52525252-5252-4252-8252-525252525252"; // her reply after his: nobody after
const ANNA_AMEN = "53535353-5353-4353-8353-535353535353"; // her reply under Ben's post; he answered after
const BEN_GLORY = "54545454-5454-4454-8454-545454545454"; // his answer after hers

const state = vi.hoisted(() => ({
  admin: null as unknown,
  user: null as null | { id: string; email?: string; created_at?: string; user_metadata?: Record<string, unknown> },
  limited: ((key: string) => key === "") as (key: string) => boolean,
  hits: 0,
  level: "member" as "new" | "member",
  member: true,
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => state.admin }));
vi.mock("@/lib/supabase/server", () => ({
  createClientFromRequest: async () => ({ auth: { getUser: async () => ({ data: { user: state.user }, error: null }) } }),
}));
vi.mock("@/lib/security/ratelimit", () => ({ rateLimited: async (key: string) => state.limited(key), ipKey: () => "203.0.113.9" }));
vi.mock("@/lib/community/adminStanding", () => ({ requestStanding: async () => "reader" }));
vi.mock("@/lib/community/groupAccess", () => ({ callerIsGroupMember: async () => state.member }));
// The word filter masks one word when asked to (state.hits), as lib/moderation does.
vi.mock("@/lib/moderation/server", () => ({
  censorPost: async (_admin: unknown, input: { title?: string | null; body?: string | null }) => ({
    title: input.title ?? null,
    body: state.hits > 0 && input.body ? input.body.replace(/\bdarn\b/g, "****") : (input.body ?? null),
    hits: state.hits,
  }),
  censorName: async (_admin: unknown, name: string) => name,
  getBlockedHosts: async () => [],
}));
vi.mock("@/lib/community/trustServer", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/community/trustServer")>();
  const { TRUST_LIMITS } = await import("@/lib/community/trust");
  return { ...real, readTrust: async () => ({ level: state.level, limits: TRUST_LIMITS[state.level], facts: {} }) };
});

function world() {
  const tables = {
    community_posts: [
      { id: ON_FASTING, user_id: ANNA, kind: "discussion", title: "On fasting", body: "What do you keep on Wednesdays?", quote_text: null, quote_source: null, quote_href: null, author_name: "Anna", author_avatar: "https://purifyapp.net/a.webp", author_handle: "anna", author_decoration: null, author_name_color: null, status: "visible", group_id: null, reply_count: 2, like_count: 1, dislike_count: 0, created_at: "2026-11-01T10:00:00.000Z", pinned_at: null, chapter_ref: null, category: null },
      { id: HER_VERSE, user_id: ANNA, kind: "scripture", title: null, body: "A line I keep.", quote_text: "In the beginning was the Word.", quote_source: "John 1:1", quote_href: "/bible/john/1", author_name: "Anna", author_avatar: null, author_handle: "anna", status: "visible", group_id: null, reply_count: 0, like_count: 0, dislike_count: 0, created_at: "2026-11-01T09:00:00.000Z", pinned_at: null, chapter_ref: "john/1", category: null },
      { id: BENS_POST, user_id: BEN, kind: "discussion", title: null, body: "Lord, have mercy.", author_name: "Ben", author_avatar: null, author_handle: "ben", status: "visible", group_id: null, reply_count: 2, like_count: 0, dislike_count: 0, created_at: "2026-11-01T11:00:00.000Z", pinned_at: null, chapter_ref: null, category: null },
    ] as Row[],
    community_post_replies: [
      { id: BEN_ON_FASTING, post_id: ON_FASTING, user_id: BEN, body: "We keep the fast.", author_name: "Ben", author_avatar: null, author_handle: "ben", status: "visible", like_count: 0, dislike_count: 0, created_at: "2026-11-01T10:05:00.000Z" },
      { id: ANNA_THANKS, post_id: ON_FASTING, user_id: ANNA, body: "Thank you.", author_name: "Anna", author_avatar: null, author_handle: "anna", status: "visible", like_count: 0, dislike_count: 0, created_at: "2026-11-01T10:10:00.000Z" },
      { id: ANNA_AMEN, post_id: BENS_POST, user_id: ANNA, body: "Amen to that, darn it.", author_name: "Anna", author_avatar: "https://purifyapp.net/a.webp", author_handle: "anna", status: "visible", like_count: 2, dislike_count: 0, created_at: "2026-11-01T11:01:00.000Z" },
      { id: BEN_GLORY, post_id: BENS_POST, user_id: BEN, body: "Glory to God.", author_name: "Ben", author_avatar: null, author_handle: "ben", status: "visible", like_count: 0, dislike_count: 0, created_at: "2026-11-01T11:05:00.000Z" },
    ] as Row[],
    community_reports: [] as Row[],
    community_text_holds: [] as Row[],
    community_notifications: [
      // Ben is told of her reply under his post: its words are hers.
      { id: "n1", user_id: BEN, kind: "reply", post_id: BENS_POST, reply_id: ANNA_AMEN, actor_name: "Anna", excerpt: "Amen to that, darn it." },
      // Anna is told of Ben's reply under hers: its words are his.
      { id: "n2", user_id: ANNA, kind: "reply", post_id: ON_FASTING, reply_id: BEN_ON_FASTING, actor_name: "Ben", excerpt: "We keep the fast." },
      // Ben was mentioned in her post: its words are hers.
      { id: "n3", user_id: BEN, kind: "mention", post_id: ON_FASTING, reply_id: null, actor_name: "Anna", excerpt: "On fasting What do you keep on Wednesdays?" },
    ] as Row[],
    community_blocks: [] as Row[],
    community_mutes: [] as Row[],
    community_mod_log: [] as Row[],
    prayer_campaign_group_members: [] as Row[],
    user_badges: [] as Row[],
  };
  const bumps: { p_post_id: string; p_delta: number }[] = [];
  const { client } = cappedApi(tables, {
    community_bump_reply_count: (args) => {
      bumps.push(args as { p_post_id: string; p_delta: number });
      const post = tables.community_posts.find((p) => p.id === args.p_post_id);
      if (post) post.reply_count = Number(post.reply_count) + Number(args.p_delta);
      return [];
    },
  });
  state.admin = client as SupabaseClient;
  return { ...tables, bumps };
}

const as = (id: string) => {
  state.user = { id, email: `${id.slice(0, 4)}@example.com`, created_at: "2025-01-01T00:00:00.000Z", user_metadata: {} };
};

async function call(method: "PATCH" | "DELETE", kind: "posts" | "replies", id: string, body?: unknown) {
  const route = kind === "posts" ? await import("@/app/api/community/posts/[id]/route") : await import("@/app/api/community/replies/[id]/route");
  const handler = (route as Record<string, unknown>)[method] as (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
  const res = await handler(
    new Request(`https://purifyapp.net/api/community/${kind}/${id}`, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
  return { status: res.status, json: (await res.json()) as Row };
}

async function thread(postId: string) {
  const { GET } = await import("@/app/api/community/posts/[id]/replies/route");
  const res = await GET(new Request(`https://purifyapp.net/api/community/posts/${postId}/replies`), { params: Promise.resolve({ id: postId }) });
  return ((await res.json()) as { replies: Row[] }).replies;
}

async function feed(query = "") {
  const { GET } = await import("@/app/api/community/posts/route");
  const res = await GET(new Request(`https://purifyapp.net/api/community/posts${query}`));
  return ((await res.json()) as { posts: Row[] }).posts;
}

const row = (rows: Row[], id: string) => rows.find((r) => r.id === id);

beforeEach(() => {
  process.env.NEXT_PUBLIC_COMMUNITY_ENABLED = "1";
  state.limited = () => false;
  state.hits = 0;
  state.level = "member";
  state.member = true;
});

describe("editing your own words", () => {
  it("changes a post's title and words, and says when", async () => {
    const t = world();
    as(ANNA);
    const { status, json } = await call("PATCH", "posts", ON_FASTING, { title: "On the fast", body: "What do you keep on Wednesdays and Fridays?" });
    expect(status).toBe(200);
    const post = row(t.community_posts, ON_FASTING)!;
    expect([post.title, post.body]).toEqual(["On the fast", "What do you keep on Wednesdays and Fridays?"]);
    expect(typeof post.edited_at).toBe("string");
    expect(json.post).toEqual({ title: "On the fast", body: "What do you keep on Wednesdays and Fridays?", edited_at: post.edited_at });
  });

  it("changes a reply's words, and the thread says it was edited", async () => {
    const t = world();
    as(ANNA);
    const { status } = await call("PATCH", "replies", ANNA_THANKS, { body: "Thank you, and God bless." });
    expect(status).toBe(200);
    expect(row(t.community_post_replies, ANNA_THANKS)!.body).toBe("Thank you, and God bless.");
    const shown = row(await thread(ON_FASTING), ANNA_THANKS)!;
    expect(shown.body).toBe("Thank you, and God bless.");
    expect(typeof shown.edited_at).toBe("string");
    // Ben's reply was never edited, and says nothing.
    expect(row(await thread(ON_FASTING), BEN_ON_FASTING)!.edited_at).toBeNull();
  });

  it("refuses another reader's post or reply, and changes nothing", async () => {
    const t = world();
    as(BEN);
    const post = await call("PATCH", "posts", ON_FASTING, { title: "Mine now", body: "Words she never wrote." });
    const reply = await call("PATCH", "replies", ANNA_THANKS, { body: "Words she never wrote." });
    expect([post.status, reply.status]).toEqual([403, 403]);
    expect(row(t.community_posts, ON_FASTING)!.body).toBe("What do you keep on Wednesdays?");
    expect(row(t.community_post_replies, ANNA_THANKS)!.body).toBe("Thank you.");
    expect(row(t.community_posts, ON_FASTING)!.edited_at).toBeUndefined();
  });

  it("asks a reader who is signed out to sign in", async () => {
    world();
    state.user = null;
    expect((await call("PATCH", "replies", ANNA_THANKS, { body: "Anyone?" })).status).toBe(401);
  });

  it("never changes a shared line, which is Purify's own: only the reader's words beside it", async () => {
    const t = world();
    as(ANNA);
    // The quotation cannot even be sent.
    const refused = await call("PATCH", "posts", HER_VERSE, { body: "A line I keep.", quoteText: "Words no Father wrote." });
    expect(refused.status).toBe(400);
    const ok = await call("PATCH", "posts", HER_VERSE, { title: "A title it cannot have", body: "A line I keep close." });
    expect(ok.status).toBe(200);
    const verse = row(t.community_posts, HER_VERSE)!;
    expect([verse.quote_text, verse.quote_source, verse.title, verse.body]).toEqual(["In the beginning was the Word.", "John 1:1", null, "A line I keep close."]);
  });

  it("marks nothing edited when nothing changed", async () => {
    const t = world();
    as(ANNA);
    expect((await call("PATCH", "replies", ANNA_THANKS, { body: "  Thank you.  " })).status).toBe(200);
    expect(row(t.community_post_replies, ANNA_THANKS)!.edited_at).toBeUndefined();
  });

  it("keeps a reported post as it was reported until a moderator has looked, and it can still be deleted", async () => {
    const t = world();
    t.community_reports.push({ id: "rep1", post_id: null, reply_id: ANNA_AMEN, reporter_id: BEN, status: "open" });
    as(ANNA);
    const edit = await call("PATCH", "replies", ANNA_AMEN, { body: "Amen." });
    expect(edit.status).toBe(409);
    expect(edit.json.code).toBe("under_review");
    expect(row(t.community_post_replies, ANNA_AMEN)!.body).toBe("Amen to that, darn it.");
    expect((await call("DELETE", "replies", ANNA_AMEN)).status).toBe(200);
  });

  it("drops the word filter's waiting copy of the old words, so approving it cannot undo the edit", async () => {
    const t = world();
    t.community_text_holds.push({ id: "h1", post_id: null, reply_id: ANNA_THANKS, reason: "words", original_body: "Thank you, old words.", status: "pending" });
    t.community_text_holds.push({ id: "h2", post_id: null, reply_id: ANNA_THANKS, reason: "words", original_body: "Decided long ago.", status: "kept" });
    as(ANNA);
    expect((await call("PATCH", "replies", ANNA_THANKS, { body: "Thank you, new words." })).status).toBe(200);
    expect(t.community_text_holds.map((h) => h.id)).toEqual(["h2"]);
  });

  it("passes the word filter as writing does: asked first, then masked and held for a moderator", async () => {
    const t = world();
    as(ANNA);
    state.hits = 1;
    const asked = await call("PATCH", "replies", ANNA_THANKS, { body: "Thank you, darn it." });
    expect([asked.status, asked.json.code]).toEqual([409, "filtered"]);
    expect(row(t.community_post_replies, ANNA_THANKS)!.body).toBe("Thank you.");
    const saved = await call("PATCH", "replies", ANNA_THANKS, { body: "Thank you, darn it.", confirmFiltered: true });
    expect(saved.status).toBe(200);
    expect(row(t.community_post_replies, ANNA_THANKS)!.body).toBe("Thank you, **** it.");
    expect(t.community_text_holds).toEqual([expect.objectContaining({ reply_id: ANNA_THANKS, original_body: "Thank you, darn it.", hits: 1 })]);
  });

  it("refuses an edit that adds a link a new account's post would wait with, and changes nothing", async () => {
    const t = world();
    as(ANNA);
    state.level = "new";
    const res = await call("PATCH", "replies", ANNA_THANKS, { body: "Thank you. See https://example.com/offer" });
    expect([res.status, res.json.code]).toEqual([409, "edit_held"]);
    expect(row(t.community_post_replies, ANNA_THANKS)!.body).toBe("Thank you.");
  });

  it("tells the notices that quote it what it says now", async () => {
    const t = world();
    as(ANNA);
    await call("PATCH", "replies", ANNA_AMEN, { body: "Amen." });
    expect(row(t.community_notifications, "n1")!.excerpt).toBe("Amen.");
    // Ben's words, in Anna's inbox, are his, and unchanged.
    expect(row(t.community_notifications, "n2")!.excerpt).toBe("We keep the fast.");
  });
});

describe("deleting your own words", () => {
  it("a reply nobody answered after is gone, and the post's count follows", async () => {
    const t = world();
    as(ANNA);
    const { status, json } = await call("DELETE", "replies", ANNA_THANKS);
    expect([status, json.outcome]).toEqual([200, "deleted"]);
    expect(row(t.community_post_replies, ANNA_THANKS)).toBeUndefined();
    expect(t.bumps).toEqual([{ p_post_id: ON_FASTING, p_delta: -1 }]);
  });

  it("a reply someone answered after stays as a placeholder with nothing of hers, so the thread still reads", async () => {
    const t = world();
    t.community_reports.push({ id: "rep1", reply_id: ANNA_AMEN, post_id: null, status: "dismissed" });
    t.community_text_holds.push({ id: "h1", reply_id: ANNA_AMEN, post_id: null, reason: "words", original_body: "Amen to that, darn it.", status: "kept" });
    as(ANNA);
    const { status, json } = await call("DELETE", "replies", ANNA_AMEN);
    expect([status, json.outcome]).toEqual([200, "withdrawn"]);

    const kept = row(t.community_post_replies, ANNA_AMEN)!;
    expect([kept.status, kept.body, kept.author_name, kept.author_avatar, kept.author_handle]).toEqual(["withdrawn", "", "Reader", null, null]);
    // What carried her words is gone with them: its report, the filter's
    // copy, and Ben's notice that quoted her.
    expect(t.community_reports).toEqual([]);
    expect(t.community_text_holds).toEqual([]);
    expect(row(t.community_notifications, "n1")).toBeUndefined();
    expect(t.bumps).toEqual([{ p_post_id: BENS_POST, p_delta: -1 }]);

    // The thread: her place kept, saying nothing of her; his answer as it was.
    const replies = await thread(BENS_POST);
    expect(replies.map((r) => [r.id, r.removed_by_author ?? false])).toEqual([
      [ANNA_AMEN, true],
      [BEN_GLORY, false],
    ]);
    const placeholder = replies[0];
    expect([placeholder.body, placeholder.author_name, placeholder.author_avatar, placeholder.author_handle, placeholder.like_count]).toEqual(["", "Reader", null, null, 0]);
    expect(JSON.stringify(placeholder)).not.toMatch(/Anna|anna|darn|a\.webp/);
  });

  it("a placeholder with nothing after it any more is not shown", async () => {
    const t = world();
    as(ANNA);
    await call("DELETE", "replies", ANNA_AMEN);
    t.community_post_replies.splice(t.community_post_replies.findIndex((r) => r.id === BEN_GLORY), 1);
    expect(await thread(BENS_POST)).toEqual([]);
  });

  it("a post nobody replied to is gone", async () => {
    const t = world();
    as(ANNA);
    const { status, json } = await call("DELETE", "posts", HER_VERSE);
    expect([status, json.outcome]).toEqual([200, "deleted"]);
    expect(row(t.community_posts, HER_VERSE)).toBeUndefined();
  });

  it("a post others replied to keeps their replies, under a placeholder that names nobody", async () => {
    const t = world();
    as(ANNA);
    const { status, json } = await call("DELETE", "posts", ON_FASTING);
    expect([status, json.outcome]).toEqual([200, "withdrawn"]);
    const kept = row(t.community_posts, ON_FASTING)!;
    expect([kept.status, kept.title, kept.body, kept.author_name, kept.author_avatar, kept.author_handle]).toEqual(["withdrawn", null, null, "Reader", null, null]);
    // Ben's reply is his, and stays; the mention that quoted her post goes.
    expect(row(t.community_post_replies, BEN_ON_FASTING)!.status).toBe("visible");
    expect(row(t.community_notifications, "n3")).toBeUndefined();
    expect(row(t.community_notifications, "n2")).toBeDefined();

    // Its thread still opens, and the feed shows the placeholder in its place.
    expect((await thread(ON_FASTING)).map((r) => r.id)).toContain(BEN_ON_FASTING);
    const shown = row(await feed(), ON_FASTING)!;
    expect(shown.removed_by_author).toBe(true);
    expect([shown.title, shown.body, shown.author_name, shown.author_avatar, shown.author_handle]).toEqual([null, null, "Reader", null, null]);
    expect(JSON.stringify(shown)).not.toMatch(/Anna|anna|fasting|Wednesdays/);
    // A reply under it is refused: the thread is there to be read.
    as(BEN);
    const { POST } = await import("@/app/api/community/posts/[id]/replies/route");
    const res = await POST(
      new Request(`https://purifyapp.net/api/community/posts/${ON_FASTING}/replies`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: "Hello?" }) }),
      { params: Promise.resolve({ id: ON_FASTING }) },
    );
    expect(res.status).toBe(404);
  });

  it("refuses another reader's post or reply, and deletes nothing", async () => {
    const t = world();
    as(BEN);
    const post = await call("DELETE", "posts", ON_FASTING);
    const reply = await call("DELETE", "replies", ANNA_THANKS);
    expect([post.status, reply.status]).toEqual([403, 403]);
    expect(row(t.community_posts, ON_FASTING)!.status).toBe("visible");
    expect(row(t.community_post_replies, ANNA_THANKS)).toBeDefined();
  });

  it("does not find a placeholder to delete again", async () => {
    world();
    as(ANNA);
    await call("DELETE", "replies", ANNA_AMEN);
    expect((await call("DELETE", "replies", ANNA_AMEN)).status).toBe(404);
  });
});

describe("as fast as a person, not a script", () => {
  it("an edit past the account's limit is refused, and nothing changes", async () => {
    const t = world();
    as(ANNA);
    state.limited = (key) => key === `community-edit-user:${ANNA}`;
    const { status, json } = await call("PATCH", "replies", ANNA_THANKS, { body: "Again." });
    expect([status, json.code]).toEqual([429, "slow_down"]);
    expect(row(t.community_post_replies, ANNA_THANKS)!.body).toBe("Thank you.");
  });

  it("a deletion past the address's limit is refused, and nothing is deleted", async () => {
    const t = world();
    as(ANNA);
    state.limited = (key) => key.startsWith("community-remove:");
    const post = await call("DELETE", "posts", HER_VERSE);
    const reply = await call("DELETE", "replies", ANNA_THANKS);
    expect([post.status, reply.status]).toEqual([429, 429]);
    expect(row(t.community_posts, HER_VERSE)).toBeDefined();
    expect(row(t.community_post_replies, ANNA_THANKS)).toBeDefined();
  });

  it("each write is limited per address and per account", () => {
    for (const file of ["app/api/community/posts/[id]/route.ts", "app/api/community/replies/[id]/route.ts"]) {
      const src = readFileSync(join(process.cwd(), file), "utf8");
      for (const key of ["community-edit:${ipKey(req.headers)}", "community-edit-user:${user.id}", "community-remove:${ipKey(req.headers)}", "community-remove-user:${user.id}"]) {
        expect(src, `${file}: ${key}`).toContain(key);
      }
    }
  });
});

describe("moderation and a placeholder", () => {
  it("a moderator cannot remove what its writer already deleted, and its writer is told nothing", async () => {
    const t = world();
    as(ANNA);
    await call("DELETE", "replies", ANNA_AMEN);
    const { runModAction } = await import("@/lib/community/moderation");
    const res = await runModAction(state.admin as SupabaseClient, { id: BEN, name: "Mod", email: null, admin: true }, "remove_reply", ANNA_AMEN, null, "spam");
    expect(res.ok).toBe(false);
    expect(t.community_notifications.filter((n) => n.kind === "removed")).toEqual([]);
    expect(row(t.community_post_replies, ANNA_AMEN)!.status).toBe("withdrawn");
  });

  it("a placeholder cannot be reported or used to block whoever deleted it", async () => {
    const t = world();
    as(ANNA);
    await call("DELETE", "replies", ANNA_AMEN);
    as(BEN);
    const { POST: report } = await import("@/app/api/community/report/route");
    const res = await report(
      new Request("https://purifyapp.net/api/community/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ replyId: ANNA_AMEN }) }),
    );
    expect(res.status).toBe(404);
    expect(t.community_reports).toEqual([]);
  });
});

describe("the migration", () => {
  const dir = join(process.cwd(), "supabase/migrations");
  const files = readdirSync(dir).filter((f) => readFileSync(join(dir, f), "utf8").includes("'withdrawn'"));

  it("is one file, named by the rule, sorting after every other", () => {
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^\d{14}_community_own_words\.sql$/);
    // Later than every file in the folder when it was written (AGENTS.md);
    // the newest then was the retention lists'.
    expect(files[0] > "20261113052927_retention_lists.sql").toBe(true);
  });

  it("can run twice, keeps every state there is, and changes no policy", () => {
    const sql = readFileSync(join(dir, files[0]), "utf8").replace(/--.*$/gm, "");
    for (const m of sql.matchAll(/add constraint (\w+)/g)) {
      expect(sql, m[1]).toContain(`drop constraint if exists ${m[1]}`);
      expect(sql.indexOf(`drop constraint if exists ${m[1]}`)).toBeLessThan(sql.indexOf(`add constraint ${m[1]}`));
    }
    for (const m of sql.matchAll(/add column (?!if not exists)/g)) throw new Error(`add column without if not exists at ${m.index}`);
    expect(sql).toMatch(/community_posts_status_check\s+check \(status in \('visible', 'removed', 'held', 'campaign', 'withdrawn'\)\)/);
    expect(sql).toMatch(/community_post_replies_status_check\s+check \(status in \('visible', 'removed', 'held', 'withdrawn'\)\)/);
    expect(sql).not.toMatch(/create policy|drop policy|grant |revoke /i);
    expect(readFileSync(join(dir, files[0]), "utf8")).toMatch(/^-- (NOT SIGNED|SIGNED)/m);
  });
});

describe("on the page", () => {
  const src = readFileSync(join(process.cwd(), "components/community/CommunityClient.tsx"), "utf8");

  it("the reader's own post offers Edit beside Delete, from its own menu", () => {
    expect(src).toContain('menuItems.push({ label: t("common.edit"), onSelect: () => startEdit(), disabled: busy || editing });');
  });

  it("their own reply offers Edit and Delete, and Delete asks first", async () => {
    const { replyMenuItems } = await import("@/components/community/ReplyMenu");
    const items = replyMenuItems({ signedIn: true, mine: true, reported: false, canViewProfile: false, t: (k) => k, onReport: () => {}, onViewProfile: () => {}, onEdit: () => {}, onDelete: () => {} });
    expect(items.map((i) => [i.label, Boolean(i.danger)])).toEqual([
      ["common.edit", false],
      ["community.delete", true],
    ]);
    expect(src).toContain("onDelete={() => setConfirmingReplyDelete(r.id)}");
    expect(src).toContain('title={t("community.deleteReplyConfirmTitle")}');
  });

  it("an edited post or reply says so, and a placeholder says only that its author removed it", () => {
    expect(src).toContain('{view.edited_at ? ` · ${t("community.edited")}` : null}');
    expect(src).toContain('{r.edited_at ? ` · ${t("community.edited")}` : null}');
    const placeholder = src.slice(src.indexOf("if (r.removed_by_author) {"), src.indexOf("if (r.author_muted && !opened.has(r.id)) {"));
    expect(placeholder).toContain('{t("community.removedByAuthor")} · {timeAgo(r.created_at)}');
    expect(placeholder).not.toMatch(/author_name|Avatar|ReplyMenu/);
  });

  it("a placeholder draws none of its writer's words, even this card's own copy just after deleting", () => {
    // Found by the export's walk (scripts/mock-own-words.mjs): deleted here,
    // the card turned into the placeholder and still drew the post's title
    // and words until the feed's next read came back.
    expect(src).toContain("{view.title && !editing && !removed ? (");
    expect(src).toContain("{post.quote_text && !removed ? (");
    expect(src).toContain(") : view.body && !removed ? (");
    expect(src).toContain("{(longBody || longQuote) && !editing && !removed ? (");
    expect(src).toContain("{feast && post.feast_slug && !removed ? (");
  });

  it("a thread's reply box, its Reply button and a reply open to edit are 44px tall at every width", () => {
    // At 800 and 1032 they stood 40.7px (scripts/mock-own-words.mjs, checkMock's target):
    // on a phone the 16px a field is held to made them tall enough.
    expect(src).toContain('className={field + " min-h-11 !py-2"}');
    expect(src).toContain('className="min-h-11 shrink-0 rounded-pill bg-paper px-4 font-sans text-detail font-semibold text-night disabled:opacity-50"');
    const edit = readFileSync(join(process.cwd(), "components/community/EditWords.tsx"), "utf8");
    expect(edit).toContain('reply ? "min-h-11 !py-2" : "min-h-24 leading-[22px]"');
  });

  it("the words open as fields with Cancel and Save, each 44px to the touch", async () => {
    const { EditWords } = await import("@/components/community/EditWords");
    const { MessagesProvider } = await import("@/components/i18n/MessagesProvider");
    const { getMessages } = await import("@/lib/i18n");
    const html = renderToStaticMarkup(
      createElement(
        MessagesProvider,
        { locale: "en", messages: getMessages("en") } as Parameters<typeof MessagesProvider>[0],
        createElement(EditWords, { kind: "reply", body: "Thank you.", onBody: () => {}, fieldRef: { current: null }, fieldClass: "field", canSave: true, onSave: () => {}, onCancel: () => {} }),
      ),
    );
    expect(html).toContain(">Cancel</button>");
    expect(html).toContain(">Save</button>");
    // Both buttons, and the reply's field itself.
    expect(html.match(/<button[^>]*min-h-11/g)).toHaveLength(2);
    expect(html).toMatch(/<textarea[^>]*min-h-11/);
    expect(html).toContain("Thank you.");
  });
});
