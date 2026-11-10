/**
 * The company that runs Purify, in one place.
 *
 * His word of 2026-11-10: "include the company name and like all the privacy
 * and term stuff in the terms. So it switches from [my] personal info ... over
 * to Purify Orthodox LLC". He is confirming the exact form from the EIN letter
 * (a comma before "LLC", for one): change LEGAL_NAME here and the terms, the
 * privacy page (English and German), the footer's copyright line and the list
 * emails' legal footer all follow. Legal text: every change to it waits for his
 * OK before a release.
 *
 * The year is in the copyright line and nowhere else. The name is a legal name
 * and is never translated, so the same line shows in all 21 languages.
 */

export const LEGAL_NAME = "Purify Orthodox LLC";

/** The footer's copyright line. */
export const COPYRIGHT_LINE = `© 2026 ${LEGAL_NAME}`;

/*
 * Purify's two addresses, by his word of 2026-11-10: "Support at
 * [purifyapp.net] for technical support, but for legal issues, it's legal at
 * [purifyapp.net]." He has written to both and seen them arrive.
 *
 * Every address a reader is shown comes from here, and no other address is
 * written anywhere in app/, components/ or lib/ (lib/legal/__tests__/
 * contacts.test.ts holds that). The one exception is lib/dev/developer.ts,
 * which names his own account to keep it out of the counts, never to be
 * written to.
 *
 * Both arrive the same way: the domain's mail goes to Resend, and its webhook
 * (app/api/email/resend-webhook) turns each message into a request in the
 * admin's Messages. A message to the legal inbox is marked Legal there
 * (lib/support/inbox.ts).
 */

/**
 * Technical help: the FAQ, the help and contact lines, the shop's questions,
 * receipts and packing slips, and the Reply-To on every email Purify sends
 * (DEFAULT_REPLY_TO in lib/email/send.ts).
 */
export const SUPPORT_EMAIL = "support@purifyapp.net";

/**
 * Legal matters: the terms' notices, informal disputes and arbitration
 * opt-outs, copyright notices, and the privacy page's lines for privacy and
 * legal requests, the company's own address among them.
 */
export const LEGAL_EMAIL = "legal@purifyapp.net";
