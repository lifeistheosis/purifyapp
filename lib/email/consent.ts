import { siteUrl } from "./templates/build";

/**
 * The rules a marketing email must obey before it is allowed out. Pure.
 *
 * Marketing here means Phases 1 and 2 of the funnel, plus the winback: anything
 * whose job is to bring a reader back or sell them something. It may only go to
 * a reader who switched that list on, and it must carry two things by law
 * (CAN-SPAM in the US, and Gmail's and Yahoo's bulk sender rules on top):
 *
 *   - a working unsubscribe, both as a link and as the List-Unsubscribe and
 *     List-Unsubscribe-Post headers that give the one-click button in the
 *     mail client itself;
 *   - a physical postal address.
 *
 * There is no postal address yet. EMAIL_POSTAL_ADDRESS is where it goes, and
 * until it is set every marketing send refuses, on purpose: the other way to
 * handle a missing legal requirement is to send anyway, and that is the one this
 * file exists to prevent. Account and order email is not marketing and is never
 * held by this.
 */

import { LIST_LABEL, type MarketingList } from "./lists";

export { LIST_LABEL, MARKETING_LISTS, isMarketingList, type MarketingList } from "./lists";

export type MarketingRefusal = "no_postal_address" | "no_consent" | "no_token";

/** Why this send may not go, or null when it may. */
export function marketingRefusal(opts: {
  postalAddress: string | null | undefined;
  consented: boolean;
  unsubscribeToken: string | null | undefined;
}): MarketingRefusal | null {
  if (!opts.postalAddress || !opts.postalAddress.trim()) return "no_postal_address";
  if (!opts.consented) return "no_consent";
  if (!opts.unsubscribeToken) return "no_token";
  return null;
}

/** The page a reader lands on from the unsubscribe link. It asks before acting. */
export function unsubscribePageUrl(token: string, list: MarketingList): string {
  return siteUrl(`/email/unsubscribe?t=${encodeURIComponent(token)}&l=${list}`);
}

/**
 * RFC 8058 one-click unsubscribe. The mail client POSTs to this URL with
 * "List-Unsubscribe=One-Click" and no cookies, so the token in the URL is the
 * whole authority, and the route acts on the POST alone. A GET does nothing,
 * because link scanners fetch every URL in a message.
 */
export function unsubscribeHeaders(token: string, list: MarketingList): Record<string, string> {
  const endpoint = siteUrl(`/api/email/unsubscribe?t=${encodeURIComponent(token)}&l=${list}`);
  return {
    "List-Unsubscribe": `<${endpoint}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/** The footer every marketing email carries: why they got it, how to stop, where we are. */
export function marketingFooter(opts: { list: MarketingList; postalAddress: string }): string {
  return `You are getting this because you turned on "${LIST_LABEL[opts.list]}" in your Purify settings. Purify, ${opts.postalAddress.trim()}.`;
}
