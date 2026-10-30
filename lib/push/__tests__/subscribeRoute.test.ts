import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/push/subscribe, run for real against an in-memory push_subscriptions
 * that answers an upsert the way PostgREST does: a conflict updates only the
 * columns the request carried, and a new row takes null for one it did not.
 *
 * The route wrote `morningTime ?? null`: a time a request left out became no
 * reminder at that hour, so every save had to restate both times, and the
 * account screen restated the default it showed in place of the reader's
 * own. Now a time left out is not written, and a browser the table does not
 * have yet starts with the default for it.
 */

type Sub = {
  endpoint: string;
  user_id: string;
  p256dh: string;
  auth: string;
  morning_time: string | null;
  evening_time: string | null;
  timezone: string;
  created_at: string;
};

const state = vi.hoisted(() => ({
  rows: [] as Sub[],
  user: null as null | { id: string },
  fails: false,
}));

function admin() {
  return {
    from: (name: string) => {
      expect(name).toBe("push_subscriptions");
      return {
        upsert: async (values: Partial<Sub>, opts: { onConflict: string; ignoreDuplicates?: boolean }) => {
          expect(opts.onConflict).toBe("endpoint");
          if (state.fails) return { data: null, error: { message: "connection reset" } };
          const existing = state.rows.find((r) => r.endpoint === values.endpoint);
          if (existing) {
            // ON CONFLICT DO UPDATE SET each column sent, or DO NOTHING.
            if (!opts.ignoreDuplicates) Object.assign(existing, values);
          } else {
            state.rows.push({ morning_time: null, evening_time: null, created_at: "2026-10-30T00:00:00Z", ...values } as Sub);
          }
          return { data: null, error: null };
        },
        select: () => {
          const chain = {
            eq: () => chain,
            limit: async () => ({ data: state.rows.filter((r) => r.user_id === state.user?.id), error: null }),
          };
          return chain;
        },
        delete: () => ({ eq: () => ({ in: async () => ({ data: null, error: null }) }) }),
      };
    },
  };
}

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: admin }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }),
}));

import { POST } from "@/app/api/push/subscribe/route";

const ANNA = "11111111-1111-4111-8111-111111111111";
const BEN = "22222222-2222-4222-8222-222222222222";
const ENDPOINT = "https://push.example/annas-phone-browser";

const save = (times: Record<string, unknown>) =>
  POST(
    new NextRequest("https://purifyapp.net/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: ENDPOINT, keys: { p256dh: "p256dh-key", auth: "auth-key" }, timezone: "Europe/Athens", ...times }),
    }),
  );

const saved = (user: string, morning: string | null, evening: string | null): Sub => ({
  endpoint: ENDPOINT,
  user_id: user,
  p256dh: "p256dh-key",
  auth: "auth-key",
  morning_time: morning,
  evening_time: evening,
  timezone: "Europe/Athens",
  created_at: "2026-10-01T00:00:00Z",
});

beforeEach(() => {
  state.rows = [];
  state.user = { id: ANNA };
  state.fails = false;
});

describe("/api/push/subscribe, the times", () => {
  it("saves both times when both are sent, as it always has", async () => {
    expect((await save({ morningTime: "06:15", eveningTime: "22:30" })).status).toBe(200);
    expect(state.rows).toMatchObject([{ endpoint: ENDPOINT, user_id: ANNA, morning_time: "06:15", evening_time: "22:30" }]);
  });

  it("keeps the saved morning when only the evening is sent", async () => {
    state.rows = [saved(ANNA, "06:15", "22:30")];
    expect((await save({ eveningTime: "23:00" })).status).toBe(200);
    expect(state.rows).toHaveLength(1);
    expect(state.rows[0]).toMatchObject({ morning_time: "06:15", evening_time: "23:00" });
  });

  it("keeps the saved evening when only the morning is sent", async () => {
    state.rows = [saved(ANNA, "06:15", "22:30")];
    await save({ morningTime: "05:30" });
    expect(state.rows[0]).toMatchObject({ morning_time: "05:30", evening_time: "22:30" });
  });

  it("keeps both when none is sent, the visit that finishes a browser", async () => {
    state.rows = [saved(ANNA, "06:15", "22:30")];
    await save({});
    expect(state.rows[0]).toMatchObject({ morning_time: "06:15", evening_time: "22:30" });
  });

  it("gives a browser it does not have yet the default for a time left out", async () => {
    await save({ eveningTime: "23:00" });
    expect(state.rows).toMatchObject([{ user_id: ANNA, morning_time: "07:00", evening_time: "23:00" }]);
    state.rows = [];
    await save({});
    expect(state.rows).toMatchObject([{ morning_time: "07:00", evening_time: "21:00" }]);
  });

  it("still takes a time sent as null as no reminder at that hour", async () => {
    state.rows = [saved(ANNA, "06:15", "22:30")];
    await save({ morningTime: null });
    expect(state.rows[0]).toMatchObject({ morning_time: null, evening_time: "22:30" });
  });

  it("gives a browser to the account now signed in, with the time it changed and the browser's other one", async () => {
    state.rows = [saved(ANNA, "06:15", "22:30")];
    state.user = { id: BEN };
    await save({ eveningTime: "23:00" });
    expect(state.rows).toMatchObject([{ user_id: BEN, morning_time: "06:15", evening_time: "23:00" }]);
  });

  it("says so when the save fails, instead of ok", async () => {
    state.fails = true;
    for (const times of [{ eveningTime: "23:00" }, { morningTime: "06:15", eveningTime: "22:30" }]) {
      const res = await save(times);
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: "Could not save this browser." });
    }
    expect(state.rows).toEqual([]);
  });

  it("saves nothing for a reader who is not signed in", async () => {
    state.user = null;
    expect((await save({ eveningTime: "23:00" })).status).toBe(401);
    expect(state.rows).toEqual([]);
  });

  it("refuses a time that is not one", async () => {
    expect((await save({ eveningTime: "11pm" })).status).toBe(400);
    expect(state.rows).toEqual([]);
  });
});
