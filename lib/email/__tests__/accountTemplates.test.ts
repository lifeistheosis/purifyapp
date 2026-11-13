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
  ["pro ending", plusEndingEmail({ endsOn: new Date("2026-09-17T00:00:00Z"), store: "apple", pro: true })],
  ["plus ended", plusEndedEmail()],
  ["pro ended", plusEndedEmail({ pro: true })],
  ["claim closing", claimClosingEmail({ dropTitle: "St Nicholas", closesAt: new Date("2026-12-04T00:00:00Z") })],
  ["welcome", welcomeEmail()],
  // With the first-week guide's asking line (lib/email/retention/firstWeekAsk.ts).
  ["welcome, asking about the first-week guide", welcomeEmail({ firstWeek: "https://purifyapp.net/email/first-week?u=00000000-0000-4000-8000-000000000000&s=x" })],
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

  it("names the reader's own plan when it ends, Pro only for Pro", () => {
    // 1.8, note 71, refinement 3: one name, Plus; Pro where the higher plan
    // itself is meant. A Pro member was told their Plus had ended.
    const ending = plusEndingEmail({ endsOn: new Date("2026-09-17T00:00:00Z"), store: "google" });
    expect(ending.subject).toBe("Your Plus ends in three days");
    expect(ending.text).toContain("Your Purify Plus membership is set not to renew");
    const proEnding = plusEndingEmail({ endsOn: new Date("2026-09-17T00:00:00Z"), store: "google", pro: true });
    expect(proEnding.subject).toBe("Your Pro ends in three days");
    expect(proEnding.text).toContain("Your Purify Pro membership is set not to renew");
    expect(proEnding.text).not.toContain("Plus");
    expect(plusEndedEmail().subject).toBe("Your Plus has ended");
    const proEnded = plusEndedEmail({ pro: true });
    expect(proEnded.subject).toBe("Your Pro has ended");
    expect(proEnded.text).toContain("If you ever want Pro again");
    expect(proEnded.text).not.toContain("Plus");
    for (const e of [ending, proEnding, plusEndedEmail(), proEnded]) expect(`${e.subject} ${e.text}`).not.toMatch(/premium/i);
  });
});
