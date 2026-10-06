import { SITE_URL } from "@/lib/site";

/**
 * The unsubscribe button's address, for an email built before anyone knew who
 * it was for.
 *
 * Every email ends on an Unsubscribe button (lib/email/layout.ts). A list
 * email is built for one reader and already knows their link. A receipt, a
 * welcome or a notice is built from a template that has never heard of the
 * reader, so it carries a slot where the link goes, and the sender fills it:
 *
 *   - lib/email/ledger.ts knows whose email it is, and puts in that reader's
 *     own link, which works with no sign-in;
 *   - lib/email/send.ts is the last thing before Resend, and fills whatever is
 *     still open with the page itself, so no email can leave with the slot
 *     showing, whoever built it and however it was sent.
 *
 * WHAT THE BUTTON DOES ON MAIL THAT CANNOT BE STOPPED. A receipt, a notice
 * about a membership and a change to the terms are part of having an account,
 * and the page says so. From such an email the button turns off everything
 * that can be turned off (the lists and the release news) and names what will
 * still arrive, so it never promises more than it does.
 *
 * No imports from the rest of lib/email, on purpose: send.ts reads this, and
 * anything that reaches back to it would be a circle.
 */

/** Where a reader's own unsubscribe link goes. Not a URL, so a missed fill is caught and never opened. */
export const UNSUBSCRIBE_SLOT = "%%PURIFY_UNSUBSCRIBE%%";

/** The page with nobody's token: it says how to choose what email arrives. */
export const UNSUBSCRIBE_PAGE = `${SITE_URL.replace(/\/$/, "")}/email/unsubscribe`;

/** A reader's own link. With no list named, the page offers to stop everything that can be stopped. */
export function unsubscribeUrl(token: string | null | undefined, list?: string): string {
  if (!token) return UNSUBSCRIBE_PAGE;
  return `${UNSUBSCRIBE_PAGE}?t=${encodeURIComponent(token)}${list ? `&l=${encodeURIComponent(list)}` : ""}`;
}

export function hasUnsubscribeSlot(mail: { html: string; text?: string }): boolean {
  return mail.html.includes(UNSUBSCRIBE_SLOT) || Boolean(mail.text?.includes(UNSUBSCRIBE_SLOT));
}

/**
 * Puts a link in every open slot of an email. In the HTML the address sits
 * inside an attribute, so its ampersands are written as entities there; the
 * text part takes it as it is.
 */
export function fillUnsubscribe<T extends { html: string; text?: string }>(mail: T, url: string): T {
  if (!hasUnsubscribeSlot(mail)) return mail;
  return {
    ...mail,
    html: mail.html.split(UNSUBSCRIBE_SLOT).join(url.replace(/&/g, "&amp;")),
    ...(mail.text !== undefined ? { text: mail.text.split(UNSUBSCRIBE_SLOT).join(url) } : {}),
  };
}
