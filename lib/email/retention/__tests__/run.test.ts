import fs from "node:fs";
import path from "node:path";

import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

import type { OnceMessage, SendOnceResult } from "../../sendOnce";
import { siteUrl } from "../../templates/build";
import type { RetentionKind } from "../kinds";
import { __resetLooks, __setLook, standInEmail } from "../render";
import { runRetention, type RetentionDeps } from "../run";
import { READS } from "../signals";
import { __resetRetention, __setRetention } from "../switches";

/**
 * The retention step end to end, against the stand-in database: off reads
 * nothing; the first send of each goes to the owner alone; readers only on
 * their own yes, under the weekly cap, inside the budget, once.
 */

vi.mock("server-only", () => ({}));

const DAY = 86_400_000;
const ROOT = path.resolve(__dirname, "..", "..", "..", "..");
const YES = { on: "2026-11-20", words: "yes" };
const OWNER = "owner-0001";
const ADDRESS = "1 Example Street, Tampa, FL";

let NOW = new Date("2026-11-20T11:05:00Z");
const ago = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();

/** A client that remembers every table asked for, and one that must never be asked. */
function watched(tables: Parameters<typeof cappedApi>[0]) {
  const { client } = cappedApi(tables);
  const asked: string[] = [];
  const from = client.from.bind(client);
  return { client: { ...client, from: (t: string) => (asked.push(t), from(t)) } as unknown as SupabaseClient, asked };
}
const untouchable = { from: () => { throw new Error("read while every switch is off"); } } as unknown as SupabaseClient;

function deps(over: Partial<RetentionDeps> = {}) {
  const sent: OnceMessage[] = [];
  const d: RetentionDeps = {
    ownerIds: async () => [OWNER],
    addresses: async (_a, ids) => new Map(ids.map((id) => [id, `${id}@example.com`])),
    tokenFor: async (_a, id) => `token-${id}`,
    send: async (_a, msg): Promise<SendOnceResult> => {
      sent.push(msg);
      return { status: "sent" };
    },
    ...over,
  };
  return { d, sent };
}

function on(kind: RetentionKind, position: "owner" | "readers") {
  __setRetention(kind, { position, design: YES, ...(position === "readers" ? { readers: YES, pageKnows: true } : {}) });
  __setLook(kind, standInEmail);
}

const pref = (user_id: string, over: Record<string, unknown>) => ({
  user_id,
  shop_offers: false,
  product_updates: false,
  unsubscribe_token: `token-${user_id}`,
  ...over,
});

beforeEach(() => {
  process.env.EMAIL_POSTAL_ADDRESS = ADDRESS;
  NOW = new Date("2026-11-20T11:05:00Z");
});

afterEach(() => {
  __resetRetention();
  __resetLooks();
  delete process.env.EMAIL_POSTAL_ADDRESS;
});

describe("with every switch off", () => {
  it("reads nothing and sends nothing", async () => {
    const { d, sent } = deps();
    const { report, spent } = await runRetention(untouchable, NOW, { bulkLeft: 100, ...d });
    expect(report.positions).toEqual({ first_week: "off", pick_up: "off", fasting_companion: "off" });
    expect(report.errors).toEqual([]);
    expect(sent).toEqual([]);
    expect(spent).toBe(0);
  });

  it("stays off when a switch is pushed past off with no yes to the design", async () => {
    __setRetention("first_week", { position: "owner" });
    __setLook("first_week", standInEmail);
    const { d, sent } = deps();
    await runRetention(untouchable, NOW, { bulkLeft: 100, ...d });
    expect(sent).toEqual([]);
  });
});

describe("at owner", () => {
  it("sends nothing until the approved look has dropped in: the stand-in is never sent", async () => {
    // The look has dropped in since his yes of 2026-11-13; an email without one is the case held here.
    __setLook("first_week", null);
    __setRetention("first_week", { position: "owner", design: YES });
    const { client } = watched({ email_sends: [] });
    const { d, sent } = deps();
    const { report } = await runRetention(client, NOW, { bulkLeft: 100, ...d });
    expect(report.byKind.first_week).toMatchObject({ planned: 1, no_look: 1, sent: 0 });
    expect(sent).toEqual([]);
  });

  it("sends the first of each to the owner alone, never to a reader on the list, and reads no reader", async () => {
    on("first_week", "owner");
    const { client, asked } = watched({
      email_sends: [],
      email_preferences: [pref("reader-1", { first_week: true })],
      profiles: [{ id: "reader-1", joined_at: ago(1.5) }],
    });
    const { d, sent } = deps();
    const { report } = await runRetention(client, NOW, { bulkLeft: 100, ...d });
    expect(sent.map((m) => [m.to, m.dedupeKey, m.kind])).toEqual([[`${OWNER}@example.com`, `first_week:owner:morning:${OWNER}`, "first_week"]]);
    expect(report.byKind.first_week.sent).toBe(1);
    expect(asked).not.toContain("email_preferences");
    expect(asked).not.toContain("profiles");
    // His copy says why it came, and stops this one list.
    expect(sent[0].text).toContain("your address is in ADMIN_EMAILS");
    expect(sent[0].headers?.["List-Unsubscribe"]).toContain(`l=first_week`);
    expect(sent[0].html).toContain(`l=first_week`);
  });

  it("holds everything while there is no postal address, and reads nothing", async () => {
    on("first_week", "owner");
    delete process.env.EMAIL_POSTAL_ADDRESS;
    const { d, sent } = deps();
    const { report } = await runRetention(untouchable, NOW, { bulkLeft: 100, ...d });
    expect(report.held).toBe("no_postal_address");
    expect(sent).toEqual([]);
  });
});

