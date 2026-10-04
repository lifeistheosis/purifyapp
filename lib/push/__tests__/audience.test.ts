import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAudience } from "@/lib/push/audience";

/**
 * The regression these cover: a missing table (the push migrations were
 * never applied to prod) used to surface as an empty `data` and therefore
 * as "0 recipients", which the broadcast log then recorded as a healthy
 * `enqueued`. The admin saw a successful-looking send that never left the
 * building. resolveAudience must now report the failure.
 */

type Row = Record<string, unknown>;

/** Minimal Supabase stub: per-table rows, or an error to simulate a
 *  missing relation (PostgREST 42P01). Like the API, it hands back at most
 *  1,000 rows a request, whatever was asked for. */
function stubClient(
  tables: Record<string, { data?: Row[]; error?: { message: string } }>,
) {
  return {
    from(table: string) {
      const result = tables[table] ?? {
        error: { message: `relation "public.${table}" does not exist` },
      };
      let window: [number, number] = [0, 999];
      const thenable = {
        select: () => thenable,
        gt: () => thenable,
        order: () => thenable,
        range: (from: number, to: number) => ((window = [from, Math.min(to, from + 999)]), thenable),
        then: (resolve: (v: unknown) => unknown) =>
          resolve({
            data: result.data ? result.data.slice(window[0], window[1] + 1) : null,
            error: result.error ?? null,
          }),
      };
      return thenable;
    },
  } as unknown as SupabaseClient;
}

describe("resolveAudience", () => {
  it("reports an error instead of silently returning zero recipients", async () => {
    // Neither push table exists: exactly production's state today.
    const supa = stubClient({});
    const r = await resolveAudience(supa, "all");

    expect(r.total).toBe(0);
    expect(r.errors.length).toBe(2);
    expect(r.errors.join(" ")).toContain("push_subscriptions");
    expect(r.errors.join(" ")).toContain("device_push_tokens");
  });

  it("stays quiet when the tables exist and are simply empty", async () => {
    const supa = stubClient({
      push_subscriptions: { data: [] },
      device_push_tokens: { data: [] },
    });
    const r = await resolveAudience(supa, "all");

    expect(r.total).toBe(0);
    expect(r.errors).toEqual([]);
  });

  it("resolves real destinations across both transports", async () => {
    const supa = stubClient({
      push_subscriptions: {
        data: [{ endpoint: "https://x/1", p256dh: "k", auth: "a", user_id: "u1" }],
      },
      device_push_tokens: {
        data: [{ token: "t1", platform: "android", user_id: "u1" }],
      },
    });
    const r = await resolveAudience(supa, "all");

    expect(r.webCount).toBe(1);
    expect(r.nativeCount).toBe(1);
    expect(r.total).toBe(2);
    expect(r.errors).toEqual([]);
  });

  it("surfaces an entitlements failure when targeting a paid tier", async () => {
    const supa = stubClient({
      push_subscriptions: { data: [] },
      device_push_tokens: { data: [] },
      // entitlements omitted -> errors
    });
    const r = await resolveAudience(supa, "plus");

    expect(r.errors.join(" ")).toContain("entitlements.plus_until");
  });

  it("filters a paid-tier audience to entitled users only", async () => {
    const supa = stubClient({
      entitlements: { data: [{ user_id: "u1" }] },
      push_subscriptions: {
        data: [
          { endpoint: "https://x/1", p256dh: "k", auth: "a", user_id: "u1" },
          { endpoint: "https://x/2", p256dh: "k", auth: "a", user_id: "u2" },
        ],
      },
      device_push_tokens: {
        data: [{ token: "t2", platform: "ios", user_id: "u2" }],
      },
    });
    const r = await resolveAudience(supa, "plus");

    expect(r.webCount).toBe(1);
    expect(r.nativeCount).toBe(0);
    expect(r.errors).toEqual([]);
  });

  // The API returns at most 1,000 rows a request and says nothing when it
  // stops. These three reads were one request each, so a broadcast reached
  // the first thousand of each kind and reported that as everyone.
  it("reaches every destination past the first thousand", async () => {
    const supa = stubClient({
      push_subscriptions: {
        data: Array.from({ length: 2300 }, (_, i) => ({ endpoint: `https://x/${i}`, p256dh: "k", auth: "a", user_id: `u${i}` })),
      },
      device_push_tokens: {
        data: Array.from({ length: 1001 }, (_, i) => ({ token: `t${i}`, platform: "android", user_id: `u${i}` })),
      },
    });
    const r = await resolveAudience(supa, "all");

    expect(r.webCount).toBe(2300);
    expect(r.nativeCount).toBe(1001);
    expect(new Set(r.webSubs.map((s) => s.endpoint)).size).toBe(2300);
    expect(r.errors).toEqual([]);
  });

  it("keeps a paid-tier member who is past the thousandth entitlement", async () => {
    const supa = stubClient({
      entitlements: { data: Array.from({ length: 1500 }, (_, i) => ({ user_id: `u${i}` })) },
      push_subscriptions: { data: [{ endpoint: "https://x/late", p256dh: "k", auth: "a", user_id: "u1499" }] },
      device_push_tokens: { data: [{ token: "late", platform: "ios", user_id: "u1499" }] },
    });
    const r = await resolveAudience(supa, "pro");

    expect(r.webCount).toBe(1);
    expect(r.nativeCount).toBe(1);
    expect(r.errors).toEqual([]);
  });
});
