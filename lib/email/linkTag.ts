import { SITE_URL } from "@/lib/site";
import { emailTag, withTag } from "@/lib/analytics/tag";

import { mailingKeyOf } from "./mailings";

/**
 * Every link to the site in an email says which email it was in
 * (lib/analytics/tag.ts says why: a click from a mail app arrives with no
 * referrer, and the owner asked that a visit from an email be called one).
 *
 * Done here, once, on the finished email, because there is no one helper every
 * link passes through: templates build theirs with siteUrl(), a few senders
 * join SITE_URL by hand, and one writes a raw anchor. Whatever built the
 * email, its links to purifyapp.net leave tagged, in the HTML and in the
 * plain-text part, which repeats every address.
 *
 * What is left alone:
 *   - a link to anywhere else (a carrier, a store, Stripe);
 *   - the unsubscribe page and every /api/ address: the reader's own token is
 *     in those, and one click on one must do exactly what it did before;
 *   - the admin and owner panels, which are staff mail and are not counted
 *     as visits at all;
 *   - a picture's address (only `href` is read, never `src`).
 *
 * The tag names the mailing and nothing about the reader (emailTag).
 */

const LEFT_ALONE = [/^\/email\/unsubscribe(\/|$)/, /^\/api\//, /^\/admin(\/|$)/, /^\/owner(\/|$)/];

function siteOrigin(): string | null {
  try {
    return new URL(SITE_URL).origin;
  } catch {
    return null;
  }
}

/** One address: tagged when it is a page of ours that is counted as a visit, untouched otherwise. */
export function tagSiteLink(href: string, tag: string, origin: string | null = siteOrigin()): string {
  if (!origin) return href;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return href;
  }
  if (url.origin !== origin) return href;
  if (LEFT_ALONE.some((rule) => rule.test(url.pathname))) return href;
  return withTag(href, tag);
}

/** The finished email with its links to the site tagged. */
export function tagEmailLinks<T extends { html: string; text?: string }>(mail: T, tag: string, origin: string | null = siteOrigin()): T {
  if (!origin) return mail;
  const html = mail.html.replace(/href="([^"]*)"/g, (whole, value: string) => {
    // escapeHtml wrote the attribute, so an "&" in it is "&amp;". An address
    // carrying any other entity is left exactly as it is.
    if (/&(?!amp;)/.test(value)) return whole;
    const plain = value.replace(/&amp;/g, "&");
    const tagged = tagSiteLink(plain, tag, origin);
    return tagged === plain ? whole : `href="${tagged.replace(/&/g, "&amp;")}"`;
  });
  if (typeof mail.text !== "string") return { ...mail, html };
  // An address in the text part ends at white space. A full stop or a comma
  // after it is the sentence's, not the address's.
  const text = mail.text.replace(/https?:\/\/[^\s<>"]+/g, (found) => {
    const tail = found.match(/[.,;:!?)\]]+$/)?.[0] ?? "";
    const address = tail ? found.slice(0, -tail.length) : found;
    return `${tagSiteLink(address, tag, origin)}${tail}`;
  });
  return { ...mail, html, text };
}

/** The tag for one send, from what the send log knows about it. */
export function tagForSend(send: { kind: string; dedupeKey?: string | null; userId?: string | null }): string {
  const mailing = send.dedupeKey
    ? mailingKeyOf({ dedupe_key: send.dedupeKey, user_id: send.userId ?? null, kind: send.kind })
    : send.kind;
  return emailTag(send.kind, mailing);
}
