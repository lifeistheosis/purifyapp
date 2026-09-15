import { describe, expect, it } from "vitest";

import { marketingFooter, marketingRefusal, unsubscribeHeaders, unsubscribePageUrl } from "../consent";
import { isMarketingList, LIST_LABEL } from "../lists";
import { renderMarketing } from "../marketing";
import { winbackBody } from "../templates/marketingBodies";
import { checkEmailCopy, explainEmail } from "./emailCopyHelpers";

const TOKEN = "3f1c2a9e-8b7d-4c6e-9f10-2a3b4c5d6e7f";
const ADDRESS = "PO Box 123, Springfield, IL 62701";

describe("marketingRefusal", () => {
  it("refuses every marketing send until there is a postal address, which is the law, not a preference", () => {
    expect(marketingRefusal({ postalAddress: null, consented: true, unsubscribeToken: TOKEN })).toBe("no_postal_address");
    expect(marketingRefusal({ postalAddress: "   ", consented: true, unsubscribeToken: TOKEN })).toBe("no_postal_address");
  });

  it("refuses a reader who did not turn the list on, and a send with no way to stop it", () => {
    expect(marketingRefusal({ postalAddress: ADDRESS, consented: false, unsubscribeToken: TOKEN })).toBe("no_consent");
    expect(marketingRefusal({ postalAddress: ADDRESS, consented: true, unsubscribeToken: null })).toBe("no_token");
  });

  it("lets a send go only when all three hold", () => {
    expect(marketingRefusal({ postalAddress: ADDRESS, consented: true, unsubscribeToken: TOKEN })).toBeNull();
  });
});

describe("unsubscribe", () => {
  it("gives the mail client a one-click POST target, per RFC 8058", () => {
    const h = unsubscribeHeaders(TOKEN, "shop_offers");
    expect(h["List-Unsubscribe"]).toMatch(/^<https?:\/\/.+\/api\/email\/unsubscribe\?t=3f1c2a9e-[^&]+&l=shop_offers>$/);
    expect(h["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("sends a person to a page that asks first, not to the endpoint", () => {
    expect(unsubscribePageUrl(TOKEN, "product_updates")).toMatch(/\/email\/unsubscribe\?t=.+&l=product_updates$/);
  });

  it("knows its two lists and nothing else", () => {
    expect(isMarketingList("shop_offers")).toBe(true);
    expect(isMarketingList("everything")).toBe(false);
  });
});

describe("a rendered marketing email", () => {
  const email = renderMarketing(winbackBody({ wasPro: true }), "product_updates", TOKEN, ADDRESS);

  it("carries the postal address, why they got it, and the unsubscribe link, in both parts", () => {
    for (const part of [email.html, email.text]) {
      expect(part).toContain("PO Box 123");
      expect(part).toContain(LIST_LABEL.product_updates);
      expect(part).toContain(`/email/unsubscribe?t=${TOKEN}`);
    }
    expect(marketingFooter({ list: "shop_offers", postalAddress: ADDRESS })).toContain("New in the shop");
  });

  it("carries the one-click headers", () => {
    expect(email.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it.each([
    ["winback, pro", winbackBody({ wasPro: true })],
    ["winback, plus", winbackBody({ wasPro: false })],
  ])("%s passes the email doctrine", (_name, body) => {
    const rendered = renderMarketing(body, "product_updates", TOKEN, ADDRESS);
    const v = checkEmailCopy({ subject: rendered.subject, body: rendered.text });
    expect(v, explainEmail(v)).toEqual([]);
  });

  it("mentions the EIKON Box only to members who had Pro, which is what the box comes with", () => {
    expect(winbackBody({ wasPro: true }).paragraphs.join(" ")).toContain("EIKON Box");
    expect(winbackBody({ wasPro: false }).paragraphs.join(" ")).not.toContain("EIKON Box");
  });
});
