import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { listProducts } from "@/lib/shop/catalog";

import { addDays, mergeBoard, plannedTasks, type BoardTask } from "./planner";
import { plannerEvidence } from "./plannerEvidence";
import { readStoredTasks } from "./plannerRead";

/** Six weeks back is as far as a missed deadline is worth saying (as the strip and the old morning email). */
export const BOARD_LOOKBACK_DAYS = 42;

/**
 * The board as it stands on `day`: the rhythm's tasks of the last six weeks,
 * the rows a person stored (a mark, a skip, a "not before" day), and the work
 * found already done. The owner's brief reads it for what needs him and what
 * goes out today, and the desk's sends for whether a piece is still due.
 *
 * `error` is set when the stored rows could not be read. Then a skip or a
 * "not before" day may be missing, so nothing may send by itself on it.
 */
export async function readBoard(admin: SupabaseClient, day: string): Promise<{ tasks: BoardTask[]; error: string | null }> {
  const from = addDays(day, -BOARD_LOOKBACK_DAYS);
  const products = await listProducts({ limit: 60 }).catch(() => []);
  const planned = plannedTasks(from, day, products);
  const [stored, evidence] = await Promise.all([
    readStoredTasks(admin, { from, to: day }, planned.map((t) => t.ruleKey)).catch((e: Error) => ({ rows: [], error: e.message })),
    plannerEvidence(admin, { from, to: day }).catch(() => new Set<string>()),
  ]);
  return { tasks: mergeBoard({ planned, stored: stored.rows, evidence }), error: stored.error };
}
