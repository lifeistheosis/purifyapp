import "server-only";

import { bigValue, button, microLabel, note, p, pHtml } from "@/lib/email/blocks";
import { emailLayout } from "@/lib/email/layout";
import { sendLoggedEmail } from "@/lib/email/ledger";
import { escapeHtml, type SendResult } from "@/lib/email/send";
import { T } from "@/lib/email/theme";
import { SITE_URL } from "@/lib/site";
import { formatAddress } from "./address";
import type { ShippingAddress } from "./types";

/**
 * The three EIKON Box emails: a drop opening, a claim confirmed, and a box
 * shipped.
 *
 * All of them no-op with a logged skip when no email provider is configured
 * (lib/email/send.ts), so callers must report skipped counts honestly rather
 * than treating a silent no-op as a send.
 *
 * The claim deadline appears in every one of these, because "a box you do
 * not claim before the window closes is not carried over" is the rule the
 * whole model rests on and it should never be a surprise.
 */

const BOX_URL = `${SITE_URL}/account/eikon-box`;

function longDate(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** Sent when a drop opens, to every active Pro member. */
export async function sendDropOpenEmail(opts: {
  to: string;
  subject: string;
  dropTitle: string;
  teaser: string | null;
  claimsCloseAt: string | null;
}): Promise<SendResult> {
  const deadline = longDate(opts.claimsCloseAt);
  const body =
    p("This month’s box is open, and it is yours to claim.") +
    (opts.teaser ? p(opts.teaser) : "") +
    pHtml(
      `Claim it in the app${deadline ? ` by <strong>${escapeHtml(deadline)}</strong>` : ""}. We gather each box to the number claimed, so a box that is not claimed inside its window is not sent and is not carried over. It takes about a minute: confirm where it should go, and we will do the rest.`,
    ) +
    button({ label: "Claim your box", href: BOX_URL }) +
    note("You are receiving this because you are a Purify Pro member.");
  return sendLoggedEmail("eikon_drop_open", {
    to: opts.to,
    subject: opts.subject,
    // The layout escapes the heading; escaping it here too printed &amp; in
    // any drop title with an ampersand in it.
    html: emailLayout({ heading: opts.dropTitle, bodyHtml: body, eyebrow: "EIKON Box" }),
  });
}

/** Sent once a member has claimed, confirming where it will go. */
export async function sendClaimConfirmedEmail(opts: {
  to: string;
  dropTitle: string;
  address: ShippingAddress;
  claimsCloseAt: string | null;
}): Promise<SendResult> {
  const deadline = longDate(opts.claimsCloseAt);
  const body =
    p(
      `We have you down for ${opts.dropTitle}. We will gather it${
        deadline ? ` after the window closes on ${deadline}` : ""
      } and write to you again when it ships.`,
    ) +
    microLabel("Shipping to") +
    pHtml(escapeHtml(formatAddress(opts.address)), `color:${T.heading};`) +
    note("Need to change that? You can update the address in the app until we pack it.") +
    button({ label: "Your EIKON Box", href: BOX_URL });
  return sendLoggedEmail("eikon_claim_confirmed", {
    to: opts.to,
    subject: `Your ${opts.dropTitle} is claimed`,
    html: emailLayout({ heading: "Claimed", bodyHtml: body, eyebrow: "EIKON Box" }),
  });
}

/** Sent when a tracking number lands on a claim. */
export async function sendClaimShippedEmail(opts: {
  to: string;
  dropTitle: string;
  tracking: string;
  trackingUrl: string | null;
  carrier: string | null;
}): Promise<SendResult> {
  const body =
    p(`${opts.dropTitle} left today.`) +
    microLabel("Tracking") +
    bigValue(
      escapeHtml(opts.tracking) +
        (opts.carrier
          ? ` <span style="font-weight:400;font-size:15px;color:${T.muted}">(${escapeHtml(opts.carrier)})</span>`
          : ""),
    ) +
    (opts.trackingUrl ? button({ label: "Track your parcel", href: opts.trackingUrl }) : "");
  return sendLoggedEmail("eikon_claim_shipped", {
    to: opts.to,
    subject: "Your EIKON Box is on its way",
    html: emailLayout({ heading: "On its way", bodyHtml: body, eyebrow: "EIKON Box" }),
  });
}
