import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

/**
 * The requests that stood on the prayer wall when 1.9 shipped, cleared
 * fourteen days on (lib/community/prayerRequestsEnd.ts; his "wall B" of
 * 2026-11-10, and the arbiter's line he said yes to with it: shown to no one
 * from 1.9, cleared fourteen days after it ships).
 *
 * What would go wrong if these broke: a reader's words about an illness
 * kept in the database for good, with no screen that shows them and no way
 * to take them down; requests cleared before their day, or on a day nobody
 * wrote; a profile's other lines, a moderator's other holds or a reader's
 * inbox swept away with them; a second run that does something the first
 * did not.
 */

// The heartbeat's other jobs are not what is tried here.
vi.mock("@/lib/ops/prune", () => ({ pruneReports: async () => ({}) }));
vi.mock("@/lib/shop/abandonedSweep", () => ({ sweepAbandonedCheckouts: async () => ({ swept: 0 }) }));
vi.mock("@/lib/ambassadors/payouts", () => ({ clearMatured: async () => ({}), runAmbassadorPayouts: async () => ({}) }));
vi.mock("@/lib/email/jobs", () => ({ runEmailJobs: async () => ({ running: 0, allowance: 0, reports: [] }) }));
vi.mock("@/lib/shop/cartReminderSweep", () => ({ sendCartReminders: async () => ({}) }));
vi.mock("@/lib/admin/plannerDigest", () => ({ sendPlannerDigest: async () => ({}) }));
vi.mock("@/lib/admin/weeklyLetter", () => ({ sendWeeklyLetter: async () => ({}) }));
vi.mock("@/lib/campaigns/upkeep", () => ({ runCampaignUpkeep: async () => ({}) }));
vi.mock("@/lib/campaigns/julyRows", async (original) => ({
  ...(await original<typeof import("@/lib/campaigns/julyRows")>()),
  forgetJulyRows: async () => ({ state: "unset" }),
}));

import { CAMPAIGNS_OPENING, __setCampaignsOpening } from "@/lib/campaigns/flags";
import { JULY_KEPT_DAYS, NOT_BEFORE, SHIPPED_ON, julyRowsDay } from "@/lib/campaigns/julyRows";
import { REQUESTS_KEPT_DAYS, REQUESTS_MARK, endPrayerRequests, requestsEndDay } from "@/lib/community/prayerRequestsEnd";
import { runMaintenance } from "@/lib/ops/maintenance";
import { PRAYER_REQUEST_MS } from "@/lib/profile/server";

type Row = Record<string, unknown>;

const ANNA = "11111111-1111-4111-8111-111111111111";
const BEN = "22222222-2222-4222-8222-222222222222";
const CARA = "33333333-3333-4333-8333-333333333333";
const DAN = "44444444-4444-4444-8444-444444444444";

/** 1.9 shipped on 20 November: the old requests are cleared on 4 December. */
const SHIPPED = "2026-11-20";
const THE_DAY = Date.parse("2026-12-04T00:00:30.000Z");
const THE_EVE = Date.parse("2026-12-03T23:59:59.000Z");

let tables: { profiles: Row[]; community_text_holds: Row[]; profile_prayers: Row[]; community_notifications: Row[]; data_moves: Row[]; community_mod_log: Row[] };
let reads: { table: string }[];
/** Every table a run asked of, read or write, in order. */
let asked: string[];
let admin: SupabaseClient;

