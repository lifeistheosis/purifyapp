/**
 * Turning what a route sends into the slice the attention derivation reads.
 *
 * One reader per source, each `(d: unknown) => T | null`, the same shape
 * OverviewWidgets uses: null on a payload that is not what this expects, so
 * shape drift on the server surfaces as "not answering" rather than as a
 * confident zero from `?? 0`. Pure, so lib/admin/__tests__ can hand each one
 * the real payload shape and a wrong one.
 */

import {
  API_BIBLE_LIMITS,
  readUsageLimit,
  type LimitReading,
} from "./insights/apiLimits";
import type { OverviewAlertFields, ProbeSlice, SourceState } from "./attention";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const strOrNull = (v: unknown): string | null => (typeof v === "string" ? v : null);

export function readOverviewSlice(d: unknown): OverviewAlertFields | null {
  if (!isObj(d)) return null;
  // null is a documented value here ("the count could not be taken"), not
  // shape drift: the route sends it in place of the `?? 0` that used to hide
  // a failed count. Anything else that is not a finite number is drift.
  const rawPending = d.ordersPending;
  const pending = rawPending === null ? null : num(rawPending);
  if ((rawPending !== null && pending === null) || typeof d.ordersDegraded !== "boolean") return null;
  // The stale fields are null when the route did not measure them, and absent
  // on a server that predates them. Both are "not measured", never zero: the
  // derivation shows a chip for it rather than reading "nothing stale".
  const stale = num(d.ordersPendingStale);
  const unchecked = num(d.ordersPendingUnchecked);
  return {
    ordersDegraded: d.ordersDegraded,
    ordersPending: pending,
    staleMeasured: stale !== null && unchecked !== null,
    ordersPendingStale: stale ?? 0,
    ordersPendingUnchecked: unchecked ?? 0,
    pendingNewestStaleAt: strOrNull(d.pendingNewestStaleAt),
    lastWebhookAt: strOrNull(d.lastWebhookAt),
    lastWebhookLogReadable: d.lastWebhookLogReadable === true,
    lastWebhookLogMissing: d.lastWebhookLogMissing === true,
    lastReconcileAt: strOrNull(d.lastReconcileAt),
  };
}

export function readProbeSlice(d: unknown): ProbeSlice | null {
  if (!isObj(d)) return null;
  const probes = arr(d.probes);
  const out: ProbeSlice["probes"] = [];
  for (const p of probes) {
    if (!isObj(p) || typeof p.service !== "string") return null;
    const status = p.status;
    if (status !== "ok" && status !== "fail" && status !== "skipped") return null;
    out.push({ service: p.service, status, detail: typeof p.detail === "string" ? p.detail : "" });
  }
  // An empty probe list is a route that ran nothing, which is not a measurement.
  if (out.length === 0) return null;
  return { probes: out };
}

export function readSupportSlice(d: unknown): { open: number } | null {
  if (!isObj(d)) return null;
  // The counts-only shape the strip asks for (?summary=1).
  if (typeof d.open === "number" && Number.isFinite(d.open)) return { open: d.open };
  // The full list, for a server that predates the summary branch.
  if (!Array.isArray(d.tickets)) return null;
  // "open" only. A "pending" ticket is one waiting on the customer, which is
  // not a person waiting on the operator.
  const open = d.tickets.filter((t) => isObj(t) && t.status === "open").length;
  return { open };
}

export function readVerificationSlice(d: unknown): { requested: number } | null {
  if (!isObj(d) || !Array.isArray(d.requests)) return null;
  const requested = d.requests.filter((r) => isObj(r) && r.status === "requested").length;
  return { requested };
}

export function readCommunitySlice(d: unknown): { recipes: number; reports: number } | null {
  if (!isObj(d)) return null;
  // The counts-only shape the strip asks for (?summary=1).
  if (typeof d.recipes === "number" && typeof d.reports === "number") {
    return { recipes: d.recipes, reports: d.reports };
  }
  const keys = ["pendingRecipes", "campaignReports", "recipeReports", "conversationReports"];
  if (!keys.every((k) => Array.isArray(d[k]))) return null;
  return {
    recipes: arr(d.pendingRecipes).length,
    reports: arr(d.campaignReports).length + arr(d.recipeReports).length + arr(d.conversationReports).length,
  };
}

export function readApiLimitsSlice(d: unknown): { calls: LimitReading; mau: LimitReading } | null {
  if (!isObj(d) || !isObj(d.mau)) return null;
  // The same two readings ApiLimits.tsx builds, from the same fields, with the
  // same pessimism: the MAU ceiling, never the floor. readUsageLimit turns a
  // null into "unmeasured" rather than "ok", which is the whole point of
  // routing through it instead of comparing numbers here.
  const calls = "monthlyCalls" in d ? num(d.monthlyCalls) : null;
  const mau = num(d.mau.ceiling);
  return {
    calls: readUsageLimit("calls", "Monthly API calls", calls, API_BIBLE_LIMITS.monthlyCalls),
    mau: readUsageLimit("mau", "Monthly active users", mau, API_BIBLE_LIMITS.monthlyActiveUsers),
  };
}

/**
 * A live snapshot, classified.
 *
 * failing wins over data: a source whose last read did not answer is not a
 * source, whatever it said a minute ago. The queue count it held is dropped
 * rather than shown stale, because "3 open tickets" from an hour ago is a
 * claim the panel cannot stand behind and an "unmeasured" chip is one it can.
 */
export function toSourceState<T>(
  snap: { data: unknown; loading: boolean; failing: boolean; lastSynced: Date | null },
  read: (d: unknown) => T | null,
): SourceState<T> {
  if (snap.failing) return { status: "failed", data: null, at: null };
  if (snap.data === null || snap.data === undefined) {
    return snap.loading
      ? { status: "loading", data: null, at: null }
      : { status: "failed", data: null, at: null };
  }
  const parsed = read(snap.data);
  if (parsed === null) return { status: "failed", data: null, at: null };
  return { status: "ok", data: parsed, at: snap.lastSynced ? snap.lastSynced.getTime() : null };
}
