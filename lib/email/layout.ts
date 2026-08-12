import { escapeHtml } from "./send";

/**
 * Wraps body HTML in a simple, email-client-safe branded layout (tables +
 * inline styles, the only reliable approach across mail clients). Shared by
 * order confirmations and support-ticket emails.
 */
export function emailLayout(opts: {
  heading: string;
  bodyHtml: string;
  footer?: string;
}): string {
  const footer =
    opts.footer ??
    "EIKON selects, inspects, and ships every icon it sells. Questions? Reply to this email or contact lifeistheosis@gmail.com.";
  return `<!doctype html><html><body style="margin:0;background:#f5f4f2;font-family:Georgia,'Times New Roman',serif;color:#1a1720">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
      <tr><td style="padding:28px 32px 8px">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#8a8580">Purify Shop &middot; EIKON</p>
        <h1 style="margin:8px 0 0;font-size:26px;color:#1a1720">${escapeHtml(opts.heading)}</h1>
      </td></tr>
      <tr><td style="padding:12px 32px 28px;font-size:16px;line-height:1.6;color:#3a3540">${opts.bodyHtml}</td></tr>
      <tr><td style="padding:16px 32px 28px;border-top:1px solid #eeeae5;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:#9a958f">${footer}</td></tr>
    </table>
  </td></tr></table></body></html>`;
}