function world() {
  tables = {
    profiles: [
      // Asked the day before 1.9 shipped, with words.
      { id: ANNA, handle: "anna", bio: "A reader in Athens", prayer_request_at: "2026-11-19T10:00:00.000Z", prayer_request_intention: "For my mother, who is ill" },
      // Asked in October, lapsed long ago; its words were never cleared.
      { id: BEN, handle: "ben", bio: null, prayer_request_at: "2026-10-01T10:00:00.000Z", prayer_request_intention: "For my exams" },
      // Words left behind with no time.
      { id: CARA, handle: "cara", bio: "Hello", prayer_request_at: null, prayer_request_intention: "For last spring" },
      // Never asked.
      { id: DAN, handle: "dan", bio: "A reader", prayer_request_at: null, prayer_request_intention: null },
    ],
    community_text_holds: [
      { id: "h-request", profile_id: ANNA, post_id: null, reply_id: null, original_body: "For my mother, a zorbak", hits: 1, status: "pending" },
      // A hold on a post, and a request's hold a moderator has already decided: neither is this job's.
      { id: "h-post", profile_id: null, post_id: "p1", reply_id: null, original_body: "A post's words", hits: 1, status: "pending" },
      { id: "h-decided", profile_id: BEN, post_id: null, reply_id: null, original_body: "Old words", hits: 1, status: "approved", resolved_by_email: "mod@example.com", resolved_at: "2026-10-02T09:00:00.000Z" },
    ],
    profile_prayers: [
      { owner_id: ANNA, prayer_id: BEN, request_at: "2026-11-19T10:00:00.000Z" },
      { owner_id: ANNA, prayer_id: CARA, request_at: "2026-11-19T10:00:00.000Z" },
      { owner_id: BEN, prayer_id: ANNA, request_at: "2026-10-01T10:00:00.000Z" },
    ],
    // A reader's own inbox is theirs.
    community_notifications: [{ id: "n1", user_id: ANNA, kind: "prayed", actor_name: "Ben" }],
    data_moves: [],
    community_mod_log: [],
  };
  const api = cappedApi(tables, {}, { upserts: true });
  reads = api.requests;
  asked = [];
  const real = api.client;
  admin = { ...real, from: (table: string) => (asked.push(table), real.from(table)) } as unknown as SupabaseClient;
}

const run = (now = THE_DAY, shippedOn: string | null = SHIPPED) => endPrayerRequests(admin, now, { shippedOn });

beforeEach(() => {
  world();
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  __setCampaignsOpening(CAMPAIGNS_OPENING);
});

describe("the day the old requests are cleared", () => {
  it("is fourteen days after 1.9 ships: as long as a request ever lasted", () => {
    expect(REQUESTS_KEPT_DAYS).toBe(14);
    expect(REQUESTS_KEPT_DAYS * 86_400_000).toBe(PRAYER_REQUEST_MS);
    expect(requestsEndDay("2026-11-20")).toBe("2026-12-04");
    expect(requestsEndDay("2026-12-25")).toBe("2027-01-08");
    expect(requestsEndDay(NOT_BEFORE)).toBe("2026-11-24");
  });

  it("is no day at all while none is written, or what is written is not a day, or is before his word", () => {
    for (const written of [null, "", "soon", "20261120", "2026-13-01", "2026-02-30", "2026-11-09", "2025-12-25"]) {
      expect(requestsEndDay(written), String(written)).toBeNull();
    }
  });

  it("counts from the one line the release commit writes, the same as July's rows, and comes before them", () => {
    expect(requestsEndDay()).toBe(SHIPPED_ON === null ? null : requestsEndDay(SHIPPED_ON));
    expect(julyRowsDay() === null).toBe(requestsEndDay() === null);
    expect(REQUESTS_KEPT_DAYS).toBeLessThan(JULY_KEPT_DAYS);
    // One line for both: this file names no day of its own.
    const source = readFileSync(join(process.cwd(), "lib/community/prayerRequestsEnd.ts"), "utf8");
    expect(source).toContain('import { NOT_BEFORE, SHIPPED_ON } from "@/lib/campaigns/julyRows";');
    expect(source).not.toMatch(/"20\d\d-\d\d-\d\d"/);
  });
});

describe("before the day", () => {
  it("reads nothing and clears nothing while no day is written, or the day has not come", async () => {
    const before = structuredClone(tables);
    expect(await run(THE_DAY, null)).toEqual({ state: "unset", why: "the day 1.9 shipped is not written yet" });
    expect(await run(THE_DAY, "2026-02-30")).toEqual({ state: "unset", why: "the day written is not one to count from" });
    expect(await run(THE_EVE)).toEqual({ state: "waiting", from: "2026-12-04" });
    expect(await run(Date.parse("2026-11-20T12:00:00Z"))).toEqual({ state: "waiting", from: "2026-12-04" });
    expect(asked).toEqual([]);
    expect(tables).toEqual(before);
  });
});

