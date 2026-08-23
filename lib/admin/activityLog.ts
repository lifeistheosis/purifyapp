import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Who did what, and when.
 *
 * WHY THIS EXISTS. 26 mutating handlers live under app/api/admin, expanding to
 * 48 distinct operations because seven of them are dispatchers. Thirteen of
 * those 48 record an actor, across five differently-named columns on ten
 * tables. The tables carrying the highest-consequence writes have no actor
 * column at all: entitlements, shop_refund_requests, shop_orders, shop_stores.
 *
 * So comping a subscription, which overwrites plus_until rather than extending
 * it and replaces plus_source so a paying subscriber loses the record that
 * they ever paid, is attributable to nobody and reversible by nobody.
 *
 * THE TABLE MAY NOT EXIST, AND THAT IS NOT A BUG IN THIS FILE. AGENTS.md is
 * explicit that the migrations folder is not uniformly applied and that merged
 * and applied are independently true or false. A logActivity() that assumed
 * the table would throw a 500 on a comp grant during exactly the window that
 * pipeline demonstrably produces. Tolerating the absence is the permanent
 * shape here, not scaffolding, and it is already the house style: see
 * lib/community/notify.ts, app/api/cron/push-deliver/route.ts and
 * lib/support/tickets.ts, all of which ship dark and harmless.
 *
 * STDOUT IS THE OPERATIVE SINK UNTIL THE TABLE LANDS. The line is emitted
 * FIRST and unconditionally, before anything that can fail. The site runs on
 * Render, which retains stdout, so "who granted that comp on the 24th" is
 * answerable with grep today rather than after a migration merges.
 *
 * Waiting on: supabase/migrations/20260823_admin_activity_log.sql, which is
 * written and NOT signed off. Do not read a logActivity() call at a route and
 * conclude the action is recorded in a queryable table; today it is recorded
 * in the deploy log.
 *
 * Every call is fire and forget. This function cannot fail a request.
 */

export type ActivityEvent = {
  /** The admin's email, from getAdminUser(). Null only if the session lacks one. */
  actorEmail: string | null;
  /** Dotted and stable: "comp.grant", "refund.approve", "store.assign". */
  action: string;
  /** The kind of thing acted on: "entitlement", "refund_request", "shop_store". */
  entityType: string;
  entityId: string | null;
  /**
   * Anything needed to understand or undo the action later. For a destructive
   * overwrite this MUST carry the prior values, because the row itself no
   * longer holds them.
   */
  detail?: Record<string, unknown>;
};

/** Postgres: undefined_table, undefined_column. The table is simply not there yet. */
const ABSENT = new Set(["42P01", "42703"]);

let warned = false;

export async function logActivity(event: ActivityEvent): Promise<void> {
  // FIRST, and never conditional. If everything below fails, this still ran.
  console.log(
    JSON.stringify({
      tag: "admin-activity",
      at: new Date().toISOString(),
      ...event,
    }),
  );

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("admin_activity_log").insert({
      actor_email: event.actorEmail,
      action: event.action,
      entity_type: event.entityType,
      entity_id: event.entityId,
      detail: event.detail ?? {},
    });
    if (!error) return;
    if (ABSENT.has(error.code ?? "")) {
      // Once per process. A warning per comp grant would train the operator to
      // ignore the log, which is the one place the record currently lives.
      if (!warned) {
        warned = true;
        console.warn(
          "[admin-activity] admin_activity_log is absent; stdout is the only sink. Apply supabase/migrations/20260823_admin_activity_log.sql.",
        );
      }
      return;
    }
    console.warn("[admin-activity] insert failed", error.message);
  } catch (e) {
    // Never throw. A failure to record must not fail the thing being recorded.
    console.warn("[admin-activity] threw", (e as Error).message);
  }
}
