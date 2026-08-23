/**
 * What a notification from Purify is allowed to say.
 *
 * WHY THIS FILE EXISTS. CONTRIBUTING.md has claimed since 2026-08-10 that the
 * copy rule is "enforced by a doctrine test, not by review alone". That was an
 * overclaim. The test it referred to covered ONE of five payloads and asserted
 * three things, and the admin broadcast route validated nothing but string
 * length, which means the one sender that can say anything at all was the one
 * sender nothing checked. This file makes the sentence true.
 *
 * WHAT IT CAN AND CANNOT DO, said plainly so nobody trusts it further than it
 * deserves. The word lists below are defeatable by anyone who wants to defeat
 * them: "don't miss" becomes "worth catching" and the check passes. That is
 * fine, because a determined author is not the threat. The threat is a tired
 * one at 11pm who writes "Only 2 days left!" without thinking, and that is
 * caught here.
 *
 * The half that IS robust is structural and lives elsewhere: lib/push/copy.ts
 * holds every string, and the scheduled payload builders take no caller text
 * at all. A rule enforced by a regex is a suggestion. A rule enforced by there
 * being nowhere to type is a rule.
 *
 * Pure, dependency-free, and importable from a zod refinement, a test, and a
 * script alike. Do not add IO here.
 */

export type DoctrineViolation = {
  /** The clause breached, named so an author can look it up. */
  clause: string;
  /** What was found, quoted, so the fix is obvious without a second guess. */
  reason: string;
};

/**
 * Words that put a clock on the reader.
 *
 * Every one of these has been in a growth team's notification at some point,
 * which is exactly why they are here. The list is deliberately about URGENCY
 * and not about tone: "gentle" and "quiet" are fine words that happen to be
 * used by bad notifications, and banning them would ban the good ones too.
 */
const URGENCY = [
  "act now",
  "almost gone",
  "don't miss",
  "dont miss",
  "ending soon",
  "expires",
  "final chance",
  "hurry",
  "last chance",
  "limited time",
  "only today",
  "running out",
  "still time",
  "today only",
  "while you can",
];

/**
 * Words that measure the reader, or that make the notification itself the
 * thing being kept up with.
 *
 * "waiting" earns its place from a real string that shipped: the campaign
 * reminder read "Someone is waiting on your prayers today", which turns not
 * opening an app into a failure toward a person.
 */
const PRESSURE = [
  "badge",
  "behind",
  "catch up",
  "don't lose",
  "dont lose",
  "keep it going",
  "keep your",
  "milestone",
  "streak",
  "unread",
  "waiting for you",
  "waiting on you",
  "you haven't",
  "you havent",
  "your record",
];

/** Praise. The application does not congratulate anyone. */
const PRAISE = ["amazing", "congratulations", "great job", "impressive", "well done"];

/** A lock screen truncates. Past these the sentence is read by nobody. */
export const MAX_TITLE = 60;
export const MAX_BODY = 120;

function findPhrase(haystack: string, needles: readonly string[]): string | null {
  const lower = haystack.toLowerCase();
  for (const n of needles) if (lower.includes(n)) return n;
  return null;
}

/**
 * Check one notification's visible text against the bar.
 *
 * Returns every violation rather than the first, because an author fixing one
 * word at a time through four round trips gives up and writes something worse.
 */
export function checkNotificationCopy(copy: {
  title: string;
  body: string;
}): DoctrineViolation[] {
  const out: DoctrineViolation[] = [];
  const { title, body } = copy;
  const visible = `${title} ${body}`;

  // Digits. A count, a countdown, a day number and a price are all digits, and
  // there is no notification Purify sends that needs one. Written as a
  // deliberate blanket rather than a list of forbidden numbers, because the
  // blanket is the part that cannot be argued around at 11pm.
  const digit = /\d/.exec(visible);
  if (digit) {
    out.push({
      clause: "no digits",
      reason: `contains the digit "${digit[0]}". A notification that counts anything is counting the reader.`,
    });
  }

  // Exclamation marks, including the fullwidth and inverted forms, because a
  // copy rule that a keyboard layout can step around is not a rule.
  const bang = /[!！¡]/.exec(visible);
  if (bang) {
    out.push({
      clause: "no exclamation marks",
      reason: `contains "${bang[0]}". The application does not raise its voice.`,
    });
  }

  const urgent = findPhrase(visible, URGENCY);
  if (urgent) {
    out.push({
      clause: "no urgency",
      reason: `contains "${urgent}". The calendar supplies real urgency, a fast beginning on Monday. Nothing else may manufacture it.`,
    });
  }

  const pressure = findPhrase(visible, PRESSURE);
  if (pressure) {
    out.push({
      clause: "no pressure mechanics",
      reason: `contains "${pressure}". The talanton is struck and the community comes. It does not report on who came last time.`,
    });
  }

  const praise = findPhrase(visible, PRAISE);
  if (praise) {
    out.push({
      clause: "no praise",
      reason: `contains "${praise}". The application does not congratulate the reader.`,
    });
  }

  if (title.trim().length === 0) {
    out.push({ clause: "title required", reason: "the title is empty." });
  }
  if (title.length > MAX_TITLE) {
    out.push({
      clause: "title length",
      reason: `${title.length} characters, over the ${MAX_TITLE} a lock screen shows. The tail is read by nobody and can change the meaning of what is read.`,
    });
  }
  if (body.length > MAX_BODY) {
    out.push({
      clause: "body length",
      reason: `${body.length} characters, over the ${MAX_BODY} a lock screen shows.`,
    });
  }

  return out;
}

/** True when the copy may be sent. Convenience over the array. */
export function isDoctrinal(copy: { title: string; body: string }): boolean {
  return checkNotificationCopy(copy).length === 0;
}

/** One line per violation, for an error body an author will actually read. */
export function explainViolations(violations: readonly DoctrineViolation[]): string {
  return violations.map((v) => `${v.clause}: ${v.reason}`).join(" ");
}
