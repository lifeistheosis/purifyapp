import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { pageAllSettled } from "@/lib/supabase/pageAll";

import { inTrialNow, PLUS_FACT_COLUMNS, type PlusFact } from "./plusHistory";

/**
 * The kept RevenueCat events, read for the admin (item A2,
 * lib/admin/plusHistory.ts says what they become).
 *
 * Three answers, kept apart because the admin says each differently: the
 * table is not there yet (it waits on his OK), it could not be read just now,
 * or here are the events, with the moment the first one was kept. That moment
 * matters: a day before it is a day nothing was kept, not a day with no Plus,
 * so a figure is taken from the events only for days they cover.
 */
export type PlusRead =
  | { state: "ok"; facts: PlusFact[]; since: string | null }
  | { state: "absent" }
  | { state: "unavailable" };

type DbError = { code?: string; message: string };

/** Every event from `fromIso` on, oldest first, and when the first event of all was kept. */
export async function readPlusFacts(admin: SupabaseClient, fromIso: string): Promise<PlusRead> {
  try {
    const first = (await admin.from("plus_events").select("event_at").order("event_at", { ascending: true }).limit(1)) as {
      data: { event_at: string }[] | null;
      error: DbError | null;
    };
    if (first.error) return isTableAbsent(first.error) ? { state: "absent" } : unavailable(first.error);
    const since = first.data?.[0]?.event_at ?? null;
    if (!since) return { state: "ok", facts: [], since: null };
    const rows = await pageAllSettled<PlusFact, DbError>((from, to) =>
      admin
        .from("plus_events")
        .select(PLUS_FACT_COLUMNS)
        .gte("event_at", fromIso)
        .order("event_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to) as unknown as PromiseLike<{ data: PlusFact[] | null; error: DbError | null }>,
    );
    if (rows.error) return isTableAbsent(rows.error) ? { state: "absent" } : unavailable(rows.error);
    return { state: "ok", facts: rows.data, since };
  } catch (e) {
    return unavailable({ message: (e as Error).message });
  }
}

function unavailable(error: DbError): PlusRead {
  console.warn("[admin] Plus events could not be read", error.message);
  return { state: "unavailable" };
}

/**
 * Whether the events cover everything from `fromIso` on: the first event was
 * kept at or before it. Before that, nothing was kept, so a sum would be short.
 */
export function covers(read: PlusRead, fromIso: string): read is { state: "ok"; facts: PlusFact[]; since: string } {
  return read.state === "ok" && read.since !== null && Date.parse(read.since) <= Date.parse(fromIso);
}

/** How far back to look for a trial still running: longer than any trial Purify offers (a week today). */
const TRIAL_LOOKBACK_MS = 100 * 86_400_000;

/**
 * The members in a free trial now, or null when the events cannot say (no
 * table yet, or a failed read): then nobody is taken out of the paying count,
 * which is how it was before the events were kept.
 */
export async function trialMembers(admin: SupabaseClient, now: Date = new Date()): Promise<Set<string> | null> {
  const read = await readPlusFacts(admin, new Date(now.getTime() - TRIAL_LOOKBACK_MS).toISOString());
  return read.state === "ok" ? inTrialNow(read.facts, now) : null;
}
