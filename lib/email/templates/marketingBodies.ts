import { siteUrl } from "./build";

/**
 * The words of Purify's marketing email: everything whose job is to bring a
 * reader back or show them something new. Only the words live here. The
 * footer, the unsubscribe link, the one-click headers and the postal address
 * are added per reader by lib/email/marketing.ts, which is the only thing that
 * sends these, and only to readers who switched the list on.
 */

export type MarketingBody = {
  subject: string;
  heading: string;
  paragraphs: string[];
  action?: { label: string; href: string };
};

/**
 * "A month on". One email, thirty days after a membership ends, never a
 * second.
 *
 * It was account mail in the first cut. It is not: its purpose is to bring a
 * member back, which is the "come back" email the privacy page promised Purify
 * does not send, so it is marketing, sent only to readers who turned on the
 * library list. The board says tie it to the EIKON Box, the concrete thing a
 * member loses, and that is only true for Pro, which is what the box comes
 * with.
 */
export function winbackBody(opts: { wasPro: boolean }): MarketingBody {
  return {
    subject: "A month on from your Purify membership",
    heading: "A month on",
    paragraphs: opts.wasPro
      ? [
          "It has been a month since your Purify membership ended.",
          "This month's EIKON Box went out to members, and next month's will too. If you would like to be one of them again, your account page has the way back.",
          "Either way, the library is yours, and it stays free.",
        ]
      : [
          "It has been a month since your Purify Plus membership ended.",
          "If you would like it back, your account page has the way. Either way, the library is yours, and it stays free.",
        ],
    action: { label: "Your account", href: siteUrl("/account") },
  };
}
