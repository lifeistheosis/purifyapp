import { describe, expect, it } from "vitest";

import { cleanSocialLinks, cleanSocialValue, shownLinks } from "../socialLinks";

describe("cleanSocialValue", () => {
  it("keeps a username, however it was pasted", () => {
    expect(cleanSocialValue("instagram", "@purify.app")).toBe("purify.app");
    expect(cleanSocialValue("instagram", "https://www.instagram.com/purify.app/")).toBe("purify.app");
    expect(cleanSocialValue("x", "https://x.com/purify?s=21")).toBe("purify");
    expect(cleanSocialValue("tiktok", "https://www.tiktok.com/@purify")).toBe("purify");
    expect(cleanSocialValue("bluesky", "https://bsky.app/profile/Purify.bsky.social")).toBe("purify.bsky.social");
  });

  it("refuses a pasted address on another site", () => {
    expect(cleanSocialValue("instagram", "https://evil.example/phish")).toBeNull();
    expect(cleanSocialValue("x", "https://twitter.com/purify")).toBe("purify");
    expect(cleanSocialValue("facebook", "https://m.facebook.com/purify.app")).toBe("purify.app");
  });

  it("refuses what a network would not take as a username", () => {
    expect(cleanSocialValue("x", "far_too_long_for_x_handles")).toBeNull();
    expect(cleanSocialValue("instagram", "has space")).toBeNull();
    expect(cleanSocialValue("instagram", "")).toBeNull();
  });

  it("makes a website https, and refuses anything that is not a web address", () => {
    expect(cleanSocialValue("website", "stgeorge.org/about")).toBe("https://stgeorge.org/about");
    expect(cleanSocialValue("website", "http://stgeorge.org")).toBe("https://stgeorge.org/");
    expect(cleanSocialValue("website", "javascript:alert(1)")).toBeNull();
    expect(cleanSocialValue("website", "https://user:pw@stgeorge.org")).toBeNull();
    expect(cleanSocialValue("website", "localhost")).toBeNull();
  });
});

describe("cleanSocialLinks", () => {
  it("drops empty rows and repeats, and keeps the order", () => {
    const res = cleanSocialLinks([
      { k: "instagram", v: "purify" },
      { k: "website", v: "" },
      { k: "instagram", v: "@Purify" },
      { k: "youtube", v: "purifyapp" },
    ]);
    expect(res).toEqual({ ok: true, links: [{ k: "instagram", v: "purify" }, { k: "youtube", v: "purifyapp" }] });
  });

  it("refuses a shortener or a blocked website, an unknown network, and too many", () => {
    expect(cleanSocialLinks([{ k: "website", v: "https://bit.ly/x" }])).toMatchObject({ ok: false, problem: "blocked" });
    expect(cleanSocialLinks([{ k: "website", v: "https://bad.example.com" }], ["example.com"])).toMatchObject({ ok: false, problem: "blocked" });
    expect(cleanSocialLinks([{ k: "myspace", v: "tom" }])).toMatchObject({ ok: false, problem: "unknown" });
    const six = ["a1", "b2", "c3", "d4", "e5", "f6"].map((v) => ({ k: "instagram", v }));
    expect(cleanSocialLinks(six)).toMatchObject({ ok: false, problem: "too_many" });
  });
});

describe("shownLinks", () => {
  it("builds every address on the server's side, never from what was stored", () => {
    expect(shownLinks([{ k: "instagram", v: "purify" }, { k: "x", v: "purify" }, { k: "website", v: "https://stgeorge.org/" }])).toEqual([
      { kind: "instagram", label: "@purify", href: "https://www.instagram.com/purify/" },
      { kind: "x", label: "@purify", href: "https://x.com/purify" },
      { kind: "website", label: "stgeorge.org", href: "https://stgeorge.org/" },
    ]);
  });

  it("drops anything that no longer checks out", () => {
    expect(shownLinks([{ k: "instagram", v: "https://evil.example/phish" }, { k: "nope", v: "x" }, "junk"])).toEqual([]);
    expect(shownLinks(null)).toEqual([]);
  });
});
