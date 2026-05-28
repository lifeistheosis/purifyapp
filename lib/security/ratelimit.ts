import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fixed-window rate limiter backed by the public.rate_limit_hit Postgres
 * function. One RPC call per check — atomic, survives restarts, shared
 * across Render instances.
 *
 * Returns true when the caller is OVER budget for the window.
 * Fail-open: any RPC error logs and returns false, so an outage in the
 * limiter never takes the site down.
 *
 * Use:
 *   if (await rateLimited(`track:${ip}`, 60, 120)) return new Response(null, { status: 429 });
 */
export async function rateLimited(
  key: string,
  windowSeconds: number,
  max: number,
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("rate_limit_hit", {
      p_key: key,
      p_window_seconds: windowSeconds,
      p_max: max,
    });
    if (error) {
      // Fail open — never let limiter problems break the route.
      console.warn("[ratelimit] rpc error", error.message);
      return false;
    }
    return Boolean(data);
  } catch (e) {
    console.warn("[ratelimit] throw", (e as Error).message);
    return false;
  }
}

/**
 * Extract a stable client IP for keying. Trusts the platform proxy's
 * X-Forwarded-For (Render and most managed hosts set this); falls back
 * to a constant so unknown clients all share one bucket (defensive).
 */
export function ipKey(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
