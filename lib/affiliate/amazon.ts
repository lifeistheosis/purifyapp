/**
 * Amazon Associates affiliate-link helpers.
 *
 * The tag lives in NEXT_PUBLIC_AMAZON_AFFILIATE_TAG. When the env var is
 * unset (local/dev or pre-onboarding), links still work — they just route
 * to Amazon without an associate tag attached.
 */

const AMAZON_TAG = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG ?? "";

export function buildAmazonUrl(asin: string): string {
  const base = `https://www.amazon.com/dp/${encodeURIComponent(asin)}`;
  return AMAZON_TAG ? `${base}?tag=${encodeURIComponent(AMAZON_TAG)}` : base;
}

/**
 * Standard Amazon cover image URL derived from a product ASIN. Amazon
 * Associates terms permit display of product images for items linked via
 * an associate tag.
 */
export function getAmazonCoverUrl(asin: string): string {
  return `https://m.media-amazon.com/images/P/${encodeURIComponent(asin)}.jpg`;
}
