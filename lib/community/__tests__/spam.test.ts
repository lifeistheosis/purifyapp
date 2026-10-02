import { describe, expect, it } from "vitest";

import { countMentions, duplicateKey, findLinks, hostMatches, judgeSpam, spamSignals } from "../spam";

describe("findLinks", () => {
  it("finds full addresses, www. and bare domains, each once, with their host", () => {
    const links = findLinks(["See https://www.example.org/a?b=1, also www.purifyapp.net and bit.ly/xyz."]);
    expect(links.map((l) => l.host)).toEqual(["example.org", "purifyapp.net", "bit.ly"]);
  });

  it("does not take an email address, a reference or ordinary words for a link", () => {
    expect(findLinks(["Write to me@example.com about John 3:16, e.g. St. John and Rev. 21"])).toEqual([]);
  });

  it("counts the same address once", () => {
    expect(findLinks(["https://a.com/x https://a.com/x"])).toHaveLength(1);
  });
});

describe("hostMatches", () => {
  it("matches the host and its subdomains, not look-alikes", () => {
    expect(hostMatches("bit.ly", "bit.ly")).toBe(true);
    expect(hostMatches("go.bit.ly", "bit.ly")).toBe(true);
    expect(hostMatches("rabbit.ly", "bit.ly")).toBe(false);
  });
});

describe("countMentions", () => {
  it("counts distinct handles across title and body", () => {
    expect(countMentions(["@maria and @john.k", "thanks @maria"])).toBe(2);
    expect(countMentions(["write me@example.com"])).toBe(0);
  });
});

describe("spamSignals", () => {
  it("reads the shape of contact and money spam", () => {
    const { signals, score } = spamSignals(["Earn $500 a day with bitcoin, WhatsApp me on +1 (555) 123-4567"]);
    expect(signals).toEqual(expect.arrayContaining(["contact", "money", "phone"]));
    expect(score).toBeGreaterThanOrEqual(6);
  });

  it("leaves an ordinary post at zero", () => {
    const { score } = spamSignals([
      "Lord, have mercy. Reading John 3:16 tonight with my family; we keep the fast until 6:30 and pray for 2026.",
    ]);
    expect(score).toBe(0);
  });

  it("does not mistake a date range or a verse range for a phone number", () => {
    expect(spamSignals(["From 1990 - 2026 we read Psalms 1-150"]).signals).not.toContain("phone");
  });

  it("notices shouting and repetition", () => {
    expect(spamSignals(["THIS IS THE BEST OFFER YOU WILL EVER SEE IN YOUR LIFE"]).signals).toContain("caps");
    expect(spamSignals(["buy buy buy buy buy buy now"]).signals).toContain("repetition");
  });
});

describe("judgeSpam", () => {
  const member = { level: "member" as const, blockedHosts: [] };

  it("allows an ordinary post", () => {
    expect(judgeSpam(["A reflection on the Sunday Gospel."], member)).toEqual({ action: "allow" });
  });

  it("refuses too many mentions or links, with the limit", () => {
    expect(judgeSpam(["@aaa @bbb @ccc @ddd @eee @fff"], member)).toEqual({ action: "refuse", code: "too_many_mentions", limit: 5 });
    expect(judgeSpam(["a.com b.com c.com d.com"], member)).toEqual({ action: "refuse", code: "too_many_links", limit: 3 });
  });

  it("holds a link the team blocks, and any shortener", () => {
    expect(judgeSpam(["see https://scam.example.net/x"], { ...member, blockedHosts: ["example.net"] })).toMatchObject({
      action: "hold",
      reason: "spam",
    });
    expect(judgeSpam(["https://bit.ly/abc"], member)).toMatchObject({ action: "hold", reason: "links" });
  });

  it("holds what reads like spam, and a new account a point sooner", () => {
    expect(judgeSpam(["DM me on telegram for crypto profits"], member)).toMatchObject({ action: "hold", reason: "spam" });
    expect(judgeSpam(["Text me on WhatsApp"], member)).toEqual({ action: "allow" });
    expect(judgeSpam(["Text me on WhatsApp"], { ...member, level: "new" })).toMatchObject({ action: "hold", reason: "spam" });
  });

  it("holds a new account's link for review, not a member's", () => {
    expect(judgeSpam(["my parish: stgeorge.org"], member)).toEqual({ action: "allow" });
    expect(judgeSpam(["my parish: stgeorge.org"], { ...member, level: "new" })).toMatchObject({
      action: "hold",
      reason: "new_account",
    });
  });

  it("never holds the team", () => {
    expect(judgeSpam(["https://bit.ly/abc crypto giveaway"], { level: "staff", blockedHosts: [] })).toEqual({ action: "allow" });
  });
});

describe("duplicateKey", () => {
  it("treats spacing, case, accents and punctuation as the same message", () => {
    expect(duplicateKey("Christ is risen!  Truly He is risen.")).toBe(duplicateKey("christ is risen, truly he is risen"));
    expect(duplicateKey("Café au lait for everyone today")).toBe(duplicateKey("cafe au lait for everyone today"));
  });

  it("never judges something short", () => {
    expect(duplicateKey("Amen")).toBeNull();
    expect(duplicateKey("Lord have mercy", 20)).toBeNull();
  });
});
