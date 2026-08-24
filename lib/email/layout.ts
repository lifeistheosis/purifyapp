import { escapeHtml } from "./send";

/**
 * Wraps body HTML in a simple, email-client-safe branded layout (tables +
 * inline styles, the only reliable approach across mail clients). Shared by
 * order confirmations, support tickets, and the seller funnel.
 *
 * `eyebrow` exists because the default said "Purify Shop &middot; EIKON" for
 * every message the app sends. EIKON is one partner store, not the shop, so
 * that line was wrong on anything addressed to a different seller, and it
 * would have been wrong on an order confirmation the moment a second store
 * shipped something. It is a parameter rather than a fix so that EIKON's own
 * mail keeps reading exactly as it does today; nothing here changes what an
 * existing caller sends. Pre-escaped, so callers may pass &middot;.
 */
export function emailLayout(opts: {
  heading: string;
  bodyHtml: string;
  footer?: string;
  eyebrow?: string;
}): string {
  const footer =
    opts.footer ??
    "EIKON selects, inspects, and ships every icon it sells. Questions? Reply to this email or contact lifeistheosis@gmail.com.";
  const eyebrow = opts.eyebrow ?? "Purify Shop &middot; EIKON";
  return `<!doctype html><html><body style="margin:0;background:#f5f4f2;font-family:Georgia,'Times New Roman',serif;color:#1a1720">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
      <tr><td style="padding:28px 32px 8px">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#8a8580">${eyebrow}</p>
        <h1 style="margin:8px 0 0;font-size:26px;color:#1a1720">${escapeHtml(opts.heading)}</h1>
      </td></tr>
      <tr><td style="padding:12px 32px 28px;font-size:16px;line-height:1.6;color:#3a3540">${opts.bodyHtml}</td></tr>
      <tr><td style="padding:16px 32px 28px;border-top:1px solid #eeeae5;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:#9a958f">${footer}</td></tr>
    </table>
  </td></tr></table></body></html>`;
}
