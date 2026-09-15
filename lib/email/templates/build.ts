import { SITE_URL } from "@/lib/site";

import { emailLayout } from "../layout";
import { escapeHtml } from "../send";

/**
 * The one way a funnel email is put together: paragraphs, an optional button,
 * the sign-off, an HTML part and a plain-text part that say the same thing.
 *
 * Shared by every template module (account, orders, content, shop) so they
 * cannot drift apart in look, in voice or in whether they carry a text part.
 * Pure: the template tests render every email through it.
 */

export type EmailContent = { subject: string; html: string; text: string };

export const SIGN_OFF = "Edgar, the Purify Team";

/** An absolute link into the site, for an email that is read anywhere. */
export const siteUrl = (path: string) => `${SITE_URL.replace(/\/$/, "")}${path}`;

/** "August 14, 2026" from a Date, in UTC so a test and a server agree. */
export function longDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 14px">${escapeHtml(text)}</p>`;
}

function button(label: string, href: string): string {
  return `<p style="margin:20px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#1a1720;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;padding:12px 20px;border-radius:8px">${escapeHtml(label)}</a></p>`;
}

export function buildEmail(opts: {
  subject: string;
  heading: string;
  paragraphs: string[];
  action?: { label: string; href: string };
  /** A labelled value shown large, like a tracking number. Escaped. */
  highlight?: { label: string; value: string };
  footer: string;
  eyebrow?: string;
}): EmailContent {
  const highlight = opts.highlight
    ? `<p style="margin:6px 0 4px;font-family:Arial,sans-serif;font-size:13px;letter-spacing:.5px;text-transform:uppercase;color:#8a8580">${escapeHtml(opts.highlight.label)}</p><p style="margin:0 0 18px;font-family:Arial,sans-serif;font-size:18px;font-weight:bold;letter-spacing:.5px;color:#1a1720">${escapeHtml(opts.highlight.value)}</p>`
    : "";

  const bodyHtml =
    opts.paragraphs.map(paragraph).join("") +
    highlight +
    (opts.action ? button(opts.action.label, opts.action.href) : "") +
    `<p style="margin:18px 0 0;color:#6a6570">${escapeHtml(SIGN_OFF)}</p>`;

  const text = [
    ...opts.paragraphs,
    ...(opts.highlight ? [`${opts.highlight.label}: ${opts.highlight.value}`] : []),
    ...(opts.action ? [`${opts.action.label}: ${opts.action.href}`] : []),
    SIGN_OFF,
  ].join("\n\n");

  return {
    subject: opts.subject,
    html: emailLayout({
      heading: opts.heading,
      bodyHtml,
      eyebrow: opts.eyebrow ?? "Purify",
      // The layout does not escape the footer (it passes &middot; through),
      // so plain text is escaped here.
      footer: escapeHtml(opts.footer),
    }),
    text,
  };
}
