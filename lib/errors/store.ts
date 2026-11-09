import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { createAdminClient } from "@/lib/supabase/admin";

import { cleanVersion, pathOnly, scrubMessage, type ErrorPlatform, type ErrorSource } from "./scrub";

/**
 * Keeps one error report in app_errors (admin item A10,
 * docs/1.9-build/sql/app-errors.sql), cut down by lib/errors/scrub.ts first.
 *
 * BEST EFFORT, AND NEVER LOUD. Reporting a failure must not become a second
 * failure: nothing here throws, and a report that cannot be kept is dropped.
 * Two guards keep it cheap when it cannot help:
 *
 *   - Until the owner has run the table's SQL, the insert answers "no such
 *     table". That is remembered for ten minutes, so an outage does not also
 *     knock on a missing table for every failed request.
 *   - At most 120 reports a minute from one server. A fault that fails every
 *     request is said by its first hundred; the rest would only cost writes.
 */

export type ErrorReport = {
  source: ErrorSource;
  page?: string | null;
  message?: unknown;
  route?: string | null;
  status?: number | null;
  appVersion?: unknown;
  platform?: ErrorPlatform | null;
};

export type StoreResult = "stored" | "absent" | "failed" | "skipped";

const ABSENT_MS = 10 * 60_000;
const PER_MINUTE = 120;

let absentUntil = 0;
let windowStart = 0;
let inWindow = 0;

/** The row app_errors takes, from a report. Pure; exported for the tests. */
export function rowOf(r: ErrorReport): Record<string, unknown> {
  return {
    source: r.source,
    page: pathOnly(r.page),
    message: scrubMessage(r.message),
    route: typeof r.route === "string" ? r.route.slice(0, 200) : null,
    status: typeof r.status === "number" && r.status >= 100 && r.status <= 599 ? Math.floor(r.status) : null,
    app_version: cleanVersion(r.appVersion),
    platform: r.platform ?? null,
  };
}

export async function recordError(report: ErrorReport, db?: SupabaseClient, now: number = Date.now()): Promise<StoreResult> {
  try {
    if (now < absentUntil) return "skipped";
    if (now - windowStart >= 60_000) {
      windowStart = now;
      inWindow = 0;
    }
    if (inWindow >= PER_MINUTE) return "skipped";
    inWindow += 1;

    const { error } = await (db ?? createAdminClient()).from("app_errors").insert(rowOf(report));
    if (!error) return "stored";
    if (isTableAbsent(error)) {
      absentUntil = now + ABSENT_MS;
      return "absent";
    }
    return "failed";
  } catch {
    return "failed";
  }
}

/** Test seam: forget the guards between cases. */
export function __resetErrorStore() {
  absentUntil = 0;
  windowStart = 0;
  inWindow = 0;
}
