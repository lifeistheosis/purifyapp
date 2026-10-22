import "server-only";

import { randomUUID } from "node:crypto";

import { bareAddress, suppressedAmong } from "./suppression";
import { UNSUBSCRIBE_PAGE, fillUnsubscribe } from "./unsubscribe";

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
 *                     address included. Unset stops every send (1.8): it used
 *                     to fall back to Resend's shared test sender, so a lost
 *                     setting would have mailed readers from onboarding@resend.dev.
 *   EMAIL_REPLY_TO  - optional Reply-To. Defaults to support@purifyapp.net, a
 *                     Resend inbox whose mail becomes a support ticket
 *                     (app/api/email/resend-webhook), not anyone's own Gmail.
 */

export const DEFAULT_REPLY_TO = "support@purifyapp.net";

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
 * The quota codes are per day and per month. The Free plan allowed 100 emails a
 * day, reset at midnight UTC, and 3,000 a month; Pro (since 2026-09-27) has no
 * daily cap and 50,000 a month. Waiting inside a request cannot
 * help with those, so sendEmail returns them at once and every bulk sender stops
 * on the first one (lib/email/drain.ts) instead of spending the rest of its
 * queue on refusals.
 */
const RATE_LIMIT_WAITS_MS = [1_000, 2_000];

/**
 * A request that may have reached Resend before the line dropped is tried once
 * more, after this wait, under the same Idempotency-Key, so Resend sends it at
 * most once whichever attempt landed.
 */
const NETWORK_RETRY_WAIT_MS = 1_500;
const NETWORK_ERRORS = new Set(["application_error", "internal_server_error"]);

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
  const from = process.env.EMAIL_FROM;
  if (!from) {
    console.warn(`[email] EMAIL_FROM unset; refused rather than send from a test address: "${opts.subject}"`);
    return { ok: false, skipped: true, code: "no_sender" };
  }

  // The addresses that bounced for good, bounced three times, or (for list
  // mail, which carries List-Unsubscribe) called us spam (lib/email/suppression.ts).
  const marketing = Boolean(opts.headers?.["List-Unsubscribe"]);
  const all = Array.isArray(opts.to) ? opts.to : [opts.to];
  const blocked = new Set(await suppressedAmong(all, marketing));
  const to = blocked.size ? all.filter((a) => !blocked.has(bareAddress(a))) : all;
  if (!to.length) {
    console.info(`[email] suppressed address; skipped: "${opts.subject}"`);
    return { ok: false, skipped: true, code: "suppressed" };
  }

  // The last thing before Resend. Whoever built this email and however it got
  // here, its unsubscribe button leads somewhere: lib/email/ledger.ts fills
  // the reader's own link, and anything it did not reach gets the page.
  const mail = fillUnsubscribe({ html: opts.html, ...(opts.text ? { text: opts.text } : {}) }, UNSUBSCRIBE_PAGE);
  const replyTo = opts.replyTo || process.env.EMAIL_REPLY_TO || DEFAULT_REPLY_TO;
  // One key per send. A 429 is a refusal, so the next try is a new request
  // under a new key; a dropped line keeps the key, so a request that did land
  // is not sent twice.
  const base = randomUUID();
  let keyN = 0;
  let networkRetried = false;
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(key);
    for (let rateTries = 0; ; ) {
      let error: { name: string; message: string } | null = null;
      try {
        ({ error } = await resend.emails.send(
          {
            from,
            to: Array.isArray(opts.to) ? to : to[0],
            subject: opts.subject,
            html: mail.html,
            replyTo,
            ...(opts.headers ? { headers: opts.headers } : {}),
            ...(mail.text ? { text: mail.text } : {}),
          },
          { idempotencyKey: `${base}:${keyN}` },
        ));
      } catch (e) {
        error = { name: "application_error", message: (e as Error).message };
      }
      if (!error) return { ok: true };
      if (NETWORK_ERRORS.has(error.name) && !networkRetried) {
        networkRetried = true;
        await new Promise((resolve) => setTimeout(resolve, NETWORK_RETRY_WAIT_MS));
        continue;
      }
      const wait = error.name === "rate_limit_exceeded" ? RATE_LIMIT_WAITS_MS[rateTries] : undefined;
      if (wait !== undefined) {
        keyN++;
        rateTries++;
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
