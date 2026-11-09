import "server-only";

// RevenueCat REST v2, project metrics. The first source of REAL subscription
// revenue this app has had.
//
// WHY THIS EXISTS. Every MRR figure in the admin panel until now was
// estimated: active paid subscribers multiplied by the list price, in
// lib/premium/mrr.ts. That estimate is honest as far as it goes and it is
// labelled as an estimate everywhere it appears, but it cannot see a single
// thing that actually determines revenue. It does not know about introductory
// pricing, regional price tiers, annual plans bought at a discount, store
// commission, refunds, currency, or trials that never converted. It also
// cannot produce churn, because it is a snapshot of who is subscribed now
// with no memory of who used to be.
//
// WHY IT IS A SEPARATE FILE FROM revenuecatRest.ts. That one is v1, keyed on
// a single app_user_id, and answers "when did this person subscribe". This is
// v2, keyed on a project, and answers "what is the business doing". Different
// API version, different key, different permission scope. Sharing a module
// would mean one missing env var silently disabling both.
//
// KEYS. v1 and v2 keys are not interchangeable. This needs a v2 secret key
// with the charts_metrics:overview:read permission, created in the RevenueCat
// dashboard under Project settings, API keys. REVENUECAT_REST_API_KEY (v1)
// will NOT work here and the two are deliberately separate env vars so a
// misconfiguration fails loudly at one surface rather than quietly at both.
//
// ── THE SHAPE, AND THE BUG THIS FILE HAD UNTIL 2026-11-09 ──────────────────
//
// The overview endpoint answers with a LIST of metrics, each named by an id:
//
//   { "object": "overview_metrics",
//     "metrics": [ { "object": "overview_metric", "id": "mrr", "name": "MRR",
//                    "unit": "$", "period": "P0D", "value": 412.5,
//                    "last_updated_at": 1658399423658,
//                    "last_updated_at_iso8601": "2022-07-21T10:30:23Z" }, ...] }
//
// (RevenueCat's OpenAPI schema, OverviewMetrics and OverviewMetric, read from
// the generated client in the revenuecat-api package, 2.0.0, 2026-11-09.)
//
// This file used to read flat fields off the top of the body (`mrr`, `arr`,
// `total_revenue`, `active_subscriptions`). RevenueCat has never sent those,
// so the guard below threw every real answer away as "unrecognised", and the
// panel stayed on the list-price estimate with a key set and working. It also
// called a figure "total revenue, all time" that the overview does not carry
// (its revenue is the last 28 days) and an "arr" that is not in it at all. The
// owner's word that the revenue "isn't correctly set up" (2026-11-09) is what
// sent us looking.
//
// Now: the metrics are read by id. ARR is not RevenueCat's, so it is not here;
// callers that show one multiply MRR by twelve and call it a run rate. Revenue
// for any span of days comes from the revenue endpoint below, which answers
// one total for an inclusive date range.
//
// WHAT RevenueCat CALLS REVENUE. What customers paid, minus refunds, still
// holding the stores' commission and taxes (RevenueCat's own definition; its
// "proceeds" are what is left after both). So a figure from here is BEFORE the
// stores' cut, and a caller that wants what Purify keeps takes the cut itself.
//
// CURRENCY. Both endpoints answer in the project's primary currency unless one
// is asked for. The panel prints dollars, so every call asks for USD.
//
// RATE LIMIT. The Charts & Metrics domain allows 15 requests a minute in all.
// The admin polls, so every answer is cached, failures included: the overview
// for a minute, a revenue span for five.
//
// This is a READ key. It never moves money and never sees card data.

const BASE = "https://api.revenuecat.com/v2";

/** The currency every figure is asked for in, so the panel's $ means dollars. */
export const REVENUECAT_CURRENCY = "USD";

export function revenuecatMetricsConfigured(): boolean {
  return !!process.env.REVENUECAT_V2_API_KEY && !!process.env.REVENUECAT_PROJECT_ID;
}

