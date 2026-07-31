import "server-only";

import { emailLayout } from "@/lib/email/layout";
import { escapeHtml, sendEmail, type SendResult } from "@/lib/email/send";
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
  const body = `
    <p style="margin:0 0 16px">This month&rsquo;s box is open, and it is yours to claim.</p>
    ${opts.teaser ? `<p style="margin:0 0 16px;color:#3a3540">${escapeHtml(opts.teaser)}</p>` : ""}
    <p style="margin:0 0 16px">Claim it in the app${
      deadline ? ` by <strong>${escapeHtml(deadline)}</strong>` : ""
    }. We gather each box to the number claimed, so a box that is not claimed inside its window is not sent and is not carried over. It takes about a minute: confirm where it should go, and we will do the rest.</p>
    <p style="margin:18px 0 0"><a href="${BOX_URL}" style="color:#b8892f;text-decoration:none">Claim your box &rarr;</a></p>
    <p style="margin:24px 0 0;font-size:13px;color:#8a8580">You are receiving this because you are a Purify Pro member.</p>`;
  return sendEmail({
    to: opts.to,
    subject: opts.subject,
    html: emailLayout({ heading: escapeHtml(opts.dropTitle), bodyHtml: body }),
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
  const body = `
    <p style="margin:0 0 16px">We have you down for ${escapeHtml(opts.dropTitle)}. We will gather it${
      deadline ? ` after the window closes on ${escapeHtml(deadline)}` : ""
    } and write to you again when it ships.</p>
    <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:13px;letter-spacing:.5px;text-transform:uppercase;color:#8a8580">Shipping to</p>
    <p style="margin:0 0 20px;color:#1a1720">${escapeHtml(formatAddress(opts.address))}</p>
    <p style="margin:0;font-size:14px;color:#8a8580">Need to change that? You can update the address in the app until we pack it.</p>
    <p style="margin:18px 0 0"><a href="${BOX_URL}" style="color:#b8892f;text-decoration:none">Your EIKON Box &rarr;</a></p>`;
  return sendEmail({
    to: opts.to,
    subject: `Your ${opts.dropTitle} is claimed`,
    html: emailLayout({ heading: "Claimed", bodyHtml: body }),
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
  const body = `
    <p style="margin:0 0 16px">${escapeHtml(opts.dropTitle)} left today.</p>
    <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:13px;letter-spacing:.5px;text-transform:uppercase;color:#8a8580">Tracking</p>
    <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:18px;font-weight:bold;letter-spacing:.5px;color:#1a1720">${escapeHtml(
      opts.tracking,
    )}${opts.carrier ? ` <span style="font-weight:normal;font-size:14px;color:#8a8580">(${escapeHtml(opts.carrier)})</span>` : ""}</p>
    ${
      opts.trackingUrl
        ? `<p style="margin:18px 0 0"><a href="${escapeHtml(opts.trackingUrl)}" style="color:#b8892f;text-decoration:none">Track your parcel &rarr;</a></p>`
        : ""
    }`;
  return sendEmail({
    to: opts.to,
    subject: "Your EIKON Box is on its way",
    html: emailLayout({ heading: "On its way", bodyHtml: body }),
  });
}
