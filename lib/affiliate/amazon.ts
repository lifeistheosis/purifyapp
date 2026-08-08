/**
 * Amazon Associates affiliate-link helpers.
 *
 * The tag lives in NEXT_PUBLIC_AMAZON_AFFILIATE_TAG. When the env var is
 * unset (local/dev, or pre-onboarding), links still work: they just route to
 * Amazon with no associate tag attached.
 *
 * Two things are deliberately keyed off whether the tag exists, because both
 * are only true once it does:
 *   * the "Purify earns from qualifying purchases" disclosure, which is an
 *     affirmative claim and was shipping on all 82 saint pages while no tag
 *     existed anywhere, and
 *   * the Amazon-hosted cover image, whose permission the Associates terms
 *     scope to items linked via an associate tag.
 * Untagged is therefore not the neutral resting state, it is the state where
 * neither may render.
 *
 * Set the tag on the WEBSITE ONLY. It must not enter android-apk.yml or
 * ios-release.yml: a tagged commercial link inside a store binary is an Apple
 * guideline 3.1.1 problem that the website does not have.
 */

const AMAZON_TAG = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG ?? "";

/** True once an associate tag is configured for this build. */
export const HAS_AMAZON_TAG: boolean = AMAZON_TAG.length > 0;

export function buildAmazonUrl(asin: string): string {
  const base = `https://www.amazon.com/dp/${encodeURIComponent(asin)}`;
  return AMAZON_TAG ? `${base}?tag=${encodeURIComponent(AMAZON_TAG)}` : base;
}

/**
 * Standard Amazon cover image URL derived from a product ASIN, or null when
 * no associate tag is configured. Amazon Associates terms permit display of
 * product images for items linked via an associate tag, so with no tag there
 * is no permission and the caller falls back to its typographic tile.
 */
export function getAmazonCoverUrl(asin: string): string | null {
  if (!HAS_AMAZON_TAG) return null;
  return `https://m.media-amazon.com/images/P/${encodeURIComponent(asin)}.jpg`;
}
