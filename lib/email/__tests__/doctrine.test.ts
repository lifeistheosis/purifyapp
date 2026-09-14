import { describe, expect, it } from "vitest";

import { checkNotificationCopy } from "@/lib/push/doctrine";
import { checkEmailCopy, isEmailDoctrinal } from "../doctrine";

const clauses = (copy: { subject: string; body: string }) => checkEmailCopy(copy).map((v) => v.clause);

describe("checkEmailCopy", () => {
  it("allows what a receipt needs: numbers, prices and long sentences", () => {
    expect(
      checkEmailCopy({
        subject: "Your order A1B2-C3 is confirmed",
        body: "Two items, $24.99 each, $4.99 shipping. It leaves our hands within 14 days, and we will send the tracking number the day it does. ".repeat(3),
      }),
    ).toEqual([]);
  });

  it("holds the same voice as a notification: no raised voice, no clock, no pressure, no praise", () => {
    expect(clauses({ subject: "Welcome to Purify!", body: "" })).toContain("no exclamation marks");
    expect(clauses({ subject: "Your offer expires Friday", body: "" })).toContain("no urgency");
    expect(clauses({ subject: "Last chance for the Nativity box", body: "" })).toContain("no urgency");
    expect(clauses({ subject: "Keep your streak going", body: "" })).toContain("no pressure mechanics");
    expect(clauses({ subject: "Congratulations on a year of prayer", body: "" })).toContain("no praise");
  });

  it("refuses an em dash and an empty subject", () => {
    expect(clauses({ subject: "We got your message — 1234", body: "" })).toContain("no em dashes");
    expect(clauses({ subject: " ", body: "body" })).toContain("subject required");
  });

  it("passes the kind of sentence the funnel actually sends", () => {
    for (const subject of [
      "Your Plus renewal did not go through",
      "Your Plus ends in three days",
      "Your order is ready to ship. Where should it go?",
      "St Nicholas's feast is Thursday",
      "Caring for your prayer rope",
      "We have updated our terms",
    ]) {
      expect(isEmailDoctrinal({ subject, body: "" }), subject).toBe(true);
    }
  });
});

describe("the push bar, after the split", () => {
  it("still refuses digits and still applies the shared phrasing rules", () => {
    const v = checkNotificationCopy({ title: "Pray now!", body: "3 days left, hurry" }).map((x) => x.clause);
    expect(v).toEqual(["no digits", "no exclamation marks", "no urgency"]);
  });
});
