import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

// "Clear profile" also deletes the reader's banner files, which
// lib/profile/__tests__/bannerRoutes.test.ts holds; Anna has none.
vi.mock("@/lib/profile/bannerFile", () => ({ deleteBannerFiles: async () => {} }));

import { readOpenReports, readPendingHolds, runModAction, type ModActor } from "@/lib/community/moderation";
import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

/**
 * A prayer request's words in the moderation queue (1.7.1), as a post's are:
 * what the word filter masked waits there as written, and a moderator puts
 * it back, keeps it masked, or takes the words down while the request stays
 * up. "Clear profile" takes them too. Before
 * docs/1.8-build/sql/prayer-request-intention.sql there is no profile_id, and
 * the queue reads as it did.
 */

type Row = Record<string, unknown>;

const ANNA = "11111111-1111-4111-8111-111111111111";
const MOD: ModActor = { id: null, name: "Moderator", email: "team@example.com", admin: true };

function world({ profileIdColumn = true } = {}) {
  const tables = {
    profiles: [{ id: ANNA, handle: "anna", display_name: "Anna", prayer_request_at: new Date().toISOString(), prayer_request_intention: "For my brother, a ******" }] as Row[],
    community_text_holds: [
      { id: "hold-request", post_id: null, reply_id: null, profile_id: ANNA, reason: "words", detail: null, original_title: null, original_body: "For my brother, a zorbak", hits: 1, status: "pending", created_at: "2026-10-18T10:00:00Z" },
      { id: "hold-post", post_id: "post-1", reply_id: null, profile_id: null, reason: "words", detail: null, original_title: null, original_body: "zorbak", hits: 1, status: "pending", created_at: "2026-10-18T09:00:00Z", post: { id: "post-1", kind: "discussion", title: null, body: "******", author_name: "Ben", author_handle: "ben", status: "visible" }, reply: null },
    ] as Row[],
    community_reports: [{ id: "report-1", post_id: null, reply_id: null, profile_id: ANNA, reason: "words", status: "open", created_at: "2026-10-18T11:00:00Z" }] as Row[],
    community_mod_log: [] as Row[],
    community_posts: [] as Row[],
  };
  if (!profileIdColumn) for (const h of tables.community_text_holds) delete h.profile_id;
  const { client } = cappedApi(tables, {}, {
    // Before the SQL, a read that names profile_id fails as Postgres fails it, the first time it is tried.
    fail: ({ table, n }) =>
      !profileIdColumn && table === "community_text_holds" && n === 1
        ? { code: "42703", message: "column community_text_holds.profile_id does not exist" }
        : null,
  });
  return { admin: client as SupabaseClient, tables };
}

describe("the queue", () => {
  it("shows a request's held words with who asked and the words as others see them, never the account id", async () => {
    const { admin } = world();
    const { rows, live } = await readPendingHolds(admin);
    expect(live).toBe(true);
    const request = rows.find((r) => r.id === "hold-request")!;
    expect(request.profile).toEqual({ handle: "anna", name: "Anna", intention: "For my brother, a ******" });
    expect(request).not.toHaveProperty("profile_id");
    expect(JSON.stringify(rows)).not.toContain(ANNA);
    // A post's hold is as it was.
    expect(rows.find((r) => r.id === "hold-post")!.profile).toBeNull();
  });

  it("reads as it did before the column exists", async () => {
    const { admin } = world({ profileIdColumn: false });
    const { rows } = await readPendingHolds(admin);
    expect(rows.map((r) => r.id).sort()).toEqual(["hold-post", "hold-request"]);
    for (const r of rows) expect(r.profile).toBeNull();
  });

  it("shows a reported profile's request words beside the rest of what the reader wrote", async () => {
    const { admin } = world();
    const [report] = await readOpenReports(admin);
    expect((report.profile as Row).intention).toBe("For my brother, a ******");
    expect(report).not.toHaveProperty("profile_id");
  });
});

describe("a moderator's decision", () => {
  it("approving puts the words back as written", async () => {
    const { admin, tables } = world();
    expect(await runModAction(admin, MOD, "approve_hold", "hold-request")).toEqual({ ok: true });
    expect(tables.profiles[0].prayer_request_intention).toBe("For my brother, a zorbak");
    expect(tables.community_text_holds[0].status).toBe("approved");
    expect(tables.community_mod_log[0]).toMatchObject({ action: "approve_words", target_kind: "profile", target_id: "hold-request" });
  });

  it("keeping leaves them masked", async () => {
    const { admin, tables } = world();
    expect(await runModAction(admin, MOD, "keep_hold", "hold-request")).toEqual({ ok: true });
    expect(tables.profiles[0].prayer_request_intention).toBe("For my brother, a ******");
    expect(tables.community_text_holds[0].status).toBe("kept");
    expect(tables.community_mod_log[0]).toMatchObject({ action: "keep_masked", target_kind: "profile" });
  });

  it("removing takes the words down and leaves the request up", async () => {
    const { admin, tables } = world();
    const since = tables.profiles[0].prayer_request_at;
    expect(await runModAction(admin, MOD, "remove_hold", "hold-request")).toEqual({ ok: true });
    expect(tables.profiles[0].prayer_request_intention).toBeNull();
    expect(tables.profiles[0].prayer_request_at).toBe(since);
    expect(tables.community_text_holds[0].status).toBe("removed");
    expect(tables.community_mod_log[0]).toMatchObject({ action: "remove_request_words", target_kind: "profile", summary: "@anna: For my brother, a zorbak" });
  });

  it("is made once", async () => {
    const { admin } = world();
    await runModAction(admin, MOD, "keep_hold", "hold-request");
    expect(await runModAction(admin, MOD, "approve_hold", "hold-request")).toMatchObject({ ok: false, status: 409 });
  });

  it("clearing a reported profile takes the request's words, and closes their hold", async () => {
    const { admin, tables } = world();
    expect(await runModAction(admin, MOD, "clear_profile", "report-1")).toEqual({ ok: true });
    expect(tables.profiles[0].prayer_request_intention).toBeNull();
    expect(typeof tables.profiles[0].prayer_request_at).toBe("string");
    expect(tables.community_text_holds.find((h) => h.id === "hold-request")!.status).toBe("removed");
    // A post's hold is not the profile's.
    expect(tables.community_text_holds.find((h) => h.id === "hold-post")!.status).toBe("pending");
  });
});
