import "server-only";

// A test's rows, read for the shares (app/api/ab/weights) and for the admin
// (app/api/admin/ab): the two kinds of row a test sends, a page at a time.
// Nothing in them names a reader.

import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { createAdminClient } from "@/lib/supabase/admin";

import type { AbRow } from "./bandit";
import { AB_EVENTS, type AbTest } from "./tests";

const PAGE = 1_000;
const MAX_ROWS = 200_000;

/** The rows since the earliest of the tests' first days, or null when they could not be read. */
export async function readAbRows(tests: readonly AbTest[]): Promise<{ rows: AbRow[]; absent: boolean } | null> {
  if (!tests.length) return { rows: [], absent: false };
  const from = `${tests.map((t) => t.begins).sort()[0]}T00:00:00Z`;
  const supa = createAdminClient();
  const rows: AbRow[] = [];
  for (let start = 0; rows.length < MAX_ROWS; start += PAGE) {
    const { data, error } = await supa
      .from("analytics_events")
      .select("name, props, ts")
      .in("name", [...AB_EVENTS])
      .gte("ts", from)
      // Then by id: rows are kept to the day, so a page cut through a day's
      // rows could repeat one or skip one (lib/supabase/pageAll.ts).
      .order("ts", { ascending: true })
      .order("id", { ascending: true })
      .range(start, start + PAGE - 1);
    if (error) {
      if (isTableAbsent(error)) return { rows: [], absent: true };
      console.error("[ab] read failed", error.message);
      return null;
    }
    rows.push(...((data ?? []) as AbRow[]));
    if (!data || data.length < PAGE) break;
  }
  return { rows, absent: false };
}
