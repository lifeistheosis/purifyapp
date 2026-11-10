/**
 * Amazon Associates affiliate-link helpers.
 *
 * The tag lives in NEXT_PUBLIC_AMAZON_AFFILIATE_TAG. When the env var is
 * unset (local/dev, or pre-onboarding), links still work: they just route to
 * Amazon with no associate tag attached.
 *
 * The "Purify earns from qualifying purchases" disclosure is keyed off
 * whether the tag exists, because it is an affirmative claim and was
 * shipping on all 82 saint pages while no tag existed anywhere. Untagged is
 * therefore not the neutral resting state, it is the state where it may not
 * render.
 *
 * Amazon is reached only when a reader taps a link. No page shows Amazon's
 * cover pictures any more (143, the owner's word of 2026-11-10): each one was
 * loaded from m.media-amazon.com, so opening a saint's Writings made a
 * reader's device call Amazon, which the privacy page does not say and an
 * enforced content policy would block. Amazon's terms do not let us copy the
 * pictures either, so a book in print shows our own cover or the plate
 * (components/saints/LicensedWorksSection.tsx), and
 * lib/ui/__tests__/noThirdPartyLoads.test.ts holds every page to it.
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
