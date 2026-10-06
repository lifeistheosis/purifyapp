/**
 * Apple's hidden address, and why bulk mail waits for it.
 *
 * A reader who signs in with Apple may choose "Hide My Email". The account
 * then holds an address at privaterelay.appleid.com, and Apple forwards to the
 * reader only from senders the app's owner has registered with it (Apple
 * Developer, "Sign in with Apple for Email Communication"). From anyone else
 * Apple refuses the mail.
 *
 * Found 2026-10-06 in Resend, the day the 1.5 release email went. Every
 * bounce on the first page of bounces was one of these, each marked
 * "Unauthorized Sender to Apple Private Relay: The email couldn't be
 * delivered because of a misconfiguration within your Apple Developer
 * Portal". 233 of 2,339 accounts held such an address. 80 of the first 1,571
 * sends had bounced on it, and 153 of the 768 still owed would have: one in
 * five of what was left.
 *
 * So until Apple accepts our mail, bulk mail does not try. Those readers stay
 * owed, the send says how many are waiting, and once the sender is registered
 * with Apple and EMAIL_APPLE_RELAY=ready is set, the next run sends to them,
 * as long as the email is still inside its window (lib/email/jobs.ts).
 *
 * Mail a reader is waiting on (a receipt, a reply, an account notice sent one
 * at a time) is still tried. Holding a receipt back helps nobody, and the day
 * Apple is set up it starts arriving.
 *
 * Env:
 *   EMAIL_APPLE_RELAY  "ready" once the sending domain and address are
 *                      registered with Apple. Anything else holds.
 */

type Env = Record<string, string | undefined>;

export function isAppleRelay(email: string | null | undefined): boolean {
  return /@privaterelay\.appleid\.com$/i.test((email ?? "").trim());
}

export function appleRelayReady(env: Env = process.env): boolean {
  return (env.EMAIL_APPLE_RELAY ?? "").trim().toLowerCase() === "ready";
}

/** The ids a bulk send must not try yet: every hidden address, or nobody once Apple is ready. */
export function heldForApple<T extends { id: string; email: string }>(people: readonly T[], env: Env = process.env): Set<string> {
  if (appleRelayReady(env)) return new Set();
  return new Set(people.filter((p) => isAppleRelay(p.email)).map((p) => p.id));
}

/**
 * Of the readers still owed a mailing, who a batch must leave out for now and
 * why: at one of Apple's hidden addresses, or resting under another rule (the
 * one-library-email-a-week rule). A reader who is both is counted as waiting
 * on Apple, which is the wait that does not end by itself.
 */
export function waitingAmong<T extends { id: string; email: string }>(
  owed: readonly T[],
  resting: ReadonlySet<string> | undefined,
  env: Env = process.env,
): { leaveOut: Set<string>; onApple: number; resting: number } {
  const apple = heldForApple(owed, env);
  const rest = owed.filter((p) => !apple.has(p.id) && resting?.has(p.id));
  return { leaveOut: new Set([...apple, ...rest.map((p) => p.id)]), onApple: apple.size, resting: rest.length };
}

/** The line a send shows while some of its readers are waiting on Apple. */
export function appleWaitLine(count: number): string | null {
  if (count <= 0) return null;
  return `${count} use Apple's hidden address and wait until Apple accepts our mail.`;
}
