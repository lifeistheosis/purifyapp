import { LEGAL_EMAIL, SUPPORT_EMAIL } from "@/lib/legal/entity";

/**
 * Purify's two inboxes, and how a message to the legal one is told apart in
 * Messages (his word of 2026-11-10: support@ for technical help, legal@ for
 * legal matters).
 *
 * Mail to either reaches the Resend webhook (app/api/email/resend-webhook).
 * Before 1.9 it kept only mail to support@, so anything sent to legal@ would
 * have been received by Resend and then dropped without a word.
 *
 * NO NEW COLUMN. A legal request is a support request whose subject starts
 * with "Legal: ". support_tickets has no column for it, and a mark in the
 * subject needs no migration: it shows in the list, in the thread, in the
 * notice the admin is sent and in the subject of every reply, so the request
 * keeps its kind wherever it is read. requestKind (lib/admin/support.ts) reads
 * it before anything else, so a copyright notice that names an order is still
 * a legal matter, not an order.
 *
 * Pure, so the admin's own screens can use it: tested in
 * lib/support/__tests__/inbox.test.ts.
 */

export type Inbox = "support" | "legal";

/** What a legal request's subject starts with. */
export const LEGAL_MARK = "Legal: ";

/** The longest subject a request keeps (the same 200 the webhook and the forms use). */
const SUBJECT_MAX = 200;

/** The address itself, out of "Name <a@b.c>", trimmed and in lower case. */
function bare(address: string): string {
  const m = /<([^>]+)>/.exec(address);
  return (m ? m[1] : address).trim().toLowerCase();
}

/**
 * Which of Purify's inboxes a message was sent to, or null for neither. A
 * message sent to both is a legal one: the legal inbox is the one with
 * deadlines in it.
 */
export function inboxOf(recipients: readonly string[]): Inbox | null {
  const to = recipients.map(bare);
  if (to.includes(LEGAL_EMAIL)) return "legal";
  if (to.includes(SUPPORT_EMAIL)) return "support";
  return null;
}

/** Whether a request's subject marks it as a legal matter. */
export function isLegalSubject(subject: string): boolean {
  return subject.trimStart().toLowerCase().startsWith(LEGAL_MARK.toLowerCase());
}

/** A legal request's subject: marked once, and no longer than any other. */
export function legalSubject(subject: string): string {
  const s = subject.trim() || "(no subject)";
  return (isLegalSubject(s) ? s : `${LEGAL_MARK}${s}`).slice(0, SUBJECT_MAX);
}