export type ProjectMetrics = {
  /** Real monthly recurring revenue, in whole currency units. */
  mrr: number;
  /** Paid, unexpired subscriptions (a trial is not one). */
  activeSubscriptions: number;
  /** Free trials RevenueCat is tracking now. */
  activeTrials: number;
  /** What customers paid in the last 28 days, minus refunds, before the stores' cut. Null when not sent. */
  revenue28d: number | null;
  /** New customers in the last 28 days. Null when not sent. */
  newCustomers28d: number | null;
  /** Customers active in the last 28 days. Null when not sent. */
  activeCustomers28d: number | null;
  currency: string;
  /** RevenueCat's own freshness stamp, not ours: the newest of its metrics. */
  lastUpdatedAt: string | null;
};

const TTL_MS = 60_000;
const RANGE_TTL_MS = 5 * 60_000;

type CacheEntry<T> = { at: number; value: T | null };
let cache: CacheEntry<ProjectMetrics> | null = null;
const rangeCache = new Map<string, CacheEntry<RevenueRange>>();

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function stampOf(m: Record<string, unknown>): string | null {
  if (typeof m.last_updated_at_iso8601 === "string" && m.last_updated_at_iso8601) {
    const t = Date.parse(m.last_updated_at_iso8601.replace(" ", "T"));
    if (Number.isFinite(t)) return new Date(t).toISOString();
  }
  if (finite(m.last_updated_at)) return new Date(m.last_updated_at).toISOString();
  return null;
}

/**
 * The overview's body to the figures the panel shows, or null when it is not
 * the shape RevenueCat documents.
 *
 * A 2xx IS NOT A SHAPE. An envelope this parser does not recognise must come
 * back null, never as a complete set of zeros: a non-null result means "real,
 * billed figures", and the panel prints it as such. So at least one of the
 * four core metrics (mrr, revenue, active subscriptions, active trials) must
 * be there with a number before anything is returned; a metric that is
 * missing beside them is then genuinely absent and reads 0 (the counts) or
 * null (the 28-day figures).
 *
 * Pure, and exported for the tests.
 */
export function parseOverview(body: unknown, asked: string = REVENUECAT_CURRENCY): ProjectMetrics | null {
  if (!body || typeof body !== "object") return null;
  const list = (body as { metrics?: unknown }).metrics;
  if (!Array.isArray(list)) return null;

  const byId = new Map<string, number>();
  let newest: string | null = null;
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const m = raw as Record<string, unknown>;
    if (typeof m.id !== "string" || !finite(m.value)) continue;
    byId.set(m.id, m.value);
    const stamp = stampOf(m);
    if (stamp && (!newest || stamp > newest)) newest = stamp;
  }

  const core = ["mrr", "revenue", "active_subscriptions", "active_trials"];
  if (!core.some((id) => byId.has(id))) return null;

  const top = (body as { currency?: unknown }).currency;
  return {
    mrr: byId.get("mrr") ?? 0,
    activeSubscriptions: byId.get("active_subscriptions") ?? 0,
    activeTrials: byId.get("active_trials") ?? 0,
    revenue28d: byId.get("revenue") ?? null,
    newCustomers28d: byId.get("new_customers") ?? null,
    activeCustomers28d: byId.get("active_users") ?? null,
    currency: typeof top === "string" && top ? top.toUpperCase() : asked,
    lastUpdatedAt: newest,
  };
}

/**
 * Project-level metrics, or null.
 *
 * Never throws. An unset key, a revoked key, a missing permission, a 429 or a
 * network blip all return null, and every caller is expected to fall back to
 * the estimate and say which one it is showing. A revenue panel that goes
 * blank because a third party rate-limited us is worse than one showing a
 * clearly-labelled estimate.
 */
