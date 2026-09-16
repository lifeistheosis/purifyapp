import { SITE_URL } from "@/lib/site";

import { bigValue, button, dayRow, microLabel, p, signOff, table } from "../blocks";
import { emailLayout } from "../layout";
import { escapeHtml } from "../send";
import { T } from "../theme";

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
  action?: { label: string; href: string };
  /** A labelled value shown large, like a tracking number. Escaped. */
  highlight?: { label: string; value: string };
  footer: string;
  /** Links after the footer text, such as Unsubscribe. Escaped. */
  footerLinks?: { label: string; href: string }[];
  eyebrow?: string;
}): EmailContent {
  const highlight = opts.highlight
    ? microLabel(opts.highlight.label) + bigValue(escapeHtml(opts.highlight.value))
    : "";

  const days = opts.lines?.length ? table(opts.lines.map(dayRow).join("")) : "";

  const bodyHtml =
    opts.paragraphs.map((t) => p(t)).join("") +
    days +
    highlight +
    (opts.after ?? []).map((t) => p(t)).join("") +
    (opts.action ? button(opts.action) : "") +
    signOff(SIGN_OFF);

  const links = opts.footerLinks ?? [];

  const text = [
    ...opts.paragraphs,
    ...(opts.lines ?? []).map((l) => `${l.day}: ${l.name}`),
    ...(opts.highlight ? [`${opts.highlight.label}: ${opts.highlight.value}`] : []),
    ...(opts.after ?? []),
    ...(opts.action ? [`${opts.action.label}: ${opts.action.href}`] : []),
    SIGN_OFF,
    "--",
    opts.footer,
    ...links.map((l) => `${l.label}: ${l.href}`),
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
      bodyHtml,
      eyebrow: opts.eyebrow ?? "Purify",
      footer: footerHtml,
    }),
    text,
  };
}