describe("at readers", () => {
  it("reaches only the readers whose own choice says yes: no row, null and false are all no", async () => {
    on("first_week", "readers");
    const { client } = watched({
      email_sends: [],
      email_preferences: [pref("yes", { first_week: true }), pref("null", { first_week: null }), pref("no", { first_week: false })],
      profiles: ["yes", "null", "no", "norow"].map((id) => ({ id, joined_at: ago(1.5) })),
      prayer_completions: [],
      bookmarks: [],
      annotations: [],
    });
    const { d, sent } = deps();
    await runRetention(client, NOW, { bulkLeft: 100, ...d });
    expect(sent.map((m) => m.userId)).toEqual(["yes"]);
    expect(sent[0].text).toContain(`You are getting this because you turned on "Your first week"`);
    expect(sent[0].headers).toEqual({
      "List-Unsubscribe": `<${siteUrl("/api/email/unsubscribe?t=token-yes&l=first_week")}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });

  it("skips a step the account shows done", async () => {
    on("first_week", "readers");
    const { client } = watched({
      email_sends: [],
      email_preferences: [pref("prayed", { first_week: true }), pref("new", { first_week: true })],
      profiles: [
        { id: "prayed", joined_at: ago(1.5) },
        { id: "new", joined_at: ago(1.5) },
      ],
      prayer_completions: [{ user_id: "prayed", rule_id: "morning", prayed_on: "2026-11-19", completed_at: ago(1) }],
      bookmarks: [],
      annotations: [],
    });
    const { d, sent } = deps();
    await runRetention(client, NOW, { bulkLeft: 100, ...d });
    expect(sent.map((m) => m.userId)).toEqual(["new"]);
  });

  it("keeps each reader's week to two optional emails, counting every campaign", async () => {
    on("first_week", "readers");
    const readers = ["full", "one", "older"];
    const { client } = watched({
      email_sends: [
        { id: "1", user_id: "full", kind: "weekly", status: "sent", dedupe_key: "weekly:2026-W47:full", created_at: ago(2) },
        { id: "2", user_id: "full", kind: "community_digest", status: "sent", dedupe_key: "community_digest:2026-W47:full", created_at: ago(5) },
        { id: "3", user_id: "one", kind: "name_day", status: "sent", dedupe_key: "name_day:one:2026:x", created_at: ago(1) },
        { id: "4", user_id: "one", kind: "welcome", status: "sent", dedupe_key: "welcome:one", created_at: ago(1) },
        { id: "5", user_id: "older", kind: "weekly", status: "sent", dedupe_key: "weekly:2026-W45:older", created_at: ago(8) },
        { id: "6", user_id: "older", kind: "release", status: "sent", dedupe_key: "release:1.9:older", created_at: ago(9) },
      ],
      email_preferences: readers.map((id) => pref(id, { first_week: true })),
      profiles: readers.map((id) => ({ id, joined_at: ago(1.5) })),
      prayer_completions: [],
      bookmarks: [],
      annotations: [],
    });
    const { d, sent } = deps();
    const { report } = await runRetention(client, NOW, { bulkLeft: 100, ...d });
    expect(sent.map((m) => m.userId).sort()).toEqual(["older", "one"]);
    expect(report.byKind.first_week.capped).toBe(1);
  });

  it("sends nobody anything when the week cannot be counted", async () => {
    on("first_week", "readers");
    const tables = {
      email_sends: [] as Record<string, unknown>[],
      email_preferences: [pref("a", { first_week: true })],
      profiles: [{ id: "a", joined_at: ago(1.5) }],
      prayer_completions: [],
      bookmarks: [],
      annotations: [],
    };
    const { client } = cappedApi(tables, {}, { fail: ({ table }) => (table === "email_sends" ? { message: "timeout" } : null) });
    const { d, sent } = deps();
    const { report } = await runRetention(client, NOW, { bulkLeft: 100, ...d });
    expect(sent).toEqual([]);
    expect(report.byKind.first_week.capped).toBe(1);
    expect(report.errors.join("\n")).toContain("weekly cap");
  });

  it("sends one retention email a reader a run, the fast's first", async () => {
    NOW = new Date("2026-11-16T11:05:00Z");
    on("first_week", "readers");
    on("fasting_companion", "readers");
    const { client } = watched({
      email_sends: [],
      email_preferences: [pref("a", { first_week: true, fasting_companion: true })],
      profiles: [{ id: "a", joined_at: ago(1.5), calendar_reckoning: "new" }],
      prayer_completions: [],
      bookmarks: [],
      annotations: [],
    });
    const { d, sent } = deps();
    const { report } = await runRetention(client, NOW, { bulkLeft: 100, ...d });
    expect(sent.map((m) => m.dedupeKey)).toEqual(["fasting_companion:nativity-2026:open:a"]);
    expect(report.byKind.first_week.deferred).toBe(1);
  });

  it("spends only what the day's budget leaves, and leaves the rest for the next run", async () => {
    on("first_week", "readers");
    const readers = ["a", "b", "c"];
    const { client } = watched({
      email_sends: [],
      email_preferences: readers.map((id) => pref(id, { first_week: true })),
      profiles: readers.map((id) => ({ id, joined_at: ago(1.5) })),
      prayer_completions: [],
      bookmarks: [],
      annotations: [],
    });
    const { d, sent } = deps();
    const { report, spent } = await runRetention(client, NOW, { bulkLeft: 2, ...d });
    expect(sent).toHaveLength(2);
    expect(spent).toBe(2);
    expect(report.byKind.first_week.deferred).toBe(1);
  });

  it("writes where you left off from the reader's own place, and nothing for a reader with no line", async () => {
    on("pick_up", "readers");
    const places = { bible: { book: "romans", bookName: "Romans", chapter: 8, verse: 1, totalVerses: 39, ts: Date.parse(ago(15)) }, works: {}, cleared: {} };
    const { client } = watched({
      email_sends: [],
      email_preferences: [pref("kept", { pick_up: true }), pref("none", { pick_up: true }), pref("active", { pick_up: true })],
      profiles: [
        { id: "kept", joined_at: ago(200) },
        { id: "none", joined_at: ago(200) },
        { id: "active", joined_at: ago(200) },
      ],
      prayer_completions: [
        { user_id: "none", rule_id: "morning", prayed_on: "2026-11-05", completed_at: ago(15) },
        { user_id: "active", rule_id: "morning", prayed_on: "2026-11-19", completed_at: ago(1) },
      ],
      bookmarks: [],
      annotations: [],
      user_kept: [
        { user_id: "kept", slice: "places", value: places, updated_at: ago(15) },
        { user_id: "active", slice: "places", value: places, updated_at: ago(15) },
      ],
    });
    const { d, sent } = deps();
    await runRetention(client, NOW, { bulkLeft: 100, ...d });
    expect(sent.map((m) => [m.userId, m.subject])).toEqual([["kept", "Romans 8, where you were reading"]]);
    expect(sent[0].text).toContain("You were reading Romans 8.");
  });

  it("has nobody on a list whose column is not there yet, and does not call that an error", async () => {
    on("first_week", "readers");
    const { client } = watched({
      email_sends: [],
      email_preferences: { error: { code: "42703", message: "column email_preferences.first_week does not exist" } },
    });
    const { d, sent } = deps();
    const { report } = await runRetention(client, NOW, { bulkLeft: 100, ...d });
    expect(report.absent).toEqual(["first_week"]);
    expect(report.errors).toEqual([]);
    expect(sent).toEqual([]);
  });

  it("reads only the tables an account already keeps, never the visit data", async () => {
    NOW = new Date("2026-11-16T11:05:00Z");
    on("first_week", "readers");
    on("pick_up", "readers");
    on("fasting_companion", "readers");
    const { client, asked } = watched({
      email_sends: [],
      email_preferences: [pref("a", { first_week: true, pick_up: true, fasting_companion: true })],
      profiles: [{ id: "a", joined_at: ago(1.5) }],
      prayer_completions: [],
      bookmarks: [],
      annotations: [],
      user_kept: [],
    });
    const { d } = deps();
    await runRetention(client, NOW, { bulkLeft: 100, ...d });
    const allowed = new Set<string>([...READS, "email_preferences"]);
    expect([...new Set(asked)].filter((t) => !allowed.has(t))).toEqual([]);
    expect(asked.some((t) => t.startsWith("analytics"))).toBe(false);
  });
});

describe("in the daily job", () => {
  it("runs after the other optional emails, so their sends count in each reader's week, and draws only approved looks", () => {
    const lifecycle = fs.readFileSync(path.join(ROOT, "lib/email/lifecycle.ts"), "utf8");
    const digest = lifecycle.indexOf("await runCommunityDigest(");
    const names = lifecycle.indexOf("await runNameDays(");
    const retention = lifecycle.indexOf("await runRetention(");
    expect(digest).toBeGreaterThan(0);
    expect(retention).toBeGreaterThan(digest);
    expect(retention).toBeGreaterThan(names);
    for (const file of ["run.ts", "signals.ts", "plan.ts", "cap.ts", "preferences.ts", "effect.ts"]) {
      expect(fs.readFileSync(path.join(ROOT, "lib/email/retention", file), "utf8"), file).not.toContain("standInEmail");
    }
  });
});
