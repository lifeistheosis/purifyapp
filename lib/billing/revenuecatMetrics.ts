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
// The v2 overview endpoint answers with the real numbers, so where it is
// configured the panel stops guessing.
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
// RATE LIMIT. 25 requests a minute on this endpoint. The admin revenue tab
// polls, so the result is cached briefly below; without that a couple of open
// tabs would exhaust the budget and start returning 429s that look like
// outages.
//
// This is a READ key. It never moves money and never sees card data.

const BASE = "https://api.revenuecat.com/v2";

export function revenuecatMetricsConfigured(): boolean {
  return !!process.env.REVENUECAT_V2_API_KEY && !!process.env.REVENUECAT_PROJECT_ID;
}

export type ProjectMetrics = {
  /** Real monthly recurring revenue, in whole currency units. */
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  activeTrials: number;
  /** Gross revenue across all apps in the project. */
  totalRevenue: number;
  currency: string;
  /** RevenueCat's own freshness stamp, not ours. */
  lastUpdatedAt: string | null;
};

type CacheEntry = { at: number; value: ProjectMetrics | null };
let cache: CacheEntry | null = null;
const TTL_MS = 60_000;

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
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
      `${BASE}/projects/${encodeURIComponent(project)}/metrics/overview`,
      {
        headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );
    if (res.ok) {
      const j = (await res.json()) as Record<string, unknown>;
      value = {
        mrr: num(j.mrr),
        arr: num(j.arr),
        activeSubscriptions: num(j.active_subscriptions),
        activeTrials: num(j.active_trials),
        totalRevenue: num(j.total_revenue),
        currency: typeof j.currency === "string" ? j.currency : "USD",
        lastUpdatedAt: typeof j.last_updated_at === "string" ? j.last_updated_at : null,
      };
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

/**
 * Real annual revenue per paying subscriber.
 *
 * This is the figure the owner dashboard has been listing as "not measurable":
 * MRR there is subscribers times list price, so dividing it back returns the
 * list price and proves nothing. With real MRR and a real subscriber count the
 * division finally means something, and it is the number every projection is
 * most sensitive to after the install rate.
 */
export function realArpuAnnual(m: ProjectMetrics): number | null {
  if (m.activeSubscriptions <= 0) return null;
  return (m.mrr / m.activeSubscriptions) * 12;
}

/** Test seam. The module cache would otherwise leak between cases. */
export function __resetMetricsCache() {
  cache = null;
}
