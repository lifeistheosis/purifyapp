import { SITE_URL } from "@/lib/site";

import { escapeHtml } from "./send";
import { FONT_LINK, SANS, SERIF, T } from "./theme";

/**
 * The shell every Purify email arrives in: the cross and the wordmark, the
 * letter, and the footer under it. Tables and inline styles, because that is
 * still the only thing every mail client agrees on.
 *
 * It used to be a white card on grey with a Georgia heading and nothing that
 * said Purify. Now it wears the app's reading mode (lib/email/theme.ts), so an
 * email looks like the thing it is about. The words did not change with it;
 * the copy in templates/ and in the senders is the same copy.
 *
 * `eyebrow` is the small line above the heading that says what the email is
 * about: your account, the shop, the library. It is pre-escaped, so callers may
 * pass &middot;, and `footer` is HTML for the same reason, which is why the
 * builders escape their own text before handing it over.
 *
 * IMAGES ARE OFF BY DEFAULT in Outlook and in plenty of Gmail accounts. The
 * cross is a 3KB PNG with alt text, and the wordmark under it is live text, so
 * an email with every image blocked still says Purify at the top.
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
  const site = SITE_URL.replace(/\/$/, "");
  const cross = T.crossPath
    ? `<img src="${site}${T.crossPath}" width="21" height="37" alt="Purify" style="display:block;border:0;outline:none;text-decoration:none">`
    : "";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="${T.scheme}"><meta name="supported-color-schemes" content="${T.scheme}">
<link href="${FONT_LINK}" rel="stylesheet">
<style>@media (max-width:480px){.pad{padding:28px 22px !important}.h1{font-size:25px !important}}</style></head>
<body style="margin:0;padding:0;background:${T.canvas}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${T.canvas}" style="background:${T.canvas}"><tr><td align="center" style="padding:36px 14px 40px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
    <tr><td align="center" style="padding:0 0 22px">
      ${cross}
      <p style="margin:12px 0 0;font-family:${SANS};font-size:11px;letter-spacing:5px;text-transform:uppercase;color:${T.muted}">Purify</p>
    </td></tr>
    <tr><td class="pad" bgcolor="${T.card}" style="background:${T.card};border-radius:${T.cardRadius}px;padding:40px 40px 34px;font-family:${SERIF};font-size:17px;line-height:1.65;color:${T.body};${T.scheme === "light" ? `border:1px solid ${T.line};` : ""}">
      <p style="margin:0 0 10px;font-family:${SANS};font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:${T.label}">${eyebrow}</p>
      <h1 class="h1" style="margin:0 0 22px;font-family:${SERIF};font-size:30px;line-height:1.2;font-weight:400;color:${T.heading}">${escapeHtml(opts.heading)}</h1>
      ${opts.bodyHtml}
    </td></tr>
    <tr><td align="center" style="padding:24px 18px 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${T.muted}">
      ${footer}
      <br><a href="${site}" style="color:${T.muted};text-decoration:none">purifyapp.net</a>
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}
