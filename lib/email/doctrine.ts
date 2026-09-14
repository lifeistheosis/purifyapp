import { checkPhrasing, type DoctrineViolation } from "@/lib/push/doctrine";

/**
 * What an email from Purify is allowed to say.
 *
 * The same bar as a notification, minus the parts that belong to a lock screen.
 * lib/push/doctrine.ts explains the bar; this file only says how email differs:
 *
 *  - DIGITS ARE ALLOWED. A receipt needs an order number and a price, and a
 *    tracking email needs a tracking number. The push rule bans every digit
 *    because no notification needs one; that is not true of mail.
 *  - NO LENGTH LIMITS. An inbox does not truncate at 60 characters.
 *  - EVERYTHING ELSE HOLDS: no exclamation marks, no urgency ("expires",
 *    "last chance", "hurry"), no pressure mechanics ("streak", "you haven't"),
 *    no praise. The board's own Phase 1 says browse abandonment, countdowns and
 *    fake scarcity "would read as cheap next to the devotional goods", and this
 *    is where that sentence is enforced rather than remembered.
 *  - NO EM DASHES, the standing rule on anything a reader sees.
 *
 * Pure. The copy test runs it over every subject and body a template can
 * produce, and a marketing send route can refuse on it.
 */
export function checkEmailCopy(copy: { subject: string; body: string }): DoctrineViolation[] {
  const out: DoctrineViolation[] = [];
  const visible = `${copy.subject} ${copy.body}`;

  if (!copy.subject.trim()) {
    out.push({ clause: "subject required", reason: "the subject is empty." });
  }

  const dash = /—/.exec(visible);
  if (dash) {
    out.push({
      clause: "no em dashes",
      reason: "contains an em dash. Use a comma, a colon or a full stop.",
    });
  }

  out.push(...checkPhrasing(visible));
  return out;
}

export function isEmailDoctrinal(copy: { subject: string; body: string }): boolean {
  return checkEmailCopy(copy).length === 0;
}
