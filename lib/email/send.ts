import "server-only";

/**
 * Transactional email via Resend. The whole surface degrades to a logged
 * no-op when RESEND_API_KEY is unset, so the app never crashes without email
 * configured (same discipline as Stripe checkout in lib/shop/flags.ts).
 *
 * Env:
 *   RESEND_API_KEY  - server-only Resend key (re_...). Absent = email off.
 *   EMAIL_FROM      - From header, e.g. "Purify Shop <lifeistheosis@gmail.com>".
 *                     Falls back to Resend's shared test sender until a domain
 *                     is verified.
 *   EMAIL_REPLY_TO  - optional Reply-To (defaults to lifeistheosis@gmail.com).
 */

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export type SendResult = { ok: boolean; skipped?: boolean; error?: string };

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
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
    const { error } = await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      replyTo,
    });
    if (error) {
      console.warn(`[email] send failed: ${error.message}`);
      return { ok: false, error: error.message };
    }
    return { ok: true };
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
