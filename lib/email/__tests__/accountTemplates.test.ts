import { describe, expect, it } from "vitest";

import { checkEmailCopy, explainEmail } from "./emailCopyHelpers";
import {
  accountDeletedEmail,
  claimClosingEmail,
  longDate,
  manageSubscription,
  paymentFailedEmail,
  plusActiveEmail,
  plusEndedEmail,
  plusEndingEmail,
  termsChangedEmail,
  welcomeEmail,
  type EmailContent,
} from "../templates/account";

const EVERY: [string, EmailContent][] = [
  ["payment failed, google", paymentFailedEmail("google")],
  ["payment failed, apple", paymentFailedEmail("apple")],
  ["payment failed, web", paymentFailedEmail("stripe")],
  ["membership active", plusActiveEmail()],
  ["plus ending", plusEndingEmail({ endsOn: new Date("2026-09-17T00:00:00Z"), store: "google" })],
  ["plus ended", plusEndedEmail()],
  ["claim closing", claimClosingEmail({ dropTitle: "St Nicholas", closesAt: new Date("2026-12-04T00:00:00Z") })],
  ["welcome", welcomeEmail()],
  ["account deleted", accountDeletedEmail()],
  ["terms changed", termsChangedEmail({ effective: new Date("2026-08-14T00:00:00Z") })],
];

describe("account email copy", () => {
  it.each(EVERY)("%s passes the email doctrine, subject and body", (_name, email) => {
    const v = checkEmailCopy({ subject: email.subject, body: email.text });
    expect(v, explainEmail(v)).toEqual([]);
  });

  it.each(EVERY)("%s has a plain-text part and no raw placeholder", (_name, email) => {
    expect(email.text.length).toBeGreaterThan(40);
    expect(email.html).not.toMatch(/\$\{|undefined|\[object Object\]/);
    expect(email.text).not.toMatch(/\$\{|undefined|\[object Object\]/);
  });

  it("never claims a feature Plus does not gate", () => {
    // Enforcement is off: a list of what Plus unlocks would be a promise the
    // app does not keep. None of these may name one.
    for (const [, email] of EVERY) {
      expect(email.text.toLowerCase()).not.toMatch(/unlock|exclusive|premium features|ad-free/);
    }
  });

  it("escapes what it interpolates", () => {
    const e = claimClosingEmail({ dropTitle: `<script>alert("x")</script>`, closesAt: new Date("2026-12-04T00:00:00Z") });
    expect(e.html).not.toContain("<script>");
    expect(e.html).toContain("&lt;script&gt;");
  });

  it("sends each store's subscriber to the place that store lets them fix it", () => {
    expect(manageSubscription("google").href).toBe("https://play.google.com/store/account/subscriptions");
    expect(manageSubscription("apple").href).toBe("https://apps.apple.com/account/subscriptions");
    expect(manageSubscription("stripe").href).toMatch(/\/account$/);
    expect(paymentFailedEmail("google").text).toContain("Google Play");
  });

  it("writes dates the same on every server", () => {
    expect(longDate(new Date("2026-08-14T00:00:00Z"))).toBe("August 14, 2026");
  });
});