export async function getProjectMetrics(): Promise<ProjectMetrics | null> {
  const key = process.env.REVENUECAT_V2_API_KEY;
  const project = process.env.REVENUECAT_PROJECT_ID;
  if (!key || !project) return null;

  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;

  let value: ProjectMetrics | null = null;
  try {
    const res = await fetch(
      `${BASE}/projects/${encodeURIComponent(project)}/metrics/overview?currency=${REVENUECAT_CURRENCY}`,
      {
        headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );
    if (res.ok) {
      value = parseOverview(await res.json(), REVENUECAT_CURRENCY);
      if (!value) {
        console.warn(
          "[revenuecat] metrics/overview answered 200 with an unrecognised shape; treating as unavailable",
        );
      }
    } else {
      // Logged rather than thrown. A 401 means the key is wrong, a 403 means
      // it lacks charts_metrics:overview:read, and both are worth seeing in
      // the server log without taking the panel down.
      console.warn(`[revenuecat] metrics/overview -> ${res.status}`);
    }
  } catch (e) {
    console.warn("[revenuecat] metrics/overview failed", e);
  }

  // Cached either way, including the null. A failing key should not be
  // retried on every render of a polling tab.
  cache = { at: Date.now(), value };
  return value;
}

export type RevenueRange = {
  /** What customers paid in the range, minus refunds, before the stores' cut, in whole currency units. */
  value: number;
  currency: string;
  /** Inclusive, YYYY-MM-DD, as RevenueCat answered them. */
  startDate: string;
  endDate: string;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The revenue endpoint's body to a range, or null when it is not the documented shape. Pure. */
export function parseRevenue(
  body: unknown,
  startDate: string,
  endDate: string,
  asked: string = REVENUECAT_CURRENCY,
): RevenueRange | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (!finite(b.value)) return null;
  return {
    value: b.value,
    currency: typeof b.currency === "string" && b.currency ? b.currency.toUpperCase() : asked,
    startDate: typeof b.start_date === "string" && DATE.test(b.start_date) ? b.start_date : startDate,
    endDate: typeof b.end_date === "string" && DATE.test(b.end_date) ? b.end_date : endDate,
  };
}

/**
 * Revenue across every app in the project for the inclusive range
 * [startDate, endDate] (YYYY-MM-DD, UTC days), or null.
 *
 * RevenueCat's GET /projects/{id}/metrics/revenue: one total, from the same
 * revenue chart its dashboard draws, under the same permission as the
 * overview. A range that ends today holds a partial day, as every "today" in
 * the panel does.
 *
 * Never throws, and caches every answer (null included) for five minutes per
 * range, because the domain allows 15 requests a minute in all.
 */
export async function getRevenueBetween(startDate: string, endDate: string): Promise<RevenueRange | null> {
  const key = process.env.REVENUECAT_V2_API_KEY;
  const project = process.env.REVENUECAT_PROJECT_ID;
  if (!key || !project) return null;
  if (!DATE.test(startDate) || !DATE.test(endDate) || startDate > endDate) return null;

  const cacheKey = `${startDate}..${endDate}`;
  const hit = rangeCache.get(cacheKey);
  if (hit && Date.now() - hit.at < RANGE_TTL_MS) return hit.value;

  let value: RevenueRange | null = null;
  try {
    const qs = new URLSearchParams({ start_date: startDate, end_date: endDate, currency: REVENUECAT_CURRENCY });
    const res = await fetch(`${BASE}/projects/${encodeURIComponent(project)}/metrics/revenue?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      value = parseRevenue(await res.json(), startDate, endDate, REVENUECAT_CURRENCY);
      if (!value) console.warn("[revenuecat] metrics/revenue answered 200 with an unrecognised shape");
    } else {
      console.warn(`[revenuecat] metrics/revenue -> ${res.status}`);
    }
  } catch (e) {
    console.warn("[revenuecat] metrics/revenue failed", e);
  }

  // Keep the map small: a range is a day, a window or all time, so a handful
  // of keys at most, but a long-lived server would otherwise grow it forever.
  if (rangeCache.size > 64) rangeCache.clear();
  rangeCache.set(cacheKey, { at: Date.now(), value });
  return value;
}

/**
 * Real annual revenue per paying subscriber.
 *
 * This is the figure the owner dashboard has been listing as "not measurable":
 * MRR there is subscribers times list price, so dividing it back returns the
 * list price and proves nothing. With real MRR and a real subscriber count the
 * division finally means something, and it is the number every projection is
 * most sensitive to after the install rate.
 */
export function realArpuAnnual(m: Pick<ProjectMetrics, "mrr" | "activeSubscriptions">): number | null {
  if (m.activeSubscriptions <= 0) return null;
  return (m.mrr / m.activeSubscriptions) * 12;
}

/** Test seam. The module caches would otherwise leak between cases. */
export function __resetMetricsCache() {
  cache = null;
  rangeCache.clear();
}
