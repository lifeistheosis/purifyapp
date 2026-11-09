import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The recordings switched off from the admin right now (chant_pulls, pulled
 * = true), for the live list (app/audio/chants/live.json/route.ts).
 *
 * Every app asks for the list when a chant is opened, so this is read at most
 * once a minute per server, and never waits more than three seconds. Whatever
 * goes wrong (no table yet, a slow or failing database), the answer is no
 * takedowns: the list falls back to the committed file, which is exactly what
 * every app read before this existed. A takedown is never lost by that: it
 * shows again on the next read that succeeds.
 */

const TTL_MS = 60_000;
const TIMEOUT_MS = 3_000;

let cache: { at: number; refs: string[] } | null = null;

export async function activePulls(db?: SupabaseClient, now: number = Date.now()): Promise<string[]> {
  if (cache && now - cache.at < TTL_MS) return cache.refs;
  let refs: string[] = [];
  try {
    const read = (db ?? createAdminClient()).from("chant_pulls").select("ref").eq("pulled", true);
    const timeout = new Promise<{ data: null; error: { message: string } }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "timed out" } }), TIMEOUT_MS),
    );
    const { data, error } = (await Promise.race([read, timeout])) as {
      data: { ref: string }[] | null;
      error: { code?: string; message: string } | null;
    };
    if (!error) refs = (data ?? []).map((r) => r.ref).filter((r) => typeof r === "string");
    else if (!isTableAbsent(error)) console.warn("[chants] takedowns could not be read; serving the committed list", error.message);
  } catch (e) {
    console.warn("[chants] takedowns could not be read; serving the committed list", (e as Error).message);
  }
  cache = { at: now, refs };
  return refs;
}

/** After a switch in the admin: the next list read asks the table again. */
export function forgetPulls() {
  cache = null;
}
