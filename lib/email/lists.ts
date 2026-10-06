/**
 * The optional email lists, by name. No imports, on purpose: the
 * unsubscribe page and the account screen are client components, and anything
 * that reaches lib/email/send.ts drags `server-only` into their bundle.
 */

export const MARKETING_LISTS = ["shop_offers", "product_updates", "community_digest", "release_news"] as const;

/**
 * The one list that starts on (the owner, 2026-10-06: "that's just updates to
 * the application"). A few times a year, when a new version of Purify is
 * released, every account is told what changed, unless it has said stop. The
 * other three stay off until a reader turns them on. The privacy page says
 * both, and lib/email/preferences.ts is where the difference is kept.
 */
export const RELEASE_NEWS = "release_news" satisfies (typeof MARKETING_LISTS)[number];

export type MarketingList = (typeof MARKETING_LISTS)[number];

export const LIST_LABEL: Record<MarketingList, string> = {
  shop_offers: "New in the shop",
  product_updates: "What is new in the library",
  // 20261005: the week's conversations, once a week, off until turned on.
  community_digest: "The week in Community",
  // 20261011: a new version of Purify, a few times a year. On until turned off.
  release_news: "New versions of Purify",
};

export function isMarketingList(x: unknown): x is MarketingList {
  return typeof x === "string" && (MARKETING_LISTS as readonly string[]).includes(x);
}