describe("on the day", () => {
  it("clears every request's time and words, the holds on those words, and who prayed, and says how many", async () => {
    expect(await run()).toEqual({ state: "ran", from: "2026-12-04", requests: 2, words: 3, holds: 1, emptied: 1, prayers: 3, marked: true });
    for (const profile of tables.profiles) {
      expect(profile.prayer_request_at, String(profile.handle)).toBeNull();
      expect(profile.prayer_request_intention, String(profile.handle)).toBeNull();
    }
    expect(tables.profile_prayers).toEqual([]);
    expect(tables.data_moves.map((row) => row.name)).toEqual([REQUESTS_MARK]);
  });

  it("touches nothing else: not a profile's other lines, not another hold, not a reader's inbox", async () => {
    await run();
    expect(tables.profiles.map((p) => [p.id, p.handle, p.bio])).toEqual([
      [ANNA, "anna", "A reader in Athens"],
      [BEN, "ben", null],
      [CARA, "cara", "Hello"],
      [DAN, "dan", "A reader"],
    ]);
    // The post's hold waits as it did, words and all.
    expect(tables.community_text_holds.map((h) => h.id)).toEqual(["h-post", "h-decided"]);
    expect(tables.community_text_holds[0]).toMatchObject({ id: "h-post", original_body: "A post's words", status: "pending" });
    expect(tables.community_notifications).toHaveLength(1);
    expect(new Set(asked)).toEqual(new Set(["profiles", "community_text_holds", "profile_prayers", "data_moves", "community_mod_log"]));
  });

  it("a hold a moderator had decided keeps its record and loses the reader's words", async () => {
    await run();
    const decided = tables.community_text_holds.find((h) => h.id === "h-decided");
    expect(decided).toEqual({ id: "h-decided", profile_id: BEN, post_id: null, reply_id: null, original_body: null, hits: 1, status: "approved", resolved_by_email: "mod@example.com", resolved_at: "2026-10-02T09:00:00.000Z" });
    // Nowhere in what is left is a word any reader wrote of their request.
    expect(JSON.stringify([tables.profiles, tables.community_text_holds.filter((h) => h.profile_id), tables.profile_prayers])).not.toMatch(/mother|exams|spring|Old words|zorbak/);
  });

  it("says so once in the moderators' log, in counts, with no words and no names", async () => {
    await run();
    expect(tables.community_mod_log).toHaveLength(1);
    const line = tables.community_mod_log[0];
    expect(line).toMatchObject({ actor_id: null, actor_name: "Auto-moderation", action: "requests_ended", target_kind: "hold", target_id: null });
    expect(line.summary).toBe("Asking for prayers ended with the prayer wall: 2 requests cleared, 3 with words, 1 waiting holds deleted, 1 decided holds emptied of their words, 3 prayers deleted.");
    expect(String(line.summary)).not.toMatch(/anna|ben|cara|mother|exams|spring|zorbak|@/i);
    // A run that changes nothing says nothing.
    await run(THE_DAY + 86_400_000);
    expect(tables.community_mod_log).toHaveLength(1);
  });

  it("reads no profile and no request to do it: it only sets empty what is set", async () => {
    await run();
    expect(reads).toEqual([]);
  });

  it("a second run changes nothing", async () => {
    await run();
    const after = structuredClone(tables);
    expect(await run(THE_DAY + 86_400_000)).toEqual({ state: "ran", from: "2026-12-04", requests: 0, words: 0, holds: 0, emptied: 0, prayers: 0, marked: true });
    expect(tables).toEqual(after);
    expect(tables.data_moves).toHaveLength(1);
  });
});

describe("a database that lacks a part, or fails", () => {
  /** A client where one table's writes answer with an error. */
  function failing(table: string, error: { code: string; message: string }, when: (patch: Row | null) => boolean = () => true): SupabaseClient {
    const real = cappedApi(tables, {}, { upserts: true }).client;
    const broken = (): Record<string, unknown> => {
      const q: Record<string, unknown> = {};
      for (const method of ["not", "eq", "select"]) q[method] = () => q;
      q.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: null, error }).then(resolve);
      return q;
    };
    return {
      ...real,
      from: (name: string) => {
        const q = real.from(name) as unknown as { update: (patch: Row) => unknown; delete: () => unknown };
        if (name !== table) return q;
        return { ...q, update: (patch: Row) => (when(patch) ? broken() : q.update(patch)), delete: () => (when(null) ? broken() : q.delete()) };
      },
    } as unknown as SupabaseClient;
  }

  it("says absent for the words' column before its SQL, and for a table that is not there, and clears the rest", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const noWords = failing("profiles", { code: "42703", message: "column profiles.prayer_request_intention does not exist" }, (patch) => Boolean(patch && "prayer_request_intention" in patch));
    expect(await endPrayerRequests(noWords, THE_DAY, { shippedOn: SHIPPED })).toEqual({ state: "ran", from: "2026-12-04", requests: 2, words: "absent", holds: 1, emptied: 1, prayers: 3, marked: true });

    world();
    const noPrayers = cappedApi({ ...tables, profile_prayers: undefined as never }, {}, { upserts: true }).client;
    expect(await endPrayerRequests(noPrayers, THE_DAY, { shippedOn: SHIPPED })).toMatchObject({ state: "ran", requests: 2, words: 3, holds: 1, prayers: "absent", marked: true });
  });

  it("when a step fails the others still run, the mark is held back, and the next run finishes", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const down = failing("profile_prayers", { code: "XX000", message: "boom" });
    expect(await endPrayerRequests(down, THE_DAY, { shippedOn: SHIPPED })).toEqual({ state: "ran", from: "2026-12-04", requests: 2, words: 3, holds: 1, emptied: 1, prayers: "failed", marked: false });
    expect(tables.profile_prayers).toHaveLength(3);
    expect(tables.data_moves).toEqual([]);

    expect(await run(THE_DAY + 86_400_000)).toEqual({ state: "ran", from: "2026-12-04", requests: 0, words: 0, holds: 0, emptied: 0, prayers: 3, marked: true });
    expect(tables.profile_prayers).toEqual([]);
  });
});

