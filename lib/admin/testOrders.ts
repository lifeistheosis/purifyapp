import { DEVELOPER_EMAILS, isDeveloperEmail } from "@/lib/dev/developer";

/**
 * His own test shop orders, kept out of the money (his yes to item 54 of
 * 2026-11-10: "Leave your own test shop orders out of revenue").
 *
 * WHAT IS A TEST ORDER. One placed with a developer account's email
 * (lib/dev/developer.ts): the same accounts whose own Plus the admin already
 * keeps out of the paying counts (lib/entitlements/adminStats.ts). His card
 * paid the shop, Stripe kept its fee and the rest came back to him: booked as
 * a sale, it is a loss read as a gain.
 *
 * WHAT CHANGES. Only the money and the order counts the admin adds up: Home,
 * Money, Revenue, the calendar's days, the Monday email, the hourly goals,
 * Catalogue's growth and funnel, and the Stripe ledger's copy of the same
 * charge (matched by its payment intent). The order itself is untouched:
 * Orders still lists it, to look at or to refund.
 *
 * Pure: the database's side is lib/admin/testOrders.server.ts. Tested in
 * lib/admin/__tests__/testOrders.test.ts.
 */

/** Whether an order is one of his tests. */
export function isOwnTestOrder(order: { email?: string | null }): boolean {
  return isDeveloperEmail(order.email);
}

/** The orders that are not his tests. */
export function withoutOwnTestOrders<T extends { email?: string | null }>(orders: readonly T[]): T[] {
  return orders.filter((o) => !isOwnTestOrder(o));
}

/**
 * The same rule for a count the database makes, as a PostgREST `or` filter:
 * an order with no email stays, and so does one whose email is no developer's.
 * Quoted, so an address's dots and @ are read as the value.
 */
export function notOwnTestOrdersFilter(): string {
  const not = DEVELOPER_EMAILS.map((email) => `email.not.ilike."${email}"`);
  return `email.is.null,${not.length === 1 ? not[0] : `and(${not.join(",")})`}`;
}

/** The Stripe ledger's rows less the charges and refunds of his test orders. */
export function withoutOwnTestCharges<T extends { intent: string | null }>(rows: readonly T[], testIntents: ReadonlySet<string>): T[] {
  if (testIntents.size === 0) return [...rows];
  return rows.filter((r) => !(r.intent && testIntents.has(r.intent)));
}
