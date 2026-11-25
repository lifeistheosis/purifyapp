/**
 * The name a reader sees as the sender, by what the email is (his word,
 * 2026-11-24: "let's make distinctions then. Purify • Legal, Purify •
 * Support, Purify • Shop"). The address is always EMAIL_FROM's own, a
 * purifyapp.net address Resend has verified; only the name in front of it
 * changes. Everything that is not legal, support or the shop is "Purify".
 *
 * Pure. Used by lib/email/send.ts; tested in lib/email/__tests__/sender.test.ts.
 */

export type SenderLabel = "Purify • Legal" | "Purify • Support" | "Purify • Shop" | "Purify";

/** The sender name for an email's kind (the kind its log row carries). */
export function senderLabel(kind: string | null | undefined): SenderLabel {
  const k = (kind ?? "").toLowerCase();
  if (/^(terms|privacy|legal|acceptance)/.test(k)) return "Purify • Legal";
  if (/^(ticket|support)/.test(k)) return "Purify • Support";
  if (/^(order|seller|eikon|cart|shop|review_ask|care_guide|claim|set_bundle|multi_buy|refund|tracking)/.test(k)) return "Purify • Shop";
  return "Purify";
}

/** The bare address inside EMAIL_FROM ("Name <a@b>" or "a@b"), or null. */
export function senderAddress(emailFrom: string | null | undefined): string | null {
  const raw = (emailFrom ?? "").trim();
  if (!raw) return null;
  const m = /<([^<>\s]+@[^<>\s]+)>/.exec(raw);
  if (m) return m[1];
  return /^[^<>\s]+@[^<>\s]+$/.test(raw) ? raw : null;
}

/** The From header for this kind, on EMAIL_FROM's address; null when there is no address. */
export function fromFor(emailFrom: string | null | undefined, kind: string | null | undefined, ascii = false): string | null {
  const address = senderAddress(emailFrom);
  if (!address) return null;
  const label = senderLabel(kind);
  return `${ascii ? label.replace(" • ", " - ") : label} <${address}>`;
}
