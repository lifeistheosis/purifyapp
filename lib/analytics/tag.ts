/**
 * The link tag: a short word on the end of a link of ours that says which
 * email or post the link was in.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 *
 * A reader who taps a link in Apple Mail, in most phone mail apps, in a text
 * or in a chat app arrives with no referrer, exactly like one who typed the
 * address. On 2026-10-06 the 1.5 release email went to 2,186 accounts and the
 * Sources panel, read from referrers alone, showed no visit from an email
 * that day (lib/analytics/source.ts). The owner had asked for exactly that:
 * "if they're coming from emails, it should say they're coming from emails."
 * So our own links say where they were, in the address:
 *
 *   https://purifyapp.net/whats-new?via=email-release-1.5
 *
 * ── What it is, and what it is not ──────────────────────────────────────
 *
 * It names a mailing or a post: "email-release-1.5", "email-welcome",
 * "tiktok-bio". It is the same word for every reader who gets that email. It
 * never holds an account, a reader's id, an address or an order, and
 * emailTag() below is written so that it cannot. A tag that named a person
 * would join the anonymous session to an account, which the privacy page says
 * is never done.
 *
 * ── How it is kept ──────────────────────────────────────────────────────
 *
 * The page reads it once, hands it to /api/track with the first page view,
 * and takes it off the address in the browser, so a link copied from the
 * address bar does not carry it on to somebody else's visit. The session row
 * keeps it in the referrer's place, written as an address no browser ever
 * sends ("purify-link://email-release-1.5"), so every reader of that column
 * can tell a tag from a referrer and no new column is needed.
 *
 * The owner can tag any link he posts the same way: add ?via=tiktok-bio and
 * the Sources panel names it.
 *
 * `ref` is not used: it belongs to ambassador links (proxy.ts). `from` is not
 * used either: the shop's cancelled-checkout page already reads it.
 */

/** The query parameter. */
export const TAG_PARAM = "via";

/** How a tag is written in the referrer's place. Not a scheme any browser sends. */
export const TAG_SCHEME = "purify-link";

/** Lower-case letters, digits, dot, dash and underscore; 1 to 40; begins and ends on a letter or digit. */
const TAG = /^[a-z0-9](?:[a-z0-9._-]{0,38}[a-z0-9])?$/;

/** A tag as it may be kept, or null. Anything else is dropped, never repaired into something it was not. */
export function cleanTag(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const tag = raw.trim().toLowerCase();
  return TAG.test(tag) ? tag : null;
}

/** The tag on an address's query string, e.g. location.search. */
export function tagFromSearch(search: string | null | undefined): string | null {
  if (!search) return null;
  try {
    return cleanTag(new URLSearchParams(search).get(TAG_PARAM));
  } catch {
    return null;
  }
}

/** The same address with the tag taken off, everything else and the hash kept. Relative: path, query, hash. */
export function withoutTag(href: string): string {
  try {
    const url = new URL(href, "https://purifyapp.net");
    url.searchParams.delete(TAG_PARAM);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

/** The address with the tag put on, replacing one that was there, the hash kept at the end. */
export function withTag(href: string, tag: string): string {
  const clean = cleanTag(tag);
  if (!clean) return href;
  try {
    const url = new URL(href);
    url.searchParams.set(TAG_PARAM, clean);
    return url.toString();
  } catch {
    return href;
  }
}

/** A tag as the session row keeps it. */
export function storedTag(tag: string): string {
  return `${TAG_SCHEME}://${tag}`;
}

/** The tag a stored referrer holds, or null when it is an ordinary referrer. */
export function tagOfStored(referrer: string | null | undefined): string | null {
  const prefix = `${TAG_SCHEME}://`;
  if (!referrer || !referrer.startsWith(prefix)) return null;
  return cleanTag(referrer.slice(prefix.length).replace(/\/+$/, ""));
}

/**
 * Mailings that are one email to many readers, named with their period: the
 * 1.5 release, the week's calendar. Every other email is named by its kind
 * alone, because what follows the kind in its key can be about one reader
 * (their patron saint's day, their order, the box they claimed).
 */
const NAMED_WITH_PERIOD = new Set(["release", "weekly", "monthly", "shop_new", "shop_feast", "terms", "terms_changed"]);

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * The tag for the links of one email: "email-release-1.5", "email-welcome".
 *
 * `mailing` is the mailing's key as the send log names it (lib/email/mailings.ts,
 * "release:1.5"). It is used only for the kinds above. A reader's id never
 * reaches here: mailingKeyOf has already taken it off, and a kind outside the
 * list is named by the kind alone whatever its key holds.
 */
export function emailTag(kind: string, mailing?: string | null): string {
  const [head, period] = (mailing ?? "").split(":");
  // A period is "1.5", "2026-W38", "2026-08-14", "nativity-2026". Anything
  // shaped like an id is not a period, and is left out.
  const isPeriod = !!period && period.length <= 24 && !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(period);
  const named = NAMED_WITH_PERIOD.has(kind) && NAMED_WITH_PERIOD.has(head) && isPeriod ? `${head}-${period}` : kind;
  const tag = `email-${slug(named)}`.slice(0, 40).replace(/[^a-z0-9]+$/, "");
  return cleanTag(tag) ?? "email";
}
