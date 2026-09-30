/**
 * Count one visit to an ambassador's link: today's number goes up by one.
 *
 * Called from proxy.ts through `event.waitUntil`, after the redirect has
 * already been answered, so the reader never waits on it. It speaks to the
 * database over PostgREST with plain fetch rather than supabase-js, which
 * keeps the proxy bundle small, and it runs the one function the migration
 * grants to the service role alone (ambassador_click), so no visitor can reach
 * it. A code that is not an active ambassador simply counts nothing, and a
 * database that has not had 20260930_ambassadors.sql yet answers 404, which is
 * swallowed: a missed count is never worth a failed page.
 */
export async function recordClick(code: string): Promise<void> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return;
  try {
    await fetch(`${base}/rest/v1/rpc/ambassador_click`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_code: code }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    /* a lost count, never a lost page */
  }
}
