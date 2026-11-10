import type { SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

/**
 * A block stops writing (1.9, campaigns-fable.md section 9, item 6).
 *
 * A block hid the blocked person's posts and replies from the one who blocked
 * them, and kept their mentions and follows from reaching them. It did not
 * stop them writing: they could still reply under the posts of the one who
 * blocked them (the replies route's POST never asked), and that reply still
 * told them (notifyOfReply did not look at blocks). Both are closed here: the
 * route refuses the reply, saying so plainly and naming nobody, and the
 * notice holds the block for a reply approved later from the moderation queue.
 */

type Row = Record<string, unknown>;

const ANNA = "11111111-1111-4111-8111-111111111111"; // wrote the post, and blocked Ben
const BEN = "22222222-2222-4222-8222-222222222222"; // blocked by Anna
const CARL = "33333333-3333-4333-8333-333333333333"; // blocked by nobody
const POST = "44444444-4444-4444-8444-444444444444";

const state = vi.hoisted(() => ({ admin: null as unknown, user: null as null | { id: string; email?: string; user_metadata?: Row } }));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => state.admin }));
vi.mock("@/lib/supabase/server", () => ({
  createClientFromRequest: async () => ({ auth: { getUser: async () => ({ data: { user: state.user }, error: null }) } }),
}));
vi.mock("@/lib/security/ratelimit", () => ({ rateLimited: async () => false, ipKey: () => "test" }));
// The spam filter, the word filter and the reader's standing are their own suites.
vi.mock("@/lib/community/guard", () => ({ guardWrite: async () => ({ kind: "ok", trust: {} }) }));
vi.mock("@/lib/community/adminStanding", () => ({ requestStanding: async () => null }));
vi.mock("@/lib/moderation/server", () => ({
  censorPost: async (_admin: unknown, input: { body?: string | null }) => ({ title: null, body: input.body ?? null, hits: 0 }),
  censorName: async (_admin: unknown, name: string) => name,
}));
vi.mock("@/lib/profile/server", () => ({ ensureCleanHandle: async () => {} }));

function world() {
  const tables = {
    community_posts: [{ id: POST, user_id: ANNA, reply_count: 0, status: "visible", group_id: null, category: "discussion" }] as Row[],
    community_post_replies: [] as Row[],
    community_blocks: [{ blocker_id: ANNA, blocked_id: BEN }] as Row[],
    community_notifications: [] as Row[],
    profiles: [
      { id: ANNA, handle: "anna" },
      { id: BEN, handle: "ben" },
      { id: CARL, handle: "carl" },
    ] as Row[],
  };
  const { client } = cappedApi(tables, { community_bump_reply_count: () => [] });
  state.admin = client as SupabaseClient;
  return tables;
}

async function reply(as: string, body = "Lord, have mercy.") {
  state.user = { id: as, email: `${as.slice(0, 4)}@example.com`, user_metadata: { display_name: as === BEN ? "Ben" : "Carl" } };
  const { POST: send } = await import("@/app/api/community/posts/[id]/replies/route");
  const res = await send(
    new Request(`https://purifyapp.net/api/community/posts/${POST}/replies`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    }),
    { params: Promise.resolve({ id: POST }) },
  );
  return { status: res.status, json: (await res.json()) as Row };
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_COMMUNITY_ENABLED = "1";
});

describe("a reply under the posts of someone who blocked you", () => {
  it("is refused, plainly, and nothing is written or told", async () => {
    const tables = world();
    const { status, json } = await reply(BEN);
    expect(status).toBe(403);
    expect(json.code).toBe("blocked");
    expect(json.error).toBe("You can't reply to this post.");
    // It names nobody: not who blocked whom, and no account id.
    expect(JSON.stringify(json)).not.toMatch(/anna|block(ed)? you|11111111/i);
    expect(tables.community_post_replies).toEqual([]);
    expect(tables.community_notifications).toEqual([]);
  });

  it("is written and told as ever for everyone else", async () => {
    const tables = world();
    const { status, json } = await reply(CARL);
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(tables.community_post_replies).toHaveLength(1);
    expect(tables.community_notifications.map((n) => [n.user_id, n.kind])).toEqual([[ANNA, "reply"]]);
  });

  it("asks who wrote the post, in both reads of it", () => {
    // The stand-in database hands back whole rows, so only the route's own
    // words show the author is read: without user_id the check would pass
    // everyone.
    const src = readFileSync(join(process.cwd(), "app/api/community/posts/[id]/replies/route.ts"), "utf8");
    const reads = [...src.matchAll(/readPost\("([^"]+)"\)/g)].map((m) => m[1]);
    expect(reads.length).toBeGreaterThanOrEqual(2);
    for (const cols of reads) expect(cols.split(/,\s*/)).toContain("user_id");
  });
});

describe("the reader who was refused", () => {
  it("is told why, and keeps their words: nothing waits as \"Not sent\" to try again", () => {
    const src = readFileSync(join(process.cwd(), "components/community/CommunityClient.tsx"), "utf8");
    const at = src.indexOf('res.code === "blocked"');
    expect(at).toBeGreaterThan(-1);
    const branch = src.slice(at, src.indexOf("return;", at));
    expect(branch).toContain("setPending((list) => list.filter((p) => p.tempId !== tempId));");
    expect(branch).toContain("setDraft(text);");
    expect(branch).toContain('setActionError(res.error ?? t("community.replyFailed"));');
  });
});

describe("the notice of a reply", () => {
  it("is not sent to someone who blocked the writer", async () => {
    const tables = world();
    const { notifyOfReply } = await import("@/lib/community/notify");
    const told = await notifyOfReply({ admin: state.admin as SupabaseClient, postId: POST, replyId: "r-1", actorId: BEN, actorName: "Ben", excerpt: "Written before the block" });
    expect(told).toBeNull();
    expect(tables.community_notifications).toEqual([]);
  });

  it("is sent as ever when there is no block", async () => {
    const tables = world();
    const { notifyOfReply } = await import("@/lib/community/notify");
    const told = await notifyOfReply({ admin: state.admin as SupabaseClient, postId: POST, replyId: "r-2", actorId: CARL, actorName: "Carl", excerpt: "Amen" });
    expect(told).toBe(ANNA);
    expect(tables.community_notifications).toHaveLength(1);
  });
});
