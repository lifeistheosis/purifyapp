import "server-only";

// RevenueCat REST (v1) read client, for the admin subscriptions view.
// Enriches a member with their real subscription START date and current
// period end, which the entitlements table does not store. Entirely
// optional: with no REVENUECAT_REST_API_KEY set, every call returns null
// and the admin list falls back to the database (plan, source, and
// plus_until as the next-billing date).
//
// The app_user_id we pass IS the Supabase user id (the app sets
// RevenueCat's appUserID to it at sign-in; the webhook relies on the same).
// This is a READ-ONLY key: it never moves money and never sees card data.

const BASE = "https://api.revenuecat.com/v1/subscribers";

export function revenuecatRestConfigured(): boolean {
  return !!process.env.REVENUECAT_REST_API_KEY;
}

export type CustomerDates = {
  /** Earliest original purchase across the customer's subscriptions. */
  startDate: string | null;
  /** Latest active expiration = the next renewal/billing moment. */
  nextBilling: string | null;
  /** Store of the active subscription (app_store / play_store / stripe…). */
  store: string | null;
};

/**
 * Fetch a single customer's subscription dates. Returns null when the key
 * is unset, the customer is unknown, or anything goes wrong — never throws,
 * so the caller can always degrade to database-only fields.
 */
export async function getCustomerDates(
  appUserId: string,
): Promise<CustomerDates | null> {
  const key = process.env.REVENUECAT_REST_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${BASE}/${encodeURIComponent(appUserId)}`, {
      headers: { Authorization: `Bearer ${key}` },
      // The dashboard is not latency-critical; a short timeout keeps a slow
      // RevenueCat from hanging the admin request.
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      subscriber?: {
        subscriptions?: Record<
          string,
          {
            purchase_date?: string | null;
            original_purchase_date?: string | null;
            expires_date?: string | null;
            store?: string | null;
          }
        >;
      };
    };
    const subs = Object.values(data.subscriber?.subscriptions ?? {});
    if (subs.length === 0) return { startDate: null, nextBilling: null, store: null };

    let startDate: string | null = null;
    let nextBilling: string | null = null;
    let store: string | null = null;
    const now = Date.now();
    for (const s of subs) {
      const start = s.original_purchase_date ?? s.purchase_date ?? null;
      if (start && (!startDate || start < startDate)) startDate = start;
      // The "next billing" is the furthest-future active expiry.
      if (s.expires_date && new Date(s.expires_date).getTime() > now) {
        if (!nextBilling || s.expires_date > nextBilling) {
          nextBilling = s.expires_date;
          store = s.store ?? null;
        }
      }
    }
    return { startDate, nextBilling, store };
  } catch {
    return null;
  }
}
