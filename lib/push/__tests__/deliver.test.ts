import { beforeEach, describe, expect, it, vi } from "vitest";

// The reminder run, every ten minutes: who is due, and the claim that keeps
// two callers in one ten-minute step from sending twice. Every transport and
// the database are stood in for, so nothing here reaches a push service.

const state = vi.hoisted(() => ({
  claims: new Map<string, number>(),
  /** Claims the hourly rule this replaced left in rate_limits. */
  oldClaims: [] as string[],
  /** What the limiter does: count, answer with an error, or throw. */
  limiter: "up" as "up" | "error" | "throws",
  tables: {} as Record<string, Record<string, unknown>[]>,
  webSent: [] as { endpoint: string; kind?: string }[],
  nativeSent: [] as { token: string; platform: string }[],
  nativeKinds: [] as (string | undefined)[],
  /** What each push said, by transport, in the order sent. */
  webWords: [] as string[],
  nativeWords: [] as string[],
  /** The readers' languages, or a read that fails (the column not applied). */
  languagesFail: false,
}));

vi.mock("@/lib/supabase/pageAll", () => ({
  pageAllSettled: vi.fn(async (page: (from: number, to: number) => { table?: string }) => {
    const table = (page(0, 999) as unknown as { table: string }).table;
    return { data: state.tables[table] ?? [], error: null };
  }),
  pageAllIn: vi.fn(async (ids: string[], page: (some: string[], from: number, to: number) => unknown) => {
    const table = (page(ids, 0, 999) as { table: string }).table;
    if (table !== "profiles") return [];
    if (state.languagesFail) throw new Error("column profiles.preferred_language does not exist");
    return (state.tables.profiles ?? []).filter((p) => ids.includes(p.id as string));
  }),
}));

vi.mock("../send", () => ({
  webPushConfigured: () => true,
  apnsConfigured: () => true,
  fcmConfigured: () => true,
  sendWebPushOne: vi.fn(async (_supa: unknown, sub: { endpoint: string }, payload: { kind?: string; title: string; body: string }) => {
    state.webSent.push({ endpoint: sub.endpoint, kind: payload.kind });
    state.webWords.push(`${payload.title} / ${payload.body}`);
    return { ok: true, gone: false };
  }),
  sendNativeOne: vi.fn(async (_supa: unknown, t: { token: string; platform: string }, payload: { kind?: string; title: string; body: string }) => {
    state.nativeSent.push(t);
    state.nativeKinds.push(payload.kind);
    state.nativeWords.push(`${payload.title} / ${payload.body}`);
    return { ok: true, gone: false, skipped: false };
  }),
}));

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { deliverRemindersOnce, reminderHourKey, reminderStepKey } from "../deliver";

const REPO = join(__dirname, "..", "..", "..");

/**
 * A stand-in client. Each query remembers its table, which is all pageAll's
 * stand-in reads, and rate_limit_hit counts the way the real function does:
 * true once the key has been hit more than `p_max` times.
 */
const supa = {
  from(table: string) {
    const q: Record<string, unknown> = { table };
    let key: unknown = null;
    for (const m of ["select", "order", "range", "in"]) q[m] = () => q;
    q.eq = (_column: string, value: unknown) => {
      key = value;
      return q;
    };
    // The one direct read of rate_limits: whether the hourly rule claimed this hour.
    q.limit = async () => ({ data: state.oldClaims.filter((k) => k === key).map((k) => ({ key: k })), error: null });
    return q;
  },
  async rpc(fn: string, args: { p_key: string; p_window_seconds: number; p_max: number }) {
    if (fn !== "rate_limit_hit") throw new Error(`unexpected rpc ${fn}`);
    if (state.limiter === "throws") throw new Error("fetch failed");
    if (state.limiter === "error") return { data: null, error: { message: "permission denied for function rate_limit_hit" } };
    const n = (state.claims.get(args.p_key) ?? 0) + 1;
    state.claims.set(args.p_key, n);
    return { data: n > args.p_max, error: null };
  },
} as never;

beforeEach(() => {
  state.claims.clear();
  state.oldClaims = [];
  state.limiter = "up";
  state.tables = {};
  state.webSent = [];
  state.nativeSent = [];
  state.nativeKinds = [];
  state.webWords = [];
  state.nativeWords = [];
  state.languagesFail = false;
});

describe("the claims' names", () => {
  it("names the ten-minute step, and the hour the old rule claimed", () => {
    expect(reminderStepKey(new Date("2026-10-04T15:07:31Z"))).toBe("2026-10-04T15:00");
    expect(reminderStepKey(new Date("2026-10-04T15:59:59Z"))).toBe("2026-10-04T15:50");
    expect(reminderHourKey(new Date("2026-10-04T15:07:31Z"))).toBe("2026-10-04T15");
  });
});

