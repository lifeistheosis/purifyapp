import { beforeEach, describe, expect, it, vi } from "vitest";

// The hourly reminder run: who is due, and the claim that keeps two callers
// in one hour from sending twice. Every transport and the database are stood
// in for, so nothing here reaches a push service.

const state = vi.hoisted(() => ({
  claims: new Map<string, number>(),
  /** What the limiter does: count, answer with an error, or throw. */
  limiter: "up" as "up" | "error" | "throws",
  tables: {} as Record<string, Record<string, unknown>[]>,
  webSent: [] as { endpoint: string; kind?: string }[],
  nativeSent: [] as { token: string; platform: string }[],
}));

vi.mock("@/lib/supabase/pageAll", () => ({
  pageAllSettled: vi.fn(async (page: (from: number, to: number) => { table?: string }) => {
    const table = (page(0, 999) as unknown as { table: string }).table;
    return { data: state.tables[table] ?? [], error: null };
  }),
  pageAllIn: vi.fn(async () => []),
}));

vi.mock("../send", () => ({
  webPushConfigured: () => true,
  apnsConfigured: () => true,
  fcmConfigured: () => true,
  sendWebPushOne: vi.fn(async (_supa: unknown, sub: { endpoint: string }, payload: { kind?: string }) => {
    state.webSent.push({ endpoint: sub.endpoint, kind: payload.kind });
    return { ok: true, gone: false };
  }),
  sendNativeOne: vi.fn(async (_supa: unknown, t: { token: string; platform: string }) => {
    state.nativeSent.push(t);
    return { ok: true, gone: false, skipped: false };
  }),
}));

import { deliverRemindersOnce, reminderHourKey } from "../deliver";

/**
 * A stand-in client. Each query remembers its table, which is all pageAll's
 * stand-in reads, and rate_limit_hit counts the way the real function does:
 * true once the key has been hit more than `p_max` times.
 */
const supa = {
  from(table: string) {
    const q: Record<string, unknown> = { table };
    for (const m of ["select", "eq", "order", "range", "in"]) q[m] = () => q;
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
  state.limiter = "up";
  state.tables = {};
  state.webSent = [];
  state.nativeSent = [];
});

describe("reminderHourKey", () => {
  it("names the UTC hour", () => {
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

  it("lets only the first run of an hour send", async () => {
    state.tables.push_subscriptions = [
      { endpoint: "https://push.example/a", p256dh: "p", auth: "a", morning_time: "07:00", evening_time: null, timezone: "UTC" },
    ];
    const first = await deliverRemindersOnce(supa, sevenUtc);
    const second = await deliverRemindersOnce(supa, new Date("2026-10-04T07:10:05Z"));
    const third = await deliverRemindersOnce(supa, new Date("2026-10-04T07:50:00Z"));
    expect(first.claimed).toBe(true);
    expect(second).toEqual({ claimed: false });
    expect(third).toEqual({ claimed: false });
    expect(state.webSent).toHaveLength(1);
  });

  it("claims under the hour's own name, for an hour", async () => {
    await deliverRemindersOnce(supa, sevenUtc);
    expect([...state.claims.keys()]).toEqual(["push-deliver:2026-10-04T07"]);
  });

  it("opens again with the next hour", async () => {
    state.tables.push_subscriptions = [
      { endpoint: "https://push.example/a", p256dh: "p", auth: "a", morning_time: "07:00", evening_time: "08:00", timezone: "UTC" },
    ];
    await deliverRemindersOnce(supa, sevenUtc);
    const next = await deliverRemindersOnce(supa, new Date("2026-10-04T08:00:10Z"));
    expect(next.claimed).toBe(true);
    expect(state.webSent.map((s) => s.kind)).toEqual(["morning", "evening"]);
  });

  // A limiter that cannot be asked must not read as "nobody has claimed it"
  // on every one of six runs an hour, nor as "never send".
  for (const broken of ["error", "throws"] as const) {
    it(`sends once an hour by the clock when the limiter ${broken === "error" ? "answers with an error" : "throws"}`, async () => {
      state.limiter = broken;
      state.tables.push_subscriptions = [
        { endpoint: "https://push.example/a", p256dh: "p", auth: "a", morning_time: "07:00", evening_time: null, timezone: "UTC" },
      ];
      const runs = [];
      for (const at of ["07:00:20", "07:09:59", "07:10:00", "07:20:04", "07:30:01", "07:40:02", "07:50:03"]) {
        runs.push((await deliverRemindersOnce(supa, new Date(`2026-10-04T${at}Z`))).claimed);
      }
      // Only the runs inside the first ten minutes go ahead. The scheduler
      // lands one there an hour; the second here is the edge of the window.
      expect(runs).toEqual([true, true, false, false, false, false, false]);
      expect(state.webSent).toHaveLength(2);
    });
  }
});
