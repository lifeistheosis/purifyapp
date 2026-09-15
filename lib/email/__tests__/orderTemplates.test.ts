import { describe, expect, it } from "vitest";

import { trackingLink } from "@/lib/shop/trackingLink";

import { orderAddressEmail, orderShippedEmail } from "../templates/orders";
import { checkEmailCopy, explainEmail } from "./emailCopyHelpers";

describe("order email copy", () => {
  const every = [
    ["shipped, UPS", orderShippedEmail({ orderNumber: "EIK-1A2B3C4D", tracking: "1Z999AA10123456784", link: trackingLink("1Z999AA10123456784") })],
    ["shipped, no link", orderShippedEmail({ orderNumber: "EIK-1A2B3C4D", tracking: "XYZ", link: null })],
    ["address, first", orderAddressEmail({ orderNumber: "EIK-1A2B3C4D", reminder: false })],
    ["address, reminder", orderAddressEmail({ orderNumber: "EIK-1A2B3C4D", reminder: true })],
  ] as const;

  it.each(every)("%s passes the email doctrine", (_name, email) => {
    const v = checkEmailCopy({ subject: email.subject, body: email.text });
    expect(v, explainEmail(v)).toEqual([]);
  });

  it("names the carrier and links the parcel when the number is recognised", () => {
    const e = orderShippedEmail({ orderNumber: "EIK-1", tracking: "1Z999AA10123456784", link: trackingLink("1Z999AA10123456784") });
    expect(e.text).toContain("UPS");
    expect(e.text).toContain("1Z999AA10123456784");
    expect(e.html).toContain("ups.com/track");
  });

  it("uses the receipt's order number, so the buyer can match the two", () => {
    expect(orderAddressEmail({ orderNumber: "EIK-1A2B3C4D", reminder: false }).subject).toContain("EIK-1A2B3C4D");
  });

  it("asks for a reply rather than sending the buyer to a form that could break", () => {
    expect(orderAddressEmail({ orderNumber: "EIK-1", reminder: false }).text).toMatch(/Reply to this email/);
  });
});
