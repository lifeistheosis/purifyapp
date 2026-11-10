import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/profile/bannerFile", () => ({ deleteBannerFiles: async () => {} }));

import { DANGER_HOLD_DETAIL } from "@/lib/campaigns/safety";
import { DANGER_NEEDS_REASON_CODE, DANGER_NOT_QUOTED, repliesHeldForDanger } from "@/lib/community/dangerHolds";
import { runModAction, type ModActor } from "@/lib/community/moderation";
import { DEFAULT_REMOVAL_REASON, REMOVAL_REASONS } from "@/lib/community/removal";
import { readTrust } from "@/lib/community/trustServer";
import { client, world, type World } from "@/lib/security/__tests__/fakeSupabase";

/**
 * The moderators' rule for words the safety line held
 * (lib/community/dangerHolds.ts; Admin's, 2026-11-10): an update or a
 * comment under a prayer campaign whose words may mean its writer is in
 * danger.
 *
 * What would go wrong if these broke: a reader who wrote that they do not
 * want to live is told their words were "against the house rules"; is put
 * under tighter limits for having written them; or has the start of those
 * words kept for good in the moderators' log.
 */

const BEN = "22222222-2222-4222-8222-222222222222";
const CARA = "33333333-3333-4333-8333-333333333333";
const CAMPAIGN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const THREAD = "99999999-9999-4999-8999-999999999900";
const R_DANGER = "99999999-9999-4999-8999-999999999901";
const R_PLAIN = "99999999-9999-4999-8999-999999999902";
const R_BOTH = "99999999-9999-4999-8999-999999999903";
const H_DANGER = "88888888-8888-4888-8888-888888888801";
const H_PLAIN = "88888888-8888-4888-8888-888888888802";
const H_BOTH = "88888888-8888-4888-8888-888888888803";
const MOD: ModActor = { id: null, name: "Moderator", email: "team@example.com", admin: true };
const NOW = Date.now();
const WORDS = "Some days I do not want to live any more myself.";

let w: World;
let admin: SupabaseClient;

const replies = () => w.tables.community_post_replies!;
const reply = (id: string) => replies().find((r) => r.id === id)!;
const holds = () => w.tables.community_text_holds!;
const hold = (id: string) => holds().find((h) => h.id === id)!;
const log = () => w.tables.community_mod_log!;
const notices = () => w.tables.community_notifications!;
const ben = { id: BEN, email: "ben@example.com", created_at: new Date(NOW - 200 * 86_400_000).toISOString(), user_metadata: {} };
const cara = { id: CARA, email: "cara@example.com", created_at: new Date(NOW - 200 * 86_400_000).toISOString(), user_metadata: {} };

