import type { SendResult } from "./send";

/**
 * Send an email at most once per dedupe key.
 *
 * Everything the funnel adds is triggered by something that can fire twice: a
 * Stripe or RevenueCat webhook retried after a slow response, a daily job that
 * overlaps yesterday's, an owner double-clicking Run now. A second "your
 * payment failed" is worse than none. So the order is fixed:
 *
 *   1. CLAIM the key in the ledger (email_sends). If someone already sent it,
 *      or is sending it right now, stop: that is a duplicate, not an error.
 *   2. SEND.
 *   3. FINISH the row with what happened.
 *
 * Claim before send, never after, because "send then record" has a window in
 * which two runs both send. A claim that cannot be made because the ledger is
 * missing (email_sends not applied yet) does NOT fall through to a send: with no
 * lock there is no promise of once, and this function exists to keep that
 * promise. It reports "unavailable" instead.
 *
 * Pure apart from the two things it is handed, so the rules above are tested
 * with an in-memory ledger in lib/email/__tests__/sendOnce.test.ts.
 */

export type OnceMessage = {
  /** e.g. "payment_failed:<user>:<period>". The whole promise hangs on this. */
  dedupeKey: string;
  /** A short label for the log: "payment_failed", "welcome", "terms_changed". */
  kind: string;
  userId: string | null;
  to: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
  replyTo?: string;
};

export type ClaimResult = "claimed" | "duplicate";

export type LedgerOutcome = { status: "sent" | "skipped" | "failed"; error?: string };

export interface EmailLedger {
  /**
   * Take the key. "claimed" when this caller may send: a new row, or a row
   * whose earlier attempt failed or was skipped. "duplicate" when the key is
   * already sent or pending. Throws when the ledger itself cannot be reached.
   */
  claim(row: {
    dedupeKey: string;
    kind: string;
    userId: string | null;
    email: string;
    subject: string;
  }): Promise<ClaimResult>;
  finish(dedupeKey: string, outcome: LedgerOutcome): Promise<void>;
}

export type Sender = (opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
  replyTo?: string;
}) => Promise<SendResult>;

export type SendOnceResult =
  | { status: "sent" }
  | { status: "skipped" }
  | { status: "failed"; error: string; code?: string }
  | { status: "duplicate" }
  | { status: "unavailable"; error: string };

export async function sendOnce(
  deps: { ledger: EmailLedger; send: Sender },
  msg: OnceMessage,
): Promise<SendOnceResult> {
  let claim: ClaimResult;
  try {
    claim = await deps.ledger.claim({
      dedupeKey: msg.dedupeKey,
      kind: msg.kind,
      userId: msg.userId,
      email: msg.to,
      subject: msg.subject,
    });
  } catch (e) {
    return { status: "unavailable", error: (e as Error).message };
  }
  if (claim === "duplicate") return { status: "duplicate" };

  const result = await deps.send({
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    headers: msg.headers,
    replyTo: msg.replyTo,
  });

  const outcome: LedgerOutcome = result.ok
    ? { status: "sent" }
    : result.skipped
      ? { status: "skipped" }
      : { status: "failed", error: result.error ?? "unknown send failure" };

  try {
    await deps.ledger.finish(msg.dedupeKey, outcome);
  } catch (e) {
    // The email's fate is already decided. A row left 'pending' still blocks a
    // second copy, which is the safe way for this to go wrong.
    console.warn(`[email] could not record ${msg.dedupeKey}: ${(e as Error).message}`);
  }

  if (outcome.status === "failed") {
    return { status: "failed", error: outcome.error ?? "", ...(result.code ? { code: result.code } : {}) };
  }
  return { status: outcome.status };
}
