import { timingSafeEqual } from "node:crypto";

/**
 * The owner's digest: the few totals a chat reads to tell him how Purify is
 * doing, served by /api/owner/digest to a holder of OWNER_DIGEST_TOKEN.
 *
 * WHY A TOKEN AND NOT THE SERVICE KEY. His word of 2026-11-24 ("can we setup
 * a system so you can look at that whenever"). A chat holding the service key
 * could read and write every row: emails, payments, Plus grants. This token
 * opens one route that answers totals only, so a leak shows counts and
 * nothing else, and deleting the variable on Render closes it.
 *
 * WHAT IT NEVER CARRIES. No email, no name, no user id, no row. Only numbers
 * and the names of stores. `digestHasNoPersonalData` holds it to that, and
 * lib/owner/__tests__/digest.test.ts runs it.
 *
 * Pure: the database's side is app/api/owner/digest/route.ts.
 */

/** Whether the request's bearer matches the token, in constant time. */
export function digestTokenMatches(header: string | null, token: string | undefined): boolean {
  if (!token || token.length < 32) return false; // unset or too short: closed
  if (!header) return false;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!m) return false;
  const a = Buffer.from(m[1]);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type DigestInputs = {
  generatedAt: string;
  accounts: { total: number; new7: number; newPrev7: number; new30: number };
  readers: {
    /**
     * Distinct signed-in readers seen in the window. Null: not recorded.
     * /api/track never writes analytics_sessions.user_id, so this count read
     * 0 on its first live read (2026-11-24); null says so instead of a zero.
     */
    signedIn7: number | null;
    signedInPrev7: number | null;
    sessions7: number;
    sessionsPrev7: number;
    pageviews7: number;
  };
  plus: {
    paid: number;
    trial: number;
    trialsKnown: boolean;
    comped: number;
    gifted: number;
    legacy: number;
    developer: number;
    test: number;
    bySource: Record<string, number>;
    cancelling: number;
    billingIssue: number;
    estimatedMrrCents: number;
  };
  shop: { paidOrders30: number; paidRevenueCents30: number };
  /** Which outside sources this server holds a key for, so a chat can check Render's setup. */
  sources: { revenuecat: boolean; mercury: boolean; stripe: boolean };
};

export type Digest = DigestInputs & {
  rates: {
    /** Paying Plus over all accounts, in percent, one decimal. */
    plusConversionPct: number;
    /** Of paying Plus, the share set to end, in percent, one decimal. */
    cancellingPct: number;
    /** New accounts this week against the week before, in percent. */
    newAccountsChangePct: number | null;
    sessionsChangePct: number | null;
    pageviewsPerSession: number;
  };
};

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);
const change = (now: number, before: number) =>
  before > 0 ? Math.round(((now - before) / before) * 1000) / 10 : null;

export function buildDigest(i: DigestInputs): Digest {
  return {
    ...i,
    rates: {
      plusConversionPct: pct(i.plus.paid, i.accounts.total),
      cancellingPct: pct(i.plus.cancelling, i.plus.paid),
      newAccountsChangePct: change(i.accounts.new7, i.accounts.newPrev7),
      sessionsChangePct: change(i.readers.sessions7, i.readers.sessionsPrev7),
      pageviewsPerSession:
        i.readers.sessions7 > 0 ? Math.round((i.readers.pageviews7 / i.readers.sessions7) * 10) / 10 : 0,
    },
  };
}

/**
 * True when nothing in the digest could name a person: every leaf is a number,
 * a boolean or the generated time, and the only keys that are not fixed are
 * store names, which are short and carry no @.
 */
export function digestHasNoPersonalData(d: unknown): boolean {
  const walk = (v: unknown, key: string): boolean => {
    if (typeof v === "number" || typeof v === "boolean" || v === null) return true;
    if (typeof v === "string") return key === "generatedAt" && !Number.isNaN(Date.parse(v));
    if (typeof v === "object") {
      return Object.entries(v as Record<string, unknown>).every(
        ([k, x]) => !k.includes("@") && k.length <= 40 && walk(x, k),
      );
    }
    return false;
  };
  return walk(d, "");
}
