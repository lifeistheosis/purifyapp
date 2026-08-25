import "server-only";

import { emailLayout } from "@/lib/email/layout";
import { escapeHtml, sendEmail, type SendResult } from "@/lib/email/send";
import { SITE_URL } from "@/lib/site";
import { formatPrice } from "./format";

/**
 * The seller funnel's transactional email. Every one of these is new; before
 * this file existed the funnel sent NOTHING, at any step.
 *
 * That was the actual plug-and-play gap. An applicant submitted a form and was
 * told on screen "We'll contact you to begin store setup" (see
 * components/shop/ApplicationClient.tsx), and then nobody contacted them,
 * because there was no mechanism by which anybody could. Worse at the far end:
 * an admin pressed Provision, a seller row and a draft store appeared, console
 * access was granted, and the seller was never informed any of it had
 * happened. They had a working store and no way to find out.
 *
 * The four moments that need a message are the four where the applicant's
 * state changes without them being present: submitted, declined, provisioned,
 * and refund released. Approval alone deliberately sends nothing, because
 * "approved" and "provisioned" arrive minutes apart and two emails inside one
 * hour saying almost the same thing is how a sender earns a spam complaint.
 *
 * FAILURE IS NOT AN ERROR HERE. sendEmail already degrades to a logged no-op
 * without RESEND_API_KEY, and every call site treats the result as advisory:
 * a provision that succeeded must never be reported as failed because a
 * mailbox bounced. The admin console shows whether the message went, so the
 * operator can follow up by hand.
 */

const SELLER_FOOTER =
  "You're receiving this because you applied to sell on Purify Shop. Questions? Reply to this email.";

/** Purify speaking as the marketplace, not as EIKON. */
const SELLER_EYEBROW = "Purify Shop &middot; Sellers";

function sellerLayout(heading: string, bodyHtml: string): string {
  return emailLayout({
    heading,
    bodyHtml,
    footer: SELLER_FOOTER,
    eyebrow: SELLER_EYEBROW,
  });
}

const link = (href: string, label: string) =>
  `<a href="${href}" style="color:#b8892f;text-decoration:none">${label}</a>`;

/**
 * Sent the moment an application is filed, so the applicant has something
 * with a date on it and knows the form did not vanish.
 */
export async function sendApplicationReceivedEmail(app: {
  email: string | null;
  proposedStoreName: string;
}): Promise<SendResult> {
  if (!app.email) return { ok: false, skipped: true };
  const body = `
    <p style="margin:0 0 16px">We have your application for <strong>${escapeHtml(app.proposedStoreName)}</strong>.</p>
    <p style="margin:0 0 16px">Every seller on Purify Shop is reviewed by a person, not a filter, so this takes a few days rather than a few minutes. We read what you sent about how your work is made and where it ships from; if anything needs clarifying we will write back to this address.</p>
    <p style="margin:0 0 16px">Nothing of yours appears in the shop until you have set your store up yourself and asked us to open it.</p>
    <p style="margin:18px 0 0">${link(`${SITE_URL}/shop/sell/application`, "Check your application &rarr;")}</p>`;
  return sendEmail({
    to: app.email,
    subject: "We have your application to sell on Purify",
    html: sellerLayout("Application received", body),
  });
}

/**
 * Sent when an application is declined. The reviewer's note is included when
 * there is one: a decline with no reason is the version people argue with.
 */
export async function sendApplicationDeclinedEmail(app: {
  email: string | null;
  proposedStoreName: string;
  note?: string | null;
}): Promise<SendResult> {
  if (!app.email) return { ok: false, skipped: true };
  const reason = app.note?.trim()
    ? `<p style="margin:0 0 16px;padding:12px 16px;background:#f7f5f2;border-radius:8px;color:#3a3540">${escapeHtml(app.note.trim())}</p>`
    : "";
  const body = `
    <p style="margin:0 0 16px">Thank you for offering <strong>${escapeHtml(app.proposedStoreName)}</strong> to Purify Shop. We are not able to take it on at this time.</p>
    ${reason}
    <p style="margin:0 0 16px">This is not a judgement of your work. We keep the shop small on purpose and turn down more than we accept. You are welcome to apply again once anything above has changed.</p>`;
  return sendEmail({
    to: app.email,
    subject: "About your Purify Shop application",
    html: sellerLayout("Your application", body),
  });
}

/**
 * THE ONE THAT WAS MOST MISSING. Sent at provision, when console access
 * actually exists. Tells them the console is there, where it is, and what has
 * to happen before anything is public.
 */
