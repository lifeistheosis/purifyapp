// The link tag: the short word a link of ours ends in to say which email or
// post it was in (lib/analytics/tag.ts). The rule that matters most is at the
// bottom: a tag names a mailing and can never name a reader.

import { describe, expect, it } from "vitest";

import { classifyPlatform, isAppPlatform, PLATFORM_LABEL } from "../platform";
import { classifySource } from "../source";
import { cleanTag, emailTag, storedTag, TAG_PARAM, tagFromSearch, tagOfStored, withoutTag, withTag } from "../tag";

describe("what counts as a tag", () => {
  it("keeps a short word of letters, digits, dots, dashes and underscores", () => {
    expect(cleanTag("email-release-1.5")).toBe("email-release-1.5");
    expect(cleanTag("tiktok")).toBe("tiktok");
    expect(cleanTag("x")).toBe("x");
    expect(cleanTag("  Email-Welcome ")).toBe("email-welcome");
  });

  it("drops anything else whole, and never repairs it into something it was not", () => {
    expect(cleanTag("")).toBeNull();
    expect(cleanTag(null)).toBeNull();
    expect(cleanTag("-email")).toBeNull();
    expect(cleanTag("email-")).toBeNull();
    expect(cleanTag("two words")).toBeNull();
    expect(cleanTag("<script>")).toBeNull();
    expect(cleanTag("a/b")).toBeNull();
    expect(cleanTag("reader@example.org")).toBeNull();
    expect(cleanTag("a".repeat(41))).toBeNull();
    expect(cleanTag("a".repeat(40))).toBe("a".repeat(40));
  });
});

describe("reading it off an address", () => {
  it("finds it among other parameters", () => {
    expect(tagFromSearch(`?${TAG_PARAM}=email-release-1.5`)).toBe("email-release-1.5");
    expect(tagFromSearch("?id=7&via=tiktok-bio&x=1")).toBe("tiktok-bio");
  });

  it("is nothing when there is none, or when it is not a tag", () => {
    expect(tagFromSearch("")).toBeNull();
    expect(tagFromSearch("?ref=maria")).toBeNull();
    expect(tagFromSearch("?from=cart")).toBeNull();
    expect(tagFromSearch("?via=two%20words")).toBeNull();
  });

  it("takes it off the address and keeps everything else, the hash too", () => {
    expect(withoutTag("https://purifyapp.net/whats-new?via=email-release-1.5")).toBe("/whats-new");
    expect(withoutTag("https://purifyapp.net/shop/orders/detail?id=42&via=email-order-shipped#reviews")).toBe("/shop/orders/detail?id=42#reviews");
    expect(withoutTag("https://purifyapp.net/community#conversations")).toBe("/community#conversations");
  });

  it("puts it on an address, before the hash, replacing one already there", () => {
    expect(withTag("https://purifyapp.net/whats-new", "email-release-1.5")).toBe("https://purifyapp.net/whats-new?via=email-release-1.5");
    expect(withTag("https://purifyapp.net/community#conversations", "email-weekly-2026-w38")).toBe(
      "https://purifyapp.net/community?via=email-weekly-2026-w38#conversations",
    );
    expect(withTag("https://purifyapp.net/shop/orders/detail?id=42", "email-order-shipped")).toBe(
      "https://purifyapp.net/shop/orders/detail?id=42&via=email-order-shipped",
    );
    expect(withTag("https://purifyapp.net/?via=old", "new")).toBe("https://purifyapp.net/?via=new");
    // A word that is not a tag changes nothing.
    expect(withTag("https://purifyapp.net/", "two words")).toBe("https://purifyapp.net/");
  });
});

describe("how the session row keeps it", () => {
  it("writes it as an address no browser sends, and reads it back", () => {
    expect(storedTag("email-release-1.5")).toBe("purify-link://email-release-1.5");
    expect(tagOfStored("purify-link://email-release-1.5")).toBe("email-release-1.5");
  });

  it("does not mistake a real referrer for one", () => {
    expect(tagOfStored("https://www.google.com/")).toBeNull();
    expect(tagOfStored("android-app://com.google.android.gm/")).toBeNull();
    expect(tagOfStored(null)).toBeNull();
    expect(tagOfStored("purify-link://two words")).toBeNull();
  });
});

