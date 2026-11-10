// The notice that tells a reader why something they posted was removed
// (lib/community/removal.ts; his yes of 2026-11-10 to the Terms: "When we
// remove something you posted, we tell you why").
//
// What would go wrong if this broke: a removal that tells nobody, a notice the
// database refuses because the code and the SQL name different reasons, a
// notice in English for a reader in Athens, or the SQL dropping a kind of
// notice that already exists.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { notificationTarget } from "@/lib/community/notificationTarget";
import {
  DEFAULT_REMOVAL_REASON,
  REMOVAL_REASONS,
  REMOVAL_TARGETS,
  REMOVED_APPEAL_KEY,
  REMOVED_WHY_KEY,
  REMOVED_YOUR_KEY,
  removalNoticeRow,
} from "@/lib/community/removal";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const SQL = read("docs/1.9-build/sql/removal-notices.sql").replace(/--.*$/gm, "");
/** The values a check constraint allows, by its name. */
const allowed = (constraint: string) => {
  const at = SQL.indexOf(`add constraint ${constraint}`);
  const list = SQL.slice(at).match(/in \(([^)]*)\)/)?.[1] ?? "";
  return [...list.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
};

describe("the code and the SQL name the same things", () => {
  it("the same reasons and the same targets, in the same order", () => {
    expect(allowed("community_notifications_reason_check")).toEqual([...REMOVAL_REASONS]);
    expect(allowed("community_notifications_target_kind_check")).toEqual([...REMOVAL_TARGETS]);
  });

  it("every kind of notice that exists today, and 'removed'", () => {
    const kinds = allowed("community_notifications_kind_check");
    const today = read("lib/community/notify.ts").match(/export type NotificationKind =([\s\S]*?);/)?.[1] ?? "";
    for (const m of today.matchAll(/"([a-z_]+)"/g)) expect(kinds, m[1]).toContain(m[1]);
    expect(kinds).toContain("removed");
  });

  it("stays out of the migrations folder until his yes", () => {
    for (const f of fs.readdirSync(path.join(ROOT, "supabase/migrations"))) {
      expect(read(`supabase/migrations/${f}`), f).not.toContain("community_notifications_reason_check");
    }
  });
});

describe("the notice a removal writes", () => {
  it("is a 'removed' row in the poster's own inbox, from Purify, with what and why", () => {
    const row = removalNoticeRow({ userId: "u1", target: "post", reason: "spam", postId: "p1", excerpt: "  Buy   now  " });
    expect(row).toEqual({
      user_id: "u1",
      kind: "removed",
      target_kind: "post",
      reason: "spam",
      post_id: "p1",
      reply_id: null,
      actor_name: "Purify",
      excerpt: "Buy now",
    });
  });

  it("says the house rules when the moderator chose no reason", () => {
    expect(removalNoticeRow({ userId: "u1", target: "reply" }).reason).toBe(DEFAULT_REMOVAL_REASON);
    expect(DEFAULT_REMOVAL_REASON).toBe("rules");
  });

  it("keeps the excerpt short", () => {
    const row = removalNoticeRow({ userId: "u1", target: "post", excerpt: "word ".repeat(80) });
    expect((row.excerpt ?? "").length).toBeLessThanOrEqual(140);
  });

  it("opens nothing when tapped: what it is about is gone", () => {
    expect(notificationTarget({ kind: "removed", post_id: "p1", reply_id: null, actor_handle: null })).toEqual({ kind: "none" });
  });
});

describe("the reader reads it in their own language", () => {
  const dir = path.join(ROOT, "lib/i18n/messages");
  const codes = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
  const keys = [...Object.values(REMOVED_YOUR_KEY), ...Object.values(REMOVED_WHY_KEY), REMOVED_APPEAL_KEY];

  it("in all twenty-one languages, with its placeholders", () => {
    expect(codes).toHaveLength(21);
    const missing: string[] = [];
    for (const code of codes) {
      const c = JSON.parse(fs.readFileSync(path.join(dir, `${code}.json`), "utf8")) as Record<string, string>;
      for (const k of keys) if (typeof c[k] !== "string" || !c[k].trim()) missing.push(`${code}: ${k}`);
      for (const k of Object.values(REMOVED_YOUR_KEY)) if (c[k] && !c[k].includes("{reason}")) missing.push(`${code}: ${k} lacks {reason}`);
      if (c[REMOVED_APPEAL_KEY] && !c[REMOVED_APPEAL_KEY].includes("{email}")) missing.push(`${code}: appeal lacks {email}`);
      for (const k of keys) if (c[k] && /[–—]/.test(c[k])) missing.push(`${code}: ${k} has a dash`);
    }
    expect(missing).toEqual([]);
  });
});

describe("every removal by a moderator tells its poster", () => {
  it("posts and replies, from the moderation both consoles share", () => {
    const mod = read("lib/community/moderation.ts");
    expect(mod).toMatch(/writeRemovalNotice\(admin, \{ userId: p\.user_id, target: "post"/);
    expect(mod).toMatch(/writeRemovalNotice\(admin, \{ userId: r\.user_id, target: "reply"/);
    // A held post or reply removed goes the same way, with the reason.
    expect(mod).toContain('removePost(admin, actor, hold.post_id, "Held for review", code)');
  });

  it("the admin's routes carry the reason the moderator chose", () => {
    expect(read("app/api/admin/community/route.ts")).toContain("runModAction(admin, actor, sharedAction, id, reason, reason_code)");
    expect(read("app/api/admin/community/filter/route.ts")).toContain("runModAction(admin, actor, a.action, a.id, null, a.reason_code)");
    const shared = read("app/api/admin/shared-pages/route.ts");
    expect(shared).toMatch(/action === "hide" && !prior\.hidden_at[\s\S]*writeRemovalNotice\(db, \{ userId: before\.data\.owner_id, target: "shared_page"/);
  });

  it("the panel asks why before a removal that tells its poster", () => {
    const queue = read("components/admin/community/Queue.tsx");
    expect(queue).toContain("const act = (a: QueueAction) => onAction(row, withReason(a, why));");
    expect(queue).toContain("tells ? (");
  });
});
