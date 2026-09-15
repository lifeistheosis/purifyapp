import "server-only";

/**
 * Transactional email via Resend. The whole surface degrades to a logged
 * no-op when RESEND_API_KEY is unset, so the app never crashes without email
 * configured (same discipline as Stripe checkout in lib/shop/flags.ts).
 *
 * Env:
 *   RESEND_API_KEY  - server-only Resend key (re_...). Absent = email off.
 *   EMAIL_FROM      - From header, e.g. "Purify <hello@purifyapp.net>". It must
 *                     be on a domain verified in Resend (purifyapp.net is, as
 *                     of 2026-09-15): Resend refuses any other From, a Gmail
 *                     address included. Unset falls back to Resend's shared
 *                     test sender.
 *   EMAIL_REPLY_TO  - optional Reply-To (defaults to lifeistheosis@gmail.com).
 */

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export type SendResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  /** Resend's error name, e.g. "daily_quota_exceeded", when Resend refused. */
  code?: string;
};

/**
 * Resend's two kinds of "not now".
 *
 * rate_limit_exceeded is per second (10 requests a second per team, as of
 * 2026-09-15), so a short wait and another try is worth it. A 429 is a refusal:
 * nothing was sent, so the retry cannot make a second copy.
 *
 * The quota codes are per day and per month. The Free plan allows 100 emails a
 * day, reset at midnight UTC, and 3,000 a month. Waiting inside a request cannot
 * help with those, so sendEmail returns them at once and every bulk sender stops
 * on the first one (lib/email/drain.ts) instead of spending the rest of its
 * queue on refusals.
 */
const RATE_LIMIT_WAITS_MS = [1_000, 2_000];

export function isQuotaExceeded(code: string | undefined): boolean {
  return code === "daily_quota_exceeded" || code === "monthly_quota_exceeded";
}

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  /**
   * Extra headers. Exists for List-Unsubscribe and List-Unsubscribe-Post,
   * which Gmail and Yahoo require on bulk mail and which lib/email/marketing
   * adds to every marketing send. Transactional mail passes none.
   */
  headers?: Record<string, string>;
  /** A plain-text part. Optional; clients that cannot render HTML use it. */
  text?: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email] RESEND_API_KEY unset; skipped: "${opts.subject}"`);
    return { ok: false, skipped: true };
  }
  const from = process.env.EMAIL_FROM || "Purify Shop <onboarding@resend.dev>";
  const replyTo =
    opts.replyTo || process.env.EMAIL_REPLY_TO || "lifeistheosis@gmail.com";
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(key);
    for (let attempt = 0; ; attempt++) {
      const { error } = await resend.emails.send({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        replyTo,
        ...(opts.headers ? { headers: opts.headers } : {}),
        ...(opts.text ? { text: opts.text } : {}),
      });
      if (!error) return { ok: true };
      const wait = error.name === "rate_limit_exceeded" ? RATE_LIMIT_WAITS_MS[attempt] : undefined;
      if (wait !== undefined) {
        await new Promise((resolve) => setTimeout(resolve, wait));
        continue;
      }
      console.warn(`[email] send failed (${error.name}): ${error.message}`);
      return { ok: false, error: error.message, code: error.name };
    }
  } catch (e) {
    const message = (e as Error).message;
    console.warn(`[email] send threw: ${message}`);
    return { ok: false, error: message };
  }
}

/** Minimal HTML escaping for values interpolated into email templates. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