describe("a tagged visit is named", () => {
  it("calls a link from one of our emails an email, by its mailing", () => {
    expect(classifySource(storedTag("email-release-1.5"))).toEqual({ kind: "email", name: "Our email: release-1.5" });
    expect(classifySource(storedTag("email-welcome"))).toEqual({ kind: "email", name: "Our email: welcome" });
    expect(classifySource(storedTag("email"))).toEqual({ kind: "email", name: "Our email" });
  });

  it("knows a link the owner tagged for a place he posts in", () => {
    expect(classifySource(storedTag("tiktok-bio"))).toEqual({ kind: "social", name: "TikTok: bio" });
    expect(classifySource(storedTag("instagram"))).toEqual({ kind: "social", name: "Instagram: our link" });
    expect(classifySource(storedTag("discord-news"))).toEqual({ kind: "social", name: "Discord: news" });
    expect(classifySource(storedTag("x-thread"))).toEqual({ kind: "social", name: "X: thread" });
  });

  it("names any other tagged link by its whole tag", () => {
    expect(classifySource(storedTag("parish-bulletin"))).toEqual({ kind: "site", name: "Our link: parish-bulletin" });
  });

  it("believes the tag over the app's browser it was opened in", () => {
    const instagram = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 395.0.0.31.75";
    expect(classifySource(storedTag("email-release-1.5"), instagram).kind).toBe("email");
  });
});

describe("the Windows app", () => {
  const EDGE = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0";

  it("is the website on a computer until the page says otherwise", () => {
    expect(classifyPlatform(EDGE)).toBe("web-computer");
  });

  it("is the Windows app once the word is written beside its user agent", () => {
    expect(classifyPlatform(`${EDGE} PurifyDesktop`)).toBe("desktop-app");
    expect(PLATFORM_LABEL["desktop-app"]).toBe("Windows app");
    expect(isAppPlatform("desktop-app")).toBe(true);
  });
});

describe("the tag for an email", () => {
  it("names a mailing to many readers with its period", () => {
    expect(emailTag("release", "release:1.5")).toBe("email-release-1.5");
    expect(emailTag("weekly", "weekly:2026-W38")).toBe("email-weekly-2026-w38");
    expect(emailTag("monthly", "monthly:2026-09")).toBe("email-monthly-2026-09");
    expect(emailTag("shop_feast", "shop_feast:nativity-2026")).toBe("email-shop-feast-nativity-2026");
    expect(emailTag("terms_changed", "terms:2026-08-14")).toBe("email-terms-2026-08-14");
  });

  it("names every other email by its kind alone", () => {
    expect(emailTag("welcome", "welcome")).toBe("email-welcome");
    expect(emailTag("order_confirmation")).toBe("email-order-confirmation");
    expect(emailTag("billing-issue", "billing-issue")).toBe("email-billing-issue");
  });

  it("never carries what is about one reader", () => {
    const reader = "3f1c2a9e-8b7d-4c6e-9f10-2a3b4c5d6e7f";
    // A patron saint, a claimed box, an order: all follow the kind in the key.
    expect(emailTag("name_day", "name_day:st-nicholas:2026")).toBe("email-name-day");
    expect(emailTag("claim_closing", "claim_closing:9d2c1f0a-1111-4222-8333-444455556666")).toBe("email-claim-closing");
    expect(emailTag("order_shipped", "order_shipped:ord_8841")).toBe("email-order-shipped");
    // A key that still had the reader's id on it (it never should) gives the kind.
    expect(emailTag("release", `release:${reader}`)).toBe("email-release");
    expect(emailTag("welcome", `welcome:${reader}`)).toBe("email-welcome");
    for (const tag of [emailTag("release", `release:1.5:${reader}`), emailTag("weekly", `weekly:2026-W38:${reader}`)]) {
      expect(tag).not.toContain(reader.slice(0, 8));
    }
  });

  it("is always a tag the route will keep", () => {
    for (const tag of [emailTag("release", "release:1.5"), emailTag("x".repeat(80)), emailTag("", ""), emailTag("seller_application_received")]) {
      expect(cleanTag(tag), tag).toBe(tag);
    }
  });
});
