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

/**
 * Where the company is written to, as the privacy page gives it: the support
 * inbox, which is also the Reply-To on every email Purify sends
 * (DEFAULT_REPLY_TO in lib/email/send.ts).
 */
export const LEGAL_CONTACT_EMAIL = "support@purifyapp.net";
