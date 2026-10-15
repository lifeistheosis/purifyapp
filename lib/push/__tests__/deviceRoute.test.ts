import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/push/device, run for real against an in-memory device_push_tokens
 * that keeps the table's one policy as Postgres keeps it.
 *
 * A phone has one token whoever is signed in to it. Before 2026-10-14 the
 * route saved it as the reader, under RLS, and never read the answer. So a
 * phone that had been signed in to another account kept that account's row:
 * the upsert met it, Postgres refused (an INSERT ... ON CONFLICT DO UPDATE
 * that meets a row the reader may not update is an error, not a skip), the
 * route said ok, the app said "on", and the phone went on showing the other
 * account's notifications and none of the new reader's. Each launch asked
 * again and was refused again. Browsers had the same hole and were mended on
 * 2026-10-04 (/api/push/subscribe); phones never were.
 *
 * It cannot be walked in a browser: it takes a phone, a token from Google or
 * Apple, and a write to the production project.
 */

type Token = {
  token: string;
  user_id: string;
  platform: string;
  morning_time: string | null;
  evening_time: string | null;
  timezone: string;
};
type Filter = [string, unknown];

const state = vi.hoisted(() => ({
  rows: [] as Token[],
  user: null as null | { id: string },
  adminFails: false,
}));

/** The table, as the service role sees it (RLS does not apply) or as the reader does. */
function table(as: "admin" | "reader") {
  return {
    upsert: async (values: Token, opts: { onConflict: string }) => {
      expect(opts.onConflict).toBe("token");
      if (as === "admin" && state.adminFails) return { data: null, error: { message: "connection reset" } };
      const existing = state.rows.find((r) => r.token === values.token);
      if (as === "reader") {
        // device_push_tokens_self_all: using (auth.uid() = user_id) with check (auth.uid() = user_id).
        const uid = state.user?.id;
        if (values.user_id !== uid || (existing && existing.user_id !== uid)) {
          return {
            data: null,
            error: { code: "42501", message: 'new row violates row-level security policy (USING expression) for table "device_push_tokens"' },
          };
        }
      }
      if (existing) Object.assign(existing, values);
      else state.rows.push({ ...values });
      return { data: null, error: null };
    },
    delete: () => {
      const filters: Filter[] = [];
      const run = () => {
        state.rows = state.rows.filter(
          (r) =>
            !(
              filters.every(([k, v]) => (r as Record<string, unknown>)[k] === v) &&
              (as === "admin" || r.user_id === state.user?.id)
            ),
        );
        return { data: null, error: null };
      };
      const chain = {
        eq(k: string, v: unknown) {
          filters.push([k, v]);
          return chain;
        },
        then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
          return Promise.resolve(run()).then(resolve, reject);
        },
      };
      return chain;
    },
  };
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: (name: string) => (expect(name).toBe("device_push_tokens"), table("admin")) }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClientFromRequest: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (name: string) => (expect(name).toBe("device_push_tokens"), table("reader")),
  }),
}));

import { DELETE, POST } from "@/app/api/push/device/route";

const ANNA = "11111111-1111-4111-8111-111111111111";
const BEN = "22222222-2222-4222-8222-222222222222";
const PHONE = "fcm-token-of-one-android-phone";

const register = (body: Record<string, unknown>) =>
  POST(
    new Request("https://purifyapp.net/api/push/device", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://localhost" },
      body: JSON.stringify(body),
    }),
  );
const unregister = (token: string) =>
  DELETE(new Request(`https://purifyapp.net/api/push/device?token=${encodeURIComponent(token)}`, { method: "DELETE" }));

const phone = { token: PHONE, platform: "android", morningTime: "07:00", eveningTime: "21:00", timezone: "America/New_York" };

beforeEach(() => {
  state.rows = [];
  state.user = null;
  state.adminFails = false;
});

describe("/api/push/device", () => {
  it("saves a phone for the reader signed in", async () => {
    state.user = { id: ANNA };
    const res = await register(phone);
    expect(res.status).toBe(200);
    expect(state.rows).toEqual([
      { token: PHONE, user_id: ANNA, platform: "android", morning_time: "07:00", evening_time: "21:00", timezone: "America/New_York" },
    ]);
  });

  it("gives a phone to the account now signed in, not the one before", async () => {
    // Anna used this phone first. Ben signs in on it and turns notifications on.
    state.rows = [{ token: PHONE, user_id: ANNA, platform: "android", morning_time: "06:30", evening_time: null, timezone: "UTC" }];
    state.user = { id: BEN };
    const res = await register(phone);
    expect(res.status).toBe(200);
    expect(state.rows).toHaveLength(1);
    expect(state.rows[0]).toMatchObject({ token: PHONE, user_id: BEN, morning_time: "07:00", evening_time: "21:00" });
  });

  it("is what the reader's own write could never do", async () => {
    // The fake keeps the policy: as the reader, Ben's save of Anna's row is
    // refused. The route above stopped making that write.
    state.rows = [{ token: PHONE, user_id: ANNA, platform: "android", morning_time: null, evening_time: null, timezone: "UTC" }];
    state.user = { id: BEN };
    const { error } = await table("reader").upsert(
      { token: PHONE, user_id: BEN, platform: "android", morning_time: null, evening_time: null, timezone: "UTC" },
      { onConflict: "token" },
    );
    expect(error?.message).toMatch(/row-level security/);
    expect(state.rows[0].user_id).toBe(ANNA);
  });

  it("says so when the save fails, instead of ok", async () => {
    state.user = { id: ANNA };
    state.adminFails = true;
    const res = await register(phone);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Could not save this phone." });
    expect(state.rows).toEqual([]);
  });

  it("answers the app with its CORS headers, failure included", async () => {
    state.user = { id: ANNA };
    state.adminFails = true;
    const res = await register(phone);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://localhost");
  });

  it("saves nothing for a reader who is not signed in", async () => {
    const res = await register(phone);
    expect(res.status).toBe(401);
    expect(state.rows).toEqual([]);
  });

  it("refuses what is not a phone's token", async () => {
    state.user = { id: ANNA };
    expect((await register({ ...phone, platform: "web" })).status).toBe(400);
    expect((await register({ ...phone, token: "" })).status).toBe(400);
    expect((await register({ ...phone, morningTime: "7am" })).status).toBe(400);
    expect(state.rows).toEqual([]);
  });

  it("lets a reader take only their own phone off", async () => {
    state.rows = [
      { token: PHONE, user_id: ANNA, platform: "android", morning_time: null, evening_time: null, timezone: "UTC" },
      { token: "bens-phone", user_id: BEN, platform: "ios", morning_time: null, evening_time: null, timezone: "UTC" },
    ];
    state.user = { id: BEN };
    expect((await unregister(PHONE)).status).toBe(200);
    expect(state.rows.map((r) => r.token)).toEqual([PHONE, "bens-phone"]);
    expect((await unregister("bens-phone")).status).toBe(200);
    expect(state.rows.map((r) => r.token)).toEqual([PHONE]);
  });
});