describe("what it may write, read from its own code", () => {
  const source = readFileSync(join(process.cwd(), "lib/community/prayerRequestsEnd.ts"), "utf8").replace(/^\s*\/\/.*$/gm, "");

  it("three updates: the request's two fields, and a decided hold's words; each only where one is set", () => {
    expect(source.match(/\.update\(/g)).toHaveLength(3);
    expect(source).toContain('admin.from("profiles").update({ prayer_request_at: null }).not("prayer_request_at", "is", null)');
    expect(source).toContain('admin.from("profiles").update({ prayer_request_intention: null }).not("prayer_request_intention", "is", null)');
    // Only a hold on a request's words (profile_id is set on those and on no other), and only its words.
    expect(source).toContain('admin.from("community_text_holds").update({ original_body: null }).not("profile_id", "is", null).not("original_body", "is", null)');
  });

  it("two deletes: the holds on a request's words that still wait, and who prayed; never a profile, a post or a notice", () => {
    expect(source.match(/\.delete\(\)/g)).toHaveLength(2);
    expect(source).toContain('admin.from("community_text_holds").delete().not("profile_id", "is", null).eq("status", "pending")');
    expect(source).toContain('admin.from("profile_prayers").delete().not("owner_id", "is", null)');
    expect([...source.matchAll(/\.from\("([a-z_]+)"\)/g)].map((m) => m[1]).sort()).toEqual(["community_text_holds", "community_text_holds", "data_moves", "profile_prayers", "profiles", "profiles"]);
    // Its one line for the moderators goes through the log's own writer, and it writes nothing else of its own.
    expect(source).not.toMatch(/\.insert\(/);
    expect(source.match(/logMod\(/g)).toHaveLength(1);
    expect(source).toContain('await logMod(admin, AUTO, { action: "requests_ended", target: "hold", summary });');
  });
});

describe("on the heartbeat", () => {
  it("rides it once a day, whatever campaigns' switch says, with nothing passed but the time", async () => {
    __setCampaignsOpening("closed");
    const ran = await runMaintenance(admin, THE_DAY);
    expect(ran.prayerRequestsEnd).toEqual(
      SHIPPED_ON === null
        ? { ran: true, ok: true, detail: { state: "unset", why: "the day 1.9 shipped is not written yet" } }
        : expect.objectContaining({ ran: true, ok: true }),
    );
    if (SHIPPED_ON === null) expect(asked.filter((table) => table === "profiles" || table === "profile_prayers")).toEqual([]);
    expect((await runMaintenance(admin, THE_DAY + 3_600_000)).prayerRequestsEnd).toEqual({ ran: false });
    expect((await runMaintenance(admin, THE_DAY + 21 * 3_600_000)).prayerRequestsEnd).toMatchObject({ ran: true });

    const maintenance = readFileSync(join(process.cwd(), "lib/ops/maintenance.ts"), "utf8");
    expect(maintenance).toContain('report.prayerRequestsEnd = await every("prayerRequestsEnd", 20 * 3_600_000, now, () => endPrayerRequests(admin, now));');
    expect(maintenance.match(/endPrayerRequests\(/g)).toHaveLength(1);
  });
});
