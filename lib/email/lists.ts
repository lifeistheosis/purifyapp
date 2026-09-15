/**
 * The two optional email lists, by name. No imports, on purpose: the
 * unsubscribe page and the account screen are client components, and anything
 * that reaches lib/email/send.ts drags `server-only` into their bundle.
 */

export const MARKETING_LISTS = ["shop_offers", "product_updates"] as const;

export type MarketingList = (typeof MARKETING_LISTS)[number];

export const LIST_LABEL: Record<MarketingList, string> = {
  shop_offers: "New in the shop",
  product_updates: "What is new in the library",
};

export function isMarketingList(x: unknown): x is MarketingList {
  return typeof x === "string" && (MARKETING_LISTS as readonly string[]).includes(x);
}