export async function sendSellerProvisionedEmail(seller: {
  email: string | null;
  storeName: string;
  slug: string;
  /** True when the account was matched to an existing Purify login. */
  linked: boolean;
}): Promise<SendResult> {
  if (!seller.email) return { ok: false, skipped: true };
  const signIn = seller.linked
    ? `<p style="margin:0 0 16px">Sign in with the same account you applied with and the seller console will be waiting.</p>`
    : `<p style="margin:0 0 16px">We could not match your application to a Purify account. Create one with <strong>${escapeHtml(seller.email)}</strong> and reply to this email so we can attach the store to it.</p>`;
  const body = `
    <p style="margin:0 0 16px"><strong>${escapeHtml(seller.storeName)}</strong> is set up. Your seller console is open.</p>
    ${signIn}
    <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:13px;letter-spacing:.5px;text-transform:uppercase;color:#8a8580">Before you can open</p>
    <ol style="margin:0 0 16px;padding-left:20px">
      <li style="margin-bottom:6px">Fill in your store page: who you are, where you ship from, your shipping and returns policies.</li>
      <li style="margin-bottom:6px">Set up payouts. Stripe takes your bank details, not us, and it can take a day or two to clear. Start it early: your store cannot open until it has.</li>
      <li style="margin-bottom:6px">Add your listings. Photographs you own, prices you set. Save them as drafts; publishing unlocks when your store opens, so they all go live together.</li>
      <li>Ask us to open the store. We check it over and make it public.</li>
    </ol>
    <p style="margin:0 0 16px">Your store is a draft until that last step, so nothing is visible to anyone but you and us. Take as long as you need.</p>
    <p style="margin:18px 0 0">${link(`${SITE_URL}/shop/seller`, "Open your seller console &rarr;")}</p>`;
  return sendEmail({
    to: seller.email,
    subject: `Your store is ready to set up: ${seller.storeName}`,
    html: sellerLayout("Your seller console is open", body),
  });
}

/**
 * Sent to the store when Purify actually releases a refund the seller
 * approved. The seller console tells them this email is coming, so it has to
 * arrive: they approved a decision and then had to trust that somebody else
 * carried it out.
 */
export async function sendRefundReleasedEmail(opts: {
  email: string | null;
  storeName: string;
  amountCents: number;
  currency: string;
  orderNumber: string;
}): Promise<SendResult> {
  if (!opts.email) return { ok: false, skipped: true };
  const body = `
    <p style="margin:0 0 16px">The refund you approved on order <strong>${escapeHtml(opts.orderNumber)}</strong> has been sent to the buyer.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;border-top:1px solid #eeeae5;margin-top:4px">
      <tr><td style="padding:10px 0;color:#8a8580">Refunded</td><td align="right" style="padding:10px 0;font-weight:bold;color:#1a1720">${formatPrice(opts.amountCents, opts.currency)}</td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:14px;color:#8a8580">It will show against this order in your console within a few minutes, and on the buyer's statement in five to ten days.</p>
    <p style="margin:18px 0 0">${link(`${SITE_URL}/shop/seller/orders`, "View the order &rarr;")}</p>`;
  return sendEmail({
    to: opts.email,
    subject: `Refund sent: ${opts.orderNumber}`,
    html: sellerLayout("A refund has been released", body),
  });
}

/**
 * A seller says their store is ready to open. Addressed to Purify, not to the
 * seller: this replaces the console's previous instruction to "write to
 * lifeistheosis@gmail.com", which asked the seller to compose the email that
 * this now composes for them, and which nothing recorded.
 *
 * ADMIN_EMAILS is the recipient list because it is already the definition of
 * "who runs this shop" (lib/admin/access.ts reads the same variable), so the
 * notification cannot drift away from the people who can act on it.
 */
export async function sendStoreReviewRequestEmail(store: {
  storeName: string;
  slug: string;
  sellerEmail: string | null;
  /**
   * Drafts are the number that matters. Publishing is refused until the store
   * is live and a live store cannot ask to be opened, so publishedListings is
   * structurally 0 for every store that can send this email. Reporting it
   * alone made the one signal an admin gets dead on arrival.
   */
  draftListings: number;
  publishedListings: number;
  note: string | null;
}): Promise<SendResult> {
  const to = (process.env.ADMIN_EMAILS ?? "")
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (to.length === 0) {
    console.warn("[shop] store review request with no ADMIN_EMAILS configured");
    return { ok: false, skipped: true };
  }
  const note = store.note?.trim()
    ? `<p style="margin:0 0 16px;padding:12px 16px;background:#f7f5f2;border-radius:8px;color:#3a3540">${escapeHtml(store.note.trim())}</p>`
    : "";
  const body = `
    <p style="margin:0 0 16px"><strong>${escapeHtml(store.storeName)}</strong> (/${escapeHtml(store.slug)}) is asking to be opened.</p>
    <p style="margin:0 0 16px">${store.draftListings} listing${store.draftListings === 1 ? "" : "s"} waiting to go live${store.publishedListings > 0 ? `, ${store.publishedListings} already published` : ""}. Seller account: ${escapeHtml(store.sellerEmail ?? "not attached")}.</p>
    ${note}
    <p style="margin:0 0 16px">Check the storefront, then flip the store live from the marketplace console. Stripe must have enabled charges first; the console refuses otherwise.</p>
    <p style="margin:18px 0 0">${link(`${SITE_URL}/shop/${store.slug}`, "View the storefront &rarr;")}</p>`;
  return sendEmail({
    to,
    subject: `Store ready for review: ${store.storeName}`,
    html: sellerLayout("A store is asking to open", body),
  });
}
