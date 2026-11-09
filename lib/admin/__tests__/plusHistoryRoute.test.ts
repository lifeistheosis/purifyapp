// Money > Subscriptions > Over time (admin item A2): the route. Absent until
// its table exists, never empty weeks; only the weeks and days the kept
// events cover; and admin only.

import { beforeEach, describe, expect, it, vi } from "vitest";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

const state = vi.hoisted(() => ({
  admin: { email: "owner@example.com" } as { email: string } | null,
  tables: {} as Record<string, unknown>,
}));

vi.mock("@/lib/admin/access", () => ({ getAdminUser: async () => state.admin }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => cappedApi(state.tables as never).client,
}));

import { GET } from "@/app/api/admin/plus-history/route";

const NOW = new Date("2026-11-11T15:00:00Z");
const event = (over: Record<string, unknown>) => ({
  id: `e-${Math.random()}`,
  type: "INITIAL_PURCHASE",
  user_id: "u1",
  store: "PLAY_STORE",
  environment: "PRODUCTION",
  period_type: "NORMAL",
  price_usd: 4.99,
  takehome: 0.7,
  trial_conversion: null,
  reason: null,
  event_at: "2026-11-10T10:00:00.000Z",
  expires_at: "2026-12-10T10:00:00.000Z",
  ...over,
});

beforeEach(() => {
  state.admin = { email: "owner@example.com" };
  state.tables = {};
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

describe("/api/admin/plus-history", () => {
  it("answers 403 to anyone who is not an admin", async () => {
    state.admin = null;
    expect((await GET()).status).toBe(403);
  });

  it("says the table is not there yet, rather than drawing empty weeks", async () => {
    expect(await (await GET()).json()).toEqual({ state: "absent" });
  });

  it("says when nothing has been kept yet", async () => {
    state.tables = { plus_events: [] };
    expect(await (await GET()).json()).toMatchObject({ state: "ok", since: null, weeks: [], days: [] });
  });

  it("shows only the weeks and days from the first kept event on, with who is in a trial and what was set aside", async () => {
    state.tables = {
      plus_events: [
        event({ event_at: "2026-11-03T09:00:00.000Z" }),
        event({ user_id: "u2", period_type: "TRIAL", price_usd: 0, event_at: "2026-11-10T11:00:00.000Z", expires_at: "2026-11-17T11:00:00.000Z" }),
        event({ user_id: "u3", environment: "SANDBOX", event_at: "2026-11-11T08:00:00.000Z" }),
      ],
    };
    const body = await (await GET()).json();
    expect(body.state).toBe("ok");
    expect(body.since).toBe("2026-11-03T09:00:00.000Z");
    expect(body.weeks.map((w: { week: string }) => w.week)).toEqual(["2026-11-02", "2026-11-09"]);
    expect(body.weeks[0]).toMatchObject({ joined: 1, afterStoreCents: 349 });
    expect(body.weeks[1]).toMatchObject({ joined: 0, trials: 1 });
    expect(body.days[0].day).toBe("2026-11-03");
    expect(body.days.at(-1).day).toBe("2026-11-11");
    expect(body.last30).toMatchObject({ joined: 1, trials: 1, grossCents: 499 });
    expect(body.inTrial).toBe(1);
    expect(body.setAside).toEqual({ test: 1, grants: 0 });
  });
});
