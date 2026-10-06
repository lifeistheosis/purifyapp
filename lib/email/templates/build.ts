import { SITE_URL } from "@/lib/site";

import { bigValue, button, dayRow, microLabel, p, picture, pointRows, signOff, table } from "../blocks";
import { emailLayout } from "../layout";
import { escapeHtml } from "../send";
import { T } from "../theme";
import { UNSUBSCRIBE_SLOT } from "../unsubscribe";

/**
 * The one way a funnel email is put together: paragraphs, an optional list of
 * days or a highlighted value, an optional button, the sign-off, an HTML part
 * and a plain-text part that say the same thing.
 *
 * Shared by every template module (account, orders, content, shop) so they
 * cannot drift apart in look, in voice or in whether they carry a text part.
 * The blocks come from lib/email/blocks.ts and the colours from
 * lib/email/theme.ts, so a change of reading mode moves every email at once.
 * Pure: the template tests render every email through it.
 */

export type EmailContent = { subject: string; html: string; text: string };

/** A day in the week ahead, for the Sunday email. */
export type EmailDay = { day: string; name: string; kind: "feast" | "saint" };

/**
 * One line of a short list: a mark, a name set without its full stop, a
 * line, and maybe a screenshot of the thing itself, twice as wide as it is
 * drawn.
 */
export type EmailPoint = {
  emoji: string;
  name: string;
  text: string;
  picture?: { src: string; alt: string; width: number; height: number };
};

/**
 * A point as plain text, the way the text part and the preview say it. A
 * picture is said by its alt text, which is all of it some readers get.
 */
export const pointLine = (pt: EmailPoint) =>
  `${pt.emoji} ${pt.name}. ${pt.text}${pt.picture ? ` (${pt.picture.alt})` : ""}`;

export const SIGN_OFF = "Edgar, the Purify Team";

/** An absolute link into the site, for an email that is read anywhere. */
export const siteUrl = (path: string) => `${SITE_URL.replace(/\/$/, "")}${path}`;

/** "August 14, 2026" from a Date, in UTC so a test and a server agree. */
export function longDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function buildEmail(opts: {
  subject: string;
  heading: string;
  paragraphs: string[];
  /** The week's days, listed rather than run together as sentences. */
  lines?: readonly EmailDay[];
  /** Paragraphs after the list or the value, such as the one saint to read. */
  after?: string[];
  /** One line under the heading, in italics. */
  deck?: string;
  /** A picture under the heading, twice as wide as it is drawn. Its alt text is in the text part too. */
  image?: { src: string; alt: string; width: number; height: number };
  /** A short list after the paragraphs, each line with a mark and a name of its own, and maybe a screenshot. */
  points?: EmailPoint[];
  action?: { label: string; href: string };
  /** A labelled value shown large, like a tracking number. Escaped. */
  highlight?: { label: string; value: string };
  footer: string;
  /** Links after the footer text. Escaped. */
  footerLinks?: { label: string; href: string }[];
  /**
   * Where this reader's unsubscribe button leads. A list email knows (it is
   * built for one reader). Everything else leaves it out, and the sender puts
   * the reader's own link in the slot (lib/email/unsubscribe.ts).
   */
  unsubscribeHref?: string;
  eyebrow?: string;
}): EmailContent {
  const highlight = opts.highlight
    ? microLabel(opts.highlight.label) + bigValue(escapeHtml(opts.highlight.value))
    : "";

  const days = opts.lines?.length ? table(opts.lines.map(dayRow).join("")) : "";

  // The letter's own measure is 480px inside its padding. The file is wider,
  // for sharp screens, and is drawn no wider than that. The picture goes
  // where the button goes, so a tap on either lands in the same place.
  const image = opts.image
    ? picture({
        src: opts.image.src,
        alt: opts.image.alt,
        width: Math.min(480, Math.round(opts.image.width / 2)),
        href: opts.action?.href,
      })
    : "";

  const points = opts.points?.length ? pointRows(opts.points) : "";

  const bodyHtml =
    image +
    opts.paragraphs.map((t) => p(t)).join("") +
    days +
    highlight +
    points +
    (opts.after ?? []).map((t) => p(t)).join("") +
    (opts.action ? button(opts.action) : "") +
    signOff(SIGN_OFF);

  const links = opts.footerLinks ?? [];

  const text = [
    ...(opts.deck ? [opts.deck] : []),
    ...(opts.image ? [opts.image.alt] : []),
    ...opts.paragraphs,
    ...(opts.lines ?? []).map((l) => `${l.day}: ${l.name}`),
    ...(opts.highlight ? [`${opts.highlight.label}: ${opts.highlight.value}`] : []),
    ...(opts.points ?? []).map(pointLine),
    ...(opts.after ?? []),
    ...(opts.action ? [`${opts.action.label}: ${opts.action.href}`] : []),
    SIGN_OFF,
    "--",
    opts.footer,
    ...links.map((l) => `${l.label}: ${l.href}`),
    // The button, said in words: a text part has no buttons.
    `Unsubscribe: ${opts.unsubscribeHref ?? UNSUBSCRIBE_SLOT}`,
  ].join("\n\n");

  const footerHtml =
    // The layout does not escape the footer (it passes &middot; through), so
    // plain text is escaped here, and each link is built from escaped parts.
    escapeHtml(opts.footer) +
    links
      .map(
        (l) =>
          ` <a href="${escapeHtml(l.href)}" style="color:${T.muted};text-decoration:underline">${escapeHtml(l.label)}</a>`,
      )
      .join(" &middot;");

  return {
    subject: opts.subject,
    html: emailLayout({
      heading: opts.heading,
      deck: opts.deck,
      bodyHtml,
      eyebrow: opts.eyebrow ?? "Purify",
      footer: footerHtml,
      unsubscribeHref: opts.unsubscribeHref,
    }),
    text,
  };
}
