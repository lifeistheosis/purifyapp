import { beforeEach, describe, expect, it, vi } from "vitest";

// July's daily campaign reminder is retired with July's routes (2026-11-10;
// docs/audit/findings.yaml, F-50).
//
// Campaigns were withdrawn on 2026-08-26 and every screen of them went that
// day, the switch that turned this reminder off among them. Its sender was
// left running inside the reminder run: once a day it sent "Your prayer
// campaign" to every reader who had turned it on in July, for a campaign
// that had ended, to a page that is not found, with no way left to stop it.
//
// Held here: while July's routes are retired the run reads not one opt-in
// and sends nothing for campaigns, and a reader's own morning and evening
// reminders go on as before. The second case is the first one's proof: the
// same reader, the same hour, and July's routes back, and the reminder is
// sent, so the first case is not passing for want of anything to send.

const state = vi.hoisted(() => ({
  /** July's routes as a case needs them. Retired, as committed, unless a case says otherwise. */
  july: false,
  tables: {} as Record<string, Record<string, unknown>[]>,
  /** Every table the run read, in order. */
  read: [] as string[],
  /** Every push the run sent, by either transport, in order. */
  sent: [] as { to: string; kind?: string; words: string; url?: string }[],
}));

vi.mock("@/lib/campaigns/flags", async (original) => ({
  ...(await original<typeof import("@/lib/campaigns/flags")>()),
  julyCampaignRoutes: () => state.july,
}));

vi.mock("@/lib/supabase/pageAll", () => ({
  pageAllSettled: vi.fn(async (page: (from: number, to: number) => unknown) => {
    const table = (page(0, 999) as { table: string }).table;
    state.read.push(table);
    return { data: state.tables[table] ?? [], error: null };
  }),
  pageAllIn: vi.fn(async (ids: string[], page: (some: string[], from: number, to: number) => unknown) => {
    const table = (page(ids, 0, 999) as { table: string }).table;
    state.read.push(table);
    const key = table === "profiles" ? "id" : "user_id";
    return (state.tables[table] ?? []).filter((row) => ids.includes(row[key] as string));
  }),
}));

type Words = { kind?: string; title: string; body: string; url?: string };

vi.mock("../send", () => ({
  webPushConfigured: () => true,
  apnsConfigured: () => true,
  fcmConfigured: () => true,
  sendWebPushOne: vi.fn(async (_supa: unknown, sub: { endpoint: string }, payload: Words) => {
    state.sent.push({ to: sub.endpoint, kind: payload.kind, words: `${payload.title} / ${payload.body}`, url: payload.url });
    return { ok: true, gone: false };
  }),
  sendNativeOne: vi.fn(async (_supa: unknown, phone: { token: string }, payload: Words) => {
    state.sent.push({ to: phone.token, kind: payload.kind, words: `${payload.title} / ${payload.body}`, url: payload.url });
    return { ok: true, gone: false, skipped: false };
  }),
}));

import { deliverReminders } from "../deliver";

/** A stand-in client: each query remembers its table, which is all the stand-ins above read. */
const supa = {
  from(table: string) {
    const q: Record<string, unknown> = { table };
    for (const m of ["select", "order", "range", "in", "eq"]) q[m] = () => q;
    return q;
  },
} as never;

const JULY_READER = "22222222-2222-4222-8222-222222222222";
const OTHER_READER = "33333333-3333-4333-8333-333333333333";
const CAMPAIGN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
/** Seven in the morning, UTC: the hour the reader set for the campaign in July. */
const SEVEN = new Date("2026-11-10T07:00:20Z");

beforeEach(() => {
  state.july = false;
  state.read = [];
  state.sent = [];
  state.tables = {
    // The reader turned the campaign's reminder on in July, for seven in the morning.
    prayer_campaign_prayers: [{ user_id: JULY_READER, campaign_id: CAMPAIGN, remind_enabled: true, remind_time: "07:00" }],
    // Their phone and their browser, with no morning or evening reminder of
    // their own; and another reader's phone, whose morning reminder is due.
    device_push_tokens: [
      { token: "july-reader-phone", platform: "android", user_id: JULY_READER, morning_time: null, evening_time: null, timezone: "UTC" },
      { token: "other-reader-phone", platform: "ios", user_id: OTHER_READER, morning_time: "07:00", evening_time: null, timezone: "UTC" },
    ],
    push_subscriptions: [
      { endpoint: "https://push.example/july-reader", p256dh: "p", auth: "a", user_id: JULY_READER, morning_time: null, evening_time: null, timezone: "UTC" },
    ],
  };
});

describe("July's campaign reminder, retired", () => {
  it("is retired as committed: July's routes are off, and the sender follows them", async () => {
    const real = await vi.importActual<typeof import("@/lib/campaigns/flags")>("@/lib/campaigns/flags");
    expect(real.julyCampaignRoutes()).toBe(false);
  });

  it("sends a reader of July's nothing, and reads not one opt-in, while a morning reminder still goes out", async () => {
    const run = await deliverReminders(supa, SEVEN);

    expect(state.sent.filter((push) => push.kind === "campaign")).toEqual([]);
    expect(state.sent.map((push) => push.to)).toEqual(["other-reader-phone"]);
    expect(state.sent[0].kind).toBe("morning");
    expect(state.read).not.toContain("prayer_campaign_prayers");
    expect(run.campaigns).toEqual({ mode: "inactive", reason: "July's campaign reminders are retired", errors: [] });
    expect(run.errors).toEqual([]);
  });

  it("would have sent it: the same reader and hour, with July's routes back, get the reminder as they did", async () => {
    state.july = true;
    await deliverReminders(supa, SEVEN);

    const campaign = state.sent.filter((push) => push.kind === "campaign");
    expect(campaign.map((push) => push.to).sort()).toEqual(["https://push.example/july-reader", "july-reader-phone"]);
    for (const push of campaign) {
      expect(push.words).toBe("Your prayer campaign / Open it when you are ready.");
      expect(push.url).toBe(`/campaigns/detail?id=${CAMPAIGN}`);
    }
    expect(state.read).toContain("prayer_campaign_prayers");
  });

  it("the switch a reader would turn it off with is gone with the screens, which is why nothing may be sent", async () => {
    // app/api/campaigns/[id]/remind answers 404 while July's routes are
    // retired; lib/campaigns/__tests__/closed.test.ts holds the routes. Read
    // here so the two cannot part: the route and the sender ask the same switch.
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const repo = join(__dirname, "..", "..", "..");
    const route = readFileSync(join(repo, "app/api/campaigns/[id]/remind/route.ts"), "utf8");
    const sender = readFileSync(join(repo, "lib/push/deliver.ts"), "utf8");
    expect(route).toContain("if (!julyCampaignRoutes()) {");
    const pass = sender.slice(sender.indexOf("async function deliverCampaigns("));
    expect(pass.indexOf("if (!julyCampaignRoutes()) {")).toBeGreaterThan(-1);
    expect(pass.indexOf("if (!julyCampaignRoutes()) {")).toBeLessThan(pass.indexOf('.from("prayer_campaign_prayers")'));
  });
});
