// What a bank line is, and the totals by month. Pure and shared: the
// owner's report (scripts/owner-report.mjs) and the admin's Bank panel
// (app/api/owner/bank) read the bank through these two, so both say the same.
// Tested in lib/owner/__tests__/ownerReport.test.ts.

/**
 * What a bank line is, from its counterparty and description. First match
 * wins; unmatched money in is "other income", unmatched money out "other cost".
 */
export const CATEGORIES = [
  { name: "App Store payout", dir: "in", match: /apple|itunes/i },
  { name: "Google Play payout", dir: "in", match: /google/i },
  { name: "Stripe payout (shop)", dir: "in", match: /stripe/i },
  { name: "Hosting (Render)", dir: "out", match: /render/i },
  { name: "Database (Supabase)", dir: "out", match: /supabase/i },
  { name: "Network (Cloudflare)", dir: "out", match: /cloudflare/i },
  { name: "Email (Resend)", dir: "out", match: /resend/i },
  { name: "Subscriptions (RevenueCat)", dir: "out", match: /revenuecat/i },
  { name: "Developer accounts", dir: "out", match: /apple|google|itunes/i },
  { name: "Code and builds (GitHub)", dir: "out", match: /github/i },
  { name: "AI tools", dir: "out", match: /anthropic|claude|openai|higgsfield|elevenlabs/i },
  { name: "Domains", dir: "out", match: /namecheap|godaddy|porkbun|domain/i },
  { name: "Shop goods and shipping", dir: "out", match: /printful|shippo|usps|ups|fedex/i },
  { name: "Transfer between accounts", dir: "any", match: /mercury|transfer/i },
];

export function categorize(tx) {
  const text = `${tx.counterpartyName ?? ""} ${tx.bankDescription ?? ""}`;
  const dir = tx.amount >= 0 ? "in" : "out";
  if (tx.kind === "internalTransfer") return "Transfer between accounts";
  const hit = CATEGORIES.find((c) => (c.dir === dir || c.dir === "any") && c.match.test(text));
  return hit ? hit.name : dir === "in" ? "Other income" : "Other cost";
}

/** @typedef {{ in: number, out: number, net: number, byCategory: Record<string, number> }} Month */

/**
 * Totals by month and category. Failed and cancelled lines are left out.
 * @param {any[]} txs
 * @returns {Record<string, Month>}
 */
export function summarizeBank(txs) {
  /** @type {Record<string, Month>} */
  const months = {};
  for (const t of txs) {
    if (t.status === "failed" || t.status === "cancelled") continue;
    const month = String(t.postedAt ?? t.createdAt ?? "").slice(0, 7) || "pending";
    const cat = categorize(t);
    const m = (months[month] ??= { in: 0, out: 0, net: 0, byCategory: {} });
    if (cat !== "Transfer between accounts") {
      if (t.amount >= 0) m.in += t.amount;
      else m.out += -t.amount;
    }
    m.byCategory[cat] = round2((m.byCategory[cat] ?? 0) + t.amount);
  }
  for (const m of Object.values(months)) {
    m.in = round2(m.in);
    m.out = round2(m.out);
    m.net = round2(m.in - m.out);
  }
  return months;
}

export const round2 = (n) => Math.round(n * 100) / 100;

/** Bank kinds that are not the app's running costs: money moved between accounts, and goods bought to sell. */
export const NOT_RUNNING_COSTS = new Set(["Transfer between accounts", "Shop goods and shipping"]);

/**
 * The app's monthly running costs from the bank: the average of what went out
 * in the last whole months (up to three) before `nowMonth` ("YYYY-MM"),
 * leaving out transfers and goods. Null until the bank holds one whole month
 * with costs in it: until then the Goals page keeps his typed cost lines.
 * @param {Record<string, Month>} months
 * @param {string} nowMonth
 * @returns {{ cents: number, months: string[] } | null}
 */
export function bankRunningCosts(months, nowMonth) {
  const whole = Object.keys(months)
    .filter((k) => /^\d{4}-\d{2}$/.test(k) && k < nowMonth)
    .sort()
    .slice(-3);
  const outs = whole.map((k) =>
    Object.entries(months[k].byCategory)
      .filter(([cat, v]) => v < 0 && !NOT_RUNNING_COSTS.has(cat))
      .reduce((n, [, v]) => n - v, 0),
  );
  const used = whole.filter((_, i) => outs[i] > 0);
  if (used.length === 0) return null;
  const total = outs.filter((o) => o > 0).reduce((a, b) => a + b, 0);
  return { cents: Math.round((total / used.length) * 100), months: used };
}
