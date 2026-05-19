import "server-only";

/**
 * Live totals for the funding counter on /support, pulled from Buy Me a
 * Coffee's Developer API. Best-effort: a missing/expired token or a network
 * failure returns null so the page falls back to the static figure in
 * `data/support/support.ts`.
 *
 * Auth: `BMC_ACCESS_TOKEN` env var. Create one at
 * https://buymeacoffee.com/account/settings → Developer API → New Token.
 *
 * Caching: Next.js fetch with `revalidate: 300` (5 minutes). The support
 * page hits this from a server component; Next's data cache absorbs the
 * burst when many users open /support at once.
 */

export type BmcTotal = {
  /** Sum of this calendar month's one-time supporter coffees + active
   *  subscription monthly value, in USD. */
  monthlyRaisedUsd: number;
  /** Distinct supporters who paid in the current month (incl. recurring). */
  supporters: number;
  /** ISO timestamp of this snapshot. */
  fetchedAt: string;
};

type BmcSupporter = {
  support_id?: number | string;
  support_coffees?: number;
  support_coffee_price?: string | number;
  support_created_on?: string; // ISO
  supporter_name?: string | null;
  supporter_email?: string | null;
};

type BmcSupportersPage = {
  current_page?: number;
  last_page?: number;
  data?: BmcSupporter[];
  next_page_url?: string | null;
};

type BmcSubscription = {
  subscription_id?: number | string;
  subscription_coffee_price?: string | number;
  subscription_coffee_num?: number;
  subscription_is_cancelled?: number | boolean | null;
  subscription_current_period_end?: string | null;
  payer_email?: string | null;
};

type BmcSubscriptionsPage = {
  current_page?: number;
  last_page?: number;
  data?: BmcSubscription[];
  next_page_url?: string | null;
};

const API = "https://developers.buymeacoffee.com/api/v1";

function isInCurrentMonth(iso?: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth()
  );
}

function toNumber(x: unknown, fallback = 0): number {
  if (typeof x === "number") return Number.isFinite(x) ? x : fallback;
  if (typeof x === "string") {
    const n = parseFloat(x);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

export async function fetchBmcTotal(): Promise<BmcTotal | null> {
  const token = process.env.BMC_ACCESS_TOKEN;
  if (!token) return null;

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  // The caller (support page + the /api/support/bmc route) sets
  // page-level ISR `revalidate = 300`, which caches the rendered output
  // for five minutes so a few BMC paginated calls only happen once per
  // five-minute window across all readers.
  const init: RequestInit = { headers };

  try {
    // One-time supporters (paginated). We only need the current calendar
    // month so we stop walking pages once the dates fall outside.
    let oneTimeUsd = 0;
    const oneTimeEmails = new Set<string>();
    let page = 1;
    let exhausted = false;
    while (!exhausted && page < 30) {
      const r = await fetch(`${API}/supporters?page=${page}`, init);
      if (!r.ok) {
        if (page === 1) return null; // first page is the authoritative gate
        break;
      }
      const body = (await r.json()) as BmcSupportersPage;
      const items = body.data ?? [];
      if (items.length === 0) break;
      let anyInMonth = false;
      let allOlderThanMonth = true;
      for (const s of items) {
        if (isInCurrentMonth(s.support_created_on)) {
          anyInMonth = true;
          allOlderThanMonth = false;
          const coffees = toNumber(s.support_coffees, 1);
          const price = toNumber(s.support_coffee_price, 0);
          oneTimeUsd += coffees * price;
          if (s.supporter_email)
            oneTimeEmails.add(String(s.supporter_email).toLowerCase());
          else if (s.support_id) oneTimeEmails.add(`id:${s.support_id}`);
        } else {
          // Older supporters; if no in-month entries appear on this page at
          // all, BMC's default newest-first ordering tells us we're done.
          // Keep `allOlderThanMonth` true so we can break.
        }
      }
      if (!anyInMonth && allOlderThanMonth) {
        exhausted = true;
        break;
      }
      if (!body.next_page_url || (body.last_page && body.current_page === body.last_page)) {
        break;
      }
      page++;
    }

    // Active subscriptions: contribute their monthly value once.
    let monthlySubUsd = 0;
    const subEmails = new Set<string>();
    let sPage = 1;
    while (sPage < 10) {
      const r = await fetch(
        `${API}/subscriptions?status_type=active&page=${sPage}`,
        init,
      );
      if (!r.ok) break;
      const body = (await r.json()) as BmcSubscriptionsPage;
      const items = body.data ?? [];
      if (items.length === 0) break;
      for (const sub of items) {
        const cancelled =
          sub.subscription_is_cancelled === 1 ||
          sub.subscription_is_cancelled === true;
        if (cancelled) continue;
        const price = toNumber(sub.subscription_coffee_price, 0);
        const num = toNumber(sub.subscription_coffee_num, 1);
        monthlySubUsd += price * num;
        if (sub.payer_email)
          subEmails.add(String(sub.payer_email).toLowerCase());
      }
      if (!body.next_page_url || (body.last_page && body.current_page === body.last_page)) {
        break;
      }
      sPage++;
    }

    const distinct = new Set<string>([...oneTimeEmails, ...subEmails]);
    return {
      monthlyRaisedUsd: Math.round((oneTimeUsd + monthlySubUsd) * 100) / 100,
      supporters: distinct.size,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
