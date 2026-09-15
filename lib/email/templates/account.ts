import { buildEmail, longDate, siteUrl as url, type EmailContent } from "./build";

export { longDate, type EmailContent };

/**
 * Account and membership email: Phase 3 of the funnel.
 *
 * Every one of these is about the reader's own account, so none needs
 * marketing consent and none carries an unsubscribe. Each builder is pure and
 * returns the subject, the HTML and a plain-text part, and
 * lib/email/__tests__/accountTemplates.test.ts runs every subject and body
 * through lib/email/doctrine.ts. That test is the reason the copy lives here and
 * not inline in routes.
 *
 * VOICE. From Purify to the reader, signed as the team, plain, and never
 * claiming a feature Plus does not actually gate today. None of these lists
 * what Plus unlocks, deliberately: while enforcement is off, a list would be a
 * promise the app does not keep.
 */

const ACCOUNT_FOOTER =
  "You are getting this because it is about your Purify account. Reply to this email and it reaches a person.";

/** Where each store lets a subscriber change their card or renewal. */
export type BillingStore = "apple" | "google" | "stripe" | "comp" | "gift" | null;

export function manageSubscription(store: BillingStore): { label: string; href: string } {
  switch (store) {
    case "apple":
      return { label: "the App Store", href: "https://apps.apple.com/account/subscriptions" };
    case "google":
      return { label: "Google Play", href: "https://play.google.com/store/account/subscriptions" };
    default:
      return { label: "your Purify account", href: url("/account") };
  }
}

/** Every account email carries the account footer. */
function build(opts: Omit<Parameters<typeof buildEmail>[0], "footer">): EmailContent {
  return buildEmail({ ...opts, footer: ACCOUNT_FOOTER });
}

/* ── the emails ──────────────────────────────────────────────────────────── */

/**
 * The highest-value email on the board: a renewal failed. Recovering one of
 * these is worth more than any campaign, so it says exactly what happened and
 * exactly where to fix it, and nothing else.
 */
export function paymentFailedEmail(store: BillingStore): EmailContent {
  const manage = manageSubscription(store);
  return build({
    subject: "Your Plus renewal did not go through",
    heading: "Your renewal did not go through",
    paragraphs: [
      "We tried to renew your Purify Plus membership and the payment did not go through.",
      `Nothing has been lost. If you update the payment method in ${manage.label}, the renewal will be tried again on its own.`,
      "If you meant to stop your membership, there is nothing you need to do.",
    ],
    action: { label: `Open ${manage.label}`, href: manage.href },
  });
}

/** Tier-neutral on purpose: the same event starts Plus and Pro. */
export function plusActiveEmail(): EmailContent {
  return build({
    subject: "Your Purify membership is active",
    heading: "Thank you",
    paragraphs: [
      "Your Purify membership is active.",
      "Purify is built by a very small team, and a membership is what keeps the library free for everyone else. Thank you for being part of that.",
    ],
    action: { label: "Your account", href: url("/account") },
  });
}

export function plusEndingEmail(opts: { endsOn: Date; store: BillingStore }): EmailContent {
  const manage = manageSubscription(opts.store);
  return build({
    subject: "Your Plus ends in three days",
    heading: "Your Plus ends in three days",
    paragraphs: [
      `Your Purify Plus membership is set not to renew, so it ends on ${longDate(opts.endsOn)}.`,
      "If that is what you chose, there is nothing to do, and everything you saved stays with your account.",
      `If you would rather keep it, you can turn renewal back on in ${manage.label}.`,
    ],
    action: { label: `Open ${manage.label}`, href: manage.href },
  });
}

export function plusEndedEmail(): EmailContent {
  return build({
    subject: "Your Plus has ended",
    heading: "Your Plus has ended",
    paragraphs: [
      "Your Purify Plus membership has ended.",
      "The library stays free, and everything you saved is still with your account.",
      "If you ever want Plus again, it is on your account page.",
    ],
    action: { label: "Your account", href: url("/account") },
  });
}

// The winback ("A month on") is not here. It brings a member back, which makes
// it marketing, so it lives in templates/marketingBodies.ts and goes out only
// through lib/email/marketing.ts to readers who turned on the library list.

export function claimClosingEmail(opts: { dropTitle: string; closesAt: Date }): EmailContent {
  return build({
    subject: `Claims for ${opts.dropTitle} close on ${longDate(opts.closesAt)}`,
    heading: "This month's EIKON Box",
    paragraphs: [
      `Claims for this month's EIKON Box, ${opts.dropTitle}, close on ${longDate(opts.closesAt)}.`,
      "If you would like one, you can claim it from your account. If not, there is nothing to do.",
    ],
    action: { label: "Claim your box", href: url("/account/eikon-box") },
  });
}

export function welcomeEmail(): EmailContent {
  return build({
    subject: "Welcome to Purify",
    heading: "Welcome to Purify",
    paragraphs: [
      "Thank you for making an account.",
      "The library of Scripture, saints and prayers is free, and it will stay free.",
      "If anything is ever wrong, or missing, reply to this email. It reaches me.",
    ],
    action: { label: "Open Purify", href: url("/") },
  });
}

/** Sent after the deletion succeeded, never before, to the address it had. */
export function accountDeletedEmail(): EmailContent {
  return build({
    subject: "Your Purify account has been deleted",
    heading: "Your account has been deleted",
    paragraphs: [
      "As you asked, your Purify account and everything saved to it have been deleted.",
      "This is the last email you will get from us about it.",
      "If you did not ask for this, reply to this email right away.",
    ],
  });
}

/**
 * The terms-change notice. Legal, so it goes to every account regardless of
 * any preference. The wording is a draft for the owner: AGENTS.md makes legal
 * acceptance a stop condition, and the admin button that sends it shows this
 * text first.
 */
export function termsChangedEmail(opts: { effective: Date }): EmailContent {
  return build({
    subject: "We have updated the Purify terms",
    heading: "We have updated our terms",
    paragraphs: [
      `We have updated the Purify terms of use, effective ${longDate(opts.effective)}.`,
      "You can read them in full at the link below. If you keep using Purify after that date, the updated terms apply.",
      "If you have a question about them, reply to this email.",
    ],
    action: { label: "Read the terms", href: url("/terms") },
  });
}