describe("deliverRemindersOnce", () => {
  const sevenUtc = new Date("2026-10-04T07:00:20Z");

  it("sends to readers whose own hour it is, and to nobody else", async () => {
    state.tables.push_subscriptions = [
      { endpoint: "https://push.example/a", p256dh: "p", auth: "a", morning_time: "07:00", evening_time: "21:00", timezone: "UTC" },
      // 07:00 UTC is 03:00 in New York: not this reader's hour.
      { endpoint: "https://push.example/b", p256dh: "p", auth: "a", morning_time: "07:00", evening_time: "21:00", timezone: "America/New_York" },
    ];
    state.tables.device_push_tokens = [
      // 07:00 UTC is 21:00 the evening before in Honolulu.
      { token: "t-android", platform: "android", morning_time: "07:00", evening_time: "21:00", timezone: "Pacific/Honolulu" },
      { token: "t-ios", platform: "ios", morning_time: "06:00", evening_time: "22:00", timezone: "UTC" },
    ];
    const run = await deliverRemindersOnce(supa, sevenUtc);
    expect(run.claimed).toBe(true);
    expect(state.webSent).toEqual([{ endpoint: "https://push.example/a", kind: "morning" }]);
    expect(state.nativeSent).toEqual([{ token: "t-android", platform: "android" }]);
  });

  it("tells a phone's push service which reminder it is, as it tells a browser's", async () => {
    // The kind is what gives a reminder its lifetime and its tag on a phone
    // (lib/push/lifetime.ts). It was sent to browsers only, so a phone out of
    // signal for days was handed every reminder it had missed at once.
    state.tables.device_push_tokens = [
      { token: "t-ios", platform: "ios", morning_time: "07:00", evening_time: "21:00", timezone: "UTC" },
      { token: "t-android", platform: "android", morning_time: "06:00", evening_time: "07:00", timezone: "UTC" },
    ];
    await deliverRemindersOnce(supa, sevenUtc);
    expect(state.nativeKinds).toEqual(["morning", "evening"]);
  });

  it("speaks each reader's own language on the lock screen, and English where it is not known", async () => {
    state.tables.profiles = [
      { id: "greek", preferred_language: "el" },
      { id: "romanian", preferred_language: "ro" },
      { id: "unset", preferred_language: null },
    ];
    state.tables.device_push_tokens = [
      { token: "t-el", user_id: "greek", platform: "android", morning_time: "07:00", evening_time: null, timezone: "UTC" },
      { token: "t-none", user_id: "unset", platform: "ios", morning_time: "07:00", evening_time: null, timezone: "UTC" },
    ];
    state.tables.push_subscriptions = [
      { endpoint: "https://push.example/ro", user_id: "romanian", p256dh: "p", auth: "a", morning_time: "07:00", evening_time: null, timezone: "UTC" },
    ];
    await deliverRemindersOnce(supa, sevenUtc);
    const el = JSON.parse(readFileSync(join(REPO, "lib", "i18n", "messages", "el.json"), "utf8")) as Record<string, string>;
    const ro = JSON.parse(readFileSync(join(REPO, "lib", "i18n", "messages", "ro.json"), "utf8")) as Record<string, string>;
    expect(state.nativeWords).toEqual([
      `${el["onboard.reminders.morningTitle"]} / ${el["onboard.reminders.morningBody"]}`,
      "Morning prayer / Open the morning rule when you rise.",
    ]);
    expect(state.webWords).toEqual([`${ro["onboard.reminders.morningTitle"]} / ${ro["onboard.reminders.morningBody"]}`]);
  });

  it("sends every reminder in English, and none fewer, where languages cannot be read", async () => {
    state.languagesFail = true;
    state.tables.device_push_tokens = [
      { token: "t-el", user_id: "greek", platform: "android", morning_time: "07:00", evening_time: null, timezone: "UTC" },
    ];
    await deliverRemindersOnce(supa, sevenUtc);
    expect(state.nativeWords).toEqual(["Morning prayer / Open the morning rule when you rise."]);
  });

  it("lets only the first run of a step send", async () => {
    state.tables.push_subscriptions = [
      { endpoint: "https://push.example/a", p256dh: "p", auth: "a", morning_time: "07:00", evening_time: null, timezone: "UTC" },
    ];
    const first = await deliverRemindersOnce(supa, sevenUtc);
    const second = await deliverRemindersOnce(supa, new Date("2026-10-04T07:09:59Z"));
    const next = await deliverRemindersOnce(supa, new Date("2026-10-04T07:10:05Z"));
    expect(first.claimed).toBe(true);
    expect(second).toEqual({ claimed: false });
    // The next step is the next run's, and 07:00 is not in it.
    expect(next.claimed).toBe(true);
    expect(state.webSent).toHaveLength(1);
  });

  it("claims under the step's own name, for an hour", async () => {
    await deliverRemindersOnce(supa, sevenUtc);
    expect([...state.claims.keys()]).toEqual(["push-deliver:2026-10-04T07:00"]);
  });

  it("sends a reader's time in its own step, not at the top of the hour", async () => {
    // Until 2026-10-31 the run kept to the hour: 07:45 came at about 07:05.
    state.tables.push_subscriptions = [
      { endpoint: "https://push.example/a", p256dh: "p", auth: "a", morning_time: "07:45", evening_time: null, timezone: "UTC" },
    ];
    await deliverRemindersOnce(supa, sevenUtc);
    expect(state.webSent).toEqual([]);
    await deliverRemindersOnce(supa, new Date("2026-10-04T07:40:12Z"));
    expect(state.webSent.map((s) => s.kind)).toEqual(["morning"]);
  });

  it("opens again with the next step", async () => {
    state.tables.push_subscriptions = [
      { endpoint: "https://push.example/a", p256dh: "p", auth: "a", morning_time: "07:00", evening_time: "07:10", timezone: "UTC" },
    ];
    await deliverRemindersOnce(supa, sevenUtc);
    const next = await deliverRemindersOnce(supa, new Date("2026-10-04T07:10:10Z"));
    expect(next.claimed).toBe(true);
    expect(state.webSent.map((s) => s.kind)).toEqual(["morning", "evening"]);
  });

  it("sends a step a lost run left behind, within the same hour", async () => {
    state.tables.push_subscriptions = [
      { endpoint: "https://push.example/a", p256dh: "p", auth: "a", morning_time: "07:10", evening_time: "07:20", timezone: "UTC" },
    ];
    await deliverRemindersOnce(supa, sevenUtc);
    // No run in the 07:10 step: the 07:20 run sends it, then its own.
    const late = await deliverRemindersOnce(supa, new Date("2026-10-04T07:20:30Z"));
    expect(late.claimed && late.steps).toEqual(["2026-10-04T07:10", "2026-10-04T07:20"]);
    expect(state.webSent.map((s) => s.kind)).toEqual(["morning", "evening"]);
  });

  it("never reaches back into the hour before, where its claims are gone", async () => {
    // rate_limit_hit files a claim under the hour it is made in and tidies
    // the rows of an hour that is over: a step of the last hour asked again
    // would be taken twice.
    await deliverRemindersOnce(supa, new Date("2026-10-04T08:05:00Z"));
    expect([...state.claims.keys()]).toEqual(["push-deliver:2026-10-04T08:00"]);
  });

  it("sends nothing in the hour the old hourly rule already sent", async () => {
    // The hour this code first runs in: the rule it replaced sent every
    // reminder of the hour at its start, and sending its steps again would
    // remind every reader twice.
    state.oldClaims = ["push-deliver:2026-10-04T07"];
    state.tables.push_subscriptions = [
      { endpoint: "https://push.example/a", p256dh: "p", auth: "a", morning_time: "07:30", evening_time: null, timezone: "UTC" },
    ];
    expect(await deliverRemindersOnce(supa, new Date("2026-10-04T07:30:05Z"))).toEqual({ claimed: false });
    expect(state.claims.size).toBe(0);
    // The next hour is this rule's.
    state.tables.push_subscriptions[0].morning_time = "08:00";
    expect((await deliverRemindersOnce(supa, new Date("2026-10-04T08:00:05Z"))).claimed).toBe(true);
    expect(state.webSent).toHaveLength(1);
  });

  // A limiter that cannot be asked must not read as "nobody has claimed it"
  // for every step at once, nor as "never send".
  for (const broken of ["error", "throws"] as const) {
    it(`sends each run's own step, and no other, when the limiter ${broken === "error" ? "answers with an error" : "throws"}`, async () => {
      state.limiter = broken;
      state.tables.push_subscriptions = [
        { endpoint: "https://push.example/a", p256dh: "p", auth: "a", morning_time: "07:00", evening_time: "07:20", timezone: "UTC" },
      ];
      const runs = [];
      for (const at of ["07:00:20", "07:10:00", "07:20:04", "07:30:01"]) {
        const run = await deliverRemindersOnce(supa, new Date(`2026-10-04T${at}Z`));
        runs.push(run.claimed && run.steps);
      }
      // Each run is in a step of its own, so that is still once a step; the
      // steps before it are never guessed at.
      expect(runs).toEqual([["2026-10-04T07:00"], ["2026-10-04T07:10"], ["2026-10-04T07:20"], ["2026-10-04T07:30"]]);
      expect(state.webSent.map((s) => s.kind)).toEqual(["morning", "evening"]);
    });
  }
});
