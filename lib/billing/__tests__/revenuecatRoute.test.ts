// The RevenueCat webhook route (audit F-09): the one door through which Plus
// is granted. It must refuse anything without the shared secret, write only
// for a real account, carry forward what an event does not speak for, and
// answer 500 on a failed write so RevenueCat sends it again.

import { beforeEach, describe, expect, it, vi } from "vitest";

const USER = "44444444-4444-4444-8444-444444444444";
const SECRET = "rc_secret_value";

const state = vi.hoisted(() => ({
  existing: null as null | { is_supporter?: boolean; pro_until?: string | null },
  rpcError: null as null | { message: string },
  rpc: [] as [string, Record<string, unknown>][],
  lifecycle: [] as unknown[],
  emails: [] as unknown[],
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.existing }) }) }) }),
    rpc: async (name: string, args: Record<string, unknown>) => {
      state.rpc.push([name, args]);
      return { error: state.rpcError };
    },
  }),
}));
vi.mock("@/lib/billing/applyLifecycle", () => ({
  writeLifecycleState: async (_db: unknown, user: unknown, effects: unknown) => void state.lifecycle.push([user, effects]),
  sendLifecycleEmail: async (...args: unknown[]) => void state.emails.push(args),
}));
vi.mock("next/server", async (importOriginal) => {
  const real = await importOriginal<typeof import("next/server")>();
  // Outside a request scope after() throws; the route then sends inline, which is what a test sees.
  return { ...real, after: () => { throw new Error("no request scope"); } };
});

const { POST } = await import("@/app/api/billing/revenuecat/route");

const EXPIRES = Date.UTC(2027, 0, 1);
function deliver(event: Record<string, unknown>, auth: string | null = SECRET) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (auth !== null) headers.authorization = auth;
  return POST(new Request("https://purifyapp.net/api/billing/revenuecat", { method: "POST", headers, body: JSON.stringify({ event }) }) as never);
}

beforeEach(() => {
  process.env.REVENUECAT_WEBHOOK_SECRET = SECRET;
  state.existing = null;
  state.rpcError = null;
  state.rpc.length = 0;
  state.lifecycle.length = 0;
  state.emails.length = 0;
});

describe("the RevenueCat webhook", () => {
  it("refuses every write without the shared secret, and fails closed while none is set", async () => {
    const purchase = { type: "INITIAL_PURCHASE", app_user_id: USER, store: "PLAY_STORE", expiration_at_ms: EXPIRES };
    expect((await deliver(purchase, null)).status).toBe(403);
    expect((await deliver(purchase, "Bearer something-else")).status).toBe(403);
    delete process.env.REVENUECAT_WEBHOOK_SECRET;
    expect((await deliver(purchase)).status).toBe(503);
    expect(state.rpc).toHaveLength(0);
  });

  it("forgives the whitespace a pasted secret carries", async () => {
    process.env.REVENUECAT_WEBHOOK_SECRET = `  ${SECRET}\n`;
    expect((await deliver({ type: "TEST" }, ` ${SECRET} `)).status).toBe(200);
  });

  it("grants Plus to the account until the period's end, by the store it was bought in", async () => {
    const res = await deliver({ type: "INITIAL_PURCHASE", app_user_id: USER, store: "PLAY_STORE", expiration_at_ms: EXPIRES });
    expect(res.status).toBe(200);
    expect(state.rpc).toEqual([
      [
        "upsert_entitlement",
        { p_user_id: USER, p_is_supporter: false, p_plus_until: new Date(EXPIRES).toISOString(), p_plus_source: "google", p_pro_until: null },
      ],
    ]);
    await deliver({ type: "RENEWAL", app_user_id: USER, store: "APP_STORE", expiration_at_ms: EXPIRES });
    expect(state.rpc[1][1].p_plus_source).toBe("apple");
    await deliver({ type: "RENEWAL", app_user_id: USER, store: "STRIPE", expiration_at_ms: EXPIRES });
    expect(state.rpc[2][1].p_plus_source).toBe("stripe");
  });

  it("keeps what an event does not speak for: a supporter stays one, and Pro ends only on Pro's own event", async () => {
    state.existing = { is_supporter: true, pro_until: "2027-06-01T00:00:00.000Z" };
    await deliver({ type: "RENEWAL", app_user_id: USER, store: "PLAY_STORE", expiration_at_ms: EXPIRES });
    expect(state.rpc[0][1]).toMatchObject({ p_is_supporter: true, p_pro_until: "2027-06-01T00:00:00.000Z" });
    await deliver({ type: "RENEWAL", app_user_id: USER, store: "PLAY_STORE", expiration_at_ms: EXPIRES, entitlement_ids: ["pro"] });
    expect(state.rpc[1][1]).toMatchObject({ p_pro_until: new Date(EXPIRES).toISOString() });
  });

  it("writes nothing for a test, a pre-login id, or an event with no period, and says why", async () => {
    expect(await (await deliver({ type: "TEST" })).json()).toEqual({ ok: true, test: true });
    expect(await (await deliver({ type: "INITIAL_PURCHASE", app_user_id: "$RCAnonymousID:abc", expiration_at_ms: EXPIRES })).json()).toEqual({
      ok: true,
      skipped: "non-account user",
    });
    expect((await (await deliver({ type: "TRANSFER", app_user_id: USER })).json()).skipped).toMatch(/no expiry/);
    expect(state.rpc).toHaveLength(0);
  });

  it("answers 500 when the grant could not be written, so RevenueCat sends it again, and records nothing after it", async () => {
    state.rpcError = { message: "db down" };
    expect((await deliver({ type: "RENEWAL", app_user_id: USER, store: "PLAY_STORE", expiration_at_ms: EXPIRES })).status).toBe(500);
    expect(state.lifecycle).toHaveLength(0);
  });

  it("records a failed renewal charge once the grant is written, and sends its email", async () => {
    await deliver({ type: "BILLING_ISSUE", app_user_id: USER, store: "PLAY_STORE", expiration_at_ms: EXPIRES, event_timestamp_ms: EXPIRES - 86_400_000 });
    expect(state.rpc).toHaveLength(1);
    expect(state.lifecycle).toHaveLength(1);
    expect(state.emails).toHaveLength(1);
  });

  it("answers 400 to a body that is not JSON", async () => {
    const res = await POST(new Request("https://purifyapp.net/api/billing/revenuecat", { method: "POST", headers: { authorization: SECRET }, body: "{nope" }) as never);
    expect(res.status).toBe(400);
  });
});