beforeEach(() => {
  w = world();
  w.users = new Set([BEN, CARA]);
  w.tables.profiles = [BEN, CARA].map((id) => ({ id, joined_at: new Date(NOW - 200 * 86_400_000).toISOString() }));
  w.tables.user_badges = [];
  w.tables.community_posts = [{ id: THREAD, user_id: null, title: "For Maria", body: null, author_name: "Anna", status: "campaign", campaign_id: CAMPAIGN, created_at: new Date(NOW).toISOString() }];
  const at = new Date(NOW - 60_000).toISOString();
  w.tables.community_post_replies = [
    // Ben's comment, which may mean he is in danger: held by the safety line.
    { id: R_DANGER, post_id: THREAD, user_id: BEN, body: WORDS, author_name: "Ben", status: "held", created_at: at },
    // Cara's, held for an ordinary reason.
    { id: R_PLAIN, post_id: THREAD, user_id: CARA, body: "Please donate to her family.", author_name: "Cara", status: "held", created_at: at },
    // Cara's again: a new account's first words that also carry the mark.
    { id: R_BOTH, post_id: THREAD, user_id: CARA, body: "Thoughts of suicide again tonight.", author_name: "Cara", status: "held", created_at: at },
  ];
  w.tables.community_text_holds = [
    { id: H_DANGER, post_id: null, reply_id: R_DANGER, reason: "spam", detail: DANGER_HOLD_DETAIL, original_title: null, original_body: null, hits: 1, status: "pending", created_at: at },
    { id: H_PLAIN, post_id: null, reply_id: R_PLAIN, reason: "spam", detail: "money asked under a prayer campaign", original_title: null, original_body: null, hits: 1, status: "pending", created_at: at },
    { id: H_BOTH, post_id: null, reply_id: R_BOTH, reason: "new_account", detail: "crisis; first words from a new account", original_title: null, original_body: null, hits: 1, status: "pending", created_at: at },
  ];
  w.tables.community_mod_log = [];
  w.tables.community_notifications = [];
  w.tables.community_reports = [];
  admin = client(w) as unknown as SupabaseClient;
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("which words the safety line held", () => {
  it("is read from the hold's mark, whatever reason it is filed under", async () => {
    expect([...(await repliesHeldForDanger(admin, [R_DANGER, R_PLAIN, R_BOTH]))].sort()).toEqual([R_DANGER, R_BOTH].sort());
    expect(await repliesHeldForDanger(admin, [R_PLAIN])).toEqual(new Set());
    expect(await repliesHeldForDanger(admin, [])).toEqual(new Set());
    expect(await repliesHeldForDanger(admin, [null, undefined, ""])).toEqual(new Set());
  });

  it("still knows them once the hold is decided: the rule outlives the queue", async () => {
    hold(H_DANGER).status = "removed";
    expect(await repliesHeldForDanger(admin, [R_DANGER])).toEqual(new Set([R_DANGER]));
  });

  it("reads as none where the holds cannot be read, and never throws", async () => {
    w.tables.community_text_holds = null as never;
    expect(await repliesHeldForDanger(admin, [R_DANGER])).toEqual(new Set());
    const broken = { from: () => { throw new Error("down"); } } as unknown as SupabaseClient;
    expect(await repliesHeldForDanger(broken, [R_DANGER])).toEqual(new Set());
  });
});

describe("removing them", () => {
  it("is refused with no reason chosen, and with the reason that stands for none; nothing is changed", async () => {
    for (const code of [undefined, null, DEFAULT_REMOVAL_REASON] as const) {
      const res = await runModAction(admin, MOD, "remove_hold", H_DANGER, null, code);
      expect(res, String(code)).toMatchObject({ ok: false, status: 400, code: DANGER_NEEDS_REASON_CODE });
      expect((res as { error: string }).error).toContain("never removed as against the house rules");
    }
    expect(reply(R_DANGER)).toMatchObject({ status: "held" });
    expect(reply(R_DANGER).removed_by_email ?? null).toBeNull();
    expect(hold(H_DANGER).status).toBe("pending");
    expect(log()).toEqual([]);
    expect(notices()).toEqual([]);
  });

  it("the same by the other road to the same words, a report's Remove", async () => {
    expect(await runModAction(admin, MOD, "remove_reply", R_DANGER)).toMatchObject({ ok: false, status: 400, code: DANGER_NEEDS_REASON_CODE });
    expect(await runModAction(admin, MOD, "remove_reply", R_BOTH, null, "rules")).toMatchObject({ ok: false, status: 400, code: DANGER_NEEDS_REASON_CODE });
    expect(replies().map((r) => r.status)).toEqual(["held", "held", "held"]);
  });

  it("goes through for a reason a moderator chose, and the notice says that reason", async () => {
    for (const code of REMOVAL_REASONS.filter((r) => r !== DEFAULT_REMOVAL_REASON)) {
      reply(R_DANGER).status = "held";
      reply(R_DANGER).removed_by_email = null;
      hold(H_DANGER).status = "pending";
      w.tables.community_notifications = [];
      expect(await runModAction(admin, MOD, "remove_hold", H_DANGER, null, code), code).toEqual({ ok: true });
      expect(reply(R_DANGER)).toMatchObject({ status: "removed", removed_by_email: "team@example.com" });
      expect(notices(), code).toMatchObject([{ user_id: BEN, kind: "removed", target_kind: "comment", reason: code }]);
    }
  });

  it("is never against their writer: their standing is as it was, and the record of who removed them stays", async () => {
    const before = await readTrust(admin, ben, NOW);
    expect(before.facts).toMatchObject({ removals30d: 0, removals90d: 0 });
    expect(await runModAction(admin, MOD, "remove_hold", H_DANGER, null, "private")).toEqual({ ok: true });
    expect(reply(R_DANGER)).toMatchObject({ status: "removed", removed_by_email: "team@example.com" });
    const after = await readTrust(admin, ben, NOW);
    expect(after.facts).toMatchObject({ removals30d: 0, removals90d: 0 });
    expect(after.level).toBe(before.level);
  });

  it("an ordinary removal still counts, and one of each counts once", async () => {
    // Cara: a plain held comment removed (counts), and one the safety line held (does not).
    expect(await runModAction(admin, MOD, "remove_hold", H_PLAIN)).toEqual({ ok: true });
    expect((await readTrust(admin, cara, NOW)).facts).toMatchObject({ removals30d: 1, removals90d: 1 });
    expect(await runModAction(admin, MOD, "remove_hold", H_BOTH, null, "private")).toEqual({ ok: true });
    expect(replies().filter((r) => r.user_id === CARA).map((r) => r.status)).toEqual(["removed", "removed"]);
    expect((await readTrust(admin, cara, NOW)).facts).toMatchObject({ removals30d: 1, removals90d: 1 });
  });

  it("an ordinary held comment is removed as it always was, with no reason asked", async () => {
    expect(await runModAction(admin, MOD, "remove_hold", H_PLAIN)).toEqual({ ok: true });
    expect(reply(R_PLAIN).status).toBe("removed");
    expect(notices()).toMatchObject([{ user_id: CARA, kind: "removed" }]);
  });
});

describe("the moderators' log", () => {
  it("says such words were removed, and not the words", async () => {
    expect(await runModAction(admin, MOD, "remove_hold", H_DANGER, null, "private")).toEqual({ ok: true });
    const line = log().find((l) => l.action === "remove_reply")!;
    expect(line).toMatchObject({ target_kind: "reply", target_id: R_DANGER, summary: `Ben: ${DANGER_NOT_QUOTED}` });
    expect(JSON.stringify(log())).not.toMatch(/do not want to live|any more myself/);
  });

  it("says they were approved, and not the words; and then they show", async () => {
    expect(await runModAction(admin, MOD, "approve_hold", H_DANGER)).toEqual({ ok: true });
    expect(reply(R_DANGER).status).toBe("visible");
    expect(hold(H_DANGER).status).toBe("approved");
    const line = log().find((l) => l.action === "restore_reply")!;
    expect(line).toMatchObject({ target_id: R_DANGER, summary: `Ben: ${DANGER_NOT_QUOTED}` });
    expect(JSON.stringify(log())).not.toMatch(/do not want to live/);
    // Approving is never refused for want of a reason.
    expect(await runModAction(admin, MOD, "approve_hold", H_BOTH)).toEqual({ ok: true });
  });

  it("still quotes an ordinary comment, as it always did", async () => {
    expect(await runModAction(admin, MOD, "remove_hold", H_PLAIN)).toEqual({ ok: true });
    expect(log().find((l) => l.action === "remove_reply")!.summary).toBe("Cara: Please donate to her family.");
  });
});

describe("the moderators' page and its route", () => {
  const source = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

  it("the route carries a chosen reason through, and tells the page when one is needed", () => {
    const route = source("app/api/community/moderation/route.ts");
    expect(route).toContain("reason_code: z.enum(REMOVAL_REASONS).optional().nullable(),");
    expect(route).toContain("const res = await runModAction(who.admin, who.actor, action, id, reason, code);");
    expect(route).toContain("if (!res.ok) return NextResponse.json({ error: res.error, code: res.code }, { status: res.status });");
  });

  it("the page asks for the reason at once on such a hold, offers every reason but the one that stands for none, and sends the one chosen", () => {
    const page = source("components/community/moderation/ModerationClient.tsx");
    expect(page).toContain('if (action === "remove_hold" && queue?.holds.some((h) => h.id === id && saysDanger(h.detail))) askReason(action, id);');
    expect(page).toContain("const DANGER_REASONS = REMOVAL_REASONS.filter((r) => r !== DEFAULT_REMOVAL_REASON);");
    expect(page).toContain('if (res.code === "reason_needed") {');
    expect(page).toContain("if (r && code) void act(r.action, r.id, code);");
    // Remove stays dim until a reason is ticked.
    expect(page).toContain("disabled={!reason || busy !== null}");
    expect(DANGER_NEEDS_REASON_CODE).toBe("reason_needed");
  });
});
