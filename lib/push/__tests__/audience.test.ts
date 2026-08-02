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
 *  missing relation (PostgREST 42P01). */
function stubClient(
  tables: Record<string, { data?: Row[]; error?: { message: string } }>,
) {
  return {
    from(table: string) {
      const result = tables[table] ?? {
        error: { message: `relation "public.${table}" does not exist` },
      };
      const thenable = {
        select: () => thenable,
        gt: () => thenable,
        then: (resolve: (v: unknown) => unknown) =>
          resolve({ data: result.data ?? null, error: result.error ?? null }),
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
});
